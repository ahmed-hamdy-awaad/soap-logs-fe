import React from 'react';

export const LoadingOverlay: React.FC = () => (
  <div style={{
    position: 'fixed',
    inset: 0,
    background: 'rgba(7, 10, 19, 0.75)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    gap: '16px'
  }}>
    <div className="animate-spin" style={{
      width: '48px',
      height: '48px',
      border: '3px solid rgba(59, 130, 246, 0.15)',
      borderTopColor: '#3b82f6',
      borderRadius: '50%'
    }} />
    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>Loading...</span>
  </div>
);
