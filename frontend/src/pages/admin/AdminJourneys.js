import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, X, Save, ChevronRight, Gem, ArrowRight } from 'lucide-react';
import axios from 'axios';
import AdminLayout from './AdminLayout';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminJourneys = () => {
  const [journeys, setJourneys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingJourney, setEditingJourney] = useState(null);
  const [formData, setFormData] = useState({
    gem_name: '',
    subtitle: '',
    color: '#4a6fa5',
    before_image: '',
    after_image: '',
    timeline_images: ['', '', '', '', '', '', '', '']
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchJourneys();
  }, []);

  const fetchJourneys = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(`${API_URL}/api/admin/journeys`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setJourneys(response.data);
    } catch (err) {
      setError('Failed to fetch journeys');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Filter out empty timeline images
    const timelineImages = formData.timeline_images.filter(img => img.trim() !== '');

    const payload = {
      gem_name: formData.gem_name,
      subtitle: formData.subtitle,
      color: formData.color,
      before_image: formData.before_image,
      after_image: formData.after_image,
      timeline_images: timelineImages
    };

    try {
      const token = localStorage.getItem('adminToken');
      if (editingJourney) {
        await axios.patch(`${API_URL}/api/admin/journeys/${editingJourney.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSuccess('Journey updated successfully');
      } else {
        await axios.post(`${API_URL}/api/admin/journeys`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSuccess('Journey created successfully');
      }
      fetchJourneys();
      resetForm();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save journey');
    }
  };

  const handleDelete = async (journeyId) => {
    if (!window.confirm('Are you sure you want to delete this journey?')) return;
    
    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`${API_URL}/api/admin/journeys/${journeyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Journey deleted successfully');
      fetchJourneys();
    } catch (err) {
      setError('Failed to delete journey');
    }
  };

  const handleEdit = (journey) => {
    // Pad timeline_images array to 8 slots
    const timelineImages = [...(journey.timeline_images || [])];
    while (timelineImages.length < 8) {
      timelineImages.push('');
    }

    setFormData({
      gem_name: journey.gem_name,
      subtitle: journey.subtitle,
      color: journey.color,
      before_image: journey.before_image,
      after_image: journey.after_image,
      timeline_images: timelineImages
    });
    setEditingJourney(journey);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      gem_name: '',
      subtitle: '',
      color: '#4a6fa5',
      before_image: '',
      after_image: '',
      timeline_images: ['', '', '', '', '', '', '', '']
    });
    setEditingJourney(null);
    setShowForm(false);
  };

  const updateTimelineImage = (index, value) => {
    const newImages = [...formData.timeline_images];
    newImages[index] = value;
    setFormData({ ...formData, timeline_images: newImages });
  };

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-light text-white mb-1">Journey Stories</h1>
            <p className="text-gray-500 text-sm">Manage gem transformation journeys</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-black px-4 py-2 rounded transition-colors"
            data-testid="add-journey-btn"
          >
            <Plus className="w-4 h-4" />
            Add Journey
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded mb-6">
            {success}
          </div>
        )}

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-[#0A0A0A] border border-white/10 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-lg font-light text-white">
                  {editingJourney ? 'Edit Journey' : 'Add New Journey'}
                </h2>
                <button onClick={resetForm} className="text-gray-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Gem Name *</label>
                    <input
                      type="text"
                      value={formData.gem_name}
                      onChange={(e) => setFormData({ ...formData, gem_name: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded px-4 py-2 text-white"
                      placeholder="e.g., Montana Sapphire"
                      required
                      data-testid="journey-gem-name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Accent Color</label>
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-full h-10 bg-white/5 border border-white/10 rounded cursor-pointer"
                      data-testid="journey-color"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Subtitle *</label>
                  <input
                    type="text"
                    value={formData.subtitle}
                    onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded px-4 py-2 text-white"
                    placeholder="e.g., From Rough to Radiant"
                    required
                    data-testid="journey-subtitle"
                  />
                </div>

                {/* Thumbnail Images */}
                <div className="border-t border-white/10 pt-6">
                  <h3 className="text-sm uppercase tracking-widest text-gray-500 mb-4">Slider Thumbnail Images</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Before Image URL (Left) *</label>
                      <input
                        type="url"
                        value={formData.before_image}
                        onChange={(e) => setFormData({ ...formData, before_image: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded px-4 py-2 text-white text-sm"
                        placeholder="https://..."
                        required
                        data-testid="journey-before-image"
                      />
                      {formData.before_image && (
                        <img src={formData.before_image} alt="Before" className="mt-2 h-20 w-20 object-cover rounded" />
                      )}
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">After Image URL (Right) *</label>
                      <input
                        type="url"
                        value={formData.after_image}
                        onChange={(e) => setFormData({ ...formData, after_image: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded px-4 py-2 text-white text-sm"
                        placeholder="https://..."
                        required
                        data-testid="journey-after-image"
                      />
                      {formData.after_image && (
                        <img src={formData.after_image} alt="After" className="mt-2 h-20 w-20 object-cover rounded" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Timeline Images */}
                <div className="border-t border-white/10 pt-6">
                  <h3 className="text-sm uppercase tracking-widest text-gray-500 mb-4">Timeline Images (up to 8)</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {formData.timeline_images.map((img, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-amber-400 text-sm w-4">{index + 1}</span>
                        <input
                          type="url"
                          value={img}
                          onChange={(e) => updateTimelineImage(index, e.target.value)}
                          className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-white text-sm"
                          placeholder={`Image ${index + 1} URL`}
                          data-testid={`journey-timeline-${index}`}
                        />
                        {img && (
                          <img src={img} alt={`Step ${index + 1}`} className="h-8 w-8 object-cover rounded" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Submit */}
                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-black px-6 py-2 rounded transition-colors"
                    data-testid="save-journey-btn"
                  >
                    <Save className="w-4 h-4" />
                    {editingJourney ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Journeys List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        ) : journeys.length === 0 ? (
          <div className="text-center py-12 bg-white/5 rounded-lg">
            <Gem className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500">No journeys yet. Add your first gem transformation story!</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {journeys.map((journey) => (
              <div
                key={journey.id}
                className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center gap-4"
                data-testid={`journey-item-${journey.id}`}
              >
                {/* Thumbnail Preview */}
                <div className="flex items-center gap-1 shrink-0">
                  <img src={journey.before_image} alt="Before" className="w-16 h-16 object-cover rounded" />
                  <ArrowRight className="w-4 h-4 text-amber-400" />
                  <img src={journey.after_image} alt="After" className="w-16 h-16 object-cover rounded" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium">{journey.gem_name}</h3>
                  <p className="text-gray-500 text-sm truncate">{journey.subtitle}</p>
                  <p className="text-gray-600 text-xs mt-1">
                    {journey.timeline_images?.length || 0} timeline images
                  </p>
                </div>

                {/* Color Preview */}
                <div 
                  className="w-6 h-6 rounded-full shrink-0"
                  style={{ backgroundColor: journey.color }}
                  title="Accent color"
                />

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleEdit(journey)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                    data-testid={`edit-journey-${journey.id}`}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(journey.id)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                    data-testid={`delete-journey-${journey.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminJourneys;
