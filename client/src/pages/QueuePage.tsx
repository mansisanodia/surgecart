import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Loader2, ArrowLeft, Users, Zap, CheckCircle, AlertTriangle } from 'lucide-react';

export const QueuePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const socket = useSocket();

  const [position, setPosition] = useState<number | null>(null);
  const [status, setStatus] = useState<'waiting' | 'authorized' | 'not_in_queue'>('waiting');
  const [productName, setProductName] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch product name and initial queue position on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!id || !user) return;

      try {
        const prodRes = await api.get(`/products/${id}`);
        setProductName(prodRes.data.product.name);

        const statusRes = await api.get(`/queue/status/${id}`);
        setStatus(statusRes.data.status);
        setPosition(statusRes.data.position);

        if (statusRes.data.status === 'authorized') {
          // If already authorized, proceed immediately
          handleCheckout();
        }
      } catch (err) {
        console.error('Error fetching initial queue data:', err);
        setErrorMsg('Failed to check queue status. Please try joining again.');
      }
    };

    fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  // Connect Socket.IO listeners
  useEffect(() => {
    if (!socket || !id || !user || status === 'authorized') return;

    // Join queue room
    socket.emit('join:queue', { productId: id, userId: user.id });

    // Listen for queue position changes
    socket.on('queue:position', (data: { position: number }) => {
      setPosition(data.position);
    });

    // Listen for authorization
    socket.on('queue:authorized', () => {
      setStatus('authorized');
      setPosition(0);
      handleCheckout(); // Auto-checkout on authorization
    });

    // Cleanup
    return () => {
      socket.emit('leave:queue', { productId: id, userId: user.id });
      socket.off('queue:position');
      socket.off('queue:authorized');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, id, user, status]);

  // Fallback Polling (in case Socket connection drops)
  useEffect(() => {
    if (status === 'authorized' || !id) return;

    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/queue/status/${id}`);
        setStatus(res.data.status);
        setPosition(res.data.position);

        if (res.data.status === 'authorized') {
          clearInterval(interval);
          handleCheckout();
        }
      } catch (err) {
        console.error('Queue status polling error:', err);
      }
    }, 4000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, id]);

  const handleCheckout = async () => {
    if (!id || checkoutLoading) return;
    setCheckoutLoading(true);
    setErrorMsg(null);

    try {
      const res = await api.post('/orders/reserve', { productId: id });
      const { checkoutUrl } = res.data;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Checkout failed. Stock might have sold out.');
      setStatus('not_in_queue');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleLeaveQueue = async () => {
    if (!id) return;
    try {
      await api.post('/queue/leave', { productId: id });
      navigate(`/product/${id}`);
    } catch (err) {
      console.error('Error leaving queue:', err);
      navigate('/');
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 bg-dark-950 text-center">
      <div className="w-full max-w-md rounded-2xl glass-panel-glow p-8 relative overflow-hidden">
        {/* Gradients */}
        <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-brand-500/10 blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-fuchsia-500/10 blur-3xl"></div>

        <button
          onClick={handleLeaveQueue}
          className="absolute top-4 left-4 flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3 w-3" /> Exit
        </button>

        {status === 'waiting' && (
          <div className="flex flex-col items-center gap-6 mt-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400">
              <Users className="h-8 w-8 animate-pulse-slow" />
            </div>

            <div className="flex flex-col gap-1.5">
              <h2 className="text-xl font-bold text-white">Queue Active</h2>
              <p className="text-sm text-slate-400 line-clamp-1">Waiting for: <span className="text-slate-200 font-semibold">{productName}</span></p>
            </div>

            {/* Position Display */}
            <div className="flex flex-col items-center justify-center h-40 w-40 rounded-full border-4 border-dashed border-brand-500/40 bg-slate-900/60 shadow-inner p-6 relative">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Your Position</span>
              <span className="text-5xl font-extrabold text-white glow-text my-1">
                {position !== null ? position : '-'}
              </span>
              <Loader2 className="h-4 w-4 animate-spin text-brand-500 mt-1" />
            </div>

            <div className="w-full mt-2 bg-slate-900/60 rounded-xl p-4 border border-slate-800/80 text-left">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Queue Processing Status</span>
                <span className="text-[10px] font-extrabold text-brand-400 uppercase">Step 2 of 4</span>
              </div>
              
              {/* Stepper bar */}
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5 relative">
                <div className="bg-gradient-to-r from-brand-500 to-fuchsia-500 h-full rounded-full transition-all duration-500 w-[50%] animate-pulse"></div>
              </div>

              {/* Stepper text stages */}
              <div className="grid grid-cols-4 gap-1 mt-3 text-[10px] text-slate-500 text-center font-semibold">
                <div className="text-brand-400">1. Joined</div>
                <div className="text-brand-400 animate-pulse">2. Waiting</div>
                <div>3. Reserve</div>
                <div>4. Pay</div>
              </div>
            </div>

            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              Do not close this page or press back. We will automatically redirect you to payment once it's your turn.
            </p>

            <button
              onClick={handleLeaveQueue}
              className="text-xs font-semibold text-rose-400 hover:text-rose-300 underline mt-4 transition-colors"
            >
              Give up position & leave queue
            </button>
          </div>
        )}

        {status === 'authorized' && (
          <div className="flex flex-col items-center gap-6 mt-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CheckCircle className="h-8 w-8" />
            </div>

            <div className="flex flex-col gap-1.5">
              <h2 className="text-xl font-bold text-white">Queue Passed!</h2>
              <p className="text-sm text-slate-400">Your checkout token is validated.</p>
            </div>

            <div className="flex flex-col items-center gap-3 w-full bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                <Zap className="h-4 w-4 animate-bounce" /> Securing stock reservation...
              </div>
              <p className="text-xs text-slate-400">
                Redirecting to Stripe payment page. Do not refresh.
              </p>
              
              {/* Stepper bar */}
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                <div className="bg-emerald-500 h-full rounded-full transition-all duration-500 w-[75%]"></div>
              </div>

              {/* Stepper text stages */}
              <div className="grid grid-cols-4 gap-1 mt-2.5 w-full text-[10px] text-slate-500 text-center font-semibold">
                <div className="text-emerald-400">1. Joined</div>
                <div className="text-emerald-400">2. Waiting</div>
                <div className="text-emerald-400 font-bold animate-pulse">3. Reserve</div>
                <div>4. Pay</div>
              </div>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-500/15 border border-rose-500/25 p-4 text-left text-sm text-rose-400 mt-4">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        )}

        {status === 'not_in_queue' && (
          <div className="flex flex-col items-center gap-6 mt-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <AlertTriangle className="h-8 w-8" />
            </div>

            <div className="flex flex-col gap-1.5">
              <h2 className="text-xl font-bold text-white">Session Cleared</h2>
              <p className="text-sm text-slate-400">You are no longer in the queue.</p>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-500/15 border border-rose-500/25 p-4 text-left text-sm text-rose-400 w-full">
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              onClick={() => navigate(`/product/${id}`)}
              className="gradient-btn w-full mt-4"
            >
              Rejoin Flash Sale
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
export default QueuePage;
