import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Lock, Unlock, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const CATEGORIES = [
  { id: 'all', name: 'All Gemstones' },
  { id: 'sapphire', name: 'Sapphire' },
  { id: 'tourmaline', name: 'Tourmaline' },
  { id: 'emerald', name: 'Emerald' },
  { id: 'tanzanite', name: 'Tanzanite' },
  { id: 'aquamarine', name: 'Aquamarine' },
  { id: 'garnet', name: 'Garnet' },
  { id: 'other', name: 'Other' },
];

const ERAS = [
  { id: 'all', name: 'All Eras' },
  { id: 'PAST', name: 'Past' },
  { id: 'PRESENT', name: 'Present' },
  { id: 'FUTURE', name: 'Future' },
];

// Humble Beginnings Gated Section Component
const HumbleBeginningsSection = ({ items, entitlements, isAuthenticated, onItemClick }) => {
  const { unlocked_nyp, total_spend, threshold, spend_to_unlock } = entitlements;
  const humbleItems = items.filter(item => item.humble_beginnings);
  
  if (humbleItems.length === 0) {
    return null;
  }
  
  const isUnlocked = isAuthenticated && unlocked_nyp;
  const progressPercent = Math.min((total_spend / threshold) * 100, 100);
  
  return (
    <div className="mb-12" data-testid="humble-beginnings-section">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-6">
        {isUnlocked ? (
          <>
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl title-sm text-amber-400">Humble Beginnings</h2>
            <Unlock className="w-4 h-4 text-amber-400" />
          </>
        ) : (
          <>
            <Lock className="w-5 h-5 text-gray-500" />
            <h2 className="text-xl title-sm text-gray-500">Humble Beginnings</h2>
          </>
        )}
      </div>
      
      {/* Unlock Status Message */}
      {isUnlocked ? (
        <p className="text-amber-400/80 text-sm mb-6" data-testid="humble-unlocked-msg">
          You've unlocked Humble Beginnings — a curated look at where it all started.
        </p>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6" data-testid="humble-locked-msg">
          {!isAuthenticated ? (
            <p className="text-gray-500 text-sm">
              Sign in and spend ${threshold.toLocaleString()} to unlock Humble Beginnings.
            </p>
          ) : (
            <>
              <p className="text-gray-500 text-sm mb-3">
                Humble Beginnings unlocks after ${threshold.toLocaleString()} in purchases.
              </p>
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
        </div>
      )}
      
      {/* Items Grid */}
      <div className="gallery-grid">
        {humbleItems.map((item, index) => (
          <div
            key={item.id}
            onClick={() => isUnlocked && onItemClick(index)}
            className={`group relative aspect-square overflow-hidden gem-card ${
              isUnlocked ? 'cursor-pointer' : 'cursor-not-allowed'
            } opacity-0 animate-fade-in`}
            style={{ animationDelay: `${index * 50}ms` }}
            data-testid={`humble-item-${index}`}
          >
            <img
              src={item.image_url}
              alt={item.title}
              className={`w-full h-full object-cover transition-all duration-700 ${
                isUnlocked 
                  ? 'group-hover:scale-110' 
                  : 'blur-md grayscale'
              }`}
            />
            {isUnlocked ? (
              <>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                  <p className="spec-text text-amber-400/80 mb-1">Humble Beginnings</p>
                  <h3 className="title-sm text-base">{item.title}</h3>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Lock className="w-8 h-8 text-gray-500" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const Gallery = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedEra, setSelectedEra] = useState('all');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [expandedMobileItem, setExpandedMobileItem] = useState(null);
  const { isAuthenticated, entitlements } = useAuth();

  useEffect(() => {
    fetchGallery();
  }, [selectedCategory, selectedEra]);

  const fetchGallery = async () => {
    try {
      setLoading(true);
      let url = `${API_URL}/gallery`;
      const params = [];
      if (selectedCategory !== 'all') params.push(`category=${selectedCategory}`);
      if (selectedEra !== 'all') params.push(`era=${selectedEra}`);
      if (params.length > 0) url += `?${params.join('&')}`;
      
      const response = await axios.get(url);
      setItems(response.data);
    } catch (error) {
      console.error('Failed to fetch gallery:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter non-humble items for regular grid
  const regularItems = items.filter(item => !item.humble_beginnings);
  const humbleItems = items.filter(item => item.humble_beginnings);

  // Desktop lightbox functions
  const openLightbox = (index, isHumble = false) => {
    const sourceItems = isHumble ? humbleItems : regularItems;
    const actualIndex = items.findIndex(item => item.id === sourceItems[index]?.id);
    setLightboxIndex(actualIndex >= 0 ? actualIndex : index);
    setLightboxOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    document.body.style.overflow = 'auto';
  };

  const navigateLightbox = (direction) => {
    if (direction === 'prev') {
      setLightboxIndex(prev => (prev === 0 ? items.length - 1 : prev - 1));
    } else {
      setLightboxIndex(prev => (prev === items.length - 1 ? 0 : prev + 1));
    }
  };

  // Mobile item toggle
  const toggleMobileItem = (itemId) => {
    const item = items.find(i => i.id === itemId);
    // Don't allow expanding locked humble beginnings items
    if (item?.humble_beginnings && !(isAuthenticated && entitlements.unlocked_nyp)) {
      return;
    }
    setExpandedMobileItem(prev => prev === itemId ? null : itemId);
  };

  // Keyboard navigation for desktop
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!lightboxOpen) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') navigateLightbox('prev');
      if (e.key === 'ArrowRight') navigateLightbox('next');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, items.length]);

  const currentItem = items[lightboxIndex];

  return (
    <div className="min-h-screen" data-testid="gallery-page">
      {/* Header */}
      <section className="section-spacing pb-16">
        <div className="container-custom">
          <p className="text-sm uppercase tracking-[0.2em] text-gray-500 mb-4">Portfolio</p>
          <h1 className="title-xl">Gallery</h1>
        </div>
      </section>

      {/* Mobile Gallery - 2 column grid, no categories */}
      <section className="pb-24 md:hidden">
        <div className="px-4">
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-square bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-24">
              <p className="text-gray-500">No items in gallery.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  onClick={() => toggleMobileItem(item.id)}
                  className="relative aspect-square overflow-hidden cursor-pointer opacity-0 animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                  data-testid={`mobile-gallery-item-${index}`}
                >
                  {/* Image or Info overlay */}
                  {expandedMobileItem === item.id ? (
                    <div className="absolute inset-0 bg-black flex flex-col items-center justify-center p-4 text-center z-10">
                      <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">{item.category}</p>
                      <h3 className="title-sm text-sm mb-2">{item.title}</h3>
                      {item.gemstone_type && (
                        <p className="text-xs text-gray-400 mt-1">Gem Type: {item.gemstone_type}</p>
                      )}
                      {item.color && (
                        <p className="text-xs text-gray-400">Color: {item.color}</p>
                      )}
                      {item.carat && (
                        <p className="text-xs text-gray-400">Weight: {item.carat}</p>
                      )}
                      <p className="text-xs text-gray-600 mt-3 uppercase tracking-wider">Not For Sale</p>
                      <p className="text-[10px] text-gray-600 mt-2">Tap to close</p>
                    </div>
                  ) : (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Desktop Gallery Layout - unchanged */}
      <section className="pb-24 hidden md:block">
        <div className="container-custom">
          <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8">
            {/* Sidebar */}
            <aside className="md:sticky md:top-28 md:h-fit" data-testid="gallery-sidebar">
              {/* Era Filter */}
              <h3 className="text-sm uppercase tracking-widest text-gray-500 mb-4">Era</h3>
              <nav className="space-y-1 mb-8">
                {ERAS.map(era => (
                  <button
                    key={era.id}
                    onClick={() => setSelectedEra(era.id)}
                    className={`category-item block w-full text-left ${selectedEra === era.id ? 'active' : ''}`}
                    data-testid={`era-${era.id}`}
                  >
                    {era.name}
                  </button>
                ))}
              </nav>
              
              {/* Category Filter */}
              <h3 className="text-sm uppercase tracking-widest text-gray-500 mb-4">Category</h3>
              <nav className="space-y-1">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`category-item block w-full text-left ${selectedCategory === cat.id ? 'active' : ''}`}
                    data-testid={`category-${cat.id}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </nav>
            </aside>

            {/* Gallery Grid */}
            <div data-testid="gallery-grid">
              {loading ? (
                <div className="gallery-grid">
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="aspect-square bg-white/5 animate-pulse" />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="text-center py-24">
                  <p className="text-gray-500">No items found in this category.</p>
                </div>
              ) : (
                <>
                  {/* Humble Beginnings Gated Section */}
                  {humbleItems.length > 0 && (
                    <HumbleBeginningsSection
                      items={items}
                      entitlements={entitlements}
                      isAuthenticated={isAuthenticated}
                      onItemClick={(index) => openLightbox(index, true)}
                    />
                  )}
                  
                  {/* Regular Gallery Grid */}
                  {regularItems.length > 0 && (
                    <>
                      {humbleItems.length > 0 && (
                        <h2 className="text-xl title-sm text-white mb-6">Collection</h2>
                      )}
                      <div className="gallery-grid">
                        {regularItems.map((item, index) => (
                          <div
                            key={item.id}
                            onClick={() => openLightbox(index)}
                            className="group relative aspect-square overflow-hidden gem-card cursor-pointer opacity-0 animate-fade-in"
                            style={{ animationDelay: `${index * 50}ms` }}
                            data-testid={`gallery-item-${index}`}
                          >
                            <img
                              src={item.image_url}
                              alt={item.title}
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                              <p className="spec-text text-gray-400 mb-1">{item.era || item.category}</p>
                              <h3 className="title-sm text-base">{item.title}</h3>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Desktop Lightbox */}
      {lightboxOpen && currentItem && (
        <div className="fixed inset-0 z-50 lightbox-overlay hidden md:flex items-center justify-center" data-testid="lightbox">
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors z-10"
            data-testid="lightbox-close"
          >
            <X className="w-8 h-8" />
          </button>

          {/* Navigation */}
          <button
            onClick={() => navigateLightbox('prev')}
            className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            data-testid="lightbox-prev"
          >
            <ChevronLeft className="w-10 h-10" />
          </button>
          <button
            onClick={() => navigateLightbox('next')}
            className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            data-testid="lightbox-next"
          >
            <ChevronRight className="w-10 h-10" />
          </button>

          {/* Content */}
          <div className="max-w-5xl w-full mx-6 flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-1 max-h-[70vh]">
              <img
                src={currentItem.image_url}
                alt={currentItem.title}
                className="max-w-full max-h-[70vh] object-contain mx-auto"
              />
            </div>
            <div className="w-full md:w-72 text-center md:text-left">
              <p className="spec-text text-gray-500 mb-2">{currentItem.category}</p>
              <h2 className="font-serif text-2xl mb-4">{currentItem.title}</h2>
              {currentItem.description && (
                <p className="text-gray-400 text-sm mb-4">{currentItem.description}</p>
              )}
              <div className="space-y-2">
                {currentItem.carat && (
                  <div className="flex justify-between md:justify-start md:gap-4 text-sm">
                    <span className="text-gray-500">Carat</span>
                    <span className="font-mono">{currentItem.carat}</span>
                  </div>
                )}
                {currentItem.dimensions && (
                  <div className="flex justify-between md:justify-start md:gap-4 text-sm">
                    <span className="text-gray-500">Dimensions</span>
                    <span className="font-mono">{currentItem.dimensions}</span>
                  </div>
                )}
              </div>
              <p className="text-gray-600 text-xs mt-6">
                {lightboxIndex + 1} / {items.length}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gallery;
