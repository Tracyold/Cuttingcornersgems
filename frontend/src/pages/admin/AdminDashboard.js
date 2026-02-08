import React, { useState, useEffect } from 'react';
import { Package, Image, MessageSquare, Users, DollarSign, ShoppingCart } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const AdminDashboard = () => {
  const { getAuthHeaders } = useAdmin();
  const [stats, setStats] = useState({
    products: 0,
    gallery: 0,
    bookings: 0,
    users: 0,
    orders: 0,
    inquiries: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [products, gallery, bookings, users, orders, productInquiries, sellInquiries] = await Promise.all([
        axios.get(`${API_URL}/admin/products`, getAuthHeaders()),
        axios.get(`${API_URL}/admin/gallery`, getAuthHeaders()),
        axios.get(`${API_URL}/admin/bookings`, getAuthHeaders()),
        axios.get(`${API_URL}/admin/users`, getAuthHeaders()),
        axios.get(`${API_URL}/admin/orders`, getAuthHeaders()),
        axios.get(`${API_URL}/admin/product-inquiries`, getAuthHeaders()),
        axios.get(`${API_URL}/admin/sell-inquiries`, getAuthHeaders()),
      ]);

      setStats({
        products: products.data.length,
        gallery: gallery.data.length,
        bookings: bookings.data.length,
        users: users.data.length,
        orders: orders.data.length,
        inquiries: productInquiries.data.length + sellInquiries.data.length
      });

      // Combine and sort recent activity
      const allActivity = [
        ...bookings.data.map(b => ({ ...b, type: 'booking' })),
        ...orders.data.map(o => ({ ...o, type: 'order' })),
        ...productInquiries.data.map(i => ({ ...i, type: 'inquiry' })),
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);

      setRecentActivity(allActivity);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Products', value: stats.products, icon: Package, color: 'text-blue-400' },
    { label: 'Gallery Items', value: stats.gallery, icon: Image, color: 'text-purple-400' },
    { label: 'Bookings', value: stats.bookings, icon: MessageSquare, color: 'text-green-400' },
    { label: 'Users', value: stats.users, icon: Users, color: 'text-yellow-400' },
    { label: 'Orders', value: stats.orders, icon: ShoppingCart, color: 'text-pink-400' },
    { label: 'Inquiries', value: stats.inquiries, icon: DollarSign, color: 'text-cyan-400' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-serif text-3xl mb-8">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {statCards.map(stat => (
          <div key={stat.label} className="gem-card p-4">
            <stat.icon className={`w-6 h-6 ${stat.color} mb-2`} />
            <p className="text-2xl font-mono">{stat.value}</p>
            <p className="text-xs text-gray-500 uppercase tracking-widest">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="gem-card p-6">
        <h2 className="font-serif text-xl mb-4">Recent Activity</h2>
        {recentActivity.length === 0 ? (
          <p className="text-gray-500 text-sm">No recent activity</p>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                <div>
                  <p className="text-sm">
                    {item.type === 'booking' && `New booking from ${item.name}`}
                    {item.type === 'order' && `New order - $${item.total}`}
                    {item.type === 'inquiry' && `Product inquiry from ${item.name}`}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(item.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  item.type === 'booking' ? 'bg-green-500/20 text-green-400' :
                  item.type === 'order' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {item.type}
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
