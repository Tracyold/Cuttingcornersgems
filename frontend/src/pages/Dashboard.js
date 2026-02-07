import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, Calendar, User, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const Dashboard = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }
    fetchData();
  }, [isAuthenticated, navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ordersRes, bookingsRes] = await Promise.all([
        axios.get(`${API_URL}/orders`),
        axios.get(`${API_URL}/bookings`)
      ]);
      setOrders(ordersRes.data);
      setBookings(bookingsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  const tabs = [
    { id: 'orders', label: 'Orders', icon: Package },
    { id: 'bookings', label: 'Bookings', icon: Calendar },
    { id: 'account', label: 'Account', icon: User },
  ];

  return (
    <div className="min-h-screen" data-testid="dashboard-page">
      {/* Header */}
      <section className="section-spacing pb-16">
        <div className="container-custom">
          <p className="text-sm uppercase tracking-[0.2em] text-gray-500 mb-4">Welcome back</p>
          <h1 className="section-title">{user.name}</h1>
        </div>
      </section>

      {/* Dashboard Content */}
      <section className="pb-24">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <nav className="space-y-2" data-testid="dashboard-nav">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-300 ${
                      activeTab === tab.id
                        ? 'bg-white/5 text-white border-l-2 border-white'
                        : 'text-gray-500 hover:text-white hover:bg-white/5'
                    }`}
                    data-testid={`tab-${tab.id}`}
                  >
                    <tab.icon className="w-5 h-5" />
                    <span className="text-sm uppercase tracking-widest">{tab.label}</span>
                  </button>
                ))}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-500 hover:text-red-500 transition-colors"
                  data-testid="logout-btn"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="text-sm uppercase tracking-widest">Logout</span>
                </button>
              </nav>
            </div>

            {/* Content */}
            <div className="lg:col-span-3">
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-24 bg-white/5 animate-pulse" />
                  ))}
                </div>
              ) : (
                <>
                  {/* Orders Tab */}
                  {activeTab === 'orders' && (
                    <div data-testid="orders-content">
                      <h2 className="font-serif text-2xl mb-6">Your Orders</h2>
                      {orders.length === 0 ? (
                        <div className="gem-card p-8 text-center">
                          <Package className="w-12 h-12 mx-auto text-gray-600 mb-4" />
                          <p className="text-gray-500 mb-4">No orders yet</p>
                          <Link to="/shop" className="btn-secondary inline-block">
                            Browse Shop
                          </Link>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {orders.map((order, index) => (
                            <div key={order.id} className="gem-card p-6" data-testid={`order-${index}`}>
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <p className="spec-text text-gray-500">Order #{order.id.slice(0, 8)}</p>
                                  <p className="text-sm text-gray-400">{formatDate(order.created_at)}</p>
                                </div>
                                <span className={`px-3 py-1 text-xs uppercase tracking-widest ${
                                  order.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                  order.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                  'bg-gray-500/20 text-gray-400'
                                }`}>
                                  {order.status}
                                </span>
                              </div>
                              <div className="space-y-2">
                                {order.items.map((item, i) => (
                                  <div key={i} className="flex justify-between text-sm">
                                    <span className="text-gray-400">{item.title} x{item.quantity}</span>
                                    <span>{formatPrice(item.price * item.quantity)}</span>
                                  </div>
                                ))}
                              </div>
                              <div className="mt-4 pt-4 border-t border-white/10 flex justify-between">
                                <span className="text-gray-500">Total</span>
                                <span className="font-mono">{formatPrice(order.total)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Bookings Tab */}
                  {activeTab === 'bookings' && (
                    <div data-testid="bookings-content">
                      <h2 className="font-serif text-2xl mb-6">Your Bookings</h2>
                      {bookings.length === 0 ? (
                        <div className="gem-card p-8 text-center">
                          <Calendar className="w-12 h-12 mx-auto text-gray-600 mb-4" />
                          <p className="text-gray-500 mb-4">No bookings yet</p>
                          <Link to="/booking" className="btn-secondary inline-block">
                            Book a Service
                          </Link>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {bookings.map((booking, index) => (
                            <div key={booking.id} className="gem-card p-6" data-testid={`booking-${index}`}>
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <p className="font-serif text-lg capitalize">{booking.service.replace('-', ' ')}</p>
                                  <p className="text-sm text-gray-500 capitalize">{booking.stone_type}</p>
                                </div>
                                <span className={`px-3 py-1 text-xs uppercase tracking-widest ${
                                  booking.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                  booking.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                  'bg-gray-500/20 text-gray-400'
                                }`}>
                                  {booking.status}
                                </span>
                              </div>
                              {booking.description && (
                                <p className="text-gray-400 text-sm">{booking.description}</p>
                              )}
                              <p className="text-gray-600 text-xs mt-4">
                                {formatDate(booking.created_at)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Account Tab */}
                  {activeTab === 'account' && (
                    <div data-testid="account-content">
                      <h2 className="font-serif text-2xl mb-6">Account Details</h2>
                      <div className="gem-card p-6 space-y-4">
                        <div>
                          <p className="text-sm uppercase tracking-widest text-gray-500 mb-1">Name</p>
                          <p>{user.name}</p>
                        </div>
                        <div>
                          <p className="text-sm uppercase tracking-widest text-gray-500 mb-1">Email</p>
                          <p>{user.email}</p>
                        </div>
                        <div>
                          <p className="text-sm uppercase tracking-widest text-gray-500 mb-1">Member Since</p>
                          <p>{formatDate(user.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
