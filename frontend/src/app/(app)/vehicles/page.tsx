'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useGarage } from '@/hooks/useGarage';
import Modal from '@/components/Modal';

export default function VehiclesPage() {
  const { garageId } = useGarage();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ customer_id: '', make: '', model: '', year: '', vin: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchVehicles = async () => {
    if (!garageId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('vehicles')
      .select('*, customers(name)')
      .eq('garage_id', garageId)
      .order('created_at', { ascending: false });
      
    if (!error && data) setVehicles(data);
    setLoading(false);
  };

  const fetchCustomersForDropdown = async () => {
    if (!garageId) return;
    const { data } = await supabase.from('customers').select('id, name').eq('garage_id', garageId).order('name');
    if (data) setCustomers(data);
  };

  useEffect(() => {
    if (garageId) {
      fetchVehicles();
      fetchCustomersForDropdown();
    }
  }, [garageId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_id || !garageId) {
      alert("Please select an owner for this vehicle.");
      return;
    }
    
    setSubmitting(true);

    const { error } = await supabase.from('vehicles').insert({
      garage_id: garageId,
      customer_id: formData.customer_id,
      make: formData.make,
      model: formData.model,
      year: formData.year ? parseInt(formData.year) : null,
      vin: formData.vin
    });

    if (!error) {
      setIsModalOpen(false);
      setFormData({ customer_id: '', make: '', model: '', year: '', vin: '' });
      fetchVehicles();
    } else {
      alert('Error adding vehicle: ' + error.message);
    }
    setSubmitting(false);
  };

  return (
    <div className="animate-fade-in">
      <div className="dashboard-header-simple" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="dashboard-title" style={{ marginBottom: '0.5rem' }}>Vehicles</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Track vehicles currently being serviced.</p>
        </div>
        <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setIsModalOpen(true)}>
          + Add Vehicle
        </button>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Make / Model</th>
              <th>Year</th>
              <th>VIN</th>
              <th>Owner</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center" style={{ padding: '2rem' }}>Loading vehicles...</td>
              </tr>
            ) : vehicles.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center" style={{ padding: '2rem' }}>No vehicles found.</td>
              </tr>
            ) : (
              vehicles.map(v => (
                <tr key={v.id}>
                  <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{v.make} {v.model}</td>
                  <td>{v.year || '—'}</td>
                  <td><code style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{v.vin || '—'}</code></td>
                  <td>{v.customers?.name || '—'}</td>
                  <td>
                    <button className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', border: 'none' }}>View History</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Vehicle">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Vehicle Owner *</label>
            <select 
              className="form-input" 
              required
              value={formData.customer_id}
              onChange={e => setFormData({...formData, customer_id: e.target.value})}
            >
              <option value="" disabled>Select a customer...</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {customers.length === 0 && <p style={{ fontSize: '0.75rem', color: 'var(--warning)', marginTop: '0.5rem' }}>No customers found. Please add a customer first.</p>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Make *</label>
              <input 
                type="text" 
                className="form-input" 
                required 
                placeholder="e.g. Toyota"
                value={formData.make}
                onChange={e => setFormData({...formData, make: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Model *</label>
              <input 
                type="text" 
                className="form-input" 
                required 
                placeholder="e.g. Camry"
                value={formData.model}
                onChange={e => setFormData({...formData, model: e.target.value})}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Year</label>
              <input 
                type="number" 
                className="form-input" 
                placeholder="2023"
                value={formData.year}
                onChange={e => setFormData({...formData, year: e.target.value})}
              />
            </div>
            <div className="form-group mb-4">
              <label className="form-label">VIN (Vehicle ID Number)</label>
              <input 
                type="text" 
                className="form-input" 
                value={formData.vin}
                onChange={e => setFormData({...formData, vin: e.target.value})}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting || customers.length === 0} style={{ width: 'auto' }}>
              {submitting ? 'Saving...' : 'Save Vehicle'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
