'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { toast } from '@/components/ui/Toast';

export default function InvoiceReceiptPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { garageId } = useUser();
  
  const [invoice, setInvoice] = useState<any>(null);
  const [jobParts, setJobParts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInvoiceDetails() {
      if (!id || !garageId) return;
      
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          garages(name, tax_rate),
          jobs(
            description,
            vehicles(make, model, year, vin, customers(name, phone, email))
          )
        `)
        .eq('id', id)
        .eq('garage_id', garageId)
        .single();
        
      if (error || !data) {
        toast.error('Error fetching invoice');
        router.push('/invoices');
        return;
      }
      
      setInvoice(data);

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
    return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading receipt...</div>;
  }

  const customer = invoice.jobs?.vehicles?.customers;
  const vehicle = invoice.jobs?.vehicles;

  // Tax calculations — all computed BEFORE return
  const taxRate = invoice.garages?.tax_rate || 0;
  const partsSubtotal = jobParts.reduce((acc, jp) => acc + (jp.quantity * (jp.parts?.price || 0)), 0);
  const totalAmount = Number(invoice.total_amount || 0);
  const subtotal = taxRate > 0 ? totalAmount / (1 + taxRate / 100) : totalAmount;
  const taxAmount = totalAmount - subtotal;
  const laborTotal = subtotal - partsSubtotal;

  return (
    <div className="animate-fade-in" style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <div className="no-print" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/invoices" style={{ textDecoration: 'none' }}>
          <Button variant="secondary" leftIcon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>}>
            Back to Invoices
          </Button>
        </Link>
        <Button onClick={() => window.print()} leftIcon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>}>
          Print Receipt
        </Button>
      </div>

      <Card glass={false} style={{ background: '#fff', color: '#1e293b', padding: '4rem', borderRadius: '4px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} className="invoice-paper">
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #f1f5f9', paddingBottom: '2.5rem', marginBottom: '2.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <div style={{ width: '32px', height: '32px', background: '#3b82f6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><circle cx="12" cy="5" r="2.5" fill="white"/><path d="M12 7.5V16.5M12 16.5L9 21.5M12 16.5L15 21.5M9 11.5L5 9.5M15 11.5L19 9.5" stroke="white" strokeWidth="1.5"/></svg>
              </div>
              <h1 style={{ margin: 0, fontSize: '1.75rem', color: '#0f172a', fontWeight: 900, letterSpacing: '-0.025em' }}>{invoice.garages?.name || 'VARR Workshop'}</h1>
            </div>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem', fontWeight: 500 }}>Official Service Invoice</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Invoice</h2>
            <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.875rem', fontFamily: 'monospace' }}>#{invoice.id.split('-')[0].toUpperCase()}</p>
            <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>Issued: {new Date(invoice.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
            <div style={{ marginTop: '0.75rem' }}>
              <Badge variant={invoice.status === 'paid' ? 'success' : 'danger'}>{invoice.status}</Badge>
            </div>
          </div>
        </div>

        {/* Billing Details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', marginBottom: '3rem' }}>
          <div>
            <h3 style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em', fontWeight: 700 }}>Billed To</h3>
            <div style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.25rem' }}>{customer?.name || 'Walk-in Customer'}</div>
            {customer?.phone && <div style={{ color: '#475569', fontSize: '0.875rem' }}>{customer.phone}</div>}
            {customer?.email && <div style={{ color: '#475569', fontSize: '0.875rem' }}>{customer.email}</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <h3 style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em', fontWeight: 700 }}>Vehicle Details</h3>
            <div style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.25rem' }}>{vehicle?.year} {vehicle?.make} {vehicle?.model}</div>
            {vehicle?.vin && <div style={{ fontSize: '0.8125rem', color: '#64748b', fontFamily: 'monospace' }}>VIN: {vehicle.vin}</div>}
          </div>
        </div>

        {/* Work Description */}
        <div style={{ marginBottom: '3rem' }}>
          <h3 style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em', fontWeight: 700 }}>Work Carried Out</h3>
          <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#334155', fontSize: '0.9375rem', lineHeight: 1.6 }}>
            {invoice.jobs?.description || 'General service and inspection.'}
          </div>
        </div>

        {/* Line Items */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '3rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
              <th style={{ textAlign: 'left', padding: '1rem 0.5rem', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</th>
              <th style={{ textAlign: 'center', padding: '1rem 0.5rem', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Qty</th>
              <th style={{ textAlign: 'right', padding: '1rem 0.5rem', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unit Price</th>
              <th style={{ textAlign: 'right', padding: '1rem 0.5rem', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {jobParts.map((jp, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '1.25rem 0.5rem', fontWeight: 500 }}>{jp.parts?.name}</td>
                <td style={{ textAlign: 'center', padding: '1.25rem 0.5rem', color: '#475569' }}>{jp.quantity}</td>
                <td style={{ textAlign: 'right', padding: '1.25rem 0.5rem', color: '#475569' }}>£{Number(jp.parts?.price || 0).toFixed(2)}</td>
                <td style={{ textAlign: 'right', padding: '1.25rem 0.5rem', fontWeight: 600 }}>£{(jp.quantity * (jp.parts?.price || 0)).toFixed(2)}</td>
              </tr>
            ))}
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '1.25rem 0.5rem', fontWeight: 500 }}>Labor &amp; Service Fees</td>
              <td style={{ textAlign: 'center', padding: '1.25rem 0.5rem', color: '#475569' }}>—</td>
              <td style={{ textAlign: 'right', padding: '1.25rem 0.5rem', color: '#475569' }}>—</td>
              <td style={{ textAlign: 'right', padding: '1.25rem 0.5rem', fontWeight: 600 }}>£{laborTotal.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '320px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', color: '#64748b', fontSize: '0.9375rem' }}>
              <span>Subtotal</span>
              <span style={{ fontWeight: 500, color: '#1e293b' }}>£{subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', color: '#64748b', fontSize: '0.9375rem', borderBottom: '2px solid #f1f5f9' }}>
              <span>VAT ({taxRate}%)</span>
              <span style={{ fontWeight: 500, color: '#1e293b' }}>£{taxAmount.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5rem 0', fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>
              <span>Total Due</span>
              <span style={{ color: '#3b82f6' }}>£{totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '5rem', borderTop: '1px solid #f1f5f9', paddingTop: '2rem', textAlign: 'center' }}>
          <p style={{ color: '#475569', fontWeight: 600, marginBottom: '0.5rem' }}>Thank you for choosing {invoice.garages?.name || 'VARR Workshop'}!</p>
          <p style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Payment is due upon receipt • No returns on electrical parts</p>
        </div>
      </Card>
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .invoice-paper {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
          @page { margin: 1.5cm; }
        }
      `}} />
    </div>
  );
}
