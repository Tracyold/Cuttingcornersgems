import React, { useState, useEffect } from 'react';
import { Receipt, Package, Calendar, Truck, Mail, User, CreditCard, ChevronDown, ChevronUp, Send, ExternalLink, Trash2, Clock, Check, RotateCcw, DollarSign, MapPin, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { adminApi } from '../../api/adminApi';

// Expandable Order Card - Shows full invoice with user details
const OrderCard = ({ order, onUpdate }) => {
  const [expanded, setExpanded] = useState(false);
  const [trackingData, setTrackingData] = useState({
    tracking_number: order.tracking_number || '',
    tracking_carrier: order.tracking_carrier || '',
    seller_notes: order.seller_notes || ''
  });
  const [saving, setSaving] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState('');

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const formatPrice = (p) => p ? `$${Number(p).toLocaleString()}` : '$0';

  const isPending = order.status === 'pending' && !order.paid_at;
  const isPaid = !!order.paid_at && !order.refunded_at;
  const isRefunded = !!order.refunded_at;

  const handleSaveTracking = async () => {
    setSaving(true);
    try {
      await adminApi.patch(`/admin/orders/${order.id}/tracking`, {
        tracking_number: trackingData.tracking_number,
        tracking_carrier: trackingData.tracking_carrier,
        seller_notes: trackingData.seller_notes
      });
      toast.success('Tracking info saved');
      onUpdate();
    } catch (error) {
      toast.error('Failed to save tracking info');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = async () => {
    setMarkingPaid(true);
    try {
      await adminApi.post(`/admin/orders/${order.id}/mark-paid`);
      toast.success('Order marked as paid');
      onUpdate();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to mark as paid');
    } finally {
      setMarkingPaid(false);
    }
  };

  const handleRemoveFromRevenue = async () => {
    if (!window.confirm('Remove this sale from revenue calculations?')) return;
    try {
      await adminApi.post(`/admin/orders/${order.id}/refund`, { reason: 'Return' });
      toast.success('Sale removed from revenue');
      onUpdate();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    }
  };

  const handleRestoreToRevenue = async () => {
    try {
      await adminApi.post(`/admin/orders/${order.id}/unrefund`);
      toast.success('Sale restored to revenue');
      onUpdate();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    }
  };

  const handleDeleteOrder = async () => {
    if (!window.confirm('Delete this order?')) return;
    try {
      await adminApi.post(`/admin/orders/${order.id}/delete`);
      toast.success('Order deleted');
      onUpdate();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Delete failed');
    }
  };

  const handleRestoreOrder = async () => {
    try {
      await adminApi.post(`/admin/orders/${order.id}/restore`);
      toast.success('Order restored');
      onUpdate();
    } catch (e) {
      toast.error('Restore failed');
    }
  };

  return (
    <div className={`gem-card overflow-hidden ${order.is_deleted ? 'opacity-50 border border-red-500/20' : ''}`} data-testid={`order-card-${order.id}`}>
      {/* Header Row */}
      <div 
        className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold">Order #{order.id.slice(0, 8)}</h3>
              {order.is_deleted && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5" data-testid="badge-deleted">DELETED</span>}
              {isRefunded ? (
                <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5" data-testid="badge-refunded">REFUNDED</span>
              ) : isPaid ? (
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5" data-testid="badge-paid">PAID</span>
              ) : (
                <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5" data-testid="badge-pending">PENDING</span>
              )}
              {order.tracking_number && (
                <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 flex items-center gap-1">
                  <Truck className="w-3 h-3" /> Tracked
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">
              {order.buyer_name || 'Unknown'} • {formatPrice(order.total)}
            </p>
            <p className="text-xs text-gray-600">{formatDate(order.created_at)}</p>
          </div>

          <div className="flex items-center gap-3">
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
              <span className="font-semibold">Invoice #{order.id.slice(0, 8).toUpperCase()}</span>
            </div>
            <div className="flex gap-2">
              {order.is_deleted ? (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleRestoreOrder(); }} 
                  className="text-xs px-3 py-1 bg-green-500/20 text-green-400 hover:bg-green-500/30"
                  data-testid={`restore-order-${order.id}`}
                >
                  Restore
                </button>
              ) : (
                <>
                  {isPending && (
                    <>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleMarkPaid(); }}
                        disabled={markingPaid}
                        className="text-xs px-3 py-1 bg-green-500/20 text-green-400 hover:bg-green-500/30"
                        data-testid={`mark-paid-${order.id}`}
                      >
                        {markingPaid ? 'Processing...' : 'Mark Paid'}
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteOrder(); }}
                        className="text-xs px-3 py-1 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                        data-testid={`delete-order-${order.id}`}
                      >
                        Delete
                      </button>
                    </>
                  )}
                  {isPaid && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleRemoveFromRevenue(); }}
                      className="text-xs px-3 py-1 bg-orange-500/20 text-orange-400 hover:bg-orange-500/30"
                      data-testid={`remove-revenue-${order.id}`}
                    >
                      Remove from Revenue
                    </button>
                  )}
                  {isRefunded && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleRestoreToRevenue(); }}
                      className="text-xs px-3 py-1 bg-green-500/20 text-green-400 hover:bg-green-500/30"
                      data-testid={`restore-revenue-${order.id}`}
                    >
                      Restore to Revenue
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Refund info banner */}
          {isRefunded && (
            <div className="bg-orange-500/10 border border-orange-500/20 p-3">
              <p className="text-sm text-orange-400 font-medium">Order Refunded</p>
              <p className="text-xs text-gray-400 mt-1">
                Refunded on {formatDate(order.refunded_at)} • Reason: {order.refund_reason || 'Not specified'}
              </p>
              <p className="text-xs text-gray-500 mt-1">This order is excluded from revenue calculations.</p>
            </div>
          )}

          {/* Order & Payment Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Created</p>
              <p className="flex items-center gap-1 text-sm"><Calendar className="w-3 h-3 text-gray-500" /> {formatDate(order.created_at)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Status</p>
              <p className={`text-sm ${isRefunded ? 'text-orange-400' : isPaid ? 'text-green-400' : 'text-yellow-400'}`}>
                {isRefunded ? 'Refunded' : isPaid ? 'Paid' : 'Pending (Commit)'}
              </p>
            </div>
            {isPaid && !isRefunded && (
              <div>
                <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Date Paid</p>
                <p className="flex items-center gap-1 text-sm"><Calendar className="w-3 h-3 text-gray-500" /> {formatDate(order.paid_at)}</p>
              </div>
            )}
            {order.commit_expires_at && !isPaid && (
              <div>
                <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Expires</p>
                <p className="flex items-center gap-1 text-sm text-yellow-400"><Clock className="w-3 h-3" /> {formatDate(order.commit_expires_at)}</p>
              </div>
            )}
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Payment Method</p>
              <p className="flex items-center gap-1 text-sm"><CreditCard className="w-3 h-3 text-gray-500" /> {order.payment_provider || 'Pending'}</p>
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white/5 p-4 space-y-2">
            <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">Order Items</p>
            {order.items?.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-400">{item.title || item.product_id?.slice(0, 8)} x{item.quantity}</span>
                <span>{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
            <div className="flex justify-between font-semibold pt-2 border-t border-white/10">
              <span>Total</span>
              <span className={isPaid ? 'text-green-400' : 'text-yellow-400'}>{formatPrice(order.total)}</span>
            </div>
          </div>

          {/* Buyer Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-white/10 p-4">
              <p className="text-xs uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-1">
                <User className="w-3 h-3" /> Buyer Information
              </p>
              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span>{order.buyer_name || 'Not provided'}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-400">{order.buyer_email || 'Not provided'}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-400">{order.buyer_phone || 'Not provided'}</span>
                </p>
                {order.user_id && (
                  <p className="text-xs text-blue-400 mt-2">Account ID: {order.user_id.slice(0, 8)}...</p>
                )}
              </div>
            </div>
            <div className="border border-white/10 p-4">
              <p className="text-xs uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Shipping Address
              </p>
              <p className="text-sm text-gray-400 whitespace-pre-line">{order.shipping_address || 'Not provided'}</p>
            </div>
          </div>

          {/* Tracking Details */}
          <div className="border border-white/10 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-gray-400" />
              <span className="font-semibold text-sm">Tracking Details</span>
              {order.tracking_entered_at && (
                <span className="text-xs text-gray-500 ml-auto">
                  Entered: {formatDate(order.tracking_entered_at)}
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Carrier</label>
                <select
                  value={trackingData.tracking_carrier}
                  onChange={(e) => setTrackingData(prev => ({ ...prev, tracking_carrier: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-white/30"
                  data-testid="tracking-carrier-select"
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
                  className="w-full bg-white/5 border border-white/10 px-3 py-2 text-sm font-mono focus:outline-none focus:border-white/30"
                  placeholder="Enter tracking number"
                  data-testid="tracking-number-input"
                />
              </div>
            </div>

            <button 
              onClick={handleSaveTracking} 
              disabled={saving}
              className="w-full py-2 text-sm border border-white/20 hover:border-white/40 transition-colors disabled:opacity-50"
              data-testid="save-tracking-btn"
            >
              {saving ? 'Saving...' : 'Save Tracking (Auto-populates to User Account)'}
            </button>
          </div>

          {/* Seller Notes */}
          <div className="border border-white/10 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-gray-400" />
              <span className="font-semibold text-sm">Notes for Buyer</span>
            </div>
            
            <textarea
              value={trackingData.seller_notes}
              onChange={(e) => setTrackingData(prev => ({ ...prev, seller_notes: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:border-white/30"
              placeholder="Add notes for the buyer (will appear in their invoice)..."
              data-testid="seller-notes-input"
            />

            <button 
              onClick={handleSaveTracking} 
              disabled={saving || !trackingData.seller_notes.trim()}
              className="w-full py-2 text-sm bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors disabled:opacity-50"
              data-testid="save-notes-btn"
            >
              <Send className="w-4 h-4 inline mr-2" />
              Save Notes
            </button>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setShowRefundModal(false)}>
          <div className="bg-gray-900 border border-white/10 p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Refund Order #{order.id.slice(0, 8)}</h3>
            <p className="text-sm text-gray-400 mb-4">
              This will remove <span className="text-orange-400 font-semibold">{formatPrice(order.total)}</span> from your revenue calculations.
            </p>
            <div className="mb-4">
              <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Reason for refund</label>
              <input
                type="text"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full bg-white/5 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-white/30"
                placeholder="e.g., Customer returned item, Quality issue..."
                data-testid="refund-reason-input"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRefundModal(false)}
                className="flex-1 py-2 text-sm border border-white/20 hover:border-white/40"
              >
                Cancel
              </button>
              <button
                onClick={handleRefund}
                disabled={refunding}
                className="flex-1 py-2 text-sm bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 disabled:opacity-50"
                data-testid="confirm-refund-btn"
              >
                {refunding ? 'Processing...' : 'Confirm Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Legacy Sold Item Card (for sold_items collection)
const LegacySoldCard = ({ item, onUpdate, onDelete, onRestore, onPurge }) => {
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

  return (
    <div className={`gem-card overflow-hidden ${item.is_deleted ? 'opacity-60' : ''}`} data-testid={`sold-item-${item.id}`}>
      {/* Header Row */}
      <div 
        className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-4">
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
            {item.tracking_number && (
              <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 flex items-center gap-1">
                <Truck className="w-3 h-3" /> Tracked
              </span>
            )}
            {expanded ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-white/10 pt-4 space-y-6">
          {/* Buyer Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-white/10 p-4">
              <p className="text-xs uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-1">
                <User className="w-3 h-3" /> Buyer Information
              </p>
              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span>{item.buyer_name}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-400">{item.buyer_email}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-400">{item.buyer_phone || 'Not provided'}</span>
                </p>
              </div>
            </div>
            <div className="border border-white/10 p-4">
              <p className="text-xs uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Shipping Address
              </p>
              <p className="text-sm text-gray-400 whitespace-pre-line">{item.shipping_address || 'Not provided'}</p>
            </div>
          </div>

          {/* Tracking */}
          <div className="border border-white/10 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-gray-400" />
              <span className="font-semibold text-sm">Tracking Details</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Carrier</label>
                <select
                  value={trackingData.tracking_carrier}
                  onChange={(e) => setTrackingData(prev => ({ ...prev, tracking_carrier: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-white/30"
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
                  className="w-full bg-white/5 border border-white/10 px-3 py-2 text-sm font-mono focus:outline-none focus:border-white/30"
                  placeholder="Enter tracking number"
                />
              </div>
            </div>

            <button 
              onClick={handleSaveTracking} 
              disabled={saving}
              className="w-full py-2 text-sm border border-white/20 hover:border-white/40 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Tracking'}
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 pb-3">
        {item.is_deleted ? (
          <>
            <span className="text-xs text-red-400">Deleted</span>
            <button onClick={() => onRestore(item.id)} className="text-xs px-3 py-1 bg-green-500/20 text-green-400 hover:bg-green-500/30">Restore</button>
            <button onClick={() => { if(window.prompt('Type PURGE to confirm') === 'PURGE') onPurge(item.id); }} className="text-xs px-3 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30">Purge</button>
          </>
        ) : (
          <button onClick={() => onDelete(item.id)} className="text-xs px-3 py-1 bg-red-500/10 text-red-400 hover:bg-red-500/20">Delete</button>
        )}
      </div>
    </div>
  );
};

const AdminSold = () => {
  const [soldItems, setSoldItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleted, setShowDeleted] = useState(false);
  const [activeSection, setActiveSection] = useState('pending');

  useEffect(() => {
    fetchData();
  }, [showDeleted]);

  const fetchData = async () => {
    try {
      const qs = showDeleted ? '?include_deleted=true' : '';
      const [soldData, ordersData] = await Promise.all([
        adminApi.get(`/admin/sold${qs}`),
        adminApi.get(`/admin/orders?include_deleted=true`),
      ]);
      setSoldItems(soldData);
      setOrders(ordersData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSold = async (id) => {
    if (!window.confirm('Are you sure you want to delete this sold record?')) return;
    try {
      await adminApi.post(`/admin/sold/${id}/delete`, {});
      fetchData();
      toast.success('Record deleted');
    } catch (e) { toast.error('Delete failed'); }
  };

  const handleRestoreSold = async (id) => {
    try {
      await adminApi.post(`/admin/sold/${id}/restore`);
      fetchData();
      toast.success('Record restored');
    } catch (e) { toast.error('Restore failed'); }
  };

  const handlePurgeSold = async (id) => {
    try {
      await adminApi.delete(`/admin/sold/${id}?hard=true`);
      fetchData();
      toast.success('Record permanently deleted');
    } catch (e) { toast.error('Purge failed'); }
  };

  // Filter orders into sections
  const now = new Date();
  const d30 = new Date(now - 30 * 86400000);
  const d365 = new Date(now - 365 * 86400000);

  const pendingOrders = orders.filter(o => o.status === 'pending' && !o.paid_at);
  const completedOrders = orders.filter(o => o.paid_at && new Date(o.paid_at) >= d30);
  const soldOrders = orders.filter(o => o.paid_at && new Date(o.paid_at) >= d365);

  const sections = [
    { key: 'pending', label: 'Pending (Commit)', count: pendingOrders.filter(o => !o.is_deleted).length, icon: Clock },
    { key: 'completed', label: 'Completed (30d)', count: completedOrders.filter(o => !o.is_deleted).length, icon: Check },
    { key: 'sold', label: 'Sold (365d)', count: soldOrders.filter(o => !o.is_deleted).length, icon: DollarSign },
    { key: 'legacy', label: 'Legacy Sold', count: soldItems.filter(s => !s.is_deleted).length, icon: Receipt },
  ];

  const activeOrders = activeSection === 'pending' ? pendingOrders
    : activeSection === 'completed' ? completedOrders
    : activeSection === 'sold' ? soldOrders
    : [];

  const filteredOrders = showDeleted ? activeOrders : activeOrders.filter(o => !o.is_deleted);

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
          <h1 className="page-title title-xl text-3xl mb-2">Orders & Sold Items</h1>
          <p className="text-gray-500 text-sm">{orders.filter(o => !o.is_deleted).length} order(s) total</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer" data-testid="show-deleted-toggle-sold">
          <input type="checkbox" checked={showDeleted} onChange={e => setShowDeleted(e.target.checked)} className="rounded border-white/20" />
          Show deleted
        </label>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap" data-testid="sold-section-tabs">
        {sections.map(s => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm border transition-colors ${activeSection === s.key ? 'border-white/30 text-white bg-white/5' : 'border-white/10 text-gray-500 hover:text-gray-300'}`}
            data-testid={`tab-${s.key}`}
          >
            <s.icon className="w-4 h-4" />
            {s.label}
            <span className="text-xs opacity-60">({s.count})</span>
          </button>
        ))}
      </div>

      {/* Order-based sections */}
      {activeSection !== 'legacy' && (
        <div className="space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="gem-card p-8 text-center">
              <p className="text-gray-500">No orders in this section</p>
            </div>
          ) : (
            filteredOrders.map(order => (
              <OrderCard 
                key={order.id} 
                order={order} 
                onUpdate={fetchData}
              />
            ))
          )}
        </div>
      )}

      {/* Legacy Sold Items */}
      {activeSection === 'legacy' && (
        <>
          {soldItems.length === 0 ? (
            <div className="gem-card p-12 text-center">
              <Receipt className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500">No legacy sold items</p>
            </div>
          ) : (
            <div className="space-y-4">
              {soldItems.map(item => (
                <LegacySoldCard 
                  key={item.id}
                  item={item} 
                  onUpdate={fetchData}
                  onDelete={handleDeleteSold}
                  onRestore={handleRestoreSold}
                  onPurge={handlePurgeSold}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminSold;
