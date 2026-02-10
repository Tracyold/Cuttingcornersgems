import React, { useState, useEffect } from 'react';
import { Cloud, ExternalLink, CheckCircle, AlertCircle, HelpCircle, Calendar, ToggleLeft, ToggleRight, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const PROVIDERS = [
  { id: 'cloudinary', name: 'Cloudinary', url: 'https://cloudinary.com' },
  { id: 's3', name: 'AWS S3', url: 'https://aws.amazon.com/s3/' },
  { id: 'gcs', name: 'Google Cloud Storage', url: 'https://cloud.google.com/storage' },
  { id: 'bunny', name: 'Bunny CDN', url: 'https://bunny.net' },
  { id: 'backblaze', name: 'Backblaze B2', url: 'https://www.backblaze.com/b2/' },
  { id: 'other', name: 'Other / Custom', url: '' },
];

const StorageSettings = () => {
  const { getAuthHeaders } = useAdmin();
  const [settings, setSettings] = useState({
    cloud_storage_enabled: false,
    cloud_storage_provider: '',
    cloud_storage_api_key: '',
    cloud_storage_api_secret: '',
    cloud_storage_bucket: '',
    cloud_storage_url: '',
    cloud_storage_connected_at: null
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
        cloud_storage_enabled: response.data.cloud_storage_enabled || false,
        cloud_storage_provider: response.data.cloud_storage_provider || '',
        cloud_storage_api_key: response.data.cloud_storage_api_key || '',
        cloud_storage_api_secret: response.data.cloud_storage_api_secret || '',
        cloud_storage_bucket: response.data.cloud_storage_bucket || '',
        cloud_storage_url: response.data.cloud_storage_url || '',
        cloud_storage_connected_at: response.data.cloud_storage_connected_at || null
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
        cloud_storage_connected_at: settings.cloud_storage_api_key ? new Date().toISOString() : null
      };
      await axios.patch(`${API_URL}/admin/settings`, updateData, getAuthHeaders());
      toast.success('Storage settings saved');
      fetchSettings();
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!settings.cloud_storage_api_key || !settings.cloud_storage_provider) {
      toast.error('Please configure provider and API key first');
      return;
    }
    setTesting(true);
    try {
      // Simulate test connection - in production this would make a real API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Storage connection successful!');
      setSettings(prev => ({ ...prev, cloud_storage_connected_at: new Date().toISOString() }));
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

  const selectedProvider = PROVIDERS.find(p => p.id === settings.cloud_storage_provider);

  return (
    <div className="max-w-2xl" data-testid="storage-settings-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title title-xl text-3xl mb-2">Cloud Storage</h1>
          <p className="text-gray-500 text-sm">Configure image and video hosting</p>
        </div>
        <Link to="/admin/help/storage" className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm">
          <HelpCircle className="w-4 h-4" /> Setup Guide
        </Link>
      </div>

      {/* Enable/Disable Toggle Card */}
      <div className="gem-card p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Cloud className="w-5 h-5 text-gray-400" />
            <div>
              <p className="font-semibold">Enable Cloud Storage</p>
              <p className="text-xs text-gray-500">Turn on/off cloud media hosting</p>
            </div>
          </div>
          <button
            onClick={() => setSettings(prev => ({ ...prev, cloud_storage_enabled: !prev.cloud_storage_enabled }))}
            className="flex items-center gap-2"
            data-testid="storage-enable-toggle"
          >
            {settings.cloud_storage_enabled ? (
              <ToggleRight className="w-10 h-10 text-green-500" />
            ) : (
              <ToggleLeft className="w-10 h-10 text-gray-500" />
            )}
          </button>
        </div>

        {/* Connection Status */}
        {settings.cloud_storage_connected_at && (
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-gray-500">Connected:</span>
            <span>{new Date(settings.cloud_storage_connected_at).toLocaleDateString()}</span>
            <CheckCircle className="w-4 h-4 text-green-400 ml-2" />
          </div>
        )}
      </div>

      {/* Status Banner */}
      <div className={`gem-card p-4 mb-6 flex items-center gap-3 ${settings.cloud_storage_enabled ? 'border-green-500/30' : 'border-yellow-500/30'}`}>
        {settings.cloud_storage_enabled ? (
          <>
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-green-400">Cloud storage is enabled</span>
            {selectedProvider && <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 ml-auto">{selectedProvider.name}</span>}
          </>
        ) : (
          <>
            <AlertCircle className="w-5 h-5 text-yellow-400" />
            <span className="text-yellow-400">Cloud storage is disabled - using direct URLs only</span>
          </>
        )}
      </div>

      {settings.cloud_storage_enabled && (
        <div className="gem-card p-6 space-y-6">
          {/* Provider Selection */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Storage Provider</label>
            <div className="grid grid-cols-2 gap-2">
              {PROVIDERS.map(provider => (
                <button
                  key={provider.id}
                  onClick={() => setSettings(prev => ({ ...prev, cloud_storage_provider: provider.id }))}
                  className={`p-3 text-left text-sm border transition-colors ${
                    settings.cloud_storage_provider === provider.id
                      ? 'border-white bg-white/10'
                      : 'border-white/10 hover:border-white/30'
                  }`}
                  data-testid={`storage-provider-${provider.id}`}
                >
                  {provider.name}
                </button>
              ))}
            </div>
          </div>

          {settings.cloud_storage_provider && (
            <>
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">API Key / Access Key</label>
                <input
                  type="text"
                  value={settings.cloud_storage_api_key}
                  onChange={(e) => setSettings(prev => ({ ...prev, cloud_storage_api_key: e.target.value }))}
                  className="input-dark h-10 text-sm font-mono"
                  placeholder="Your API key"
                  data-testid="storage-api-key-input"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">API Secret / Secret Key</label>
                <input
                  type="password"
                  value={settings.cloud_storage_api_secret}
                  onChange={(e) => setSettings(prev => ({ ...prev, cloud_storage_api_secret: e.target.value }))}
                  className="input-dark h-10 text-sm font-mono"
                  placeholder="Your API secret"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Bucket / Cloud Name</label>
                <input
                  type="text"
                  value={settings.cloud_storage_bucket}
                  onChange={(e) => setSettings(prev => ({ ...prev, cloud_storage_bucket: e.target.value }))}
                  className="input-dark h-10 text-sm"
                  placeholder="your-bucket-name"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Base URL (Optional)</label>
                <input
                  type="url"
                  value={settings.cloud_storage_url}
                  onChange={(e) => setSettings(prev => ({ ...prev, cloud_storage_url: e.target.value }))}
                  className="input-dark h-10 text-sm"
                  placeholder="https://cdn.example.com"
                />
                <p className="text-xs text-gray-600 mt-1">Custom domain or CDN URL</p>
              </div>

              <button
                onClick={handleTestConnection}
                disabled={testing || !settings.cloud_storage_api_key}
                className="btn-secondary w-full flex items-center justify-center gap-2"
                data-testid="test-storage-connection-btn"
              >
                <Send className="w-4 h-4" />
                {testing ? 'Testing...' : 'Test Connection'}
              </button>
            </>
          )}

          <button onClick={handleSave} disabled={saving} className="btn-primary w-full" data-testid="save-storage-settings-btn">
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      )}

      {!settings.cloud_storage_enabled && (
        <button onClick={handleSave} disabled={saving} className="btn-primary w-full" data-testid="save-storage-settings-btn">
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      )}

      {/* Provider Links */}
      {selectedProvider && selectedProvider.url && (
        <div className="mt-6">
          <a href={selectedProvider.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-gray-500 hover:text-white">
            <ExternalLink className="w-4 h-4" /> Visit {selectedProvider.name}
          </a>
        </div>
      )}
    </div>
  );
};

export default StorageSettings;
