import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Package, Calendar, User, LogOut, MessageSquare, Send, DollarSign, Lock, Unlock, Phone, Bell, ChevronDown, ChevronUp, Check, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// Auth Component for non-logged in users
const AuthSection = ({ onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await login(formData.email, formData.password);
      } else {
        await register(formData.name, formData.email, formData.password);
      }
      toast.success(isLogin ? 'Welcome back!' : 'Account created!');
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gem-card p-8 max-w-md mx-auto" data-testid="auth-section">
      <h2 className="font-serif text-2xl mb-6 text-center">
        {isLogin ? 'Sign In' : 'Create Account'}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required={!isLogin}
              className="input-dark h-10 text-sm"
              data-testid="auth-name"
            />
          </div>
        )}
        
        <div>
          <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Email *</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            required
            className="input-dark h-10 text-sm"
            data-testid="auth-email"
          />
        </div>
        
        <div>
          <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Password *</label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
            required
            minLength={6}
            className="input-dark h-10 text-sm"
            data-testid="auth-password"
          />
        </div>
        
        <button 
          type="submit" 
          disabled={loading} 
          className="btn-primary w-full"
          data-testid="auth-submit"
        >
          {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
        </button>
      </form>
      
      <p className="text-center text-sm text-gray-500 mt-6">
        {isLogin ? "Don't have an account? " : "Already have an account? "}
        <button 
          onClick={() => setIsLogin(!isLogin)} 
          className="text-white hover:underline"
          data-testid="auth-toggle"
        >
          {isLogin ? 'Sign Up' : 'Sign In'}
        </button>
      </p>
      
      {!isLogin && (
        <p className="text-xs text-gray-600 text-center mt-4">
          No address required to sign up. Address is only needed at checkout.
        </p>
      )}
    </div>
  );
};

const Dashboard = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messageForm, setMessageForm] = useState({ subject: '', message: '' });
  const [sendingMessage, setSendingMessage] = useState(false);

  // Check URL params for redirect
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'auth' && !isAuthenticated) {
      setActiveTab('auth');
    }
  }, [searchParams, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
      // Redirect back to shop if came from there
      const redirect = searchParams.get('redirect');
      if (redirect && activeTab === 'auth') {
        setActiveTab('orders');
      }
    }
  }, [isAuthenticated]);

  const fetchData = async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [ordersRes, bookingsRes, messagesRes] = await Promise.all([
        axios.get(`${API_URL}/orders`, { headers }),
        axios.get(`${API_URL}/bookings`, { headers }),
        axios.get(`${API_URL}/user/messages`, { headers })
      ]);
      setOrders(ordersRes.data);
      setBookings(bookingsRes.data);
      setMessages(messagesRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageForm.subject.trim() || !messageForm.message.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    
    setSendingMessage(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/user/messages`, messageForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Message sent to admin!');
      setMessageForm({ subject: '', message: '' });
      fetchData();
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
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

  // Show auth section for non-logged in users
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen" data-testid="dashboard-page">
        <section className="section-spacing pb-16">
          <div className="container-custom">
            <p className="text-sm uppercase tracking-[0.2em] text-gray-500 mb-4">Account</p>
            <h1 className="section-title">Sign In or Register</h1>
          </div>
        </section>
        <section className="pb-24">
          <div className="container-custom">
            <AuthSection onSuccess={() => {
              const redirect = searchParams.get('redirect');
              if (redirect) {
                navigate(`/${redirect}`);
              }
            }} />
          </div>
        </section>
      </div>
    );
  }

  const tabs = [
    { id: 'orders', label: 'Orders', icon: Package },
    { id: 'bookings', label: 'Bookings', icon: Calendar },
    { id: 'nyp', label: 'Name Your Price', icon: DollarSign },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
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
                    {tab.id === 'messages' && messages.length > 0 && (
                      <span className="ml-auto text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5">{messages.length}</span>
                    )}
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
                              {order.tracking_number && (
                                <div className="mb-4 p-3 bg-blue-500/10">
                                  <p className="text-xs uppercase tracking-widest text-blue-400 mb-1">Tracking</p>
                                  <p className="font-mono text-sm">{order.tracking_number}</p>
                                </div>
                              )}
                              {order.seller_notes && (
                                <div className="mb-4 p-3 bg-purple-500/10">
                                  <p className="text-xs uppercase tracking-widest text-purple-400 mb-1">Note from Seller</p>
                                  <p className="text-sm text-gray-400">{order.seller_notes}</p>
                                </div>
                              )}
                              <div className="space-y-2">
                                {order.items?.map((item, i) => (
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

                  {/* Messages Tab */}
                  {activeTab === 'messages' && (
                    <div data-testid="messages-content">
                      <h2 className="font-serif text-2xl mb-6">Contact Admin</h2>
                      
                      {/* Message Form */}
                      <div className="gem-card p-6 mb-6">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                          <Send className="w-4 h-4" />
                          Send a Message
                        </h3>
                        <form onSubmit={handleSendMessage} className="space-y-4">
                          <div>
                            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Subject *</label>
                            <input
                              type="text"
                              value={messageForm.subject}
                              onChange={(e) => setMessageForm(prev => ({ ...prev, subject: e.target.value }))}
                              required
                              className="input-dark h-10 text-sm"
                              placeholder="What is this about?"
                              data-testid="message-subject"
                            />
                          </div>
                          <div>
                            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Message *</label>
                            <textarea
                              value={messageForm.message}
                              onChange={(e) => setMessageForm(prev => ({ ...prev, message: e.target.value }))}
                              required
                              className="input-dark h-32 text-sm resize-none"
                              placeholder="Your message..."
                              data-testid="message-body"
                            />
                          </div>
                          <button 
                            type="submit" 
                            disabled={sendingMessage} 
                            className="btn-primary"
                            data-testid="send-message-btn"
                          >
                            {sendingMessage ? 'Sending...' : 'Send Message'}
                          </button>
                        </form>
                      </div>
                      
                      {/* Previous Messages */}
                      {messages.length > 0 && (
                        <div>
                          <h3 className="font-semibold mb-4">Previous Messages</h3>
                          <div className="space-y-3">
                            {messages.map((msg, index) => (
                              <div key={msg.id} className="gem-card p-4" data-testid={`message-${index}`}>
                                <div className="flex justify-between items-start mb-2">
                                  <p className="font-medium">{msg.subject}</p>
                                  <span className="text-xs text-gray-500">{formatDate(msg.created_at)}</span>
                                </div>
                                <p className="text-sm text-gray-400">{msg.message}</p>
                              </div>
                            ))}
                          </div>
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
                      
                      <div className="gem-card p-6 mt-6 space-y-2">
                        <p className="text-sm uppercase tracking-widest text-gray-500 mb-3">Security Note</p>
                        <p className="text-sm text-gray-400">
                          Your payment information is never stored on your account. 
                          Credit card details are processed securely at checkout and are not retained.
                        </p>
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
