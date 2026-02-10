import React, { useState, useEffect } from 'react';
import { Settings, HelpCircle, Users, CheckCircle, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const GeneralSettings = () => {
  const { getAuthHeaders } = useAdmin();
  const [settings, setSettings] = useState({
    user_signup_enabled: true,
    require_email_verification: false,
    email_notifications_enabled: false,
    email_provider: '',
    email_api_key: '',
    email_from_address: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/settings`, getAuthHeaders());
      setSettings(prev => ({ ...prev, ...response.data }));
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.patch(`${API_URL}/admin/settings`, settings, getAuthHeaders());
      toast.success('Settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl" data-testid="general-settings-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title title-xl text-3xl mb-2">Site Settings</h1>
          <p className="text-gray-500 text-sm">General website configuration</p>
        </div>
      </div>

      {/* User Registration - Main Toggle */}
      <div className="gem-card p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-gray-400" />
            <div>
              <p className="font-semibold">Enable User Registration</p>
              <p className="text-xs text-gray-500">Allow new users to create accounts</p>
            </div>
          </div>
          <button
            onClick={() => setSettings(prev => ({ ...prev, user_signup_enabled: !prev.user_signup_enabled }))}
            className="flex items-center gap-2"
            data-testid="user-signup-toggle"
          >
            {settings.user_signup_enabled ? (
              <ToggleRight className="w-10 h-10 text-green-500" />
            ) : (
              <ToggleLeft className="w-10 h-10 text-gray-500" />
            )}
          </button>
        </div>

        {/* Status Banner */}
        <div className={`mt-4 p-3 flex items-center gap-3 ${settings.user_signup_enabled ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
          {settings.user_signup_enabled ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-sm text-green-400">User registration is ACTIVE - visitors can create accounts</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-yellow-400">User registration is DISABLED - no new signups allowed</span>
            </>
          )}
        </div>
      </div>

      {/* User Authentication Options */}
      <div className="gem-card p-6 space-y-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Settings className="w-5 h-5 text-gray-400" />
          <h2 className="font-semibold">Registration Options</h2>
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <p className="font-medium">Require Email Verification</p>
            <p className="text-xs text-gray-500">Users must verify email before full access (requires email service)</p>
          </div>
          <button
            onClick={() => setSettings(prev => ({ ...prev, require_email_verification: !prev.require_email_verification }))}
            className={`w-12 h-6 rounded-full transition-colors ${settings.require_email_verification ? 'bg-green-500' : 'bg-gray-700'}`}
            data-testid="email-verification-toggle"
          >
            <div className={`w-5 h-5 rounded-full bg-white transition-transform ${settings.require_email_verification ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>

        <div className="p-3 bg-blue-500/10 text-sm">
          <p className="text-blue-400 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              <strong>Note:</strong> Users do not need an address to sign up, but addresses are required at checkout. 
              Only registered users can purchase items. Credit card information is NOT stored in user accounts.
            </span>
          </p>
        </div>
      </div>

      {/* Email Notifications */}
      <div className="gem-card p-6 space-y-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-gray-400" />
            <h2 className="font-semibold">Email Notifications</h2>
          </div>
          <Link to="/admin/settings/email" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
            <HelpCircle className="w-3 h-3" /> Full Email Setup
          </Link>
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <p className="font-medium">Enable Email Notifications</p>
            <p className="text-xs text-gray-500">Send emails for orders, inquiries, etc.</p>
          </div>
          <button
            onClick={() => setSettings(prev => ({ ...prev, email_notifications_enabled: !prev.email_notifications_enabled }))}
            className={`w-12 h-6 rounded-full transition-colors ${settings.email_notifications_enabled ? 'bg-green-500' : 'bg-gray-700'}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white transition-transform ${settings.email_notifications_enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>

        {settings.email_notifications_enabled && (
          <>
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Email Provider</label>
              <select
                value={settings.email_provider}
                onChange={(e) => setSettings(prev => ({ ...prev, email_provider: e.target.value }))}
                className="input-dark h-10 text-sm"
              >
                <option value="">Select provider...</option>
                <option value="sendgrid">SendGrid</option>
                <option value="resend">Resend</option>
                <option value="mailgun">Mailgun</option>
                <option value="ses">AWS SES</option>
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">API Key</label>
              <input
                type="password"
                value={settings.email_api_key}
                onChange={(e) => setSettings(prev => ({ ...prev, email_api_key: e.target.value }))}
                className="input-dark h-10 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">From Email Address</label>
              <input
                type="email"
                value={settings.email_from_address}
                onChange={(e) => setSettings(prev => ({ ...prev, email_from_address: e.target.value }))}
                className="input-dark h-10 text-sm"
                placeholder="noreply@yourdomain.com"
              />
            </div>
          </>
        )}
      </div>

      <button 
        onClick={handleSave} 
        disabled={saving} 
        className="btn-primary w-full"
        data-testid="save-general-settings-btn"
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
};

export default GeneralSettings;
