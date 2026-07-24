import { Request, Response, NextFunction } from 'express';
import { redis } from '../config/redis';
import { AppError } from '../utils/errors';

/**
 * Redis-based Sliding Window Rate Limiter for flash-sale queue actions
 * Restricts users/IPs to a maximum of 5 requests per 10 seconds.
 */
export const queueRateLimiter = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const identifier = req.user?.id || req.ip || 'anonymous';
  const key = `rate:limit:queue:${identifier}`;
  const now = Date.now();
  const windowMs = 10000; // 10 seconds window
  const maxRequests = 5;  // 5 requests limit

  try {
    const multi = redis.multi();
    
    // ZADD: Add current timestamp (random suffix prevents member clashes)
    multi.zadd(key, now, `${now}-${Math.random()}`);
    
    // ZREMRANGEBYSCORE: Remove requests older than the sliding window threshold
    multi.zremrangebyscore(key, 0, now - windowMs);
    
    // ZCARD: Get count of remaining timestamps in the window
    multi.zcard(key);
    
    // EXPIRE: Set sliding window expiration on the ZSET key
    multi.expire(key, Math.ceil(windowMs / 1000));
    
    const results = await multi.exec();
    if (!results) {
      return next();
    }

    // Index 2 contains the result of ZCARD
    const count = results[2][1] as number;

    if (count > maxRequests) {
      next(new AppError('Slow down! Too many queue requests. Please try again in a few seconds.', 429));
      return;
    }

    next();
  } catch (error) {
    // Fail-open: If Redis rate limiting fails, log the error and allow request to pass in dev
    console.error('[Rate Limiter Error] Redis rate check failed:', error);
    next();
  }
};
export default queueRateLimiter;
