import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

// Page Imports
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ProductDetails from './pages/ProductDetails';
import QueuePage from './pages/QueuePage';
import SellerDashboard from './pages/SellerDashboard';
import CreateProduct from './pages/CreateProduct';
import EditProduct from './pages/EditProduct';
import OrderHistory from './pages/OrderHistory';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancel from './pages/PaymentCancel';

export const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen bg-dark-950 text-slate-100 flex flex-col font-sans">
        <Navbar />
        
        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-0 sm:px-4 md:px-0">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/product/:id" element={<ProductDetails />} />

            {/* Authenticated Buyer / Admin Routes */}
            <Route element={<ProtectedRoute allowedRoles={['buyer', 'admin']} />}>
              <Route path="/queue/:id" element={<QueuePage />} />
              <Route path="/orders" element={<OrderHistory />} />
              <Route path="/payment/success" element={<PaymentSuccess />} />
              <Route path="/payment/cancel" element={<PaymentCancel />} />
            </Route>

            {/* Authenticated Seller / Admin Routes */}
            <Route element={<ProtectedRoute allowedRoles={['seller', 'admin']} />}>
              <Route path="/dashboard" element={<SellerDashboard />} />
              <Route path="/dashboard/create" element={<CreateProduct />} />
              <Route path="/dashboard/edit/:id" element={<EditProduct />} />
            </Route>

            {/* Catch-all Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};
export default App;
