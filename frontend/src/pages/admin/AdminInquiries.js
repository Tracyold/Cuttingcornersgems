import React, { useState, useEffect } from 'react';
import { MessageSquare, DollarSign, Phone, Mail, Calendar } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const AdminInquiries = () => {
  const { getAuthHeaders } = useAdmin();
  const [activeTab, setActiveTab] = useState('bookings');
  const [data, setData] = useState({
    bookings: [],
    productInquiries: [],
    sellInquiries: [],
    nameYourPrice: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [bookings, productInquiries, sellInquiries, nameYourPrice] = await Promise.all([
        axios.get(`${API_URL}/admin/bookings`, getAuthHeaders()),
        axios.get(`${API_URL}/admin/product-inquiries`, getAuthHeaders()),
        axios.get(`${API_URL}/admin/sell-inquiries`, getAuthHeaders()),
        axios.get(`${API_URL}/admin/name-your-price-inquiries`, getAuthHeaders()),
      ]);
      setData({
        bookings: bookings.data,
        productInquiries: productInquiries.data,
        sellInquiries: sellInquiries.data,
        nameYourPrice: nameYourPrice.data
      });
    } catch (error) {
      console.error('Failed to fetch inquiries:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'bookings', label: 'Bookings', icon: Calendar, count: data.bookings.length },
    { id: 'product', label: 'Product Inquiries', icon: MessageSquare, count: data.productInquiries.length },
    { id: 'sell', label: 'Sell Inquiries', icon: DollarSign, count: data.sellInquiries.length },
    { id: 'nyp', label: 'Name Your Price', icon: Phone, count: data.nameYourPrice.length },
  ];

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-serif text-3xl mb-8">Inquiries</h1>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-black'
                : 'text-gray-500 hover:text-white border border-white/10'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            <span className="ml-1 text-xs opacity-70">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-4">
        {activeTab === 'bookings' && (
          data.bookings.length === 0 ? (
            <div className="gem-card p-8 text-center text-gray-500">No bookings yet</div>
          ) : (
            data.bookings.map(item => (
              <div key={item.id} className="gem-card p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-sm text-gray-500">{item.service} • {item.stone_type}</p>
                  </div>
                  <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1">{item.status}</span>
                </div>
                <p className="text-sm text-gray-400 mb-2">{item.description}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {item.email}</span>
                  <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {item.phone}</span>
                  <span>{formatDate(item.created_at)}</span>
                </div>
              </div>
            ))
          )
        )}

        {activeTab === 'product' && (
          data.productInquiries.length === 0 ? (
            <div className="gem-card p-8 text-center text-gray-500">No product inquiries yet</div>
          ) : (
            data.productInquiries.map(item => (
              <div key={item.id} className="gem-card p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-sm text-gray-500">Re: {item.product_title}</p>
                  </div>
                  {item.is_offer && (
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1">
                      Offer: ${item.offer_price}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {item.email}</span>
                  {item.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {item.phone}</span>}
                  <span>{formatDate(item.created_at)}</span>
                </div>
              </div>
            ))
          )
        )}

        {activeTab === 'sell' && (
          data.sellInquiries.length === 0 ? (
            <div className="gem-card p-8 text-center text-gray-500">No sell inquiries yet</div>
          ) : (
            data.sellInquiries.map(item => (
              <div key={item.id} className="gem-card p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-sm text-gray-500">Asking: ${item.asking_price} {item.negotiable && '(Negotiable)'}</p>
                  </div>
                  <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1">{item.status}</span>
                </div>
                <p className="text-sm text-gray-400 mb-2">{item.description}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {item.email}</span>
                  {item.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {item.phone}</span>}
                  <span>{formatDate(item.created_at)}</span>
                </div>
              </div>
            ))
          )
        )}

        {activeTab === 'nyp' && (
          data.nameYourPrice.length === 0 ? (
            <div className="gem-card p-8 text-center text-gray-500">No "Name Your Price" inquiries yet</div>
          ) : (
            data.nameYourPrice.map(item => (
              <div key={item.id} className="gem-card p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-sm text-gray-500">Re: {item.product_title}</p>
                  </div>
                  <span className="text-lg font-mono text-green-400">${item.price}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {item.phone}</span>
                  <span>{formatDate(item.created_at)}</span>
                </div>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
};

export default AdminInquiries;
