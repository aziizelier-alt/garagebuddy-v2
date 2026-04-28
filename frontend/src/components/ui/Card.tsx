import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  glass?: boolean;
  padding?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  style,
  glass = true,
  padding = '1.5rem',
}) => {
  const baseStyles: React.CSSProperties = {
    background: glass ? 'rgba(15, 17, 23, 0.7)' : 'var(--bg-card)',
    backdropFilter: glass ? 'blur(12px)' : 'none',
    WebkitBackdropFilter: glass ? 'blur(12px)' : 'none',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-lg)',
    padding,
    overflow: 'hidden',
    position: 'relative',
    ...style,
  };

  return (
    <div className={`card ${glass ? 'glass-panel' : ''} ${className || ''}`} style={baseStyles}>
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string; style?: React.CSSProperties }> = ({
  children,
  className,
  style,
}) => (
  <div className={className} style={{ marginBottom: '1rem', ...style }}>
    {children}
  </div>
);

export const CardTitle: React.FC<{ children: React.ReactNode; className?: string; style?: React.CSSProperties }> = ({
  children,
  className,
  style,
}) => (
  <h3 className={className} style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', ...style }}>
    {children}
  </h3>
);

export const CardDescription: React.FC<{ children: React.ReactNode; className?: string; style?: React.CSSProperties }> = ({
  children,
  className,
  style,
}) => (
  <p className={className} style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', ...style }}>
    {children}
  </p>
);
