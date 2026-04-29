'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUser } from '@/hooks/useUser';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';

const HOURS = Array.from({ length: 10 }, (_, i) => i + 8); // 8am - 5pm

export default function BookingsPage() {
  const { garageId } = useUser();
  const [activeTab, setActiveTab] = useState<'schedule' | 'requests'>('schedule');
  const [bookings, setBookings] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [garageSettings, setGarageSettings] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [newBooking, setNewBooking] = useState({ customer_id: '', vehicle_id: '', start_time: '', bay_number: 1 });
  const [customers, setCustomers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    if (!garageId) return;
    setLoading(true);

    const [reqRes, bookRes, gRes, custRes] = await Promise.all([
      supabase.from('booking_requests').select('*').eq('garage_id', garageId).eq('status', 'pending'),
      supabase.from('bookings').select('*, customers(name), vehicles(make, model)').eq('garage_id', garageId).order('start_time', { ascending: true }),
      supabase.from('garages').select('bays_count, working_hours').eq('id', garageId).single(),
      supabase.from('customers').select('id, name').eq('garage_id', garageId),
    ]);

    if (reqRes.data) setRequests(reqRes.data);
    if (bookRes.data) setBookings(bookRes.data);
    if (gRes.data) setGarageSettings(gRes.data);
    if (custRes.data) setCustomers(custRes.data);
    setLoading(false);
  }, [garageId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time updates
  useEffect(() => {
    if (!garageId) return;
    const channel = supabase.channel('bookings-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `garage_id=eq.${garageId}` }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [garageId, fetchData]);

  useEffect(() => {
    if (newBooking.customer_id) {
      supabase.from('vehicles').select('id, make, model').eq('customer_id', newBooking.customer_id).eq('garage_id', garageId).then(({ data }) => {
        setVehicles(data || []);
      });
    }
  }, [newBooking.customer_id]);

  const bays = Array.from({ length: garageSettings?.bays_count || 3 }, (_, i) => i + 1);

  const getBookingForSlot = (hour: number, bay: number) => {
    return bookings.find(b => {
      const start = new Date(b.start_time);
      return start.getHours() === hour && b.bay_number === bay;
    });
  };

  const handleOpenCreate = (hour: number, bay: number) => {
    const today = new Date();
    today.setHours(hour, 0, 0, 0);
    setNewBooking({ ...newBooking, start_time: today.toISOString(), bay_number: bay });
    setShowCreateModal(true);
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessingId('creating');
    const endTime = new Date(newBooking.start_time);
    endTime.setHours(endTime.getHours() + 1);

    const { error } = await supabase.from('bookings').insert({
      garage_id: garageId,
      customer_id: newBooking.customer_id,
      vehicle_id: newBooking.vehicle_id,
      start_time: newBooking.start_time,
      end_time: endTime.toISOString(),
      bay_number: newBooking.bay_number,
      status: 'confirmed',
    });

    if (error) {
      if (error.code === '23P01') {
        toast.error('Conflict! This bay is already booked for this time.');
      } else {
        toast.error('Failed to create booking: ' + error.message);
      }
    } else {
      toast.success('Booking confirmed!');
      setShowCreateModal(false);
      setNewBooking({ customer_id: '', vehicle_id: '', start_time: '', bay_number: 1 });
      fetchData();
    }
    setProcessingId(null);
  };

  const handleApprove = async (req: any) => {
    setProcessingId(req.id);
    // Convert request to booking
    const { error } = await supabase.from('bookings').insert({
      garage_id: garageId,
      bay_number: 1,
      status: 'confirmed',
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + 3600000).toISOString(),
    });

    if (!error) {
      await supabase.from('booking_requests').update({ status: 'approved' }).eq('id', req.id).eq('garage_id', garageId);
      toast.success('Request approved and scheduled.');
      fetchData();
    } else {
      toast.error('Failed to approve request.');
    }
    setProcessingId(null);
  };

  const handleReject = async (req: any) => {
    setProcessingId(req.id);
    await supabase.from('booking_requests').update({ status: 'rejected' }).eq('id', req.id).eq('garage_id', garageId);
    toast.success('Request rejected.');
    fetchData();
    setProcessingId(null);
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Reservations</h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
            {garageSettings?.bays_count || 3} bays available · Conflict-protected scheduling engine active
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {requests.length > 0 && (
            <span className="status-badge" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)' }}>
              {requests.length} pending request{requests.length > 1 ? 's' : ''}
            </span>
          )}
          <Button
            leftIcon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>}
            onClick={() => { setShowCreateModal(true); }}
          >
            New Booking
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
        {[
          { id: 'schedule', label: 'Bay Schedule' },
          { id: 'requests', label: `Web Requests ${requests.length > 0 ? `(${requests.length})` : ''}` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '0.625rem 1.25rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: activeTab === tab.id ? 'var(--accent-primary)' : 'rgba(255,255,255,0.04)',
              color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'schedule' ? (
        <Card padding="0">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
              <thead>
                <tr>
                  <th style={{ padding: '1rem 1.5rem', background: 'rgba(255,255,255,0.02)', color: 'var(--text-tertiary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid var(--border-color)', textAlign: 'left', width: '80px' }}>Time</th>
                  {bays.map(bay => (
                    <th key={bay} style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', color: 'var(--text-tertiary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid var(--border-color)', textAlign: 'center', minWidth: '180px' }}>
                      Bay {bay}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HOURS.map(hour => (
                  <tr key={hour}>
                    <td style={{ padding: '0.5rem 1.5rem', borderBottom: '1px solid var(--border-color)', color: 'var(--text-tertiary)', fontSize: '0.8125rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`}
                    </td>
                    {bays.map(bay => {
                      const booking = getBookingForSlot(hour, bay);
                      return (
                        <td key={bay} style={{ borderBottom: '1px solid var(--border-color)', borderLeft: '1px solid var(--border-color)', padding: '0.35rem', height: '70px', verticalAlign: 'top' }}>
                          {booking ? (
                            <div className="glass-panel hover-glow" style={{
                              padding: '0.625rem 0.75rem',
                              borderRadius: '8px',
                              borderLeft: '3px solid var(--accent-primary)',
                              background: 'rgba(59, 130, 246, 0.08)',
                              height: '100%',
                              cursor: 'default',
                            }}>
                              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.8125rem' }}>{booking.customers?.name}</div>
                              <div style={{ color: 'var(--text-tertiary)', fontSize: '0.7rem' }}>{booking.vehicles?.make} {booking.vehicles?.model}</div>
                            </div>
                          ) : (
                            <div
                              onClick={() => handleOpenCreate(hour, bay)}
                              style={{ height: '100%', width: '100%', cursor: 'pointer', opacity: 0.25, transition: 'opacity 0.2s' }}
                              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                              onMouseLeave={e => (e.currentTarget.style.opacity = '0.25')}
                            >
                              <div style={{ height: '100%', border: '2px dashed var(--border-color)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card padding="0">
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Received</th>
                  <th>Customer</th>
                  <th>Vehicle</th>
                  <th>Issue</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-tertiary)' }}>No pending web requests.</td></tr>
                ) : (
                  requests.map(req => (
                    <tr key={req.id}>
                      <td style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>{new Date(req.created_at).toLocaleDateString()}</td>
                      <td style={{ fontWeight: 600 }}>{req.customer_name}</td>
                      <td>{req.vehicle_make} {req.vehicle_model}</td>
                      <td style={{ maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>{req.issue_description}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <Button size="sm" onClick={() => handleApprove(req)} isLoading={processingId === req.id}>Schedule</Button>
                          <Button size="sm" variant="ghost" onClick={() => handleReject(req)} style={{ color: 'var(--danger)' }}>Reject</Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create Booking Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Workshop Booking">
        <form onSubmit={handleCreateBooking}>
          <div className="form-group">
            <label className="form-label">Customer *</label>
            <select className="form-input" required value={newBooking.customer_id} onChange={e => setNewBooking({ ...newBooking, customer_id: e.target.value, vehicle_id: '' })}>
              <option value="">Select Customer</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Vehicle *</label>
            <select className="form-input" required value={newBooking.vehicle_id} onChange={e => setNewBooking({ ...newBooking, vehicle_id: e.target.value })} disabled={!newBooking.customer_id}>
              <option value="">Select Vehicle</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.make} {v.model}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Bay</label>
              <input type="text" className="form-input" value={`Bay ${newBooking.bay_number}`} disabled />
            </div>
            <div className="form-group">
              <label className="form-label">Time Slot</label>
              <input type="text" className="form-input" value={newBooking.start_time ? new Date(newBooking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Click a slot'} disabled />
            </div>
          </div>
          {!newBooking.start_time && (
            <div className="form-group">
              <label className="form-label">Or pick a start time manually</label>
              <input type="datetime-local" className="form-input" onChange={e => setNewBooking({ ...newBooking, start_time: new Date(e.target.value).toISOString() })} />
            </div>
          )}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <Button variant="secondary" style={{ flex: 1 }} onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button type="submit" style={{ flex: 1 }} isLoading={processingId === 'creating'}>Confirm Booking</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
