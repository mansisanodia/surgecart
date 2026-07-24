import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { Product } from '../types';
import { Plus, Edit, Trash2, Calendar, ShoppingBag, Loader2, AlertCircle } from 'lucide-react';

export const SellerDashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch seller's products
  const { data: response, isLoading, error } = useQuery({
    queryKey: ['seller-products'],
    queryFn: async () => {
      const res = await api.get('/products/seller/list');
      return res.data;
    },
  });

  const products: Product[] = response?.products || [];

  // Delete product mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/products/${id}`);
    },
    onSuccess: () => {
      // Invalidate queries to reload
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this product? This will also remove its stock from Redis.')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-6 mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Seller Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">Manage your flash sale items, edit details, and track stock.</p>
        </div>
        <Link
          to="/dashboard/create"
          className="gradient-btn flex items-center gap-1.5 self-start sm:self-center"
        >
          <Plus className="h-4 w-4" /> Create Product
        </Link>
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-brand-500" />
          <p className="text-sm text-slate-400">Loading products...</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-500/15 border border-rose-500/25 p-4 text-sm text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Failed to load products. Check your permission or connection.</span>
        </div>
      )}

      {!isLoading && !error && products.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-800 p-16 text-center">
          <ShoppingBag className="mx-auto h-12 w-12 text-slate-600 mb-4" />
          <h3 className="text-lg font-semibold text-slate-300 mb-1">No products created yet</h3>
          <p className="text-slate-500 text-sm max-w-sm mx-auto mb-6">
            Get started by creating your first high-concurrency flash sale item.
          </p>
          <Link to="/dashboard/create" className="gradient-btn">
            Create First Product
          </Link>
        </div>
      )}

      {!isLoading && !error && products.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/30">
          <table className="w-full border-collapse text-left text-sm text-slate-300">
            <thead className="bg-slate-900/60 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Product Details</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Redis/Live Stock</th>
                <th className="px-6 py-4">Sale Schedule</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {products.map((product) => {
                const start = new Date(product.saleStartTime);
                const end = new Date(product.saleEndTime);
                const now = new Date();
                const isLive = now >= start && now <= end;

                return (
                  <tr key={product._id} className="hover:bg-slate-900/20 transition-colors">
                    {/* Item info */}
                    <td className="px-6 py-4 flex items-center gap-4">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="h-12 w-12 rounded-lg object-cover bg-slate-800 shrink-0"
                      />
                      <div className="flex flex-col">
                        <span className="font-semibold text-white">{product.name}</span>
                        <span className="text-xs text-slate-400 line-clamp-1 max-w-[250px]">{product.description}</span>
                      </div>
                    </td>

                    {/* Price */}
                    <td className="px-6 py-4 font-bold text-slate-200">
                      ${product.price.toFixed(2)}
                    </td>

                    {/* Stock */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5 min-w-[120px]">
                        <div className="flex items-center justify-between">
                          <span className={`font-bold ${product.stock <= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {product.stock} units
                          </span>
                          {isLive && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/25 animate-pulse">
                              LIVE
                            </span>
                          )}
                        </div>
                        {/* Mini visual indicator */}
                        <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              product.stock <= 5 ? 'bg-rose-500' : product.stock <= 15 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, (product.stock / 50) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>

                    {/* Schedule */}
                    <td className="px-6 py-4 text-xs">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1 text-slate-300">
                          <Calendar className="h-3.5 w-3.5 text-brand-400 shrink-0" />
                          <span>Start: {start.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-400">
                          <Calendar className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          <span>End: {end.toLocaleString()}</span>
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/dashboard/edit/${product._id}`)}
                          className="p-2 rounded-lg text-slate-400 hover:text-brand-400 hover:bg-slate-800/80 transition-all"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product._id)}
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition-all"
                          title="Delete"
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
export default SellerDashboard;
