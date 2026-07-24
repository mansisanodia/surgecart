import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ShoppingCart, Mail, Lock, User as UserIcon, ArrowRight, AlertCircle } from 'lucide-react';

export const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'buyer' | 'seller'>('buyer');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await api.post('/auth/register', { name, email, password, role });
      const { token, user } = response.data;
      login(token, user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 bg-dark-950">
      <div className="w-full max-w-md rounded-2xl glass-panel-glow p-8 text-center relative overflow-hidden">
        {/* Glow overlay */}
        <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-brand-500/10 blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-fuchsia-500/10 blur-3xl"></div>

        <div className="flex flex-col items-center gap-2 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-fuchsia-600 text-white shadow-lg">
            <ShoppingCart className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white mt-2">Create Account</h2>
          <p className="text-sm text-slate-400">Join SurgeCart for flash-sale events</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-500/15 border border-rose-500/25 p-4 text-left text-sm text-rose-400 mb-6">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
          {/* Full Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-300">Full Name</label>
            <div className="relative">
              <UserIcon className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
              <input
                type="text"
                required
                className="input-field pl-12"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-300">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
              <input
                type="email"
                required
                className="input-field pl-12"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-300">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
              <input
                type="password"
                required
                className="input-field pl-12"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {/* Role selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-300">Account Type</label>
            <div className="grid grid-cols-2 gap-2 bg-slate-900/60 p-1 rounded-xl border border-slate-800/80">
              <button
                type="button"
                className={`py-2 rounded-lg text-sm font-semibold transition-all ${
                  role === 'buyer'
                    ? 'bg-brand-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                onClick={() => setRole('buyer')}
              >
                Buyer
              </button>
              <button
                type="button"
                className={`py-2 rounded-lg text-sm font-semibold transition-all ${
                  role === 'seller'
                    ? 'bg-brand-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                onClick={() => setRole('seller')}
              >
                Seller
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="gradient-btn mt-4 flex items-center justify-center gap-2 py-3"
            disabled={loading}
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            ) : (
              <>
                Register Account
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-sm text-slate-400 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-400 hover:text-brand-300 font-semibold transition-colors">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};
export default Register;
