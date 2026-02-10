import React, { useState, useEffect } from 'react';
import { 
  Users, Mail, Calendar, Phone, ShoppingCart, Package, 
  MousePointer, Eye, Clock, MessageSquare, ChevronDown, 
  ChevronUp, ExternalLink, AlertTriangle, TrendingUp, Key
} from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import { toast } from 'sonner';

// Expandable User Card
const UserCard = ({ user, expanded, onToggle }) => {
  const [details, setDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

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

  return (
    <div className="gem-card overflow-hidden" data-testid={`user-card-${user.id}`}>
      {/* Header */}
      <div 
        className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={handleToggle}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
            <span className="font-serif text-lg">{user.name?.charAt(0).toUpperCase() || '?'}</span>
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
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  Messages to Admin ({details.messages?.length || 0})
                </h4>
                {details.messages?.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {details.messages.map((msg, i) => (
                      <div key={i} className="text-sm bg-white/5 p-2">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>{msg.subject || 'No subject'}</span>
                          <span>{formatDate(msg.created_at)}</span>
                        </div>
                        <p className="text-gray-400">{msg.message?.slice(0, 100)}...</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No messages</p>
                )}
              </div>
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

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await adminApi.get('/admin/users');
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
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
    <div data-testid="admin-users-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl mb-2">Users</h1>
          <p className="text-gray-500 text-sm">{users.length} registered user(s)</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Users className="w-4 h-4" />
          <span>Click to expand details</span>
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
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
