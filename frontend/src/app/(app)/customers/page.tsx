'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUser } from '@/hooks/useUser';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';

export default function CustomersPage() {
  const { garageId, loading: userLoading } = useUser();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchCustomers = async () => {
    if (!garageId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('garage_id', garageId)
      .order('created_at', { ascending: false });
      
    if (!error && data) setCustomers(data);
    setLoading(false);
  };

  useEffect(() => {
    if (!userLoading && garageId) fetchCustomers();
  }, [garageId, userLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!garageId) return;
    setSubmitting(true);

    const { error } = await supabase.from('customers').insert({
      garage_id: garageId,
      name: formData.name,
      phone: formData.phone,
      email: formData.email
    });

    if (!error) {
      setIsModalOpen(false);
      setFormData({ name: '', phone: '', email: '' });
      fetchCustomers();
      toast.success('Customer added successfully');
    } else {
      toast.error('Error adding customer: ' + error.message);
    }
    setSubmitting(false);
  };

  return (
    <div className="animate-fade-in">
      <div className="dashboard-header-simple" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="dashboard-title" style={{ marginBottom: '0.5rem' }}>Customers</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your garage's customer base.</p>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          leftIcon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>}
        >
          Add Customer
        </Button>
      </div>

      <Card padding="0">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Added On</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center" style={{ padding: '3rem', color: 'var(--text-tertiary)' }}>Loading customers...</td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center" style={{ padding: '4rem', color: 'var(--text-tertiary)' }}>
                    <div style={{ marginBottom: '1rem', opacity: 0.5 }}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                    </div>
                    <div style={{ fontSize: '1.125rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No customers yet</div>
                    <p>Start by adding your first customer to the workspace.</p>
                  </td>
                </tr>
              ) : (
                customers.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{c.phone || '—'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{c.email || '—'}</td>
                    <td style={{ color: 'var(--text-tertiary)' }}>{new Date(c.created_at).toLocaleDateString()}</td>
                    <td>
                      <Button variant="ghost" size="sm">Edit</Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Customer">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input 
              type="text" 
              className="form-input" 
              required 
              placeholder="e.g. John Doe"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input 
              type="tel" 
              className="form-input" 
              placeholder="e.g. 07700 900000"
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input 
              type="email" 
              className="form-input" 
              placeholder="e.g. john@example.com"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2.5rem' }}>
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={submitting}>Save Customer</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
