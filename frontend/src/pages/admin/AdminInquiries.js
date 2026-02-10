import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, DollarSign, Phone, Mail, Calendar, ChevronDown, ChevronUp, ExternalLink, Tag, Image as ImageIcon, Package, Trash2, RotateCcw, AlertTriangle } from 'lucide-react';
import { adminApi } from '../../api/adminApi';

const DeleteControls = ({ item, domain, onDelete, onRestore, onPurge }) => {
  const [confirmPurge, setConfirmPurge] = useState(false);
  const [purgeText, setPurgeText] = useState('');

  if (item.is_deleted) {
    return (
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
        <span className="text-xs text-red-400 mr-2">Deleted{item.deleted_at ? ` on ${new Date(item.deleted_at).toLocaleDateString()}` : ''}</span>
        <button onClick={() => onRestore(domain, item.id)} className="text-xs px-3 py-1 bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors" data-testid={`restore-${item.id}`}>
          <RotateCcw className="w-3 h-3 inline mr-1" />Restore
        </button>
        {!confirmPurge ? (
          <button onClick={() => setConfirmPurge(true)} className="text-xs px-3 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors" data-testid={`purge-btn-${item.id}`}>
            <AlertTriangle className="w-3 h-3 inline mr-1" />Purge
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <input value={purgeText} onChange={e => setPurgeText(e.target.value)} placeholder='Type "PURGE"' className="text-xs px-2 py-1 bg-black border border-red-500/50 text-white w-24" />
            <button disabled={purgeText !== 'PURGE'} onClick={() => { onPurge(domain, item.id); setConfirmPurge(false); }} className="text-xs px-2 py-1 bg-red-600 text-white disabled:opacity-30" data-testid={`purge-confirm-${item.id}`}>
              Confirm
            </button>
            <button onClick={() => { setConfirmPurge(false); setPurgeText(''); }} className="text-xs px-2 py-1 text-gray-400">Cancel</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
      <button onClick={() => onDelete(domain, item.id)} className="text-xs px-3 py-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors" data-testid={`delete-${item.id}`}>
        <Trash2 className="w-3 h-3 inline mr-1" />Delete
      </button>
    </div>
  );
};

const ExpandableCard = ({ item, type, children, productData, domain, onDelete, onRestore, onPurge }) => {
  const [expanded, setExpanded] = useState(false);
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`gem-card overflow-hidden ${item.is_deleted ? 'opacity-60 border-red-500/30' : ''}`} data-testid={`inquiry-card-${item.id}`}>
      <div className="p-4 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold">{item.name}</h3>
              {item.is_deleted && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5">DELETED</span>}
              {type === 'nyp' && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5">NAME YOUR PRICE</span>}
              {type === 'sell' && <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5">SELL INQUIRY</span>}
            </div>
            {type === 'booking' && <p className="text-sm text-gray-500">{item.service} - {item.stone_type}</p>}
            {type === 'product' && <p className="text-sm text-gray-500">Re: {item.product_title}</p>}
            {type === 'sell' && <p className="text-sm text-gray-500">Asking: ${item.asking_price} {item.negotiable && '(Negotiable)'}</p>}
            {type === 'nyp' && <p className="text-sm text-gray-500">Re: {item.product_title} - Offered: <span className="text-green-400 font-mono">${item.price}</span></p>}
            <p className="text-xs text-gray-600 mt-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(item.created_at)}</p>
          </div>
          <div className="flex items-center gap-2">
            {item.status && (
              <span className={`text-xs px-2 py-1 ${item.status === 'completed' ? 'bg-green-500/20 text-green-400' : item.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-gray-400'}`}>{item.status}</span>
            )}
            {expanded ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
          </div>
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 border-t border-white/10 pt-4 space-y-4">
          {children}
          {type === 'nyp' && productData && (
            <div className="border border-white/10 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-400"><Package className="w-4 h-4" /><span>Product Information</span></div>
              <div className="flex gap-4">
                {productData.image_url && <img src={productData.image_url} alt={productData.title} className="w-20 h-20 object-cover" />}
                <div className="flex-1 space-y-1 text-sm">
                  <p className="font-semibold">{productData.title}</p>
                  <p className="text-gray-500">{productData.category}</p>
                  {productData.price && <p className="text-gray-400">Listed: <span className="text-white font-mono">${productData.price.toLocaleString()}</span></p>}
                </div>
              </div>
            </div>
          )}
          <DeleteControls item={item} domain={domain} onDelete={onDelete} onRestore={onRestore} onPurge={onPurge} />
        </div>
      )}
    </div>
  );
};

const AdminInquiries = () => {
  const [activeTab, setActiveTab] = useState('bookings');
  const [showDeleted, setShowDeleted] = useState(false);
  const [data, setData] = useState({ bookings: [], productInquiries: [], sellInquiries: [], nameYourPrice: [] });
  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const qs = showDeleted ? '?include_deleted=true' : '';
      const [bookingsData, productInquiriesData, sellInquiriesData, nameYourPriceData, productsData] = await Promise.all([
        adminApi.get(`/admin/bookings${qs}`),
        adminApi.get(`/admin/product-inquiries${qs}`),
        adminApi.get(`/admin/sell-inquiries${qs}`),
        adminApi.get(`/admin/name-your-price-inquiries${qs}`),
        adminApi.get('/admin/products'),
      ]);
      const productMap = {};
      productsData.forEach(p => { productMap[p.id] = p; });
      setProducts(productMap);
      setData({ bookings: bookingsData, productInquiries: productInquiriesData, sellInquiries: sellInquiriesData, nameYourPrice: nameYourPriceData });
    } catch (error) {
      console.error('Failed to fetch inquiries:', error);
    } finally {
      setLoading(false);
    }
  }, [showDeleted]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (domain, id) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      await adminApi.post(`/admin/${domain}/${id}/delete`, {});
      fetchData();
    } catch (e) { console.error('Delete failed:', e); }
  };

  const handleRestore = async (domain, id) => {
    try {
      await adminApi.post(`/admin/${domain}/${id}/restore`);
      fetchData();
    } catch (e) { console.error('Restore failed:', e); }
  };

  const handlePurge = async (domain, id) => {
    try {
      await adminApi.delete(`/admin/${domain}/${id}?hard=true`);
      fetchData();
    } catch (e) { console.error('Purge failed:', e); }
  };

  const tabs = [
    { id: 'bookings', label: 'Bookings', icon: Calendar, count: data.bookings.length },
    { id: 'product', label: 'Product Inquiries', icon: MessageSquare, count: data.productInquiries.length },
    { id: 'sell', label: 'Sell Inquiries', icon: DollarSign, count: data.sellInquiries.length },
    { id: 'nyp', label: 'Name Your Price', icon: Tag, count: data.nameYourPrice.length },
  ];

  const domainMap = { bookings: 'bookings', product: 'product-inquiries', sell: 'sell-inquiries', nyp: 'nyp-inquiries' };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" /></div>;
  }

  const renderList = (items, type) => {
    if (items.length === 0) return <div className="gem-card p-8 text-center text-gray-500">No {type} yet</div>;
    return items.map(item => (
      <ExpandableCard key={item.id} item={item} type={type} domain={domainMap[activeTab]} productData={type === 'nyp' ? products[item.product_id] : null} onDelete={handleDelete} onRestore={handleRestore} onPurge={handlePurge}>
        {type === 'booking' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Name</p><p>{item.name}</p></div>
              <div><p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Email</p><a href={`mailto:${item.email}`} className="text-blue-400 hover:text-blue-300 flex items-center gap-1"><Mail className="w-3 h-3" /> {item.email}</a></div>
              <div><p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Phone</p><a href={`tel:${item.phone}`} className="text-blue-400 hover:text-blue-300 flex items-center gap-1"><Phone className="w-3 h-3" /> {item.phone}</a></div>
              <div><p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Service</p><p className="capitalize">{item.service}</p></div>
            </div>
            {item.description && <div><p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Description</p><p className="text-gray-400 text-sm bg-white/5 p-3">{item.description}</p></div>}
          </>
        )}
        {type === 'product' && (
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Name</p><p>{item.name}</p></div>
            <div><p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Email</p><a href={`mailto:${item.email}`} className="text-blue-400 hover:text-blue-300 flex items-center gap-1"><Mail className="w-3 h-3" /> {item.email}</a></div>
            <div><p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Product</p><p>{item.product_title}</p></div>
            {item.is_offer && <div><p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Offer</p><p className="text-green-400 font-mono">${item.offer_price}</p></div>}
          </div>
        )}
        {type === 'sell' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Name</p><p>{item.name}</p></div>
              <div><p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Email</p><a href={`mailto:${item.email}`} className="text-blue-400 hover:text-blue-300 flex items-center gap-1"><Mail className="w-3 h-3" /> {item.email}</a></div>
              <div><p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Asking Price</p><p className="font-mono">${item.asking_price}</p></div>
              <div><p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Negotiable</p><p>{item.negotiable ? 'Yes' : 'No'}</p></div>
            </div>
            <div><p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Description</p><p className="text-gray-400 text-sm bg-white/5 p-3">{item.description}</p></div>
          </>
        )}
        {type === 'nyp' && (
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Name</p><p>{item.name}</p></div>
            <div><p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Phone</p><a href={`tel:${item.phone}`} className="text-blue-400 hover:text-blue-300 flex items-center gap-1"><Phone className="w-3 h-3" /> {item.phone}</a></div>
            <div><p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Product</p><p>{item.product_title}</p></div>
            <div><p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Offered Price</p><p className="text-green-400 font-mono text-xl">${item.price}</p></div>
          </div>
        )}
      </ExpandableCard>
    ));
  };

  return (
    <div data-testid="admin-inquiries-page">
      <div className="flex items-center justify-between mb-8">
        <h1 className="page-title title-xl text-3xl">Inquiries</h1>
        <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer" data-testid="show-deleted-toggle">
          <input type="checkbox" checked={showDeleted} onChange={e => setShowDeleted(e.target.checked)} className="rounded border-white/20" />
          Show deleted
        </label>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${activeTab === tab.id ? 'bg-white text-black' : 'text-gray-500 hover:text-white border border-white/10'}`} data-testid={`tab-${tab.id}`}>
            <tab.icon className="w-4 h-4" />{tab.label}<span className="ml-1 text-xs opacity-70">({tab.count})</span>
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {activeTab === 'bookings' && renderList(data.bookings, 'booking')}
        {activeTab === 'product' && renderList(data.productInquiries, 'product')}
        {activeTab === 'sell' && renderList(data.sellInquiries, 'sell')}
        {activeTab === 'nyp' && renderList(data.nameYourPrice, 'nyp')}
      </div>
    </div>
  );
};

export default AdminInquiries;
