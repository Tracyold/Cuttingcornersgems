import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Package, Calendar, User, LogOut, MessageSquare, Send, DollarSign, Lock, Unlock, Phone, Bell, ChevronDown, ChevronUp, Check, Clock, AlertCircle, ArrowLeft, FileText, CreditCard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// Forgot Password Form Component
const ForgotPasswordForm = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API_URL}/auth/forgot-password`, { email });
      setSent(true);
      toast.success('Check your email for reset instructions');
    } catch (error) {
      // Always show success message to prevent email enumeration
      setSent(true);
      toast.success('Check your email for reset instructions');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="gem-card p-8 max-w-md mx-auto text-center" data-testid="forgot-password-sent">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/10 flex items-center justify-center">
          <Check className="w-8 h-8 text-green-400" />
        </div>
        <h2 className="title-sm text-2xl mb-4">Check Your Email</h2>
        <p className="text-gray-400 mb-6">
          If an account exists with that email, you'll receive password reset instructions shortly.
        </p>
        <button 
          onClick={onBack} 
          className="text-sm text-gray-500 hover:text-white flex items-center gap-2 mx-auto"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="gem-card p-8 max-w-md mx-auto" data-testid="forgot-password-form">
      <h2 className="title-sm text-2xl mb-2 text-center">Reset Password</h2>
      <p className="text-gray-500 text-sm text-center mb-6">
        Enter your email address and we'll send you a link to reset your password.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Email *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input-dark h-10 text-sm"
            placeholder="your@email.com"
            data-testid="forgot-email"
          />
        </div>
        
        <button 
          type="submit" 
          disabled={loading} 
          className="btn-primary w-full"
          data-testid="forgot-submit"
        >
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>
      
      <button 
        onClick={onBack} 
        className="text-sm text-gray-500 hover:text-white flex items-center gap-2 mx-auto mt-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Sign In
      </button>
    </div>
  );
};

// Auth Component for non-logged in users
const AuthSection = ({ onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
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

  if (showForgotPassword) {
    return <ForgotPasswordForm onBack={() => setShowForgotPassword(false)} />;
  }

  return (
    <div className="gem-card p-8 max-w-md mx-auto" data-testid="auth-section">
      <h2 className="title-sm text-2xl mb-6 text-center">
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

        {isLogin && (
          <div className="text-right">
            <button 
              type="button"
              onClick={() => setShowForgotPassword(true)} 
              className="text-xs text-gray-500 hover:text-white"
              data-testid="forgot-password-link"
            >
              Forgot password?
            </button>
          </div>
        )}
        
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

// ================== NAME YOUR PRICE TAB ==================

const NameYourPriceTab = () => {
  const { entitlements, entitlementsLoading } = useAuth();
  const [negotiations, setNegotiations] = useState([]);
  const [preferences, setPreferences] = useState({ sms_negotiations_enabled: false, phone_e164: '' });
  const [loading, setLoading] = useState(true);
  const [selectedNeg, setSelectedNeg] = useState(null);
  const [newOfferAmount, setNewOfferAmount] = useState('');
  const [newOfferText, setNewOfferText] = useState('');
  const [sending, setSending] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const loadNegotiations = useCallback(async () => {
    try {
      setLoading(true);
      const [negsRes, prefsRes] = await Promise.all([
        axios.get(`${API_URL}/negotiations`, { headers }),
        axios.get(`${API_URL}/users/me/preferences`, { headers })
      ]);
      setNegotiations(negsRes.data);
      setPreferences(prefsRes.data);
    } catch (error) {
      console.error('Failed to load negotiations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (entitlements?.unlocked_nyp) {
      loadNegotiations();
    } else {
      setLoading(false);
    }
  }, [entitlements?.unlocked_nyp, loadNegotiations]);

  const handleSavePreferences = async () => {
    setSavingPrefs(true);
    try {
      await axios.patch(`${API_URL}/users/me/preferences`, preferences, { headers });
      toast.success('Preferences saved');
    } catch (error) {
      toast.error('Failed to save preferences');
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedNeg || !newOfferAmount) {
      toast.error('Please enter an amount');
      return;
    }
    setSending(true);
    try {
      await axios.post(`${API_URL}/negotiations/${selectedNeg.negotiation_id}/message`, {
        kind: 'OFFER',
        amount: parseFloat(newOfferAmount),
        text: newOfferText || null
      }, { headers });
      toast.success('Offer sent');
      setNewOfferAmount('');
      setNewOfferText('');
      // Refresh thread
      const updatedThread = await axios.get(`${API_URL}/negotiations/${selectedNeg.negotiation_id}`, { headers });
      setSelectedNeg(updatedThread.data);
      loadNegotiations();
    } catch (error) {
      toast.error('Failed to send offer');
    } finally {
      setSending(false);
    }
  };

  const handleCheckAgreement = async (negotiationId) => {
    try {
      const res = await axios.get(`${API_URL}/negotiations/${negotiationId}/agreement`, { headers });
      if (res.data.available) {
        const quoteRes = await axios.post(`${API_URL}/purchase/quote`, {
          purchase_token: res.data.purchase_token
        }, { headers });
        toast.info(`Ready to purchase at $${quoteRes.data.amount}. Payment integration pending.`);
      } else {
        toast.info('No active agreement. The offer may have expired.');
      }
    } catch (error) {
      toast.error('Failed to check agreement');
    }
  };

  const handleAcceptCounter = async (negotiationId) => {
    try {
      const res = await axios.post(`${API_URL}/negotiations/${negotiationId}/accept`, {}, { headers });
      toast.success('Committed. Finish purchase in Account.');
      // Refresh thread + orders
      const updatedThread = await axios.get(`${API_URL}/negotiations/${negotiationId}`, { headers });
      setSelectedNeg(updatedThread.data);
      loadNegotiations();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to accept');
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  // Loading state
  if (entitlementsLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Not eligible - show progress
  if (!entitlements?.unlocked_nyp) {
    const progressPercent = Math.min(100, ((entitlements?.total_spend || 0) / (entitlements?.threshold || 1000)) * 100);
    return (
      <div data-testid="nyp-locked-tab">
        <h2 className="title-sm text-2xl mb-6">Name Your Price</h2>
        <div className="gem-card p-8 text-center">
          <Lock className="w-12 h-12 mx-auto text-gray-600 mb-4" />
          <h3 className="title-sm text-xl mb-2">Unlock Exclusive Pricing</h3>
          <p className="text-gray-500 mb-6">
            Spend ${(entitlements?.threshold || 1000).toLocaleString()} to unlock Name Your Price negotiations.
          </p>
          
          {/* Progress Bar */}
          <div className="max-w-md mx-auto">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-500">Your spend</span>
              <span className="text-white">${(entitlements?.total_spend || 0).toLocaleString()}</span>
            </div>
            <div className="h-2 bg-white/10 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-xs text-gray-600 mt-2">
              ${(entitlements?.spend_to_unlock || 1000).toLocaleString()} more to unlock
            </p>
          </div>
          
          <Link to="/shop" className="btn-secondary inline-block mt-6">
            Browse Shop
          </Link>
        </div>
      </div>
    );
  }

  // Thread detail view
  if (selectedNeg) {
    return (
      <div data-testid="nyp-thread-detail">
        <button 
          onClick={() => setSelectedNeg(null)}
          className="text-gray-400 hover:text-white text-sm mb-4"
        >
          ← Back to negotiations
        </button>
        
        <div className="gem-card p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="title-sm text-xl">{selectedNeg.product_title}</h3>
              <p className="text-gray-500 text-sm">
                Listed Price: <span className="text-white">${selectedNeg.product_price?.toLocaleString()}</span>
              </p>
            </div>
            <span className={`px-3 py-1 text-xs uppercase tracking-wider ${
              selectedNeg.status === 'OPEN' ? 'bg-blue-500/20 text-blue-400' :
              selectedNeg.status === 'ACCEPTED' ? 'bg-green-500/20 text-green-400' :
              'bg-gray-500/20 text-gray-400'
            }`}>
              {selectedNeg.status}
            </span>
          </div>
          
          {selectedNeg.status === 'ACCEPTED' && (
            <NegotiationCommitPanel negotiationId={selectedNeg.negotiation_id} onRefresh={fetchData} />
          )}

          {/* Accept Offer button: shown when OPEN and latest admin message is COUNTER */}
          {selectedNeg.status === 'OPEN' && (() => {
            const msgs = selectedNeg.messages || [];
            const lastAdminCounter = [...msgs].reverse().find(m => m.sender_role === 'ADMIN' && m.kind === 'COUNTER' && m.amount);
            if (!lastAdminCounter) return null;
            // Don't show if user already sent a message after the counter
            const counterIdx = msgs.indexOf(lastAdminCounter);
            const userAfter = msgs.slice(counterIdx + 1).some(m => m.sender_role === 'USER' && m.kind === 'OFFER');
            if (userAfter) return null;
            return (
              <button
                onClick={() => handleAcceptCounter(selectedNeg.negotiation_id)}
                className="btn-primary w-full mb-4"
                data-testid="accept-offer-btn"
              >
                <Check className="w-4 h-4 inline mr-2" />
                Accept Offer (${lastAdminCounter.amount?.toLocaleString()})
              </button>
            );
          })()}
        </div>

        {/* Messages */}
        <div className="space-y-3 mb-6">
          {selectedNeg.messages?.map((msg, idx) => (
            <div 
              key={msg.message_id || idx}
              className={`gem-card p-4 ${msg.sender_role === 'ADMIN' ? 'border-l-2 border-purple-500' : 'border-l-2 border-amber-500'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs uppercase ${msg.sender_role === 'ADMIN' ? 'text-purple-400' : 'text-amber-400'}`}>
                    {msg.sender_role === 'ADMIN' ? 'Seller' : 'You'}
                  </span>
                  <span className={`text-xs px-2 py-0.5 uppercase ${
                    msg.kind === 'OFFER' ? 'bg-amber-500/20 text-amber-400' :
                    msg.kind === 'COUNTER' ? 'bg-purple-500/20 text-purple-400' :
                    msg.kind === 'ACCEPT' ? 'bg-green-500/20 text-green-400' :
                    msg.kind === 'CLOSE' ? 'bg-red-500/20 text-red-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {msg.kind}
                  </span>
                </div>
                <span className="text-xs text-gray-600">{formatDate(msg.created_at)}</span>
              </div>
              {msg.amount !== null && (
                <p className="text-lg font-mono">${msg.amount.toLocaleString()}</p>
              )}
              {msg.text && <p className="text-gray-400 text-sm">{msg.text}</p>}
            </div>
          ))}
        </div>

        {/* Reply form (only if OPEN) */}
        {selectedNeg.status === 'OPEN' && (
          <div className="gem-card p-6">
            <h4 className="text-sm uppercase tracking-widest text-gray-500 mb-4">Send Counter Offer</h4>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500">Your Offer Amount *</label>
                <input
                  type="number"
                  value={newOfferAmount}
                  onChange={(e) => setNewOfferAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="input-dark w-full"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Message (optional)</label>
                <textarea
                  value={newOfferText}
                  onChange={(e) => setNewOfferText(e.target.value)}
                  placeholder="Add a note..."
                  className="input-dark w-full h-20 resize-none"
                />
              </div>
              <button
                onClick={handleSendMessage}
                disabled={sending}
                className="btn-primary w-full"
              >
                {sending ? 'Sending...' : 'Send Offer'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Eligible - show negotiations list
  return (
    <div data-testid="nyp-unlocked-tab">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="title-sm text-2xl">Name Your Price</h2>
          <p className="text-green-400 text-sm flex items-center gap-1">
            <Unlock className="w-4 h-4" /> Unlocked
          </p>
        </div>
      </div>

      {/* SMS Preferences */}
      <div className="gem-card p-6 mb-6">
        <h3 className="text-sm uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
          <Bell className="w-4 h-4" /> Notification Preferences
        </h3>
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.sms_negotiations_enabled}
              onChange={(e) => setPreferences(p => ({ ...p, sms_negotiations_enabled: e.target.checked }))}
              className="w-4 h-4 accent-amber-500"
            />
            <span className="text-sm">Text me updates about negotiations</span>
          </label>
          {preferences.sms_negotiations_enabled && (
            <div>
              <label className="text-xs text-gray-500">Phone Number (E.164 format)</label>
              <input
                type="tel"
                value={preferences.phone_e164 || ''}
                onChange={(e) => setPreferences(p => ({ ...p, phone_e164: e.target.value }))}
                placeholder="+1234567890"
                className="input-dark w-full"
              />
            </div>
          )}
          <button
            onClick={handleSavePreferences}
            disabled={savingPrefs}
            className="btn-secondary text-sm"
          >
            {savingPrefs ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>

      {/* Negotiations List */}
      <h3 className="text-sm uppercase tracking-widest text-gray-500 mb-4">Your Negotiations</h3>
      {negotiations.length === 0 ? (
        <div className="gem-card p-8 text-center">
          <DollarSign className="w-12 h-12 mx-auto text-gray-600 mb-4" />
          <p className="text-gray-500 mb-4">No negotiations yet</p>
          <p className="text-gray-600 text-sm mb-4">
            Start a negotiation by clicking "Name Your Price" on any eligible product in the shop.
          </p>
          <Link to="/shop" className="btn-secondary inline-block">
            Browse Shop
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {negotiations.map((neg) => (
            <div 
              key={neg.negotiation_id}
              className="gem-card p-4 cursor-pointer hover:bg-white/5 transition-colors"
              onClick={async () => {
                try {
                  const res = await axios.get(`${API_URL}/negotiations/${neg.negotiation_id}`, { headers });
                  setSelectedNeg(res.data);
                } catch (error) {
                  toast.error('Failed to load negotiation');
                }
              }}
              data-testid={`negotiation-item-${neg.negotiation_id}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold">{neg.product_title}</h4>
                  <p className="text-sm text-gray-500">
                    Listed: ${neg.product_price?.toLocaleString()}
                    {neg.last_amount && (
                      <span className="text-amber-400 ml-2">
                        • Last offer: ${neg.last_amount.toLocaleString()}
                      </span>
                    )}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs uppercase ${
                  neg.status === 'OPEN' ? 'bg-blue-500/20 text-blue-400' :
                  neg.status === 'ACCEPTED' ? 'bg-green-500/20 text-green-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {neg.status}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                <span>{neg.message_count} messages</span>
                <span>{formatDate(neg.last_activity_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Pending Invoice Card with countdown timer
const PendingInvoiceCard = ({ order, index, onRefresh }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [payLoading, setPayLoading] = useState(false);

  useEffect(() => {
    const update = () => {
      const expires = new Date(order.commit_expires_at);
      const now = new Date();
      const diff = expires - now;
      if (diff <= 0) { setTimeLeft('Expired'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [order.commit_expires_at]);

  const handlePayNow = async () => {
    setPayLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/payments/checkout-session`, 
        { order_id: order.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.checkout_url) {
        window.location = res.data.checkout_url;
      } else if (res.data.error_code === 'PAYMENT_PROVIDER_NOT_CONFIGURED') {
        toast.error('Payment not configured yet.');
      } else if (res.data.error_code) {
        toast.error(res.data.error_code);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Payment failed');
    } finally {
      setPayLoading(false);
    }
  };

  const formatPrice = (price) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(price);

  return (
    <div className="gem-card p-6 border border-yellow-500/20" data-testid={`pending-invoice-${index}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="spec-text text-gray-500">Order #{order.id.slice(0, 8)}</p>
          <p className="font-mono text-lg">{formatPrice(order.total)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 uppercase tracking-widest">Expires in</p>
          <p className={`font-mono text-sm ${timeLeft === 'Expired' ? 'text-red-400' : 'text-yellow-400'}`} data-testid={`countdown-${index}`}>
            {timeLeft}
          </p>
        </div>
      </div>
      <div className="space-y-1 mb-4">
        {order.items?.map((item, i) => (
          <div key={i} className="flex justify-between text-sm text-gray-400">
            <span>{item.title} x{item.quantity}</span>
            <span>{formatPrice(item.price * item.quantity)}</span>
          </div>
        ))}
      </div>
      <button
        onClick={handlePayNow}
        disabled={payLoading || timeLeft === 'Expired'}
        className="btn-primary w-full disabled:opacity-50"
        data-testid={`pay-now-btn-${index}`}
      >
        {payLoading ? 'Processing...' : 'Pay Now'}
      </button>
      <button
        onClick={async () => {
          try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/orders/${order.id}/invoice.pdf`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `invoice-${order.id.slice(0, 8)}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
          } catch { toast.error('Failed to download invoice'); }
        }}
        className="w-full mt-2 py-2 text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/30 flex items-center justify-center gap-2 transition-colors"
        data-testid={`pending-invoice-download-${index}`}
      >
        <FileText className="w-3 h-3" /> Download Invoice
      </button>
    </div>
  );
};

const Dashboard = () => {
  const { user, logout, isAuthenticated, entitlements } = useAuth();
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
            <h1 className="page-title title-xl">Sign In or Register</h1>
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
          <h1 className="page-title title-xl">{user.name}</h1>
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
                      {/* Pending Invoices Section */}
                      {(() => {
                        const now = new Date();
                        const pendingOrders = orders.filter(o => 
                          o.status === 'pending' && !o.paid_at && 
                          o.commit_expires_at && new Date(o.commit_expires_at) > now
                        );
                        if (pendingOrders.length === 0) return null;
                        return (
                          <div className="mb-8" data-testid="pending-invoices">
                            <h2 className="title-sm text-2xl mb-6 flex items-center gap-3">
                              <CreditCard className="w-6 h-6 text-yellow-400" />
                              Pending Invoices
                            </h2>
                            <div className="space-y-4">
                              {pendingOrders.map((order, index) => (
                                <PendingInvoiceCard key={order.id} order={order} index={index} onRefresh={fetchData} />
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      <h2 className="title-sm text-2xl mb-6">Your Orders</h2>
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
                              <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                                <span className="text-gray-500">Total</span>
                                <div className="flex items-center gap-3">
                                  <span className="font-mono">{formatPrice(order.total)}</span>
                                  <button
                                    onClick={async () => {
                                      try {
                                        const token = localStorage.getItem('token');
                                        const res = await fetch(`${API_URL}/orders/${order.id}/invoice.pdf`, {
                                          headers: { Authorization: `Bearer ${token}` }
                                        });
                                        if (!res.ok) throw new Error('Failed to download');
                                        const blob = await res.blob();
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `invoice-${order.id.slice(0, 8)}.pdf`;
                                        a.click();
                                        URL.revokeObjectURL(url);
                                      } catch { toast.error('Failed to download invoice'); }
                                    }}
                                    className="text-xs text-gray-500 hover:text-white flex items-center gap-1"
                                    data-testid={`invoice-link-${index}`}
                                  >
                                    <FileText className="w-3 h-3" /> Invoice
                                  </button>
                                </div>
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
                      <h2 className="title-sm text-2xl mb-6">Your Bookings</h2>
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
                                  <p className="title-sm text-lg capitalize">{booking.service.replace('-', ' ')}</p>
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

                  {/* Name Your Price Tab */}
                  {activeTab === 'nyp' && (
                    <NameYourPriceTab />
                  )}

                  {/* Messages Tab */}
                  {activeTab === 'messages' && (
                    <div data-testid="messages-content">
                      <h2 className="title-sm text-2xl mb-6">Contact Admin</h2>
                      
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
                    <AccountTab user={user} onLogout={logout} />
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

// Account Tab Component with Delete Account functionality
const AccountTab = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    });
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setError('Please type DELETE to confirm');
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/users/me/delete`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Clear auth state
      localStorage.removeItem('token');
      toast.success('Account deleted');
      
      // Logout and redirect
      if (onLogout) onLogout();
      navigate('/');
    } catch (err) {
      const message = err.response?.data?.detail || 'Failed to delete account';
      setError(message);
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div data-testid="account-content">
      <h2 className="title-sm text-2xl mb-6">Account Details</h2>
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

      {/* Delete Account Section */}
      <div className="gem-card p-6 mt-6 border border-red-500/20">
        <p className="text-sm uppercase tracking-widest text-red-400 mb-3">Danger Zone</p>
        <p className="text-sm text-gray-400 mb-4">
          Permanently delete your account. This action cannot be undone.
          Your order history will be preserved for records.
        </p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="text-sm flex items-center gap-2 px-4 py-2 border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors"
          data-testid="delete-account-btn"
        >
          <AlertCircle className="w-4 h-4" />
          Delete My Account
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-[#0a0a0a] border border-white/10 p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h3 className="title-sm text-xl mb-4 text-red-400">Delete Account</h3>
            <p className="text-gray-400 text-sm mb-4">
              This will permanently disable your account. You will be logged out and will not be able to access your account again.
            </p>
            <p className="text-sm mb-4">
              Type <span className="text-white font-mono bg-white/10 px-2 py-0.5">DELETE</span> to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="input-dark h-10 text-sm mb-4"
              placeholder="Type DELETE"
              data-testid="delete-confirm-input"
            />
            {error && (
              <p className="text-red-400 text-sm mb-4">{error}</p>
            )}
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                  setError(null);
                }}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirmText !== 'DELETE'}
                className="text-sm px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 disabled:cursor-not-allowed text-white transition-colors"
                data-testid="confirm-delete-account-btn"
              >
                {deleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
