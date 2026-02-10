import React, { useState, useEffect } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { toast } from 'sonner';
import { Save, RotateCcw, Plus, Trash2, GripVertical, Eye, EyeOff, Image, Clock, Wrench, Camera } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// Reusable List Editor Component
const ListEditor = ({ items, setItems, fields, title, icon: Icon }) => {
  const addItem = () => {
    const newItem = {
      id: `temp-${Date.now()}`,
      order: items.length,
      ...fields.reduce((acc, f) => ({ ...acc, [f.key]: f.default || '' }), {})
    };
    setItems([...items, newItem]);
  };

  const updateItem = (index, key, value) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [key]: value };
    setItems(updated);
  };

  const removeItem = (index) => {
    const updated = items.filter((_, i) => i !== index);
    // Reorder
    setItems(updated.map((item, i) => ({ ...item, order: i })));
  };

  const moveItem = (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === items.length - 1) return;
    
    const updated = [...items];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setItems(updated.map((item, i) => ({ ...item, order: i })));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-amber-400" />}
          <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-400">{title}</h3>
        </div>
        <button
          type="button"
          onClick={addItem}
          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>
      
      {items.length === 0 ? (
        <p className="text-gray-600 text-sm italic">No items yet. Click "Add" to create one.</p>
      ) : (
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={item.id} className="bg-white/5 border border-white/10 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-gray-600" />
                  <span className="text-xs text-gray-500">#{index + 1}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => moveItem(index, 'up')}
                    disabled={index === 0}
                    className="text-gray-500 hover:text-white disabled:opacity-30"
                  >↑</button>
                  <button
                    type="button"
                    onClick={() => moveItem(index, 'down')}
                    disabled={index === items.length - 1}
                    className="text-gray-500 hover:text-white disabled:opacity-30"
                  >↓</button>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {fields.map(field => (
                  <div key={field.key} className={field.fullWidth ? 'md:col-span-2' : ''}>
                    <label className="block text-xs text-gray-500 mb-1">{field.label}</label>
                    {field.type === 'textarea' ? (
                      <textarea
                        value={item[field.key] || ''}
                        onChange={(e) => updateItem(index, field.key, e.target.value)}
                        className="input-dark h-20 text-sm resize-none"
                        placeholder={field.placeholder}
                      />
                    ) : (
                      <input
                        type={field.type || 'text'}
                        value={item[field.key] || ''}
                        onChange={(e) => updateItem(index, field.key, e.target.value)}
                        className="input-dark h-9 text-sm"
                        placeholder={field.placeholder}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const AdminStudio = () => {
  const { getAuthHeaders } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState(null);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/admin/content/studio`, {
        headers: getAuthHeaders()
      });
      setContent(response.data);
    } catch (error) {
      toast.error('Failed to load Studio content');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await axios.put(`${API_URL}/admin/content/studio`, content, {
        headers: getAuthHeaders()
      });
      toast.success('Studio content saved!');
      fetchContent(); // Refresh to get updated version
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset all Studio content to defaults? This cannot be undone.')) {
      return;
    }
    try {
      await axios.post(`${API_URL}/dev/content/studio/reset`, {}, {
        headers: getAuthHeaders()
      });
      toast.success('Content reset to defaults');
      fetchContent();
    } catch (error) {
      toast.error('Failed to reset content');
    }
  };

  const updateHero = (key, value) => {
    setContent(prev => ({
      ...prev,
      hero: { ...prev.hero, [key]: value }
    }));
  };

  const updateBeforeAfter = (section, key, value) => {
    setContent(prev => ({
      ...prev,
      before_after: {
        ...prev.before_after,
        [section]: section === 'labels' 
          ? { ...prev.before_after.labels, [key]: value }
          : { ...prev.before_after[section], [key]: value }
      }
    }));
  };

  const updateCta = (key, value) => {
    setContent(prev => ({
      ...prev,
      cta: { ...prev.cta, [key]: value }
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Failed to load content</p>
        <button onClick={fetchContent} className="mt-4 btn-secondary">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="admin-studio">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif">Studio Content</h1>
          <p className="text-gray-500 text-sm mt-1">
            Version {content.version} • Last updated: {new Date(content.updated_at).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="btn-secondary flex items-center gap-2"
            data-testid="reset-btn"
          >
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
            data-testid="save-btn"
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Visibility Toggle */}
      <div className="bg-white/5 border border-white/10 p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {content.enabled ? (
              <Eye className="w-5 h-5 text-green-400" />
            ) : (
              <EyeOff className="w-5 h-5 text-gray-500" />
            )}
            <div>
              <h3 className="font-semibold">Studio Page Visibility</h3>
              <p className="text-sm text-gray-500">
                {content.enabled 
                  ? 'Studio page is visible to visitors'
                  : 'Studio page is hidden from navigation and returns 404'
                }
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={content.enabled}
              onChange={(e) => setContent(prev => ({ ...prev, enabled: e.target.checked }))}
              className="sr-only peer"
              data-testid="enabled-toggle"
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
          </label>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-white/5 border border-white/10 p-6 rounded-lg space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-400 flex items-center gap-2">
          <Image className="w-4 h-4 text-amber-400" /> Hero Section
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Title</label>
            <input
              type="text"
              value={content.hero.title}
              onChange={(e) => updateHero('title', e.target.value)}
              className="input-dark h-10 text-sm"
              data-testid="hero-title"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Subtitle</label>
            <textarea
              value={content.hero.subtitle}
              onChange={(e) => updateHero('subtitle', e.target.value)}
              className="input-dark h-20 text-sm resize-none"
              data-testid="hero-subtitle"
            />
          </div>
        </div>
      </div>

      {/* Before/After Section */}
      <div className="bg-white/5 border border-white/10 p-6 rounded-lg space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-400 flex items-center gap-2">
          <Image className="w-4 h-4 text-amber-400" /> Before/After Slider
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="text-sm text-gray-400">Before Image</h4>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Image URL</label>
              <input
                type="url"
                value={content.before_after.before.image_url}
                onChange={(e) => updateBeforeAfter('before', 'image_url', e.target.value)}
                className="input-dark h-9 text-sm"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Alt Text</label>
              <input
                type="text"
                value={content.before_after.before.alt}
                onChange={(e) => updateBeforeAfter('before', 'alt', e.target.value)}
                className="input-dark h-9 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Label</label>
              <input
                type="text"
                value={content.before_after.labels.before_label}
                onChange={(e) => updateBeforeAfter('labels', 'before_label', e.target.value)}
                className="input-dark h-9 text-sm"
              />
            </div>
          </div>
          <div className="space-y-3">
            <h4 className="text-sm text-gray-400">After Image</h4>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Image URL</label>
              <input
                type="url"
                value={content.before_after.after.image_url}
                onChange={(e) => updateBeforeAfter('after', 'image_url', e.target.value)}
                className="input-dark h-9 text-sm"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Alt Text</label>
              <input
                type="text"
                value={content.before_after.after.alt}
                onChange={(e) => updateBeforeAfter('after', 'alt', e.target.value)}
                className="input-dark h-9 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Label</label>
              <input
                type="text"
                value={content.before_after.labels.after_label}
                onChange={(e) => updateBeforeAfter('labels', 'after_label', e.target.value)}
                className="input-dark h-9 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Story Timeline */}
      <div className="bg-white/5 border border-white/10 p-6 rounded-lg">
        <ListEditor
          items={content.story_timeline || []}
          setItems={(items) => setContent(prev => ({ ...prev, story_timeline: items }))}
          title="Story Timeline"
          icon={Clock}
          fields={[
            { key: 'year', label: 'Year', placeholder: 'e.g., 2020' },
            { key: 'heading', label: 'Heading', placeholder: 'Title' },
            { key: 'body', label: 'Body', type: 'textarea', fullWidth: true, placeholder: 'Story text...' },
            { key: 'image_url', label: 'Image URL (optional)', placeholder: 'https://...' },
            { key: 'image_alt', label: 'Image Alt (optional)', placeholder: 'Description' },
          ]}
        />
      </div>

      {/* Equipment */}
      <div className="bg-white/5 border border-white/10 p-6 rounded-lg">
        <ListEditor
          items={content.equipment || []}
          setItems={(items) => setContent(prev => ({ ...prev, equipment: items }))}
          title="Equipment"
          icon={Wrench}
          fields={[
            { key: 'name', label: 'Name', placeholder: 'Equipment name' },
            { key: 'purpose', label: 'Purpose', type: 'textarea', fullWidth: true, placeholder: 'What it does...' },
            { key: 'image_url', label: 'Image URL (optional)', placeholder: 'https://...' },
            { key: 'image_alt', label: 'Image Alt (optional)', placeholder: 'Description' },
          ]}
        />
      </div>

      {/* Action Photos */}
      <div className="bg-white/5 border border-white/10 p-6 rounded-lg">
        <ListEditor
          items={content.action_photos || []}
          setItems={(items) => setContent(prev => ({ ...prev, action_photos: items }))}
          title="Action Photos"
          icon={Camera}
          fields={[
            { key: 'image_url', label: 'Image URL', placeholder: 'https://...' },
            { key: 'alt', label: 'Alt Text', placeholder: 'Description' },
          ]}
        />
      </div>

      {/* CTA Section */}
      <div className="bg-white/5 border border-white/10 p-6 rounded-lg space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-400">
          Call to Action
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Text</label>
            <textarea
              value={content.cta.text}
              onChange={(e) => updateCta('text', e.target.value)}
              className="input-dark h-16 text-sm resize-none"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="text-sm text-gray-400">Primary Button</h4>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Label</label>
                <input
                  type="text"
                  value={content.cta.primary_label}
                  onChange={(e) => updateCta('primary_label', e.target.value)}
                  className="input-dark h-9 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Link</label>
                <input
                  type="text"
                  value={content.cta.primary_href}
                  onChange={(e) => updateCta('primary_href', e.target.value)}
                  className="input-dark h-9 text-sm"
                  placeholder="/book"
                />
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm text-gray-400">Secondary Button</h4>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Label</label>
                <input
                  type="text"
                  value={content.cta.secondary_label}
                  onChange={(e) => updateCta('secondary_label', e.target.value)}
                  className="input-dark h-9 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Link</label>
                <input
                  type="text"
                  value={content.cta.secondary_href}
                  onChange={(e) => updateCta('secondary_href', e.target.value)}
                  className="input-dark h-9 text-sm"
                  placeholder="/gallery"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Save Bar */}
      <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-[#0A0A0A]/95 border-t border-white/10 p-4 flex justify-end gap-3 z-40">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

export default AdminStudio;
