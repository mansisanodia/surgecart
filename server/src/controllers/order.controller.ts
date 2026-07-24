import { Request, Response, NextFunction } from 'express';
import { Order } from '../models/order.model';
import { Product } from '../models/product.model';
import { RedisService } from '../services/redis.service';
import { stripe } from '../config/stripe';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors';

export class OrderController {
  /**
   * Reserves stock and generates a Stripe checkout session URL
   */
  static async reserveProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { productId } = req.body;
      const quantity = 1; // Flash sales restrict quantity to 1 per transaction
      const userId = req.user?.id;

      if (!userId) {
        throw new BadRequestError('User identity required');
      }

      if (!productId) {
        throw new BadRequestError('Product ID is required');
      }

      const product = await Product.findById(productId);
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      // 1. Verify flash sale active window
      const now = new Date();
      if (now < product.saleStartTime) {
        throw new BadRequestError('Flash sale has not started yet');
      }
      if (now > product.saleEndTime) {
        throw new BadRequestError('Flash sale has already ended');
      }

      // 2. Queue Authorization check: Verify if user has a valid pass in Redis
      const hasPass = await RedisService.hasPurchasePass(productId, userId);
      if (!hasPass) {
        throw new ForbiddenError('Please join the queue and wait for your turn');
      }

      // 3. Atomically attempt stock decrement and reservation lock in Redis
      let reservationResult = await RedisService.reserveStock(productId, userId, quantity);

      // If Redis stock not initialized, sync it and try once more
      if (reservationResult === -1) {
        await RedisService.loadStock(productId, product.stock);
        reservationResult = await RedisService.reserveStock(productId, userId, quantity);
      }

      if (reservationResult === 0) {
        throw new BadRequestError('Product is out of stock');
      }

      // Consume the pass since stock has been reserved successfully
      await RedisService.usePurchasePass(productId, userId);

      // 4. Create Order in MongoDB with 'reserved' status
      const order = await Order.create({
        buyerId: userId,
        productId: product._id,
        quantity,
        status: 'reserved',
      });

      // 5. Create Stripe Checkout Session
      let session;
      const stripeKey = process.env.STRIPE_SECRET_KEY || '';
      const isMockStripe = !stripeKey || 
                           stripeKey.startsWith('sk_test_mock') || 
                           stripeKey.startsWith('sk_test_placeholder');

      if (isMockStripe) {
        console.log(`[Stripe Mock] Bypassing Stripe API. Redirecting Order ${order._id} to local orders dashboard.`);
        res.status(201).json({
          success: true,
          message: 'Stock reserved in Mock Mode. Complete payment via dashboard.',
          orderId: order._id,
          checkoutUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}/orders?mockCheckout=true&orderId=${order._id}`,
        });
        return;
      }

      try {
        session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [
            {
              price_data: {
                currency: 'usd',
                product_data: {
                  name: product.name,
                  description: product.description,
                  images: product.image ? [product.image] : [],
                },
                unit_amount: Math.round(product.price * 100), // Stripe expects amounts in cents
              },
              quantity,
            },
          ],
          mode: 'payment',
          metadata: {
            orderId: order._id.toString(),
            userId,
            productId: product._id.toString(),
          },
          success_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/payment/success?orderId=${order._id}`,
          cancel_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/payment/cancel?orderId=${order._id}`,
          // Session expires in 30 minutes (minimum Stripe allows is 30 mins)
          expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
        });
      } catch (stripeError: any) {
        // If Stripe session creation fails, rollback the Redis reservation immediately
        await RedisService.releaseStock(productId, userId);
        await Order.findByIdAndDelete(order._id);
        throw new BadRequestError(`Stripe checkout initialization failed: ${stripeError.message}`);
      }

      // Update order with the stripe session ID
      order.stripeSessionId = session.id;
      await order.save();

      res.status(201).json({
        success: true,
        message: 'Stock reserved. Complete your payment.',
        orderId: order._id,
        checkoutUrl: session.url,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves order history of the authenticated user
   */
  static async getOrderHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new BadRequestError('User identity required');
      }

      const orders = await Order.find({ buyerId: userId })
        .populate('productId', 'name price image description')
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        orders,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get specific order details
   */
  static async getOrderById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const order = await Order.findById(id).populate('productId');
      if (!order) {
        throw new NotFoundError('Order not found');
      }

      // Authenticated user check (Must be the buyer or the seller of the product, or admin)
      const product = order.productId as any;
      if (
        order.buyerId.toString() !== userId &&
        product?.sellerId?.toString() !== userId &&
        req.user?.role !== 'admin'
      ) {
        throw new ForbiddenError('You do not have access to this order');
      }

      res.status(200).json({
        success: true,
        order,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Allows manual order cancellation (e.g. user clicks cancel on UI page before Stripe checkout completion)
   */
  static async cancelOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const order = await Order.findById(id);
      if (!order) {
        throw new NotFoundError('Order not found');
      }

      if (order.buyerId.toString() !== userId && req.user?.role !== 'admin') {
        throw new ForbiddenError('Not authorized to cancel this order');
      }

      if (order.status !== 'reserved') {
        throw new BadRequestError(`Cannot cancel order in state: ${order.status}`);
      }

      order.status = 'cancelled';
      await order.save();

      // Release stock in Redis
      await RedisService.releaseStock(order.productId.toString(), order.buyerId.toString());

      // Broadcast stock update
      const liveStock = await RedisService.getStock(order.productId.toString());
      if (liveStock !== null) {
        // Emit socket update
        const { SocketService } = await import('../services/socket.service');
        SocketService.emitStockUpdate(order.productId.toString(), liveStock);
      }

      res.status(200).json({
        success: true,
        message: 'Order cancelled and stock released',
        order,
      });
    } catch (error) {
      next(error);
    }
  }
}
