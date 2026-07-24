import { getIO } from '../config/socket';

export class SocketService {
  /**
   * Broadcasts stock level updates to all clients viewing the product page
   */
  static emitStockUpdate(productId: string, stock: number): void {
    try {
      const io = getIO();
      io.to(`product:${productId}`).emit('stock:update', { productId, stock });
    } catch (error) {
      console.error('SocketService: Error emitting stock update:', error);
    }
  }

  /**
   * Notifies a specific user that they are authorized to purchase the product
   */
  static emitQueueAuthorized(productId: string, userId: string, passExpiresAt: number): void {
    try {
      const io = getIO();
      io.to(`queue:${productId}:${userId}`).emit('queue:authorized', {
        productId,
        userId,
        status: 'authorized',
        passExpiresAt,
      });
    } catch (error) {
      console.error('SocketService: Error emitting queue authorization:', error);
    }
  }

  /**
   * Notifies a specific user about their current queue position
   */
  static emitQueuePosition(productId: string, userId: string, position: number): void {
    try {
      const io = getIO();
      io.to(`queue:${productId}:${userId}`).emit('queue:position', {
        productId,
        userId,
        status: 'waiting',
        position,
      });
    } catch (error) {
      console.error('SocketService: Error emitting queue position:', error);
    }
  }
}
