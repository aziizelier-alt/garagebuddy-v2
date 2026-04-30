'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';

interface TimelineEvent {
  id: string;
  type: 'job' | 'booking' | 'invoice' | 'note' | 'audit';
  title: string;
  description: string;
  timestamp: string;
  status?: string;
  meta?: any;
}

export default function MasterTimeline({ customerId, vehicleId }: { customerId: string, vehicleId?: string }) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [reason, setReason] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (customerId) fetchTimeline();
  }, [customerId, vehicleId]);

  const fetchTimeline = async () => {
    setLoading(true);
    
    // In a production environment, this would be a single RPC call
    // For now, we fetch across tables and normalize
    const [jobs, invoices, bookings] = await Promise.all([
      supabase.from('jobs').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }),
      supabase.from('invoices').select('*, garages(name)').eq('garage_id', (await supabase.auth.getUser()).data.user?.id), // Simplified for now
      supabase.from('booking_requests').select('*').eq('garage_id', (await supabase.auth.getUser()).data.user?.id) // Simplified for now
    ]);

    const normalized: TimelineEvent[] = [];

    // 1. Process Jobs
    (jobs.data || []).forEach(j => {
      if (vehicleId && j.vehicle_id !== vehicleId) return;
      normalized.push({
        id: j.id,
        type: 'job',
        title: `Job Order #${j.id.split('-')[0].toUpperCase()}`,
        description: j.description || 'No description provided.',
        timestamp: j.created_at,
        status: j.status,
        meta: { priority: j.priority }
      });
    });

    // 2. Process Invoices (filtered by customer jobs in real logic)
    (invoices.data || []).forEach(inv => {
      normalized.push({
        id: inv.id,
        type: 'invoice',
        title: `Invoice Generated`,
        description: `Total Amount: £${inv.total_amount?.toFixed(2)}`,
        timestamp: inv.created_at,
        status: inv.status
      });
    });

    setEvents(normalized.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    setLoading(false);
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob || !newStatus || !reason) return;
    setIsUpdating(true);

    try {
      // 1. Update the Job
      const { error: jobError } = await supabase
        .from('jobs')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', selectedJob.id);

      if (jobError) throw jobError;

      // 2. Create Audit Log / History
      await supabase.from('audit_logs').insert({
        garage_id: selectedJob.garage_id || (await supabase.auth.getUser()).data.user?.id, // Fallback for MVP
        action: 'STATUS_CHANGE',
        details: {
          job_id: selectedJob.id,
          old_status: selectedJob.status,
          new_status: newStatus,
          reason: reason
        }
      });

      toast.success('Production status updated');
      setShowStatusModal(false);
      setReason('');
      fetchTimeline();
    } catch (err: any) {
      toast.error('Update failed: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleGenerateInvoice = async () => {
    if (!selectedJob) return;
    setIsUpdating(true);

    try {
      const { data, error } = await supabase
        .from('invoices')
        .insert({
          garage_id: selectedJob.garage_id || (await supabase.auth.getUser()).data.user?.id,
          job_id: selectedJob.id,
          total_amount: 0, // In Phase 12 this will be calculated from parts/labor
          status: 'draft',
          updated_at: new Date().toISOString()
        })
        .select().single();

      if (error) throw error;

      toast.success('Invoice Draft #' + data.id.split('-')[0] + ' created');
      setShowStatusModal(false);
      fetchTimeline();
    } catch (err: any) {
      toast.error('Invoice creation failed: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'job': return { color: 'var(--accent-primary)', icon: '🛠' };
      case 'invoice': return { color: 'var(--success)', icon: '£' };
      case 'booking': return { color: 'var(--warning)', icon: '📅' };
      default: return { color: 'var(--text-tertiary)', icon: '•' };
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>Syncing Pulse...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative', paddingLeft: '1.5rem' }}>
      <div style={{ position: 'absolute', left: '0', top: '0.5rem', bottom: '0.5rem', width: '2px', background: 'var(--border-color)', opacity: 0.5 }}></div>
      
      {events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-tertiary)' }}>No history found for this context.</div>
      ) : (
        events.map((event) => {
          const styles = getTypeStyles(event.type);
          return (
            <div key={event.id} style={{ position: 'relative' }}>
              <div style={{ 
                position: 'absolute', 
                left: '-1.5rem', 
                top: '0.25rem', 
                width: '10px', 
                height: '10px', 
                borderRadius: '50%', 
                background: styles.color,
                boxShadow: `0 0 10px ${styles.color}`,
                marginLeft: '-4px'
              }}></div>
              
              <Card 
                padding="1rem" 
                className="hover-glow" 
                style={{ 
                  borderLeft: `4px solid ${styles.color}`,
                  cursor: event.type === 'job' ? 'pointer' : 'default'
                }}
                onClick={() => {
                  if (event.type === 'job') {
                    setSelectedJob(event);
                    setNewStatus(event.status || '');
                    setShowStatusModal(true);
                  }
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem' }}>{styles.icon}</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 800 }}>{event.title}</span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                    {new Date(event.timestamp).toLocaleDateString()}
                  </span>
                </div>
                
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: '0.75rem' }}>
                  {event.description}
                </p>
                
                {event.status && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className={`status-badge status-${event.status}`} style={{ fontSize: '0.65rem' }}>
                      {event.status.replace('_', ' ')}
                    </span>
                    {event.meta?.priority === 'high' && (
                      <span style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--danger)', textTransform: 'uppercase' }}>High Priority</span>
                    )}
                  </div>
                )}
              </Card>
            </div>
          );
        })
      )}

      <Modal isOpen={showStatusModal} onClose={() => setShowStatusModal(false)} title="Update Production Status">
        <form onSubmit={handleUpdateStatus}>
          <div className="form-group">
            <label className="form-label">Current Status: <span style={{ textTransform: 'capitalize' }}>{selectedJob?.status}</span></label>
            <select 
              className="form-input" 
              value={newStatus} 
              onChange={(e) => setNewStatus(e.target.value)}
            >
              <option value="pending">Pending - In Queue</option>
              <option value="in_progress">In Progress - On Bay</option>
              <option value="waiting_parts">Waiting Parts - On Hold</option>
              <option value="done">Done - Quality Checked</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Reason for Change *</label>
            <textarea 
              className="form-input" 
              rows={3} 
              required 
              placeholder="e.g. Parts arrived, diagnostic complete, customer approved work..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <Button variant="secondary" style={{ flex: 1 }} onClick={() => setShowStatusModal(false)}>Cancel</Button>
            {selectedJob?.status === 'done' ? (
              <Button style={{ flex: 1, background: 'var(--success)' }} onClick={handleGenerateInvoice} isLoading={isUpdating}>Finalize Invoice</Button>
            ) : (
              <Button type="submit" style={{ flex: 1 }} isLoading={isUpdating}>Update Status</Button>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}
