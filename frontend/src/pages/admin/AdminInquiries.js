import React, { useState, useEffect } from 'react';
import { MessageSquare, DollarSign, Phone, Mail, Calendar, ChevronDown, ChevronUp, ExternalLink, Tag, Image as ImageIcon, Package } from 'lucide-react';
import { adminApi } from '../../api/adminApi';

// Expandable Card Component
const ExpandableCard = ({ item, type, children, productData }) => {
  const [expanded, setExpanded] = useState(false);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="gem-card overflow-hidden" data-testid={`inquiry-card-${item.id}`}>
      <div 
        className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold">{item.name}</h3>
              {type === 'nyp' && (
                <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5">NAME YOUR PRICE</span>
              )}
              {type === 'sell' && (
                <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5">SELL INQUIRY</span>
              )}
            </div>
            {type === 'booking' && (
              <p className="text-sm text-gray-500">{item.service} • {item.stone_type}</p>
            )}
            {type === 'product' && (
              <p className="text-sm text-gray-500">Re: {item.product_title}</p>
            )}
            {type === 'sell' && (
              <p className="text-sm text-gray-500">Asking: ${item.asking_price} {item.negotiable && '(Negotiable)'}</p>
            )}
            {type === 'nyp' && (
              <p className="text-sm text-gray-500">Re: {item.product_title} • Offered: <span className="text-green-400 font-mono">${item.price}</span></p>
            )}
            <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {formatDate(item.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {item.status && (
              <span className={`text-xs px-2 py-1 ${
                item.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                item.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-gray-500/20 text-gray-400'
              }`}>
                {item.status}
              </span>
            )}
            {expanded ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-white/10 pt-4 space-y-4">
          {children}
          
          {/* Product Info for NYP */}
          {type === 'nyp' && productData && (
            <div className="border border-white/10 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Package className="w-4 h-4" />
                <span>Product Information</span>
              </div>
              <div className="flex gap-4">
                {productData.image_url && (
                  <img 
                    src={productData.image_url} 
                    alt={productData.title} 
                    className="w-20 h-20 object-cover"
                  />
                )}
                <div className="flex-1 space-y-1 text-sm">
                  <p className="font-semibold">{productData.title}</p>
                  <p className="text-gray-500">{productData.category}</p>
                  {productData.carat && <p className="text-gray-500">Carat: {productData.carat}</p>}
                  {productData.color && <p className="text-gray-500">Color: {productData.color}</p>}
                  {productData.price && (
                    <p className="text-gray-400">Listed Price: <span className="text-white font-mono">${productData.price.toLocaleString()}</span></p>
                  )}
                </div>
              </div>
              <a 
                href={`/shop/${item.product_id}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
              >
                <ExternalLink className="w-3 h-3" /> View Product Page
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const AdminInquiries = () => {
  const [activeTab, setActiveTab] = useState('bookings');
  const [data, setData] = useState({
    bookings: [],
    productInquiries: [],
    sellInquiries: [],
    nameYourPrice: []
  });
  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [bookingsData, productInquiriesData, sellInquiriesData, nameYourPriceData, productsData] = await Promise.all([
        adminApi.get('/admin/bookings'),
        adminApi.get('/admin/product-inquiries'),
        adminApi.get('/admin/sell-inquiries'),
        adminApi.get('/admin/name-your-price-inquiries'),
        adminApi.get('/admin/products'),
      ]);
      
      // Create product lookup map
      const productMap = {};
      productsData.forEach(p => { productMap[p.id] = p; });
      setProducts(productMap);
      
      setData({
        bookings: bookingsData,
        productInquiries: productInquiriesData,
        sellInquiries: sellInquiriesData,
        nameYourPrice: nameYourPriceData
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
    { id: 'nyp', label: 'Name Your Price', icon: Tag, count: data.nameYourPrice.length },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="admin-inquiries-page">
      <h1 className="title-xl text-3xl mb-8">Inquiries</h1>

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
            data-testid={`tab-${tab.id}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            <span className="ml-1 text-xs opacity-70">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-4">
        {/* Bookings */}
        {activeTab === 'bookings' && (
          data.bookings.length === 0 ? (
            <div className="gem-card p-8 text-center text-gray-500">No bookings yet</div>
          ) : (
            data.bookings.map(item => (
              <ExpandableCard key={item.id} item={item} type="booking">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Name</p>
                    <p>{item.name}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Email</p>
                    <a href={`mailto:${item.email}`} className="text-blue-400 hover:text-blue-300 flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {item.email}
                    </a>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Phone</p>
                    <a href={`tel:${item.phone}`} className="text-blue-400 hover:text-blue-300 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {item.phone}
                    </a>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Service</p>
                    <p className="capitalize">{item.service}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Stone Type</p>
                    <p className="capitalize">{item.stone_type}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Status</p>
                    <p className="capitalize">{item.status}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Description</p>
                  <p className="text-gray-400 text-sm bg-white/5 p-3">{item.description || 'No description provided'}</p>
                </div>
                {item.user_id && (
                  <div className="text-xs text-blue-400">
                    Submitted by registered user (ID: {item.user_id.slice(0,8)}...)
                  </div>
                )}
              </ExpandableCard>
            ))
          )
        )}

        {/* Product Inquiries */}
        {activeTab === 'product' && (
          data.productInquiries.length === 0 ? (
            <div className="gem-card p-8 text-center text-gray-500">No product inquiries yet</div>
          ) : (
            data.productInquiries.map(item => (
              <ExpandableCard key={item.id} item={item} type="product">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Name</p>
                    <p>{item.name}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Email</p>
                    <a href={`mailto:${item.email}`} className="text-blue-400 hover:text-blue-300 flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {item.email}
                    </a>
                  </div>
                  {item.phone && (
                    <div>
                      <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Phone</p>
                      <a href={`tel:${item.phone}`} className="text-blue-400 hover:text-blue-300 flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {item.phone}
                      </a>
                    </div>
                  )}
                  <div>
                    <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Product</p>
                    <p>{item.product_title}</p>
                  </div>
                  {item.is_offer && (
                    <div>
                      <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Offer Amount</p>
                      <p className="text-green-400 font-mono text-lg">${item.offer_price}</p>
                    </div>
                  )}
                </div>
                <a href={`/shop/${item.product_id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300">
                  <ExternalLink className="w-4 h-4" /> View Product Page
                </a>
              </ExpandableCard>
            ))
          )
        )}

        {/* Sell Inquiries */}
        {activeTab === 'sell' && (
          data.sellInquiries.length === 0 ? (
            <div className="gem-card p-8 text-center text-gray-500">No sell inquiries yet</div>
          ) : (
            data.sellInquiries.map(item => (
              <ExpandableCard key={item.id} item={item} type="sell">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Name</p>
                    <p>{item.name}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Email</p>
                    <a href={`mailto:${item.email}`} className="text-blue-400 hover:text-blue-300 flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {item.email}
                    </a>
                  </div>
                  {item.phone && (
                    <div>
                      <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Phone</p>
                      <a href={`tel:${item.phone}`} className="text-blue-400 hover:text-blue-300 flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {item.phone}
                      </a>
                    </div>
                  )}
                  <div>
                    <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Asking Price</p>
                    <p className="font-mono text-lg">${item.asking_price}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Negotiable</p>
                    <p>{item.negotiable ? 'Yes' : 'No'}</p>
                  </div>
                  {item.photo_count > 0 && (
                    <div>
                      <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Photos Uploaded</p>
                      <p className="flex items-center gap-1"><ImageIcon className="w-3 h-3" /> {item.photo_count} photo(s)</p>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Description</p>
                  <p className="text-gray-400 text-sm bg-white/5 p-3">{item.description}</p>
                </div>
              </ExpandableCard>
            ))
          )
        )}

        {/* Name Your Price */}
        {activeTab === 'nyp' && (
          data.nameYourPrice.length === 0 ? (
            <div className="gem-card p-8 text-center text-gray-500">No "Name Your Price" inquiries yet</div>
          ) : (
            data.nameYourPrice.map(item => (
              <ExpandableCard 
                key={item.id} 
                item={item} 
                type="nyp"
                productData={products[item.product_id]}
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Name</p>
                    <p>{item.name}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Phone</p>
                    <a href={`tel:${item.phone}`} className="text-blue-400 hover:text-blue-300 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {item.phone}
                    </a>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Product</p>
                    <p>{item.product_title}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Offered Price</p>
                    <p className="text-green-400 font-mono text-xl">${item.price}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Date Submitted</p>
                    <p className="text-sm">{new Date(item.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </ExpandableCard>
            ))
          )
        )}
      </div>
    </div>
  );
};

export default AdminInquiries;
