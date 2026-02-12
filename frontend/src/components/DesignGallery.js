import React, { useState, useEffect } from 'react';
import { X, ZoomIn, PenTool } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

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
          src={design.image_url}
          alt={design.title}
          className="w-full max-h-[70vh] object-contain mb-6"
        />
        <div className="text-center">
          {design.category && (
            <p className="text-xs uppercase tracking-widest text-amber-400 mb-2">{design.category}</p>
          )}
          <h3 className="text-2xl title-sm mb-3">{design.title}</h3>
          {design.description && (
            <p className="text-gray-400 max-w-xl mx-auto">{design.description}</p>
          )}
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
          src={design.image_url} 
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
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDesigns = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/designs`);
        setDesigns(response.data);
      } catch (err) {
        console.error('Failed to fetch designs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDesigns();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-white/20 border-t-amber-400 rounded-full animate-spin" />
      </div>
    );
  }

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
