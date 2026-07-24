import { Product } from '../models/product.model';
import { Order } from '../models/order.model';
import { QueueService } from './queue.service';
import { RedisService } from './redis.service';
import { SocketService } from './socket.service';

export class BackgroundWorker {
  private static queueInterval: NodeJS.Timeout | null = null;
  private static cleanupInterval: NodeJS.Timeout | null = null;

  /**
   * Starts all background worker processes
   */
  static start(): void {
    console.log('Background worker service started.');

    // 1. Process flash sale queues every 5 seconds
    this.queueInterval = setInterval(async () => {
      try {
        await this.processActiveQueues();
      } catch (error) {
        console.error('Worker: Error processing queues:', error);
      }
    }, 5000);

    // 2. Clean up expired MongoDB reservations every 60 seconds
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.cleanupExpiredReservations();
      } catch (error) {
        console.error('Worker: Error cleaning up expired reservations:', error);
      }
    }, 60000);
  }

  /**
   * Stops all background workers (useful for testing or shutdown)
   */
  static stop(): void {
    if (this.queueInterval) clearInterval(this.queueInterval);
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    console.log('Background worker service stopped.');
  }

  /**
   * Processes queues for all active flash sales
   */
  private static async processActiveQueues(): Promise<void> {
    const now = new Date();
    
    // Find all products whose sale is active and has stock > 0
    const activeProducts = await Product.find({
      saleStartTime: { $lte: now },
      saleEndTime: { $gte: now },
    });

    for (const product of activeProducts) {
      const productId = product._id.toString();
      
      // Get live stock from Redis
      let stock = await RedisService.getStock(productId);
      if (stock === null) {
        // If not in Redis, load it
        await RedisService.loadStock(productId, product.stock);
        stock = product.stock;
      }

      if (stock <= 0) {
        // Out of stock, clear queue
        const queueLength = await QueueService.getQueueLength(productId);
        if (queueLength > 0) {
          console.log(`Product ${productId} out of stock. Clearing queue of size ${queueLength}.`);
          // We can let the queue empty naturally or process it with limit 0
          await QueueService.processQueue(productId, 0); 
        }
        continue;
      }

      const queueLength = await QueueService.getQueueLength(productId);
      if (queueLength > 0) {
        // Determine batch size (e.g. process up to 5 users or remaining stock)
        const batchSize = Math.min(5, stock, queueLength);
        console.log(`Processing queue for product ${productId}. Batch size: ${batchSize}. Stock: ${stock}.`);
        await QueueService.processQueue(productId, batchSize);
      }
    }
  }

  /**
   * Finds orders in 'reserved' state older than 10 minutes, cancels them and releases Redis stock
   */
  private static async cleanupExpiredReservations(): Promise<void> {
    // 10 minutes expiration window
    const expirationThreshold = new Date(Date.now() - 10 * 60 * 1000);

    const expiredOrders = await Order.find({
      status: 'reserved',
      createdAt: { $lt: expirationThreshold },
    });

    if (expiredOrders.length === 0) return;

    console.log(`Found ${expiredOrders.length} expired reservations. Cleaning up...`);

    for (const order of expiredOrders) {
      order.status = 'expired';
      await order.save();

      const productId = order.productId.toString();
      const userId = order.buyerId.toString();

      // Release stock in Redis
      await RedisService.releaseStock(productId, userId);

      // Broadcast stock update
      const currentStock = await RedisService.getStock(productId);
      if (currentStock !== null) {
        SocketService.emitStockUpdate(productId, currentStock);
      }

      console.log(`Order ${order._id} marked expired and stock reverted for product ${productId}.`);
    }
  }
}
export default BackgroundWorker;
