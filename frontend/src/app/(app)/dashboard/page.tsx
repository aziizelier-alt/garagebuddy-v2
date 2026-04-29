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
  const [weather, setWeather] = useState({ condition: 'Cloudy', temp: 12, impact: 'Medium' });
  const [healthScore, setHealthScore] = useState(85);

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
      
      // Simulate Garage Health based on stats
      const score = Math.min(100, (activeJobs || 0) * 10 + 50);
      setHealthScore(score);
      
      setLoading(false);
    }
    
    if (!userLoading) {
      loadDashboardStats();
    }
  }, [garageId, userRole, userId, userLoading]);

  return (
    <div className="animate-fade-in dashboard-overview" style={{ paddingBottom: '4rem' }}>
      {/* Dynamic Command Center Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span style={{ padding: '4px 10px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>System Online</span>
            <span style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>Command Center</h1>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link href="/jobs" style={{ textDecoration: 'none' }}>
            <Button size="lg" leftIcon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>}>
              Create Job
            </Button>
          </Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        {/* Main Stats Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
            <UICard padding="1.5rem" style={{ position: 'relative', overflow: 'hidden', border: '1px solid var(--border-highlight)' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Active Repairs</div>
              <div style={{ fontSize: '3rem', fontWeight: 900, lineHeight: 1 }}>{loading ? '--' : stats.activeJobs}</div>
              <div style={{ marginTop: '1rem', color: 'var(--success)', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
                Optimal Load
              </div>
            </UICard>

            <UICard padding="1.5rem" style={{ position: 'relative', overflow: 'hidden', border: '1px solid var(--border-highlight)' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Monthly Revenue</div>
              <div style={{ fontSize: '3rem', fontWeight: 900, lineHeight: 1, color: 'var(--accent-primary)' }}>£{loading ? '--' : stats.revenue.toLocaleString()}</div>
              <div style={{ marginTop: '1rem', color: 'var(--success)', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
                +12.5% vs Last Month
              </div>
            </UICard>

            <UICard padding="1.5rem" style={{ position: 'relative', overflow: 'hidden', border: '1px solid var(--border-highlight)' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>New Clients</div>
              <div style={{ fontSize: '3rem', fontWeight: 900, lineHeight: 1 }}>{loading ? '--' : stats.newCustomers}</div>
              <div style={{ marginTop: '1rem', color: 'var(--success)', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
                Retention Strong
              </div>
            </UICard>
          </div>

          {/* Performance Visualization (Innovation) */}
          <UICard padding="2rem" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-highlight)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>Workshop Performance</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Current Week</span>
              </div>
            </div>
            
            <div style={{ height: '180px', display: 'flex', alignItems: 'flex-end', gap: '1.5rem', padding: '0 1rem' }}>
              {[45, 65, 35, 85, 55, 75, 40].map((val, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ 
                    width: '100%', 
                    height: `${val}%`, 
                    background: i === 3 ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.05)', 
                    borderRadius: '8px 8px 4px 4px',
                    transition: 'all 0.5s ease',
                    boxShadow: i === 3 ? '0 0 20px var(--accent-glow)' : 'none'
                  }}></div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>{['M','T','W','T','F','S','S'][i]}</span>
                </div>
              ))}
            </div>
          </UICard>
        </div>

        {/* Intelligence Side Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Garage Health (Innovation) */}
          <UICard padding="2rem" style={{ textAlign: 'center', border: '1px solid var(--accent-glow)', background: 'linear-gradient(180deg, rgba(59, 130, 246, 0.05) 0%, transparent 100%)' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.5rem' }}>Garage Health</div>
            <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 1.5rem auto' }}>
              <svg width="120" height="120" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8"/>
                <circle cx="50" cy="50" r="45" fill="none" stroke="var(--accent-primary)" strokeWidth="8" 
                  strokeDasharray={`${healthScore * 2.82} 282`} 
                  strokeLinecap="round" 
                  transform="rotate(-90 50 50)"
                  style={{ transition: 'stroke-dasharray 1s ease-out' }}
                />
              </svg>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{healthScore}%</div>
              </div>
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Peak Efficiency</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.5rem' }}>Your workshop is running at optimal capacity based on current job turnover.</p>
          </UICard>

          {/* Weather Insight (Innovation) */}
          <UICard padding="1.5rem" style={{ border: '1px solid var(--border-highlight)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2"><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/><circle cx="12" cy="12" r="4"/></svg>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>High Traffic Warning</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Weather: {weather.temp}°C {weather.condition}</div>
              </div>
            </div>
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.1)', fontSize: '0.75rem', color: 'var(--warning)' }}>
              <strong>Impact: {weather.impact}</strong>. Expect higher volume for battery and tire checks due to temperature drop.
            </div>
          </UICard>
        </div>
      </div>

      {/* Live Activity Feed */}
      <div style={{ marginTop: '3rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          Workshop Timeline
          <span style={{ width: '8px', height: '8px', background: 'var(--danger)', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 10px var(--danger)' }}></span>
        </h2>
        <UICard padding="0" style={{ border: '1px solid var(--border-highlight)' }}>
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0' }}>
            {[
              { time: '10 mins ago', action: 'Invoice Settlement', desc: 'Sarah Jones paid £245.00 for Brake Replacement', icon: '£', color: 'var(--success)' },
              { time: '45 mins ago', action: 'New Job Created', desc: 'BMW 3 Series added for Full Service', icon: 'RO', color: 'var(--accent-primary)' },
              { time: '2 hours ago', action: 'Stock Alert', desc: 'Oil Filters (BMW) reached low threshold (2 remaining)', icon: '!', color: 'var(--warning)' }
            ].map((item, i) => (
              <div key={i} style={{ padding: '1.25rem 1.5rem', display: 'flex', gap: '1.5rem', borderBottom: i === 2 ? 'none' : '1px solid var(--border-color)', transition: 'background 0.2s', cursor: 'pointer' }}>
                <div style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: item.color, fontSize: '0.8rem', border: `1px solid ${item.color}22` }}>
                  {item.icon}
                </div>
                <div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>{item.action}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>• {item.time}</span>
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </UICard>
      </div>
    </div>
  );
}
