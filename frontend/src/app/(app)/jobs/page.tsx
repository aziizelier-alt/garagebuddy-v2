'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import JobCard from '@/components/JobCard';
import Modal from '@/components/Modal';

export default function JobBoard() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [mechanics, setMechanics] = useState<any[]>([]);
  
  const [userRole, setUserRole] = useState('mechanic');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ vehicle_id: '', description: '', assigned_mechanic_id: '' });
  const [submitting, setSubmitting] = useState(false);

  const [isPartModalOpen, setIsPartModalOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [partFormData, setPartFormData] = useState({ part_id: '', quantity: '1' });
  const [partSubmitting, setPartSubmitting] = useState(false);
  const [parts, setParts] = useState<any[]>([]);

  const fetchJobs = async () => {
    const { data, error } = await supabase
      .from('jobs')
      .select('*, vehicles(make, model), customers(name)');
      
    if (!error && data) setJobs(data);
    setLoading(false);
  };

  const fetchDropdownData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (userId) {
      setCurrentUserId(userId);
      const { data: userDoc } = await supabase.from('users').select('role').eq('id', userId).single();
      if (userDoc) setUserRole(userDoc.role);
    }

    const { data: vData } = await supabase.from('vehicles').select('id, make, model, customers(name)');
    if (vData) setVehicles(vData);

    const { data: mData } = await supabase.from('users').select('id, full_name').eq('role', 'mechanic');
    if (mData) setMechanics(mData);

    const { data: pData } = await supabase.from('parts').select('id, name, price, stock').gt('stock', 0);
    if (pData) setParts(pData);
  };

  useEffect(() => {
    fetchJobs();
    fetchDropdownData();

    // Subscribe to realtime changes
    const channel = supabase.channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => { fetchJobs(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parts' }, () => { fetchDropdownData(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('jobId', id);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };

  const handleDrop = async (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const jobId = e.dataTransfer.getData('jobId');
    if (!jobId) return;

    setJobs(jobs.map(j => j.id === jobId ? { ...j, status } : j));
    await supabase.from('jobs').update({ status }).eq('id', jobId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicle_id) { alert("Please select a vehicle."); return; }
    
    setSubmitting(true);
    if (!currentUserId) return;

    const { data: userRecord } = await supabase.from('users').select('garage_id').eq('id', currentUserId).single();

    if (userRecord?.garage_id) {
      // If user is admin, use form selection. If mechanic, automatically assign to themselves
      const assignedId = userRole === 'admin' ? (formData.assigned_mechanic_id || null) : currentUserId;

      const { error } = await supabase.from('jobs').insert({
        garage_id: userRecord.garage_id,
        vehicle_id: formData.vehicle_id,
        description: formData.description,
        assigned_mechanic_id: assignedId,
        status: 'pending'
      });

      if (!error) {
        // Send a notification if assigned to someone else
        if (assignedId && assignedId !== currentUserId) {
          await supabase.from('notifications').insert({
            garage_id: userRecord.garage_id,
            user_id: assignedId,
            message: `You have been assigned a new repair job by an admin.`
          });
        }

        setIsModalOpen(false);
        setFormData({ vehicle_id: '', description: '', assigned_mechanic_id: '' });
        fetchJobs();
      } else { alert('Error adding job: ' + error.message); }
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
    } else {
      alert('Error adding part: ' + error.message);
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
    <div className="animate-fade-in" style={{ height: 'calc(100vh - 4rem)', display: 'flex', flexDirection: 'column' }}>
      <div className="dashboard-header-simple" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="dashboard-title" style={{ marginBottom: '0.5rem' }}>Job Board</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Drag and drop repair jobs to update their status.</p>
        </div>
        <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setIsModalOpen(true)}>
          + New Job Order
        </button>
      </div>

      <div className="kanban-board">
        {columns.map(col => (
          <div key={col.id} className="kanban-column" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, col.id)}>
            <div className="kanban-column-header">
              {col.title}
              <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px' }}>
                {jobs.filter(j => j.status === col.id).length}
              </span>
            </div>
            
            <div className="kanban-column-body">
              {jobs.filter(j => j.status === col.id).map(job => (
                <div key={job.id} draggable onDragStart={(e) => handleDragStart(e, job.id)} style={{ cursor: 'grab' }}>
                  <JobCard job={job} onAddPart={(id) => { setSelectedJobId(id); setIsPartModalOpen(true); }} />
                </div>
              ))}
              {jobs.filter(j => j.status === col.id).length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-tertiary)', fontSize: '0.875rem', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                  Drop jobs here
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
                  {v.make} {v.model} ({v.customers?.name})
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
              placeholder="e.g. Customer complains about a rattling noise..."
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            ></textarea>
          </div>

          {userRole === 'admin' && (
            <div className="form-group mb-4">
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting || vehicles.length === 0} style={{ width: 'auto' }}>
              {submitting ? 'Creating...' : 'Create Job'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isPartModalOpen} onClose={() => setIsPartModalOpen(false)} title="Add Part to Job">
        <form onSubmit={handleAddPartSubmit}>
          <div className="form-group">
            <label className="form-label">Select Part *</label>
            <select className="form-input" required value={partFormData.part_id} onChange={e => setPartFormData({...partFormData, part_id: e.target.value})}>
              <option value="" disabled>Choose from inventory...</option>
              {parts.map(p => (<option key={p.id} value={p.id}>{p.name} - ${p.price} ({p.stock} in stock)</option>))}
            </select>
          </div>
          <div className="form-group mb-4">
            <label className="form-label">Quantity</label>
            <input type="number" className="form-input" required min="1" value={partFormData.quantity} onChange={e => setPartFormData({...partFormData, quantity: e.target.value})} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsPartModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={partSubmitting || parts.length === 0} style={{ width: 'auto' }}>{partSubmitting ? 'Adding...' : 'Add Part'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
