'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Modal from '@/components/Modal';

export default function PartsPage() {
  const [parts, setParts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', price: '', stock: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchParts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('parts')
      .select('*')
      .order('name', { ascending: true });
      
    if (!error && data) setParts(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchParts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return;

    const { data: userRecord } = await supabase.from('users').select('garage_id').eq('id', userId).single();

    if (userRecord?.garage_id) {
      const { error } = await supabase.from('parts').insert({
        garage_id: userRecord.garage_id,
        name: formData.name,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock) || 0
      });

      if (!error) {
        setIsModalOpen(false);
        setFormData({ name: '', price: '', stock: '' });
        fetchParts();
      } else {
        alert('Error adding part: ' + error.message);
      }
    }
    setSubmitting(false);
  };

  return (
    <div className="animate-fade-in">
      <div className="dashboard-header-simple" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="dashboard-title" style={{ marginBottom: '0.5rem' }}>Parts Inventory</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage physical stock and pricing for components.</p>
        </div>
        <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setIsModalOpen(true)}>
          + Add Part
        </button>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Part Name</th>
              <th>Unit Price</th>
              <th>In Stock</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="text-center" style={{ padding: '2rem' }}>Loading parts...</td>
              </tr>
            ) : parts.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center" style={{ padding: '2rem' }}>No parts in inventory.</td>
              </tr>
            ) : (
              parts.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{p.name}</td>
                  <td>${Number(p.price).toFixed(2)}</td>
                  <td>
                    <span style={{ 
                      padding: '2px 8px', 
                      borderRadius: '12px', 
                      fontSize: '0.75rem',
                      background: p.stock > 5 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: p.stock > 5 ? 'var(--success)' : 'var(--danger)'
                    }}>
                      {p.stock} units
                    </span>
                  </td>
                  <td>
                    <button className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', border: 'none' }}>Edit</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group mb-4">
              <label className="form-label">Unit Price ($) *</label>
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
            <div className="form-group mb-4">
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting} style={{ width: 'auto' }}>
              {submitting ? 'Saving...' : 'Save Part'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
