import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'pending' | 'in_progress' | 'done' | 'unpaid' | 'paid' | 'danger' | 'success' | 'warning' | 'info';
  className?: string;
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'info',
  className,
  style,
}) => {
  const getVariantStyles = (v: string): React.CSSProperties => {
    switch (v) {
      case 'pending':
      case 'warning':
        return { background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' };
      case 'in_progress':
      case 'info':
        return { background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-primary)' };
      case 'done':
      case 'success':
      case 'paid':
        return { background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' };
      case 'unpaid':
      case 'danger':
        return { background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' };
      default:
        return { background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)' };
    }
  };

  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '0.7rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
    ...getVariantStyles(variant),
    ...style,
  };

  return (
    <span className={`status-badge ${className || ''}`} style={baseStyles}>
      {children}
    </span>
  );
};
