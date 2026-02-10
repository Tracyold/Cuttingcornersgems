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

  // Scroll reveal effect
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
          }
        });
      },
      { threshold: 0.3 }
    );

    const elements = document.querySelectorAll('[data-scroll-reveal]');
    elements.forEach((el) => {
      el.style.transform = 'translateY(30px)';
      observer.observe(el);
    });

    return () => observer.disconnect();
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
          <p className="text-sm uppercase tracking-[0.3em] text-gray-400 mb-6 opacity-0 animate-fade-in transition-all duration-700" data-scroll-reveal>
            Tempe, Arizona
          </p>
          <h1 className="page-title title-xl tracking-tight mb-6 opacity-0 animate-fade-in delay-100">
            <span className="text-[#d4af37]">Cutting</span> Corners — Not the <span className="text-[#d4af37]">Quality</span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl lg:text-2xl max-w-3xl mx-auto mb-10 opacity-0 animate-fade-in delay-200">
            Professional gemstone cutter focused on color, yield, and stone potential for jewelry professionals nationwide.
          </p>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 opacity-0 animate-fade-in delay-500">
          <div className="w-px h-16 bg-gradient-to-b from-white/0 via-white/30 to-white/0" />
        </div>
      </section>

      {/* Philosophy Section - Color Conscious Careful Cutting */}
      <section className="section-spacing py-24" data-testid="philosophy-section">
        <div className="container-custom max-w-6xl">
          <div className="text-center mb-16">
            <p className="text-sm uppercase tracking-[0.2em] text-gray-500 mb-4">Philosophy</p>
            <h2 className="title-xl tracking-tight mb-4">My Four C's</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Text - Left Side */}
            <div className="space-y-6 text-left">
              <p className="text-xl md:text-2xl opacity-0 transition-all duration-700 delay-100" data-scroll-reveal>
                <span className="text-[#d4af37]">Color</span> is the goal.
              </p>
              <p className="text-xl md:text-2xl opacity-0 transition-all duration-700 delay-200" data-scroll-reveal>
                <span className="text-[#d4af37]">Conscious</span> of the weight.
              </p>
              <p className="text-xl md:text-2xl opacity-0 transition-all duration-700 delay-300" data-scroll-reveal>
                <span className="text-[#d4af37]">Careful</span> with my approach.
              </p>
              <p className="text-xl md:text-2xl opacity-0 transition-all duration-700 delay-400" data-scroll-reveal>
                <span className="text-[#d4af37]">Cutting</span> is my craft.
              </p>
            </div>
            
            {/* Image - Right Side */}
            <div className="opacity-0 transition-all duration-700 delay-200" data-scroll-reveal>
              <div className="relative group overflow-hidden rounded">
                <img 
                  src="https://customer-assets.emergentagent.com/job_41f4dd21-9bc3-4ce6-811a-c8c6525c59b8/artifacts/sqy5b97p_IMG_3573.jpeg" 
                  alt="Workshop" 
                  className="w-full h-auto"
                />
                {/* Black overlay - visible by default, fades on hover */}
                <div className="absolute inset-0 bg-black/60 group-hover:bg-black/0 transition-all duration-500" />
                
                {/* Blurry black edges - always visible */}
                <div className="absolute inset-0 pointer-events-none" style={{
                  boxShadow: 'inset 0 0 60px 20px rgba(0,0,0,0.8)'
                }} />
                
                {/* "Studio" text overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-100 group-hover:opacity-0 transition-opacity duration-500">
                  <p className="text-white title-sm text-sm">Studio</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="section-spacing" data-testid="services-section">
        <div className="container-custom">
          <div className="text-center mb-16">
            <p className="text-sm uppercase tracking-[0.2em] text-gray-500 mb-4">What I Do</p>
            <h2 className="title-xl tracking-tight">Services</h2>
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
                className="gem-card p-8 hover-lift opacity-0 transition-all duration-700"
                style={{ animationDelay: `${i * 100}ms` }}
                data-scroll-reveal
              >
                <service.icon className="w-8 h-8 mb-6 text-[#d4af37] opacity-0 transition-all duration-700" data-scroll-reveal strokeWidth={1.5} />
                <h3 className="title-sm text-base mb-3">{service.title}</h3>
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
                className="gem-card p-4 opacity-0 transition-all duration-700"
                style={{ animationDelay: `${i * 50}ms` }}
                data-scroll-reveal
              >
                <service.icon className="w-6 h-6 mb-3 text-[#d4af37] opacity-0 transition-all duration-700" data-scroll-reveal strokeWidth={1.5} />
                <h3 className="title-sm text-sm mb-2">{service.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{service.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="section-spacing" data-testid="about-section">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="relative opacity-0 transition-all duration-700 delay-100" data-scroll-reveal>
              <p className="text-sm uppercase tracking-[0.2em] text-gray-500 mb-4 text-center">About the Cutter</p>
              <div className="aspect-square overflow-hidden relative">
                <div className="absolute inset-0 shadow-[inset_0_0_30px_15px_rgba(0,0,0,0.7)] z-10 pointer-events-none" />
                <img
                  src="https://customer-assets.emergentagent.com/job_41f4dd21-9bc3-4ce6-811a-c8c6525c59b8/artifacts/c2cwyfwb_IMG_5555.jpeg"
                  alt="Michael Wall at work"
                  className="w-full h-full object-cover"
                  style={{ transform: 'scale(1.1)', objectPosition: 'center top' }}
                />
              </div>
              <div className="absolute -bottom-8 -right-8 w-48 h-48 bg-[#0A0A0A] border border-white/10 p-6 hidden md:flex flex-col justify-center">
                <p className="spec-text text-gray-500 mb-1">Industry Since</p>
                <p className="title-sm text-3xl">2013</p>
                <p className="text-gray-500 text-sm">Pro Since 2021</p>
              </div>
            </div>
            <div className="opacity-0 transition-all duration-700 delay-200" data-scroll-reveal>
              <p className="text-sm uppercase tracking-[0.2em] text-gray-500 mb-4">About</p>
              <h2 className="page-title title-xl mb-6">Michael Wall</h2>
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
                <Link to="/gallery" className="btn-primary" data-testid="about-portfolio-btn">
                  View Portfolio
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
          <h2 className="page-title title-xl mb-6">Ready to Start?</h2>
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
