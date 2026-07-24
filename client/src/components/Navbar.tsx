import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShoppingCart, LogOut, LayoutDashboard, History, ShoppingBag, User as UserIcon } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-800/60 bg-dark-950/75 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-fuchsia-600 text-white shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-all">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-brand-400 to-fuchsia-400 bg-clip-text text-transparent group-hover:opacity-90 transition-all">
                Surge<span className="text-slate-100 font-medium">Cart</span>
              </span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Marketplace
            </Link>

            {user && (
              <>
                {/* Buyer Navigation */}
                {(user.role === 'buyer' || user.role === 'admin') && (
                  <Link to="/orders" className="flex items-center gap-1.5 text-sm font-medium text-slate-300 hover:text-white transition-colors">
                    <History className="h-4 w-4" />
                    My Orders
                  </Link>
                )}

                {/* Seller Navigation */}
                {(user.role === 'seller' || user.role === 'admin') && (
                  <Link to="/dashboard" className="flex items-center gap-1.5 text-sm font-medium text-slate-300 hover:text-white transition-colors">
                    <LayoutDashboard className="h-4 w-4" />
                    Seller Dashboard
                  </Link>
                )}
              </>
            )}
          </div>

          {/* User Account / CTA */}
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                {/* User Info Capsule */}
                <div className="flex items-center gap-2 rounded-full bg-slate-900/80 px-4 py-1.5 border border-slate-800/80">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500/20 text-brand-400">
                    <UserIcon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-semibold text-slate-200">{user.name}</span>
                    <span className="text-[10px] capitalize text-slate-400 leading-none">{user.role}</span>
                  </div>
                </div>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-800/80 bg-slate-900/40 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all active:scale-95"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="text-sm font-semibold text-slate-300 hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-brand-500/10 hover:from-brand-500 hover:to-brand-600 transition-all hover:shadow-brand-500/25 hover:-translate-y-0.5"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
export default Navbar;
