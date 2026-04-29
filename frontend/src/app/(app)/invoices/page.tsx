'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUser } from '@/hooks/useUser';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import Link from 'next/link';

export default function InvoicesPage() {
  const { garageId } = useUser();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, paid: 0 });

  useEffect(() => {
    if (garageId) fetchInvoices();
  }, [garageId]);

  const fetchInvoices = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('invoices')
      .select('*, customers(name)')
      .eq('garage_id', garageId)
      .order('created_at', { ascending: false });
    
    if (data) {
      setInvoices(data);
      const total = data.reduce((acc, inv) => acc + (inv.total_amount || 0), 0);
      const paid = data.filter(i => i.status === 'paid').reduce((acc, inv) => acc + (inv.total_amount || 0), 0);
      const pending = total - paid;
      setStats({ total, paid, pending });
    }
    setLoading(false);
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Financials</h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>Automated billing and revenue tracking engine.</p>
        </div>
        <Button 
          leftIcon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>}
        >
          New Invoice
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        <Card>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Gross Revenue</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)' }}>£{stats.total.toLocaleString()}</div>
        </Card>
        <Card>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Pending Payments</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--warning)' }}>£{stats.pending.toLocaleString()}</div>
        </Card>
        <Card>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Collected</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--success)' }}>£{stats.paid.toLocaleString()}</div>
        </Card>
      </div>

      <Card padding="0">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Client</th>
                <th>Status</th>
                <th>Issued</th>
                <th>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id}>
                  <td><code style={{ fontSize: '0.8125rem', fontWeight: 700 }}>INV-{inv.id.split('-')[0].toUpperCase()}</code></td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{inv.customers?.name}</div>
                  </td>
                  <td>
                    <span className={`status-badge status-${inv.status}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                    {new Date(inv.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ fontWeight: 700, fontSize: '1rem' }}>£{inv.total_amount?.toFixed(2)}</td>
                  <td>
                    <Link href={`/invoices/${inv.id}`}>
                      <Button variant="ghost" size="sm">View & Print</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
