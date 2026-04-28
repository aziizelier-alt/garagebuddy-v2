import React, { useEffect, useRef } from 'react';
import { Card } from './Card';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children,
  size = 'md'
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidths = {
    sm: '400px',
    md: '550px',
    lg: '800px',
  };

  return (
    <div 
      className="modal-overlay animate-fade-in" 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1.5rem',
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: maxWidths[size] }}
      >
        <Card 
          padding="0"
          style={{ 
            maxHeight: '90vh', 
            display: 'flex', 
            flexDirection: 'column',
            animation: 'modalIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards'
          }}
        >
          <div className="modal-header" style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{title}</h2>
            <button 
              onClick={onClose}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'var(--text-tertiary)', 
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '50%',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              onMouseOut={(e) => (e.currentTarget.style.background = 'none')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <div className="modal-body" style={{ padding: '2rem', overflowY: 'auto' }}>
            {children}
          </div>
        </Card>
      </div>
      <style jsx global>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
};
