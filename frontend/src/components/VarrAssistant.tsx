'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUser } from '@/hooks/useUser';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';

interface GuidanceDirective {
  id: string;
  priority: 'CRITICAL' | 'IMPORTANT' | 'OPPORTUNITY';
  title: string;
  reason: string;
  actionLabel: string;
  action: () => void;
}

export default function VarrAssistant() {
  const { garageId } = useUser();
  const router = useRouter();
  const [directives, setDirectives] = useState<GuidanceDirective[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (garageId) analyzeContext();
  }, [garageId]);

  const analyzeContext = async () => {
    setLoading(true);
    
    // 1. Fetch relevant data for analysis
    const [jobs, invoices, bookings] = await Promise.all([
      supabase.from('jobs').select('*').eq('garage_id', garageId).neq('status', 'done'),
      supabase.from('invoices').select('*').eq('garage_id', garageId).eq('status', 'sent'),
      supabase.from('bookings').select('*').eq('garage_id', garageId).gte('start_time', new Date().toISOString()).limit(5)
    ]);

    const activeDirectives: GuidanceDirective[] = [];

    // 2. PRIORITY ENGINE LOGIC
    
    // Check for Overdue Invoices (CRITICAL)
    const overdueInvoices = (invoices.data || []).filter(inv => {
      const dueDate = new Date(inv.created_at);
      dueDate.setDate(dueDate.getDate() + 7); // Assume 7 day term
      return dueDate < new Date();
    });

    if (overdueInvoices.length > 0) {
      activeDirectives.push({
        id: 'overdue-inv',
        priority: 'CRITICAL',
        title: `${overdueInvoices.length} Invoices are Overdue`,
        reason: 'Payment delays are impacting your weekly cash flow.',
        actionLabel: 'Secure Revenue',
        action: () => router.push('/invoices')
      });
    }

    // Check for Stagnant Jobs (IMPORTANT)
    const stagnantJobs = (jobs.data || []).filter(job => {
      const lastUpdate = new Date(job.updated_at || job.created_at);
      const hoursDiff = (new Date().getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
      return hoursDiff > 24;
    });

    if (stagnantJobs.length > 0) {
      activeDirectives.push({
        id: 'stagnant-jobs',
        priority: 'IMPORTANT',
        title: `${stagnantJobs.length} Jobs have Stalled`,
        reason: 'No status updates in 24 hours. Bays may be blocked.',
        actionLabel: 'Nudge Production',
        action: () => router.push('/jobs')
      });
    }

    // Check for Upcoming Load (OPPORTUNITY)
    if ((bookings.data?.length || 0) < 2) {
      activeDirectives.push({
        id: 'low-load',
        priority: 'OPPORTUNITY',
        title: 'Low Workshop Load Detected',
        reason: 'Your calendar has openings tomorrow. Fill the bays?',
        actionLabel: 'View Lead Board',
        action: () => router.push('/bookings')
      });
    }

    setDirectives(activeDirectives);
    setLoading(false);
  };

  if (loading) return null;
  if (directives.length === 0) return null;

  return (
    <div className="animate-fade-in" style={{ marginBottom: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--accent-primary)', boxShadow: '0 0 10px var(--accent-primary)' }}></div>
        <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-secondary)' }}>VARR Guidance Engine</span>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1rem' }}>
        {directives.map((dir) => (
          <Card key={dir.id} glass padding="1.25rem" style={{ 
            borderLeft: `4px solid ${dir.priority === 'CRITICAL' ? 'var(--danger)' : dir.priority === 'IMPORTANT' ? 'var(--warning)' : 'var(--accent-primary)'}`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '1rem'
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 900, color: dir.priority === 'CRITICAL' ? 'var(--danger)' : 'var(--text-tertiary)', textTransform: 'uppercase' }}>{dir.priority}</span>
              </div>
              <h4 style={{ fontSize: '1rem', fontWeight: 800, marginTop: '0.25rem' }}>{dir.title}</h4>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: 1.4 }}>{dir.reason}</p>
            </div>
            <Button size="sm" onClick={dir.action} style={{ width: 'fit-content' }}>{dir.actionLabel}</Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
