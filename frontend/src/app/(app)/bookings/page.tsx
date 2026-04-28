'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUser } from '@/hooks/useUser';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { toast } from '@/components/ui/Toast';

export default function BookingsPage() {
  const { garageId, loading: userLoading } = useUser();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    if (!garageId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('booking_requests')
      .select('*')
      .eq('garage_id', garageId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
      
    if (!error && data) setRequests(data);
    setLoading(false);
  };

  useEffect(() => {
    if (!userLoading && garageId) {
      fetchRequests();
      
      const channel = supabase.channel('schema-db-changes')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'booking_requests',
          filter: `garage_id=eq.${garageId}`
        }, () => { fetchRequests(); })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [garageId, userLoading]);

  const handleApprove = async (req: any) => {
    if (!garageId) return;
    setProcessingId(req.id);
    
    // Step 1: Find or Create Customer
    let customerId = null;
    let orClause = '';
    if (req.customer_email && req.customer_phone) {
      orClause = `email.eq.${req.customer_email},phone.eq.${req.customer_phone}`;
    } else if (req.customer_email) {
      orClause = `email.eq.${req.customer_email}`;
    } else if (req.customer_phone) {
      orClause = `phone.eq.${req.customer_phone}`;
    }

    const { data: existingCustomers } = orClause 
      ? await supabase.from('customers').select('id').eq('garage_id', garageId).or(orClause)
      : { data: null };

    if (existingCustomers && existingCustomers.length > 0) {
      customerId = existingCustomers[0].id;
    } else {
      const { data: newCustomer, error: cErr } = await supabase
        .from('customers')
        .insert({
          garage_id: req.garage_id,
          name: req.customer_name,
          email: req.customer_email,
          phone: req.customer_phone
        })
        .select('id').single();
      if (!cErr && newCustomer) customerId = newCustomer.id;
    }

    if (!customerId) {
      toast.error("Failed to process customer record.");
      setProcessingId(null);
      return;
    }

    // Step 2: Find or Create Vehicle
    let vehicleId = null;
    const { data: existingVehicles } = await supabase
      .from('vehicles')
      .select('id')
      .eq('garage_id', req.garage_id)
      .eq('customer_id', customerId)
      .ilike('make', req.vehicle_make)
      .ilike('model', req.vehicle_model)
      .limit(1);

    if (existingVehicles && existingVehicles.length > 0) {
      vehicleId = existingVehicles[0].id;
    } else {
      const { data: newVehicle, error: vErr } = await supabase
        .from('vehicles')
        .insert({
          garage_id: req.garage_id,
          customer_id: customerId,
          make: req.vehicle_make,
          model: req.vehicle_model,
          year: req.vehicle_year
        })
        .select('id').single();
      if (!vErr && newVehicle) vehicleId = newVehicle.id;
    }

    if (!vehicleId) {
      toast.error("Failed to process vehicle record.");
      setProcessingId(null);
      return;
    }

    // Step 3: Create Job
    const { error: jErr } = await supabase
      .from('jobs')
      .insert({
        garage_id: req.garage_id,
        vehicle_id: vehicleId,
        description: `Web Booking: ${req.issue_description}${req.preferred_date ? `\nPreferred Date: ${req.preferred_date}` : ''}`,
        status: 'pending'
      });

    if (jErr) {
      toast.error("Failed to create job order.");
      setProcessingId(null);
      return;
    }

    // Step 4: Update Request Status
    await supabase.from('booking_requests').update({ status: 'approved' }).eq('id', req.id);
    
    toast.success("Booking approved and job created!");
    fetchRequests();
    setProcessingId(null);
  };

  const handleReject = async (id: string) => {
    if (confirm("Are you sure you want to reject and archive this booking request?")) {
      await supabase.from('booking_requests').update({ status: 'rejected' }).eq('id', id);
      toast.success("Booking request rejected.");
      fetchRequests();
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="dashboard-header-simple" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="dashboard-title" style={{ marginBottom: '0.5rem' }}>Web Bookings</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Review and approve appointment requests from your public portal.</p>
        </div>
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
                <th>Preferred Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center" style={{ padding: '3rem', color: 'var(--text-tertiary)' }}>Loading incoming requests...</td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center" style={{ padding: '4rem', color: 'var(--text-tertiary)' }}>
                    <div style={{ marginBottom: '1rem', opacity: 0.5 }}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                    </div>
                    <div style={{ fontSize: '1.125rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No pending web bookings</div>
                    <p>Share your public booking link with customers to start receiving requests.</p>
                  </td>
                </tr>
              ) : (
                requests.map(req => (
                  <tr key={req.id}>
                    <td style={{ color: 'var(--text-secondary)' }}>{new Date(req.created_at).toLocaleString()}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{req.customer_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{req.customer_phone || req.customer_email}</div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{req.vehicle_year} {req.vehicle_make} {req.vehicle_model}</td>
                    <td style={{ maxWidth: '300px' }}>
                      <div style={{ fontSize: '0.875rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', color: 'var(--text-secondary)' }}>
                        {req.issue_description}
                      </div>
                    </td>
                    <td style={{ color: req.preferred_date ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                      {req.preferred_date ? new Date(req.preferred_date).toLocaleDateString() : 'Not specified'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Button 
                          size="sm" 
                          variant="primary" 
                          style={{ background: 'var(--success)', boxShadow: 'none' }}
                          onClick={() => handleApprove(req)}
                          isLoading={processingId === req.id}
                        >
                          Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="secondary"
                          onClick={() => handleReject(req.id)}
                          disabled={processingId === req.id}
                        >
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
