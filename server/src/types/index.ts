export type UserRole = 'buyer' | 'seller' | 'admin';

export interface IUserPayload {
  id: string;
  email: string;
  role: UserRole;
}

export type OrderStatus = 'reserved' | 'paid' | 'cancelled' | 'expired';

export interface IProductInput {
  name: string;
  description: string;
  price: number;
  stock: number;
  saleStartTime: Date;
  saleEndTime: Date;
  image?: string;
}

export interface IQueueStatus {
  position: number;
  status: 'waiting' | 'authorized' | 'not_in_queue';
  passExpiresAt?: number;
}
