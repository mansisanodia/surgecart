import { Request, Response, NextFunction } from 'express';
import { Product } from '../models/product.model';
import { QueueService } from '../services/queue.service';
import { RedisService } from '../services/redis.service';
import { BadRequestError, NotFoundError } from '../utils/errors';

export class QueueController {
  /**
   * Puts the user in the flash sale queue for a specific product
   */
  static async joinQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { productId } = req.body;
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

      const now = new Date();
      if (now < product.saleStartTime) {
        throw new BadRequestError('Flash sale has not started yet');
      }
      if (now > product.saleEndTime) {
        throw new BadRequestError('Flash sale has already ended');
      }

      // Check if stock is already 0 in Redis
      const liveStock = await RedisService.getStock(productId);
      if (liveStock !== null && liveStock <= 0) {
        throw new BadRequestError('Product is out of stock');
      }

      const position = await QueueService.joinQueue(productId, userId);

      res.status(200).json({
        success: true,
        message: position === 0 ? 'You have active purchase rights' : 'Successfully joined the queue',
        position,
        status: position === 0 ? 'authorized' : 'waiting',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves the current position or pass status of a user
   */
  static async getQueueStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { productId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new BadRequestError('User identity required');
      }

      // 1. Check if user has an active pass
      const hasPass = await RedisService.hasPurchasePass(productId, userId);
      if (hasPass) {
        res.status(200).json({
          success: true,
          status: 'authorized',
          position: 0,
        });
        return;
      }

      // 2. Check ZSET rank
      const position = await QueueService.getQueuePosition(productId, userId);
      if (position !== -1) {
        res.status(200).json({
          success: true,
          status: 'waiting',
          position,
        });
        return;
      }

      // 3. Not in queue and no pass
      res.status(200).json({
        success: true,
        status: 'not_in_queue',
        position: -1,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Request to leave the queue
   */
  static async leaveQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { productId } = req.body;
      const userId = req.user?.id;

      if (!userId || !productId) {
        throw new BadRequestError('Missing product ID or user identity');
      }

      await QueueService.leaveQueue(productId, userId);

      res.status(200).json({
        success: true,
        message: 'Successfully left the queue',
      });
    } catch (error) {
      next(error);
    }
  }
}
