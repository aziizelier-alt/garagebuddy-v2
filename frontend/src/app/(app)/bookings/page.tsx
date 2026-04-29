'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUser } from '@/hooks/useUser';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';

export default function BookingsPage() {
  const { garageId, loading: userLoading } = useUser();
  const [activeTab, setActiveTab] = useState<'schedule' | 'requests'>('schedule');
  const [bookings, setBookings] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [garageSettings, setGarageSettings] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBooking, setNewBooking] = useState({ customer_id: '', vehicle_id: '', start_time: '', bay_number: 1 });
  const [customers, setCustomers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);

  const fetchData = async () => {
    if (!garageId) return;
    setLoading(true);

    // Fetch Requests
    const { data: reqData } = await supabase
      .from('booking_requests')
      .select('*')
      .eq('garage_id', garageId)
      .eq('status', 'pending');

    // Fetch Bookings
    const { data: bookData } = await supabase
      .from('bookings')
      .select('*, customers(name), vehicles(make, model)')
      .eq('garage_id', garageId)
      .order('start_time', { ascending: true });

    // Fetch Garage Settings (for bays and hours)
    const { data: gData } = await supabase
      .from('garages')
      .select('bays_count, working_hours')
      .eq('id', garageId)
      .single();

    // Fetch Customers for dropdown
    const { data: custData } = await supabase
      .from('customers')
      .select('id, name')
      .eq('garage_id', garageId);

    if (reqData) setRequests(reqData);
    if (bookData) setBookings(bookData);
    if (gData) setGarageSettings(gData);
    if (custData) setCustomers(custData);
    
    setLoading(false);
  };

  useEffect(() => {
    if (newBooking.customer_id) {
      supabase.from('vehicles').select('id, make, model').eq('customer_id', newBooking.customer_id).then(({ data }) => {
        setVehicles(data || []);
      });
    }
  }, [newBooking.customer_id]);

  const handleOpenCreate = (hour: number, bay: number) => {
    const today = new Date();
    today.setHours(hour, 0, 0, 0);
    setNewBooking({
      ...newBooking,
      start_time: today.toISOString(),
      bay_number: bay
    });
    setShowCreateModal(true);
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessingId('creating');
    
    const endTime = new Date(newBooking.start_time);
    endTime.setHours(endTime.getHours() + 1); // Default 1 hour duration

    const { error } = await supabase
      .from('bookings')
      .insert({
        garage_id: garageId,
        customer_id: newBooking.customer_id,
        vehicle_id: newBooking.vehicle_id,
        start_time: newBooking.start_time,
        end_time: endTime.toISOString(),
        bay_number: newBooking.bay_number,
        status: 'confirmed'
      });

    if (error) {
      if (error.code === '23P01') {
        toast.error("Conflict detected! This bay is already booked for this time.");
      } else {
        toast.error("Failed to create booking: " + error.message);
      }
    } else {
      toast.success("Booking confirmed!");
      setShowCreateModal(false);
      fetchData();
    }
    setProcessingId(null);
  };

  const handleApprove = async (req: any) => {
    // ... same as before
  };

  // ... scheduler logic
                    {bays.map(bay => {
                      const booking = getBookingForSlot(hour, bay);
                      return (
                        <td key={bay} style={{ borderBottom: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)', padding: '0.25rem', position: 'relative' }}>
                          {booking ? (
                            <div className="glass-panel" style={{ 
                              padding: '0.75rem', 
                              borderRadius: '8px', 
                              borderLeft: '4px solid var(--accent-primary)',
                              background: 'rgba(59, 130, 246, 0.1)',
                              fontSize: '0.8125rem'
                            }}>
                              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{booking.customers?.name}</div>
                              <div style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>{booking.vehicles?.make} {booking.vehicles?.model}</div>
                            </div>
                          ) : (
                            <div 
                              style={{ height: '60px', width: '100%', cursor: 'pointer', opacity: 0.2, transition: 'opacity 0.2s' }} 
                              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'} 
                              onMouseLeave={(e) => e.currentTarget.style.opacity = '0.2'}
                              onClick={() => handleOpenCreate(hour, bay)}
                            >
                              <div style={{ height: '100%', width: '100%', border: '2px dashed var(--border-color)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        // ... requests table
      )}

      <Modal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
        title="Create Workshop Booking"
      >
        <form onSubmit={handleCreateBooking}>
          <div className="form-group">
            <label className="form-label">Customer</label>
            <select 
              className="form-input" 
              required
              value={newBooking.customer_id}
              onChange={(e) => setNewBooking({ ...newBooking, customer_id: e.target.value })}
            >
              <option value="">Select Customer</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Vehicle</label>
            <select 
              className="form-input" 
              required
              value={newBooking.vehicle_id}
              onChange={(e) => setNewBooking({ ...newBooking, vehicle_id: e.target.value })}
              disabled={!newBooking.customer_id}
            >
              <option value="">Select Vehicle</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.make} {v.model}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Bay Number</label>
              <input type="text" className="form-input" value={`Bay ${newBooking.bay_number}`} disabled />
            </div>
            <div className="form-group">
              <label className="form-label">Start Time</label>
              <input type="text" className="form-input" value={new Date(newBooking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} disabled />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <Button variant="secondary" style={{ flex: 1 }} onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button type="submit" style={{ flex: 1 }} loading={processingId === 'creating'}>Confirm Slot</Button>
          </div>
        </form>
      </Modal>
    </div>
        <Card padding="0">
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date Received</th>
                  <th>Customer</th>
                  <th>Vehicle</th>
                  <th>Issue Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-tertiary)' }}>No pending web requests.</td></tr>
                ) : (
                  requests.map(req => (
                    <tr key={req.id}>
                      <td>{new Date(req.created_at).toLocaleDateString()}</td>
                      <td style={{ fontWeight: 600 }}>{req.customer_name}</td>
                      <td>{req.vehicle_make} {req.vehicle_model}</td>
                      <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.issue_description}</td>
                      <td>
                        <Button size="sm" onClick={() => handleApprove(req)}>Review & Schedule</Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
