import React, { useState } from 'react';
import { X, Gem, Sparkles, ArrowLeft, ZoomIn, ChevronLeft, ChevronRight } from 'lucide-react';

// Sample journey data - this would come from API later
const SAMPLE_JOURNEYS = [
  {
    id: 'journey-1',
    gemName: 'Montana Sapphire',
    subtitle: 'From Rough to Radiant',
    coverImage: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600',
    finalImage: 'https://images.unsplash.com/photo-1615655406736-b37c4fabf923?w=600',
    color: '#4a6fa5',
    steps: [
      {
        image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800',
        title: 'The Rough',
        description: 'A beautiful piece of Montana sapphire rough, showing incredible potential with its deep blue color zoning.'
      },
      {
        image: 'https://images.unsplash.com/photo-1551122089-4e3e72477432?w=800',
        title: 'On the Dop',
        description: 'Carefully mounted on the dop stick, ready for the first facets. Orientation is critical to maximize color.'
      },
      {
        image: 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800',
        title: 'Cutting Begins',
        description: 'The first pavilion facets take shape on the cutting wheel. Each angle is precisely calculated.'
      },
      {
        image: 'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=800',
        title: 'Crown Work',
        description: 'Transferring to cut the crown. The table facet reveals the gem\'s true depth of color.'
      },
      {
        image: 'https://images.unsplash.com/photo-1615655406736-b37c4fabf923?w=800',
        title: 'Final Polish',
        description: 'The completed 2.3ct precision-cut sapphire, ready to become someone\'s treasure.'
      }
    ]
  },
  {
    id: 'journey-2',
    gemName: 'Tourmaline Crystal',
    subtitle: 'Watermelon Wonder',
    coverImage: 'https://images.unsplash.com/photo-1610389051254-64849803c8fd?w=600',
    finalImage: 'https://images.unsplash.com/photo-1583937443749-887582ecdf5b?w=600',
    color: '#059669',
    steps: [
      {
        image: 'https://images.unsplash.com/photo-1610389051254-64849803c8fd?w=800',
        title: 'Raw Crystal',
        description: 'A stunning bi-color tourmaline crystal with pink core and green rim - nature\'s watermelon.'
      },
      {
        image: 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800',
        title: 'Planning the Cut',
        description: 'Studying the crystal to determine the best orientation to showcase both colors.'
      },
      {
        image: 'https://images.unsplash.com/photo-1551122089-4e3e72477432?w=800',
        title: 'Precision Work',
        description: 'Each facet must be perfectly aligned to create symmetry while preserving the color zones.'
      },
      {
        image: 'https://images.unsplash.com/photo-1583937443749-887582ecdf5b?w=800',
        title: 'The Reveal',
        description: 'A magnificent 4.1ct watermelon tourmaline, cut to perfection.'
      }
    ]
  },
  {
    id: 'journey-3',
    gemName: 'Spessartite Garnet',
    subtitle: 'Fire & Precision',
    coverImage: 'https://images.unsplash.com/photo-1603561596112-0a132b757442?w=600',
    finalImage: 'https://images.unsplash.com/photo-1599707367072-cd6ada2bc375?w=600',
    color: '#ea580c',
    steps: [
      {
        image: 'https://images.unsplash.com/photo-1603561596112-0a132b757442?w=800',
        title: 'Orange Fire',
        description: 'This spessartite rough shows the intense orange that makes these garnets so sought after.'
      },
      {
        image: 'https://images.unsplash.com/photo-1551122089-4e3e72477432?w=800',
        title: 'Setting Up',
        description: 'Mounted and ready. The challenge is to maximize the fire while minimizing inclusions.'
      },
      {
        image: 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800',
        title: 'Faceting',
        description: 'A modified brilliant cut to enhance the natural dispersion and brilliance.'
      },
      {
        image: 'https://images.unsplash.com/photo-1599707367072-cd6ada2bc375?w=800',
        title: 'Finished Gem',
        description: '1.8ct of pure mandarin orange fire, ready for a custom setting.'
      }
    ]
  }
];

// Journey Card Component with Before/After Slider
const JourneyCard = ({ journey, onClick }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
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
    setHasInteracted(true);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchMove = (e) => {
    setHasInteracted(true);
    handleMove(e.touches[0].clientX);
  };

  const handleCardClick = (e) => {
    // If just finished dragging, don't do anything
    if (hasInteracted) {
      setHasInteracted(false);
      return;
    }
    
    // First click shows the prompt
    if (!showClickPrompt) {
      setShowClickPrompt(true);
      return;
    }
    
    // Second click opens the timeline
    onClick();
    setShowClickPrompt(false);
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
            setHasInteracted(true);
          }}
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

// Journey Detail Page - Scrollable Timeline (NOT a slideshow)
const JourneyDetail = ({ journey, onClose }) => {
  const [popupImage, setPopupImage] = useState(null);

  const openImagePopup = (step) => {
    setPopupImage(step);
  };

  const closeImagePopup = () => {
    setPopupImage(null);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black overflow-y-auto"
      data-testid="journey-detail"
    >
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-black/90 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
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
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Title Section */}
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-2">The Journey</p>
          <h1 className="title-sm text-3xl md:text-4xl mb-2">{journey.gemName}</h1>
          <p className="text-gray-400">{journey.subtitle}</p>
          <div 
            className="w-16 h-0.5 mx-auto mt-6"
            style={{ backgroundColor: journey.color }}
          />
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-white/10 transform md:-translate-x-px" />
          
          {/* Steps */}
          <div className="space-y-12 md:space-y-16">
            {journey.steps.map((step, index) => (
              <div 
                key={index}
                className={`relative flex flex-col md:flex-row gap-6 md:gap-12 ${
                  index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                }`}
              >
                {/* Timeline Number */}
                <div 
                  className="absolute left-4 md:left-1/2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transform -translate-x-1/2 z-10"
                  style={{ backgroundColor: journey.color }}
                >
                  {index + 1}
                </div>
                
                {/* Image - Clickable */}
                <div className={`pl-12 md:pl-0 md:w-1/2 ${index % 2 === 0 ? 'md:pr-12' : 'md:pl-12'}`}>
                  <div 
                    className="relative aspect-[4/3] overflow-hidden cursor-pointer group rounded"
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
                      <ZoomIn className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </div>
                
                {/* Text */}
                <div className={`pl-12 md:pl-0 md:w-1/2 flex flex-col justify-center ${index % 2 === 0 ? 'md:pl-12' : 'md:pr-12 md:text-right'}`}>
                  <h3 className="title-sm text-xl mb-2">{step.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
          
          {/* End Marker */}
          <div className="relative mt-12 md:mt-16 text-center">
            <div 
              className="absolute left-4 md:left-1/2 w-4 h-4 rounded-full transform -translate-x-1/2"
              style={{ backgroundColor: journey.color }}
            />
            <div className="pl-12 md:pl-0">
              <Gem className="w-8 h-8 mx-auto mb-2" style={{ color: journey.color }} />
              <p className="text-xs uppercase tracking-widest text-gray-500">Journey Complete</p>
            </div>
          </div>
        </div>

        {/* Bottom Padding */}
        <div className="h-16" />
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
  const [journeys] = useState(SAMPLE_JOURNEYS);

  const openJourney = (journey) => {
    setSelectedJourney(journey);
    document.body.style.overflow = 'hidden';
  };

  const closeJourney = () => {
    setSelectedJourney(null);
    document.body.style.overflow = 'auto';
  };

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
