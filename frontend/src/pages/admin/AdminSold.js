import React, { useState, useEffect } from 'react';
import { Receipt, Package, Calendar, Truck, Mail, User, CreditCard, ChevronDown, ChevronUp, Send, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { adminApi } from '../../api/adminApi';

// Expandable Invoice Card
const InvoiceCard = ({ item, onUpdate }) => {
  const [expanded, setExpanded] = useState(false);
  const [trackingData, setTrackingData] = useState({
    tracking_number: item.tracking_number || '',
    tracking_carrier: item.tracking_carrier || '',
    user_notes: item.user_notes || ''
  });
  const [saving, setSaving] = useState(false);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const maskPaymentInfo = (info) => {
    if (!info) return 'N/A';
    if (info.length <= 4) return '****';
    return '****' + info.slice(-4);
  };

  const handleSaveTracking = async () => {
    setSaving(true);
    try {
      await adminApi.patch(`/admin/sold/${item.id}`, {
        tracking_number: trackingData.tracking_number,
        tracking_carrier: trackingData.tracking_carrier,
        tracking_entered_at: new Date().toISOString(),
        user_notes: trackingData.user_notes
      });
      toast.success('Tracking info saved');
      onUpdate();
    } catch (error) {
      toast.error('Failed to save tracking info');
    } finally {
      setSaving(false);
    }
  };

  const handleSendNotes = async () => {
    if (!trackingData.user_notes.trim()) {
      toast.error('Please enter notes to send');
      return;
    }
    setSaving(true);
    try {
      await axios.post(`${API_URL}/admin/sold/${item.id}/send-notes`, {
        notes: trackingData.user_notes
      }, getAuthHeaders());
      toast.success('Notes sent to user');
    } catch (error) {
      toast.error('Failed to send notes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="gem-card overflow-hidden" data-testid={`sold-item-${item.id}`}>
      {/* Header Row */}
      <div 
        className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-4">
          {/* Thumbnail */}
          {item.product_image && (
            <img 
              src={item.product_image} 
              alt={item.product_title} 
              className="w-16 h-16 object-cover flex-shrink-0"
            />
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">{item.product_title}</h3>
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5">SOLD</span>
            </div>
            <p className="text-sm text-gray-500">{item.buyer_name} • ${item.total_paid?.toLocaleString()}</p>
            <p className="text-xs text-gray-600">{formatDate(item.sold_at)}</p>
          </div>

          <div className="flex items-center gap-3">
            {item.email_sent && (
              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 flex items-center gap-1">
                <Mail className="w-3 h-3" /> Email Sent
              </span>
            )}
            {item.tracking_number && (
              <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 flex items-center gap-1">
                <Truck className="w-3 h-3" /> Tracked
              </span>
            )}
            {expanded ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
          </div>
        </div>
      </div>

      {/* Expanded Invoice Details */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-white/10 pt-4 space-y-6">
          {/* Invoice Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-gray-400" />
              <span className="font-semibold">Invoice #{item.invoice_number || item.id.slice(0, 8).toUpperCase()}</span>
            </div>
            <a 
              href={`/shop/${item.product_id}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" /> View Product
            </a>
          </div>

          {/* Order & Payment Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Date Sold</p>
              <p className="flex items-center gap-1"><Calendar className="w-3 h-3 text-gray-500" /> {formatDate(item.sold_at)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Date Paid</p>
              <p className="flex items-center gap-1"><Calendar className="w-3 h-3 text-gray-500" /> {formatDate(item.paid_at)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Payment Method</p>
              <p className="flex items-center gap-1"><CreditCard className="w-3 h-3 text-gray-500" /> {item.payment_method || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Payment Info</p>
              <p className="font-mono text-sm">{maskPaymentInfo(item.payment_last_four)}</p>
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="bg-white/5 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Item Price</span>
              <span>${item.item_price?.toLocaleString() || '0'}</span>
            </div>
            {item.shipping_cost > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Shipping</span>
                <span>${item.shipping_cost?.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold pt-2 border-t border-white/10">
              <span>Total Paid</span>
              <span className="text-green-400">${item.total_paid?.toLocaleString()}</span>
            </div>
          </div>

          {/* Buyer Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-1">
                <User className="w-3 h-3" /> Buyer Information
              </p>
              <div className="space-y-1 text-sm">
                <p>{item.buyer_name}</p>
                <p className="text-gray-400">{item.buyer_email}</p>
                <p className="text-gray-400">{item.buyer_phone}</p>
                {item.user_id && (
                  <p className="text-xs text-blue-400">Account ID: {item.user_id.slice(0, 8)}...</p>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">Shipping Address</p>
              <p className="text-sm text-gray-400 whitespace-pre-line">{item.shipping_address || 'N/A'}</p>
            </div>
          </div>

          {/* Email Verification */}
          <div className="bg-white/5 p-4 rounded">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-sm">Auto Email Status</span>
              </div>
              {item.email_sent ? (
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1">
                  Sent on {formatDate(item.email_sent_at)}
                </span>
              ) : (
                <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1">
                  Pending - Email Service Not Configured
                </span>
              )}
            </div>
          </div>

          {/* Tracking Details */}
          <div className="border border-white/10 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-gray-400" />
              <span className="font-semibold text-sm">Tracking Details</span>
              {item.tracking_entered_at && (
                <span className="text-xs text-gray-500 ml-auto">
                  Entered: {formatDate(item.tracking_entered_at)}
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Carrier</label>
                <select
                  value={trackingData.tracking_carrier}
                  onChange={(e) => setTrackingData(prev => ({ ...prev, tracking_carrier: e.target.value }))}
                  className="input-dark h-9 text-sm"
                >
                  <option value="">Select carrier...</option>
                  <option value="usps">USPS</option>
                  <option value="ups">UPS</option>
                  <option value="fedex">FedEx</option>
                  <option value="dhl">DHL</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Tracking Number</label>
                <input
                  type="text"
                  value={trackingData.tracking_number}
                  onChange={(e) => setTrackingData(prev => ({ ...prev, tracking_number: e.target.value }))}
                  className="input-dark h-9 text-sm font-mono"
                  placeholder="Enter tracking number"
                />
              </div>
            </div>

            <button 
              onClick={handleSaveTracking} 
              disabled={saving}
              className="btn-secondary text-sm w-full"
            >
              {saving ? 'Saving...' : 'Save Tracking (Auto-populates to User Account)'}
            </button>
          </div>

          {/* User Notes */}
          <div className="border border-white/10 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-gray-400" />
              <span className="font-semibold text-sm">Send Notes to Buyer</span>
            </div>
            
            <textarea
              value={trackingData.user_notes}
              onChange={(e) => setTrackingData(prev => ({ ...prev, user_notes: e.target.value }))}
              className="input-dark h-20 text-sm resize-none"
              placeholder="Add notes for the buyer (will appear in their invoice)..."
            />

            <button 
              onClick={handleSendNotes} 
              disabled={saving || !trackingData.user_notes.trim()}
              className="btn-primary text-sm w-full disabled:opacity-50"
            >
              <Send className="w-4 h-4 inline mr-2" />
              Send Notes to User
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminSold = () => {
  const { getAuthHeaders } = useAdmin();
  const [soldItems, setSoldItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSoldItems();
  }, []);

  const fetchSoldItems = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/sold`, getAuthHeaders());
      setSoldItems(response.data);
    } catch (error) {
      console.error('Failed to fetch sold items:', error);
    } finally {
      setLoading(false);
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
    <div data-testid="admin-sold-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl mb-2">Sold Items</h1>
          <p className="text-gray-500 text-sm">{soldItems.length} item(s) sold</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Package className="w-4 h-4" />
          <span>Click to expand invoice details</span>
        </div>
      </div>

      {soldItems.length === 0 ? (
        <div className="gem-card p-12 text-center">
          <Receipt className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500">No items sold yet</p>
          <p className="text-xs text-gray-600 mt-2">Sold items will appear here with full invoice details</p>
        </div>
      ) : (
        <div className="space-y-4">
          {soldItems.map(item => (
            <InvoiceCard 
              key={item.id} 
              item={item} 
              onUpdate={fetchSoldItems}
              getAuthHeaders={getAuthHeaders}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminSold;
