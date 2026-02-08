import React, { useState, useEffect } from 'react';
import { BarChart3, HelpCircle, CheckCircle, AlertCircle, Calendar, ToggleLeft, ToggleRight, Send, Eye, MousePointer, Clock, Monitor } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const ANALYTICS_PROVIDERS = [
  { id: 'google', name: 'Google Analytics', url: 'https://analytics.google.com' },
  { id: 'plausible', name: 'Plausible Analytics', url: 'https://plausible.io' },
  { id: 'fathom', name: 'Fathom Analytics', url: 'https://usefathom.com' },
  { id: 'mixpanel', name: 'Mixpanel', url: 'https://mixpanel.com' },
  { id: 'amplitude', name: 'Amplitude', url: 'https://amplitude.com' },
  { id: 'heap', name: 'Heap Analytics', url: 'https://heap.io' },
  { id: 'posthog', name: 'PostHog', url: 'https://posthog.com' },
  { id: 'custom', name: 'Custom / Other', url: '' },
];

const AnalyticsSettings = () => {
  const { getAuthHeaders } = useAdmin();
  const [settings, setSettings] = useState({
    analytics_enabled: false,
    analytics_provider: '',
    analytics_tracking_id: '',
    analytics_api_key: '',
    analytics_connected_at: null,
    // Data collection toggles
    track_browser_type: true,
    track_device_type: true,
    track_clicks: true,
    track_views: true,
    track_duration: true,
    track_interaction_rate: true
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

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData = {
        ...settings,
        analytics_connected_at: settings.analytics_tracking_id ? new Date().toISOString() : null
      };
      await axios.patch(`${API_URL}/admin/settings`, updateData, getAuthHeaders());
      toast.success('Analytics settings saved');
      fetchSettings();
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!settings.analytics_tracking_id || !settings.analytics_provider) {
      toast.error('Please configure provider and tracking ID first');
      return;
    }
    setTesting(true);
    try {
      const response = await axios.post(`${API_URL}/admin/settings/test-analytics`, {
        provider: settings.analytics_provider,
        tracking_id: settings.analytics_tracking_id,
        api_key: settings.analytics_api_key
      }, getAuthHeaders());
      
      if (response.data.success) {
        toast.success('Analytics connection verified!');
        setSettings(prev => ({ ...prev, analytics_connected_at: new Date().toISOString() }));
      } else {
        toast.error(response.data.message || 'Connection test failed');
      }
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

  const selectedProvider = ANALYTICS_PROVIDERS.find(p => p.id === settings.analytics_provider);

  return (
    <div className="max-w-2xl" data-testid="analytics-settings-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl mb-2">Analytics & Data Collection</h1>
          <p className="text-gray-500 text-sm">Track visitor behavior and engagement</p>
        </div>
        <Link to="/admin/help/analytics" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
          <HelpCircle className="w-4 h-4" /> Setup Guide
        </Link>
      </div>

      {/* Enable Toggle */}
      <div className="gem-card p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-gray-400" />
            <div>
              <p className="font-semibold">Enable Analytics</p>
              <p className="text-xs text-gray-500">Turn on/off data collection</p>
            </div>
          </div>
          <button
            onClick={() => setSettings(prev => ({ ...prev, analytics_enabled: !prev.analytics_enabled }))}
            className="flex items-center gap-2"
            data-testid="analytics-enable-toggle"
          >
            {settings.analytics_enabled ? (
              <ToggleRight className="w-10 h-10 text-green-500" />
            ) : (
              <ToggleLeft className="w-10 h-10 text-gray-500" />
            )}
          </button>
        </div>

        {/* Connection Status */}
        {settings.analytics_connected_at && (
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-gray-500">Connected:</span>
            <span>{new Date(settings.analytics_connected_at).toLocaleDateString()}</span>
            <CheckCircle className="w-4 h-4 text-green-400 ml-2" />
          </div>
        )}
      </div>

      {/* Status Banner */}
      <div className={`gem-card p-4 mb-6 flex items-center gap-3 ${settings.analytics_enabled ? 'border-green-500/30' : 'border-yellow-500/30'}`}>
        {settings.analytics_enabled ? (
          <>
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-green-400">Analytics is enabled</span>
            {selectedProvider && <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 ml-auto">{selectedProvider.name}</span>}
          </>
        ) : (
          <>
            <AlertCircle className="w-5 h-5 text-yellow-400" />
            <span className="text-yellow-400">Analytics is disabled - no data collection</span>
          </>
        )}
      </div>

      {settings.analytics_enabled && (
        <>
          {/* Provider Configuration */}
          <div className="gem-card p-6 space-y-6 mb-6">
            <h2 className="font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-gray-400" />
              Analytics Provider
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {ANALYTICS_PROVIDERS.map(provider => (
                <button
                  key={provider.id}
                  onClick={() => setSettings(prev => ({ ...prev, analytics_provider: provider.id }))}
                  className={`p-3 text-left text-xs border transition-colors ${
                    settings.analytics_provider === provider.id
                      ? 'border-white bg-white/10'
                      : 'border-white/10 hover:border-white/30'
                  }`}
                  data-testid={`analytics-provider-${provider.id}`}
                >
                  {provider.name}
                </button>
              ))}
            </div>

            {settings.analytics_provider && (
              <>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">
                    {settings.analytics_provider === 'google' ? 'Measurement ID (G-XXXXXXX)' : 'Tracking ID / Site ID'}
                  </label>
                  <input
                    type="text"
                    value={settings.analytics_tracking_id}
                    onChange={(e) => setSettings(prev => ({ ...prev, analytics_tracking_id: e.target.value }))}
                    className="input-dark h-10 text-sm font-mono"
                    placeholder={settings.analytics_provider === 'google' ? 'G-XXXXXXXXXX' : 'Your tracking ID'}
                    data-testid="analytics-tracking-id-input"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">API Key (Optional)</label>
                  <input
                    type="password"
                    value={settings.analytics_api_key}
                    onChange={(e) => setSettings(prev => ({ ...prev, analytics_api_key: e.target.value }))}
                    className="input-dark h-10 text-sm font-mono"
                    placeholder="For advanced features"
                  />
                  <p className="text-xs text-gray-600 mt-1">Required for server-side tracking and API access</p>
                </div>

                <button
                  onClick={handleTestConnection}
                  disabled={testing || !settings.analytics_tracking_id}
                  className="btn-secondary w-full flex items-center justify-center gap-2"
                  data-testid="test-analytics-connection-btn"
                >
                  <Send className="w-4 h-4" />
                  {testing ? 'Testing...' : 'Test Connection'}
                </button>
              </>
            )}
          </div>

          {/* Data Collection Options */}
          <div className="gem-card p-6 space-y-4 mb-6">
            <h2 className="font-semibold">Data Collection Types</h2>
            <p className="text-xs text-gray-500">Choose what data to collect from visitors</p>

            {[
              { key: 'track_browser_type', label: 'Browser Type', desc: 'Chrome, Firefox, Safari, etc.', icon: Monitor },
              { key: 'track_device_type', label: 'Device Type', desc: 'Desktop, Mobile, Tablet', icon: Monitor },
              { key: 'track_clicks', label: 'Click Tracking', desc: 'Track clicks on listings and gallery', icon: MousePointer },
              { key: 'track_views', label: 'Page Views', desc: 'Track which pages are viewed', icon: Eye },
              { key: 'track_duration', label: 'View Duration', desc: 'How long visitors stay on pages', icon: Clock },
              { key: 'track_interaction_rate', label: 'Interaction Rate', desc: 'Engagement with interactive elements', icon: BarChart3 },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <item.icon className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSettings(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
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
        data-testid="save-analytics-settings-btn"
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </button>

      {/* Provider Link */}
      {selectedProvider && selectedProvider.url && (
        <div className="mt-6">
          <a href={selectedProvider.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-gray-500 hover:text-white">
            Visit {selectedProvider.name} →
          </a>
        </div>
      )}
    </div>
  );
};

export default AnalyticsSettings;
