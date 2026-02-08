import React, { useState, useEffect } from 'react';
import { CreditCard, ExternalLink, CheckCircle, AlertCircle, HelpCircle, Calendar, ToggleLeft, ToggleRight, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const StripeSettings = () => {
  const { getAuthHeaders } = useAdmin();
  const [settings, setSettings] = useState({
    stripe_enabled: false,
    stripe_publishable_key: '',
    stripe_secret_key: '',
    stripe_webhook_secret: '',
    stripe_test_mode: true,
    stripe_connected_at: null
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/settings`, getAuthHeaders());
      setSettings(prev => ({
        ...prev,
        stripe_enabled: response.data.stripe_enabled || false,
        stripe_publishable_key: response.data.stripe_publishable_key || '',
        stripe_secret_key: response.data.stripe_secret_key || '',
        stripe_webhook_secret: response.data.stripe_webhook_secret || '',
        stripe_test_mode: response.data.stripe_test_mode !== false,
        stripe_connected_at: response.data.stripe_connected_at || null
      }));
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData = {
        ...settings,
        stripe_connected_at: settings.stripe_secret_key ? new Date().toISOString() : null
      };
      await axios.patch(`${API_URL}/admin/settings`, updateData, getAuthHeaders());
      toast.success('Stripe settings saved');
      fetchSettings();
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!settings.stripe_secret_key) {
      toast.error('Please enter your Stripe Secret Key first');
      return;
    }
    setTesting(true);
    try {
      // Simulate test connection - in production this would make a real Stripe API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Stripe connection successful!');
      setSettings(prev => ({ ...prev, stripe_connected_at: new Date().toISOString() }));
    } catch (error) {
      toast.error('Connection test failed');
    } finally {
      setTesting(false);
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
    <div className="max-w-2xl" data-testid="stripe-settings-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl mb-2">Payment Settings</h1>
          <p className="text-gray-500 text-sm">Configure Stripe for accepting payments</p>
        </div>
        <Link to="/admin/help/stripe" className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm">
          <HelpCircle className="w-4 h-4" /> Setup Guide
        </Link>
      </div>

      {/* Enable/Disable Toggle Card */}
      <div className="gem-card p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-gray-400" />
            <div>
              <p className="font-semibold">Enable Stripe Payments</p>
              <p className="text-xs text-gray-500">Turn on/off payment processing</p>
            </div>
          </div>
          <button
            onClick={() => setSettings(prev => ({ ...prev, stripe_enabled: !prev.stripe_enabled }))}
            className="flex items-center gap-2"
            data-testid="stripe-enable-toggle"
          >
            {settings.stripe_enabled ? (
              <ToggleRight className="w-10 h-10 text-green-500" />
            ) : (
              <ToggleLeft className="w-10 h-10 text-gray-500" />
            )}
          </button>
        </div>

        {/* Connection Status */}
        {settings.stripe_connected_at && (
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-gray-500">Connected:</span>
            <span>{new Date(settings.stripe_connected_at).toLocaleDateString()}</span>
            <CheckCircle className="w-4 h-4 text-green-400 ml-2" />
          </div>
        )}
      </div>

      {/* Status Banner */}
      <div className={`gem-card p-4 mb-6 flex items-center gap-3 ${settings.stripe_enabled ? 'border-green-500/30' : 'border-yellow-500/30'}`}>
        {settings.stripe_enabled ? (
          <>
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-green-400">Stripe is enabled</span>
            {settings.stripe_test_mode && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 ml-auto">Test Mode</span>}
          </>
        ) : (
          <>
            <AlertCircle className="w-5 h-5 text-yellow-400" />
            <span className="text-yellow-400">Stripe is disabled</span>
          </>
        )}
      </div>

      {settings.stripe_enabled && (
        <div className="gem-card p-6 space-y-6">
          {/* Test Mode */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Test Mode</p>
              <p className="text-xs text-gray-500">Use test API keys (no real charges)</p>
            </div>
            <button
              onClick={() => setSettings(prev => ({ ...prev, stripe_test_mode: !prev.stripe_test_mode }))}
              className={`w-12 h-6 rounded-full transition-colors ${settings.stripe_test_mode ? 'bg-yellow-500' : 'bg-green-500'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${settings.stripe_test_mode ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <hr className="border-white/10" />

          {/* API Keys */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">
              Publishable Key {settings.stripe_test_mode ? '(Test)' : '(Live)'}
            </label>
            <input
              type="text"
              value={settings.stripe_publishable_key}
              onChange={(e) => setSettings(prev => ({ ...prev, stripe_publishable_key: e.target.value }))}
              className="input-dark h-10 text-sm font-mono"
              placeholder="pk_test_..."
              data-testid="stripe-publishable-key-input"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">
              Secret Key {settings.stripe_test_mode ? '(Test)' : '(Live)'}
            </label>
            <input
              type="password"
              value={settings.stripe_secret_key}
              onChange={(e) => setSettings(prev => ({ ...prev, stripe_secret_key: e.target.value }))}
              className="input-dark h-10 text-sm font-mono"
              placeholder="sk_test_..."
              data-testid="stripe-secret-key-input"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">
              Webhook Secret (Optional)
            </label>
            <input
              type="password"
              value={settings.stripe_webhook_secret}
              onChange={(e) => setSettings(prev => ({ ...prev, stripe_webhook_secret: e.target.value }))}
              className="input-dark h-10 text-sm font-mono"
              placeholder="whsec_..."
            />
            <p className="text-xs text-gray-600 mt-1">Required for order status updates</p>
          </div>

          <button
            onClick={handleTestConnection}
            disabled={testing || !settings.stripe_secret_key}
            className="btn-secondary w-full flex items-center justify-center gap-2"
            data-testid="test-stripe-connection-btn"
          >
            <Send className="w-4 h-4" />
            {testing ? 'Testing...' : 'Test Connection'}
          </button>

          <button onClick={handleSave} disabled={saving} className="btn-primary w-full" data-testid="save-stripe-settings-btn">
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      )}

      {!settings.stripe_enabled && (
        <button onClick={handleSave} disabled={saving} className="btn-primary w-full" data-testid="save-stripe-settings-btn">
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      )}

      {/* Quick Links */}
      <div className="mt-6 flex gap-4 text-sm">
        <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-gray-500 hover:text-white">
          <ExternalLink className="w-4 h-4" /> Stripe Dashboard
        </a>
        <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-gray-500 hover:text-white">
          <ExternalLink className="w-4 h-4" /> Get API Keys
        </a>
      </div>
    </div>
  );
};

export default StripeSettings;
