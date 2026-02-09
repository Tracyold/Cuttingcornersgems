import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Gem, Cog, Sparkles } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const Home = () => {
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedMobileItem, setExpandedMobileItem] = useState(null);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const response = await axios.get(`${API_URL}/gallery/featured`);
        setFeatured(response.data.slice(0, 6));
      } catch (error) {
        console.error('Failed to fetch featured:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  const toggleMobileItem = (itemId) => {
    setExpandedMobileItem(prev => prev === itemId ? null : itemId);
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="hero-section" data-testid="hero-section">
        <div className="absolute inset-0 hero-glow" />
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: 'url(https://customer-assets.emergentagent.com/job_1e0d6e37-2077-4a48-b9fe-d77e61594e60/artifacts/yu1iknms_IMG_3821.jpeg)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-[#050505]/50" />
        
        <div className="container-custom relative z-10 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-gray-400 mb-6 opacity-0 animate-fade-in">
            Tempe, Arizona
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl tracking-tight mb-6 opacity-0 animate-fade-in delay-100">
            <span className="text-[#d4af37]">Cutting</span> Corners — Not the <span className="text-[#d4af37]">Quality</span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 opacity-0 animate-fade-in delay-200">
            A Tailored <span className="text-[#d4af37]">Gem</span> Experience.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center opacity-0 animate-fade-in delay-300">
            <Link to="/gallery" className="btn-primary inline-flex items-center justify-center gap-2" data-testid="hero-gallery-btn">
              View Gallery <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/booking" className="btn-secondary" data-testid="hero-booking-btn">
              Book Consultation
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 opacity-0 animate-fade-in delay-500">
          <div className="w-px h-16 bg-gradient-to-b from-white/0 via-white/30 to-white/0" />
        </div>
      </section>

      {/* Services Section */}
      <section className="section-spacing" data-testid="services-section">
        <div className="container-custom">
          <div className="text-center mb-16">
            <p className="text-sm uppercase tracking-[0.2em] text-gray-500 mb-4">What I Do</p>
            <h2 className="section-title">Services</h2>
          </div>

          {/* Desktop: 3 column grid */}
          <div className="hidden md:grid grid-cols-3 gap-8">
            {[
              { icon: Cog, title: 'Custom Cutting', desc: 'Tailored cuts optimized for med-high weight retention while maximizing brilliance.' },
              { icon: Sparkles, title: 'Re-Polish & Re-Cut', desc: 'Breathe new life into existing stones with expert re-finishing services.' },
              { icon: Gem, title: 'Jeweler Services', desc: 'Working directly with jewelers in the industry to deliver exceptional results.' },
              { icon: Gem, title: 'Sell Gemstones', desc: 'Curate gemstone collections for collectors and enthusiasts.' },
              { icon: Gem, title: 'Buy Rough', desc: 'Source quality rough gemstones for your cutting projects.' },
              { icon: Gem, title: 'Buy Gems In Bulk', desc: 'Wholesale gemstone purchasing for jewelers and dealers.' },
            ].map((service, i) => (
              <div 
                key={service.title}
                className="gem-card p-8 hover-lift opacity-0 animate-fade-in"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <service.icon className="w-8 h-8 mb-6 text-gray-400" strokeWidth={1.5} />
                <h3 className="font-serif text-xl mb-3">{service.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{service.desc}</p>
              </div>
            ))}
          </div>

          {/* Mobile: 2 column grid */}
          <div className="grid grid-cols-2 gap-3 md:hidden">
            {[
              { icon: Cog, title: 'Custom Cutting', desc: 'Tailored cuts optimized for med-high weight retention while maximizing brilliance.' },
              { icon: Sparkles, title: 'Re-Polish & Re-Cut', desc: 'Breathe new life into existing stones with expert re-finishing services.' },
              { icon: Gem, title: 'Jeweler Services', desc: 'Working directly with jewelers in the industry to deliver exceptional results.' },
              { icon: Gem, title: 'Sell Gemstones', desc: 'Curate gemstone collections for collectors and enthusiasts.' },
              { icon: Gem, title: 'Buy Rough', desc: 'Source quality rough gemstones for your cutting projects.' },
              { icon: Gem, title: 'Buy Gems In Bulk', desc: 'Wholesale gemstone purchasing for jewelers and dealers.' },
            ].map((service, i) => (
              <div 
                key={service.title}
                className="gem-card p-4 opacity-0 animate-fade-in"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <service.icon className="w-6 h-6 mb-3 text-gray-400" strokeWidth={1.5} />
                <h3 className="font-serif text-sm mb-2">{service.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{service.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Work */}
      <section className="section-spacing bg-[#0A0A0A]" data-testid="featured-section">
        <div className="container-custom">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-gray-500 mb-4">Recent Work</p>
              <h2 className="section-title">Featured Gems</h2>
            </div>
            <Link to="/gallery" className="btn-ghost inline-flex items-center gap-2" data-testid="view-all-gallery-btn">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="gallery-grid hidden md:grid">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-square bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {/* Mobile: 2-column tap-to-flip grid */}
              <div className="grid grid-cols-2 gap-3 md:hidden">
                {featured.map((item, i) => (
                  <div
                    key={item.id}
                    onClick={() => toggleMobileItem(item.id)}
                    className="relative aspect-square overflow-hidden cursor-pointer opacity-0 animate-fade-in"
                    style={{ animationDelay: `${i * 50}ms` }}
                    data-testid={`featured-mobile-${i}`}
                  >
                    {expandedMobileItem === item.id ? (
                      <div className="absolute inset-0 bg-black flex flex-col items-center justify-center p-4 text-center z-10">
                        <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">{item.category}</p>
                        <h3 className="font-serif text-sm mb-2">{item.title}</h3>
                        {item.description && (
                          <p className="text-gray-400 text-xs leading-relaxed">{item.description}</p>
                        )}
                        {item.carat && (
                          <p className="text-xs text-gray-500 mt-2 font-mono">{item.carat}</p>
                        )}
                        <p className="text-[10px] text-gray-600 mt-3">Tap to close</p>
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

              {/* Desktop: Original hover grid */}
              <div className="gallery-grid hidden md:grid">
                {featured.map((item, i) => (
                  <Link
                    key={item.id}
                    to="/gallery"
                    className="group relative aspect-square overflow-hidden gem-card opacity-0 animate-fade-in"
                    style={{ animationDelay: `${i * 100}ms` }}
                    data-testid={`featured-item-${i}`}
                  >
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                      <p className="spec-text text-gray-400 mb-1">{item.category}</p>
                      <h3 className="font-serif text-lg">{item.title}</h3>
                      {item.carat && <p className="spec-text mt-1">{item.carat}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}

          {/* Mobile loading state */}
          {loading && (
            <div className="grid grid-cols-2 gap-3 md:hidden">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-square bg-white/5 animate-pulse" />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* About Section */}
      <section className="section-spacing" data-testid="about-section">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="aspect-[4/5] overflow-hidden relative">
                <div className="absolute inset-0 shadow-[inset_0_0_30px_15px_rgba(0,0,0,0.7)] z-10 pointer-events-none" />
                <img
                  src="https://customer-assets.emergentagent.com/job_1e0d6e37-2077-4a48-b9fe-d77e61594e60/artifacts/93xqhax5_IMG_5550.jpeg"
                  alt="Michael Wall at work"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-8 -right-8 w-48 h-48 bg-[#0A0A0A] border border-white/10 p-6 hidden md:flex flex-col justify-center">
                <p className="spec-text text-gray-500 mb-1">Industry Since</p>
                <p className="font-serif text-3xl">2013</p>
                <p className="text-gray-500 text-sm">Pro Since 2021</p>
              </div>
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-gray-500 mb-4">About</p>
              <h2 className="section-title mb-6">Michael Wall</h2>
              <div className="space-y-4 text-gray-400 leading-relaxed">
                <p>
                  Based in Tempe, Arizona, I've been part of the gemstone industry since 2013, 
                  transitioning from amateur enthusiast to professional cutter in 2021. My focus 
                  is on med-high weight retention cuts that maximize both value and beauty.
                </p>
                <p>
                  I work closely with jewelers across the industry, specializing in colored gemstones—sapphires, 
                  tourmalines, emeralds, tanzanites, and more. Whether you need a custom cut, re-polish, 
                  or expert consultation, I'm here to deliver results that exceed expectations.
                </p>
              </div>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link to="/booking" className="btn-primary" data-testid="about-booking-btn">
                  Book a Consultation
                </Link>
                <a href="tel:4802854595" className="btn-secondary" data-testid="about-call-btn">
                  Call 480-286-4595
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-spacing bg-[#0A0A0A] relative overflow-hidden" data-testid="cta-section">
        <div className="absolute inset-0 hero-glow opacity-50" />
        <div className="container-custom relative z-10 text-center">
          <h2 className="section-title mb-6">Ready to Start?</h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto mb-10">
            Whether you have a rough stone waiting to be transformed or need expert advice on your next project, 
            I'm here to help.
          </p>
          <Link to="/booking" className="btn-primary inline-flex items-center gap-2" data-testid="cta-booking-btn">
            Book Consultation <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
