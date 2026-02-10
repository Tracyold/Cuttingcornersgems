import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Upload, Video, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { toast } from 'sonner';
import { adminApi } from '../../api/adminApi';

const CATEGORIES = ['sapphire', 'tourmaline', 'emerald', 'tanzanite', 'aquamarine', 'garnet', 'other'];

const emptyForm = {
  title: '',
  category: 'sapphire',
  description: '',
  gemstone_type: '',
  color: '',
  carat: '',
  dimensions: '',
  price_per_carat: '',
  price: '',
  image_url: '',
  images: [],
  videos: [],
  in_stock: true,
  gia_certified: false,
  gia_report_number: '',
  gia_report_image: '',
  name_your_price: false,
  name_your_price_phone: ''
};

// Bulk Add Modal Component
const BulkAddModal = ({ onClose, onComplete }) => {
  const [currentForm, setCurrentForm] = useState({ ...emptyForm });
  const [savedForms, setSavedForms] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [editingIndex, setEditingIndex] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const MAX_ENTRIES = 10;

  const handleChange = (field, value) => {
    setCurrentForm(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (!currentForm.title || !currentForm.image_url) {
      toast.error('Title and Main Image URL are required');
      return;
    }

    if (editingIndex !== null) {
      // Update existing saved form
      const updated = [...savedForms];
      updated[editingIndex] = { ...currentForm };
      setSavedForms(updated);
      setEditingIndex(null);
    } else {
      // Add new form
      setSavedForms(prev => [...prev, { ...currentForm }]);
    }

    if (savedForms.length < MAX_ENTRIES - 1) {
      setCurrentForm({ ...emptyForm });
      setCurrentIndex(savedForms.length + 1);
    }
  };

  const handleBack = () => {
    if (savedForms.length > 0) {
      const lastIndex = savedForms.length - 1;
      setCurrentForm({ ...savedForms[lastIndex] });
      setEditingIndex(lastIndex);
    }
  };

  const handleDone = async () => {
    setSubmitting(true);
    try {
      // Collect all forms to submit
      const formsToSubmit = [...savedForms];
      
      // Add current form if it has content
      if (currentForm.title && currentForm.image_url) {
        formsToSubmit.push({ ...currentForm });
      }

      if (formsToSubmit.length === 0) {
        toast.error('No items to add');
        setSubmitting(false);
        return;
      }

      // Submit all forms
      for (const form of formsToSubmit) {
        const submitData = {
          ...form,
          price_per_carat: form.price_per_carat ? parseFloat(form.price_per_carat) : null,
          price: form.price ? parseFloat(form.price) : null,
        };
        await axios.post(`${API_URL}/admin/products`, submitData, getAuthHeaders());
      }

      toast.success(`${formsToSubmit.length} product(s) added successfully!`);
      onComplete();
      onClose();
    } catch (error) {
      toast.error('Failed to add products');
    } finally {
      setSubmitting(false);
    }
  };

  const addImageUrl = () => {
    const url = prompt('Enter image URL:');
    if (url) {
      setCurrentForm(prev => ({ ...prev, images: [...prev.images, url] }));
    }
  };

  const addVideoUrl = () => {
    const url = prompt('Enter video URL:');
    if (url) {
      setCurrentForm(prev => ({ ...prev, videos: [...prev.videos, url] }));
    }
  };

  const removeMedia = (type, index) => {
    setCurrentForm(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex">
      {/* Saved Items Panel */}
      <div className="w-80 bg-[#0A0A0A] border-r border-white/10 flex flex-col">
        <div className="p-4 border-b border-white/10">
          <h3 className="font-semibold">Saved Items ({savedForms.length}/{MAX_ENTRIES})</h3>
          <p className="text-xs text-gray-500 mt-1">Click "Next" to save & add more</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {savedForms.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-4">No items saved yet</p>
          ) : (
            savedForms.map((form, i) => (
              <div
                key={i}
                className={`p-3 border transition-colors ${editingIndex === i ? 'border-white bg-white/10' : 'border-white/10 hover:border-white/30'}`}
              >
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-400" />
                  <span className="text-sm truncate flex-1">{form.title}</span>
                  <span className="text-xs text-gray-500">#{i + 1}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{form.category}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Form Panel */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl">Bulk Add Products</h2>
            <p className="text-sm text-gray-500">
              {editingIndex !== null ? `Editing item #${editingIndex + 1}` : `Adding item #${savedForms.length + 1}`}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Title *</label>
                <input
                  type="text"
                  value={currentForm.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  className="input-dark h-10 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Category</label>
                <select
                  value={currentForm.category}
                  onChange={(e) => handleChange('category', e.target.value)}
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
                  value={currentForm.gemstone_type}
                  onChange={(e) => handleChange('gemstone_type', e.target.value)}
                  className="input-dark h-10 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Color</label>
                <input
                  type="text"
                  value={currentForm.color}
                  onChange={(e) => handleChange('color', e.target.value)}
                  className="input-dark h-10 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Carat</label>
                <input
                  type="text"
                  value={currentForm.carat}
                  onChange={(e) => handleChange('carat', e.target.value)}
                  className="input-dark h-10 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Dimensions</label>
                <input
                  type="text"
                  value={currentForm.dimensions}
                  onChange={(e) => handleChange('dimensions', e.target.value)}
                  className="input-dark h-10 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Price Per Carat</label>
                <input
                  type="number"
                  value={currentForm.price_per_carat}
                  onChange={(e) => handleChange('price_per_carat', e.target.value)}
                  className="input-dark h-10 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Total Price</label>
                <input
                  type="number"
                  value={currentForm.price}
                  onChange={(e) => handleChange('price', e.target.value)}
                  className="input-dark h-10 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Description</label>
              <textarea
                value={currentForm.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className="input-dark h-20 text-sm resize-none"
              />
            </div>

            {/* Main Image */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Main Image URL *</label>
              <input
                type="url"
                value={currentForm.image_url}
                onChange={(e) => handleChange('image_url', e.target.value)}
                className="input-dark h-10 text-sm"
                placeholder="https://..."
              />
            </div>

            {/* Additional Images */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs uppercase tracking-widest text-gray-500">Additional Images</label>
                <button type="button" onClick={addImageUrl} className="text-xs text-blue-400 hover:text-blue-300">
                  + Add URL
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {currentForm.images.map((img, i) => (
                  <div key={i} className="relative group">
                    <img src={img} alt="" className="w-12 h-12 object-cover" />
                    <button
                      onClick={() => removeMedia('images', i)}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-2 h-2" />
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
                  + Add URL
                </button>
              </div>
              <div className="space-y-1">
                {currentForm.videos.map((video, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white/5 p-2 text-xs">
                    <Video className="w-3 h-3 text-gray-500" />
                    <span className="truncate flex-1 text-gray-400">{video}</span>
                    <button onClick={() => removeMedia('videos', i)} className="text-red-400">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* GIA */}
            <div className="border border-white/10 p-4 space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={currentForm.gia_certified}
                  onChange={(e) => handleChange('gia_certified', e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">GIA Certified</span>
              </label>
              {currentForm.gia_certified && (
                <div className="grid grid-cols-2 gap-3 pl-7">
                  <input
                    type="text"
                    value={currentForm.gia_report_number}
                    onChange={(e) => handleChange('gia_report_number', e.target.value)}
                    className="input-dark h-9 text-sm"
                    placeholder="Report Number"
                  />
                  <input
                    type="url"
                    value={currentForm.gia_report_image}
                    onChange={(e) => handleChange('gia_report_image', e.target.value)}
                    className="input-dark h-9 text-sm"
                    placeholder="Report Image URL"
                  />
                </div>
              )}
            </div>

            {/* Name Your Price */}
            <div className="border border-white/10 p-4 space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={currentForm.name_your_price}
                  onChange={(e) => handleChange('name_your_price', e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">Enable "Name Your Price"</span>
              </label>
              {currentForm.name_your_price && (
                <input
                  type="tel"
                  value={currentForm.name_your_price_phone}
                  onChange={(e) => handleChange('name_your_price_phone', e.target.value)}
                  className="input-dark h-9 text-sm ml-7"
                  placeholder="Phone for SMS notifications"
                />
              )}
            </div>

            {/* In Stock */}
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={currentForm.in_stock}
                onChange={(e) => handleChange('in_stock', e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">In Stock</span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={savedForms.length === 0}
            className="btn-secondary flex items-center gap-2 disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex gap-3">
            <button
              onClick={handleDone}
              disabled={submitting || (savedForms.length === 0 && !currentForm.title)}
              className="btn-primary px-8"
            >
              {submitting ? 'Adding...' : `Done (${savedForms.length + (currentForm.title ? 1 : 0)} items)`}
            </button>
            {savedForms.length < MAX_ENTRIES - 1 && (
              <button
                onClick={handleNext}
                className="btn-secondary flex items-center gap-2"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminProducts = () => {
  const { getAuthHeaders } = useAdmin();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({ ...emptyForm });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/products`, getAuthHeaders());
      setProducts(response.data);
    } catch (error) {
      toast.error('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ ...emptyForm });
    setEditingProduct(null);
  };

  const openModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        ...product,
        price_per_carat: product.price_per_carat || '',
        price: product.price || '',
        images: product.images || [],
        videos: product.videos || [],
        gia_report_number: product.gia_report_number || '',
        gia_report_image: product.gia_report_image || '',
        name_your_price_phone: product.name_your_price_phone || ''
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        price_per_carat: formData.price_per_carat ? parseFloat(formData.price_per_carat) : null,
        price: formData.price ? parseFloat(formData.price) : null,
      };

      if (editingProduct) {
        await axios.patch(`${API_URL}/admin/products/${editingProduct.id}`, submitData, getAuthHeaders());
        toast.success('Product updated');
      } else {
        await axios.post(`${API_URL}/admin/products`, submitData, getAuthHeaders());
        toast.success('Product created');
      }
      
      setShowModal(false);
      resetForm();
      // Revalidate: refetch products after mutation
      await fetchProducts();
    } catch (error) {
      toast.error('Failed to save product');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await axios.delete(`${API_URL}/admin/products/${id}`, getAuthHeaders());
      toast.success('Product deleted');
      // Revalidate: refetch products after deletion
      await fetchProducts();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Failed to delete product';
      toast.error(errorMsg);
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
        <h1 className="font-serif text-3xl">Products</h1>
        <div className="flex gap-3">
          <button onClick={() => setShowBulkModal(true)} className="btn-secondary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Bulk Add
          </button>
          <button onClick={() => openModal()} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      {/* Products List */}
      <div className="space-y-4">
        {products.length === 0 ? (
          <div className="gem-card p-8 text-center">
            <p className="text-gray-500">No products yet. Add your first product!</p>
          </div>
        ) : (
          products.map(product => (
            <div key={product.id} className="gem-card p-4 flex gap-4 items-center">
              <img src={product.image_url} alt={product.title} className="w-20 h-20 object-cover" />
              <div className="flex-1 min-w-0">
                <h3 className="font-serif text-lg truncate">{product.title}</h3>
                <p className="text-sm text-gray-500">{product.category} • {product.carat || 'N/A'}</p>
                <p className="text-sm font-mono">${product.price?.toLocaleString() || 'No price'}</p>
                <div className="flex gap-2 mt-1">
                  {product.gia_certified && <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5">GIA</span>}
                  {product.name_your_price && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5">Name Your Price</span>}
                  {!product.in_stock && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5">Out of Stock</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openModal(product)} className="p-2 hover:bg-white/10 rounded">
                  <Edit className="w-4 h-4 text-gray-400" />
                </button>
                <button onClick={() => handleDelete(product.id)} className="p-2 hover:bg-white/10 rounded">
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Single Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0A0A0A] border border-white/10 w-full max-w-2xl my-8 relative">
            <div className="sticky top-0 bg-[#0A0A0A] border-b border-white/10 p-4 flex items-center justify-between">
              <h2 className="font-serif text-xl">{editingProduct ? 'Edit Product' : 'Add Product'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Form fields same as before */}
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
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Price Per Carat</label>
                  <input
                    type="number"
                    value={formData.price_per_carat}
                    onChange={(e) => setFormData(prev => ({ ...prev, price_per_carat: e.target.value }))}
                    className="input-dark h-10 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Total Price</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
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
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs uppercase tracking-widest text-gray-500">Additional Images</label>
                  <button type="button" onClick={addImageUrl} className="text-xs text-blue-400">+ Add</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.images.map((img, i) => (
                    <div key={i} className="relative group">
                      <img src={img} alt="" className="w-16 h-16 object-cover" />
                      <button type="button" onClick={() => removeMedia('images', i)} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs uppercase tracking-widest text-gray-500">Videos</label>
                  <button type="button" onClick={addVideoUrl} className="text-xs text-blue-400">+ Add</button>
                </div>
                <div className="space-y-2">
                  {formData.videos.map((video, i) => (
                    <div key={i} className="flex items-center gap-2 bg-white/5 p-2">
                      <Video className="w-4 h-4 text-gray-500" />
                      <span className="text-xs text-gray-400 truncate flex-1">{video}</span>
                      <button type="button" onClick={() => removeMedia('videos', i)} className="text-red-400">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-white/10 p-4 space-y-4">
                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={formData.gia_certified} onChange={(e) => setFormData(prev => ({ ...prev, gia_certified: e.target.checked }))} className="w-4 h-4" />
                  <span className="text-sm">GIA Certified</span>
                </label>
                {formData.gia_certified && (
                  <div className="grid grid-cols-2 gap-4 pl-7">
                    <input type="text" value={formData.gia_report_number} onChange={(e) => setFormData(prev => ({ ...prev, gia_report_number: e.target.value }))} className="input-dark h-10 text-sm" placeholder="Report Number" />
                    <input type="url" value={formData.gia_report_image} onChange={(e) => setFormData(prev => ({ ...prev, gia_report_image: e.target.value }))} className="input-dark h-10 text-sm" placeholder="Report Image URL" />
                  </div>
                )}
              </div>

              <div className="border border-white/10 p-4 space-y-4">
                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={formData.name_your_price} onChange={(e) => setFormData(prev => ({ ...prev, name_your_price: e.target.checked }))} className="w-4 h-4" />
                  <span className="text-sm">Enable "Name Your Price"</span>
                </label>
                {formData.name_your_price && (
                  <input type="tel" value={formData.name_your_price_phone} onChange={(e) => setFormData(prev => ({ ...prev, name_your_price_phone: e.target.value }))} className="input-dark h-10 text-sm ml-7" placeholder="Phone for SMS" />
                )}
              </div>

              <label className="flex items-center gap-3">
                <input type="checkbox" checked={formData.in_stock} onChange={(e) => setFormData(prev => ({ ...prev, in_stock: e.target.checked }))} className="w-4 h-4" />
                <span className="text-sm">In Stock</span>
              </label>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">{editingProduct ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Add Modal */}
      {showBulkModal && (
        <BulkAddModal
          onClose={() => setShowBulkModal(false)}
          onComplete={fetchProducts}
          getAuthHeaders={getAuthHeaders}
        />
      )}
    </div>
  );
};

export default AdminProducts;
