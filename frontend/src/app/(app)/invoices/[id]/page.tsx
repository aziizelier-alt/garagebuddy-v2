'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function InvoiceReceiptPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  
  const [invoice, setInvoice] = useState<any>(null);
  const [jobParts, setJobParts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInvoiceDetails() {
      if (!id) return;
      
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          garages(name),
          jobs(
            description,
            vehicles(make, model, year, vin, customers(name, phone, email))
          )
        `)
        .eq('id', id)
        .single();
        
      if (error || !data) {
        console.error("Error fetching invoice", error);
        router.push('/invoices');
        return;
      }
      
      setInvoice(data);

      // Fetch parts for this job
      if (data.job_id) {
        const { data: pData } = await supabase
          .from('job_parts')
          .select('quantity, parts(name, price)')
          .eq('job_id', data.job_id);
        
        if (pData) setJobParts(pData);
      }
      
      setLoading(false);
    }
    
    fetchInvoiceDetails();
  }, [id, router]);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading receipt...</div>;
  }

  const customer = invoice.jobs?.vehicles?.customers;
  const vehicle = invoice.jobs?.vehicles;
  
  const partsSubtotal = jobParts.reduce((acc, jp) => acc + (jp.quantity * jp.parts.price), 0);
  const laborTotal = Number(invoice.total) - partsSubtotal;

  return (
    <div className="animate-fade-in" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div className="no-print" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between' }}>
        <Link href="/invoices" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
          &larr; Back to Invoices
        </Link>
        <button className="btn btn-primary" onClick={() => window.print()} style={{ width: 'auto' }}>
          <svg style={{ marginRight: '8px' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
          Print PDF
        </button>
      </div>

      <div className="invoice-paper" style={{ background: '#fff', color: '#111', padding: '3rem', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #eee', paddingBottom: '2rem', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '2rem', color: '#3b82f6', fontWeight: 800 }}>{invoice.garages?.name}</h1>
            <p style={{ margin: '0.5rem 0 0 0', color: '#666' }}>Service Invoice</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#111' }}>INVOICE</h2>
            <p style={{ margin: '0.25rem 0 0 0', color: '#666' }}>#{invoice.id.split('-')[0].toUpperCase()}</p>
            <p style={{ margin: '0.25rem 0 0 0', color: '#666' }}>Date: {new Date(invoice.created_at).toLocaleDateString()}</p>
            <div style={{ marginTop: '0.5rem' }}>
              <span style={{ 
                padding: '4px 8px', 
                borderRadius: '4px', 
                fontSize: '0.75rem', 
                fontWeight: 'bold',
                background: invoice.status === 'paid' ? '#dcfce7' : '#fee2e2',
                color: invoice.status === 'paid' ? '#166534' : '#991b1b'
              }}>
                {invoice.status.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
          <div>
            <h3 style={{ fontSize: '0.875rem', color: '#666', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Billed To</h3>
            <div style={{ fontWeight: 600 }}>{customer?.name || 'Walk-in Customer'}</div>
            {customer?.phone && <div>{customer.phone}</div>}
            {customer?.email && <div>{customer.email}</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <h3 style={{ fontSize: '0.875rem', color: '#666', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Vehicle Info</h3>
            <div style={{ fontWeight: 600 }}>{vehicle?.year} {vehicle?.make} {vehicle?.model}</div>
            {vehicle?.vin && <div style={{ fontSize: '0.875rem' }}>VIN: {vehicle.vin}</div>}
          </div>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '0.875rem', color: '#666', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Job Description</h3>
          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
            {invoice.jobs?.description}
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eee' }}>
              <th style={{ textAlign: 'left', padding: '0.75rem 0', color: '#666' }}>Description</th>
              <th style={{ textAlign: 'center', padding: '0.75rem 0', color: '#666' }}>Qty</th>
              <th style={{ textAlign: 'right', padding: '0.75rem 0', color: '#666' }}>Unit Price</th>
              <th style={{ textAlign: 'right', padding: '0.75rem 0', color: '#666' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {jobParts.map((jp, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '0.75rem 0' }}>{jp.parts.name}</td>
                <td style={{ textAlign: 'center', padding: '0.75rem 0' }}>{jp.quantity}</td>
                <td style={{ textAlign: 'right', padding: '0.75rem 0' }}>${Number(jp.parts.price).toFixed(2)}</td>
                <td style={{ textAlign: 'right', padding: '0.75rem 0' }}>${(jp.quantity * jp.parts.price).toFixed(2)}</td>
              </tr>
            ))}
            <tr style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '0.75rem 0' }}>Labor Charges</td>
              <td style={{ textAlign: 'center', padding: '0.75rem 0' }}>—</td>
              <td style={{ textAlign: 'right', padding: '0.75rem 0' }}>—</td>
              <td style={{ textAlign: 'right', padding: '0.75rem 0' }}>${laborTotal.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '300px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
              <span style={{ color: '#666' }}>Subtotal</span>
              <span>${Number(invoice.total).toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '2px solid #eee' }}>
              <span style={{ color: '#666' }}>Tax (0%)</span>
              <span>$0.00</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', fontSize: '1.25rem', fontWeight: 800 }}>
              <span>Total Due</span>
              <span>${Number(invoice.total).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '4rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
          Thank you for choosing {invoice.garages?.name}!<br/>
          Payment is due upon receipt.
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .invoice-paper, .invoice-paper * {
            visibility: visible;
          }
          .invoice-paper {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            box-shadow: none;
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />
    </div>
  );
}
