'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useUser } from '@/hooks/useUser';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';

export default function JobDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { garageId } = useUser();
  const [job, setJob] = useState<any>(null);
  const [mechanics, setMechanics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([
    { id: 1, label: 'Visual Safety Inspection', completed: false },
    { id: 2, label: 'Drain Fluid & Capture Samples', completed: false },
    { id: 3, label: 'Install Replacement Components', completed: false },
    { id: 4, label: 'Final Pressure & Leak Test', completed: false },
  ]);

  useEffect(() => {
    if (garageId && id) {
      fetchJob();
      fetchMechanics();
    }
  }, [garageId, id]);

  const fetchJob = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('jobs')
      .select('*, vehicles(*, customers(*))')
      .eq('id', id)
      .single();
    
    if (data) setJob(data);
    setLoading(false);
  };

  const fetchMechanics = async () => {
    const { data } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('garage_id', garageId)
      .eq('role', 'mechanic');
    
    if (data) setMechanics(data);
  };

  const toggleTask = (taskId: number) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));
  };

  const handleUpdate = async (updates: any) => {
    const { error } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast.error("Update failed");
    } else {
      toast.success("Job updated");
      fetchJob();
    }
  };

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center' }}>Decrypting job telemetry...</div>;

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '2rem' }}>
        <Button variant="ghost" onClick={() => router.back()}>← Back</Button>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Job Order #{String(id).split('-')[0]}</h1>
        <span className={`status-badge status-${job.status}`} style={{ marginLeft: 'auto' }}>{job.status}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <Card>
            <CardHeader>
              <CardTitle>Task Checklist (SOP)</CardTitle>
            </CardHeader>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem', marginBottom: '1.5rem' }}>Complete all standard operating procedures before marking ready.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {tasks.map(task => (
                <div 
                  key={task.id} 
                  onClick={() => toggleTask(task.id)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '1rem', 
                    padding: '1rem', 
                    background: task.completed ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255,255,255,0.02)', 
                    borderRadius: '12px',
                    border: task.completed ? '1px solid var(--success)' : '1px solid var(--border-color)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ 
                    width: '20px', 
                    height: '20px', 
                    borderRadius: '6px', 
                    border: '2px solid', 
                    borderColor: task.completed ? 'var(--success)' : 'var(--text-tertiary)',
                    background: task.completed ? 'var(--success)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {task.completed && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                  <span style={{ fontWeight: 600, color: task.completed ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{task.label}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Workshop Intelligence</CardTitle>
            </CardHeader>
            <div className="form-group">
              <label className="form-label">Internal Handover Notes</label>
              <textarea 
                className="form-input" 
                rows={4} 
                placeholder="Add special instructions for the mechanic..."
                defaultValue={job.description}
              ></textarea>
              <Button size="sm" style={{ marginTop: '1rem' }}>Post Note</Button>
            </div>
          </Card>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <Card>
            <CardHeader>
              <CardTitle>Assets & Owner</CardTitle>
            </CardHeader>
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>Vehicle</div>
              <div style={{ fontWeight: 700 }}>{job.vehicles?.year} {job.vehicles?.make} {job.vehicles?.model}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>Client</div>
              <div style={{ fontWeight: 700 }}>{job.vehicles?.customers?.name}</div>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assignment</CardTitle>
            </CardHeader>
            <div className="form-group">
              <label className="form-label">Assigned Mechanic</label>
              <select 
                className="form-input"
                value={job.assigned_mechanic_id || ''}
                onChange={(e) => handleUpdate({ assigned_mechanic_id: e.target.value })}
              >
                <option value="">Unassigned</option>
                {mechanics.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority Level</label>
              <select 
                className="form-input"
                value={job.priority || 'normal'}
                onChange={(e) => handleUpdate({ priority: e.target.value })}
              >
                <option value="low">Low Priority</option>
                <option value="normal">Normal</option>
                <option value="high">High / Urgent</option>
              </select>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
