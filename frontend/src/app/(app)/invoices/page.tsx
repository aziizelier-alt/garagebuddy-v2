'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUser } from '@/hooks/useUser';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { toast } from '@/components/ui/Toast';
import Link from 'next/link';

export default function InvoicesPage() {
  const { garageId, loading: userLoading } = useUser();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [doneJobs, setDoneJobs] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [laborCost, setLaborCost] = useState('100.00');
  const [partsCost, setPartsCost] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const fetchInvoices = async () => {
    if (!garageId) return;
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
      .eq('garage_id', garageId)
      .order('created_at', { ascending: false });
      
    if (!error && data) setInvoices(data);
    setLoading(false);
  };

  const fetchDoneJobs = async () => {
    if (!garageId) return;
    const { data } = await supabase
      .from('jobs')
      .select('id, description, vehicles(make, model, customers(name))')
      .eq('garage_id', garageId)
      .eq('status', 'done');
      
    // Filter out jobs that already have an invoice
    const { data: existingInvoices } = await supabase.from('invoices').select('job_id').eq('garage_id', garageId);
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
    if (!userLoading && garageId) fetchInvoices();
  }, [garageId, userLoading]);

  useEffect(() => {
    if (isModalOpen && garageId) fetchDoneJobs();
  }, [isModalOpen, garageId]);

  useEffect(() => {
    calculatePartsTotal(selectedJobId);
  }, [selectedJobId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobId || !garageId) return;
    
    setSubmitting(true);
    const totalAmount = parseFloat(laborCost) + partsCost;

    const { error } = await supabase.from('invoices').insert({
      garage_id: garageId,
      job_id: selectedJobId,
      total: totalAmount,
      status: 'unpaid'
    });

    if (!error) {
      setIsModalOpen(false);
      setSelectedJobId('');
      setLaborCost('100.00');
      fetchInvoices();
      toast.success('Invoice generated successfully');
    } else {
      toast.error('Error generating invoice: ' + error.message);
    }
    setSubmitting(false);
  };

  const handleMarkPaid = async (id: string) => {
    const { error } = await supabase.from('invoices').update({ status: 'paid' }).eq('id', id);
    if (!error) {
      toast.success('Invoice marked as paid');
      fetchInvoices();
    } else {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="dashboard-header-simple" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="dashboard-title" style={{ marginBottom: '0.5rem' }}>Invoices</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Track billing and payments for completed jobs.</p>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          leftIcon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>}
        >
          Generate Invoice
        </Button>
      </div>

      <Card padding="0">
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
                  <td colSpan={6} className="text-center" style={{ padding: '3rem', color: 'var(--text-tertiary)' }}>Loading invoices...</td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center" style={{ padding: '4rem', color: 'var(--text-tertiary)' }}>
                    <div style={{ marginBottom: '1rem', opacity: 0.5 }}>
                       <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                    </div>
                    <div style={{ fontSize: '1.125rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No invoices yet</div>
                    <p>Complete a repair job and move it to 'Done' to generate your first invoice.</p>
                  </td>
                </tr>
              ) : (
                invoices.map(inv => {
                  const shortId = inv.id.split('-')[0].toUpperCase();
                  const vehicle = inv.jobs?.vehicles?.make ? `${inv.jobs.vehicles.make} ${inv.jobs.vehicles.model}` : 'Unknown Vehicle';
                  const customer = inv.jobs?.vehicles?.customers?.name || 'Unknown';
                  
                  return (
                    <tr key={inv.id}>
                      <td><code style={{ fontSize: '0.8125rem', color: 'var(--accent-primary)', background: 'rgba(59, 130, 246, 0.05)', padding: '2px 6px', borderRadius: '4px' }}>INV-{shortId}</code></td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{vehicle}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {inv.jobs?.description}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{customer}</td>
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>£{Number(inv.total).toFixed(2)}</td>
                      <td>
                        <Badge variant={inv.status === 'paid' ? 'success' : 'danger'}>{inv.status}</Badge>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <Link href={`/invoices/${inv.id}`} style={{ textDecoration: 'none' }}>
                            <Button variant="secondary" size="sm">Receipt</Button>
                          </Link>
                          {inv.status === 'unpaid' && (
                            <Button 
                              size="sm"
                              style={{ background: 'var(--success)', boxShadow: 'none' }}
                              onClick={() => handleMarkPaid(inv.id)}
                            >
                              Mark Paid
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

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
                  {job.vehicles?.make} {job.vehicles?.model} — {job.vehicles?.customers?.name}
                </option>
              ))}
            </select>
            {doneJobs.length === 0 && <p style={{ fontSize: '0.75rem', color: 'var(--warning)', marginTop: '0.5rem' }}>No un-invoiced completed jobs found. Move a job to 'Done' first.</p>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '2rem', padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div>
              <label className="form-label" style={{ marginBottom: '0.25rem' }}>Parts Total</label>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                £{partsCost.toFixed(2)}
              </div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>Automated from job board</p>
            </div>
            
            <div className="form-group mb-0">
              <label className="form-label">Labor Cost (£)</label>
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

          <div style={{ marginTop: '2.5rem', paddingTop: '2rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Final Amount</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-primary)', lineHeight: 1 }}>
                £{(partsCost + parseFloat(laborCost || '0')).toFixed(2)}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" isLoading={submitting} disabled={doneJobs.length === 0}>Generate</Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
