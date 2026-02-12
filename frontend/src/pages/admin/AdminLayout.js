import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Package, Image, Settings, CreditCard, 
  Cloud, Shield, Users, MessageSquare, LogOut, Menu, X,
  HelpCircle, ChevronRight, Receipt, Mail, Database, BarChart3, Wrench, Film,
  DollarSign, Gem, PenTool
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';

const AdminLayout = ({ children }) => {
  const { isAdmin, loading, logout } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/admin');
    }
  }, [isAdmin, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const navItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/products', label: 'Products', icon: Package },
    { path: '/admin/gallery', label: 'Gallery', icon: Image },
    { path: '/admin/studio', label: 'Studio Content', icon: Film },
    { path: '/admin/inquiries', label: 'Inquiries', icon: MessageSquare },
    { path: '/admin/negotiations', label: 'Negotiations', icon: DollarSign },
    { path: '/admin/sold', label: 'Sold Items', icon: Receipt },
    { path: '/admin/data', label: 'Data & Archives', icon: Database },
    { path: '/admin/users', label: 'Users', icon: Users },
    { path: '/admin/system-tools', label: 'System Tools', icon: Wrench },
    { type: 'divider' },
    { path: '/admin/settings/stripe', label: 'Payments', icon: CreditCard },
    { path: '/admin/settings/storage', label: 'Cloud Storage', icon: Cloud },
    { path: '/admin/settings/security', label: 'Security', icon: Shield },
    { path: '/admin/settings/email', label: 'Email Service', icon: Mail },
    { path: '/admin/settings/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/admin/settings/general', label: 'Site Settings', icon: Settings },
  ];

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-[#050505] flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0A0A0A] border-r border-white/5 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-white/5">
            <Link to="/admin/dashboard" className="title-sm text-xl">
              <span className="text-[#d4af37]">Admin</span> Panel
            </Link>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item, i) => {
              if (item.type === 'divider') {
                return <div key={i} className="my-4 border-t border-white/5" />;
              }
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded transition-colors ${
                    isActive(item.path)
                      ? 'bg-white/10 text-white'
                      : 'text-gray-500 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-sm">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-white/5 space-y-2">
            <Link
              to="/admin/help"
              className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-white hover:bg-white/5 rounded transition-colors"
            >
              <HelpCircle className="w-5 h-5" />
              <span className="text-sm">Help Center</span>
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-red-500 hover:bg-white/5 rounded transition-colors w-full"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm">Sign Out</span>
            </button>
            <Link
              to="/"
              className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-white hover:bg-white/5 rounded transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
              <span className="text-sm">View Site</span>
            </Link>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        {/* Top bar */}
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#0A0A0A]/80 backdrop-blur sticky top-0 z-30">
          <button
            className="lg:hidden text-white"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <div className="text-sm text-gray-500">
            Logged in as <span className="text-white">Admin</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
