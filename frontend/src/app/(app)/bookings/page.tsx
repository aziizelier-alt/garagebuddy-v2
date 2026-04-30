'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUser } from '@/hooks/useUser';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8); // 8am - 6pm
const SERVICE_TYPES = [
  { id: 'mot', label: 'MOT Test', color: '#a855f7' },
  { id: 'service', label: 'Service', color: '#3b82f6' },
  { id: 'diagnostic', label: 'Diagnostic', color: '#f59e0b' },
  { id: 'repair', label: 'Repair', color: '#ef4444' },
];

export default function BookingsPage() {
  const { garageId } = useUser();
  const [activeTab, setActiveTab] = useState<'schedule' | 'list' | 'requests'>('schedule');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bookings, setBookings] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [garageSettings, setGarageSettings] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  const [newBooking, setNewBooking] = useState({ 
    customer_id: '', 
    vehicle_id: '', 
    start_time: '', 
    bay_number: 1, 
    service_type: 'service',
    duration: '1'
  });

  const [customers, setCustomers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = useCallback(async () => {
    if (!garageId) return;
    setLoading(true);

    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0,0,0,0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23,59,59,999);

    const [reqRes, bookRes, gRes, custRes] = await Promise.all([
      supabase.from('booking_requests').select('*').eq('garage_id', garageId).eq('status', 'pending'),
      supabase.from('bookings').select('*, customers(name), vehicles(make, model, license_plate)')
        .eq('garage_id', garageId)
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString())
        .order('start_time', { ascending: true }),
      supabase.from('garages').select('bays_count, working_hours').eq('id', garageId).single(),
      supabase.from('customers').select('id, name').eq('garage_id', garageId),
    ]);

    if (reqRes.data) setRequests(reqRes.data);
    if (bookRes.data) setBookings(bookRes.data);
    if (gRes.data) setGarageSettings(gRes.data);
    if (custRes.data) setCustomers(custRes.data);
    setLoading(false);
  }, [garageId, selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (newBooking.customer_id) {
      supabase.from('vehicles').select('id, make, model, license_plate').eq('customer_id', newBooking.customer_id).eq('garage_id', garageId).then(({ data }) => {
        setVehicles(data || []);
      });
    }
  }, [newBooking.customer_id, garageId]);

  const bays = Array.from({ length: garageSettings?.bays_count || 3 }, (_, i) => i + 1);

  const getBookingForSlot = (hour: number, bay: number) => {
    return bookings.find(b => {
      const start = new Date(b.start_time);
      return start.getHours() === hour && b.bay_number === bay;
    });
  };

  const handleOpenCreate = (hour: number, bay: number) => {
    const date = new Date(selectedDate);
    date.setHours(hour, 0, 0, 0);
    setNewBooking({ ...newBooking, start_time: date.toISOString(), bay_number: bay });
    setShowCreateModal(true);
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessingId('creating');
    
    const startTime = new Date(newBooking.start_time);
    const endTime = new Date(startTime);
    endTime.setHours(startTime.getHours() + parseInt(newBooking.duration));

    const { error } = await supabase.from('bookings').insert({
      garage_id: garageId,
      customer_id: newBooking.customer_id,
      vehicle_id: newBooking.vehicle_id,
      start_time: newBooking.start_time,
      end_time: endTime.toISOString(),
      bay_number: newBooking.bay_number,
      service_type: newBooking.service_type,
      status: 'confirmed',
    });

    if (error) {
      toast.error('Scheduling Conflict: This bay is occupied.');
    } else {
      toast.success('Service Scheduled Successfully');
      setShowCreateModal(false);
      setNewBooking({ customer_id: '', vehicle_id: '', start_time: '', bay_number: 1, service_type: 'service', duration: '1' });
      fetchData();
    }
    setProcessingId(null);
  };

  const handleApprove = async (req: any) => {
    setProcessingId(req.id);
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

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Workshop Scheduler</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            <div className="live-indicator"></div>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>{garageSettings?.bays_count || 3} bays active · Real-time occupancy tracking</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Button variant="ghost" size="sm" onClick={() => changeDate(-1)}>←</Button>
            <span style={{ fontWeight: 800, fontSize: '0.875rem', minWidth: '140px', textAlign: 'center' }}>
              {selectedDate.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
            <Button variant="ghost" size="sm" onClick={() => changeDate(1)}>→</Button>
          </div>
          <Button
            leftIcon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>}
            onClick={() => setShowCreateModal(true)}
          >
            Create Booking
          </Button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
        {[
          { id: 'schedule', label: 'Bay View' },
          { id: 'list', label: 'List View' },
          { id: 'requests', label: `Inbound Requests (${requests.length})` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '12px',
              border: 'none',
              background: activeTab === tab.id ? 'var(--accent-primary)' : 'rgba(255,255,255,0.04)',
              color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
              fontWeight: 700,
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
        <Card padding="0" glass>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: '800px' }}>
              <thead>
                <tr>
                  <th style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', color: 'var(--text-tertiary)', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', borderBottom: '1px solid var(--border-color)', width: '100px' }}>Timeline</th>
                  {bays.map(bay => (
                    <th key={bay} style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', color: 'var(--text-tertiary)', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', borderBottom: '1px solid var(--border-color)', borderLeft: '1px solid var(--border-color)', textAlign: 'center' }}>
                      Bay {bay}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HOURS.map(hour => (
                  <tr key={hour}>
                    <td style={{ padding: '1.5rem 1.25rem', borderBottom: '1px solid var(--border-color)', color: 'var(--text-tertiary)', fontSize: '0.75rem', fontWeight: 800, textAlign: 'center' }}>
                      {hour % 12 || 12} {hour >= 12 ? 'PM' : 'AM'}
                    </td>
                    {bays.map(bay => {
                      const booking = getBookingForSlot(hour, bay);
                      const serviceColor = SERVICE_TYPES.find(t => t.id === booking?.service_type)?.color || 'var(--accent-primary)';
                      
                      return (
                        <td key={bay} style={{ borderBottom: '1px solid var(--border-color)', borderLeft: '1px solid var(--border-color)', position: 'relative', height: '100px', padding: '0.5rem' }}>
                          {booking ? (
                            <div className="booking-card" style={{
                              height: '100%',
                              background: `${serviceColor}15`,
                              borderLeft: `4px solid ${serviceColor}`,
                              borderRadius: '8px',
                              padding: '0.75rem',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              boxShadow: `0 4px 15px ${serviceColor}10`
                            }}>
                              <div style={{ fontWeight: 800, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>{booking.customers?.name}</div>
                              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: serviceColor, textTransform: 'uppercase', marginTop: '0.25rem' }}>
                                {booking.vehicles?.license_plate} · {booking.service_type}
                              </div>
                            </div>
                          ) : (
                            <div 
                              onClick={() => handleOpenCreate(hour, bay)}
                              className="slot-hover"
                              style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: '8px' }}
                            >
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
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
      ) : activeTab === 'list' ? (
        <Card padding="0">
          <div className="data-table-wrapper">
             <table className="data-table">
               <thead>
                 <tr>
                   <th>Date/Time</th>
                   <th>Bay</th>
                   <th>Customer</th>
                   <th>Vehicle</th>
                   <th>Type</th>
                   <th>Status</th>
                 </tr>
               </thead>
               <tbody>
                 {bookings.map(b => (
                   <tr key={b.id}>
                     <td style={{ fontWeight: 700 }}>{new Date(b.start_time).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                     <td>Bay {b.bay_number}</td>
                     <td style={{ fontWeight: 600 }}>{b.customers?.name}</td>
                     <td>{b.vehicles?.license_plate}</td>
                     <td><span className="status-badge" style={{ background: `${SERVICE_TYPES.find(t => t.id === b.service_type)?.color}20`, color: SERVICE_TYPES.find(t => t.id === b.service_type)?.color }}>{b.service_type}</span></td>
                     <td><span className="status-badge status-done">{b.status}</span></td>
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

      {/* MODAL: CREATE BOOKING */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Operational Dispatch: New Booking">
        <form onSubmit={handleCreateBooking}>
          <div className="form-group">
            <label className="form-label">Client Lookup *</label>
            <select className="form-input" required value={newBooking.customer_id} onChange={e => setNewBooking({ ...newBooking, customer_id: e.target.value, vehicle_id: '' })}>
              <option value="">Select Customer</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Vehicle Context *</label>
            <select className="form-input" required value={newBooking.vehicle_id} onChange={e => setNewBooking({ ...newBooking, vehicle_id: e.target.value })} disabled={!newBooking.customer_id}>
              <option value="">Select Asset</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.license_plate} — {v.make} {v.model}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">Service Category</label>
              <select className="form-input" value={newBooking.service_type} onChange={e => setNewBooking({ ...newBooking, service_type: e.target.value })}>
                {SERVICE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Duration (Hrs)</label>
              <select className="form-input" value={newBooking.duration} onChange={e => setNewBooking({ ...newBooking, duration: e.target.value })}>
                <option value="1">1 Hour</option>
                <option value="2">2 Hours</option>
                <option value="4">Half Day</option>
                <option value="8">Full Day</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            <strong>Bay {newBooking.bay_number}</strong> · Scheduled for <strong>{newBooking.start_time ? new Date(newBooking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</strong>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem' }}>
            <Button variant="secondary" style={{ flex: 1 }} onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button type="submit" style={{ flex: 1 }} isLoading={processingId === 'creating'}>Confirm & Schedule</Button>
          </div>
        </form>
      </Modal>

      <style jsx global>{`
        .slot-hover:hover {
          background: rgba(255,255,255,0.02);
        }
        .slot-hover:hover svg {
          stroke: var(--accent-primary);
        }
        .booking-card {
          transition: transform 0.2s;
          cursor: pointer;
        }
        .booking-card:hover {
          transform: scale(1.02);
        }
      `}</style>
    </div>
  );
}
