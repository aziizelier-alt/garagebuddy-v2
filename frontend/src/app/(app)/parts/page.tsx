'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUser } from '@/hooks/useUser';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { toast } from '@/components/ui/Toast';

export default function PartsPage() {
  const { garageId, loading: userLoading } = useUser();
  const [parts, setParts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', price: '', stock: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchParts = async () => {
    if (!garageId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('parts')
      .select('*')
      .eq('garage_id', garageId)
      .order('name', { ascending: true });
      
    if (!error && data) setParts(data);
    setLoading(false);
  };

  useEffect(() => {
    if (!userLoading && garageId) fetchParts();
  }, [garageId, userLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!garageId) return;
    setSubmitting(true);

    const { error } = await supabase.from('parts').insert({
      garage_id: garageId,
      name: formData.name,
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock) || 0
    });

    if (!error) {
      setIsModalOpen(false);
      setFormData({ name: '', price: '', stock: '' });
      fetchParts();
      toast.success('Part added to inventory');
    } else {
      toast.error('Error adding part: ' + error.message);
    }
    setSubmitting(false);
  };

  return (
    <div className="animate-fade-in">
      <div className="dashboard-header-simple" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="dashboard-title" style={{ marginBottom: '0.5rem' }}>Inventory</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage physical stock and pricing for components.</p>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          leftIcon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15"></path><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path><path d="m3.3 7 8.7 5 8.7-5"></path><path d="M12 22V12"></path></svg>}
        >
          Add Part
        </Button>
      </div>

      <Card padding="0">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Part Name</th>
                <th>Unit Price</th>
                <th>In Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center" style={{ padding: '3rem', color: 'var(--text-tertiary)' }}>Loading inventory...</td>
                </tr>
              ) : parts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center" style={{ padding: '4rem', color: 'var(--text-tertiary)' }}>
                    <div style={{ marginBottom: '1rem', opacity: 0.5 }}>
                       <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="m7.5 4.27 9 5.15"></path><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path></svg>
                    </div>
                    <div style={{ fontSize: '1.125rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Empty inventory</div>
                    <p>Start adding parts to track your garage's stock levels.</p>
                  </td>
                </tr>
              ) : (
                parts.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>£{Number(p.price).toFixed(2)}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{p.stock} units</td>
                    <td>
                      <Badge variant={p.stock > 10 ? 'success' : p.stock > 0 ? 'warning' : 'danger'}>
                        {p.stock > 10 ? 'In Stock' : p.stock > 0 ? 'Low Stock' : 'Out of Stock'}
                      </Badge>
                    </td>
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Inventory Part">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Part Name *</label>
            <input 
              type="text" 
              className="form-input" 
              required 
              placeholder="e.g. Brake Pads (Front)"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">Unit Price (£) *</label>
              <input 
                type="number" 
                step="0.01"
                className="form-input" 
                required 
                placeholder="45.00"
                value={formData.price}
                onChange={e => setFormData({...formData, price: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Initial Stock *</label>
              <input 
                type="number" 
                className="form-input" 
                required 
                placeholder="10"
                value={formData.stock}
                onChange={e => setFormData({...formData, stock: e.target.value})}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2.5rem' }}>
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={submitting}>Save to Inventory</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
