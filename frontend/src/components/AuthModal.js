import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const AuthModal = ({ isOpen, onClose, mode, setMode }) => {
  const { login, register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(formData.email, formData.password);
        toast.success('Welcome back!');
      } else {
        await register(formData.name, formData.email, formData.password);
        toast.success('Account created successfully!');
      }
      onClose();
      setFormData({ name: '', email: '', password: '' });
    } catch (error) {
      const message = error.response?.data?.detail || 'Something went wrong';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="modal-backdrop flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#0A0A0A] border border-white/10 w-full max-w-md p-8 relative"
        onClick={e => e.stopPropagation()}
        data-testid="auth-modal"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
          data-testid="close-auth-modal"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="font-serif text-3xl mb-2">
          {mode === 'login' ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p className="text-gray-500 text-sm mb-8">
          {mode === 'login' 
            ? 'Sign in to access your account' 
            : 'Join us to start your gemstone journey'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
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
      </div>
    </div>
  );
};

export default AuthModal;
