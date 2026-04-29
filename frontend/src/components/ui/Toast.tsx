'use client';

import React, { useState, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

// Simple global event system for toasts
let toastCallback: (toast: Toast) => void = () => {};

export const toast = {
  success: (msg: string) => toastCallback({ id: Math.random().toString(), message: msg, type: 'success' }),
  error: (msg: string) => toastCallback({ id: Math.random().toString(), message: msg, type: 'error' }),
  warning: (msg: string) => toastCallback({ id: Math.random().toString(), message: msg, type: 'warning' }),
  info: (msg: string) => toastCallback({ id: Math.random().toString(), message: msg, type: 'info' }),
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    toastCallback = (newToast) => {
      setToasts(prev => [...prev, newToast]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== newToast.id));
      }, 5000);
    };
  }, []);

  return (
    <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {toasts.map(t => (
        <div 
          key={t.id} 
          style={{ 
            padding: '1rem 1.5rem', 
            borderRadius: 'var(--radius-md)', 
            background: 'var(--bg-card)', 
            borderLeft: `4px solid ${t.type === 'success' ? 'var(--success)' : t.type === 'error' ? 'var(--danger)' : t.type === 'warning' ? 'var(--warning)' : 'var(--accent-primary)'}`,
            boxShadow: 'var(--shadow-xl)',
            color: 'var(--text-primary)',
            fontSize: '0.875rem',
            fontWeight: 500,
            minWidth: '300px',
            animation: 'slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--border-color)',
          }}
        >
          {t.type === 'success' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>}
          {t.type === 'error' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>}
          {t.message}
        </div>
      ))}
      <style jsx global>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
