import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, X, Save, PenTool } from 'lucide-react';
import axios from 'axios';
import AdminLayout from './AdminLayout';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminDesigns = () => {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDesign, setEditingDesign] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    category: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchDesigns();
  }, []);

  const fetchDesigns = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(`${API_URL}/api/admin/designs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDesigns(response.data);
    } catch (err) {
      setError('Failed to fetch designs');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('adminToken');
      if (editingDesign) {
        await axios.patch(`${API_URL}/api/admin/designs/${editingDesign.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSuccess('Design updated successfully');
      } else {
        await axios.post(`${API_URL}/api/admin/designs`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSuccess('Design created successfully');
      }
      fetchDesigns();
      resetForm();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save design');
    }
  };

  const handleDelete = async (designId) => {
    if (!window.confirm('Are you sure you want to delete this design?')) return;
    
    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`${API_URL}/api/admin/designs/${designId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Design deleted successfully');
      fetchDesigns();
    } catch (err) {
      setError('Failed to delete design');
    }
  };

  const handleEdit = (design) => {
    setFormData({
      title: design.title,
      description: design.description || '',
      image_url: design.image_url,
      category: design.category || ''
    });
    setEditingDesign(design);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      image_url: '',
      category: ''
    });
    setEditingDesign(null);
    setShowForm(false);
  };

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-light text-white mb-1">Cutting Designs</h1>
            <p className="text-gray-500 text-sm">Manage cutting diagrams and design patterns</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-black px-4 py-2 rounded transition-colors"
            data-testid="add-design-btn"
          >
            <Plus className="w-4 h-4" />
            Add Design
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
            <div className="bg-[#0A0A0A] border border-white/10 rounded-lg w-full max-w-lg">
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-lg font-light text-white">
                  {editingDesign ? 'Edit Design' : 'Add New Design'}
                </h2>
                <button onClick={resetForm} className="text-gray-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded px-4 py-2 text-white"
                    placeholder="e.g., Portuguese Round"
                    required
                    data-testid="design-title"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded px-4 py-2 text-white"
                    placeholder="e.g., Round Cuts, Fancy Cuts"
                    data-testid="design-category"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Image URL *</label>
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded px-4 py-2 text-white"
                    placeholder="https://..."
                    required
                    data-testid="design-image-url"
                  />
                  {formData.image_url && (
                    <img src={formData.image_url} alt="Preview" className="mt-2 h-24 w-24 object-cover rounded" />
                  )}
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded px-4 py-2 text-white h-24 resize-none"
                    placeholder="Optional description of the cutting design..."
                    data-testid="design-description"
                  />
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
                    data-testid="save-design-btn"
                  >
                    <Save className="w-4 h-4" />
                    {editingDesign ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Designs Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        ) : designs.length === 0 ? (
          <div className="text-center py-12 bg-white/5 rounded-lg">
            <PenTool className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500">No designs yet. Add your first cutting design!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {designs.map((design) => (
              <div
                key={design.id}
                className="bg-white/5 border border-white/10 rounded-lg overflow-hidden"
                data-testid={`design-item-${design.id}`}
              >
                {/* Image */}
                <div className="aspect-square bg-black">
                  <img 
                    src={design.image_url} 
                    alt={design.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="text-white font-medium mb-1">{design.title}</h3>
                  {design.category && (
                    <p className="text-amber-400 text-xs uppercase tracking-widest mb-2">{design.category}</p>
                  )}
                  {design.description && (
                    <p className="text-gray-500 text-sm line-clamp-2">{design.description}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex border-t border-white/10">
                  <button
                    onClick={() => handleEdit(design)}
                    className="flex-1 flex items-center justify-center gap-2 p-3 text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                    data-testid={`edit-design-${design.id}`}
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(design.id)}
                    className="flex-1 flex items-center justify-center gap-2 p-3 text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors border-l border-white/10"
                    data-testid={`delete-design-${design.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
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

export default AdminDesigns;
