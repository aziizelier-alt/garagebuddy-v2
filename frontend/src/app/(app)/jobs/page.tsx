'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUser } from '@/hooks/useUser';
import JobCard from '@/components/JobCard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';

export default function JobBoard() {
  const { garageId, userRole, userId, loading: userLoading } = useUser();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [mechanics, setMechanics] = useState<any[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ vehicle_id: '', description: '', assigned_mechanic_id: '' });
  const [submitting, setSubmitting] = useState(false);

  const [isPartModalOpen, setIsPartModalOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [partFormData, setPartFormData] = useState({ part_id: '', quantity: '1' });
  const [partSubmitting, setPartSubmitting] = useState(false);
  const [parts, setParts] = useState<any[]>([]);

  const fetchJobs = async () => {
    if (!garageId) return;
    const { data, error } = await supabase
      .from('jobs')
      .select('*, vehicles(make, model, customers(name))')
      .eq('garage_id', garageId);
      
    if (!error && data) setJobs(data);
    setLoading(false);
  };

  const fetchDropdownData = async () => {
    if (!garageId) return;

    const { data: vData } = await supabase.from('vehicles').select('id, make, model, customers(name)').eq('garage_id', garageId);
    if (vData) setVehicles(vData);

    const { data: mData } = await supabase.from('users').select('id, full_name').eq('garage_id', garageId).eq('role', 'mechanic');
    if (mData) setMechanics(mData);

    const { data: pData } = await supabase.from('parts').select('id, name, price, stock').eq('garage_id', garageId).gt('stock', 0);
    if (pData) setParts(pData);
  };

  useEffect(() => {
    if (!userLoading && garageId) {
      fetchJobs();
      fetchDropdownData();

      const channel = supabase.channel('schema-db-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs', filter: `garage_id=eq.${garageId}` }, () => { fetchJobs(); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'parts', filter: `garage_id=eq.${garageId}` }, () => { fetchDropdownData(); })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [garageId, userLoading]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('jobId', id);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };

  const handleDrop = async (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const jobId = e.dataTransfer.getData('jobId');
    if (!jobId) return;

    // Optimistic update
    setJobs(jobs.map(j => j.id === jobId ? { ...j, status } : j));
    
    const { error } = await supabase.from('jobs').update({ status }).eq('id', jobId);
    if (error) {
      toast.error('Failed to update job status');
      fetchJobs(); // Revert
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicle_id || !garageId || !userId) { toast.error("Please select a vehicle."); return; }
    
    setSubmitting(true);
    const assignedId = userRole === 'admin' ? (formData.assigned_mechanic_id || null) : userId;

    const { error } = await supabase.from('jobs').insert({
      garage_id: garageId,
      vehicle_id: formData.vehicle_id,
      description: formData.description,
      assigned_mechanic_id: assignedId,
      status: 'pending'
    });

    if (!error) {
      if (assignedId && assignedId !== userId) {
        await supabase.from('notifications').insert({
          garage_id: garageId,
          user_id: assignedId,
          message: `You have been assigned a new repair job.`
        });
      }

      setIsModalOpen(false);
      setFormData({ vehicle_id: '', description: '', assigned_mechanic_id: '' });
      fetchJobs();
      toast.success('Job order created successfully');
    } else { 
      toast.error('Error adding job: ' + error.message); 
    }
    
    setSubmitting(false);
  };

  const handleAddPartSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobId || !partFormData.part_id) return;
    
    setPartSubmitting(true);
    const qty = parseInt(partFormData.quantity) || 1;

    const { error } = await supabase.from('job_parts').insert({
      job_id: selectedJobId,
      part_id: partFormData.part_id,
      quantity: qty
    });

    if (!error) {
      const part = parts.find(p => p.id === partFormData.part_id);
      if (part) {
        await supabase.from('parts').update({ stock: part.stock - qty }).eq('id', part.id);
      }
      setIsPartModalOpen(false);
      setPartFormData({ part_id: '', quantity: '1' });
      toast.success('Part added to job');
    } else {
      toast.error('Error adding part: ' + error.message);
    }
    setPartSubmitting(false);
  };

  const columns = [
    { id: 'pending', title: 'Pending' },
    { id: 'in_progress', title: 'In Progress' },
    { id: 'waiting_parts', title: 'Waiting on Parts' },
    { id: 'done', title: 'Done' }
  ];

  return (
    <div className="animate-fade-in" style={{ height: 'calc(100vh - 8rem)', display: 'flex', flexDirection: 'column' }}>
      <div className="dashboard-header-simple" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="dashboard-title" style={{ marginBottom: '0.5rem' }}>Job Board</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Workflow management for your workshop.</p>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          leftIcon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>}
        >
          New Job Order
        </Button>
      </div>

      <div className="kanban-board" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', flex: 1, minHeight: 0 }}>
        {columns.map(col => (
          <div 
            key={col.id} 
            className="kanban-column" 
            onDragOver={handleDragOver} 
            onDrop={(e) => handleDrop(e, col.id)}
            style={{ 
              background: 'rgba(255,255,255,0.02)', 
              borderRadius: 'var(--radius-lg)', 
              display: 'flex', 
              flexDirection: 'column',
              border: '1px solid var(--border-color)',
              minHeight: 0
            }}
          >
            <div className="kanban-column-header" style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{col.title}</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)', background: 'rgba(59, 130, 246, 0.1)', padding: '2px 10px', borderRadius: '12px' }}>
                {jobs.filter(j => j.status === col.id).length}
              </span>
            </div>
            
            <div className="kanban-column-body" style={{ padding: '1rem', overflowY: 'auto', flex: 1 }}>
              {jobs.filter(j => j.status === col.id).map(job => (
                <div key={job.id} draggable onDragStart={(e) => handleDragStart(e, job.id)}>
                  <JobCard job={job} onAddPart={(id) => { setSelectedJobId(id); setIsPartModalOpen(true); }} />
                </div>
              ))}
              {jobs.filter(j => j.status === col.id).length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-tertiary)', fontSize: '0.8125rem', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', opacity: 0.5 }}>
                  Drag jobs here
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Job Order">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Select Vehicle *</label>
            <select 
              className="form-input" 
              required
              value={formData.vehicle_id}
              onChange={e => setFormData({...formData, vehicle_id: e.target.value})}
            >
              <option value="" disabled>Select a vehicle...</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>
                  {v.make} {v.model} — {v.customers?.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Job Description / Complaint *</label>
            <textarea 
              className="form-input" 
              required 
              rows={4}
              placeholder="Describe the issue or service needed..."
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            ></textarea>
          </div>

          {userRole === 'admin' && (
            <div className="form-group">
              <label className="form-label">Assign Mechanic</label>
              <select 
                className="form-input" 
                value={formData.assigned_mechanic_id}
                onChange={e => setFormData({...formData, assigned_mechanic_id: e.target.value})}
              >
                <option value="">Unassigned</option>
                {mechanics.map(m => (
                  <option key={m.id} value={m.id}>{m.full_name}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2.5rem' }}>
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={submitting} disabled={vehicles.length === 0}>Create Job Order</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isPartModalOpen} onClose={() => setIsPartModalOpen(false)} title="Add Part to Job">
        <form onSubmit={handleAddPartSubmit}>
          <div className="form-group">
            <label className="form-label">Select Part *</label>
            <select className="form-input" required value={partFormData.part_id} onChange={e => setPartFormData({...partFormData, part_id: e.target.value})}>
              <option value="" disabled>Choose from inventory...</option>
              {parts.map(p => (<option key={p.id} value={p.id}>{p.name} — £{p.price} ({p.stock} in stock)</option>))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Quantity</label>
            <input type="number" className="form-input" required min="1" value={partFormData.quantity} onChange={e => setPartFormData({...partFormData, quantity: e.target.value})} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2.5rem' }}>
            <Button variant="secondary" type="button" onClick={() => setIsPartModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={partSubmitting} disabled={parts.length === 0}>Add to Job</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
