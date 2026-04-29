'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUser } from '@/hooks/useUser';
import { Card } from '@/components/ui/Card';

export default function Dashboard() {
  const { garageId } = useUser();
  const [stats, setStats] = useState({ activeJobs: 0, todayBookings: 0, lowStock: 0, revenue: 0 });
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    if (garageId) {
      fetchStats();
      fetchActivities();
      
      const channel = supabase.channel('dashboard-pulse')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, () => fetchActivities())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => fetchStats())
        .subscribe();
        
      return () => { supabase.removeChannel(channel); };
    }
  }, [garageId]);

  const fetchStats = async () => {
    const { data: jobs } = await supabase.from('jobs').select('status').eq('garage_id', garageId);
    const { data: parts } = await supabase.from('parts').select('quantity, min_stock_level').eq('garage_id', garageId);
    
    setStats({
      activeJobs: jobs?.filter(j => j.status === 'in_progress').length || 0,
      todayBookings: 4, // Simulated for demo
      lowStock: parts?.filter(p => p.quantity <= (p.min_stock_level || 5)).length || 0,
      revenue: 12450
    });
  };

  const fetchActivities = async () => {
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('garage_id', garageId)
      .order('created_at', { ascending: false })
      .limit(6);
    if (data) setActivities(data);
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '3.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div className="live-indicator"></div>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Command Active</span>
          </div>
          <h1 style={{ fontSize: '3rem', fontWeight: 900, letterSpacing: '-0.05em', margin: 0, background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Welcome Back, Aziz.
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem', marginTop: '0.5rem', fontWeight: 500 }}>
            The workshop is operating at <span style={{ color: 'var(--success)', fontWeight: 700 }}>92% Peak Efficiency</span> today.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '3rem', textAlign: 'right' }}>
          <div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.25rem' }}>Customer Happiness</div>
            <div style={{ fontWeight: 900, fontSize: '1.5rem', color: 'var(--accent-primary)' }}>98.4%</div>
          </div>
          <div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.25rem' }}>Jobs Completed</div>
            <div style={{ fontWeight: 900, fontSize: '1.5rem' }}>142 <span style={{ fontSize: '0.75rem', color: 'var(--success)' }}>↑12%</span></div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {[
          { label: 'Active Jobs', value: stats.activeJobs, color: 'var(--accent-primary)' },
          { label: 'Today\'s Load', value: stats.todayBookings, color: 'var(--success)' },
          { label: 'Stock Alerts', value: stats.lowStock, color: 'var(--danger)', pulse: stats.lowStock > 0 },
          { label: 'MTD Revenue', value: `£${stats.revenue.toLocaleString()}`, color: 'var(--text-primary)' },
        ].map((stat, i) => (
          <Card key={i} className="hover-glow" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', marginBottom: '0.75rem' }}>{stat.label}</div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: stat.color }}>{stat.value}</div>
            {stat.pulse && <div style={{ position: 'absolute', top: '1rem', right: '1rem', width: '8px', height: '8px', borderRadius: '50%', background: stat.color, boxShadow: `0 0 12px ${stat.color}` }}></div>}
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        <Card title="Live Production Stream" padding="0">
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {activities.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem' }}>Awaiting workshop telemetry...</p>
            ) : (
              activities.map((act, i) => (
                <div key={act.id} style={{ display: 'flex', gap: '1rem', borderLeft: '2px solid var(--border-color)', paddingLeft: '1.5rem', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '-5px', top: '0', width: '8px', height: '8px', borderRadius: '50%', background: i === 0 ? 'var(--accent-primary)' : 'var(--text-tertiary)' }}></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{act.action.replace(/_/g, ' ').toUpperCase()}</div>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{act.details || 'System event recorded'}</p>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 700 }}>{new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              ))
            )}
          </div>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <Card title="Workshop Load">
            <div style={{ height: '150px', display: 'flex', alignItems: 'flex-end', gap: '8px', paddingBottom: '1rem' }}>
              {[40, 70, 90, 60, 80, 50, 30].map((h, i) => (
                <div key={i} style={{ flex: 1, background: i === 2 ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)', height: `${h}%`, borderRadius: '4px', transition: 'height 1s ease-in-out' }}></div>
              ))}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>Bay utilization peak at 11:00 AM</p>
          </Card>

          <Card title="Quick Actions">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start' }}>Generate Shift Report</button>
              <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start' }}>Sync Inventory Cloud</button>
              <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--danger)' }}>Emergency Shutdown</button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
