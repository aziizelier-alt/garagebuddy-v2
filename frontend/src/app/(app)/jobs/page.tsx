'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUser } from '@/hooks/useUser';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';

const STATUS_COLUMNS = [
  { id: 'pending', label: 'Backlog', color: 'var(--text-tertiary)' },
  { id: 'in_progress', label: 'In Service', color: 'var(--accent-primary)' },
  { id: 'review', label: 'Quality Check', color: 'var(--warning)' },
  { id: 'done', label: 'Ready for Pickup', color: 'var(--success)' },
];

export default function JobsPage() {
  const { garageId } = useUser();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (garageId) fetchJobs();
  }, [garageId]);

  const fetchJobs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('jobs')
      .select('*, vehicles(make, model, year), customers:vehicles(customers(name))')
      .eq('garage_id', garageId)
      .order('updated_at', { ascending: false });
    
    if (data) setJobs(data);
    setLoading(false);
  };

  const updateJobStatus = async (jobId: string, newStatus: string) => {
    const { error } = await supabase
      .from('jobs')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', jobId)
      .eq('garage_id', garageId);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success(`Job moved to ${newStatus}`);
      fetchJobs();
    }
  };

  return (
    <div className="animate-fade-in" style={{ height: 'calc(100vh - 150px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Workshop Feed</h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>Visual production tracking and mechanic load management.</p>
        </div>
        <Button 
          leftIcon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>}
        >
          Create Job
        </Button>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', flex: 1, overflowX: 'auto', paddingBottom: '1rem' }}>
        {STATUS_COLUMNS.map(column => (
          <div key={column.id} style={{ minWidth: '320px', width: '320px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: column.color }}></div>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{column.label}</h3>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                {jobs.filter(j => j.status === column.id).length}
              </span>
            </div>

            <div style={{ flex: 1, background: 'rgba(255,255,255,0.01)', borderRadius: '16px', padding: '1rem', border: '1px dashed rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
              {jobs.filter(j => j.status === column.id).map(job => (
                <Card 
                  key={job.id} 
                  padding="1rem" 
                  className={`hover-glow animate-fade-in ${column.id === 'done' ? 'celebrate-success' : ''}`}
                  style={{ 
                    cursor: 'pointer', 
                    position: 'relative', 
                    borderLeft: `4px solid ${column.color}`,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  {column.id === 'in_progress' && (
                    <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem' }}>
                      <span className="live-indicator"></span>
                    </div>
                  )}
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>#{job.id.split('-')[0]}</span>
                    <span style={{ color: job.priority === 'high' ? 'var(--danger)' : 'var(--text-tertiary)', fontWeight: 800 }}>{job.priority?.toUpperCase()}</span>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                    {job.vehicles?.make} {job.vehicles?.model}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {job.description}
                  </div>
                  
                  {column.id === 'in_progress' && (() => {
                    const elapsed = Math.floor((Date.now() - new Date(job.updated_at || job.created_at).getTime()) / 60000);
                    const estimated = 120; // 2hr default service window
                    const pct = Math.min(100, Math.round((elapsed / estimated) * 100));
                    const remaining = Math.max(0, estimated - elapsed);
                    return (
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>Progress</span>
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: pct >= 90 ? 'var(--success)' : 'var(--accent-primary)' }}>
                            {remaining > 0 ? `ETA ${remaining}m` : 'Overdue'}
                          </span>
                        </div>
                        <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: pct >= 90 ? 'var(--success)' : 'var(--accent-primary)', boxShadow: `0 0 8px ${pct >= 90 ? 'var(--success)' : 'var(--accent-primary)'}`, transition: 'width 1s ease' }}></div>
                        </div>
                      </div>
                    );
                  })()}
                  
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {job.vehicles?.customers?.name || 'Wait-and-load'}
                    </div>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      {column.id !== 'pending' && (
                        <button onClick={(e) => { e.stopPropagation(); updateJobStatus(job.id, STATUS_COLUMNS[STATUS_COLUMNS.findIndex(c => c.id === column.id) - 1].id); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
                        </button>
                      )}
                      {column.id !== 'done' && (
                        <button onClick={(e) => { e.stopPropagation(); updateJobStatus(job.id, STATUS_COLUMNS[STATUS_COLUMNS.findIndex(c => c.id === column.id) + 1].id); }} style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
