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
    { href: '/dashboard', label: 'Overview', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>, roles: ['admin', 'mechanic'] },
    { href: '/jobs', label: 'Job Board', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>, roles: ['admin', 'mechanic'] },
    { href: '/customers', label: 'Customers', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>, roles: ['admin'] },
    { href: '/bookings', label: 'Web Bookings', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>, roles: ['admin'] },
    { href: '/invoices', label: 'Invoicing', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>, roles: ['admin'] },
    { href: '/parts', label: 'Inventory', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15"></path><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path><path d="m3.3 7 8.7 5 8.7-5"></path><path d="M12 22V12"></path></svg>, roles: ['admin'] },
    { href: '/reminders', label: 'Retention', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"></path></svg>, roles: ['admin'] },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-logo" style={{ marginBottom: '3rem', paddingLeft: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '40px', height: '40px', background: 'var(--accent-gradient)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: '1.75rem', letterSpacing: '-0.05em', color: 'var(--text-primary)', lineHeight: 0.8 }}>VARR</div>
            <div style={{ fontWeight: 500, fontSize: '0.7rem', color: 'var(--accent-primary)', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: '0.25rem' }}>Automotive OS</div>
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
                gap: '0.75rem',
                padding: '0.875rem 1rem',
                borderRadius: 'var(--radius-md)',
                textDecoration: 'none',
                color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
                background: isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                transition: 'all 0.2s',
                fontWeight: isActive ? 600 : 500,
                border: isActive ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid transparent'
              }}
            >
              <span style={{ color: isActive ? 'var(--accent-primary)' : 'inherit', display: 'flex' }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', position: 'relative' }}>
        <Button 
          variant="secondary" 
          onClick={() => setShowNotifications(!showNotifications)}
          style={{ width: '100%', justifyContent: 'space-between', padding: '0.875rem 1rem' }}
          leftIcon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>}
          rightIcon={notifications.length > 0 ? <span style={{ width: '8px', height: '8px', background: 'var(--danger)', borderRadius: '50%', boxShadow: '0 0 8px var(--danger)' }}></span> : null}
        >
          Alerts
        </Button>

        {showNotifications && (
          <Card 
            className="notifications-dropdown" 
            style={{ position: 'absolute', bottom: '130px', left: '0', right: '0', zIndex: 100, padding: '1rem', maxHeight: '300px', overflowY: 'auto' }}
          >
            <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: '1rem', letterSpacing: '0.05em' }}>Recent Activity</h4>
            {notifications.length === 0 ? (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', textAlign: 'center', padding: '1rem 0' }}>All caught up!</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {notifications.map(n => (
                  <div key={n.id} style={{ fontSize: '0.8125rem', padding: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{n.message}</div>
                    <div style={{ color: 'var(--text-tertiary)', fontSize: '0.7rem' }}>{new Date(n.created_at).toLocaleTimeString()}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        <Button 
          variant="ghost" 
          onClick={handleSignOut}
          style={{ width: '100%', marginTop: '0.75rem', justifyContent: 'flex-start', color: 'var(--danger)' }}
          leftIcon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>}
        >
          Sign Out
        </Button>
      </div>
    </div>
  );
}
