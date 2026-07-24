import { redis } from '../config/redis';

// Lua script to atomically check stock and reserve it
const RESERVE_STOCK_LUA = `
  local stockKey = KEYS[1]
  local reservationKey = KEYS[2]
  local qty = tonumber(ARGV[1])
  local ttl = tonumber(ARGV[2])

  local currentStock = redis.call('get', stockKey)
  if not currentStock then
      return -1
  end

  if tonumber(currentStock) >= qty then
      redis.call('decrby', stockKey, qty)
      redis.call('set', reservationKey, qty, 'EX', ttl)
      return 1
  else
      return 0
  end
`;

export class RedisService {
  /**
   * Caches product stock in Redis
   */
  static async loadStock(productId: string, stock: number): Promise<void> {
    const stockKey = `product:stock:${productId}`;
    await redis.set(stockKey, stock);
  }

  /**
   * Gets cached product stock from Redis
   */
  static async getStock(productId: string): Promise<number | null> {
    const stockKey = `product:stock:${productId}`;
    const stock = await redis.get(stockKey);
    return stock !== null ? parseInt(stock, 10) : null;
  }

  /**
   * Deletes cached product stock from Redis (e.g. if product deleted)
   */
  static async deleteStock(productId: string): Promise<void> {
    const stockKey = `product:stock:${productId}`;
    await redis.del(stockKey);
  }

  /**
   * Atomically reserve stock for a user
   * Returns:
   *  1 = Success
   *  0 = Insufficient stock
   * -1 = Product stock not cached in Redis
   */
  static async reserveStock(
    productId: string,
    userId: string,
    quantity: number,
    ttlSeconds = 600 // 10 minutes default
  ): Promise<number> {
    const stockKey = `product:stock:${productId}`;
    const reservationKey = `product:reservation:${productId}:${userId}`;

    const result = await redis.eval(
      RESERVE_STOCK_LUA,
      2,
      stockKey,
      reservationKey,
      quantity,
      ttlSeconds
    );

    return Number(result);
  }

  /**
   * Releases an active/expired reservation, reverting the stock back to the cache
   */
  static async releaseStock(productId: string, userId: string): Promise<void> {
    const stockKey = `product:stock:${productId}`;
    const reservationKey = `product:reservation:${productId}:${userId}`;

    // Get the reserved quantity
    const reservedQty = await redis.get(reservationKey);
    if (!reservedQty) return;

    const qty = parseInt(reservedQty, 10);

    // Revert stock and delete reservation key in a transaction
    await redis
      .multi()
      .incrby(stockKey, qty)
      .del(reservationKey)
      .exec();
  }

  /**
   * Confirms payment and completes the reservation by deleting the reservation key without reverting stock
   */
  static async confirmReservation(productId: string, userId: string): Promise<void> {
    const reservationKey = `product:reservation:${productId}:${userId}`;
    await redis.del(reservationKey);
  }

  /**
   * Grants a purchase pass to a user from the queue
   */
  static async grantPurchasePass(productId: string, userId: string, ttlSeconds = 120): Promise<void> {
    const passKey = `product:pass:${productId}:${userId}`;
    await redis.set(passKey, 'true', 'EX', ttlSeconds);
  }

  /**
   * Checks if a user has a valid purchase pass
   */
  static async hasPurchasePass(productId: string, userId: string): Promise<boolean> {
    const passKey = `product:pass:${productId}:${userId}`;
    const pass = await redis.get(passKey);
    return pass !== null;
  }

  /**
   * Deletes the purchase pass after use
   */
  static async usePurchasePass(productId: string, userId: string): Promise<void> {
    const passKey = `product:pass:${productId}:${userId}`;
    await redis.del(passKey);
  }
}
