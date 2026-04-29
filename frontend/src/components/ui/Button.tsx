'use client';

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading,
  leftIcon,
  rightIcon,
  className,
  style,
  disabled,
  ...props
}) => {
  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    cursor: (disabled || isLoading) ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    border: '1px solid transparent',
    gap: '0.5rem',
    borderRadius: 'var(--radius-sm)',
    opacity: (disabled || isLoading) ? 0.6 : 1,
    outline: 'none',
  };

  const variants = {
    primary: {
      background: 'var(--accent-gradient)',
      color: 'white',
      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
    },
    secondary: {
      background: 'rgba(255, 255, 255, 0.03)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-color)',
    },
    danger: {
      background: 'rgba(239, 68, 68, 0.1)',
      color: 'var(--danger)',
      border: '1px solid rgba(239, 68, 68, 0.2)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text-tertiary)',
      border: 'none',
    },
  };

  const sizes = {
    sm: { padding: '0.4rem 0.8rem', fontSize: '0.75rem' },
    md: { padding: '0.75rem 1.5rem', fontSize: '0.875rem' },
    lg: { padding: '1rem 2rem', fontSize: '1rem' },
  };

  const combinedStyles = {
    ...baseStyles,
    ...variants[variant],
    ...sizes[size],
    ...style,
  };

  return (
    <button
      className={`btn ${className || ''}`}
      style={combinedStyles}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin" style={{ width: '1rem', height: '1rem' }} viewBox="0 0 24 24">
          <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {!isLoading && leftIcon && <span style={{ display: 'inline-flex' }}>{leftIcon}</span>}
      {children}
      {!isLoading && rightIcon && <span style={{ display: 'inline-flex' }}>{rightIcon}</span>}
    </button>
  );
};
