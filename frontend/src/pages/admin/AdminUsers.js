import React, { useState, useEffect } from 'react';
import { 
  Users, Mail, Calendar, Phone, ShoppingCart, Package, 
  MousePointer, Eye, Clock, MessageSquare, ChevronDown, 
  ChevronUp, ExternalLink, AlertTriangle, TrendingUp, Key,
  ShieldOff, Trash2, ShieldCheck, Sparkles
} from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Expandable User Card
const UserCard = ({ user, expanded, onToggle, onUserUpdate, unreadCount, onMessagesRead }) => {
  const [details, setDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [togglingBlock, setTogglingBlock] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [overrideLoading, setOverrideLoading] = useState(false);
  const [overrideNote, setOverrideNote] = useState(user.nyp_override_note || '');
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageSubject, setMessageSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  const fetchDetails = async () => {
    if (details) return;
    setLoadingDetails(true);
    try {
      const data = await adminApi.get(`/admin/users/${user.id}/details`);
      setDetails(data);
      
      // Mark messages as read when user is expanded
      if (unreadCount > 0) {
        try {
          const token = localStorage.getItem('adminToken');
          await axios.patch(`${API_URL}/api/admin/users/${user.id}/messages/mark-read`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (onMessagesRead) onMessagesRead(user.id);
        } catch (err) {
          console.error('Failed to mark messages as read:', err);
        }
      }
    } catch (error) {
      console.error('Failed to fetch user details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleToggle = () => {
    if (!expanded) {
      fetchDetails();
    }
    onToggle();
  };

  const handleResetPassword = async () => {
    if (!confirm(`Send password reset email to ${user.email}?`)) return;
    
    setResettingPassword(true);
    try {
      await adminApi.post(`/admin/users/${user.id}/password-reset`);
      toast.success(`Password reset email sent to ${user.email}`);
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to send password reset email';
      toast.error(message);
    } finally {
      setResettingPassword(false);
    }
  };

  const handleToggleBlock = async () => {
    const newBlockedState = !user.purchase_blocked;
    const action = newBlockedState ? 'block' : 'unblock';
    
    if (!confirm(`Are you sure you want to ${action} purchases for ${user.email}?`)) return;
    
    setTogglingBlock(true);
    try {
      await adminApi.patch(`/admin/users/${user.id}/status`, {
        purchase_blocked: newBlockedState,
        purchase_block_reason: newBlockedState ? 'admin_blocked' : null
      });
      toast.success(`User ${action}ed successfully`);
      if (onUserUpdate) onUserUpdate();
    } catch (error) {
      const message = error.response?.data?.detail || `Failed to ${action} user`;
      toast.error(message);
    } finally {
      setTogglingBlock(false);
    }
  };

  const handleDeleteUser = async () => {
    setDeleting(true);
    try {
      await adminApi.post(`/admin/users/${user.id}/delete`);
      toast.success('User account deleted');
      setShowDeleteConfirm(false);
      if (onUserUpdate) onUserUpdate();
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to delete user';
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleOverride = async () => {
    const newState = !user.nyp_override_enabled;
    setOverrideLoading(true);
    try {
      await adminApi.patch(`/admin/users/${user.id}/entitlements`, {
        override_enabled: newState,
        note: overrideNote || null
      });
      toast.success(newState ? 'HB/NYP override enabled' : 'HB/NYP override disabled');
      if (onUserUpdate) onUserUpdate();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update override');
    } finally {
      setOverrideLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageSubject.trim() || !messageBody.trim()) {
      toast.error('Please enter both subject and message');
      return;
    }
    setSendingMessage(true);
    try {
      await adminApi.post(`/admin/users/${user.id}/message`, {
        subject: messageSubject,
        message: messageBody
      });
      toast.success(`Message sent to ${user.name || user.email}`);
      setShowMessageModal(false);
      setMessageSubject('');
      setMessageBody('');
      // Refresh details to show new message
      setDetails(null);
      fetchDetails();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const isDeleted = user.is_deleted;
  const isBlocked = user.purchase_blocked;

  return (
    <div className="gem-card overflow-hidden" data-testid={`user-card-${user.id}`}>
      {/* Header */}
      <div 
        className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={handleToggle}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
            <span className="title-sm text-lg">{user.name?.charAt(0).toUpperCase() || '?'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold">{user.name}</h3>
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {user.email}</span>
              {user.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {user.phone}</span>}
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Joined {formatDate(user.created_at)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full min-w-[20px] text-center font-semibold" data-testid="badge-unread">
                {unreadCount}
              </span>
            )}
            {user.nyp_override_enabled && (
              <span className="text-xs bg-amber-500/30 text-amber-400 px-2 py-0.5 font-semibold" data-testid="badge-override">OVERRIDE ON</span>
            )}
            {isDeleted && (
              <span className="text-xs bg-red-500/30 text-red-400 px-2 py-0.5 font-semibold" data-testid="badge-deleted">DELETED</span>
            )}
            {isBlocked && !isDeleted && (
              <span className="text-xs bg-orange-500/30 text-orange-400 px-2 py-0.5 font-semibold" data-testid="badge-blocked">BLOCKED</span>
            )}
            {user.total_orders > 0 && (
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5">{user.total_orders} orders</span>
            )}
            {user.cart_items > 0 && (
              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5">{user.cart_items} in cart</span>
            )}
            {expanded ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-white/10 pt-4">
          {loadingDetails ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          ) : details ? (
            <div className="space-y-6">
              {/* Contact Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Email</p>
                  <p className="text-sm">{details.email}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Name</p>
                  <p className="text-sm">{details.name}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Phone</p>
                  <p className="text-sm">{details.phone || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Member Since</p>
                  <p className="text-sm">{formatDate(details.created_at)}</p>
                </div>
              </div>

              {/* Analytics Section */}
              <div className="border border-white/10 p-4 space-y-4">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-gray-400" />
                  User Analytics
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Click Through Rate</p>
                    <p className="font-mono text-lg">{details.analytics?.click_through_rate || '0'}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Most Clicked Item</p>
                    <p className="truncate">{details.analytics?.most_clicked_item || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Longest View</p>
                    <p>{details.analytics?.longest_view_time || '0'}s on {details.analytics?.longest_view_page || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Shortest View</p>
                    <p>{details.analytics?.shortest_view_time || '0'}s on {details.analytics?.shortest_view_page || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Orders */}
              <div className="border border-white/10 p-4 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Package className="w-4 h-4 text-gray-400" />
                  Past Orders ({details.orders?.length || 0})
                </h4>
                {details.orders?.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {details.orders.map((order, i) => (
                      <div key={i} className="flex items-center justify-between text-sm bg-white/5 p-2">
                        <span>Order #{order.id?.slice(0,8)}</span>
                        <span className="text-gray-500">{formatDate(order.created_at)}</span>
                        <span className="text-green-400 font-mono">${order.total?.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No orders yet</p>
                )}
              </div>

              {/* Cart Items */}
              <div className="border border-white/10 p-4 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-gray-400" />
                  Items in Cart ({details.cart_items?.length || 0})
                </h4>
                {details.cart_items?.length > 0 ? (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {details.cart_items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-sm bg-white/5 p-2">
                        <span className="truncate flex-1">{item.title}</span>
                        <span className="text-blue-400 font-mono ml-2">${item.price?.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Cart is empty</p>
                )}
              </div>

              {/* Abandoned Items */}
              {details.abandoned_items?.length > 0 && (
                <div className="border border-yellow-500/30 p-4 space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2 text-yellow-400">
                    <AlertTriangle className="w-4 h-4" />
                    Abandoned Items ({details.abandoned_items.length})
                  </h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {details.abandoned_items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-sm bg-white/5 p-2">
                        <span className="truncate flex-1">{item.title}</span>
                        <span className="text-gray-500 text-xs">{formatDate(item.abandoned_at)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Inquiries */}
              <div className="border border-white/10 p-4 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-gray-400" />
                  Inquiries ({(details.inquiries?.length || 0) + (details.bookings?.length || 0)})
                </h4>
                {(details.inquiries?.length > 0 || details.bookings?.length > 0) ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {details.bookings?.map((item, i) => (
                      <div key={`b-${i}`} className="flex items-center justify-between text-sm bg-white/5 p-2">
                        <span className="text-xs bg-green-500/20 text-green-400 px-1">Booking</span>
                        <span className="truncate flex-1 ml-2">{item.service} - {item.stone_type}</span>
                        <span className="text-gray-500 text-xs">{formatDate(item.created_at)}</span>
                      </div>
                    ))}
                    {details.inquiries?.map((item, i) => (
                      <div key={`i-${i}`} className="flex items-center justify-between text-sm bg-white/5 p-2">
                        <span className="text-xs bg-blue-500/20 text-blue-400 px-1">{item.type || 'Inquiry'}</span>
                        <span className="truncate flex-1 ml-2">{item.product_title || item.description?.slice(0,30)}</span>
                        <span className="text-gray-500 text-xs">{formatDate(item.created_at)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No inquiries</p>
                )}
              </div>

              {/* Messages to Admin */}
              <div className="border border-white/10 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    Messages ({details.messages?.length || 0})
                  </h4>
                  <button
                    onClick={() => setShowMessageModal(true)}
                    className="text-xs bg-blue-500/20 text-blue-400 px-3 py-1 hover:bg-blue-500/30 transition-colors flex items-center gap-1"
                    data-testid="send-message-btn"
                  >
                    <Mail className="w-3 h-3" />
                    Send Message
                  </button>
                </div>
                {details.messages?.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {details.messages.map((msg, i) => (
                      <div key={i} className={`text-sm p-2 ${msg.from_admin ? 'bg-amber-500/10 border-l-2 border-amber-500' : 'bg-teal-500/10 border-l-2 border-teal-500'}`}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="flex items-center gap-2">
                            {msg.from_admin ? (
                              <span className="bg-amber-500 text-black text-[10px] px-1.5 py-0.5 rounded font-semibold">ADMIN</span>
                            ) : (
                              <span className="bg-teal-500 text-black text-[10px] px-1.5 py-0.5 rounded font-semibold">USER</span>
                            )}
                            <span className="text-gray-500">{msg.subject || 'No subject'}</span>
                          </span>
                          <span className="text-gray-500">{formatDate(msg.created_at)}</span>
                        </div>
                        <p className="text-gray-400">{msg.message?.slice(0, 100)}{msg.message?.length > 100 ? '...' : ''}</p>
                        {msg.replies?.length > 0 && (
                          <div className="mt-2 pl-2 border-l-2 border-amber-500/50 space-y-1">
                            {msg.replies.map((reply, ri) => (
                              <div key={ri} className="text-xs">
                                <span className="bg-amber-500 text-black text-[9px] px-1 py-0.5 rounded font-semibold mr-1">ADMIN</span>
                                <span className="text-gray-500">{formatDate(reply.created_at)}:</span> 
                                <span className="text-amber-300 ml-1">{reply.message?.slice(0, 80)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No messages</p>
                )}
              </div>

              {/* HB/NYP Override */}
              {!isDeleted && (
                <div className="border border-amber-500/20 p-4 space-y-3" data-testid="override-section">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      HB / NYP Override
                    </h4>
                    <button
                      onClick={handleToggleOverride}
                      disabled={overrideLoading}
                      className={`relative w-11 h-6 rounded-full transition-colors ${user.nyp_override_enabled ? 'bg-amber-500' : 'bg-gray-700'}`}
                      data-testid="override-toggle"
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${user.nyp_override_enabled ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    {user.nyp_override_enabled 
                      ? 'User has full access to Humble Beginnings & Name Your Price.' 
                      : 'Enable to grant threshold-gated access without purchases.'}
                  </p>
                  <input
                    type="text"
                    value={overrideNote}
                    onChange={e => setOverrideNote(e.target.value)}
                    placeholder="Optional note (e.g., VIP, comp'd)"
                    className="w-full bg-white/5 border border-white/10 px-3 py-1.5 text-sm text-gray-300 placeholder:text-gray-600 focus:border-amber-500/50 focus:outline-none"
                    data-testid="override-note"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 border-t border-white/10 flex flex-wrap gap-3">
                <button
                  onClick={handleResetPassword}
                  disabled={resettingPassword || isDeleted}
                  className="btn-secondary text-sm flex items-center gap-2"
                  data-testid="reset-password-btn"
                >
                  <Key className="w-4 h-4" />
                  {resettingPassword ? 'Sending...' : 'Send Password Reset'}
                </button>
                
                {!isDeleted && (
                  <button
                    onClick={handleToggleBlock}
                    disabled={togglingBlock}
                    className={`text-sm flex items-center gap-2 px-3 py-1.5 border transition-colors ${
                      isBlocked 
                        ? 'border-green-500/50 text-green-400 hover:bg-green-500/10' 
                        : 'border-orange-500/50 text-orange-400 hover:bg-orange-500/10'
                    }`}
                    data-testid="toggle-block-btn"
                  >
                    {isBlocked ? <ShieldCheck className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                    {togglingBlock ? 'Updating...' : (isBlocked ? 'Unblock Purchases' : 'Block Purchases')}
                  </button>
                )}
                
                {!isDeleted && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-sm flex items-center gap-2 px-3 py-1.5 border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors"
                    data-testid="delete-user-btn"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete User
                  </button>
                )}
              </div>
              
              {/* Delete Confirmation Modal */}
              {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setShowDeleteConfirm(false)}>
                  <div className="bg-[#0a0a0a] border border-white/10 p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
                    <h3 className="title-sm text-xl mb-4">Delete User Account</h3>
                    <p className="text-gray-400 text-sm mb-4">
                      Soft-delete disables login and purchases. Order history, bookings, and inquiries are preserved.
                    </p>
                    <p className="text-sm mb-4">
                      User: <span className="text-white">{user.email}</span>
                    </p>
                    <div className="flex gap-3 justify-end">
                      <button 
                        onClick={() => setShowDeleteConfirm(false)}
                        className="btn-secondary text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDeleteUser}
                        disabled={deleting}
                        className="text-sm px-4 py-2 bg-red-600 hover:bg-red-700 text-white transition-colors"
                        data-testid="confirm-delete-btn"
                      >
                        {deleting ? 'Deleting...' : 'Delete Account'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Send Message Modal */}
              {showMessageModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setShowMessageModal(false)}>
                  <div className="bg-[#0a0a0a] border border-white/10 p-6 max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
                    <h3 className="title-sm text-xl mb-4 flex items-center gap-2">
                      <Mail className="w-5 h-5 text-blue-400" />
                      Send Message to {user.name || user.email}
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs uppercase tracking-widest text-gray-500 mb-1 block">Subject</label>
                        <input
                          type="text"
                          value={messageSubject}
                          onChange={(e) => setMessageSubject(e.target.value)}
                          placeholder="Message subject..."
                          className="w-full bg-white/5 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                          data-testid="message-subject-input"
                        />
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-widest text-gray-500 mb-1 block">Message</label>
                        <textarea
                          value={messageBody}
                          onChange={(e) => setMessageBody(e.target.value)}
                          placeholder="Type your message..."
                          rows={5}
                          className="w-full bg-white/5 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none"
                          data-testid="message-body-input"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 justify-end mt-6">
                      <button 
                        onClick={() => {
                          setShowMessageModal(false);
                          setMessageSubject('');
                          setMessageBody('');
                        }}
                        className="btn-secondary text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSendMessage}
                        disabled={sendingMessage || !messageSubject.trim() || !messageBody.trim()}
                        className="text-sm px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        data-testid="confirm-send-message-btn"
                      >
                        {sendingMessage ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Mail className="w-4 h-4" />
                            Send Message
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">Failed to load details</p>
          )}
        </div>
      )}
    </div>
  );
};

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});

  const fetchUsers = async () => {
    try {
      const qs = showDeleted ? '?include_deleted=true' : '';
      const data = await adminApi.get(`/admin/users${qs}`);
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCounts = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) return;
      const response = await axios.get(`${API_URL}/api/admin/messages/unread-counts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnreadCounts(response.data.per_user || {});
    } catch (error) {
      console.error('Failed to fetch unread counts:', error);
    }
  };

  const handleMessagesRead = (userId) => {
    setUnreadCounts(prev => {
      const updated = { ...prev };
      delete updated[userId];
      return updated;
    });
  };

  useEffect(() => {
    fetchUsers();
    fetchUnreadCounts();
  }, [showDeleted]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="admin-users-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title title-xl text-3xl mb-2">Users</h1>
          <p className="text-gray-500 text-sm">{users.length} registered user(s)</p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer" data-testid="show-deleted-toggle">
            <input type="checkbox" checked={showDeleted} onChange={e => setShowDeleted(e.target.checked)} className="rounded border-white/20" />
            Show deleted
          </label>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Users className="w-4 h-4" />
            <span>Click to expand details</span>
          </div>
        </div>
      </div>

      {users.length === 0 ? (
        <div className="gem-card p-8 text-center">
          <Users className="w-12 h-12 mx-auto text-gray-600 mb-4" />
          <p className="text-gray-500">No registered users yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {users.map(user => (
            <UserCard 
              key={user.id} 
              user={user}
              expanded={expandedUser === user.id}
              onToggle={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
              onUserUpdate={fetchUsers}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
