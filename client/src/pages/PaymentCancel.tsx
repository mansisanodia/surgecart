import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

export const PaymentCancel: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');

  const handleReleaseReservation = async () => {
    if (!orderId) {
      navigate('/');
      return;
    }
    try {
      // Manually cancel the order to release the stock reservation immediately
      await api.post(`/orders/${orderId}/cancel`);
      navigate('/');
    } catch (err) {
      console.error('Error cancelling order:', err);
      navigate('/orders');
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 bg-dark-950 text-center">
      <div className="w-full max-w-md rounded-2xl glass-panel-glow p-8 relative overflow-hidden">
        {/* Gradients */}
        <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-rose-500/10 blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-slate-500/10 blur-3xl"></div>

        <div className="flex flex-col items-center gap-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <AlertTriangle className="h-8 w-8" />
          </div>

          <div className="flex flex-col gap-1.5">
            <h2 className="text-2xl font-extrabold text-white">Checkout Cancelled</h2>
            <p className="text-sm text-slate-400">Your checkout was aborted. The reserved stock will expire and release back to the marketplace in 10 minutes if unpaid.</p>
          </div>

          {orderId && (
            <div className="rounded-xl bg-slate-900 border border-slate-800/80 px-4 py-2.5 text-xs text-slate-400">
              Order ID: <span className="font-semibold text-slate-200">{orderId}</span>
            </div>
          )}

          <div className="flex flex-col gap-3 w-full mt-4">
            <button
              onClick={handleReleaseReservation}
              className="gradient-btn w-full flex items-center justify-center gap-2 py-3"
            >
              Release Stock & Return Home
            </button>
            
            <button
              onClick={() => navigate('/orders')}
              className="secondary-btn w-full flex items-center justify-center gap-2 py-3"
            >
              <RefreshCw className="h-4 w-4" />
              View Reservation in Orders
            </button>

            <button
              onClick={() => navigate('/')}
              className="text-xs text-slate-500 hover:text-slate-300 mt-2 flex items-center justify-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              Return to Marketplace
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default PaymentCancel;
