import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Play, Gem, Sparkles } from 'lucide-react';

// Sample journey data - this would come from API later
const SAMPLE_JOURNEYS = [
  {
    id: 'journey-1',
    gemName: 'Montana Sapphire',
    subtitle: 'From Rough to Radiant',
    coverImage: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600',
    finalImage: 'https://images.unsplash.com/photo-1615655406736-b37c4fabf923?w=600',
    color: '#1e40af',
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

// Journey Card Component
const JourneyCard = ({ journey, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className="group cursor-pointer"
      data-testid={`journey-card-${journey.id}`}
    >
      <div className="relative aspect-[4/5] overflow-hidden mb-4">
        {/* Before/After Split Preview */}
        <div className="absolute inset-0 flex">
          <div className="w-1/2 h-full overflow-hidden">
            <img 
              src={journey.coverImage} 
              alt="Before"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          </div>
          <div className="w-1/2 h-full overflow-hidden">
            <img 
              src={journey.finalImage} 
              alt="After"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          </div>
        </div>
        
        {/* Diagonal Divider */}
        <div className="absolute inset-0 pointer-events-none">
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
            <line x1="50" y1="0" x2="50" y2="100" stroke="white" strokeWidth="0.5" />
          </svg>
        </div>
        
        {/* Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center border-2 border-white/80 bg-white/10 backdrop-blur-sm"
            style={{ borderColor: journey.color }}
          >
            <Play className="w-6 h-6 text-white ml-1" fill="white" />
          </div>
        </div>
        
        {/* Steps Count Badge */}
        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm px-2 py-1 text-xs tracking-wider">
          {journey.steps.length} STEPS
        </div>
        
        {/* Labels */}
        <div className="absolute bottom-3 left-3 text-[10px] uppercase tracking-widest text-white/70">Rough</div>
        <div className="absolute bottom-3 right-3 text-[10px] uppercase tracking-widest text-white/70">Cut</div>
      </div>
      
      <div className="space-y-1">
        <h3 className="title-sm text-lg group-hover:text-amber-400 transition-colors">{journey.gemName}</h3>
        <p className="text-sm text-gray-500">{journey.subtitle}</p>
      </div>
    </div>
  );
};

// Fullscreen Journey Viewer
const JourneyViewer = ({ journey, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const goToStep = useCallback((index) => {
    if (index === currentStep || isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentStep(index);
      setIsTransitioning(false);
    }, 300);
  }, [currentStep, isTransitioning]);

  const goNext = useCallback(() => {
    if (currentStep < journey.steps.length - 1) {
      goToStep(currentStep + 1);
    }
  }, [currentStep, journey.steps.length, goToStep]);

  const goPrev = useCallback(() => {
    if (currentStep > 0) {
      goToStep(currentStep - 1);
    }
  }, [currentStep, goToStep]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, goNext, goPrev]);

  // Touch/swipe handling
  const [touchStart, setTouchStart] = useState(null);
  const handleTouchStart = (e) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e) => {
    if (!touchStart) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext();
      else goPrev();
    }
    setTouchStart(null);
  };

  const step = journey.steps[currentStep];
  const progress = ((currentStep + 1) / journey.steps.length) * 100;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      data-testid="journey-viewer"
    >
      {/* Progress Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 z-20">
        <div 
          className="h-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%`, backgroundColor: journey.color }}
        />
      </div>

      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-20 w-10 h-10 flex items-center justify-center bg-black/50 backdrop-blur-sm hover:bg-white/10 transition-colors"
        data-testid="journey-close-btn"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Header */}
      <div className="absolute top-4 left-4 z-20">
        <p className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-1">The Journey</p>
        <h2 className="title-sm text-xl">{journey.gemName}</h2>
      </div>

      {/* Main Image */}
      <div className="absolute inset-0 flex items-center justify-center p-4 md:p-20">
        <div className={`relative w-full h-full max-w-4xl transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
          <img
            src={step.image}
            alt={step.title}
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {/* Navigation Arrows - Desktop */}
      <button
        onClick={goPrev}
        disabled={currentStep === 0}
        className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 items-center justify-center bg-black/50 backdrop-blur-sm hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        data-testid="journey-prev-btn"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={goNext}
        disabled={currentStep === journey.steps.length - 1}
        className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 items-center justify-center bg-black/50 backdrop-blur-sm hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        data-testid="journey-next-btn"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Bottom Info Panel */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-6 md:p-8">
        {/* Step Dots */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {journey.steps.map((_, index) => (
            <button
              key={index}
              onClick={() => goToStep(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentStep 
                  ? 'w-8 bg-white' 
                  : 'bg-white/30 hover:bg-white/50'
              }`}
              data-testid={`journey-dot-${index}`}
            />
          ))}
        </div>

        {/* Step Info */}
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs uppercase tracking-[0.2em] mb-2" style={{ color: journey.color }}>
            Step {currentStep + 1} of {journey.steps.length}
          </p>
          <h3 className="title-sm text-2xl mb-2">{step.title}</h3>
          <p className="text-gray-400 text-sm md:text-base leading-relaxed">{step.description}</p>
        </div>

        {/* Mobile Swipe Hint */}
        <p className="md:hidden text-center text-xs text-gray-600 mt-4">
          Swipe to navigate
        </p>
      </div>
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

      {/* Fullscreen Viewer */}
      {selectedJourney && (
        <JourneyViewer
          journey={selectedJourney}
          onClose={closeJourney}
        />
      )}
    </div>
  );
};

export default JourneyStories;
