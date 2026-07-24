import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import type { Order } from '../types';
import { ShoppingBag, ArrowRight, XCircle, CheckCircle2, RefreshCw, Loader2, AlertCircle, Sparkles } from 'lucide-react';

export const OrderHistory: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const isMockCheckout = searchParams.get('mockCheckout') === 'true';
  const highlightedOrderId = searchParams.get('orderId');

  // Fetch orders
  const { data: response, isLoading, error, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await api.get('/orders');
      return res.data;
    },
  });

  const orders: Order[] = response?.orders || [];

  // Cancel reservation mutation
  const cancelMutation = useMutation({
    mutationFn: async (orderId: string) => {
      await api.post(`/orders/${orderId}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const handleCancelOrder = (orderId: string) => {
    if (window.confirm('Cancel this reservation? Stock will be released back to the marketplace immediately.')) {
      cancelMutation.mutate(orderId);
    }
  };

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="h-3 w-3" /> Paid
          </span>
        );
      case 'reserved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
            Reserved
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
            Cancelled
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <XCircle className="h-3 w-3" /> Expired
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 text-left">
      <div className="flex items-center justify-between border-b border-slate-800 pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Order History</h1>
          <p className="text-sm text-slate-400 mt-1">Review checkout reservations, completed payments, and release logs.</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Reload
        </button>
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-brand-500" />
          <p className="text-sm text-slate-400">Loading order history...</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-500/15 border border-rose-500/25 p-4 text-sm text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Failed to fetch order history. Please try again.</span>
        </div>
      )}

      {!isLoading && !error && orders.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-800 p-16 text-center">
          <ShoppingBag className="mx-auto h-12 w-12 text-slate-600 mb-4" />
          <h3 className="text-lg font-semibold text-slate-300 mb-1">No orders yet</h3>
          <p className="text-slate-500 text-sm max-w-sm mx-auto">
            You haven't participated in any flash sales yet. Head back to the marketplace to search active deals.
          </p>
        </div>
      )}

      {!isLoading && !error && orders.length > 0 && (
        <div className="flex flex-col gap-4">
          {isMockCheckout && (
            <div className="mb-2 rounded-2xl border border-brand-500/30 bg-brand-500/10 p-5 text-left text-sm text-brand-300 relative overflow-hidden glass-panel-glow">
              <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-brand-500/5 blur-2xl -z-10"></div>
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-brand-400 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <h3 className="font-extrabold text-white text-base mb-1">⚡ Stripe Sandbox Mode Active</h3>
                  <p className="text-slate-300">
                    Your stock reservation has been successfully secured in Redis! Click the **Simulate Pay** button on the highlighted order below to confirm payment and finalize the platform transaction.
                  </p>
                </div>
              </div>
            </div>
          )}

          {orders.map((order) => {
            const product = order.productId as any;
            if (!product) return null;

            const isHighlighted = order._id === highlightedOrderId;

            return (
              <div
                key={order._id}
                className={`rounded-2xl glass-panel border p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 hover:border-slate-700 transition-all ${
                  isHighlighted
                    ? 'border-brand-500 ring-2 ring-brand-500/30 shadow-lg shadow-brand-500/10 scale-[1.01]'
                    : 'border-slate-800'
                }`}
              >
                {/* Details */}
                <div className="flex items-center gap-4 text-left">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-16 w-16 rounded-xl object-cover bg-slate-800 shrink-0 border border-slate-800"
                  />
                  <div className="flex flex-col">
                    <span className="font-bold text-white text-lg">{product.name}</span>
                    <span className="text-xs text-slate-400 mt-0.5">
                      Reserved on {new Date(order.createdAt).toLocaleString()}
                    </span>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm font-semibold text-slate-200">${product.price.toFixed(2)}</span>
                      <span className="text-slate-600 text-xs">|</span>
                      <span className="text-xs text-slate-400">Qty: {order.quantity}</span>
                    </div>
                  </div>
                </div>

                {/* Status and Action CTAs */}
                <div className="flex sm:flex-col items-start sm:items-end justify-between sm:justify-center gap-3">
                  <div>{getStatusBadge(order.status)}</div>

                  {order.status === 'reserved' && (
                    <div className="flex items-center gap-2">
                      {/* Cancel reservation */}
                      <button
                        onClick={() => handleCancelOrder(order._id)}
                        disabled={cancelMutation.isPending}
                        className="text-xs font-semibold text-rose-400 hover:text-rose-300 py-1.5 px-3 rounded-lg border border-rose-500/10 hover:bg-rose-500/5 transition-all"
                      >
                        Cancel
                      </button>

                      {/* Mock manual payment success for developers */}
                      {process.env.NODE_ENV !== 'production' && (
                        <button
                          onClick={async () => {
                            if (window.confirm('Simulate payment success for this order?')) {
                              try {
                                await api.post('/stripe/mock-payment-success', { orderId: order._id });
                                refetch();
                              } catch (err: any) {
                                alert(err.response?.data?.message || 'Mock payment failed');
                              }
                            }
                          }}
                          className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 py-1.5 px-3 rounded-lg border border-emerald-500/10 hover:bg-emerald-500/5 transition-all"
                        >
                          Simulate Pay
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
export default OrderHistory;
