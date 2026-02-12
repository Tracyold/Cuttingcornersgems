import React, { useState } from 'react';
import { X, ZoomIn, PenTool } from 'lucide-react';

// Sample design data - this would come from API later
const SAMPLE_DESIGNS = [
  {
    id: 'design-1',
    title: 'Portuguese Round',
    description: 'A classic round brilliant with extra facets for maximum sparkle. 57 facets on the crown and pavilion.',
    image: 'https://images.unsplash.com/photo-1615655406736-b37c4fabf923?w=800',
    category: 'Round Cuts',
  },
  {
    id: 'design-2',
    title: 'Modified Cushion',
    description: 'Custom cushion design with brilliant-style faceting. Optimized for color retention in sapphires.',
    image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800',
    category: 'Cushion Cuts',
  },
  {
    id: 'design-3',
    title: 'Precision Emerald',
    description: 'Step-cut emerald design with extended corner facets for improved brilliance.',
    image: 'https://images.unsplash.com/photo-1583937443749-887582ecdf5b?w=800',
    category: 'Step Cuts',
  },
  {
    id: 'design-4',
    title: 'Hexagonal Brilliant',
    description: 'Unique hexagonal outline with brilliant-style faceting. Perfect for tourmalines.',
    image: 'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=800',
    category: 'Fancy Cuts',
  },
  {
    id: 'design-5',
    title: 'Oval Precision',
    description: 'Modified oval brilliant with optimized light return. Reduces bow-tie effect.',
    image: 'https://images.unsplash.com/photo-1599707367072-cd6ada2bc375?w=800',
    category: 'Oval Cuts',
  },
  {
    id: 'design-6',
    title: 'Trillion Modern',
    description: 'Contemporary trillion design with curved sides and brilliant faceting.',
    image: 'https://images.unsplash.com/photo-1603561596112-0a132b757442?w=800',
    category: 'Fancy Cuts',
  },
];

// Image Popup Component
const ImagePopup = ({ design, onClose }) => {
  return (
    <div 
      className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4"
      onClick={onClose}
      data-testid="design-popup"
    >
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors z-10"
        data-testid="design-popup-close"
      >
        <X className="w-8 h-8" />
      </button>
      <div className="max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
        <img
          src={design.image}
          alt={design.title}
          className="w-full max-h-[70vh] object-contain mb-6"
        />
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-amber-400 mb-2">{design.category}</p>
          <h3 className="text-2xl title-sm mb-3">{design.title}</h3>
          <p className="text-gray-400 max-w-xl mx-auto">{design.description}</p>
        </div>
      </div>
    </div>
  );
};

// Design Card Component
const DesignCard = ({ design, onClick }) => {
  return (
    <div 
      className="group cursor-pointer"
      onClick={onClick}
      data-testid={`design-card-${design.id}`}
    >
      <div className="relative aspect-square overflow-hidden mb-4 rounded shadow-[inset_0_0_20px_6px_rgba(0,0,0,0.4)]">
        <img 
          src={design.image} 
          alt={design.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* Inner vignette */}
        <div className="absolute inset-0 shadow-[inset_0_0_20px_6px_rgba(0,0,0,0.4)] pointer-events-none" />
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <ZoomIn className="w-8 h-8 text-white" />
        </div>
      </div>
      <p className="text-sm text-amber-400 uppercase tracking-widest">{design.title}</p>
    </div>
  );
};

// Main Design Gallery Component
const DesignGallery = () => {
  const [selectedDesign, setSelectedDesign] = useState(null);
  const [designs] = useState(SAMPLE_DESIGNS);

  return (
    <div data-testid="design-gallery-section">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-8">
        <PenTool className="w-5 h-5 text-amber-400" />
        <div>
          <h2 className="text-xl title-sm">Cutting Designs</h2>
          <p className="text-sm text-gray-500">Precision diagrams and custom patterns</p>
        </div>
      </div>

      {/* Design Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {designs.map((design) => (
          <DesignCard
            key={design.id}
            design={design}
            onClick={() => setSelectedDesign(design)}
          />
        ))}
      </div>

      {/* Empty State */}
      {designs.length === 0 && (
        <div className="text-center py-16">
          <PenTool className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500">Cutting designs coming soon...</p>
        </div>
      )}

      {/* Design Popup */}
      {selectedDesign && (
        <ImagePopup
          design={selectedDesign}
          onClose={() => setSelectedDesign(null)}
        />
      )}
    </div>
  );
};

export default DesignGallery;
