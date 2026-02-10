import React, { useEffect, useState } from 'react';
import { ShoppingBag, X, ChevronLeft, ChevronRight, Play, Lock, Unlock, Sparkles } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const CATEGORIES = [
  { id: 'all', name: 'All' },
  { id: 'sapphire', name: 'Sapphire' },
  { id: 'tourmaline', name: 'Tourmaline' },
  { id: 'emerald', name: 'Emerald' },
  { id: 'tanzanite', name: 'Tanzanite' },
  { id: 'aquamarine', name: 'Aquamarine' },
  { id: 'garnet', name: 'Garnet' },
];

// Name Your Price Component - Shows locked/unlocked state
const NameYourPriceSection = ({ product, entitlements, isAuthenticated, onNamePrice }) => {
  const { unlocked_nyp, total_spend, threshold, spend_to_unlock } = entitlements;
  
  // Only show NYP section if product has NYP enabled
  if (!product.nyp_enabled) {
    return null;
  }
  
  const progressPercent = Math.min((total_spend / threshold) * 100, 100);
  
  // UNLOCKED STATE
  if (unlocked_nyp && isAuthenticated) {
    return (
      <div 
        className="p-4 border border-amber-500/30 bg-amber-500/5 rounded-lg space-y-3"
        data-testid="nyp-unlocked-section"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <span className="text-amber-400 font-semibold uppercase tracking-wider text-sm">
            Exclusive Pricing Unlocked
          </span>
          <Unlock className="w-4 h-4 text-amber-400" />
        </div>
        <p className="text-gray-400 text-sm">
          You've unlocked exclusive pricing. Make an offer on this gem.
        </p>
        <button 
          onClick={onNamePrice}
          className="w-full py-3 bg-amber-500/20 border border-amber-500/50 text-amber-400 uppercase tracking-widest text-sm hover:bg-amber-500/30 transition-colors"
          data-testid="nyp-name-price-btn"
        >
          Name Your Price
        </button>
      </div>
    );
  }
  
  // LOCKED STATE (not authenticated or hasn't reached threshold)
  return (
    <div 
      className="p-4 border border-white/10 bg-white/5 rounded-lg space-y-3 opacity-75"
      data-testid="nyp-locked-section"
    >
      <div className="flex items-center gap-2">
        <Lock className="w-5 h-5 text-gray-500" />
        <span className="text-gray-500 font-semibold uppercase tracking-wider text-sm">
          Name Your Price
        </span>
      </div>
      
      {!isAuthenticated ? (
        <p className="text-gray-500 text-sm">
          Sign in and spend ${threshold.toLocaleString()} to unlock exclusive pricing.
        </p>
      ) : (
        <>
          <p className="text-gray-500 text-sm">
            Exclusive pricing unlocks after ${threshold.toLocaleString()} in purchases.
          </p>
          
          {/* Progress indicator */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Your progress</span>
              <span>${total_spend.toLocaleString()} / ${threshold.toLocaleString()}</span>
            </div>
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-gray-600 to-gray-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-xs text-gray-600">
              ${spend_to_unlock.toLocaleString()} more to unlock
            </p>
          </div>
        </>
      )}
      
      <button 
        disabled
        className="w-full py-3 bg-gray-800 text-gray-600 uppercase tracking-widest text-sm cursor-not-allowed"
        data-testid="nyp-locked-btn"
      >
        <span className="flex items-center justify-center gap-2">
          <Lock className="w-4 h-4" />
          Locked
        </span>
      </button>
    </div>
  );
};

// Inquiry Popup Component
const InquiryPopup = ({ product, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    is_offer: false,
    offer_price: ''
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await axios.post(`${API_URL}/product-inquiry`, {
        ...formData,
        product_id: product.id,
        product_title: product.title
      });
      toast.success('Inquiry submitted successfully!');
      onClose();
    } catch (error) {
      toast.error('Failed to submit inquiry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#0A0A0A] border border-white/10 w-full max-w-md p-6 relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">
          <X className="w-5 h-5" />
        </button>
        
        <h3 className="font-serif text-xl mb-4">Inquire About {product.title}</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="input-dark h-10 text-sm"
              data-testid="inquiry-name"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Email *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="input-dark h-10 text-sm"
              data-testid="inquiry-email"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Phone</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="input-dark h-10 text-sm"
              data-testid="inquiry-phone"
            />
          </div>
          
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              name="is_offer"
              id="is_offer"
              checked={formData.is_offer}
              onChange={handleChange}
              className="w-4 h-4 bg-black/50 border border-white/20"
              data-testid="inquiry-offer-checkbox"
            />
            <label htmlFor="is_offer" className="text-sm text-gray-400">This is an offer</label>
          </div>
          
          {formData.is_offer && (
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Offer Price (USD)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  name="offer_price"
                  value={formData.offer_price}
                  onChange={handleChange}
                  className="input-dark h-10 text-sm pl-7"
                  placeholder="0.00"
                  data-testid="inquiry-offer-price"
                />
              </div>
            </div>
          )}
          
          <button type="submit" disabled={loading} className="btn-primary w-full text-sm py-3">
            {loading ? 'Submitting...' : 'Submit Inquiry'}
          </button>
        </form>
      </div>
    </div>
  );
};

// Product Detail Component (Desktop Popup / Mobile Page)
const ProductDetail = ({ product, onClose, isMobile = false }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showInquiry, setShowInquiry] = useState(false);
  const [showNypForm, setShowNypForm] = useState(false);
  const { addToCart } = useCart();
  const { isAuthenticated, entitlements } = useAuth();
  const navigate = useNavigate();

  const images = product.images || [product.image_url];
  const videos = product.videos || [];

  const handleBuy = async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to purchase');
      navigate('/dashboard?tab=auth&redirect=shop');
      return;
    }
    try {
      await addToCart(product);
      toast.success('Added to cart!');
    } catch (error) {
      toast.error('Failed to add to cart');
    }
  };

  const handleNamePrice = () => {
    // Open inquiry form with offer mode enabled
    setShowNypForm(true);
  };

  const nextImage = () => setCurrentImageIndex(prev => (prev + 1) % images.length);
  const prevImage = () => setCurrentImageIndex(prev => (prev - 1 + images.length) % images.length);

  const content = (
    <div className={isMobile ? "min-h-screen bg-[#050505]" : ""}>
      {/* Media Section */}
      <div className="relative aspect-square bg-black">
        <img
          src={images[currentImageIndex]}
          alt={product.title}
          className="w-full h-full object-contain"
        />
        {images.length > 1 && (
          <>
            <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 flex items-center justify-center text-white">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 flex items-center justify-center text-white">
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
        {/* Image indicators */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {images.map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full ${i === currentImageIndex ? 'bg-white' : 'bg-white/30'}`} />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {(images.length > 1 || videos.length > 0) && (
        <div className="flex gap-2 p-4 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setCurrentImageIndex(i)}
              className={`w-16 h-16 flex-shrink-0 border ${i === currentImageIndex ? 'border-white' : 'border-white/10'}`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
          {videos.map((video, i) => (
            <div key={`v-${i}`} className="w-16 h-16 flex-shrink-0 border border-white/10 bg-black flex items-center justify-center">
              <Play className="w-6 h-6 text-white/50" />
            </div>
          ))}
        </div>
      )}

      {/* Info Section */}
      <div className="p-6 space-y-4">
        <h2 className="font-serif text-2xl">{product.title}</h2>
        
        <div className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-white/10 pb-2">
            <span className="text-gray-500 uppercase tracking-widest text-xs">Gemstone Type</span>
            <span className="capitalize">{product.gemstone_type || product.category}</span>
          </div>
          <div className="flex justify-between border-b border-white/10 pb-2">
            <span className="text-gray-500 uppercase tracking-widest text-xs">Color</span>
            <span>{product.color || 'Natural'}</span>
          </div>
          <div className="flex justify-between border-b border-white/10 pb-2">
            <span className="text-gray-500 uppercase tracking-widest text-xs">Carat Weight</span>
            <span className="font-mono">{product.carat || 'N/A'}</span>
          </div>
          <div className="flex justify-between border-b border-white/10 pb-2">
            <span className="text-gray-500 uppercase tracking-widest text-xs">Measurements</span>
            <span className="font-mono">{product.dimensions || 'N/A'}</span>
          </div>
          <div className="flex justify-between border-b border-white/10 pb-2">
            <span className="text-gray-500 uppercase tracking-widest text-xs">Price Per Carat</span>
            <span className="font-mono">{product.price_per_carat ? `$${product.price_per_carat}` : 'N/A'}</span>
          </div>
          <div className="flex justify-between border-b border-white/10 pb-2">
            <span className="text-gray-500 uppercase tracking-widest text-xs">Out The Door Price</span>
            <span className="font-mono text-lg">${product.price?.toLocaleString()}</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-3 pt-4">
          <button disabled className="w-full py-3 bg-gray-800 text-gray-500 uppercase tracking-widest text-sm cursor-not-allowed opacity-50">
            Get Last Refusal
          </button>
          <button onClick={handleBuy} className="btn-primary w-full" data-testid="product-buy-btn">
            Buy Now
          </button>
          {isAuthenticated ? (
            <button onClick={() => setShowInquiry(true)} className="btn-secondary w-full" data-testid="product-inquiry-btn">
              Inquiry
            </button>
          ) : (
            <button disabled className="w-full py-3 bg-gray-800 text-gray-500 uppercase tracking-widest text-sm cursor-not-allowed opacity-50" data-testid="product-inquiry-btn-disabled">
              Sign In to Inquire
            </button>
          )}
        </div>
      </div>

      {showInquiry && <InquiryPopup product={product} onClose={() => setShowInquiry(false)} />}
    </div>
  );

  if (isMobile) {
    return content;
  }

  // Desktop popup wrapper
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#0A0A0A] border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 z-10 text-gray-500 hover:text-white">
          <X className="w-6 h-6" />
        </button>
        {content}
      </div>
    </div>
  );
};

// Mobile Product Page Component
export const MobileProductPage = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await axios.get(`${API_URL}/products/${productId}`);
        setProduct(response.data);
      } catch (error) {
        toast.error('Product not found');
        navigate('/shop');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) return null;

  return (
    <div>
      <div className="p-4">
        <button onClick={() => navigate('/shop')} className="text-gray-500 hover:text-white text-sm flex items-center gap-2">
          <ChevronLeft className="w-4 h-4" /> Back to Shop
        </button>
      </div>
      <ProductDetail product={product} isMobile={true} />
    </div>
  );
};

// Main Shop Component
const Shop = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const url = selectedCategory === 'all'
        ? `${API_URL}/products`
        : `${API_URL}/products?category=${selectedCategory}`;
      const response = await axios.get(url);
      setProducts(response.data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleProductClick = (product) => {
    // Check if mobile
    if (window.innerWidth < 768) {
      navigate(`/shop/${product.id}`);
    } else {
      setSelectedProduct(product);
    }
  };

  return (
    <div className="min-h-screen" data-testid="shop-page">
      {/* Header */}
      <section className="section-spacing pb-16">
        <div className="container-custom">
          <p className="text-sm uppercase tracking-[0.2em] text-gray-500 mb-4">Available</p>
          <h1 className="section-title">Shop</h1>
        </div>
      </section>

      {/* Desktop: Category Filter */}
      <section className="pb-8 hidden md:block">
        <div className="container-custom">
          <div className="flex flex-wrap gap-4" data-testid="shop-categories">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 text-sm uppercase tracking-widest transition-all duration-300 ${
                  selectedCategory === cat.id
                    ? 'bg-white text-black'
                    : 'text-gray-500 hover:text-white border border-white/10 hover:border-white/30'
                }`}
                data-testid={`shop-category-${cat.id}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Products - Single Column */}
      <section className="pb-24">
        <div className="container-custom">
          {loading ? (
            <div className="space-y-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-6 p-4 bg-white/5 animate-pulse">
                  <div className="w-32 h-32 bg-white/10" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 bg-white/10 w-1/2" />
                    <div className="h-3 bg-white/10 w-1/4" />
                    <div className="h-3 bg-white/10 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-24">
              <ShoppingBag className="w-12 h-12 mx-auto text-gray-600 mb-4" />
              <p className="text-gray-500">No products available.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {products.map((product, index) => (
                <div
                  key={product.id}
                  onClick={() => handleProductClick(product)}
                  className="gem-card flex gap-4 md:gap-6 p-4 cursor-pointer hover:border-white/30 transition-all opacity-0 animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                  data-testid={`product-${index}`}
                >
                  {/* Image */}
                  <div className="w-24 h-24 md:w-32 md:h-32 flex-shrink-0 overflow-hidden">
                    <img
                      src={product.image_url}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">{product.category}</p>
                    <h3 className="font-serif text-lg md:text-xl mb-2 truncate">{product.title}</h3>
                    <p className="text-gray-500 text-sm mb-2 line-clamp-2 hidden md:block">{product.description}</p>
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-lg">{formatPrice(product.price)}</span>
                      {product.carat && (
                        <span className="text-xs text-gray-500 font-mono">{product.carat}</span>
                      )}
                    </div>
                  </div>

                  {/* Arrow indicator */}
                  <div className="flex items-center text-gray-500">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Desktop Product Popup */}
      {selectedProduct && (
        <ProductDetail 
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)} 
        />
      )}
    </div>
  );
};

export default Shop;
