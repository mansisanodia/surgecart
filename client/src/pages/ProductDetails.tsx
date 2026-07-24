import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { CountdownTimer } from '../components/CountdownTimer';
import type { Product } from '../types';
import { AlertCircle, Clock, ShoppingCart, UserCheck, AlertTriangle, Loader2 } from 'lucide-react';

export const ProductDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const socket = useSocket();

  const [queueStatus, setQueueStatus] = useState<'waiting' | 'authorized' | 'not_in_queue'>('not_in_queue');
  const [checkingQueue, setCheckingQueue] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch product details
  const { data: response, isLoading, error } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const res = await api.get(`/products/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const product: Product | undefined = response?.product;

  // Sync queue status on load
  useEffect(() => {
    const checkQueueStatus = async () => {
      if (!user || !id) return;
      setCheckingQueue(true);
      try {
        const res = await api.get(`/queue/status/${id}`);
        setQueueStatus(res.data.status);
        if (res.data.status === 'waiting') {
          // If already in queue, send them to the Queue page
          navigate(`/queue/${id}`);
        }
      } catch (err) {
        console.error('Error fetching queue status:', err);
      } finally {
        setCheckingQueue(false);
      }
    };

    checkQueueStatus();
  }, [user, id, navigate]);

  // Join product room for real-time stock updates
  useEffect(() => {
    if (!socket || !id) return;

    socket.emit('join:product', id);

    socket.on('stock:update', ({ productId: pId, stock: newStock }: { productId: string; stock: number }) => {
      if (pId === id) {
        // Update stock inside React Query cache
        queryClient.setQueryData(['product', id], (old: any) => {
          if (!old) return old;
          return {
            ...old,
            product: {
              ...old.product,
              stock: newStock,
            },
          };
        });
      }
    });

    return () => {
      socket.emit('leave:product', id);
      socket.off('stock:update');
    };
  }, [socket, id, queryClient]);

  const getSaleStatus = () => {
    if (!product) return 'upcoming';
    const now = new Date();
    const start = new Date(product.saleStartTime);
    const end = new Date(product.saleEndTime);

    if (now < start) return 'upcoming';
    if (now > end) return 'ended';
    return 'active';
  };

  const handleQueueAction = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!id || !product) return;

    setErrorMsg(null);
    setActionLoading(true);

    try {
      if (queueStatus === 'authorized') {
        // Direct checkout! Reserve product and go to Stripe
        const res = await api.post('/orders/reserve', { productId: id });
        const { checkoutUrl } = res.data;
        if (checkoutUrl) {
          window.location.href = checkoutUrl;
        } else {
          throw new Error('Stripe checkout URL missing from response');
        }
      } else {
        // Join the queue
        const res = await api.post('/queue/join', { productId: id });
        const { status } = res.data;
        setQueueStatus(status);
        if (status === 'waiting') {
          navigate(`/queue/${id}`);
        } else if (status === 'authorized') {
          // Immediately redirect to checkout if they bypassed the queue (e.g. queue was empty)
          const reserveRes = await api.post('/orders/reserve', { productId: id });
          window.location.href = reserveRes.data.checkoutUrl;
        }
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Action failed. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-dark-950">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Product Not Found</h2>
        <p className="text-slate-400 mb-6">This item might have been removed or doesn't exist.</p>
        <button onClick={() => navigate('/')} className="gradient-btn">Back to Marketplace</button>
      </div>
    );
  }

  const saleStatus = getSaleStatus();
  const isOutOfStock = product.stock <= 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 text-left">
      <div className="grid gap-8 md:grid-cols-2">
        {/* Product image container */}
        <div className="rounded-2xl overflow-hidden bg-slate-900 border border-slate-800/80">
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover aspect-square"
          />
        </div>

        {/* Product Details info */}
        <div className="flex flex-col justify-between">
          <div className="flex flex-col gap-4">
            {/* Status indicators */}
            <div className="flex flex-wrap items-center gap-2">
              {saleStatus === 'upcoming' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Clock className="h-3.5 w-3.5" /> Upcoming Flash Sale
                </span>
              )}
              {saleStatus === 'active' && !isOutOfStock && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
                  ● Live Flash Sale
                </span>
              )}
              {isOutOfStock && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  Sold Out
                </span>
              )}
              {saleStatus === 'ended' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
                  Sale Ended
                </span>
              )}
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-white">{product.name}</h1>
            <p className="text-slate-300 leading-relaxed text-sm">{product.description}</p>

            <div className="mt-4 flex items-baseline gap-4">
              <span className="text-3xl font-extrabold text-white">${product.price.toFixed(2)}</span>
            </div>

            {/* Timers & Stock status boxes */}
            <div className="mt-6 rounded-2xl glass-panel p-5 border border-slate-800 flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Stock Level</span>
                <span className={`text-xl font-bold ${isOutOfStock ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {isOutOfStock ? '0 units left' : `${product.stock} units available`}
                </span>
              </div>

              {saleStatus === 'upcoming' && (
                <CountdownTimer
                  targetDate={product.saleStartTime}
                  onExpiry={() => queryClient.invalidateQueries({ queryKey: ['product', id] })}
                />
              )}

              {saleStatus === 'active' && !isOutOfStock && (
                <div className="flex flex-col gap-1 items-end">
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Ends in</span>
                  <span className="text-sm font-semibold text-slate-200">
                    {new Date(product.saleEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
            </div>

            {/* Live Stock Level visual bar */}
            {!isOutOfStock && (
              <div className="mt-4 bg-slate-900/60 rounded-2xl p-4 border border-slate-800/80">
                <div className="flex justify-between items-center text-xs mb-1.5 font-semibold">
                  <span className="text-slate-400 uppercase tracking-wider">Stock Depletion Speed</span>
                  <span className={product.stock <= 5 ? 'text-rose-400 animate-pulse font-bold' : product.stock <= 15 ? 'text-brand-400' : 'text-emerald-400'}>
                    {product.stock <= 5 ? 'CRITICAL: Sellout Imminent' : product.stock <= 15 ? 'Limited stock remaining' : 'In stock'}
                  </span>
                </div>
                
                {/* Visual bar */}
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      product.stock <= 5
                        ? 'bg-rose-500 animate-pulse shadow-lg shadow-rose-500/30'
                        : product.stock <= 15
                        ? 'bg-brand-500 shadow-lg shadow-brand-500/30'
                        : 'bg-emerald-500 shadow-lg shadow-emerald-500/30'
                    }`}
                    style={{ width: `${Math.min(100, (product.stock / 50) * 100)}%` }} // assume starting stock max of 50 for visual scaling
                  ></div>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-xs text-rose-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* Action CTA */}
          <div className="mt-8 flex flex-col gap-3">
            {checkingQueue ? (
              <button disabled className="secondary-btn w-full flex items-center justify-center gap-2 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> Checking eligibility...
              </button>
            ) : (
              <>
                {saleStatus === 'upcoming' && (
                  <button
                    disabled
                    className="w-full bg-slate-800 text-slate-400 border border-slate-700/50 py-3 rounded-xl font-bold cursor-default flex items-center justify-center gap-2"
                  >
                    Sale Starts {new Date(product.saleStartTime).toLocaleDateString()} at {new Date(product.saleStartTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </button>
                )}

                {saleStatus === 'ended' && (
                  <button
                    disabled
                    className="w-full bg-slate-800 text-slate-500 border border-slate-700/50 py-3 rounded-xl font-bold cursor-default"
                  >
                    This Flash Sale has ended
                  </button>
                )}

                {saleStatus === 'active' && (
                  <button
                    onClick={handleQueueAction}
                    disabled={isOutOfStock || actionLoading}
                    className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                      isOutOfStock
                        ? 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-default'
                        : queueStatus === 'authorized'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/10 animate-bounce'
                        : 'gradient-btn'
                    }`}
                  >
                    {actionLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                    ) : queueStatus === 'authorized' ? (
                      <>
                        <UserCheck className="h-5 w-5" /> Buy Now (Authorized)
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="h-5 w-5" /> Join Flash Sale Queue
                      </>
                    )}
                  </button>
                )}
              </>
            )}

            <button
              onClick={() => navigate('/')}
              className="secondary-btn w-full py-3"
            >
              Continue Browsing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ProductDetails;
