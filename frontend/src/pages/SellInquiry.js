import React, { useState } from 'react';
import { Upload, CheckCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const SellInquiry = () => {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    description: '',
    asking_price: '',
    negotiable: false
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      // Can only check negotiable if there's a price
      if (checked && !formData.asking_price.trim()) {
        toast.error('Please enter a price first');
        return;
      }
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
      // Uncheck negotiable if price is cleared
      if (name === 'asking_price' && !value.trim()) {
        setFormData(prev => ({ ...prev, negotiable: false }));
      }
    }
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    if (photos.length + files.length > 5) {
      toast.error('Maximum 5 photos allowed');
      return;
    }
    
    const newPhotos = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name
    }));
    
    setPhotos(prev => [...prev, ...newPhotos]);
  };

  const removePhoto = (index) => {
    setPhotos(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.asking_price.trim()) {
      toast.error('Please enter an asking price');
      return;
    }

    try {
      setLoading(true);
      
      // Create form data for submission
      const submitData = {
        ...formData,
        photo_count: photos.length,
        photo_names: photos.map(p => p.name)
      };
      
      await axios.post(`${API_URL}/sell-inquiry`, submitData);
      setSubmitted(true);
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to submit inquiry';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="sell-inquiry-success">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="title-xl text-4xl mb-4">Thank You!</h1>
          <p className="text-gray-400 mb-8">
            Your sell inquiry has been received. I'll review your submission and get back to you soon.
          </p>
          
          <div className="gem-card p-6 text-center">
            <p className="text-sm uppercase tracking-widest text-gray-500 mb-4">
              Questions? Reach out directly
            </p>
            <a 
              href="tel:4802864595"
              className="font-mono text-2xl hover:text-gray-300 transition-colors block mb-2"
              data-testid="contact-phone"
            >
              480-286-4595
            </a>
            <p className="text-xs text-gray-600">Calls & Texts Welcome</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" data-testid="sell-inquiry-page">
      {/* Header */}
      <section className="section-spacing pb-16">
        <div className="container-custom">
          <p className="text-sm uppercase tracking-[0.2em] text-gray-500 mb-4">Sell Your Gems</p>
          <h1 className="title-xl">Sell Inquiry</h1>
        </div>
      </section>

      {/* Form Section */}
      <section className="pb-24">
        <div className="container-custom">
          <div className="max-w-2xl mx-auto">
            <div className="gem-card p-8 md:p-12">
              <form onSubmit={handleSubmit} className="space-y-6" data-testid="sell-inquiry-form">
                {/* Name */}
                <div>
                  <label className="block text-sm uppercase tracking-widest text-gray-400 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="input-dark"
                    placeholder="Your name"
                    data-testid="sell-name-input"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm uppercase tracking-widest text-gray-400 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="input-dark"
                    placeholder="your@email.com"
                    data-testid="sell-email-input"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm uppercase tracking-widest text-gray-400 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="input-dark"
                    placeholder="Your phone number"
                    data-testid="sell-phone-input"
                  />
                </div>

                {/* Photo Upload */}
                <div>
                  <label className="block text-sm uppercase tracking-widest text-gray-400 mb-2">
                    Photos (up to 5)
                  </label>
                  <div className="border border-dashed border-white/20 p-6 text-center hover:border-white/40 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      className="hidden"
                      id="photo-upload"
                      data-testid="sell-photo-input"
                    />
                    <label htmlFor="photo-upload" className="cursor-pointer">
                      <Upload className="w-8 h-8 mx-auto mb-3 text-gray-500" />
                      <p className="text-gray-400 text-sm">Click to upload photos</p>
                      <p className="text-gray-600 text-xs mt-1">JPG, PNG up to 10MB each</p>
                    </label>
                  </div>
                  
                  {/* Photo Previews */}
                  {photos.length > 0 && (
                    <div className="grid grid-cols-5 gap-2 mt-4">
                      {photos.map((photo, index) => (
                        <div key={index} className="relative aspect-square">
                          <img
                            src={photo.preview}
                            alt={`Upload ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto(index)}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                            data-testid={`remove-photo-${index}`}
                          >
                            <X className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm uppercase tracking-widest text-gray-400 mb-2">
                    Describe Your Gemstone(s) *
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    required
                    rows={5}
                    className="textarea-dark"
                    placeholder="Type, size, origin, any certifications, condition..."
                    data-testid="sell-description-input"
                  />
                </div>

                {/* Asking Price */}
                <div>
                  <label className="block text-sm uppercase tracking-widest text-gray-400 mb-2">
                    Asking Price (USD) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      name="asking_price"
                      value={formData.asking_price}
                      onChange={handleChange}
                      required
                      min="1"
                      className={`input-dark pl-8 ${formData.negotiable ? 'opacity-50' : ''}`}
                      placeholder="0.00"
                      data-testid="sell-price-input"
                    />
                  </div>
                </div>

                {/* Negotiable Checkbox */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="negotiable"
                    id="negotiable"
                    checked={formData.negotiable}
                    onChange={handleChange}
                    disabled={!formData.asking_price.trim()}
                    className="w-5 h-5 bg-black/50 border border-white/20 rounded-none checked:bg-white checked:border-white focus:ring-0 focus:ring-offset-0 disabled:opacity-30 disabled:cursor-not-allowed"
                    data-testid="sell-negotiable-checkbox"
                  />
                  <label 
                    htmlFor="negotiable" 
                    className={`text-sm uppercase tracking-widest ${!formData.asking_price.trim() ? 'text-gray-600' : 'text-gray-400'}`}
                  >
                    Price is Negotiable
                  </label>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading || !formData.asking_price.trim()}
                  className="btn-primary w-full disabled:opacity-50"
                  data-testid="sell-submit-btn"
                >
                  {loading ? 'Submitting...' : 'Submit Inquiry'}
                </button>
              </form>
            </div>

            {/* Contact Alternative */}
            <div className="mt-12 text-center">
              <p className="text-gray-500 text-sm mb-4">Prefer to discuss in person?</p>
              <a 
                href="tel:4802864595"
                className="font-mono text-xl hover:text-gray-300 transition-colors"
              >
                480-286-4595
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SellInquiry;
