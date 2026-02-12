import React, { useState, useEffect } from 'react';
import { X, Gem, Sparkles, ArrowLeft, ArrowRight, ZoomIn, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Journey Card Component with Before/After Slider
const JourneyCard = ({ journey, onClick }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [wasDragging, setWasDragging] = useState(false);
  const [showClickPrompt, setShowClickPrompt] = useState(false);
  const containerRef = React.useRef(null);

  const handleMove = (clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setWasDragging(true);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      // Show the prompt after dragging to let them know there's more
      setTimeout(() => {
        setShowClickPrompt(true);
      }, 100);
    }
  };

  const handleTouchMove = (e) => {
    handleMove(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    // Show the prompt after dragging to let them know there's more
    setTimeout(() => {
      setShowClickPrompt(true);
    }, 100);
  };

  const handleCardClick = (e) => {
    // If we just finished dragging, don't trigger click action
    if (wasDragging) {
      setWasDragging(false);
      return;
    }
    
    // If prompt is showing, open the timeline
    if (showClickPrompt) {
      onClick();
      setShowClickPrompt(false);
      return;
    }
    
    // First click shows the prompt
    setShowClickPrompt(true);
  };

  // Reset prompt when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowClickPrompt(false);
      }
    };
    
    if (showClickPrompt) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showClickPrompt]);

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  return (
    <div 
      className="group"
      data-testid={`journey-card-${journey.id}`}
    >
      {/* Before/After Slider */}
      <div 
        ref={containerRef}
        className="relative aspect-square overflow-hidden mb-4 select-none cursor-pointer"
        onTouchMove={handleTouchMove}
        onClick={handleCardClick}
      >
        {/* After Image (Background) */}
        <img 
          src={journey.finalImage} 
          alt="After"
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Before Image (Clipped) - Static positioning */}
        <div 
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        >
          <img 
            src={journey.coverImage} 
            alt="Before"
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>
        
        {/* Slider Handle */}
        <div 
          className="absolute top-0 bottom-0 w-1 bg-black cursor-ew-resize z-10"
          style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
          onMouseDown={handleMouseDown}
          onTouchStart={(e) => {
            e.stopPropagation();
            setIsDragging(true);
            setWasDragging(true);
          }}
          onTouchEnd={handleTouchEnd}
        >
          {/* Handle Circle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-black rounded-full flex items-center justify-center shadow-lg border border-white/20">
            <div className="flex items-center gap-0.5">
              <ChevronLeft className="w-3 h-3 text-white" />
              <ChevronRight className="w-3 h-3 text-white" />
            </div>
          </div>
        </div>

        {/* Click Prompt Overlay */}
        {showClickPrompt && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20 transition-opacity duration-200">
            <span className="text-sm uppercase tracking-widest text-white">Click to see timeline</span>
          </div>
        )}
      </div>
      
      {/* Card Info */}
      <div className="cursor-pointer" onClick={() => { setShowClickPrompt(true); }}>
        <p className="text-sm text-amber-400 uppercase tracking-widest">{journey.subtitle}</p>
      </div>
    </div>
  );
};

// Image Popup Component
const ImagePopup = ({ image, title, onClose }) => {
  return (
    <div 
      className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4"
      onClick={onClose}
      data-testid="image-popup"
    >
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors z-10"
        data-testid="image-popup-close"
      >
        <X className="w-8 h-8" />
      </button>
      <div className="max-w-5xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
        <img
          src={image}
          alt={title}
          className="w-full h-full max-h-[85vh] object-contain"
        />
        <p className="text-center text-gray-400 mt-4 text-sm">{title}</p>
      </div>
    </div>
  );
};

// Journey Detail Page - Simple Grid Layout with Arrows
const JourneyDetail = ({ journey, onClose }) => {
  const [popupImage, setPopupImage] = useState(null);

  const openImagePopup = (step) => {
    setPopupImage(step);
  };

  const closeImagePopup = () => {
    setPopupImage(null);
  };

  // Limit to 8 photos max
  const displaySteps = journey.steps.slice(0, 8);

  return (
    <div 
      className="fixed inset-0 z-50 bg-black overflow-y-auto"
      data-testid="journey-detail"
    >
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-black/90 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            data-testid="journey-back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm uppercase tracking-widest">Back</span>
          </button>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center hover:bg-white/10 transition-colors"
            data-testid="journey-close-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Journey Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Simple Grid with Arrows - 4 per row */}
        <div className="flex flex-wrap items-center gap-y-3">
          {displaySteps.map((step, index) => (
            <React.Fragment key={index}>
              {/* Photo */}
              <div 
                className="relative w-[20%] aspect-square overflow-hidden cursor-pointer group rounded"
                onClick={() => openImagePopup(step)}
                data-testid={`timeline-image-${index}`}
              >
                <img
                  src={step.image}
                  alt={step.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {/* Inner vignette border */}
                <div className="absolute inset-0 shadow-[inset_0_0_20px_6px_rgba(0,0,0,0.4)] pointer-events-none" />
                {/* Hover overlay with zoom icon */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <ZoomIn className="w-6 h-6 text-white" />
                </div>
              </div>
              
              {/* Arrow (not after last item) */}
              {index < displaySteps.length - 1 && (
                <div className="flex items-center justify-center w-[6.66%]">
                  <ArrowRight className="w-5 h-5 text-amber-400" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Bottom Padding */}
        <div className="h-8" />
      </div>

      {/* Image Popup */}
      {popupImage && (
        <ImagePopup
          image={popupImage.image}
          title={popupImage.title}
          onClose={closeImagePopup}
        />
      )}
    </div>
  );
};

// Main Journey Stories Component
const JourneyStories = () => {
  const [selectedJourney, setSelectedJourney] = useState(null);
  const [journeys, setJourneys] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJourneys = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/journeys`);
        // Transform API data to match component structure
        const transformedJourneys = response.data.map(journey => ({
          id: journey.id,
          gemName: journey.gem_name,
          subtitle: journey.subtitle,
          coverImage: journey.before_image,
          finalImage: journey.after_image,
          color: journey.color,
          steps: journey.timeline_images.map((img, index) => ({
            image: img,
            title: `Step ${index + 1}`,
            description: ''
          }))
        }));
        setJourneys(transformedJourneys);
      } catch (err) {
        console.error('Failed to fetch journeys:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchJourneys();
  }, []);

  const openJourney = (journey) => {
    setSelectedJourney(journey);
    document.body.style.overflow = 'hidden';
  };

  const closeJourney = () => {
    setSelectedJourney(null);
    document.body.style.overflow = 'auto';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-white/20 border-t-amber-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="journey-stories-section">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-8">
        <Gem className="w-5 h-5 text-amber-400" />
        <div>
          <h2 className="text-xl title-sm">The Journey</h2>
          <p className="text-sm text-gray-500">From rough to radiant - see the transformation</p>
        </div>
      </div>

      {/* Journey Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {journeys.map((journey) => (
          <JourneyCard
            key={journey.id}
            journey={journey}
            onClick={() => openJourney(journey)}
          />
        ))}
      </div>

      {/* Empty State */}
      {journeys.length === 0 && (
        <div className="text-center py-16">
          <Sparkles className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500">Journey stories coming soon...</p>
        </div>
      )}

      {/* Journey Detail Page */}
      {selectedJourney && (
        <JourneyDetail
          journey={selectedJourney}
          onClose={closeJourney}
        />
      )}
    </div>
  );
};

export default JourneyStories;
