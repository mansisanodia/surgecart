import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowRight, ShoppingBag } from 'lucide-react';

export const PaymentSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 bg-dark-950 text-center">
      <div className="w-full max-w-md rounded-2xl glass-panel-glow p-8 relative overflow-hidden">
        {/* Gradients */}
        <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-brand-500/10 blur-3xl"></div>

        <div className="flex flex-col items-center gap-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <CheckCircle className="h-8 w-8" />
          </div>

          <div className="flex flex-col gap-1.5">
            <h2 className="text-2xl font-extrabold text-white">Payment Successful!</h2>
            <p className="text-sm text-slate-400">Your order has been confirmed and stock is secured.</p>
          </div>

          {orderId && (
            <div className="rounded-xl bg-slate-900 border border-slate-800/80 px-4 py-2.5 text-xs text-slate-400">
              Order ID: <span className="font-semibold text-slate-200">{orderId}</span>
            </div>
          )}

          <div className="flex flex-col gap-3 w-full mt-4">
            <button
              onClick={() => navigate('/orders')}
              className="gradient-btn w-full flex items-center justify-center gap-2 py-3"
            >
              View My Orders
              <ArrowRight className="h-4 w-4" />
            </button>
            
            <button
              onClick={() => navigate('/')}
              className="secondary-btn w-full flex items-center justify-center gap-2 py-3"
            >
              <ShoppingBag className="h-4 w-4" />
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default PaymentSuccess;
