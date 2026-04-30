import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  glass?: boolean;
  padding?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  style,
  glass = true,
  padding = '1.5rem',
  ...props
}) => {
  const baseStyles: React.CSSProperties = {
    background: glass ? 'var(--bg-card)' : 'var(--bg-sidebar)',
    backdropFilter: glass ? 'var(--glass-blur)' : 'none',
    WebkitBackdropFilter: glass ? 'var(--glass-blur)' : 'none',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-premium)',
    padding,
    overflow: 'hidden',
    position: 'relative',
    ...style,
  };

  return (
    <div 
      className={`card ${glass ? 'glass-panel' : ''} ${className || ''}`} 
      style={baseStyles}
      {...props}
    >
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
