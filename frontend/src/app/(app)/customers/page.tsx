'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUser } from '@/hooks/useUser';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';

export default function CustomersPage() {
  const { garageId } = useUser();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showCustModal, setShowCustModal] = useState(false);
  const [showVehModal, setShowVehModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');

  const [newCust, setNewCust] = useState({ 
    name: '', 
    phone: '', 
    email: '', 
    address: '',
    tags: [] as string[]
  });

  const [newVeh, setNewVeh] = useState({ 
    make: '', 
    model: '', 
    year: '', 
    license_plate: '',
    mileage: ''
  });

  useEffect(() => {
    if (garageId) fetchCustomers();
  }, [garageId]);

  const fetchCustomers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('customers')
      .select('*, vehicles(*)')
      .eq('garage_id', garageId)
      .order('name', { ascending: true });
    if (data) setCustomers(data);
    setLoading(false);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!garageId) return;
    setIsSaving(true);
    
    const { data, error } = await supabase
      .from('customers')
      .insert({ ...newCust, garage_id: garageId })
      .select().single();

    if (error) {
      toast.error('Failed to create customer');
    } else {
      toast.success('Customer added!');
      setShowCustModal(false);
      setNewCust({ name: '', phone: '', email: '', address: '', tags: [] });
      fetchCustomers();
      if (data) setSelectedCustomer(data);
    }
    setIsSaving(false);
  };

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !garageId) return;
    setIsSaving(true);
    
    const { error } = await supabase
      .from('vehicles')
      .insert({ 
        ...newVeh, 
        mileage: parseInt(newVeh.mileage) || 0,
        customer_id: selectedCustomer.id, 
        garage_id: garageId 
      });

    if (error) {
      toast.error('Failed to add vehicle');
    } else {
      toast.success('Vehicle registered!');
      setShowVehModal(false);
      setNewVeh({ make: '', model: '', year: '', license_plate: '', mileage: '' });
      fetchCustomers();
    }
    setIsSaving(false);
  };

  const filtered = customers.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Customer Base</h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>Management of workshop clients and their digital garage.</p>
        </div>
        <Button
          leftIcon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>}
          onClick={() => setShowCustModal(true)}
        >
          New Customer
        </Button>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Search name, phone or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: '400px' }}
        />
      </div>

      <Card padding="0">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer Details</th>
                <th>Status / Tags</th>
                <th>Vehicles</th>
                <th>Contact</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '4rem' }}>Detecting clients...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '4rem' }}>No records found.</td></tr>
              ) : (
                filtered.map(c => (
                  <tr key={c.id} onClick={() => setSelectedCustomer(c)} style={{ cursor: 'pointer', background: selectedCustomer?.id === c.id ? 'rgba(59,130,246,0.05)' : 'transparent' }}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{c.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{c.address || 'No address'}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        {(c.tags || []).map((t: string) => (
                          <span key={t} className="status-badge" style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)' }}>{t}</span>
                        ))}
                        {(!c.tags || c.tags.length === 0) && <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>—</span>}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                        {c.vehicles?.map((v: any) => (
                          <span key={v.id} className="status-badge status-in_progress" style={{ fontSize: '0.65rem' }}>{v.license_plate}</span>
                        ))}
                        {(!c.vehicles || c.vehicles.length === 0) && <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>None</span>}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8125rem' }}>{c.phone || '—'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{c.email || '—'}</div>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>{new Date(c.created_at).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* New Customer Modal */}
      <Modal isOpen={showCustModal} onClose={() => setShowCustModal(false)} title="Register New Customer">
        <form onSubmit={handleCreateCustomer}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input type="text" className="form-input" required value={newCust.name} onChange={e => setNewCust({ ...newCust, name: e.target.value })} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Phone *</label>
              <input type="tel" className="form-input" required value={newCust.phone} onChange={e => setNewCust({ ...newCust, phone: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-input" value={newCust.email} onChange={e => setNewCust({ ...newCust, email: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Address</label>
            <input type="text" className="form-input" placeholder="Street, City, Postcode" value={newCust.address} onChange={e => setNewCust({ ...newCust, address: e.target.value })} />
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <Button variant="secondary" style={{ flex: 1 }} onClick={() => setShowCustModal(false)}>Cancel</Button>
            <Button type="submit" style={{ flex: 1 }} isLoading={isSaving}>Add Customer</Button>
          </div>
        </form>
      </Modal>

      {/* Add Vehicle Modal */}
      <Modal isOpen={selectedCustomer && showVehModal} onClose={() => setShowVehModal(false)} title={`Add Vehicle for ${selectedCustomer?.name}`}>
        <form onSubmit={handleCreateVehicle}>
          <div className="form-group">
            <label className="form-label">License Plate *</label>
            <input type="text" className="form-input" required placeholder="AB12 CDE" value={newVeh.license_plate} onChange={e => setNewVeh({ ...newVeh, license_plate: e.target.value.toUpperCase() })} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Make *</label>
              <input type="text" className="form-input" required placeholder="BMW" value={newVeh.make} onChange={e => setNewVeh({ ...newVeh, make: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Model *</label>
              <input type="text" className="form-input" required placeholder="320d" value={newVeh.model} onChange={e => setNewVeh({ ...newVeh, model: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Year</label>
              <input type="text" className="form-input" placeholder="2020" value={newVeh.year} onChange={e => setNewVeh({ ...newVeh, year: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Current Mileage</label>
              <input type="number" className="form-input" placeholder="45000" value={newVeh.mileage} onChange={e => setNewVeh({ ...newVeh, mileage: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <Button variant="secondary" style={{ flex: 1 }} onClick={() => setShowVehModal(false)}>Cancel</Button>
            <Button type="submit" style={{ flex: 1 }} isLoading={isSaving}>Register Vehicle</Button>
          </div>
        </form>
      </Modal>

      {/* Quick Action Overlay (if customer selected) */}
      {selectedCustomer && (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 100 }}>
          <Card glass style={{ padding: '1rem', display: 'flex', gap: '1rem', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
            <div style={{ borderRight: '1px solid var(--border-color)', paddingRight: '1rem', marginRight: '0.5rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Selected Client</div>
              <div style={{ fontWeight: 800 }}>{selectedCustomer.name}</div>
            </div>
            <Button size="sm" onClick={() => setShowVehModal(true)}>+ Vehicle</Button>
            <Button size="sm" variant="secondary" onClick={() => setSelectedCustomer(null)}>Deselect</Button>
          </Card>
        </div>
      )}
    </div>
  );
}
