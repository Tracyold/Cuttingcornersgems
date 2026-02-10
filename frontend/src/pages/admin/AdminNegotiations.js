import React, { useState, useEffect, useCallback } from 'react';
import { 
  DollarSign, 
  MessageSquare, 
  Check, 
  X, 
  Clock,
  ChevronDown,
  ChevronUp,
  User,
  Package,
  Send,
  AlertCircle,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import { toast } from 'sonner';

// Status badge component
const StatusBadge = ({ status }) => {
  const styles = {
    OPEN: 'bg-blue-500/20 text-blue-400',
    ACCEPTED: 'bg-green-500/20 text-green-400',
    CLOSED: 'bg-gray-500/20 text-gray-400'
  };

  return (
    <span className={`text-xs px-2 py-1 uppercase tracking-wider ${styles[status] || styles.CLOSED}`}>
      {status}
    </span>
  );
};

// Message kind badge
const KindBadge = ({ kind }) => {
  const styles = {
    OFFER: 'bg-amber-500/20 text-amber-400',
    COUNTER: 'bg-purple-500/20 text-purple-400',
    NOTE: 'bg-gray-500/20 text-gray-400',
    ACCEPT: 'bg-green-500/20 text-green-400',
    CLOSE: 'bg-red-500/20 text-red-400'
  };

  return (
    <span className={`text-xs px-2 py-0.5 uppercase ${styles[kind] || styles.NOTE}`}>
      {kind}
    </span>
  );
};

// Negotiation thread detail view
const NegotiationDetail = ({ negotiationId, onBack }) => {
  const [thread, setThread] = useState(null);
  const [loading, setLoading] = useState(true);
  const [counterAmount, setCounterAmount] = useState('');
  const [counterText, setCounterText] = useState('');
  const [acceptAmount, setAcceptAmount] = useState('');
  const [acceptTtl, setAcceptTtl] = useState('30');
  const [closeText, setCloseText] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const loadThread = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi.get(`/admin/negotiations/${negotiationId}`);
      setThread(data);
      
      // Pre-fill accept amount with last offer amount
      const lastOffer = [...data.messages].reverse().find(m => m.kind === 'OFFER' || m.kind === 'COUNTER');
      if (lastOffer?.amount) {
        setAcceptAmount(lastOffer.amount.toString());
        setCounterAmount(lastOffer.amount.toString());
      }
    } catch (error) {
      toast.error('Failed to load negotiation');
    } finally {
      setLoading(false);
    }
  }, [negotiationId]);

  useEffect(() => {
    loadThread();
  }, [loadThread]);

  const handleCounter = async () => {
    if (!counterAmount) {
      toast.error('Please enter a counter amount');
      return;
    }
    try {
      setActionLoading('counter');
      await adminApi.post(`/admin/negotiations/${negotiationId}/counter`, {
        amount: parseFloat(counterAmount),
        text: counterText || null
      });
      toast.success('Counter-offer sent');
      setCounterAmount('');
      setCounterText('');
      await loadThread();
    } catch (error) {
      toast.error('Failed to send counter-offer');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAccept = async () => {
    if (!acceptAmount) {
      toast.error('Please enter an accept amount');
      return;
    }
    try {
      setActionLoading('accept');
      await adminApi.post(`/admin/negotiations/${negotiationId}/accept`, {
        amount: parseFloat(acceptAmount),
        ttl_minutes: parseInt(acceptTtl)
      });
      toast.success('Offer accepted! Purchase agreement created.');
      await loadThread();
    } catch (error) {
      toast.error('Failed to accept offer');
    } finally {
      setActionLoading(null);
    }
  };

  const handleClose = async () => {
    try {
      setActionLoading('close');
      await adminApi.post(`/admin/negotiations/${negotiationId}/close`, {
        text: closeText || null
      });
      toast.success('Negotiation closed');
      await loadThread();
    } catch (error) {
      toast.error('Failed to close negotiation');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="text-center py-8 text-gray-500">
        Negotiation not found
      </div>
    );
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white text-sm flex items-center gap-1"
        >
          ← Back to list
        </button>
        <StatusBadge status={thread.status} />
      </div>

      {/* Product & User Info */}
      <div className="gem-card p-4 space-y-4">
        <div className="flex items-start gap-4">
          <Package className="w-5 h-5 text-gray-500 mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold">{thread.product_title}</h3>
            <p className="text-gray-500 text-sm">
              Listed Price: <span className="text-white font-mono">${thread.product_price?.toLocaleString()}</span>
            </p>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <User className="w-5 h-5 text-gray-500 mt-1" />
          <div>
            <p className="font-medium">{thread.user_name}</p>
            <p className="text-gray-500 text-sm">{thread.user_email}</p>
          </div>
        </div>
        <p className="text-xs text-gray-600">Started: {formatDate(thread.created_at)}</p>
      </div>

      {/* Agreement Info (if accepted) */}
      {thread.agreement && (
        <div className="gem-card p-4 border-green-500/30 bg-green-500/5">
          <div className="flex items-center gap-2 text-green-400 mb-2">
            <Check className="w-5 h-5" />
            <span className="font-semibold">Purchase Agreement Active</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Accepted Amount</p>
              <p className="text-lg font-mono text-green-400">${thread.agreement.accepted_amount}</p>
            </div>
            <div>
              <p className="text-gray-500">Expires</p>
              <p className="text-white">{formatDate(thread.agreement.expires_at)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="space-y-3">
        <h4 className="text-sm uppercase tracking-widest text-gray-500">Messages</h4>
        {thread.messages.map((msg, idx) => (
          <div 
            key={msg.message_id || idx}
            className={`gem-card p-4 ${msg.sender_role === 'ADMIN' ? 'border-l-2 border-purple-500' : 'border-l-2 border-amber-500'}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`text-xs uppercase ${msg.sender_role === 'ADMIN' ? 'text-purple-400' : 'text-amber-400'}`}>
                  {msg.sender_role}
                </span>
                <KindBadge kind={msg.kind} />
              </div>
              <span className="text-xs text-gray-600">{formatDate(msg.created_at)}</span>
            </div>
            {msg.amount !== null && (
              <p className="text-lg font-mono mb-1">
                ${msg.amount.toLocaleString()}
              </p>
            )}
            {msg.text && <p className="text-gray-400 text-sm">{msg.text}</p>}
          </div>
        ))}
      </div>

      {/* Actions (only if OPEN) */}
      {thread.status === 'OPEN' && (
        <div className="space-y-4">
          <h4 className="text-sm uppercase tracking-widest text-gray-500">Actions</h4>
          
          {/* Counter Offer */}
          <div className="gem-card p-4 space-y-3">
            <div className="flex items-center gap-2 text-purple-400">
              <MessageSquare className="w-4 h-4" />
              <span className="text-sm font-semibold uppercase">Counter Offer</span>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="number"
                  value={counterAmount}
                  onChange={(e) => setCounterAmount(e.target.value)}
                  placeholder="Amount"
                  className="input-dark w-full"
                />
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={counterText}
                  onChange={(e) => setCounterText(e.target.value)}
                  placeholder="Message (optional)"
                  className="input-dark w-full"
                />
              </div>
            </div>
            <button
              onClick={handleCounter}
              disabled={actionLoading === 'counter'}
              className="btn-secondary w-full flex items-center justify-center gap-2"
            >
              {actionLoading === 'counter' ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Counter
                </>
              )}
            </button>
          </div>

          {/* Accept */}
          <div className="gem-card p-4 space-y-3 border-green-500/30">
            <div className="flex items-center gap-2 text-green-400">
              <Check className="w-4 h-4" />
              <span className="text-sm font-semibold uppercase">Accept Offer</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">Accept Amount</label>
                <input
                  type="number"
                  value={acceptAmount}
                  onChange={(e) => setAcceptAmount(e.target.value)}
                  placeholder="Amount"
                  className="input-dark w-full"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Token TTL (minutes)</label>
                <input
                  type="number"
                  value={acceptTtl}
                  onChange={(e) => setAcceptTtl(e.target.value)}
                  placeholder="30"
                  className="input-dark w-full"
                />
              </div>
            </div>
            <button
              onClick={handleAccept}
              disabled={actionLoading === 'accept'}
              className="w-full py-2 bg-green-500/20 border border-green-500/50 text-green-400 hover:bg-green-500/30 transition-colors flex items-center justify-center gap-2"
            >
              {actionLoading === 'accept' ? (
                <div className="animate-spin w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Accept & Create Agreement
                </>
              )}
            </button>
            <p className="text-xs text-gray-600">
              Creates a time-limited purchase token for the user. Does NOT change product price.
            </p>
          </div>

          {/* Close */}
          <div className="gem-card p-4 space-y-3 border-red-500/30">
            <div className="flex items-center gap-2 text-red-400">
              <X className="w-4 h-4" />
              <span className="text-sm font-semibold uppercase">Close Negotiation</span>
            </div>
            <input
              type="text"
              value={closeText}
              onChange={(e) => setCloseText(e.target.value)}
              placeholder="Closing message (optional)"
              className="input-dark w-full"
            />
            <button
              onClick={handleClose}
              disabled={actionLoading === 'close'}
              className="w-full py-2 bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2"
            >
              {actionLoading === 'close' ? (
                <div className="animate-spin w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full" />
              ) : (
                <>
                  <X className="w-4 h-4" />
                  Close Negotiation
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Main Admin Negotiations Page
const AdminNegotiations = () => {
  const [negotiations, setNegotiations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('OPEN');
  const [selectedId, setSelectedId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [showDeleted, setShowDeleted] = useState(false);

  const loadNegotiations = useCallback(async () => {
    try {
      setLoading(true);
      let params = statusFilter ? `?status=${statusFilter}` : '?';
      if (showDeleted) params += `${params.includes('?') && params.length > 1 ? '&' : params.endsWith('?') ? '' : '?'}include_deleted=true`;
      const data = await adminApi.get(`/admin/negotiations${params}`);
      setNegotiations(data);
    } catch (error) {
      if (error.response?.status !== 401) {
        toast.error('Failed to load negotiations');
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, showDeleted]);

  useEffect(() => {
    loadNegotiations();
  }, [loadNegotiations]);

  const handleDeleteNeg = async (id) => {
    if (!window.confirm('Delete this negotiation?')) return;
    try {
      await adminApi.post(`/admin/negotiations/${id}/delete`, {});
      toast.success('Negotiation deleted');
      loadNegotiations();
    } catch (e) { toast.error('Delete failed'); }
  };

  const handleRestoreNeg = async (id) => {
    try {
      await adminApi.post(`/admin/negotiations/${id}/restore`);
      toast.success('Negotiation restored');
      loadNegotiations();
    } catch (e) { toast.error('Restore failed'); }
  };

  const handlePurgeNeg = async (id) => {
    if (window.prompt('Type PURGE to confirm permanent deletion') !== 'PURGE') return;
    try {
      await adminApi.delete(`/admin/negotiations/${id}?hard=true`);
      toast.success('Negotiation permanently deleted');
      loadNegotiations();
    } catch (e) { toast.error('Purge failed'); }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (selectedId) {
    return (
      <div className="min-h-screen bg-[#050505] p-6">
        <div className="max-w-4xl mx-auto">
          <NegotiationDetail 
            negotiationId={selectedId} 
            onBack={() => {
              setSelectedId(null);
              loadNegotiations();
            }} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="title-sm text-2xl">Negotiations</h1>
          <p className="text-gray-500 text-sm">Name Your Price offers and agreements</p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer" data-testid="show-deleted-toggle-neg">
            <input type="checkbox" checked={showDeleted} onChange={e => setShowDeleted(e.target.checked)} className="rounded border-white/20" />
            Show deleted
          </label>
          <div className="flex gap-2">
            {['OPEN', 'ACCEPTED', 'CLOSED', ''].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 text-sm uppercase tracking-wider border ${
                statusFilter === status
                  ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                  : 'border-white/10 text-gray-400 hover:border-white/20'
              }`}
            >
              {status || 'All'}
            </button>
          ))}
          </div>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full" />
        </div>
      ) : negotiations.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No negotiations found</p>
          <p className="text-sm mt-1">
            {statusFilter ? `No ${statusFilter.toLowerCase()} negotiations` : 'Create your first Name Your Price offer'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {negotiations.map((neg) => (
            <div 
              key={neg.negotiation_id}
              className={`gem-card overflow-hidden ${neg.is_deleted ? 'opacity-60 border-red-500/30' : ''}`}
              data-testid={`negotiation-${neg.negotiation_id}`}
            >
              <div 
                className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => setExpandedId(expandedId === neg.negotiation_id ? null : neg.negotiation_id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{neg.product_title}</h3>
                      <StatusBadge status={neg.status} />
                    </div>
                    <p className="text-sm text-gray-500">
                      {neg.user_name} • {neg.user_email}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {neg.message_count} messages
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(neg.last_activity_at)}
                      </span>
                      {neg.last_amount && (
                        <span className="flex items-center gap-1 text-amber-400">
                          <DollarSign className="w-3 h-3" />
                          ${neg.last_amount.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Listed: ${neg.product_price?.toLocaleString()}</span>
                    {expandedId === neg.negotiation_id ? (
                      <ChevronUp className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded preview */}
              {expandedId === neg.negotiation_id && (
                <div className="px-4 pb-4 border-t border-white/10 pt-4 space-y-2">
                  <button
                    onClick={() => setSelectedId(neg.negotiation_id)}
                    className="btn-primary w-full"
                  >
                    Open Full Thread
                  </button>
                  <div className="flex items-center gap-2 pt-2">
                    {neg.is_deleted ? (
                      <>
                        <span className="text-xs text-red-400">Deleted</span>
                        <button onClick={() => handleRestoreNeg(neg.negotiation_id)} className="text-xs px-3 py-1 bg-green-500/20 text-green-400 hover:bg-green-500/30" data-testid={`restore-neg-${neg.negotiation_id}`}>
                          <RotateCcw className="w-3 h-3 inline mr-1" />Restore
                        </button>
                        <button onClick={() => handlePurgeNeg(neg.negotiation_id)} className="text-xs px-3 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30" data-testid={`purge-neg-${neg.negotiation_id}`}>Purge</button>
                      </>
                    ) : (
                      <button onClick={() => handleDeleteNeg(neg.negotiation_id)} className="text-xs px-3 py-1 bg-red-500/10 text-red-400 hover:bg-red-500/20" data-testid={`delete-neg-${neg.negotiation_id}`}>
                        <Trash2 className="w-3 h-3 inline mr-1" />Delete
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminNegotiations;
