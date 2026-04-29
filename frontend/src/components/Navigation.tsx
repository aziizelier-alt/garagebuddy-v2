'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/components/ui/Toast';

const menuItems = [
  { 
    id: 'dashboard', 
    label: 'Command Center', 
    href: '/dashboard', 
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
    roles: ['admin', 'manager', 'mechanic']
  },
  { 
    id: 'jobs', 
    label: 'Workshop Feed', 
    href: '/jobs', 
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>,
    roles: ['admin', 'manager', 'mechanic']
  },
  { 
    id: 'customers', 
    label: 'Client Base', 
    href: '/customers', 
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><circle cx="19" cy="11" r="4"/></svg>,
    roles: ['admin', 'manager']
  },
  { 
    id: 'bookings', 
    label: 'Reservations', 
    href: '/bookings', 
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    roles: ['admin', 'manager', 'mechanic']
  },
  { 
    id: 'invoices', 
    label: 'Financials', 
    href: '/invoices', 
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    roles: ['admin', 'manager']
  },
  { 
    id: 'parts', 
    label: 'Parts Inventory', 
    href: '/parts', 
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>,
    roles: ['admin', 'manager', 'mechanic']
  },
];

export default function Navigation() {
  const pathname = usePathname();
  const { userRole, userName } = useUser();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <aside className="sidebar">
      {/* Branding */}
      <div style={{ marginBottom: '3rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
        <div style={{ width: '40px', height: '40px', background: 'var(--accent-gradient)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px var(--accent-glow)' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
        </div>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 900, letterSpacing: '0.05em', lineHeight: 1 }}>VARR</h1>
          <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Automotive OS</span>
        </div>
      </div>

      {/* Main Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
        {menuItems.filter(item => !userRole || item.roles.includes(userRole)).map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.id} 
              href={item.href}
              className={isActive ? 'glass-panel' : ''}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '1rem', 
                padding: '0.875rem 1rem', 
                borderRadius: 'var(--radius-sm)',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                textDecoration: 'none',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.9375rem',
                transition: 'all 0.2s',
                background: isActive ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--accent-primary)' : '3px solid transparent',
              }}
            >
              <span style={{ color: isActive ? 'var(--accent-primary)' : 'inherit' }}>{item.icon}</span>
              {item.label}
              {isActive && <div style={{ marginLeft: 'auto', width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent-primary)', boxShadow: '0 0 8px var(--accent-primary)' }}></div>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingTop: '2rem', borderTop: '1px solid var(--border-color)' }}>
        <button 
          className="btn btn-secondary" 
          style={{ width: '100%', justifyContent: 'space-between', padding: '0.75rem 1rem', fontSize: '0.8125rem' }}
          onClick={() => toast.success('System telemetry is optimal.')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"/></svg>
            System Alerts
          </div>
          <div style={{ width: '6px', height: '6px', background: 'var(--success)', borderRadius: '50%' }}></div>
        </button>

        <button 
          onClick={handleSignOut}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem', 
            padding: '0.75rem 1rem', 
            background: 'transparent', 
            border: 'none', 
            color: 'var(--danger)', 
            cursor: 'pointer',
            fontSize: '0.8125rem',
            fontWeight: 700,
            transition: 'opacity 0.2s'
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Shutdown Session
        </button>
      </div>
    </aside>
  );
}
