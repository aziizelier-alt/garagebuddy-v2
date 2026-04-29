'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUser } from '@/hooks/useUser';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
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
    <div className="animate-fade-in" style={{ position: 'relative' }}>
      {/* Background Decor */}
      <div className="bg-orb" style={{ top: '-100px', right: '-100px', background: 'var(--accent-primary)' }}></div>
      <div className="bg-orb" style={{ bottom: '-200px', left: '-100px', background: 'var(--accent-secondary)', animationDelay: '-5s' }}></div>

      {/* Header Section */}
      <div style={{ marginBottom: '4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ maxWidth: '600px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div className="live-indicator"></div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.3em' }}>System Online</span>
          </div>
          <h1 style={{ fontSize: '3.5rem', fontWeight: 900, letterSpacing: '-0.04em', margin: 0, lineHeight: 1.1 }}>
            Welcome back, <span style={{ background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{firstName}.</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.25rem', marginTop: '1rem', fontWeight: 500, lineHeight: 1.5 }}>
            {stats.activeJobs > 0
              ? <>Your workshop is currently processing <span style={{ color: 'var(--accent-primary)', fontWeight: 800 }}>{stats.activeJobs} jobs</span>. All systems optimal.</>
              : 'All bays are clear. The workshop is ready for peak performance.'}
          </p>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem 2.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backdropFilter: 'blur(10px)', textAlign: 'right' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.2em', marginBottom: '0.5rem' }}>Daily Yield</div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--success)', letterSpacing: '-0.02em' }}>£{stats.revenue.toLocaleString()}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{stats.todayBookings} bookings completed</div>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
        {[
          { label: 'Active Jobs', value: stats.activeJobs, color: 'var(--accent-primary)', link: '/jobs', desc: 'In production' },
          { label: "Today's Load", value: stats.todayBookings, color: 'var(--accent-secondary)', link: '/bookings', desc: 'Reservations' },
          { label: 'Stock Alerts', value: stats.lowStock, color: stats.lowStock > 0 ? 'var(--danger)' : 'var(--text-primary)', link: '/parts', pulse: stats.lowStock > 0, desc: 'Needs attention' },
          { label: 'Revenue', value: `£${stats.revenue.toLocaleString()}`, color: 'var(--success)', link: '/invoices', desc: 'Collected today' },
        ].map((stat, i) => (
          <Link key={i} href={stat.link} style={{ textDecoration: 'none' }}>
            <Card className="hover-glow glass-panel" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.1em', marginBottom: '1rem' }}>{stat.label}</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: stat.color, letterSpacing: '-0.03em' }}>{loading ? '—' : stat.value}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{stat.desc}</div>
              {(stat as any).pulse && (
                <div style={{ position: 'absolute', top: '1rem', right: '1rem', width: '10px', height: '10px', borderRadius: '50%', background: stat.color, boxShadow: `0 0 15px ${stat.color}`, animation: 'pulse-glow 2s infinite' }}></div>
              )}
            </Card>
          </Link>
        ))}
      </div>

      {/* Operations Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '2rem' }}>
        
        {/* Real-time Telemetry */}
        <Card padding="0" className="glass-panel">
          <CardHeader style={{ padding: '1.5rem 1.5rem 0 1.5rem' }}>
            <CardTitle>Operational Telemetry</CardTitle>
          </CardHeader>
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '420px', overflowY: 'auto' }}>
            {activities.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ marginBottom: '1rem' }}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                <p>Awaiting workshop signal...</p>
              </div>
            ) : (
              activities.map((act, i) => (
                <div key={act.id} style={{ display: 'flex', gap: '1.25rem', borderLeft: `2px solid ${i === 0 ? 'var(--accent-primary)' : 'var(--border-color)'}`, paddingLeft: '1.5rem', position: 'relative', transition: 'all 0.3s' }}>
                  <div style={{ position: 'absolute', left: '-5px', top: '4px', width: '8px', height: '8px', borderRadius: '50%', background: i === 0 ? 'var(--accent-primary)' : 'var(--text-tertiary)', boxShadow: i === 0 ? '0 0 12px var(--accent-primary)' : 'none' }}></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: i === 0 ? 'var(--text-primary)' : 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{act.action?.replace(/_/g, ' ')}</div>
                    <p style={{ fontSize: '0.875rem', color: i === 0 ? 'var(--text-secondary)' : 'var(--text-tertiary)', marginTop: '0.25rem' }}>{act.details || 'Operational record updated.'}</p>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 700 }}>
                    {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Quick Production Actions */}
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Quick Directives</CardTitle>
            </CardHeader>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <Link href="/jobs" style={{ textDecoration: 'none' }}>
                <button className="btn btn-secondary" style={{ width: '100%', flexDirection: 'column', height: '100px', justifyContent: 'center', gap: '0.5rem' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>New Job</span>
                </button>
              </Link>
              <Link href="/customers" style={{ textDecoration: 'none' }}>
                <button className="btn btn-secondary" style={{ width: '100%', flexDirection: 'column', height: '100px', justifyContent: 'center', gap: '0.5rem' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Client+</span>
                </button>
              </Link>
              <Link href="/bookings" style={{ textDecoration: 'none' }}>
                <button className="btn btn-secondary" style={{ width: '100%', flexDirection: 'column', height: '100px', justifyContent: 'center', gap: '0.5rem' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Schedule</span>
                </button>
              </Link>
              <Link href="/invoices" style={{ textDecoration: 'none' }}>
                <button className="btn btn-secondary" style={{ width: '100%', flexDirection: 'column', height: '100px', justifyContent: 'center', gap: '0.5rem' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Invoice</span>
                </button>
              </Link>
            </div>
          </Card>

          {/* High Priority Alerts */}
          {stats.lowStock > 0 && (
            <Card style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ width: '40px', height: '40px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Supply Chain Alert</div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    {stats.lowStock} inventory items have fallen below critical stock thresholds. 
                  </p>
                  <Link href="/parts" style={{ display: 'inline-block', marginTop: '0.75rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--danger)', textDecoration: 'none' }}>REPLENISH STOCK →</Link>
                </div>
              </div>
            </Card>
          )}

          {/* Recent Performance Snapshot */}
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Production Snap</CardTitle>
            </CardHeader>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentJobs.slice(0, 3).map(job => (
                <div key={job.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.8125rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{job.vehicles?.make} {job.vehicles?.model}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{new Date(job.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} update</div>
                  </div>
                  <span className={`status-badge status-${job.status}`} style={{ fontSize: '0.6rem', padding: '2px 8px' }}>{job.status?.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
