export interface User {
  id: string;
  name: string;
  email: string;
  role: 'buyer' | 'seller' | 'admin';
}

export interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  sellerId: string;
  saleStartTime: string;
  saleEndTime: string;
  image: string;
  createdAt: string;
  updatedAt: string;
  isLiveStock?: boolean;
}

export interface Order {
  _id: string;
  buyerId: string;
  productId: Product | string;
  quantity: number;
  status: 'reserved' | 'paid' | 'cancelled' | 'expired';
  stripeSessionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QueueStatus {
  status: 'waiting' | 'authorized' | 'not_in_queue';
  position: number;
  passExpiresAt?: number;
}
