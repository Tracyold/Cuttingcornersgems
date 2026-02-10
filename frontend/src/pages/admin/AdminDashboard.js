import React, { useState, useEffect } from 'react';
import { Package, Image, MessageSquare, Users, DollarSign, ShoppingCart, Receipt, TrendingUp, Clock, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api/adminApi';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    products: 0,
    gallery: 0,
    bookings: 0,
    users: 0,
    orders: 0,
    sold: 0,
    inquiries: 0,
    product_inquiries: 0,
    sell_inquiries: 0,
    nyp_inquiries: 0,
    total_revenue: 0,
    pending_bookings: 0,
    pending_inquiries: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch stats from dedicated endpoint
      const [statsRes, bookings, productInquiries, sellInquiries, nypInquiries, orders] = await Promise.all([
        axios.get(`${API_URL}/admin/dashboard/stats`, getAuthHeaders()),
        axios.get(`${API_URL}/admin/bookings`, getAuthHeaders()),
        axios.get(`${API_URL}/admin/product-inquiries`, getAuthHeaders()),
        axios.get(`${API_URL}/admin/sell-inquiries`, getAuthHeaders()),
        axios.get(`${API_URL}/admin/name-your-price-inquiries`, getAuthHeaders()),
        axios.get(`${API_URL}/admin/orders`, getAuthHeaders()),
      ]);

      setStats(statsRes.data);

      // Combine and sort recent activity
      const allActivity = [
        ...bookings.data.map(b => ({ ...b, type: 'booking', typeLabel: 'Booking' })),
        ...orders.data.map(o => ({ ...o, type: 'order', typeLabel: 'Order' })),
        ...productInquiries.data.map(i => ({ ...i, type: 'inquiry', typeLabel: 'Inquiry' })),
        ...sellInquiries.data.map(i => ({ ...i, type: 'sell', typeLabel: 'Sell Inquiry' })),
        ...nypInquiries.data.map(i => ({ ...i, type: 'nyp', typeLabel: 'Name Your Price' })),
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 8);

      setRecentActivity(allActivity);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Products', value: stats.products, icon: Package, color: 'text-blue-400', path: '/admin/products' },
    { label: 'Gallery Items', value: stats.gallery, icon: Image, color: 'text-purple-400', path: '/admin/gallery' },
    { label: 'Bookings', value: stats.bookings, icon: MessageSquare, color: 'text-green-400', path: '/admin/inquiries' },
    { label: 'Users', value: stats.users, icon: Users, color: 'text-yellow-400', path: '/admin/users' },
    { label: 'Orders', value: stats.orders, icon: ShoppingCart, color: 'text-pink-400', path: '/admin/sold' },
    { label: 'Sold Items', value: stats.sold, icon: Receipt, color: 'text-emerald-400', path: '/admin/sold' },
  ];

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getActivityDescription = (item) => {
    switch (item.type) {
      case 'booking':
        return `Booking from ${item.name} - ${item.service}`;
      case 'order':
        return `New order - $${item.total?.toLocaleString()}`;
      case 'inquiry':
        return `Product inquiry from ${item.name}`;
      case 'sell':
        return `Sell inquiry from ${item.name} - $${item.asking_price}`;
      case 'nyp':
        return `Name Your Price from ${item.name} - $${item.price}`;
      default:
        return 'Activity';
    }
  };

  const getActivityBadgeColor = (type) => {
    switch (type) {
      case 'booking': return 'bg-green-500/20 text-green-400';
      case 'order': return 'bg-blue-500/20 text-blue-400';
      case 'inquiry': return 'bg-yellow-500/20 text-yellow-400';
      case 'sell': return 'bg-purple-500/20 text-purple-400';
      case 'nyp': return 'bg-orange-500/20 text-orange-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="admin-dashboard">
      <h1 className="font-serif text-3xl mb-8">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {statCards.map(stat => (
          <Link 
            key={stat.label} 
            to={stat.path}
            className="gem-card p-4 hover:bg-white/5 transition-colors"
            data-testid={`stat-${stat.label.toLowerCase().replace(' ', '-')}`}
          >
            <stat.icon className={`w-6 h-6 ${stat.color} mb-2`} />
            <p className="text-2xl font-mono">{stat.value}</p>
            <p className="text-xs text-gray-500 uppercase tracking-widest">{stat.label}</p>
          </Link>
        ))}
      </div>

      {/* Revenue & Pending Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="gem-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-6 h-6 text-green-400" />
            <h2 className="font-semibold">Total Revenue</h2>
          </div>
          <p className="text-3xl font-mono text-green-400" data-testid="total-revenue">
            ${stats.total_revenue?.toLocaleString() || 0}
          </p>
          <p className="text-xs text-gray-500 mt-2">From {stats.sold} sold items</p>
        </div>

        <div className="gem-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-6 h-6 text-yellow-400" />
            <h2 className="font-semibold">Pending Bookings</h2>
          </div>
          <p className="text-3xl font-mono" data-testid="pending-bookings">{stats.pending_bookings}</p>
          <Link to="/admin/inquiries" className="text-xs text-blue-400 hover:text-blue-300 mt-2 inline-block">
            View all bookings →
          </Link>
        </div>

        <div className="gem-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="w-6 h-6 text-purple-400" />
            <h2 className="font-semibold">Inquiry Breakdown</h2>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Product Inquiries</span>
              <span data-testid="product-inquiries-count">{stats.product_inquiries}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Sell Inquiries</span>
              <span data-testid="sell-inquiries-count">{stats.sell_inquiries}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Name Your Price</span>
              <span data-testid="nyp-inquiries-count">{stats.nyp_inquiries}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="gem-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            Recent Activity
          </h2>
          <Link to="/admin/inquiries" className="text-xs text-blue-400 hover:text-blue-300">
            View all →
          </Link>
        </div>
        
        {recentActivity.length === 0 ? (
          <p className="text-gray-500 text-sm">No recent activity</p>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((item, i) => (
              <div 
                key={i} 
                className="flex items-center justify-between py-3 border-b border-white/5 last:border-0"
                data-testid={`activity-item-${i}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{getActivityDescription(item)}</p>
                  <p className="text-xs text-gray-500">{formatDate(item.created_at)}</p>
                </div>
                <span className={`text-xs px-2 py-1 ml-3 flex-shrink-0 ${getActivityBadgeColor(item.type)}`}>
                  {item.typeLabel}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
