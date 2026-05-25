import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Search, FileSpreadsheet, FileText, Filter, Activity, 
  Clock, Edit, Eye, Lock, X, Copy, Check, ChevronLeft, ChevronRight, RefreshCw, AlertCircle
} from 'lucide-react';

interface SoapLog {
  id: number;
  timestamp: string;
  serviceName: string;
  operationName: string;
  requestXml: string;
  responseXml: string;
  httpStatusCode: number;
  executionTimeMs: number;
  errorMessage: string | null;
  status: string;
  tags: string;
  notes: string | null;
}

interface Metadata {
  services: string[];
  operations: string[];
  statuses: string[];
}

export const Dashboard: React.FC = () => {
  const { user, isAdmin, apiFetch, setGlobalLoading } = useAuth();
  const navigate = useNavigate();

  // Logs state
  const [logs, setLogs] = useState<SoapLog[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [operationName, setOperationName] = useState('');
  const [httpStatus, setHttpStatus] = useState('');
  const [customStatus, setCustomStatus] = useState('');
  const [xmlSearch, setXmlSearch] = useState('');

  // Dropdown options
  const [metadata, setMetadata] = useState<Metadata>({ services: [], operations: [], statuses: [] });
  
  // XML modal state
  const [selectedLog, setSelectedLog] = useState<SoapLog | null>(null);
  const [xmlTab, setXmlTab] = useState<'request' | 'response'>('request');
  const [copied, setCopied] = useState(false);

  // Notification toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const showError = (message: string) => setError(message);

  const fetchMetadata = async () => {
    setGlobalLoading(true);
    try {
      const response = await apiFetch('http://localhost:5234/api/logs/metadata');
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to load filter options.');
      }
      const data = await response.json();
      setMetadata(data);
    } catch (err: any) {
      showError(err.message || 'Failed to load filter options.');
    } finally {
      setGlobalLoading(false);
    }
  };

  const fetchLogs = async () => {
    setGlobalLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      if (startDate) params.append('startDate', new Date(startDate).toISOString());
      if (endDate) params.append('endDate', new Date(endDate).toISOString());
      if (serviceName) params.append('serviceName', serviceName);
      if (operationName) params.append('operationName', operationName);
      if (httpStatus) params.append('httpStatus', httpStatus);
      if (customStatus) params.append('customStatus', customStatus);
      if (xmlSearch) params.append('xmlSearch', xmlSearch);

      const response = await apiFetch(`http://localhost:5234/api/logs?${params.toString()}`);

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to fetch logs.');
      }
      const data = await response.json();
      setLogs(data.items);
      setTotalItems(data.totalItems);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      showError(err.message || 'Failed to fetch logs.');
    } finally {
      setGlobalLoading(false);
    }
  };

  useEffect(() => {
    if (user?.token) {
      fetchMetadata();
    }
  }, [user]);

  useEffect(() => {
    if (user?.token) {
      fetchLogs();
    }
  }, [page, pageSize, user]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setServiceName('');
    setOperationName('');
    setHttpStatus('');
    setCustomStatus('');
    setXmlSearch('');
    setPage(1);
    // Timeout to allow state to clear before invoking fetchLogs
    setTimeout(() => fetchLogs(), 50);
  };

  const [exporting, setExporting] = useState(false);

  // Helper to trigger API downloads
  const handleExport = (format: 'csv' | 'excel') => {
    setGlobalLoading(true);
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', new Date(startDate).toISOString());
    if (endDate) params.append('endDate', new Date(endDate).toISOString());
    if (serviceName) params.append('serviceName', serviceName);
    if (operationName) params.append('operationName', operationName);
    if (httpStatus) params.append('httpStatus', httpStatus);
    if (customStatus) params.append('customStatus', customStatus);
    if (xmlSearch) params.append('xmlSearch', xmlSearch);

    const downloadUrl = `http://localhost:5234/api/logs/export/${format}?${params.toString()}`;
    
    // We must pass JWT token. To download files with Authorization headers, we can fetch them as blob 
    // and trigger browser download or perform window open if CORS allows. A clean fetch blob is best!
    showToast(`Generating ${format.toUpperCase()} export...`, 'info');
    
    apiFetch(downloadUrl)
    .then(async response => {
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Export failed.');
      }
      return response.blob();
    })
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `soap_logs_${new Date().toISOString().slice(0, 10)}.${format === 'excel' ? 'xlsx' : 'csv'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('Logs exported successfully!', 'success');
    })
    .catch(async (err) => {
      showError(err.message || 'Export failed. Please try again.');
    })
    .finally(() => setGlobalLoading(false));
  };

  // Prettify XML helper
  const formatXml = (xmlStr: string) => {
    try {
      let formatted = '';
      let reg = /(>)(<)(\/*)/g;
      let xml = xmlStr.replace(reg, '$1\r\n$2$3');
      let pad = 0;
      xml.split('\r\n').forEach(node => {
        let indent = 0;
        if (node.match(/.+<\/\w[^>]*>$/)) {
          indent = 0;
        } else if (node.match(/^<\/\w/)) {
          if (pad !== 0) pad -= 1;
        } else if (node.match(/^<\w([^>]*[^\/])?>.*$/)) {
          indent = 1;
        } else {
          indent = 0;
        }

        let padding = '';
        for (let i = 0; i < pad; i++) {
          padding += '  ';
        }

        formatted += padding + node + '\r\n';
        pad += indent;
      });
      return formatted.trim();
    } catch {
      return xmlStr; // Fallback to raw if fails
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="main-layout animate-fade-in">
      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          padding: '12px 16px',
          color: '#f87171',
          fontSize: '0.85rem',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 0 }}>
            <X size={16} />
          </button>
        </div>
      )}
      {/* Upper Statistics Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Operations Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Monitor and inspect SOAP logs across backend integrations</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => fetchLogs()} className="btn btn-secondary" title="Refresh Log Table">
            <RefreshCw size={18} />
          </button>
          <button onClick={() => handleExport('excel')} className="btn btn-secondary" style={{ borderColor: '#22c55e' }}>
            <FileSpreadsheet size={18} style={{ color: '#22c55e' }} />
            Export Excel
          </button>
          <button onClick={() => handleExport('csv')} className="btn btn-secondary" style={{ borderColor: '#3b82f6' }}>
            <FileText size={18} style={{ color: '#3b82f6' }} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters Form */}
      <form onSubmit={handleSearchSubmit} className="glass-panel" style={{ marginBottom: '24px', borderRadius: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)', gap: '10px' }}>
          <Filter size={18} style={{ color: 'var(--accent-light)' }} />
          <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Log Query Filters</span>
        </div>

        <div className="filters-grid">
          {/* Start Date */}
          <div className="form-group">
            <label className="form-label">Start Timestamp</label>
            <input 
              type="datetime-local" 
              className="form-input" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
            />
          </div>

          {/* End Date */}
          <div className="form-group">
            <label className="form-label">End Timestamp</label>
            <input 
              type="datetime-local" 
              className="form-input" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
            />
          </div>

          {/* Service Name */}
          <div className="form-group">
            <label className="form-label">Service API</label>
            <select 
              className="form-select" 
              value={serviceName} 
              onChange={(e) => {
                setServiceName(e.target.value);
                setOperationName('');
              }}
            >
              <option value="">All Services</option>
              {metadata.services.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Operation Name */}
          <div className="form-group">
            <label className="form-label">Operation/Method</label>
            <select 
              className="form-select" 
              value={operationName} 
              onChange={(e) => setOperationName(e.target.value)}
            >
              <option value="">All Methods</option>
              {metadata.operations
                .map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          {/* HTTP Status Code */}
          <div className="form-group">
            <label className="form-label">HTTP Code</label>
            <select className="form-select" value={httpStatus} onChange={(e) => setHttpStatus(e.target.value)}>
              <option value="">All Codes</option>
              <option value="200">200 OK</option>
              <option value="400">400 Bad Request</option>
              <option value="401">401 Unauthorized</option>
              <option value="404">404 Not Found</option>
              <option value="500">500 Server Error</option>
            </select>
          </div>

          {/* Custom Tracking Status */}
          <div className="form-group">
            <label className="form-label">Tracking Status</label>
            <select className="form-select" value={customStatus} onChange={(e) => setCustomStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Resolved">Resolved</option>
              <option value="Investigating">Investigating</option>
              <option value="Ignored">Ignored</option>
            </select>
          </div>

          {/* Full-text XML Search */}
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Full-Text XML Keyword Search</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="form-input" 
                style={{ paddingLeft: '38px' }} 
                placeholder="Search raw payload keywords (e.g. CardNumber, Fault, transaction)..." 
                value={xmlSearch}
                onChange={(e) => setXmlSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Filter buttons */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button type="button" onClick={handleResetFilters} className="btn btn-secondary">
            Reset Filters
          </button>
          <button type="submit" className="btn btn-primary">
            Apply Filters
          </button>
        </div>
      </form>

      {/* Logs Table */}
      <div className="table-container">
        {logs.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ color: 'var(--text-muted)', marginBottom: '12px' }}>
              <Activity size={48} />
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '4px' }}>No logs matching criteria</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '400px' }}>
              We couldn't find any SOAP log entries in the database matching your applied filters. Try relaxing search conditions.
            </p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Log ID</th>
                <th>Timestamp</th>
                <th>Service Name</th>
                <th>Operation</th>
                <th>HTTP Code</th>
                <th>Latency</th>
                <th>Tracking Status</th>
                <th>Tags</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const date = new Date(log.timestamp).toLocaleString();
                const isSlow = log.executionTimeMs > 500;
                
                // Color for HTTP code
                let httpColor = '#10b981'; // Green
                if (log.httpStatusCode >= 500) httpColor = '#ef4444'; // Red
                else if (log.httpStatusCode >= 400) httpColor = '#f59e0b'; // Amber

                return (
                  <tr key={log.id}>
                    <td>
                      <span className="log-id">#{log.id}</span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {date}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {log.serviceName}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                      {log.operationName}
                    </td>
                    <td>
                      <span style={{ 
                        color: httpColor, 
                        background: `${httpColor}15`, 
                        border: `1px solid ${httpColor}30`,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)'
                      }}>
                        {log.httpStatusCode}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Clock size={14} style={{ color: isSlow ? '#f59e0b' : 'var(--text-muted)' }} />
                        <span style={{ 
                          fontWeight: 600, 
                          color: isSlow ? '#f59e0b' : 'var(--text-primary)',
                        }}>
                          {log.executionTimeMs} ms
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge-status ${log.status.toLowerCase()}`}>
                        {log.status}
                      </span>
                    </td>
                    <td style={{ maxWidth: '200px' }}>
                      {log.tags ? log.tags.split(',').map((tag) => (
                        <span key={tag} className="tag-badge">{tag}</span>
                      )) : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>None</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button 
                          onClick={() => {
                            setSelectedLog(log);
                            setXmlTab('request');
                          }} 
                          className="btn btn-secondary" 
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        >
                          <Eye size={14} />
                          Inspect XML
                        </button>
                        
                        {isAdmin ? (
                          <button 
                            onClick={() => navigate(`/edit/${log.id}`)} 
                            className="btn btn-secondary" 
                            style={{ padding: '6px 12px', fontSize: '0.8rem', borderColor: 'rgba(139, 92, 246, 0.4)' }}
                          >
                            <Edit size={14} style={{ color: '#a78bfa' }} />
                            Edit Log
                          </button>
                        ) : (
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '6px 12px', fontSize: '0.8rem', opacity: 0.5, cursor: 'not-allowed' }}
                            disabled
                            title="Admin Role Required to Edit"
                          >
                            <Lock size={14} />
                            Lock
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Controls */}
      {logs.length > 0 && (
        <div className="pagination">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Showing page <strong style={{ color: 'var(--text-primary)' }}>{page}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{totalPages}</strong> ({totalItems} total logs)
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select 
              className="form-select" 
              style={{ width: 'auto', padding: '6px 10px', fontSize: '0.85rem' }}
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value="10">10 per page</option>
              <option value="25">25 per page</option>
              <option value="50">50 per page</option>
            </select>
            
            <button 
              className="btn btn-secondary" 
              style={{ padding: '8px 12px' }}
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page === 1}
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              className="btn btn-secondary" 
              style={{ padding: '8px 12px' }}
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* XML Inspector Modal */}
      {selectedLog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(3, 7, 18, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '24px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '900px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 24px 60px rgba(0,0,0,0.8)'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '18px 24px',
              borderBottom: '1px solid var(--border)',
              background: 'rgba(15, 23, 42, 0.4)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>Inspect Transaction #{selectedLog.id}</span>
                  <span className={`badge-status ${selectedLog.status.toLowerCase()}`}>{selectedLog.status}</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {selectedLog.serviceName}.{selectedLog.operationName} | {new Date(selectedLog.timestamp).toLocaleString()}
                </div>
              </div>
              <button 
                onClick={() => setSelectedLog(null)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Tabs & Copy Buttons */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 24px',
              borderBottom: '1px solid var(--border)',
              background: 'rgba(15, 23, 42, 0.2)'
            }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setXmlTab('request')}
                  className={`btn ${xmlTab === 'request' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '6px 16px', fontSize: '0.85rem' }}
                >
                  SOAP Request XML
                </button>
                <button 
                  onClick={() => setXmlTab('response')}
                  className={`btn ${xmlTab === 'response' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '6px 16px', fontSize: '0.85rem' }}
                >
                  SOAP Response XML
                </button>
              </div>

              <button 
                onClick={() => copyToClipboard(xmlTab === 'request' ? selectedLog.requestXml : selectedLog.responseXml)}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              >
                {copied ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy Payload'}
              </button>
            </div>

            {/* XML Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, background: '#070a13' }}>
              {selectedLog.errorMessage && xmlTab === 'response' && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#f87171',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  marginBottom: '16px',
                  fontFamily: 'var(--font-mono)'
                }}>
                  <strong>Fault Message:</strong> {selectedLog.errorMessage}
                </div>
              )}
              
              <div className="xml-container">
                <pre className="xml-code">
                  <code>
                    {formatXml(xmlTab === 'request' ? selectedLog.requestXml : selectedLog.responseXml)}
                  </code>
                </pre>
              </div>

              {selectedLog.notes && (
                <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Administrative Notes:</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{selectedLog.notes}</div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              padding: '16px 24px',
              borderTop: '1px solid var(--border)',
              background: 'rgba(15, 23, 42, 0.4)'
            }}>
              <button onClick={() => setSelectedLog(null)} className="btn btn-secondary">Close Inspector</button>
            </div>
          </div>
        </div>
      )}

      {/* Floating toast notification */}
      {toast && (
        <div className="toast">
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: toast.type === 'success' ? '#10b981' : '#3b82f6'
          }}></div>
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{toast.message}</span>
        </div>
      )}
    </div>
  );
};
