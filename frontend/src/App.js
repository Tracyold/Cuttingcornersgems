import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import axios from 'axios';

import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { AdminProvider } from './context/AdminContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Gallery from './pages/Gallery';
import Shop, { MobileProductPage } from './pages/Shop';
import Cart from './pages/Cart';
import Booking from './pages/Booking';
import Dashboard from './pages/Dashboard';
import SellInquiry from './pages/SellInquiry';

// Admin pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProducts from './pages/admin/AdminProducts';
import AdminGallery from './pages/admin/AdminGallery';
import AdminInquiries from './pages/admin/AdminInquiries';
import AdminUsers from './pages/admin/AdminUsers';
import AdminSold from './pages/admin/AdminSold';
import AdminData from './pages/admin/AdminData';
import StripeSettings from './pages/admin/StripeSettings';
import StorageSettings from './pages/admin/StorageSettings';
import SecuritySettings from './pages/admin/SecuritySettings';
import GeneralSettings from './pages/admin/GeneralSettings';
import EmailSettings from './pages/admin/EmailSettings';
import AnalyticsSettings from './pages/admin/AnalyticsSettings';
import AdminHelp from './pages/admin/AdminHelp';

import './App.css';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

function App() {
  // Seed data on first load
  useEffect(() => {
    const seedData = async () => {
      try {
        await axios.post(`${API_URL}/seed`);
      } catch (error) {
        // Ignore errors - data might already be seeded
      }
    };
    seedData();
  }, []);

  return (
    <AuthProvider>
      <CartProvider>
        <AdminProvider>
          <BrowserRouter>
            <Toaster 
              position="top-right"
              toastOptions={{
                style: {
                  background: '#0A0A0A',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#FAFAFA',
                },
              }}
            />
            <Routes>
              {/* Admin Routes */}
              <Route path="/admin" element={<AdminLogin />} />
              <Route path="/admin/dashboard" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
              <Route path="/admin/products" element={<AdminLayout><AdminProducts /></AdminLayout>} />
              <Route path="/admin/gallery" element={<AdminLayout><AdminGallery /></AdminLayout>} />
              <Route path="/admin/inquiries" element={<AdminLayout><AdminInquiries /></AdminLayout>} />
              <Route path="/admin/users" element={<AdminLayout><AdminUsers /></AdminLayout>} />
              <Route path="/admin/sold" element={<AdminLayout><AdminSold /></AdminLayout>} />
              <Route path="/admin/settings/stripe" element={<AdminLayout><StripeSettings /></AdminLayout>} />
              <Route path="/admin/settings/storage" element={<AdminLayout><StorageSettings /></AdminLayout>} />
              <Route path="/admin/settings/security" element={<AdminLayout><SecuritySettings /></AdminLayout>} />
              <Route path="/admin/settings/general" element={<AdminLayout><GeneralSettings /></AdminLayout>} />
              <Route path="/admin/settings/email" element={<AdminLayout><EmailSettings /></AdminLayout>} />
              <Route path="/admin/help" element={<AdminLayout><AdminHelp /></AdminLayout>} />
              <Route path="/admin/help/:topic" element={<AdminLayout><AdminHelp /></AdminLayout>} />

              {/* Public Routes */}
              <Route path="/*" element={
                <Layout>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/gallery" element={<Gallery />} />
                    <Route path="/shop" element={<Shop />} />
                    <Route path="/shop/:productId" element={<MobileProductPage />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/booking" element={<Booking />} />
                    <Route path="/sell" element={<SellInquiry />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                  </Routes>
                </Layout>
              } />
            </Routes>
          </BrowserRouter>
        </AdminProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
