import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X, Clock, Wrench, Camera } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// Before/After Slider Component
const BeforeAfterSlider = ({ before, after, labels }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef(null);
  const isDragging = useRef(false);

  const handleMove = (clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleMouseDown = () => { isDragging.current = true; };
  const handleMouseUp = () => { isDragging.current = false; };
  const handleMouseMove = (e) => { if (isDragging.current) handleMove(e.clientX); };
  const handleTouchMove = (e) => { handleMove(e.touches[0].clientX); };

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative w-full aspect-[4/3] max-w-5xl mx-auto overflow-hidden cursor-ew-resize select-none"
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleMouseUp}
      data-testid="before-after-slider"
    >
      {/* After Image (Full) */}
      <img
        src={after.image_url}
        alt={after.alt}
        className="absolute inset-0 w-full h-full object-cover"
      />
      
      {/* Before Image (Clipped) */}
      <div 
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${sliderPosition}%` }}
      >
        <img
          src={before.image_url}
          alt={before.alt}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ width: `${100 / (sliderPosition / 100)}%`, maxWidth: 'none' }}
        />
      </div>
      
      {/* Slider Handle */}
      <div 
        className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-10"
        style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg">
          <ChevronLeft className="w-4 h-4 text-gray-800 -mr-1" />
          <ChevronRight className="w-4 h-4 text-gray-800 -ml-1" />
        </div>
      </div>
      
      {/* Labels */}
      <div className="absolute top-4 left-4 px-3 py-1 bg-black/70 text-white text-sm uppercase tracking-widest">
        {labels.before_label}
      </div>
      <div className="absolute top-4 right-4 px-3 py-1 bg-black/70 text-white text-sm uppercase tracking-widest">
        {labels.after_label}
      </div>
    </div>
  );
};

// Timeline Item Component
const TimelineItem = ({ item, isLast }) => (
  <div className="relative pl-8 pb-12" data-testid={`timeline-${item.id}`}>
    {/* Timeline line */}
    {!isLast && (
      <div className="absolute left-[11px] top-6 bottom-0 w-px bg-white/20" />
    )}
    
    {/* Timeline dot */}
    <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center">
      <div className="w-2 h-2 rounded-full bg-amber-500" />
    </div>
    
    {/* Content */}
    <div className="space-y-3">
      <span className="text-amber-400 text-sm font-semibold">{item.year}</span>
      <h3 className="text-xl title-sm text-white">{item.heading}</h3>
      <p className="text-gray-400 leading-relaxed">{item.body}</p>
      {item.image_url && (
        <img 
          src={item.image_url} 
          alt={item.image_alt || item.heading}
          className="mt-4 w-full max-w-md rounded-lg"
        />
      )}
    </div>
  </div>
);

// Equipment Card Component
const EquipmentCard = ({ item }) => (
  <div 
    className="bg-white/5 border border-white/10 p-8 rounded-lg hover:border-amber-500/30 transition-colors"
    data-testid={`equipment-${item.id}`}
  >
    {item.image_url && (
      <img 
        src={item.image_url} 
        alt={item.image_alt || item.name}
        className="w-full h-56 object-cover rounded mb-5"
      />
    )}
    <h4 className="title-sm text-xl text-white mb-3">{item.name}</h4>
    <p className="text-gray-400 text-base">{item.purpose}</p>
  </div>
);

// Action Photos Gallery
const ActionPhotosGallery = ({ photos }) => {
  const [lightboxIndex, setLightboxIndex] = useState(null);
  
  if (!photos || photos.length === 0) return null;
  
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            onClick={() => setLightboxIndex(index)}
            className="aspect-square overflow-hidden cursor-pointer group"
            data-testid={`action-photo-${index}`}
          >
            <img
              src={photo.image_url}
              alt={photo.alt}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          </div>
        ))}
      </div>
      
      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
        >
          <button 
            className="absolute top-4 right-4 text-white/70 hover:text-white"
            onClick={() => setLightboxIndex(null)}
          >
            <X className="w-8 h-8" />
          </button>
          <button 
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
            onClick={(e) => { e.stopPropagation(); setLightboxIndex(prev => prev === 0 ? photos.length - 1 : prev - 1); }}
          >
            <ChevronLeft className="w-10 h-10" />
          </button>
          <img
            src={photos[lightboxIndex].image_url}
            alt={photos[lightboxIndex].alt}
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={e => e.stopPropagation()}
          />
          <button 
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
            onClick={(e) => { e.stopPropagation(); setLightboxIndex(prev => prev === photos.length - 1 ? 0 : prev + 1); }}
          >
            <ChevronRight className="w-10 h-10" />
          </button>
        </div>
      )}
    </>
  );
};

const Studio = () => {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/content/studio`);
      setContent(response.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('unavailable');
      } else {
        setError('error');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (error === 'unavailable') {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center" data-testid="studio-unavailable">
          <h1 className="text-2xl title-xl text-white mb-4">Studio</h1>
          <p className="text-gray-500">This page is currently unavailable.</p>
          <Link to="/" className="mt-6 inline-block text-amber-400 hover:text-amber-300">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Failed to load content. Please try again.</p>
        </div>
      </div>
    );
  }

  const sortedTimeline = [...(content.story_timeline || [])].sort((a, b) => a.order - b.order);
  const sortedEquipment = [...(content.equipment || [])].sort((a, b) => a.order - b.order);
  const sortedPhotos = [...(content.action_photos || [])].sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen bg-[#0A0A0A]" data-testid="studio-page">
      {/* Hero Section */}
      <section className="pt-32 pb-16 text-center">
        <div className="container-custom">
          <p className="spec-text text-gray-500 mb-4">BEHIND THE SCENES</p>
          <h1 className="page-title title-xl text-4xl md:text-5xl lg:text-6xl mb-6">
            {content.hero.title}
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            {content.hero.subtitle}
          </p>
        </div>
      </section>

      {/* Before/After Section */}
      {content.before_after && (
        <section className="py-16">
          <div className="container-custom">
            <div className="text-center mb-12">
              <h2 className="text-2xl title-xl text-white mb-4">The Transformation</h2>
              <p className="text-gray-500">Drag to reveal the before and after</p>
            </div>
            <BeforeAfterSlider 
              before={content.before_after.before}
              after={content.before_after.after}
              labels={content.before_after.labels}
            />
          </div>
        </section>
      )}

      {/* Story Timeline */}
      {sortedTimeline.length > 0 && (
        <section className="py-16 bg-white/[0.02]">
          <div className="container-custom">
            <div className="flex items-center gap-3 mb-12">
              <Clock className="w-5 h-5 text-amber-400" />
              <h2 className="text-2xl title-xl text-white">The Journey</h2>
            </div>
            <div className="max-w-2xl">
              {sortedTimeline.map((item, index) => (
                <TimelineItem 
                  key={item.id} 
                  item={item} 
                  isLast={index === sortedTimeline.length - 1}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Equipment Section */}
      {sortedEquipment.length > 0 && (
        <section className="py-16">
          <div className="container-custom">
            <div className="flex items-center gap-3 mb-12">
              <Wrench className="w-5 h-5 text-amber-400" />
              <h2 className="text-2xl title-xl text-white">Equipment</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedEquipment.map(item => (
                <EquipmentCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Action Photos */}
      {sortedPhotos.length > 0 && (
        <section className="py-16 bg-white/[0.02]">
          <div className="container-custom">
            <div className="flex items-center gap-3 mb-12">
              <Camera className="w-5 h-5 text-amber-400" />
              <h2 className="text-2xl title-xl text-white">In Action</h2>
            </div>
            <ActionPhotosGallery photos={sortedPhotos} />
          </div>
        </section>
      )}

      {/* CTA Section */}
      {content.cta && (
        <section className="py-24">
          <div className="container-custom text-center">
            <p className="text-xl text-gray-300 mb-8 max-w-xl mx-auto">
              {content.cta.text}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to={content.cta.primary_href} 
                className="btn-primary"
                data-testid="studio-cta-primary"
              >
                {content.cta.primary_label}
              </Link>
              <Link 
                to={content.cta.secondary_href} 
                className="btn-secondary"
                data-testid="studio-cta-secondary"
              >
                {content.cta.secondary_label}
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default Studio;
