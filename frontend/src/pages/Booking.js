import React, { useState } from 'react';
import { Phone, MessageSquare, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const SERVICES = [
  { value: 'cut', label: 'Cut' },
  { value: 're-cut', label: 'Re-Cut' },
  { value: 're-polish', label: 'Re-Polish' },
  { value: 'cut-design', label: 'Cut Design' },
  { value: 'consultation', label: 'Consultation' },
];

const STONE_TYPES = [
  { value: 'sapphire', label: 'Sapphire' },
  { value: 'tourmaline', label: 'Tourmaline' },
  { value: 'emerald', label: 'Emerald' },
  { value: 'tanzanite', label: 'Tanzanite' },
  { value: 'aquamarine', label: 'Aquamarine' },
  { value: 'garnet', label: 'Garnet' },
  { value: 'other', label: 'Other' },
];

const Booking = () => {
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    service: '',
    stone_type: '',
    description: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.service) {
      toast.error('Please select a service');
      return;
    }
    if (!formData.stone_type) {
      toast.error('Please select a stone type');
      return;
    }

    try {
      setLoading(true);
      const submitData = {
        ...formData,
        name: isAuthenticated && user ? user.name : formData.name,
        email: isAuthenticated && user ? user.email : formData.email,
      };
      
      await axios.post(`${API_URL}/bookings`, submitData);
      setSubmitted(true);
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to submit booking';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="booking-success">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="font-serif text-4xl mb-4">Thank You!</h1>
          <p className="text-gray-400 mb-8">
            Your booking request has been received. I'll get back to you as soon as possible.
          </p>
          
          <div className="gem-card p-6 text-center">
            <p className="text-sm uppercase tracking-widest text-gray-500 mb-4">
              Want to talk now?
            </p>
            <a 
              href="tel:4802854595"
              className="font-mono text-2xl hover:text-gray-300 transition-colors block mb-2"
              data-testid="contact-phone"
            >
              480-286-4595
            </a>
            <div className="flex items-center justify-center gap-4 text-gray-500 text-sm mt-4">
              <span className="flex items-center gap-2">
                <Phone className="w-4 h-4" /> Calls
              </span>
              <span className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> Texts
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" data-testid="booking-page">
      {/* Header */}
      <section className="section-spacing pb-16">
        <div className="container-custom">
          <p className="text-sm uppercase tracking-[0.2em] text-gray-500 mb-4">Get Started</p>
          <h1 className="section-title">Book a Service</h1>
        </div>
      </section>

      {/* Form Section */}
      <section className="pb-24">
        <div className="container-custom">
          <div className="max-w-2xl mx-auto">
            <div className="gem-card p-8 md:p-12">
              <form onSubmit={handleSubmit} className="space-y-6" data-testid="booking-form">
                {/* Name & Email (only if not logged in) */}
                {!isAuthenticated && (
                  <>
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
                        data-testid="booking-name-input"
                      />
                    </div>
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
                        data-testid="booking-email-input"
                      />
                    </div>
                  </>
                )}

                {/* Phone */}
                <div>
                  <label className="block text-sm uppercase tracking-widest text-gray-400 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="input-dark"
                    placeholder="Your phone number"
                    data-testid="booking-phone-input"
                  />
                </div>

                {/* Service Dropdown */}
                <div>
                  <label className="block text-sm uppercase tracking-widest text-gray-400 mb-2">
                    Service *
                  </label>
                  <Select value={formData.service} onValueChange={(value) => handleSelectChange('service', value)}>
                    <SelectTrigger className="input-dark" data-testid="booking-service-select">
                      <SelectValue placeholder="Select a service" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0A0A0A] border-white/10">
                      {SERVICES.map(service => (
                        <SelectItem 
                          key={service.value} 
                          value={service.value}
                          className="text-white hover:bg-white/10"
                          data-testid={`service-option-${service.value}`}
                        >
                          {service.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Stone Type Dropdown */}
                <div>
                  <label className="block text-sm uppercase tracking-widest text-gray-400 mb-2">
                    Colored Stone Type *
                  </label>
                  <Select value={formData.stone_type} onValueChange={(value) => handleSelectChange('stone_type', value)}>
                    <SelectTrigger className="input-dark" data-testid="booking-stone-select">
                      <SelectValue placeholder="Select stone type" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0A0A0A] border-white/10">
                      {STONE_TYPES.map(stone => (
                        <SelectItem 
                          key={stone.value} 
                          value={stone.value}
                          className="text-white hover:bg-white/10"
                          data-testid={`stone-option-${stone.value}`}
                        >
                          {stone.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm uppercase tracking-widest text-gray-400 mb-2">
                    Tell Me About Your Project
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={5}
                    className="textarea-dark"
                    placeholder="Describe what you're looking for..."
                    data-testid="booking-description-input"
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full disabled:opacity-50"
                  data-testid="booking-submit-btn"
                >
                  {loading ? 'Submitting...' : 'Submit Request'}
                </button>
              </form>
            </div>

            {/* Contact Alternative */}
            <div className="mt-12 text-center">
              <p className="text-gray-500 text-sm mb-4">Prefer to call or text?</p>
              <a 
                href="tel:4802854595"
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

export default Booking;
