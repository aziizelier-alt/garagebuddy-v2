'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [userInitial, setUserInitial] = useState('U');
  const [userRole, setUserRole] = useState('mechanic');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    async function getUserData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserInitial(session.user.email?.charAt(0).toUpperCase() || 'U');
        
        const { data: userDoc } = await supabase.from('users').select('role').eq('id', session.user.id).single();
        if (userDoc) setUserRole(userDoc.role);

        fetchNotifications(session.user.id);
      } else {
        router.push('/');
      }
    }
    getUserData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.push('/');
    });

    const channel = supabase.channel('schema-db-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) fetchNotifications(session.user.id);
        });
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [router]);

  const fetchNotifications = async (userId: string) => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .or(`user_id.eq.${userId},user_id.is.null`)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (data) setNotifications(data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const navItems = [
    { name: 'Overview', href: '/dashboard', icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10', roles: ['admin', 'mechanic'] },
    { name: 'Job Board', href: '/jobs', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', roles: ['admin', 'mechanic'] },
    { name: 'Customers', href: '/customers', icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 7a4 4 0 100-8 4 4 0 000 8z', roles: ['admin', 'mechanic'] },
    { name: 'Vehicles', href: '/vehicles', icon: 'M14 16H9m10 0h3v-3.15a1 1 0 00-.84-.99L16 11l-2.7-3.6a1 1 0 00-.8-.4H8.5a1 1 0 00-.8.4L5 11l-5.16.86a1 1 0 00-.84.99V16h3m10 0a2 2 0 11-4 0 2 2 0 014 0zm-10 0a2 2 0 11-4 0 2 2 0 014 0z', roles: ['admin', 'mechanic'] },
    { name: 'Invoices', href: '/invoices', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8', roles: ['admin'] },
    { name: 'Parts Inventory', href: '/parts', icon: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96L12 12.01L20.73 6.96 M12 22.08V12', roles: ['admin'] },
    { name: 'Reminders', href: '/reminders', icon: 'M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0', roles: ['admin'] }
  ];

  return (
    <aside className="app-sidebar glass-panel">
      <div className="sidebar-header">
        <div className="header-logo">
          <span>Garage</span>Buddy
        </div>
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', position: 'relative' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
            {notifications.length > 0 && (
              <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '8px', height: '8px', background: 'var(--danger)', borderRadius: '50%' }}></span>
            )}
          </button>

          {showNotifications && (
            <div style={{ position: 'absolute', top: '100%', left: '100%', width: '250px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem', zIndex: 50, boxShadow: 'var(--shadow-lg)' }}>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.875rem' }}>Notifications</h4>
              {notifications.length === 0 ? (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>No new alerts.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {notifications.map(n => (
                    <div key={n.id} style={{ fontSize: '0.75rem', padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)' }}>
                      {n.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <nav className="sidebar-nav">
        {navItems.filter(item => item.roles.includes(userRole)).map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link key={item.name} href={item.href} className={`nav-link ${isActive ? 'active' : ''}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={item.icon}></path>
              </svg>
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="user-avatar" style={{ background: userRole === 'admin' ? 'var(--accent-primary)' : 'var(--border-color)' }}>
            {userInitial}
          </div>
          <button onClick={handleLogout} className="btn btn-secondary btn-sm" style={{ width: '100%', marginTop: '1rem' }}>
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  );
}
