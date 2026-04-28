'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Modal from '@/components/Modal';
import Link from 'next/link';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [doneJobs, setDoneJobs] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [laborCost, setLaborCost] = useState('100.00');
  const [partsCost, setPartsCost] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const fetchInvoices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        jobs(
          id,
          description,
          vehicles(make, model, customers(name))
        )
      `)
      .order('created_at', { ascending: false });
      
    if (!error && data) setInvoices(data);
    setLoading(false);
  };

  const fetchDoneJobs = async () => {
    const { data } = await supabase
      .from('jobs')
      .select('id, description, vehicles(make, model, customers(name))')
      .eq('status', 'done');
      
    // Filter out jobs that already have an invoice
    const { data: existingInvoices } = await supabase.from('invoices').select('job_id');
    const invoicedJobIds = existingInvoices?.map(i => i.job_id) || [];
    
    if (data) {
      setDoneJobs(data.filter(job => !invoicedJobIds.includes(job.id)));
    }
  };

  const calculatePartsTotal = async (jobId: string) => {
    if (!jobId) {
      setPartsCost(0);
      return;
    }
    const { data } = await supabase
      .from('job_parts')
      .select('quantity, parts(price)')
      .eq('job_id', jobId);
      
    let total = 0;
    if (data) {
      data.forEach(jp => {
        total += (jp.quantity * (jp.parts as any).price);
      });
    }
    setPartsCost(total);
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  useEffect(() => {
    if (isModalOpen) fetchDoneJobs();
  }, [isModalOpen]);

  useEffect(() => {
    calculatePartsTotal(selectedJobId);
  }, [selectedJobId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobId) return;
    
    setSubmitting(true);
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return;

    const { data: userRecord } = await supabase.from('users').select('garage_id').eq('id', userId).single();

    if (userRecord?.garage_id) {
      const totalAmount = parseFloat(laborCost) + partsCost;

      const { error } = await supabase.from('invoices').insert({
        garage_id: userRecord.garage_id,
        job_id: selectedJobId,
        total: totalAmount,
        status: 'unpaid'
      });

      if (!error) {
        setIsModalOpen(false);
        setSelectedJobId('');
        setLaborCost('100.00');
        fetchInvoices();
      } else {
        alert('Error generating invoice: ' + error.message);
      }
    }
    setSubmitting(false);
  };

  const handleMarkPaid = async (id: string) => {
    await supabase.from('invoices').update({ status: 'paid' }).eq('id', id);
    fetchInvoices();
  };

  return (
    <div className="animate-fade-in">
      <div className="dashboard-header-simple" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="dashboard-title" style={{ marginBottom: '0.5rem' }}>Invoices</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Track billing and payments for completed jobs.</p>
        </div>
        <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setIsModalOpen(true)}>
          + Generate Invoice
        </button>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Invoice ID</th>
              <th>Job / Vehicle</th>
              <th>Customer</th>
              <th>Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center" style={{ padding: '2rem' }}>Loading invoices...</td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center" style={{ padding: '2rem' }}>No invoices found. Complete a job to generate one.</td>
              </tr>
            ) : (
              invoices.map(inv => {
                const shortId = inv.id.split('-')[0].toUpperCase();
                const jobDesc = inv.jobs?.description || 'Unknown Job';
                const vehicle = inv.jobs?.vehicles?.make ? `${inv.jobs.vehicles.make} ${inv.jobs.vehicles.model}` : 'Unknown Vehicle';
                const customer = inv.jobs?.vehicles?.customers?.name || 'Unknown';
                
                return (
                  <tr key={inv.id}>
                    <td><code style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>INV-{shortId}</code></td>
                    <td style={{ maxWidth: '300px' }}>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{vehicle}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {jobDesc}
                      </div>
                    </td>
                    <td>{customer}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>${Number(inv.total).toFixed(2)}</td>
                    <td>
                      <span className={`status-badge status-${inv.status}`}>
                        {inv.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ display: 'flex', gap: '0.5rem' }}>
                      <Link href={`/invoices/${inv.id}`} className="btn-secondary" style={{ textDecoration: 'none', padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', display: 'inline-block' }}>
                        View Receipt
                      </Link>
                      {inv.status === 'unpaid' && (
                        <button 
                          onClick={() => handleMarkPaid(inv.id)}
                          className="btn-primary" 
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', border: 'none', background: 'var(--success)' }}
                        >
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Generate Invoice">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Select Completed Job *</label>
            <select 
              className="form-input" 
              required
              value={selectedJobId}
              onChange={e => setSelectedJobId(e.target.value)}
            >
              <option value="" disabled>Choose a done job...</option>
              {doneJobs.map(job => (
                <option key={job.id} value={job.id}>
                  {job.vehicles?.make} {job.vehicles?.model} - {job.vehicles?.customers?.name} (Job: {job.id.split('-')[0]})
                </option>
              ))}
            </select>
            {doneJobs.length === 0 && <p style={{ fontSize: '0.75rem', color: 'var(--warning)', marginTop: '0.5rem' }}>No un-invoiced completed jobs found. Move a job to 'Done' first.</p>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)' }}>
            <div>
              <label className="form-label">Parts Total</label>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                ${partsCost.toFixed(2)}
              </div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>Calculated from job_parts</p>
            </div>
            
            <div className="form-group mb-0">
              <label className="form-label">Labor Cost ($)</label>
              <input 
                type="number" 
                step="0.01"
                className="form-input" 
                required 
                value={laborCost}
                onChange={e => setLaborCost(e.target.value)}
              />
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px dashed var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Total Invoice Amount</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>
                ${(partsCost + parseFloat(laborCost || '0')).toFixed(2)}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting || doneJobs.length === 0} style={{ width: 'auto' }}>
                {submitting ? 'Generating...' : 'Create Invoice'}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
