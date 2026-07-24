import { redis } from '../config/redis';
import { RedisService } from './redis.service';
import { SocketService } from './socket.service';

export class QueueService {
  /**
   * Adds a user to the flash sale queue using a Sorted Set (ZSET)
   */
  static async joinQueue(productId: string, userId: string): Promise<number> {
    const queueKey = `product:queue:${productId}`;
    const score = Date.now();

    // Check if user already has an active purchase pass
    const hasPass = await RedisService.hasPurchasePass(productId, userId);
    if (hasPass) {
      return 0; // Means they can proceed directly
    }

    // ZADD: Add user if not exists
    await redis.zadd(queueKey, score, userId);

    // ZRANK: Get current 0-indexed position
    const rank = await redis.zrank(queueKey, userId);
    return rank !== null ? rank + 1 : 1;
  }

  /**
   * Gets the user's position in the queue
   */
  static async getQueuePosition(productId: string, userId: string): Promise<number> {
    const queueKey = `product:queue:${productId}`;
    const rank = await redis.zrank(queueKey, userId);
    return rank !== null ? rank + 1 : -1;
  }

  /**
   * Processes the queue: removes the top 'limit' users, grants them passes,
   * and notifies them. Then broadcasts updated positions to remaining users.
   */
  static async processQueue(productId: string, limit: number): Promise<void> {
    const queueKey = `product:queue:${productId}`;

    // Get the top 'limit' users from the ZSET
    const userIds = await redis.zrange(queueKey, 0, limit - 1);
    if (userIds.length === 0) return;

    for (const userId of userIds) {
      // Remove from queue
      await redis.zrem(queueKey, userId);
      // Grant purchase pass (expires in 120 seconds)
      const ttl = 120;
      await RedisService.grantPurchasePass(productId, userId, ttl);
      
      const passExpiresAt = Date.now() + ttl * 1000;
      // Socket.IO notification to specific user
      SocketService.emitQueueAuthorized(productId, userId, passExpiresAt);
    }

    // Broadcast new positions to remaining users in queue (process top 500 for performance)
    const remainingUsers = await redis.zrange(queueKey, 0, 499);
    for (let i = 0; i < remainingUsers.length; i++) {
      const userId = remainingUsers[i];
      SocketService.emitQueuePosition(productId, userId, i + 1);
    }
  }

  /**
   * Checks the queue length
   */
  static async getQueueLength(productId: string): Promise<number> {
    const queueKey = `product:queue:${productId}`;
    return redis.zcard(queueKey);
  }

  /**
   * Completely removes a user from the queue (e.g. on disconnect or user cancels)
   */
  static async leaveQueue(productId: string, userId: string): Promise<void> {
    const queueKey = `product:queue:${productId}`;
    await redis.zrem(queueKey, userId);
  }
}
