import React, { useState, useEffect } from 'react';
import { 
  Wrench, Lock, Unlock, AlertTriangle, Download, 
  CheckCircle, XCircle, Clock, Info
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Tool configuration
const SYSTEM_TOOLS = [
  {
    id: 'integrity-report',
    displayName: 'Integrity Report',
    method: 'GET',
    endpoint: '/api/admin/integrity-report',
    impactLevel: 'READ-ONLY',
    warningText: 'This operation scans database collections and generates a structural integrity report.\nNo records will be modified, deleted, or created.\nExecution may temporarily increase database read load.',
    outputFilenamePrefix: 'integrity_report',
    outputFormats: ['txt', 'json']
  },
  {
    id: 'cleanliness-report',
    displayName: 'Cleanliness Report',
    method: 'GET',
    endpoint: '/api/admin/cleanliness-report',
    impactLevel: 'READ-ONLY',
    warningText: 'This operation analyzes unused data paths, empty collections, inactive feature flags, and schema metadata.\nNo data will be changed.\nThe report is informational only.',
    outputFilenamePrefix: 'cleanliness_report',
    outputFormats: ['txt', 'json']
  },
  {
    id: 'ensure-indexes',
    displayName: 'Ensure Indexes',
    method: 'POST',
    endpoint: '/api/admin/system/ensure-indexes',
    impactLevel: 'STRUCTURAL',
    warningText: 'This operation creates missing database indexes required for performance and query correctness.\nExisting data will not be changed or deleted.\nIndex creation may temporarily increase database CPU usage while indexes are built.',
    outputFilenamePrefix: 'ensure_indexes',
    outputFormats: ['txt', 'json'],
    cooldownSeconds: 60
  },
  {
    id: 'setup-ttl',
    displayName: 'Setup TTL Indexes',
    method: 'POST',
    endpoint: '/api/admin/system/setup-ttl',
    impactLevel: 'STRUCTURAL',
    warningText: 'This operation configures automatic expiration rules for selected archival or temporary collections.\nDocuments matching TTL expiration criteria may be automatically deleted by the database in the future according to retention settings.\nExisting non-expired records will not be modified.',
    outputFilenamePrefix: 'setup_ttl',
    outputFormats: ['txt', 'json'],
    cooldownSeconds: 120
  },
  {
    id: 'ttl-status',
    displayName: 'TTL Status',
    method: 'GET',
    endpoint: '/api/admin/system/ttl-status',
    impactLevel: 'READ-ONLY',
    warningText: 'This operation reads TTL configuration status.\nNo records will be modified, deleted, or created.',
    outputFilenamePrefix: 'ttl_status',
    outputFormats: ['txt', 'json']
  },
  {
    id: 'maintenance-status',
    displayName: 'Maintenance Status',
    method: 'GET',
    endpoint: '/api/admin/system/maintenance-status',
    impactLevel: 'READ-ONLY',
    warningText: 'This operation reads maintenance configuration and runtime status.\nNo records will be modified, deleted, or created.',
    outputFilenamePrefix: 'maintenance_status',
    outputFormats: ['txt', 'json']
  },
  {
    id: 'run-maintenance',
    displayName: 'Run Maintenance',
    method: 'POST',
    endpoint: '/api/admin/system/run-maintenance',
    impactLevel: 'DATA-MODIFYING',
    warningText: 'This operation executes automated maintenance routines including index verification, archival housekeeping, and system health recalculations.\nSome internal temporary records or expired operational entries may be cleaned.\nCustomer-facing transactional data will not be removed.',
    outputFilenamePrefix: 'run_maintenance',
    outputFormats: ['txt', 'json'],
    cooldownSeconds: 300
  },
  {
    id: 'repair-cart-refs',
    displayName: 'Repair Cart References',
    method: 'POST',
    endpoint: '/api/admin/repair/cart-references',
    impactLevel: 'DATA-MODIFYING',
    warningText: 'This operation repairs invalid or orphaned cart item references by correcting or removing broken relationships.\nSome cart entries referencing non-existent products may be updated or removed.\nOrder records and completed transactions will not be affected.',
    outputFilenamePrefix: 'repair_cart_references',
    outputFormats: ['txt', 'json'],
    cooldownSeconds: 60
  },
  {
    id: 'repair-empty-carts',
    displayName: 'Repair Empty Carts',
    method: 'POST',
    endpoint: '/api/admin/repair/empty-carts',
    impactLevel: 'DATA-MODIFYING',
    warningText: 'This operation removes cart records that contain no items and are considered abandoned.\nOnly empty carts are affected.\nActive carts containing items will not be modified.',
    outputFilenamePrefix: 'repair_empty_carts',
    outputFormats: ['txt', 'json'],
    cooldownSeconds: 60
  }
];

const UNLOCK_DURATION_MINUTES = 10;

const AdminSystemTools = () => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [unlockedUntil, setUnlockedUntil] = useState(null);
  const [password, setPassword] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [toolOutputs, setToolOutputs] = useState({});
  const [toolStatuses, setToolStatuses] = useState({});
  const [runningTool, setRunningTool] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);

  // Check unlock status
  useEffect(() => {
    const checkUnlockStatus = () => {
      const unlockTime = localStorage.getItem('system_tools_unlock_until');
      if (unlockTime) {
        const unlockDate = new Date(unlockTime);
        const now = new Date();
        if (now < unlockDate) {
          setIsUnlocked(true);
          setUnlockedUntil(unlockDate);
        } else {
          setIsUnlocked(false);
          setUnlockedUntil(null);
          localStorage.removeItem('system_tools_unlock_until');
        }
      }
    };

    checkUnlockStatus();
    const interval = setInterval(checkUnlockStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  // Load saved outputs
  useEffect(() => {
    const saved = localStorage.getItem('system_tools_outputs');
    if (saved) {
      try {
        setToolOutputs(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load saved outputs');
      }
    }
  }, []);

  const handleUnlock = async (e) => {
    e.preventDefault();
    setUnlocking(true);

    try {
      const response = await axios.post(`${API_URL}/api/admin/login`, {
        username: 'postvibe',
        password: password
      });

      if (response.data.access_token) {
        // Update admin token
        localStorage.setItem('admin_token', response.data.access_token);
        
        // Set unlock timer
        const unlockUntil = new Date(Date.now() + UNLOCK_DURATION_MINUTES * 60 * 1000);
        localStorage.setItem('system_tools_unlock_until', unlockUntil.toISOString());
        
        setIsUnlocked(true);
        setUnlockedUntil(unlockUntil);
        setPassword('');
        toast.success(`System Tools unlocked for ${UNLOCK_DURATION_MINUTES} minutes`);
      }
    } catch (error) {
      toast.error('Re-auth failed. Tools remain locked.');
    } finally {
      setUnlocking(false);
    }
  };

  const handleRunTool = (tool) => {
    setConfirmModal(tool);
  };

  const executeTool = async (tool) => {
    setConfirmModal(null);
    setRunningTool(tool.id);

    const token = localStorage.getItem('admin_token');
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const response = await axios({
        method: tool.method,
        url: `${API_URL}${tool.endpoint}`,
        headers
      });

      const output = {
        data: response.data,
        executedAt: new Date().toISOString(),
        status: 'success',
        httpStatus: response.status
      };

      setToolOutputs(prev => {
        const updated = { ...prev, [tool.id]: output };
        localStorage.setItem('system_tools_outputs', JSON.stringify(updated));
        return updated;
      });

      setToolStatuses(prev => ({
        ...prev,
        [tool.id]: { lastRun: new Date().toISOString(), status: 'success' }
      }));

      toast.success(`${tool.displayName} completed successfully`);
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        setIsUnlocked(false);
        setUnlockedUntil(null);
        localStorage.removeItem('system_tools_unlock_until');
        toast.error('Session expired. Please re-authenticate.');
      } else {
        const output = {
          data: error.response?.data || { error: error.message },
          executedAt: new Date().toISOString(),
          status: 'error',
          httpStatus: error.response?.status || 0
        };

        setToolOutputs(prev => {
          const updated = { ...prev, [tool.id]: output };
          localStorage.setItem('system_tools_outputs', JSON.stringify(updated));
          return updated;
        });

        setToolStatuses(prev => ({
          ...prev,
          [tool.id]: { lastRun: new Date().toISOString(), status: 'error' }
        }));

        toast.error(`${tool.displayName} failed: ${error.response?.data?.message || error.message}`);
      }
    } finally {
      setRunningTool(null);
    }
  };

  const downloadOutput = (tool, format) => {
    const output = toolOutputs[tool.id];
    if (!output) return;

    const timestamp = new Date(output.executedAt).toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `${tool.outputFilenamePrefix}_${timestamp}.${format}`;

    let content = '';
    const header = `Tool: ${tool.displayName}
Endpoint: ${tool.method} ${tool.endpoint}
Executed At: ${output.executedAt} (UTC)
Result: ${output.status}
HTTP Status: ${output.httpStatus}

${'='.repeat(60)}

`;

    if (format === 'json') {
      content = JSON.stringify(output.data, null, 2);
    } else {
      content = header + JSON.stringify(output.data, null, 2);
    }

    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getImpactBadgeColor = (level) => {
    switch (level) {
      case 'READ-ONLY': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'STRUCTURAL': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'DATA-MODIFYING': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getRemainingTime = () => {
    if (!unlockedUntil) return '';
    const remaining = Math.floor((unlockedUntil - new Date()) / 1000 / 60);
    return remaining > 0 ? `${remaining} min remaining` : 'Expired';
  };

  if (!isUnlocked) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-[#0A0A0A] border border-white/10 rounded-lg p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-yellow-500/10 rounded-lg">
              <Lock className="w-8 h-8 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-2xl font-serif">System Tools Locked</h2>
              <p className="text-gray-400 text-sm mt-1">Re-enter admin password to unlock</p>
            </div>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Admin Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-black border border-white/10 rounded focus:outline-none focus:border-[#d4af37] text-white"
                placeholder="Enter password"
                required
                disabled={unlocking}
                data-testid="system-tools-password-input"
              />
            </div>

            <button
              type="submit"
              disabled={unlocking}
              className="w-full px-6 py-3 bg-[#d4af37] text-black font-medium rounded hover:bg-[#f0c750] transition-colors disabled:opacity-50"
              data-testid="unlock-system-tools-btn"
            >
              {unlocking ? 'Unlocking...' : `Unlock (${UNLOCK_DURATION_MINUTES} minutes)`}
            </button>
          </form>

          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-300">
                <p className="font-medium mb-1">Security Note</p>
                <p className="text-blue-400/80">
                  System Tools require password re-entry to prevent accidental execution. 
                  This is a UI safety gate and does not change backend security.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-serif mb-2">System Tools</h1>
          <p className="text-gray-400">Maintenance and diagnostic utilities</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-2 text-green-400">
            <Unlock className="w-4 h-4" />
            <span>Unlocked</span>
          </div>
          <span className="text-gray-500">•</span>
          <div className="flex items-center gap-2 text-gray-400">
            <Clock className="w-4 h-4" />
            <span>{getRemainingTime()}</span>
          </div>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="space-y-4" data-testid="system-tools-list">
        {SYSTEM_TOOLS.map(tool => {
          const output = toolOutputs[tool.id];
          const status = toolStatuses[tool.id];
          const isRunning = runningTool === tool.id;

          return (
            <div key={tool.id} className="bg-[#0A0A0A] border border-white/10 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-medium">{tool.displayName}</h3>
                    <span className={`text-xs px-2 py-1 border rounded ${getImpactBadgeColor(tool.impactLevel)}`}>
                      {tool.impactLevel}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 font-mono">{tool.method} {tool.endpoint}</p>
                  
                  {status && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                      {status.status === 'success' ? (
                        <CheckCircle className="w-3 h-3 text-green-400" />
                      ) : (
                        <XCircle className="w-3 h-3 text-red-400" />
                      )}
                      <span>Last run: {new Date(status.lastRun).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleRunTool(tool)}
                    disabled={isRunning}
                    className="px-4 py-2 bg-[#d4af37] text-black text-sm font-medium rounded hover:bg-[#f0c750] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid={`run-${tool.id}-btn`}
                  >
                    {isRunning ? 'Running...' : 'Run'}
                  </button>
                  
                  {output && (
                    <div className="relative group">
                      <button
                        className="px-4 py-2 bg-white/5 text-white text-sm font-medium rounded hover:bg-white/10 transition-colors flex items-center gap-2"
                        data-testid={`download-${tool.id}-btn`}
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                      <div className="absolute right-0 top-full mt-2 bg-[#1A1A1A] border border-white/10 rounded shadow-lg py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                        <button
                          onClick={() => downloadOutput(tool, 'txt')}
                          className="w-full px-4 py-2 text-sm text-left hover:bg-white/5 whitespace-nowrap"
                        >
                          Download as TXT
                        </button>
                        {tool.outputFormats.includes('json') && (
                          <button
                            onClick={() => downloadOutput(tool, 'json')}
                            className="w-full px-4 py-2 text-sm text-left hover:bg-white/5 whitespace-nowrap"
                          >
                            Download as JSON
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" data-testid="confirm-modal">
          <div className="bg-[#0A0A0A] border border-white/10 rounded-lg max-w-2xl w-full p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-yellow-500/10 rounded-lg flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-yellow-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-serif mb-2">{confirmModal.displayName}</h3>
                <span className={`inline-block text-xs px-2 py-1 border rounded ${getImpactBadgeColor(confirmModal.impactLevel)}`}>
                  {confirmModal.impactLevel}
                </span>
              </div>
            </div>

            <div className="mb-6 p-4 bg-yellow-500/5 border border-yellow-500/20 rounded">
              <p className="text-sm text-gray-300 whitespace-pre-line leading-relaxed">
                {confirmModal.warningText}
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-6 py-2 bg-white/5 text-white rounded hover:bg-white/10 transition-colors"
                data-testid="cancel-tool-btn"
              >
                Cancel
              </button>
              <button
                onClick={() => executeTool(confirmModal)}
                className="px-6 py-2 bg-[#d4af37] text-black font-medium rounded hover:bg-[#f0c750] transition-colors"
                data-testid="confirm-run-tool-btn"
              >
                I Understand — Run Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSystemTools;
