import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, Check, AlertCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      setError('Missing reset token. Please request a new password reset link.');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await axios.post(`${API_URL}/auth/reset-password`, {
        token,
        new_password: password
      });
      setSuccess(true);
      toast.success('Password reset successfully!');
    } catch (err) {
      const message = err.response?.data?.detail || 'Failed to reset password. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
        <div className="gem-card p-8 max-w-md w-full text-center" data-testid="reset-success">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/10 flex items-center justify-center">
            <Check className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="page-title title-xl text-2xl mb-4">Password Reset Complete</h1>
          <p className="text-gray-400 mb-6">
            Your password has been successfully updated. You can now sign in with your new password.
          </p>
          <Link 
            to="/dashboard?tab=auth" 
            className="btn-primary inline-block"
            data-testid="go-to-login"
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  // Error state (no token)
  if (error && !token) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
        <div className="gem-card p-8 max-w-md w-full text-center" data-testid="reset-error">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="page-title title-xl text-2xl mb-4">Invalid Reset Link</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <Link 
            to="/dashboard?tab=auth" 
            className="text-sm text-gray-500 hover:text-white flex items-center gap-2 justify-center"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  // Reset form
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="gem-card p-8 max-w-md w-full" data-testid="reset-password-page">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#d4af37]/10 flex items-center justify-center">
            <Lock className="w-8 h-8 text-[#d4af37]" />
          </div>
          <h1 className="page-title title-xl text-2xl mb-2">Create New Password/h1>
          <p className="text-gray-500 text-sm">
            Enter your new password below.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">
              New Password *
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="input-dark h-10 text-sm"
              placeholder="At least 6 characters"
              data-testid="new-password"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">
              Confirm Password *
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="input-dark h-10 text-sm"
              placeholder="Re-enter your password"
              data-testid="confirm-password"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary w-full"
            data-testid="reset-submit"
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <Link 
          to="/dashboard?tab=auth" 
          className="text-sm text-gray-500 hover:text-white flex items-center gap-2 justify-center mt-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Sign In
        </Link>
      </div>
    </div>
  );
};

export default ResetPassword;
