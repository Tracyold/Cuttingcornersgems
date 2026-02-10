import React, { useState, useEffect } from 'react';
import { Mail, HelpCircle, CheckCircle, XCircle, Calendar, ToggleLeft, ToggleRight, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const EmailSettings = () => {
  const { getAuthHeaders } = useAdmin();
  const [settings, setSettings] = useState({
    email_enabled: false,
    email_provider: '',
    email_api_key: '',
    email_from_address: '',
    email_from_name: '',
    email_connected_at: null,
    email_test_status: null,
    // Auto email triggers
    auto_email_on_order: true,
    auto_email_on_booking: true,
    auto_email_on_inquiry: false,
    auto_email_on_tracking: true
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
      setSettings(prev => ({ ...prev, ...response.data }));
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (field) => {
    setSettings(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData = {
        email_enabled: settings.email_enabled,
        email_provider: settings.email_provider,
        email_api_key: settings.email_api_key,
        email_from_address: settings.email_from_address,
        email_from_name: settings.email_from_name,
        auto_email_on_order: settings.auto_email_on_order,
        auto_email_on_booking: settings.auto_email_on_booking,
        auto_email_on_inquiry: settings.auto_email_on_inquiry,
        auto_email_on_tracking: settings.auto_email_on_tracking,
        email_connected_at: settings.email_api_key ? new Date().toISOString() : null
      };
      await axios.patch(`${API_URL}/admin/settings`, updateData, getAuthHeaders());
      toast.success('Email settings saved');
      fetchSettings();
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!settings.email_api_key || !settings.email_provider) {
      toast.error('Please configure provider and API key first');
      return;
    }
    setTesting(true);
    try {
      const response = await axios.post(`${API_URL}/admin/settings/test-email`, {
        provider: settings.email_provider,
        api_key: settings.email_api_key,
        from_address: settings.email_from_address
      }, getAuthHeaders());
      
      if (response.data.success) {
        toast.success('Email connection successful!');
        setSettings(prev => ({ ...prev, email_test_status: 'success', email_connected_at: new Date().toISOString() }));
      } else {
        toast.error(response.data.message || 'Connection test failed');
        setSettings(prev => ({ ...prev, email_test_status: 'failed' }));
      }
    } catch (error) {
      toast.error('Connection test failed');
      setSettings(prev => ({ ...prev, email_test_status: 'failed' }));
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
    <div className="max-w-2xl" data-testid="email-settings-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title title-xl text-3xl mb-2">Email Service</h1>
          <p className="text-gray-500 text-sm">Configure automatic email notifications</p>
        </div>
        <Link to="/admin/help/email" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
          <HelpCircle className="w-4 h-4" /> Setup Guide
        </Link>
      </div>

      {/* Enable Toggle */}
      <div className="gem-card p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-gray-400" />
            <div>
              <p className="font-semibold">Enable Email Service</p>
              <p className="text-xs text-gray-500">Turn on/off all email functionality</p>
            </div>
          </div>
          <button
            onClick={() => handleToggle('email_enabled')}
            className="flex items-center gap-2"
            data-testid="email-enable-toggle"
          >
            {settings.email_enabled ? (
              <ToggleRight className="w-10 h-10 text-green-500" />
            ) : (
              <ToggleLeft className="w-10 h-10 text-gray-500" />
            )}
          </button>
        </div>

        {/* Connection Status */}
        {settings.email_connected_at && (
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-gray-500">Connected:</span>
            <span>{new Date(settings.email_connected_at).toLocaleDateString()}</span>
            {settings.email_test_status === 'success' && (
              <CheckCircle className="w-4 h-4 text-green-400 ml-2" />
            )}
            {settings.email_test_status === 'failed' && (
              <XCircle className="w-4 h-4 text-red-400 ml-2" />
            )}
          </div>
        )}
      </div>

      {/* Provider Configuration */}
      {settings.email_enabled && (
        <>
          <div className="gem-card p-6 space-y-6 mb-6">
            <h2 className="font-semibold flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400" />
              Provider Configuration
            </h2>

            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Email Provider</label>
              <select
                value={settings.email_provider}
                onChange={(e) => setSettings(prev => ({ ...prev, email_provider: e.target.value }))}
                className="input-dark h-10 text-sm"
                data-testid="email-provider-select"
              >
                <option value="">Select provider...</option>
                <option value="sendgrid">SendGrid</option>
                <option value="resend">Resend</option>
                <option value="mailgun">Mailgun</option>
                <option value="ses">AWS SES</option>
                <option value="postmark">Postmark</option>
              </select>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">API Key</label>
              <input
                type="password"
                value={settings.email_api_key}
                onChange={(e) => setSettings(prev => ({ ...prev, email_api_key: e.target.value }))}
                className="input-dark h-10 text-sm font-mono"
                placeholder="Enter your API key"
                data-testid="email-api-key-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">From Email</label>
                <input
                  type="email"
                  value={settings.email_from_address}
                  onChange={(e) => setSettings(prev => ({ ...prev, email_from_address: e.target.value }))}
                  className="input-dark h-10 text-sm"
                  placeholder="noreply@yourdomain.com"
                  data-testid="email-from-address-input"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">From Name</label>
                <input
                  type="text"
                  value={settings.email_from_name}
                  onChange={(e) => setSettings(prev => ({ ...prev, email_from_name: e.target.value }))}
                  className="input-dark h-10 text-sm"
                  placeholder="Cutting Corners"
                  data-testid="email-from-name-input"
                />
              </div>
            </div>

            <button
              onClick={handleTestConnection}
              disabled={testing || !settings.email_api_key}
              className="btn-secondary w-full flex items-center justify-center gap-2"
              data-testid="test-email-connection-btn"
            >
              <Send className="w-4 h-4" />
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
          </div>

          {/* Auto Email Triggers */}
          <div className="gem-card p-6 space-y-4 mb-6">
            <h2 className="font-semibold">Auto Email Triggers</h2>
            <p className="text-xs text-gray-500">Choose when to automatically send emails</p>

            {[
              { key: 'auto_email_on_order', label: 'Order Confirmation', desc: 'Send when a purchase is completed' },
              { key: 'auto_email_on_booking', label: 'Booking Confirmation', desc: 'Send when a service is booked' },
              { key: 'auto_email_on_inquiry', label: 'Inquiry Receipt', desc: 'Send when an inquiry is submitted' },
              { key: 'auto_email_on_tracking', label: 'Tracking Updates', desc: 'Send when tracking info is added' },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
                <button
                  onClick={() => handleToggle(item.key)}
                  className={`w-12 h-6 rounded-full transition-colors ${settings[item.key] ? 'bg-green-500' : 'bg-gray-700'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${settings[item.key] ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <button 
        onClick={handleSave} 
        disabled={saving} 
        className="btn-primary w-full"
        data-testid="save-email-settings-btn"
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
};

export default EmailSettings;
