import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Video, Star } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const CATEGORIES = ['sapphire', 'tourmaline', 'emerald', 'tanzanite', 'aquamarine', 'garnet', 'other'];

const AdminGallery = () => {
  const { getAuthHeaders } = useAdmin();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    category: 'sapphire',
    description: '',
    image_url: '',
    images: [],
    videos: [],
    gemstone_type: '',
    color: '',
    carat: '',
    dimensions: '',
    featured: false
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/gallery`, getAuthHeaders());
      setItems(response.data);
    } catch (error) {
      toast.error('Failed to fetch gallery');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      category: 'sapphire',
      description: '',
      image_url: '',
      images: [],
      videos: [],
      gemstone_type: '',
      color: '',
      carat: '',
      dimensions: '',
      featured: false
    });
    setEditingItem(null);
  };

  const openModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        ...item,
        images: item.images || [],
        videos: item.videos || [],
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await axios.patch(`${API_URL}/admin/gallery/${editingItem.id}`, formData, getAuthHeaders());
        toast.success('Gallery item updated');
      } else {
        await axios.post(`${API_URL}/admin/gallery`, formData, getAuthHeaders());
        toast.success('Gallery item created');
      }
      fetchItems();
      setShowModal(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to save gallery item');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this gallery item?')) return;
    try {
      await axios.delete(`${API_URL}/admin/gallery/${id}`, getAuthHeaders());
      toast.success('Gallery item deleted');
      fetchItems();
    } catch (error) {
      toast.error('Failed to delete gallery item');
    }
  };

  const addImageUrl = () => {
    const url = prompt('Enter image URL:');
    if (url) {
      setFormData(prev => ({ ...prev, images: [...prev.images, url] }));
    }
  };

  const addVideoUrl = () => {
    const url = prompt('Enter video URL:');
    if (url) {
      setFormData(prev => ({ ...prev, videos: [...prev.videos, url] }));
    }
  };

  const removeMedia = (type, index) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-3xl">Gallery</h1>
        <button onClick={() => openModal()} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.length === 0 ? (
          <div className="col-span-full gem-card p-8 text-center">
            <p className="text-gray-500">No gallery items yet. Add your first item!</p>
          </div>
        ) : (
          items.map(item => (
            <div key={item.id} className="gem-card group relative overflow-hidden">
              <img src={item.image_url} alt={item.title} className="aspect-square object-cover" />
              {item.featured && (
                <div className="absolute top-2 left-2">
                  <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                <p className="text-xs text-gray-400 uppercase">{item.category}</p>
                <p className="font-serif text-sm truncate">{item.title}</p>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => openModal(item)} className="flex-1 py-2 bg-white/20 hover:bg-white/30 text-xs">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="flex-1 py-2 bg-red-500/20 hover:bg-red-500/30 text-xs text-red-400">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0A0A0A] border border-white/10 w-full max-w-2xl my-8 relative">
            <div className="sticky top-0 bg-[#0A0A0A] border-b border-white/10 p-4 flex items-center justify-between">
              <h2 className="font-serif text-xl">{editingItem ? 'Edit Gallery Item' : 'Add Gallery Item'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    required
                    className="input-dark h-10 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="input-dark h-10 text-sm"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Gem Type</label>
                  <input
                    type="text"
                    value={formData.gemstone_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, gemstone_type: e.target.value }))}
                    className="input-dark h-10 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Color</label>
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    className="input-dark h-10 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Carat</label>
                  <input
                    type="text"
                    value={formData.carat}
                    onChange={(e) => setFormData(prev => ({ ...prev, carat: e.target.value }))}
                    className="input-dark h-10 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Dimensions</label>
                  <input
                    type="text"
                    value={formData.dimensions}
                    onChange={(e) => setFormData(prev => ({ ...prev, dimensions: e.target.value }))}
                    className="input-dark h-10 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="input-dark h-24 text-sm resize-none"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Main Image URL *</label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                  required
                  className="input-dark h-10 text-sm"
                  placeholder="https://..."
                />
              </div>

              {/* Additional Images */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs uppercase tracking-widest text-gray-500">Additional Images</label>
                  <button type="button" onClick={addImageUrl} className="text-xs text-blue-400 hover:text-blue-300">
                    + Add Image URL
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.images.map((img, i) => (
                    <div key={i} className="relative group">
                      <img src={img} alt="" className="w-16 h-16 object-cover" />
                      <button
                        type="button"
                        onClick={() => removeMedia('images', i)}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Videos */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs uppercase tracking-widest text-gray-500">Videos</label>
                  <button type="button" onClick={addVideoUrl} className="text-xs text-blue-400 hover:text-blue-300">
                    + Add Video URL
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.videos.map((video, i) => (
                    <div key={i} className="flex items-center gap-2 bg-white/5 p-2 rounded">
                      <Video className="w-4 h-4 text-gray-500" />
                      <span className="text-xs text-gray-400 truncate flex-1">{video}</span>
                      <button type="button" onClick={() => removeMedia('videos', i)} className="text-red-400">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="featured"
                  checked={formData.featured}
                  onChange={(e) => setFormData(prev => ({ ...prev, featured: e.target.checked }))}
                  className="w-4 h-4"
                />
                <label htmlFor="featured" className="text-sm">Featured on Homepage</label>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {editingItem ? 'Update' : 'Create'} Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminGallery;
