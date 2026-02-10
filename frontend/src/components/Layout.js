import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ShoppingBag, User, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import AuthModal from './AuthModal';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const Layout = ({ children }) => {
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const { itemCount } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [studioEnabled, setStudioEnabled] = useState(false);

  // Check if Studio page is enabled
  useEffect(() => {
    const checkStudioStatus = async () => {
      try {
        const response = await axios.get(`${API_URL}/content/studio/status`);
        setStudioEnabled(response.data.enabled);
      } catch (error) {
        setStudioEnabled(false);
      }
    };
    checkStudioStatus();
  }, []);

  const baseNavLinks = [
    { path: '/', label: 'Home' },
    { path: '/gallery', label: 'Gallery' },
    { path: '/shop', label: 'Shop' },
    { path: '/sell', label: 'Sell' },
    { path: '/booking', label: 'Book' },
  ];

  // Conditionally add Studio link
  const navLinks = studioEnabled 
    ? [...baseNavLinks.slice(0, 2), { path: '/studio', label: 'Studio' }, ...baseNavLinks.slice(2)]
    : baseNavLinks;

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const openAuthModal = (mode) => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#050505]">
      {/* Noise overlay */}
      <div className="noise-overlay" />

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-white/5">
        <div className="container-custom">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link to="/" className="title-xl text-lg tracking-tight" data-testid="logo-link">
              Cutting Corners
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-10">
              {navLinks.map(link => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`nav-link ${isActive(link.path) ? 'active' : ''}`}
                  data-testid={`nav-${link.label.toLowerCase()}`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-6">
              {/* Cart */}
              <Link to="/cart" className="relative" data-testid="cart-link">
                <ShoppingBag className="w-5 h-5 text-gray-400 hover:text-white transition-colors" />
                {itemCount > 0 && (
                  <span className="absolute -top-2 -right-2 w-4 h-4 bg-white text-black text-[10px] font-bold flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Link>

              {/* Auth */}
              {isAuthenticated ? (
                <div className="hidden md:flex items-center gap-4">
                  <Link to="/dashboard" className="text-gray-400 hover:text-white transition-colors" data-testid="dashboard-link">
                    <User className="w-5 h-5" />
                  </Link>
                  <button onClick={logout} className="text-gray-400 hover:text-white transition-colors" data-testid="logout-btn">
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => openAuthModal('login')}
                  className="hidden md:block btn-ghost"
                  data-testid="login-btn"
                >
                  Login
                </button>
              )}

              {/* Mobile menu button */}
              <button
                className="md:hidden text-white"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                data-testid="mobile-menu-btn"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden glass border-t border-white/5">
            <div className="container-custom py-6 space-y-4">
              {navLinks.map(link => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`block nav-link ${isActive(link.path) ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              {isAuthenticated ? (
                <>
                  <Link to="/dashboard" className="block nav-link" onClick={() => setMobileMenuOpen(false)}>
                    Dashboard
                  </Link>
                  <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="block nav-link">
                    Logout
                  </button>
                </>
              ) : (
                <button onClick={() => { openAuthModal('login'); setMobileMenuOpen(false); }} className="block nav-link">
                  Login
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Main content */}
      <main className="pt-20">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-16">
        <div className="container-custom">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="md:col-span-2">
              <h3 className="title-sm text-2xl mb-4">Cutting Corners</h3>
              <p className="text-gray-500 text-sm leading-relaxed max-w-md">
                Precision gemstone cutting by Michael Wall. Based in Tempe, Arizona. 
                Specializing in sapphires, tourmalines, emeralds, and more.
              </p>
            </div>
            <div>
              <h4 className="text-sm uppercase tracking-widest mb-4 text-gray-400">Navigation</h4>
              <div className="space-y-2">
                {navLinks.map(link => (
                  <Link key={link.path} to={link.path} className="block text-gray-500 hover:text-white text-sm transition-colors">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm uppercase tracking-widest mb-4 text-gray-400">Contact</h4>
              <div className="space-y-2 text-gray-500 text-sm">
                <p>Tempe, Arizona</p>
                <p>
                  <a href="tel:4802854595" className="hover:text-white transition-colors">480-286-4595</a>
                </p>
                <p className="text-xs text-gray-600">Calls & Texts Welcome</p>
              </div>
            </div>
          </div>
          <div className="mt-16 pt-8 border-t border-white/5 text-center text-gray-600 text-xs uppercase tracking-widest">
            © {new Date().getFullYear()} Cutting Corners. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        mode={authMode}
        setMode={setAuthMode}
      />
    </div>
  );
};

export default Layout;
