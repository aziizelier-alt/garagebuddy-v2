'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useGarage } from '@/hooks/useGarage';

export default function RemindersPage() {
  const { garageId } = useGarage();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifying, setNotifying] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDueVehicles() {
      if (!garageId) return;
      // Find jobs that are "done" to see vehicle history
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          id,
          updated_at,
          vehicles(id, make, model, year, customers(id, name, phone, email))
        `)
        .eq('garage_id', garageId)
        .eq('status', 'done')
        .order('updated_at', { ascending: false });

      if (data) {
        // Group by vehicle to find the "last serviced" date
        const vehicleMap = new Map();
        data.forEach(job => {
          const v = job.vehicles as any;
          if (!v) return;
          if (!vehicleMap.has(v.id)) {
            vehicleMap.set(v.id, {
              ...v,
              lastService: job.updated_at,
              jobId: job.id
            });
          }
        });

        // Convert to array
        const sortedVehicles = Array.from(vehicleMap.values());
        setVehicles(sortedVehicles);
      }
      setLoading(false);
    }
    
    if (garageId) fetchDueVehicles();
  }, [garageId]);

  const handleSendReminder = async (vehicle: any) => {
    if (!garageId) return;
    setNotifying(vehicle.id);
    
    // Insert an internal notification log that the reminder was sent
    await supabase.from('notifications').insert({
      garage_id: garageId,
      message: `System: Sent SMS/Email Service Reminder to ${vehicle.customers?.name} for their ${vehicle.make} ${vehicle.model}.`
    });
    
    // Artificial delay to simulate sending SMS/Email
    setTimeout(() => {
      alert(`Service Reminder successfully sent to ${vehicle.customers?.name}!`);
      setNotifying(null);
    }, 800);
  };

  return (
    <div className="animate-fade-in">
      <div className="dashboard-header-simple" style={{ marginBottom: '2rem' }}>
        <h1 className="dashboard-title" style={{ marginBottom: '0.5rem' }}>Automated Reminders</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Proactively contact customers due for MOTs, Oil Changes, or routine servicing.</p>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Vehicle</th>
              <th>Last Serviced</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center" style={{ padding: '2rem' }}>Scanning vehicle history...</td>
              </tr>
            ) : vehicles.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center" style={{ padding: '2rem' }}>No past service records found.</td>
              </tr>
            ) : (
              vehicles.map(v => {
                const daysSince = Math.floor((new Date().getTime() - new Date(v.lastService).getTime()) / (1000 * 3600 * 24));
                const isOverdue = daysSince > 180; // Over 6 months
                
                return (
                  <tr key={v.id}>
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                      {v.customers?.name}
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 'normal' }}>{v.customers?.phone || v.customers?.email || 'No contact info'}</div>
                    </td>
                    <td>{v.year} {v.make} {v.model}</td>
                    <td>
                      {new Date(v.lastService).toLocaleDateString()} 
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>({daysSince} days ago)</div>
                    </td>
                    <td>
                      <span style={{ 
                        padding: '2px 8px', 
                        borderRadius: '12px', 
                        fontSize: '0.75rem',
                        background: isOverdue ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        color: isOverdue ? 'var(--danger)' : 'var(--text-secondary)'
                      }}>
                        {isOverdue ? 'Service Due' : 'Up to Date'}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="btn-primary" 
                        onClick={() => handleSendReminder(v)}
                        disabled={notifying === v.id || (!v.customers?.phone && !v.customers?.email)}
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderRadius: '4px', border: 'none', width: 'auto', background: notifying === v.id ? 'var(--text-tertiary)' : 'var(--accent-primary)' }}
                      >
                        {notifying === v.id ? 'Sending...' : 'Send Alert'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
