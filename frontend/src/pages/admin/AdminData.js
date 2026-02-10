import React, { useState, useEffect } from 'react';
import { 
  Database, Archive, Download, Trash2, Calendar, Package, 
  MessageSquare, Image, ShoppingBag, Clock, RefreshCw,
  FileText, ChevronDown, ChevronUp, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { adminApi } from '../../api/adminApi';

// Archive Item Card
const ArchiveCard = ({ item, type, onDownload, onPurge, expanded, onToggle }) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  return (
    <div className="gem-card overflow-hidden" data-testid={`archive-item-${item.id}`}>
      <div 
        className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm">{item.title || item.name || `${type} #${item.id?.slice(0,8)}`}</h3>
              <span className="text-xs bg-gray-500/20 text-gray-400 px-2 py-0.5">ARCHIVED</span>
            </div>
            <div className="flex gap-4 text-xs text-gray-500">
              <span>Created: {formatDate(item.created_at)}</span>
              <span>Archived: {formatDate(item.archived_at)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={(e) => { e.stopPropagation(); onDownload(item); }}
              className="p-2 hover:bg-white/10 transition-colors"
              title="Download as .txt"
            >
              <Download className="w-4 h-4 text-blue-400" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onPurge(item); }}
              className="p-2 hover:bg-white/10 transition-colors"
              title="Purge permanently"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>
            {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-white/10 pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Views</p>
              <p>{item.views || 0}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Clicks</p>
              <p>{item.clicks || 0}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Type</p>
              <p className="capitalize">{type}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Source</p>
              <p>{item.source || 'Website'}</p>
            </div>
          </div>
          {item.meta_links && (
            <div className="text-xs text-gray-500">
              <p className="uppercase tracking-widest mb-1">Meta Links</p>
              <p className="font-mono bg-white/5 p-2">{item.meta_links}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const AdminData = () => {
  const [activeTab, setActiveTab] = useState('sold');
  const [data, setData] = useState({
    sold: [],
    inquiries: [],
    bookings: [],
    deletedGallery: [],
    deletedProducts: [],
    allDeleted: []
  });
  const [expandedItems, setExpandedItems] = useState({});
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [soldData, inquiriesData, bookingsData, deletedGalleryData, deletedProductsData, allDeletedData] = await Promise.all([
        adminApi.get('/admin/data/archived/sold'),
        adminApi.get('/admin/data/archived/inquiries'),
        adminApi.get('/admin/data/archived/bookings'),
        adminApi.get('/admin/data/archived/gallery'),
        adminApi.get('/admin/data/archived/products'),
        adminApi.get('/admin/data/archived/all'),
      ]);
      
      setData({
        sold: soldData,
        inquiries: inquiriesData,
        bookings: bookingsData,
        deletedGallery: deletedGalleryData,
        deletedProducts: deletedProductsData,
        allDeleted: allDeletedData
      });
    } catch (error) {
      console.error('Failed to fetch archived data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRunArchive = async () => {
    setArchiving(true);
    try {
      await adminApi.post('/admin/data/archive/run', {});
      toast.success('Archive process completed');
      fetchData();
    } catch (error) {
      toast.error('Archive process failed');
    } finally {
      setArchiving(false);
    }
  };

  const handleDownload = async (item, type) => {
    try {
      const blob = await adminApi.downloadBlob(`/admin/data/download/${type}/${item.id}`);
      
      const blobObj = new Blob([blob], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blobObj);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_${item.id}_archive.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('Archive downloaded');
    } catch (error) {
      toast.error('Download failed');
    }
  };

  const handleDownloadBatch = async (type) => {
    try {
      const blob = await adminApi.downloadBlob(`/admin/data/download-batch/${type}`);
      
      const blobObj = new Blob([blob], { type: 'text/markdown' });
      const url = window.URL.createObjectURL(blobObj);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_batch_archive_${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('Batch archive downloaded');
    } catch (error) {
      toast.error('Batch download failed');
    }
  };

  const handlePurge = async (item, type) => {
    if (!window.confirm('Permanently delete this archived item? This cannot be undone.')) return;
    
    try {
      await adminApi.delete(`/admin/data/purge/${type}/${item.id}`);
      toast.success('Item purged');
      fetchData();
    } catch (error) {
      toast.error('Purge failed');
    }
  };

  const handlePurgeAll = async (type) => {
    if (!window.confirm(`Permanently delete ALL archived ${type}? This cannot be undone.`)) return;
    
    try {
      await adminApi.delete(`/admin/data/purge-all/${type}`);
      toast.success(`All ${type} purged`);
      fetchData();
    } catch (error) {
      toast.error('Purge failed');
    }
  };

  const toggleExpanded = (id) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const tabs = [
    { id: 'sold', label: 'Sold (30+ days)', icon: ShoppingBag, count: data.sold.length, days: 30 },
    { id: 'inquiries', label: 'Inquiries (30+ days)', icon: MessageSquare, count: data.inquiries.length, days: 30 },
    { id: 'bookings', label: 'Bookings (90+ days)', icon: Calendar, count: data.bookings.length, days: 90 },
    { id: 'deletedGallery', label: 'Deleted Gallery', icon: Image, count: data.deletedGallery.length },
    { id: 'deletedProducts', label: 'Deleted Products', icon: Package, count: data.deletedProducts.length },
    { id: 'allDeleted', label: 'All Deleted', icon: Trash2, count: data.allDeleted.length },
  ];

  const currentTab = tabs.find(t => t.id === activeTab);
  const currentData = data[activeTab] || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="admin-data-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title title-xl text-3xl mb-2">Data & Archives</h1>
          <p className="text-gray-500 text-sm">Manage archived and deleted items</p>
        </div>
        <button
          onClick={handleRunArchive}
          disabled={archiving}
          className="btn-secondary flex items-center gap-2"
          data-testid="run-archive-btn"
        >
          <RefreshCw className={`w-4 h-4 ${archiving ? 'animate-spin' : ''}`} />
          {archiving ? 'Archiving...' : 'Run Auto-Archive'}
        </button>
      </div>

      {/* Archive Info Banner */}
      <div className="gem-card p-4 mb-6 flex items-center gap-3 border-blue-500/30">
        <Clock className="w-5 h-5 text-blue-400" />
        <div className="flex-1">
          <p className="text-sm">Auto-archive runs daily: <span className="text-blue-400">Sold items after 30 days</span>, <span className="text-yellow-400">Inquiries after 30 days</span>, <span className="text-green-400">Bookings after 90 days</span></p>
        </div>
      </div>

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

      {/* Action Bar */}
      {currentData.length > 0 && (
        <div className="flex justify-between items-center mb-4 p-3 bg-white/5">
          <span className="text-sm text-gray-400">{currentData.length} archived items</span>
          <div className="flex gap-2">
            <button
              onClick={() => handleDownloadBatch(activeTab)}
              className="btn-secondary text-xs flex items-center gap-1"
            >
              <FileText className="w-3 h-3" /> Download All (.md)
            </button>
            <button
              onClick={() => handlePurgeAll(activeTab)}
              className="text-xs px-3 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" /> Purge All
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="space-y-3">
        {currentData.length === 0 ? (
          <div className="gem-card p-12 text-center">
            <Archive className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500">No archived {currentTab?.label.toLowerCase() || 'items'}</p>
            <p className="text-xs text-gray-600 mt-2">
              {currentTab?.days 
                ? `Items older than ${currentTab.days} days will appear here`
                : 'Deleted items will appear here for recovery or permanent removal'
              }
            </p>
          </div>
        ) : (
          currentData.map(item => (
            <ArchiveCard
              key={item.id}
              item={item}
              type={activeTab}
              expanded={expandedItems[item.id]}
              onToggle={() => toggleExpanded(item.id)}
              onDownload={(i) => handleDownload(i, activeTab)}
              onPurge={(i) => handlePurge(i, activeTab)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default AdminData;
