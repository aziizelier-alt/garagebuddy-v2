'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { useUser } from '@/hooks/useUser';

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { userRole, userId, garageId } = useUser();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (userId && garageId) {
      fetchNotifications(userId, garageId);

      const channel = supabase.channel('notif-changes')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `garage_id=eq.${garageId}`
        }, () => {
          fetchNotifications(userId, garageId);
        })
        .subscribe();
        
      return () => { supabase.removeChannel(channel); };
    }
  }, [userId, garageId]);

  const fetchNotifications = async (uId: string, gId: string) => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('garage_id', gId)
      .or(`user_id.eq.${uId},user_id.is.null`)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (data) setNotifications(data);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const menuItems = [
    { href: '/dashboard', label: 'Command Center', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>, roles: ['admin', 'mechanic'] },
    { href: '/jobs', label: 'Workshop Feed', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>, roles: ['admin', 'mechanic'] },
    { href: '/customers', label: 'Client Base', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>, roles: ['admin'] },
    { href: '/bookings', label: 'Reservations', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>, roles: ['admin'] },
    { href: '/invoices', label: 'Financials', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>, roles: ['admin'] },
    { href: '/parts', label: 'Parts Inventory', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>, roles: ['admin'] },
  ];

  return (
    <div className="sidebar" style={{ background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', height: '100vh', padding: '2rem 1.25rem' }}>
      <div className="sidebar-logo" style={{ marginBottom: '3.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ 
            width: '44px', 
            height: '44px', 
            background: 'var(--accent-gradient)', 
            borderRadius: '12px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            boxShadow: '0 0 20px var(--accent-glow)' 
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: '1.75rem', letterSpacing: '-0.06em', color: 'var(--text-primary)', lineHeight: 0.8 }}>VARR</div>
            <div style={{ fontWeight: 700, fontSize: '0.65rem', color: 'var(--accent-primary)', letterSpacing: '0.25em', textTransform: 'uppercase', marginTop: '0.35rem' }}>Automotive OS</div>
          </div>
        </div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
        {menuItems.filter(item => item.roles.includes(userRole || 'mechanic')).map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href} 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.875rem',
                padding: '0.875rem 1.125rem',
                borderRadius: 'var(--radius-md)',
                textDecoration: 'none',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: isActive ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                fontWeight: isActive ? 600 : 500,
                border: isActive ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid transparent',
                boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.2)' : 'none'
              }}
            >
              <span style={{ color: isActive ? 'var(--accent-primary)' : 'inherit', display: 'flex' }}>{item.icon}</span>
              {item.label}
              {isActive && <div style={{ marginLeft: 'auto', width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent-primary)', boxShadow: '0 0 8px var(--accent-primary)' }}></div>}
            </Link>
          );
        })}
      </nav>

      <div style={{ marginTop: 'auto', paddingTop: '2rem', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ position: 'relative', marginBottom: '1rem' }}>
          <Button 
            variant="secondary" 
            onClick={() => setShowNotifications(!showNotifications)}
            style={{ width: '100%', justifyContent: 'space-between', padding: '0.875rem 1.125rem', background: 'rgba(255,255,255,0.02)' }}
            leftIcon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>}
          >
            System Alerts
            {notifications.length > 0 && <span style={{ width: '6px', height: '6px', background: 'var(--danger)', borderRadius: '50%', boxShadow: '0 0 8px var(--danger)' }}></span>}
          </Button>

          {showNotifications && (
            <Card 
              className="glass-panel" 
              style={{ position: 'absolute', bottom: '100%', left: '0', right: '0', zIndex: 100, marginBottom: '1rem', padding: '1rem' }}
            >
              <h4 style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: '1rem', letterSpacing: '0.1em' }}>Recent Telemetry</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {notifications.length === 0 ? (
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>No active alerts.</div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} style={{ fontSize: '0.8125rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                      <div style={{ color: 'var(--text-primary)' }}>{n.message}</div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          )}
        </div>

        <Button 
          variant="ghost" 
          onClick={handleSignOut}
          style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--danger)', padding: '0.875rem 1.125rem' }}
          leftIcon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>}
        >
          Shutdown Session
        </Button>
      </div>
    </div>
  );
}
