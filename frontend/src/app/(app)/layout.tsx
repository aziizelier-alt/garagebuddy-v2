'use client';

import Navigation from '@/components/Navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-container">
      <div className="bg-orb" style={{ top: '-10%', left: '-10%', background: 'var(--accent-primary)' }}></div>
      <div className="bg-orb" style={{ bottom: '-10%', right: '-10%', background: 'var(--accent-secondary)' }}></div>
      
      {/* Command Bar Shortcut Indicator (Visual only for now) */}
      <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1000 }}>
        <div style={{ 
          background: 'rgba(0,0,0,0.8)', 
          backdropFilter: 'blur(10px)', 
          padding: '0.5rem 1rem', 
          borderRadius: '30px', 
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
        }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)' }}>PRESS</span>
          <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.875rem' }}>⌘ K</code>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)' }}>FOR SEARCH</span>
        </div>
      </div>

      <Navigation />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
