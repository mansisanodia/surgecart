import Redis from 'ioredis';

const redisUri = process.env.REDIS_URI || 'redis://127.0.0.1:6379';

export const redis = new Redis(redisUri, {
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('connect', () => {
  console.log('Redis successfully connected.');
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});
