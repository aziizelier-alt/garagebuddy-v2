'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { toast } from '@/components/ui/Toast';
import { Card as UICard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useUser } from '@/hooks/useUser';

export default function DashboardOverview() {
  const { userRole, userName, garageId, userId, loading: userLoading } = useUser();
  const [stats, setStats] = useState({ activeJobs: 0, newCustomers: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardStats() {
      if (!garageId) return;

      // Fetch active jobs
      let jobsQuery = supabase
        .from('jobs')
        .select('*', { count: 'exact' })
        .eq('garage_id', garageId)
        .in('status', ['pending', 'in_progress', 'waiting_parts']);
        
      if (userRole === 'mechanic') {
        jobsQuery = jobsQuery.eq('assigned_mechanic_id', userId);
      }
      const { count: activeJobs } = await jobsQuery;

      const { count: newCustomers } = await supabase
        .from('customers')
        .select('*', { count: 'exact' })
        .eq('garage_id', garageId)
        .gte('created_at', new Date(new Date().setDate(new Date().getDate() - 30)).toISOString());

      // Only admins see revenue
      let revenue = 0;
      if (userRole === 'admin') {
        const { data: invoices } = await supabase
          .from('invoices')
          .select('total')
          .eq('garage_id', garageId)
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
    
    if (!userLoading) {
      loadDashboardStats();
    }
  }, [garageId, userRole, userId, userLoading]);

  return (
    <div className="animate-fade-in dashboard-overview">
      {/* Premium Welcome Banner */}
      <div className="welcome-banner">
        <h1 className="welcome-title">Welcome back, {userName}!</h1>
        <p className="welcome-subtitle">
          {userRole === 'admin' ? "Here's what's happening in your garage today." : "Here are your active repair orders."}
        </p>
        
        <div className="quick-actions-grid" style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
          <Link href="/jobs" style={{ textDecoration: 'none' }}>
            <Button leftIcon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>}>
              New Job Order
            </Button>
          </Link>
          <Link href="/customers" style={{ textDecoration: 'none' }}>
            <Button variant="secondary" leftIcon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>}>
              Add Customer
            </Button>
          </Link>
          {userRole === 'admin' && (
            <>
              <Button 
                variant="secondary"
                onClick={() => {
                  const url = `${window.location.origin}/book/${garageId}`;
                  navigator.clipboard.writeText(url);
                  toast.success('Booking link copied! Add "?embed=true" to the URL for a seamless website integration.');
                }}
                leftIcon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>}
              >
                Booking Link
              </Button>
            </>
          )}
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', margin: '3rem 0' }}>
        <UICard padding="1.5rem">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Active Jobs</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{loading ? '...' : stats.activeJobs}</div>
          <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.1 }}>
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          </div>
        </UICard>
        
        <UICard padding="1.5rem">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Customers (30d)</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--success)', lineHeight: 1 }}>{loading ? '...' : stats.newCustomers}</div>
          <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.1 }}>
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
          </div>
        </UICard>
        
        {userRole === 'admin' && (
          <UICard padding="1.5rem" style={{ background: 'rgba(59, 130, 246, 0.05)' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Monthly Revenue</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent-primary)', lineHeight: 1 }}>£{loading ? '...' : stats.revenue.toLocaleString()}</div>
            <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.1 }}>
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            </div>
          </UICard>
        )}
      </div>
      
      {/* Activity Section */}
      <div className="activity-section">
        <h2 className="section-title">Timeline Activity</h2>
        <UICard padding="0">
          {(loading || userLoading) ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading activity...</div>
          ) : (
            <div className="timeline-list">
              <div className="timeline-item" style={{ padding: '1.5rem', display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                <div className="timeline-dot" style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--success)', marginTop: '0.25rem' }}></div>
                <div className="timeline-content">
                  <div className="timeline-time" style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>Just now</div>
                  <div className="timeline-text" style={{ fontSize: '0.875rem' }}>Logged into the workspace securely.</div>
                </div>
              </div>
            </div>
          )}
        </UICard>
      </div>
    </div>
  );
}
