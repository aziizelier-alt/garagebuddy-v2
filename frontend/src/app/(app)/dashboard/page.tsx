'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function DashboardOverview() {
  const [stats, setStats] = useState({ activeJobs: 0, newCustomers: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('mechanic');
  const [userName, setUserName] = useState('');
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    async function loadDashboard() {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      if (!userId) return;

      const { data: userDoc } = await supabase
        .from('users')
        .select('role, full_name')
        .eq('id', userId)
        .single();

      const role = userDoc?.role || 'mechanic';
      setUserRole(role);
      setUserName(userDoc?.full_name || session.user.email?.split('@')[0] || 'User');

      // Fetch active jobs (if admin, all jobs; if mechanic, only assigned jobs)
      let jobsQuery = supabase.from('jobs').select('*', { count: 'exact' }).in('status', ['pending', 'in_progress', 'waiting_parts']);
      if (role === 'mechanic') {
        jobsQuery = jobsQuery.eq('assigned_mechanic_id', userId);
      }
      const { count: activeJobs } = await jobsQuery;

      const { count: newCustomers } = await supabase
        .from('customers')
        .select('*', { count: 'exact' })
        .gte('created_at', new Date(new Date().setDate(new Date().getDate() - 30)).toISOString());

      // Only admins see revenue
      let revenue = 0;
      if (role === 'admin') {
        const { data: invoices } = await supabase
          .from('invoices')
          .select('total')
          .eq('status', 'paid');
        
        revenue = invoices?.reduce((sum, inv) => sum + Number(inv.total), 0) || 0;
      }

      setStats({
        activeJobs: activeJobs || 0,
        newCustomers: newCustomers || 0,
        revenue
      });
      setLoading(false);
    }
    
    loadDashboard();
  }, []);

  return (
    <div className="animate-fade-in dashboard-overview">
      {/* Premium Welcome Banner */}
      <div className="welcome-banner">
        <h1 className="welcome-title">Welcome back, {userName}!</h1>
        <p className="welcome-subtitle">
          {userRole === 'admin' ? "Here's what's happening in your garage today." : "Here are your active repair orders."}
        </p>
        
        <div className="quick-actions-grid">
          <Link href="/jobs" className="quick-action-btn">
            <div className="quick-action-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
            </div>
            New Job Order
          </Link>
          <Link href="/customers" className="quick-action-btn">
            <div className="quick-action-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
            </div>
            Add Customer
          </Link>
          {userRole === 'admin' && (
            <Link href="/invoices" className="quick-action-btn">
              <div className="quick-action-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
              </div>
              Create Invoice
            </Link>
          )}
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card glass-panel">
          <svg className="stat-icon-bg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          <span className="stat-title">{userRole === 'admin' ? 'Total Active Jobs' : 'My Active Jobs'}</span>
          <span className="stat-value">{loading ? '...' : stats.activeJobs}</span>
          <span className="stat-trend">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--warning)', marginRight: '4px' }}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
            Current Workload
          </span>
        </div>
        
        <div className="stat-card glass-panel">
          <svg className="stat-icon-bg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 00-3-3.87"></path><path d="M16 3.13a4 4 0 010 7.75"></path></svg>
          <span className="stat-title">New Customers (30d)</span>
          <span className="stat-value">{loading ? '...' : stats.newCustomers}</span>
          <span className="stat-trend" style={{ color: 'var(--success)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
            Growth
          </span>
        </div>
        
        {userRole === 'admin' && (
          <div className="stat-card glass-panel">
            <svg className="stat-icon-bg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            <span className="stat-title">Total Revenue (Paid)</span>
            <span className="stat-value">${loading ? '...' : stats.revenue.toFixed(2)}</span>
            <span className="stat-trend" style={{ color: 'var(--success)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
              Profit
            </span>
          </div>
        )}
      </div>
      
      {/* Activity Section */}
      <div className="activity-section">
        <h2 className="section-title">Timeline Activity</h2>
        <div className="timeline-container glass-panel">
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading activity...</div>
          ) : (
            <div className="timeline-list">
              <div className="timeline-item">
                <div className="timeline-dot" style={{ background: 'var(--success)' }}></div>
                <div className="timeline-content">
                  <div className="timeline-time">Just now</div>
                  <div className="timeline-text">Logged into the workspace securely.</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
