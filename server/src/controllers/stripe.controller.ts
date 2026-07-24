import { Request, Response, NextFunction } from 'express';
import { Order } from '../models/order.model';
import { Product } from '../models/product.model';
import { RedisService } from '../services/redis.service';
import { SocketService } from '../services/socket.service';
import { stripe } from '../config/stripe';
import { BadRequestError } from '../utils/errors';

export class StripeController {
  /**
   * Handles Stripe Webhook calls
   */
  static async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !webhookSecret) {
      next(new BadRequestError('Missing Stripe signature or webhook secret configuration'));
      return;
    }

    let event;

    try {
      // req.rawBody must be populated by our middleware/server configuration
      event = stripe.webhooks.constructEvent(req.rawBody || req.body, sig, webhookSecret);
    } catch (err: any) {
      console.error(`Stripe Webhook Signature verification failed: ${err.message}`);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    try {
      console.log(`Received Stripe Webhook event: ${event.type}`);

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as any;
          await StripeController.finalizePayment(session);
          break;
        }

        case 'checkout.session.expired': {
          const session = event.data.object as any;
          await StripeController.expireSession(session);
          break;
        }

        default:
          console.log(`Unhandled Stripe event type: ${event.type}`);
      }

      res.status(200).json({ received: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mock endpoint to simulate Stripe payment success in test environments
   */
  static async mockPaymentSuccess(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId } = req.body;

      if (!orderId) {
        throw new BadRequestError('Order ID is required');
      }

      const order = await Order.findById(orderId);
      if (!order) {
        throw new BadRequestError('Order not found');
      }

      if (order.status !== 'reserved') {
        res.status(200).json({
          success: true,
          message: `Order status is already ${order.status}`,
          order,
        });
        return;
      }

      const mockSession = {
        metadata: {
          orderId: order._id.toString(),
          userId: order.buyerId.toString(),
          productId: order.productId.toString(),
        },
      };

      await StripeController.finalizePayment(mockSession);

      const updatedOrder = await Order.findById(orderId);

      res.status(200).json({
        success: true,
        message: 'Mock payment success processed successfully',
        order: updatedOrder,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Finalizes the order, updates MongoDB, and releases the Redis reservation lock
   */
  private static async finalizePayment(session: any): Promise<void> {
    const { orderId, userId, productId } = session.metadata;

    const order = await Order.findById(orderId);
    if (!order || order.status !== 'reserved') {
      console.log(`Order ${orderId} not found or not in reserved state.`);
      return;
    }

    // 1. Update Order Status in MongoDB
    order.status = 'paid';
    await order.save();

    // 2. Commit Reservation in Redis (deletes reservation key, keeping the stock reduction)
    await RedisService.confirmReservation(productId, userId);

    // 3. Decrement stock counts in MongoDB for persistent consistency
    await Product.findByIdAndUpdate(productId, {
      $inc: { stock: -order.quantity },
    });

    // 4. Retrieve live stock and broadcast update via Socket.IO
    const currentStock = await RedisService.getStock(productId);
    if (currentStock !== null) {
      SocketService.emitStockUpdate(productId, currentStock);
    }

    console.log(`Order ${orderId} successfully completed and stock committed.`);
  }

  /**
   * Expires the session and releases the stock reservation back to Redis
   */
  private static async expireSession(session: any): Promise<void> {
    const { orderId, userId, productId } = session.metadata;

    const order = await Order.findById(orderId);
    if (!order || order.status !== 'reserved') {
      console.log(`Order ${orderId} not found or not in reserved state. Cannot expire.`);
      return;
    }

    // 1. Update Order status in MongoDB to expired
    order.status = 'expired';
    await order.save();

    // 2. Release Redis stock back to the cache pool
    await RedisService.releaseStock(productId, userId);

    // 3. Broadcast new stock level
    const currentStock = await RedisService.getStock(productId);
    if (currentStock !== null) {
      SocketService.emitStockUpdate(productId, currentStock);
    }

    console.log(`Order ${orderId} expired. Stock released back to pool.`);
  }
}
