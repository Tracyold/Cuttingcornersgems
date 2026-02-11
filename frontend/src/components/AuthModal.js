import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const AuthModal = ({ isOpen, onClose, mode, setMode }) => {
  const { login, register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Phone validation for registration
    if (mode === 'register' && !formData.phone.trim()) {
      toast.error('Phone number is required to create an account');
      return;
    }
    
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(formData.email, formData.password);
        toast.success('Welcome back!');
      } else {
        await register(formData.name, formData.email, formData.password, formData.phone);
        toast.success('Account created successfully!');
      }
      onClose();
      setFormData({ name: '', email: '', password: '', phone: '' });
    } catch (error) {
      const message = error.response?.data?.detail || 'Something went wrong';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API_URL}/auth/forgot-password`, { email: forgotEmail });
      setForgotSent(true);
      toast.success('Reset link sent to your email');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const resetForgot = () => {
    setShowForgot(false);
    setForgotSent(false);
    setForgotEmail('');
  };

  return (
    <div className="modal-backdrop flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        className="bg-[#0A0A0A] border border-white/10 w-full max-w-md p-8 relative"
        onClick={e => e.stopPropagation()}
        data-testid="auth-modal"
      >
        <button
          onClick={() => { onClose(); resetForgot(); }}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
          data-testid="close-auth-modal"
        >
          <X className="w-5 h-5" />
        </button>

        {showForgot ? (
          forgotSent ? (
            <div data-testid="forgot-password-sent">
              <h2 className="title-xl text-3xl mb-2">Check Your Email</h2>
              <p className="text-gray-500 text-sm mb-6">
                If an account exists for {forgotEmail}, a password reset link has been sent.
              </p>
              <button onClick={resetForgot} className="text-gray-500 hover:text-white text-sm transition-colors" data-testid="back-to-login">
                Back to Sign In
              </button>
            </div>
          ) : (
            <div data-testid="forgot-password-form">
              <h2 className="title-xl text-3xl mb-2">Reset Password</h2>
              <p className="text-gray-500 text-sm mb-6">Enter your email to receive a reset link.</p>
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm uppercase tracking-widest text-gray-400 mb-2">Email</label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    required
                    className="input-dark"
                    placeholder="your@email.com"
                    data-testid="forgot-email"
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50" data-testid="forgot-submit">
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
              <div className="mt-4 text-center">
                <button onClick={resetForgot} className="text-gray-500 hover:text-white text-sm transition-colors" data-testid="back-to-login">
                  Back to Sign In
                </button>
              </div>
            </div>
          )
        ) : (
          <>
            <h2 className="title-xl text-3xl mb-2">
              {mode === 'login' ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-gray-500 text-sm mb-8">
              {mode === 'login' 
                ? 'Sign in to access your account' 
                : 'Join us to start your gemstone journey'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <>
                  <div>
                    <label className="block text-sm uppercase tracking-widest text-gray-400 mb-2">Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="input-dark"
                      placeholder="Your name"
                      data-testid="auth-name-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm uppercase tracking-widest text-gray-400 mb-2">
                      Phone <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      className="input-dark"
                      placeholder="Your phone number"
                      data-testid="auth-phone-input"
                    />
                    <p className="text-xs text-gray-500 mt-1">Required for order communication</p>
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm uppercase tracking-widest text-gray-400 mb-2">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="input-dark"
                  placeholder="your@email.com"
                  data-testid="auth-email-input"
                />
              </div>
              <div>
                <label className="block text-sm uppercase tracking-widest text-gray-400 mb-2">Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  className="input-dark"
                  placeholder="••••••••"
                  data-testid="auth-password-input"
                />
              </div>

              {mode === 'login' && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setShowForgot(true)}
                    className="text-gray-500 hover:text-white text-xs transition-colors"
                    data-testid="forgot-password-link"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full mt-6 disabled:opacity-50"
                data-testid="auth-submit-btn"
              >
                {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                className="text-gray-500 hover:text-white text-sm transition-colors"
                data-testid="auth-switch-mode"
              >
                {mode === 'login' 
                  ? "Don't have an account? Sign up" 
                  : 'Already have an account? Sign in'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
