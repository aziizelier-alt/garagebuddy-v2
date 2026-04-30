'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useUser } from '@/hooks/useUser';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';
import MasterTimeline from '@/components/MasterTimeline';
import VarrAssistant from '@/components/VarrAssistant';
import Link from 'next/link';

export default function CustomerProfilePage() {
  const { id } = useParams();
  const { garageId } = useUser();
  const router = useRouter();
  
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({ ltv: 0, avgValue: 0, visitFreq: 0, lostRevenue: 0, mechanicAffinity: 'None' });
  const [alerts, setAlerts] = useState<string[]>([]);
  const [projections, setProjections] = useState<any>({});
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newJob, setNewJob] = useState({ description: '', priority: 'normal' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (garageId && id) {
      fetchCustomer();

      // REALTIME SUBSCRIPTION: Sync production updates instantly
      const channel = supabase.channel('production-sync')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'jobs', 
          filter: `customer_id=eq.${id}` 
        }, () => {
          fetchCustomer(); // Re-sync entire context on change
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [garageId, id]);

  const fetchCustomer = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('customers')
      .select('*, vehicles(*)')
      .eq('id', id)
      .eq('garage_id', garageId)
      .single();

    if (error || !data) {
      toast.error('Customer not found');
      router.push('/customers');
      return;
    }

    setCustomer(data);
    if (data.vehicles?.length > 0) {
      setSelectedVehicle(data.vehicles[0]);
    }

    // 2. Calculate Intelligence Metrics
    const { data: invoices } = await supabase
      .from('invoices')
      .select('total_amount, status')
      .eq('job_id', data.jobs?.[0]?.id || 'none'); // Simplified for MVP join

    const ltv = (invoices || []).filter(i => i.status === 'paid').reduce((acc, i) => acc + (i.total_amount || 0), 0);
    const lostRevenue = (invoices || []).filter(i => i.status === 'voided').reduce((acc, i) => acc + (i.total_amount || 0), 0);
    const jobCount = data.vehicles?.reduce((acc: number, v: any) => acc + (v.jobs?.length || 0), 0) || 1;

    // Calculate Mechanic Affinity
    const allMechanics = data.vehicles?.flatMap((v: any) => v.jobs?.map((j: any) => j.assigned_mechanic_id)) || [];
    const affinityMap = allMechanics.reduce((acc: any, id: string) => {
      if (id) acc[id] = (acc[id] || 0) + 1;
      return acc;
    }, {});
    const leadMechanicId = Object.keys(affinityMap).sort((a, b) => affinityMap[b] - affinityMap[a])[0];

    setMetrics({
      ltv,
      avgValue: ltv / jobCount,
      visitFreq: jobCount,
      lostRevenue,
      mechanicAffinity: leadMechanicId ? 'Dave (Lead Tech)' : 'No Primary Assigned'
    });

    // 3. Detect Technical Patterns (Recurring Issues)
    const activeVehicleJobs = data.vehicles?.find((v: any) => v.id === selectedVehicle?.id)?.jobs || [];
    if (activeVehicleJobs.length > 1) {
      const descriptions = activeVehicleJobs.map((j: any) => j.description?.toLowerCase());
      const duplicates = descriptions.filter((item: string, index: number) => descriptions.indexOf(item) !== index && item.length > 5);
      if (duplicates.length > 0) {
        setAlerts(prev => [...prev, `RECURRING ISSUE: Multiple reports of "${duplicates[0]}" detected for this vehicle.`]);
      }
    }

    // 4. Mileage Projection & Service Prediction
    if (selectedVehicle) {
      const vJobs = activeVehicleJobs.filter((j: any) => j.mileage > 0).sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      if (vJobs.length >= 2) {
        const m1 = vJobs[0].mileage;
        const m2 = vJobs[vJobs.length - 1].mileage;
        const d1 = new Date(vJobs[0].created_at).getTime();
        const d2 = new Date(vJobs[vJobs.length - 1].created_at).getTime();
        
        const milesPerDay = (m2 - m1) / ((d2 - d1) / (1000 * 60 * 60 * 24));
        const daysSinceLast = (new Date().getTime() - d2) / (1000 * 60 * 60 * 24);
        const projectedMileage = m2 + (milesPerDay * daysSinceLast);
        
        setProjections({
          current: Math.round(projectedMileage),
          dailyRate: milesPerDay.toFixed(1)
        });

        if (daysSinceLast > 300) {
          setAlerts(prev => [...prev, `SERVICE OVERDUE: Vehicle has not been inspected in ${Math.round(daysSinceLast)} days.`]);
        }
      }
    }

    setLoading(false);
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!garageId || !selectedVehicle) return;
    setIsSaving(true);

    const { data, error } = await supabase
      .from('jobs')
      .insert({
        garage_id: garageId,
        customer_id: id,
        vehicle_id: selectedVehicle.id,
        status: 'pending',
        description: newJob.description,
        priority: newJob.priority,
        updated_at: new Date().toISOString()
      })
      .select().single();

    if (error) {
      toast.error('Failed to create job');
    } else {
      toast.success('Job Order #'+data.id.split('-')[0]+' initialized');
      setShowJobModal(false);
      setNewJob({ description: '', priority: 'normal' });
      // In Phase 5, this will refresh the timeline
    }
    setIsSaving(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!garageId || !message) return;
    setIsSaving(true);

    const { error } = await supabase
      .from('notifications')
      .insert({
        garage_id: garageId,
        message: `MESSAGE TO ${customer.name}: ${message}`,
      });

    if (error) {
      toast.error('Failed to send message');
    } else {
      toast.success('Message sent to client');
      setShowMessageModal(false);
      setMessage('');
      // In a real app, this would also trigger an external SMS/Email API
    }
    setIsSaving(false);
  };

  if (loading) {
    return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>Initializing Intelligence Hub...</div>;
  }

  return (
    <div className="animate-fade-in customer-cockpit-grid">
      
      {/* LEFT: IDENTITY & VALUE CARD */}
      <aside className="identity-panel">
        <Card glass padding="2rem" style={{ textAlign: 'center' }}>
          <div style={{ width: '80px', height: '80px', background: 'var(--accent-gradient)', borderRadius: '50%', margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 900, boxShadow: '0 0 20px var(--accent-glow)' }}>
            {customer.name?.charAt(0)}
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>{customer.name}</h2>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            {(customer.tags || []).map((t: string) => (
              <span key={t} className="status-badge" style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)' }}>{t}</span>
            ))}
            {metrics.ltv > 1000 && (
              <span className="status-badge" style={{ fontSize: '0.65rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-primary)' }}>High Value</span>
            )}
          </div>
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>Primary Contact</div>
              <div style={{ fontWeight: 600 }}>{customer.phone || 'No phone'}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{customer.email}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>Mailing Address</div>
              <div style={{ fontSize: '0.875rem', lineHeight: 1.4 }}>{customer.address || 'Not provided'}</div>
            </div>
          </div>
        </Card>

        <Card style={{ background: 'rgba(255,255,255,0.01)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Client Value</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Lifetime Spend</span>
            <span style={{ fontWeight: 800, color: 'var(--success)' }}>£{metrics.ltv.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Lost Revenue</span>
            <span style={{ fontWeight: 800, color: 'var(--danger)' }}>£{metrics.lostRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Lead Mechanic</span>
            <span style={{ fontWeight: 800 }}>{metrics.mechanicAffinity}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Avg. Visit Value</span>
            <span style={{ fontWeight: 800 }}>£{metrics.avgValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </Card>
      </aside>

      {/* CENTER: OPERATIONS HUB */}
      <main className="operations-hub">
        
        <VarrAssistant />

        {/* ALERTS & INTELLIGENCE */}
        {alerts.map((alert, i) => (
          <Card key={i} style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 900 }}>!</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 700 }}>{alert}</div>
            </div>
          </Card>
        ))}

        {/* VEHICLE CAROUSEL */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div className="live-indicator"></div>
            <h3 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-secondary)' }}>Digital Garage</h3>
          </div>
          <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
            {customer.vehicles?.map((v: any) => {
              const isActive = v.jobs?.some((j: any) => j.status === 'in_progress');
              return (
                <Card 
                  key={v.id} 
                  padding="1.25rem" 
                  className={`hover-glow ${selectedVehicle?.id === v.id ? 'active-glow' : ''} ${isActive ? 'production-pulse' : ''}`}
                  style={{ 
                    minWidth: '260px', 
                    cursor: 'pointer', 
                    border: selectedVehicle?.id === v.id ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    background: selectedVehicle?.id === v.id ? 'rgba(59, 130, 246, 0.03)' : 'var(--card-bg)',
                    position: 'relative'
                  }}
                  onClick={() => setSelectedVehicle(v)}
                >
                  {isActive && (
                    <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <div className="live-indicator"></div>
                      <span style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>On Bay</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div style={{ background: '#FFD700', color: '#000', padding: '2px 8px', borderRadius: '4px', fontWeight: 900, fontSize: '0.875rem', fontFamily: 'monospace', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
                    {v.license_plate}
                  </div>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-tertiary)' }}>{v.year}</span>
                </div>
                <div style={{ fontWeight: 800, fontSize: '1.125rem' }}>{v.make} {v.model}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                  Recorded: {v.mileage?.toLocaleString()} mi
                  {selectedVehicle?.id === v.id && projections.current && (
                    <div style={{ color: 'var(--accent-primary)', fontWeight: 700, marginTop: '0.25rem' }}>
                      Projected: {projections.current.toLocaleString()} mi
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
            <Button variant="ghost" style={{ minWidth: '100px', height: '120px', border: '1px dashed var(--border-color)' }}>
              + Add
            </Button>
          </div>
        </section>

        {/* UNIFIED TIMELINE */}
        <section style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <h3 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-secondary)' }}>Master Timeline</h3>
          </div>
          <MasterTimeline customerId={id as string} vehicleId={selectedVehicle?.id} />
        </section>
      </main>

      {/* RIGHT: QUICK ACTIONS */}
      <aside className="actions-panel">
        <CardHeader style={{ padding: '0 0 0.5rem 0' }}>
          <CardTitle>Directives</CardTitle>
        </CardHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Button 
            style={{ justifyContent: 'flex-start' }} 
            leftIcon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>}
            onClick={() => setShowJobModal(true)}
            disabled={!selectedVehicle}
          >
            New Job Order
          </Button>
          <Button variant="secondary" style={{ justifyContent: 'flex-start' }} leftIcon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>}>Create Quote</Button>
          <Button 
            variant="secondary" 
            style={{ justifyContent: 'flex-start' }} 
            leftIcon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
            onClick={() => setShowMessageModal(true)}
          >
            Message Client
          </Button>
          <Button variant="secondary" style={{ justifyContent: 'flex-start' }} leftIcon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}>Book Appointment</Button>
        </div>

        <div style={{ marginTop: 'auto' }}>
          <Card style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--danger)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Critical Alert</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>Vehicle due for MOT in 14 days. Suggest booking now.</p>
          </Card>
        </div>
      </aside>

      <Modal isOpen={showJobModal} onClose={() => setShowJobModal(false)} title={`New Job Order — ${selectedVehicle?.license_plate}`}>
        <form onSubmit={handleCreateJob}>
          <div className="form-group">
            <label className="form-label">Work Description / Symptoms *</label>
            <textarea 
              className="form-input" 
              rows={4} 
              required 
              placeholder="e.g. Engine misfire at idle, customer reported squeaky brakes..."
              value={newJob.description}
              onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
              style={{ resize: 'none' }}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Priority Level</label>
            <select 
              className="form-input" 
              value={newJob.priority} 
              onChange={(e) => setNewJob({ ...newJob, priority: e.target.value })}
            >
              <option value="low">Low - Routine Service</option>
              <option value="normal">Normal - Production Feed</option>
              <option value="high">High - Urgent / Wait-and-Load</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <Button variant="secondary" style={{ flex: 1 }} onClick={() => setShowJobModal(false)}>Cancel</Button>
            <Button type="submit" style={{ flex: 1 }} isLoading={isSaving}>Initialize Job</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showMessageModal} onClose={() => setShowMessageModal(false)} title={`Message — ${customer.name}`}>
        <form onSubmit={handleSendMessage}>
          <div className="form-group">
            <label className="form-label">Message Content</label>
            <textarea 
              className="form-input" 
              rows={5} 
              required 
              placeholder="e.g. Your vehicle is ready for collection. Total balance is £..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{ resize: 'none' }}
            />
          </div>
          <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            This message will be sent via **SMS** and recorded in the workshop timeline.
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <Button variant="secondary" style={{ flex: 1 }} onClick={() => setShowMessageModal(false)}>Cancel</Button>
            <Button type="submit" style={{ flex: 1 }} isLoading={isSaving}>Send Message</Button>
          </div>
        </form>
      </Modal>

      <style jsx global>{`
        .customer-cockpit-grid {
          display: grid;
          grid-template-columns: 320px 1fr 280px;
          gap: 2rem;
          height: calc(100vh - 100px);
        }
        .identity-panel, .actions-panel {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          overflow-y: auto;
          padding-right: 0.5rem;
        }
        .operations-hub {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          overflow-y: auto;
          padding-bottom: 2rem;
        }
        .active-glow {
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.2);
        }
        .production-pulse {
          animation: production-border-pulse 2s infinite;
        }
        @keyframes production-border-pulse {
          0% { border-color: var(--border-color); }
          50% { border-color: var(--accent-primary); box-shadow: 0 0 15px rgba(59, 130, 246, 0.1); }
          100% { border-color: var(--border-color); }
        }

        @media (max-width: 1200px) {
          .customer-cockpit-grid {
            grid-template-columns: 280px 1fr;
          }
          .actions-panel {
            display: none; /* Accessible via floating menu in future */
          }
        }
        @media (max-width: 900px) {
          .customer-cockpit-grid {
            grid-template-columns: 1fr;
            height: auto;
            overflow-y: visible;
          }
          .identity-panel, .operations-hub {
            overflow-y: visible;
            height: auto;
          }
        }
      `}</style>
    </div>
  );
}
