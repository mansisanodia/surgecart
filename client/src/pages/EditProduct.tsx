import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';

export const EditProduct: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [saleStartTime, setSaleStartTime] = useState('');
  const [saleEndTime, setSaleEndTime] = useState('');
  const [image, setImage] = useState('');
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch current product details
  const { data: response, isLoading: queryLoading, error: queryError } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const res = await api.get(`/products/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const product = response?.product;

  // Format date helper for datetime-local input
  const formatDateForInput = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    // return YYYY-MM-DDThh:mm format
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  useEffect(() => {
    if (product) {
      setName(product.name);
      setDescription(product.description);
      setPrice(String(product.price));
      setStock(String(product.stock));
      setSaleStartTime(formatDateForInput(product.saleStartTime));
      setSaleEndTime(formatDateForInput(product.saleEndTime));
      setImage(product.image || '');
    }
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const payload = {
        name,
        description,
        price: parseFloat(price),
        stock: parseInt(stock, 10),
        saleStartTime: new Date(saleStartTime).toISOString(),
        saleEndTime: new Date(saleEndTime).toISOString(),
        image: image || undefined,
      };

      await api.put(`/products/${id}`, payload);
      navigate('/dashboard');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to update product.');
    } finally {
      setLoading(false);
    }
  };

  if (queryLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-dark-950">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
      </div>
    );
  }

  if (queryError || !product) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Product Not Found</h2>
        <button onClick={() => navigate('/dashboard')} className="gradient-btn mt-4">Back to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8 text-left">
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </button>

      <div className="rounded-2xl glass-panel-glow border border-brand-500/20 p-8 relative overflow-hidden">
        <h2 className="text-2xl font-bold text-white mb-2">Edit Product</h2>
        <p className="text-sm text-slate-400 mb-6">Modify stock levels, price, or sale windows. Updating stock forces cache sync.</p>

        {errorMsg && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-500/15 border border-rose-500/25 p-4 text-sm text-rose-400 mb-6">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-300">Product Name</label>
            <input
              type="text"
              required
              className="input-field"
              placeholder="e.g. SurgePhone 15 Pro Max"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-300">Description</label>
            <textarea
              required
              rows={4}
              className="input-field resize-none"
              placeholder="Provide a detailed description of the product specs..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
            ></textarea>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Price */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">Price (USD)</label>
              <input
                type="number"
                step="0.01"
                required
                min="0.01"
                className="input-field"
                placeholder="e.g. 999.99"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Stock */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">Stock Units</label>
              <input
                type="number"
                required
                min="0"
                className="input-field"
                placeholder="e.g. 50"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Start Time */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">Sale Start Time</label>
              <input
                type="datetime-local"
                required
                className="input-field"
                value={saleStartTime}
                onChange={(e) => setSaleStartTime(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* End Time */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">Sale End Time</label>
              <input
                type="datetime-local"
                required
                className="input-field"
                value={saleEndTime}
                onChange={(e) => setSaleEndTime(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {/* Image */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-300">Image URL</label>
            <input
              type="url"
              className="input-field"
              placeholder="e.g. https://images.unsplash.com/..."
              value={image}
              onChange={(e) => setImage(e.target.value)}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="gradient-btn mt-4 py-3 flex items-center justify-center gap-2"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            ) : (
              'Save Product Settings'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
export default EditProduct;
