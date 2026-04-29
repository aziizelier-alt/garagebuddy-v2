'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUser } from '@/hooks/useUser';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';

export default function Dashboard() {
  const { garageId, userName } = useUser();
  const [stats, setStats] = useState({ activeJobs: 0, todayBookings: 0, lowStock: 0, revenue: 0, pendingInvoices: 0 });
  const [activities, setActivities] = useState<any[]>([]);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const fetchAll = useCallback(async () => {
    if (!garageId) return;
    setLoading(true);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const [jobsRes, partsRes, invoicesRes, activitiesRes, recentJobsRes, bookingsRes] = await Promise.all([
      supabase.from('jobs').select('status, created_at').eq('garage_id', garageId),
      supabase.from('parts').select('quantity, min_stock_level').eq('garage_id', garageId),
      supabase.from('invoices').select('total_amount, status').eq('garage_id', garageId),
      supabase.from('audit_logs').select('*').eq('garage_id', garageId).order('created_at', { ascending: false }).limit(8),
      supabase.from('jobs').select('*, vehicles(make, model, year)').eq('garage_id', garageId).order('updated_at', { ascending: false }).limit(5),
      supabase.from('bookings').select('id').eq('garage_id', garageId).gte('start_time', todayISO),
    ]);

    const jobs = jobsRes.data || [];
    const parts = partsRes.data || [];
    const invoices = invoicesRes.data || [];

    const revenue = invoices.filter(i => i.status === 'paid').reduce((acc, i) => acc + (i.total_amount || 0), 0);
    const pendingInvoices = invoices.filter(i => i.status !== 'paid').length;

    setStats({
      activeJobs: jobs.filter(j => j.status === 'in_progress').length,
      todayBookings: bookingsRes.data?.length || 0,
      lowStock: parts.filter(p => p.quantity <= (p.min_stock_level || 5)).length,
      revenue,
      pendingInvoices,
    });

    if (activitiesRes.data) setActivities(activitiesRes.data);
    if (recentJobsRes.data) setRecentJobs(recentJobsRes.data);
    setLoading(false);
  }, [garageId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (!garageId) return;
    const channel = supabase.channel('dashboard-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs', filter: `garage_id=eq.${garageId}` }, () => fetchAll())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs', filter: `garage_id=eq.${garageId}` }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [garageId, fetchAll]);

  const firstName = userName?.split(' ')[0] || 'Team';

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div className="live-indicator"></div>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Command Active</span>
          </div>
          <h1 style={{ fontSize: '3rem', fontWeight: 900, letterSpacing: '-0.05em', margin: 0, background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {getGreeting()}, {firstName}.
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem', marginTop: '0.5rem', fontWeight: 500 }}>
            {stats.activeJobs > 0
              ? <>You have <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{stats.activeJobs} active job{stats.activeJobs !== 1 ? 's' : ''}</span> in progress right now.</>
              : 'Workshop is clear. Ready for the next job.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '3rem', textAlign: 'right' }}>
          <div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.25rem' }}>Today's Bookings</div>
            <div style={{ fontWeight: 900, fontSize: '1.5rem', color: 'var(--accent-primary)' }}>{stats.todayBookings}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.25rem' }}>Revenue Collected</div>
            <div style={{ fontWeight: 900, fontSize: '1.5rem', color: 'var(--success)' }}>£{stats.revenue.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {[
          { label: 'Active Jobs', value: stats.activeJobs, color: 'var(--accent-primary)', link: '/jobs' },
          { label: "Today's Load", value: stats.todayBookings, color: 'var(--success)', link: '/bookings' },
          { label: 'Stock Alerts', value: stats.lowStock, color: stats.lowStock > 0 ? 'var(--danger)' : 'var(--text-primary)', link: '/parts', pulse: stats.lowStock > 0 },
          { label: 'Unpaid Invoices', value: stats.pendingInvoices, color: stats.pendingInvoices > 0 ? 'var(--warning)' : 'var(--text-primary)', link: '/invoices' },
        ].map((stat, i) => (
          <Link key={i} href={stat.link} style={{ textDecoration: 'none' }}>
            <Card className="hover-glow" style={{ position: 'relative', overflow: 'hidden', cursor: 'pointer' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.08em', marginBottom: '0.75rem' }}>{stat.label}</div>
              <div style={{ fontSize: '2.25rem', fontWeight: 900, color: stat.color }}>{loading ? '—' : stat.value}</div>
              {(stat as any).pulse && (
                <div style={{ position: 'absolute', top: '1rem', right: '1rem', width: '8px', height: '8px', borderRadius: '50%', background: stat.color, boxShadow: `0 0 12px ${stat.color}`, animation: 'pulse-glow 2s infinite' }}></div>
              )}
            </Card>
          </Link>
        ))}
      </div>

      {/* Main Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        
        {/* Live Activity Stream */}
        <Card title="Live Activity Stream" padding="0">
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '400px', overflowY: 'auto' }}>
            {activities.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '3rem 2rem' }}>Awaiting workshop telemetry...</p>
            ) : (
              activities.map((act, i) => (
                <div key={act.id} style={{ display: 'flex', gap: '1rem', borderLeft: '2px solid var(--border-color)', paddingLeft: '1.5rem', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '-5px', top: '4px', width: '8px', height: '8px', borderRadius: '50%', background: i === 0 ? 'var(--accent-primary)' : 'var(--text-tertiary)', boxShadow: i === 0 ? '0 0 8px var(--accent-primary)' : 'none' }}></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{act.action?.replace(/_/g, ' ').toUpperCase()}</div>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{act.details || 'System event recorded'}</p>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Recent Jobs */}
          <Card title="Recent Jobs">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentJobs.length === 0 ? (
                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>No jobs yet.</p>
              ) : (
                recentJobs.map(job => (
                  <Link key={job.id} href={`/jobs/${job.id}`} style={{ textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', transition: 'all 0.2s' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{job.vehicles?.make} {job.vehicles?.model}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{job.description?.slice(0, 40)}...</div>
                    </div>
                    <span className={`status-badge status-${job.status}`} style={{ fontSize: '0.65rem' }}>{job.status?.replace('_', ' ')}</span>
                  </Link>
                ))
              )}
              <Link href="/jobs" style={{ textAlign: 'center', color: 'var(--accent-primary)', fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none', marginTop: '0.5rem' }}>
                View All Jobs →
              </Link>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card title="Quick Actions">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Link href="/jobs" style={{ textDecoration: 'none' }}>
                <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>
                  View Workshop Feed
                </button>
              </Link>
              <Link href="/customers" style={{ textDecoration: 'none' }}>
                <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                  Add New Customer
                </button>
              </Link>
              <Link href="/invoices" style={{ textDecoration: 'none' }}>
                <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  Create Invoice
                </button>
              </Link>
              <Link href="/parts" style={{ textDecoration: 'none' }}>
                <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start', color: stats.lowStock > 0 ? 'var(--danger)' : undefined }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/></svg>
                  {stats.lowStock > 0 ? `⚠️ ${stats.lowStock} Low Stock Alert${stats.lowStock > 1 ? 's' : ''}` : 'Check Inventory'}
                </button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
