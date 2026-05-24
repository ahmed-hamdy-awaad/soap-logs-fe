import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Save, ArrowLeft, ClipboardList, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface SoapLog {
  id: number;
  timestamp: string;
  serviceName: string;
  operationName: string;
  httpStatusCode: number;
  executionTimeMs: number;
  errorMessage: string | null;
  status: string;
  tags: string;
  notes: string | null;
}

export const EditLog: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, apiFetch } = useAuth();

  const [log, setLog] = useState<SoapLog | null>(null);
  const [status, setStatus] = useState('Pending');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    // If not Admin, bounce them out immediately
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }

    const fetchLogDetails = async () => {
      try {
        const response = await apiFetch(`http://localhost:5234/api/logs/${id}`);

        if (!response.ok) {
          throw new Error('Could not retrieve log transaction details.');
        }

        const data = await response.json();
        setLog(data);
        setStatus(data.status);
        setNotes(data.notes || '');
        setTags(data.tags || '');
      } catch (err: any) {
        setError(err.message || 'Error fetching details.');
      } finally {
        setLoading(false);
      }
    };

    fetchLogDetails();
  }, [id, user, isAdmin, navigate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await apiFetch(`http://localhost:5234/api/logs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes, tags })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to update log entry.');
      }

      setToast('Log entry updated successfully!');
      setTimeout(() => {
        setToast(null);
        navigate('/dashboard');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Error occurred saving updates.');
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="main-layout" style={{ textAlign: 'center', padding: '100px 20px' }}>
        <ShieldAlert size={64} style={{ color: '#ef4444', marginBottom: '16px' }} />
        <h2>Access Denied</h2>
        <p style={{ color: 'var(--text-secondary)' }}>You must be logged in as an Administrator to modify log configurations.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="animate-spin" style={{ width: '40px', height: '40px', border: '3px solid rgba(59, 130, 246, 0.1)', borderTopColor: '#3b82f6', borderRadius: '50%' }}></div>
      </div>
    );
  }

  return (
    <div className="main-layout animate-fade-in" style={{ maxWidth: '800px' }}>
      {/* Back Button */}
      <button onClick={() => navigate('/dashboard')} className="btn btn-secondary" style={{ marginBottom: '24px' }}>
        <ArrowLeft size={16} />
        Back to Dashboard
      </button>

      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          padding: '12px 16px',
          color: '#f87171',
          fontSize: '0.85rem',
          marginBottom: '24px'
        }}>
          <span>{error}</span>
        </div>
      )}

      {log && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Metadata Read-Only Card */}
          <div className="glass-panel" style={{ padding: '24px', borderRadius: '12px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ClipboardList size={20} style={{ color: 'var(--accent-light)' }} />
              Log Metadata Context
            </h2>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
              gap: '16px',
              fontSize: '0.9rem' 
            }}>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.8rem' }}>Log Transaction:</span>
                <strong className="log-id">#{log.id}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.8rem' }}>Timestamp:</span>
                <strong>{new Date(log.timestamp).toLocaleString()}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.8rem' }}>Service:</span>
                <strong>{log.serviceName}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.8rem' }}>Operation:</span>
                <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{log.operationName}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.8rem' }}>HTTP Status:</span>
                <strong style={{ color: log.httpStatusCode === 200 ? '#10b981' : '#ef4444' }}>{log.httpStatusCode}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.8rem' }}>Latency:</span>
                <strong>{log.executionTimeMs} ms</strong>
              </div>
            </div>

            {log.errorMessage && (
              <div style={{ 
                marginTop: '16px', 
                background: 'rgba(239, 68, 68, 0.06)', 
                border: '1px solid rgba(239, 68, 68, 0.2)', 
                padding: '12px', 
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontFamily: 'var(--font-mono)',
                color: '#f87171'
              }}>
                <strong>Error Details:</strong> {log.errorMessage}
              </div>
            )}
          </div>

          {/* Edit Form */}
          <form onSubmit={handleSave} className="glass-panel" style={{ padding: '32px', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '24px' }}>Administrative Actions</h3>

            {/* Status Dropdown */}
            <div className="form-group">
              <label className="form-label" htmlFor="status">Tracking Status</label>
              <select 
                id="status" 
                className="form-select" 
                value={status} 
                onChange={(e) => setStatus(e.target.value)}
                required
              >
                <option value="Pending">Pending</option>
                <option value="Resolved">Resolved</option>
                <option value="Investigating">Investigating</option>
                <option value="Ignored">Ignored</option>
              </select>
            </div>

            {/* Tags Comma-separated */}
            <div className="form-group">
              <label className="form-label" htmlFor="tags">Labels / Tags</label>
              <input 
                id="tags" 
                type="text" 
                className="form-input" 
                placeholder="Comma separated values (e.g. Billing, Visa, SLA-Violation)" 
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Separate multiple tags with a comma.
              </span>
            </div>

            {/* Notes Textarea */}
            <div className="form-group" style={{ marginBottom: '32px' }}>
              <label className="form-label" htmlFor="notes">Resolution & Analysis Notes</label>
              <textarea 
                id="notes" 
                className="form-textarea" 
                rows={5}
                placeholder="Describe resolution details, investigation findings, or support notes..." 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Save Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                type="button" 
                onClick={() => navigate('/dashboard')} 
                className="btn btn-secondary"
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={saving}
              >
                <Save size={16} />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Floating success toast */}
      {toast && (
        <div className="toast">
          <CheckCircle2 size={16} style={{ color: '#10b981' }} />
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{toast}</span>
        </div>
      )}
    </div>
  );
};
