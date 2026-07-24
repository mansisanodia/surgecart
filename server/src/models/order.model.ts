import { Schema, model } from 'mongoose';

const orderSchema = new Schema(
  {
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Buyer ID is required'],
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
    },
    status: {
      type: String,
      enum: ['reserved', 'paid', 'cancelled', 'expired'],
      default: 'reserved',
    },
    stripeSessionId: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Order = model('Order', orderSchema);
export default Order;
