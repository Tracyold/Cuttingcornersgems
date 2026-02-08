import React, { useState, useEffect } from 'react';
import { Shield, HelpCircle, CheckCircle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const SMS_PROVIDERS = [
  { id: 'twilio', name: 'Twilio' },
  { id: 'vonage', name: 'Vonage (Nexmo)' },
  { id: 'messagebird', name: 'MessageBird' },
  { id: 'plivo', name: 'Plivo' },
];

const CAPTCHA_PROVIDERS = [
  { id: 'recaptcha', name: 'Google reCAPTCHA' },
  { id: 'hcaptcha', name: 'hCaptcha' },
  { id: 'turnstile', name: 'Cloudflare Turnstile' },
];

const SecuritySettings = () => {
  const { getAuthHeaders } = useAdmin();
  const [settings, setSettings] = useState({
    sms_enabled: false,
    sms_provider: '',
    sms_api_key: '',
    sms_api_secret: '',
    sms_phone_number: '',
    captcha_enabled: false,
    captcha_provider: '',
    captcha_site_key: '',
    captcha_secret_key: '',
    captcha_for_user_signup: false,
    captcha_for_inquiries: false
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
      toast.success('Security settings saved');
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
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl mb-2">Security Settings</h1>
          <p className="text-gray-500 text-sm">Configure 2FA, CAPTCHA, and verification</p>
        </div>
        <Link to="/admin/help/security" className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm">
          <HelpCircle className="w-4 h-4" /> Setup Guide
        </Link>
      </div>

      {/* SMS / 2FA Section */}
      <div className="gem-card p-6 space-y-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5 text-blue-400" />
          <h2 className="font-semibold">SMS Verification (2FA)</h2>
        </div>

        {/* Status */}
        <div className={`p-3 flex items-center gap-3 ${settings.sms_enabled ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
          {settings.sms_enabled ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-sm text-green-400">SMS verification enabled</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-yellow-400">SMS verification not configured</span>
            </>
          )}
        </div>

        {/* Enable Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Enable SMS Verification</p>
            <p className="text-xs text-gray-500">Require phone verification for admin login</p>
          </div>
          <button
            onClick={() => setSettings(prev => ({ ...prev, sms_enabled: !prev.sms_enabled }))}
            className={`w-12 h-6 rounded-full transition-colors ${settings.sms_enabled ? 'bg-green-500' : 'bg-gray-700'}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white transition-transform ${settings.sms_enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>

        {/* Provider Selection */}
        <div>
          <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">SMS Provider</label>
          <div className="grid grid-cols-2 gap-2">
            {SMS_PROVIDERS.map(provider => (
              <button
                key={provider.id}
                onClick={() => setSettings(prev => ({ ...prev, sms_provider: provider.id }))}
                className={`p-3 text-left text-sm border transition-colors ${
                  settings.sms_provider === provider.id
                    ? 'border-white bg-white/10'
                    : 'border-white/10 hover:border-white/30'
                }`}
              >
                {provider.name}
              </button>
            ))}
          </div>
        </div>

        {settings.sms_provider && (
          <>
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">API Key / Account SID</label>
              <input
                type="text"
                value={settings.sms_api_key}
                onChange={(e) => setSettings(prev => ({ ...prev, sms_api_key: e.target.value }))}
                className="input-dark h-10 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">API Secret / Auth Token</label>
              <input
                type="password"
                value={settings.sms_api_secret}
                onChange={(e) => setSettings(prev => ({ ...prev, sms_api_secret: e.target.value }))}
                className="input-dark h-10 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">SMS Phone Number</label>
              <input
                type="tel"
                value={settings.sms_phone_number}
                onChange={(e) => setSettings(prev => ({ ...prev, sms_phone_number: e.target.value }))}
                className="input-dark h-10 text-sm"
                placeholder="+1234567890"
              />
              <p className="text-xs text-gray-600 mt-1">Your phone number to receive verification codes</p>
            </div>
          </>
        )}
      </div>

      {/* CAPTCHA Section */}
      <div className="gem-card p-6 space-y-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5 text-purple-400" />
          <h2 className="font-semibold">CAPTCHA Protection</h2>
        </div>

        {/* Status */}
        <div className={`p-3 flex items-center gap-3 ${settings.captcha_enabled ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
          {settings.captcha_enabled ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-sm text-green-400">CAPTCHA enabled</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-yellow-400">CAPTCHA not configured</span>
            </>
          )}
        </div>

        {/* Enable Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Enable CAPTCHA</p>
            <p className="text-xs text-gray-500">Protect forms from bots and spam</p>
          </div>
          <button
            onClick={() => setSettings(prev => ({ ...prev, captcha_enabled: !prev.captcha_enabled }))}
            className={`w-12 h-6 rounded-full transition-colors ${settings.captcha_enabled ? 'bg-green-500' : 'bg-gray-700'}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white transition-transform ${settings.captcha_enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>

        {/* Provider Selection */}
        <div>
          <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">CAPTCHA Provider</label>
          <div className="grid grid-cols-3 gap-2">
            {CAPTCHA_PROVIDERS.map(provider => (
              <button
                key={provider.id}
                onClick={() => setSettings(prev => ({ ...prev, captcha_provider: provider.id }))}
                className={`p-3 text-left text-sm border transition-colors ${
                  settings.captcha_provider === provider.id
                    ? 'border-white bg-white/10'
                    : 'border-white/10 hover:border-white/30'
                }`}
              >
                {provider.name}
              </button>
            ))}
          </div>
        </div>

        {settings.captcha_provider && (
          <>
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Site Key</label>
              <input
                type="text"
                value={settings.captcha_site_key}
                onChange={(e) => setSettings(prev => ({ ...prev, captcha_site_key: e.target.value }))}
                className="input-dark h-10 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Secret Key</label>
              <input
                type="password"
                value={settings.captcha_secret_key}
                onChange={(e) => setSettings(prev => ({ ...prev, captcha_secret_key: e.target.value }))}
                className="input-dark h-10 text-sm font-mono"
              />
            </div>

            <div className="space-y-3 pt-2">
              <p className="text-xs uppercase tracking-widest text-gray-500">Apply CAPTCHA to:</p>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.captcha_for_user_signup}
                  onChange={(e) => setSettings(prev => ({ ...prev, captcha_for_user_signup: e.target.checked }))}
                  className="w-4 h-4"
                />
                <span className="text-sm">User Registration</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.captcha_for_inquiries}
                  onChange={(e) => setSettings(prev => ({ ...prev, captcha_for_inquiries: e.target.checked }))}
                  className="w-4 h-4"
                />
                <span className="text-sm">All Inquiry Forms</span>
              </label>
            </div>
          </>
        )}
      </div>

      <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
        {saving ? 'Saving...' : 'Save All Security Settings'}
      </button>
    </div>
  );
};

export default SecuritySettings;
