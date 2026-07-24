import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import type { Product } from '../types';
import { CountdownTimer } from '../components/CountdownTimer';
import { Sparkles, Calendar, ShoppingBag, Loader2 } from 'lucide-react';

export const Home: React.FC = () => {
  // Fetch products
  const { data: response, isLoading, error, refetch } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await api.get('/products');
      return res.data;
    },
    refetchInterval: 10000, // Refetch every 10 seconds for stock sync
  });

  const products: Product[] = response?.products || [];

  const getSaleStatus = (product: Product) => {
    const now = new Date();
    const start = new Date(product.saleStartTime);
    const end = new Date(product.saleEndTime);

    if (now < start) return 'upcoming';
    if (now > end) return 'ended';
    return 'active';
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero Banner */}
      <div className="relative mb-12 rounded-3xl overflow-hidden glass-panel-glow border border-brand-500/30 p-8 md:p-12">
        <div className="absolute top-0 right-0 -z-10 h-72 w-72 rounded-full bg-brand-500/10 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -z-10 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl"></div>

        <div className="max-w-2xl text-left">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/20 px-3.5 py-1 text-xs font-bold text-brand-400 border border-brand-500/30 mb-4 animate-pulse">
            <Sparkles className="h-3 w-3" />
            2026 FLASH SALES
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl">
            High-Concurrency <br />
            <span className="bg-gradient-to-r from-brand-400 to-fuchsia-400 bg-clip-text text-transparent">
              SurgeCart Sales
            </span>
          </h1>
          <p className="mt-4 text-base text-slate-300 sm:text-lg">
            Experience fair-play queueing, real-time stock allocation, and lightning-fast checkouts on limited stock items.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-6 text-left">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">Live & Upcoming Sales</h2>
            <p className="text-sm text-slate-400">Grab high-demand products before they sell out.</p>
          </div>
          <button
            onClick={() => refetch()}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Refresh stock
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-brand-500" />
            <p className="text-sm text-slate-400">Loading flash sale products...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-8 text-center">
            <p className="text-rose-400 font-semibold mb-2">Failed to load marketplace</p>
            <p className="text-slate-400 text-sm mb-4">Please try refreshing the page or check your connection.</p>
            <button onClick={() => refetch()} className="secondary-btn">Retry</button>
          </div>
        )}

        {/* Products Grid */}
        {!isLoading && !error && products.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-800 p-16 text-center">
            <ShoppingBag className="mx-auto h-12 w-12 text-slate-600 mb-4" />
            <h3 className="text-lg font-semibold text-slate-300 mb-1">No products listed</h3>
            <p className="text-slate-500 text-sm max-w-sm mx-auto">
              Check back later or register as a seller to list your own products.
            </p>
          </div>
        )}

        {!isLoading && !error && products.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => {
              const status = getSaleStatus(product);
              const isOutOfStock = product.stock <= 0;

              return (
                <div
                  key={product._id}
                  className="group relative flex flex-col overflow-hidden rounded-2xl glass-panel border border-slate-800/80 hover:border-brand-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-brand-500/5 hover:-translate-y-1"
                >
                  {/* Product Image */}
                  <div className="aspect-video w-full overflow-hidden bg-slate-900 relative">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    
                    {/* Badge */}
                    <div className="absolute top-3 left-3">
                      {status === 'upcoming' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          <Calendar className="h-3 w-3" /> UPCOMING
                        </span>
                      )}
                      {status === 'ended' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                          ENDED
                        </span>
                      )}
                      {status === 'active' && !isOutOfStock && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
                          LIVE
                        </span>
                      )}
                      {isOutOfStock && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          SOLD OUT
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="font-bold text-slate-100 line-clamp-1 group-hover:text-brand-400 transition-colors">
                      {product.name}
                    </h3>
                    <p className="mt-1 text-sm text-slate-400 line-clamp-2 min-h-[2.5rem]">
                      {product.description}
                    </p>

                    {/* Countdown/Timer info */}
                    <div className="mt-4 border-t border-slate-800/80 pt-4 flex items-center justify-between">
                      {status === 'upcoming' && (
                        <CountdownTimer
                          targetDate={product.saleStartTime}
                          onExpiry={() => refetch()}
                        />
                      )}
                      {status === 'active' && (
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                            Live Stock
                          </span>
                          <span className={`text-sm font-bold ${isOutOfStock ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {product.stock} units
                          </span>
                        </div>
                      )}
                      {status === 'ended' && (
                        <span className="text-xs font-semibold text-slate-500">Sale closed</span>
                      )}

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Price</span>
                        <span className="text-lg font-extrabold text-white">${product.price.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <Link
                      to={`/product/${product._id}`}
                      className={`mt-6 w-full text-center py-2.5 rounded-xl font-bold transition-all text-sm block ${
                        status === 'upcoming'
                          ? 'bg-slate-800 text-slate-400 pointer-events-none cursor-default border border-slate-700/50'
                          : isOutOfStock
                          ? 'bg-slate-800 text-rose-400 border border-rose-500/10 pointer-events-none'
                          : 'gradient-btn'
                      }`}
                    >
                      {status === 'upcoming'
                        ? 'Sale Starts Soon'
                        : isOutOfStock
                        ? 'Out of Stock'
                        : 'Enter Flash Sale'}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
export default Home;
