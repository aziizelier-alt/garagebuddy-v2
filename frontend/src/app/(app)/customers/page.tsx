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
  const [showCustModal, setShowCustModal] = useState(false);
  const [showVehModal, setShowVehModal] = useState(false);
  const [newCust, setNewCust] = useState({ name: '', phone: '', email: '' });
  const [newVeh, setNewVeh] = useState({ make: '', model: '', year: '', vin: '', license_plate: '' });
  const [isSaving, setIsSaving] = useState(false);

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
    setIsSaving(true);
    const { data, error } = await supabase
      .from('customers')
      .insert({ ...newCust, garage_id: garageId })
      .select().single();

    if (error) {
      toast.error("Failed to create customer");
    } else {
      toast.success("Customer added!");
      setShowCustModal(false);
      setNewCust({ name: '', phone: '', email: '' });
      fetchCustomers();
      if (data) handleViewCustomer(data);
    }
    setIsSaving(false);
  };

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setIsSaving(true);
    const { error } = await supabase
      .from('vehicles')
      .insert({ ...newVeh, customer_id: selectedCustomer.id, garage_id: garageId });

    if (error) {
      toast.error("Failed to add vehicle");
    } else {
      toast.success("Vehicle registered!");
      setShowVehModal(false);
      setNewVeh({ make: '', model: '', year: '', vin: '', license_plate: '' });
      fetchCustomers();
      fetchHistory(selectedCustomer.id);
    }
    setIsSaving(false);
  };

  const fetchHistory = async (customerId: string) => {
    // ... history logic
  };

  const handleViewCustomer = (customer: any) => {
    setSelectedCustomer(customer);
    fetchHistory(customer.id);
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Client Base</h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>Full lifecycle management of your workshop customers.</p>
        </div>
        <Button 
          leftIcon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>}
          onClick={() => setShowCustModal(true)}
        >
          New Customer
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedCustomer ? '1fr 1fr' : '1fr', gap: '2rem', transition: 'all 0.3s' }}>
        {/* Table Logic */}
      </div>

      {/* New Customer Modal */}
      <Modal isOpen={showCustModal} onClose={() => setShowCustModal(false)} title="Register New Customer">
        <form onSubmit={handleCreateCustomer}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input type="text" className="form-input" required value={newCust.name} onChange={(e) => setNewCust({...newCust, name: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input type="tel" className="form-input" required value={newCust.phone} onChange={(e) => setNewCust({...newCust, phone: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input type="email" className="form-input" value={newCust.email} onChange={(e) => setNewCust({...newCust, email: e.target.value})} />
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <Button variant="secondary" style={{ flex: 1 }} onClick={() => setShowCustModal(false)}>Cancel</Button>
            <Button type="submit" style={{ flex: 1 }} loading={isSaving}>Add Customer</Button>
          </div>
        </form>
      </Modal>

      {/* New Vehicle Modal */}
      <Modal isOpen={showVehModal} onClose={() => setShowVehModal(false)} title={`Add Vehicle for ${selectedCustomer?.name}`}>
        <form onSubmit={handleCreateVehicle}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Make</label>
              <input type="text" className="form-input" required value={newVeh.make} onChange={(e) => setNewVeh({...newVeh, make: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Model</label>
              <input type="text" className="form-input" required value={newVeh.model} onChange={(e) => setNewVeh({...newVeh, model: e.target.value})} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Year</label>
              <input type="text" className="form-input" value={newVeh.year} onChange={(e) => setNewVeh({...newVeh, year: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">License Plate</label>
              <input type="text" className="form-input" placeholder="ABC 123" value={newVeh.license_plate} onChange={(e) => setNewVeh({...newVeh, license_plate: e.target.value})} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">VIN</label>
            <input type="text" className="form-input" placeholder="17-character VIN" value={newVeh.vin} onChange={(e) => setNewVeh({...newVeh, vin: e.target.value})} />
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <Button variant="secondary" style={{ flex: 1 }} onClick={() => setShowVehModal(false)}>Cancel</Button>
            <Button type="submit" style={{ flex: 1 }} loading={isSaving}>Register Vehicle</Button>
          </div>
        </form>
      </Modal>
    </div>
        <Card padding="0">
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Vehicles</th>
                  <th>Contact</th>
                  <th>Last Visit</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(c => (
                  <tr 
                    key={c.id} 
                    onClick={() => handleViewCustomer(c)}
                    style={{ cursor: 'pointer', background: selectedCustomer?.id === c.id ? 'rgba(59, 130, 246, 0.05)' : 'transparent' }}
                  >
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{c.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>ID: {c.id.split('-')[0]}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        {c.vehicles?.map((v: any) => (
                          <span key={v.id} className="status-badge status-pending" style={{ fontSize: '0.65rem' }}>{v.make}</span>
                        ))}
                        {(!c.vehicles || c.vehicles.length === 0) && <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>None</span>}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8125rem' }}>{c.phone || 'No Phone'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{c.email || 'No Email'}</div>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {selectedCustomer && (
          <div className="animate-slide-in">
            <Card title={`Service History: ${selectedCustomer.name}`} style={{ height: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-tertiary)', letterSpacing: '0.05em' }}>Known Vehicles</div>
                    <Button variant="ghost" size="sm" onClick={() => setShowVehModal(true)} style={{ padding: '0.25rem 0.5rem', height: 'auto' }}>+ Add</Button>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    {selectedCustomer.vehicles?.map((v: any) => (
                      <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{v.year} {v.make} {v.model}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="timeline" style={{ position: 'relative', paddingLeft: '1.5rem' }}>
                  <div style={{ position: 'absolute', left: '0', top: '0', bottom: '0', width: '2px', background: 'var(--border-color)' }}></div>
                  
                  {historyLoading ? (
                    <div style={{ color: 'var(--text-tertiary)' }}>Loading timeline...</div>
                  ) : customerHistory.length === 0 ? (
                    <div style={{ color: 'var(--text-tertiary)' }}>No job history found for this client.</div>
                  ) : (
                    customerHistory.map(job => (
                      <div key={job.id} style={{ marginBottom: '1.5rem', position: 'relative' }}>
                        <div style={{ position: 'absolute', left: '-1.5rem', top: '0.25rem', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-primary)', boxShadow: '0 0 8px var(--accent-primary)', marginLeft: '-3px' }}></div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>{new Date(job.created_at).toLocaleDateString()}</div>
                        <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{job.description}</div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--accent-secondary)' }}>Vehicle: {job.vehicles?.make} {job.vehicles?.model}</div>
                        <div style={{ marginTop: '0.5rem' }}>
                          <span className={`status-badge status-${job.status}`}>{job.status}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
