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
  const [customerHistory, setCustomerHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showCustModal, setShowCustModal] = useState(false);
  const [showVehModal, setShowVehModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [newCust, setNewCust] = useState({ name: '', phone: '', email: '' });
  const [newVeh, setNewVeh] = useState({ make: '', model: '', year: '', vin: '', license_plate: '' });

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

  const fetchHistory = async (customerId: string) => {
    setHistoryLoading(true);
    const { data } = await supabase
      .from('jobs')
      .select('*, vehicles(make, model, year)')
      .eq('garage_id', garageId)
      .order('created_at', { ascending: false });
    // Filter by customer's vehicles
    if (data) {
      const custVehicleIds = customers.find(c => c.id === customerId)?.vehicles?.map((v: any) => v.id) || [];
      const filteredJobs = data.filter((j: any) => custVehicleIds.includes(j.vehicle_id));
      setCustomerHistory(filteredJobs);
    }
    setHistoryLoading(false);
  };

  const handleViewCustomer = (customer: any) => {
    setSelectedCustomer(customer);
    fetchHistory(customer.id);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
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
      toast.error('Failed to add vehicle');
    } else {
      toast.success('Vehicle registered!');
      setShowVehModal(false);
      setNewVeh({ make: '', model: '', year: '', vin: '', license_plate: '' });
      fetchCustomers();
      fetchHistory(selectedCustomer.id);
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
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Client Base</h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>Full lifecycle management of your workshop customers.</p>
        </div>
        <Button
          leftIcon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>}
          onClick={() => setShowCustModal(true)}
        >
          New Customer
        </Button>
      </div>

      {/* Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        <Card>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Clients</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900 }}>{customers.length}</div>
        </Card>
        <Card>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Vehicles Registered</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--accent-primary)' }}>{customers.reduce((a, c) => a + (c.vehicles?.length || 0), 0)}</div>
        </Card>
        <Card>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Active Jobs</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--success)' }}>{customerHistory.filter(j => j.status === 'in_progress').length}</div>
        </Card>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '1.5rem' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Search by name, phone or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: '420px' }}
        />
      </div>

      {/* Main Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedCustomer ? '1fr 1.2fr' : '1fr', gap: '2rem', transition: 'all 0.3s' }}>

        {/* Customer Table */}
        <Card padding="0">
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Vehicles</th>
                  <th>Contact</th>
                  <th>Since</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-tertiary)' }}>Loading clients...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-tertiary)' }}>No clients found. Add your first customer above.</td></tr>
                ) : (
                  filtered.map(c => (
                    <tr
                      key={c.id}
                      onClick={() => handleViewCustomer(c)}
                      style={{ cursor: 'pointer', background: selectedCustomer?.id === c.id ? 'rgba(59, 130, 246, 0.07)' : 'transparent', transition: 'background 0.2s' }}
                    >
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{c.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>#{c.id.split('-')[0]}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                          {c.vehicles?.map((v: any) => (
                            <span key={v.id} className="status-badge status-in_progress" style={{ fontSize: '0.65rem' }}>{v.make} {v.model}</span>
                          ))}
                          {(!c.vehicles || c.vehicles.length === 0) && <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>None</span>}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.8125rem' }}>{c.phone || '—'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{c.email || '—'}</div>
                      </td>
                      <td style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Service History Panel */}
        {selectedCustomer && (
          <div className="animate-fade-in">
            <Card style={{ height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div>
                  <h3 style={{ fontWeight: 800, fontSize: '1.125rem' }}>{selectedCustomer.name}</h3>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>{selectedCustomer.phone} · {selectedCustomer.email}</p>
                </div>
                <button onClick={() => setSelectedCustomer(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '0.25rem' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>

              {/* Vehicles */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-tertiary)', letterSpacing: '0.08em', fontWeight: 700 }}>Registered Vehicles</div>
                  <Button variant="ghost" size="sm" onClick={() => setShowVehModal(true)} style={{ padding: '0.25rem 0.75rem', height: 'auto', fontSize: '0.75rem' }}>+ Add Vehicle</Button>
                </div>
                {selectedCustomer.vehicles?.length === 0 || !selectedCustomer.vehicles ? (
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>No vehicles registered for this client.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {selectedCustomer.vehicles.map((v: any) => (
                      <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', background: 'rgba(59,130,246,0.05)', borderRadius: '8px' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" /><circle cx="7" cy="17" r="2" /><path d="M9 17h6" /><circle cx="17" cy="17" r="2" /></svg>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{v.year} {v.make} {v.model}</span>
                        {v.license_plate && <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginLeft: 'auto' }}>{v.license_plate}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Job History Timeline */}
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-tertiary)', letterSpacing: '0.08em', fontWeight: 700, marginBottom: '1rem' }}>Service Timeline</div>
              <div style={{ position: 'relative', paddingLeft: '1.5rem', maxHeight: '320px', overflowY: 'auto' }}>
                <div style={{ position: 'absolute', left: '0', top: '0', bottom: '0', width: '2px', background: 'var(--border-color)' }}></div>
                {historyLoading ? (
                  <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>Loading history...</p>
                ) : customerHistory.length === 0 ? (
                  <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>No service history found for this client.</p>
                ) : (
                  customerHistory.map(job => (
                    <div key={job.id} style={{ marginBottom: '1.5rem', position: 'relative' }}>
                      <div style={{ position: 'absolute', left: '-1.5rem', top: '0.25rem', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-primary)', boxShadow: '0 0 8px var(--accent-primary)', marginLeft: '-3px' }}></div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>{new Date(job.created_at).toLocaleDateString()}</div>
                      <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{job.description}</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{job.vehicles?.year} {job.vehicles?.make} {job.vehicles?.model}</div>
                      <div style={{ marginTop: '0.5rem' }}>
                        <span className={`status-badge status-${job.status}`}>{job.status.replace('_', ' ')}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* New Customer Modal */}
      <Modal isOpen={showCustModal} onClose={() => setShowCustModal(false)} title="Register New Customer">
        <form onSubmit={handleCreateCustomer}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input type="text" className="form-input" required value={newCust.name} onChange={e => setNewCust({ ...newCust, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Phone Number *</label>
            <input type="tel" className="form-input" required value={newCust.phone} onChange={e => setNewCust({ ...newCust, phone: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input type="email" className="form-input" value={newCust.email} onChange={e => setNewCust({ ...newCust, email: e.target.value })} />
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <Button variant="secondary" style={{ flex: 1 }} onClick={() => setShowCustModal(false)}>Cancel</Button>
            <Button type="submit" style={{ flex: 1 }} isLoading={isSaving}>Add Customer</Button>
          </div>
        </form>
      </Modal>

      {/* Add Vehicle Modal */}
      <Modal isOpen={showVehModal} onClose={() => setShowVehModal(false)} title={`Add Vehicle — ${selectedCustomer?.name}`}>
        <form onSubmit={handleCreateVehicle}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Make *</label>
              <input type="text" className="form-input" required value={newVeh.make} onChange={e => setNewVeh({ ...newVeh, make: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Model *</label>
              <input type="text" className="form-input" required value={newVeh.model} onChange={e => setNewVeh({ ...newVeh, model: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Year</label>
              <input type="text" className="form-input" placeholder="2022" value={newVeh.year} onChange={e => setNewVeh({ ...newVeh, year: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">License Plate</label>
              <input type="text" className="form-input" placeholder="AB12 CDE" value={newVeh.license_plate} onChange={e => setNewVeh({ ...newVeh, license_plate: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">VIN (17 characters)</label>
            <input type="text" className="form-input" placeholder="1HGBH41JXMN109186" maxLength={17} value={newVeh.vin} onChange={e => setNewVeh({ ...newVeh, vin: e.target.value })} />
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <Button variant="secondary" style={{ flex: 1 }} onClick={() => setShowVehModal(false)}>Cancel</Button>
            <Button type="submit" style={{ flex: 1 }} isLoading={isSaving}>Register Vehicle</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
