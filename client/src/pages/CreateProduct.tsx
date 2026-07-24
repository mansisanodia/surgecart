import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';

export const CreateProduct: React.FC = () => {
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

      await api.post('/products', payload);
      navigate('/dashboard');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to create product.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8 text-left">
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </button>

      <div className="rounded-2xl glass-panel-glow border border-brand-500/20 p-8 relative overflow-hidden">
        <h2 className="text-2xl font-bold text-white mb-2">Create Flash Sale Product</h2>
        <p className="text-sm text-slate-400 mb-6">Initialize a new item. Stock counts will be cached in Redis automatically.</p>

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
                min="1"
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
            <label className="text-xs font-semibold text-slate-300">Image URL (Optional)</label>
            <input
              type="url"
              className="input-field"
              placeholder="e.g. https://images.unsplash.com/... (blank for fallback)"
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
              'Publish Flash Sale'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
export default CreateProduct;
