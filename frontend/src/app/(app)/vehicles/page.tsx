'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUser } from '@/hooks/useUser';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';

export default function VehiclesPage() {
  const { garageId } = useUser();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (garageId) fetchVehicles();
  }, [garageId]);

  const fetchVehicles = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('vehicles')
      .select('*, customers(name, phone)')
      .eq('garage_id', garageId)
      .order('created_at', { ascending: false });
    
    if (data) setVehicles(data);
    setLoading(false);
  };

  const filteredVehicles = vehicles.filter(v => 
    v.make?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.vin?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.license_plate?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Vehicle Registry</h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>Global search and intelligence for all workshop assets.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0, width: '300px' }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Search VIN, Plate, or Model..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '0.875rem 1.25rem' }}
            />
          </div>
          <Button variant="secondary" onClick={fetchVehicles}>Refresh</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', gridColumn: '1 / -1', padding: '4rem', color: 'var(--text-tertiary)' }}>Scanning registry...</div>
        ) : filteredVehicles.length === 0 ? (
          <div style={{ textAlign: 'center', gridColumn: '1 / -1', padding: '4rem', color: 'var(--text-tertiary)' }}>No vehicles matching your search.</div>
        ) : (
          filteredVehicles.map(v => (
            <Card key={v.id} padding="1.5rem">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ width: '48px', height: '48px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>License Plate</div>
                  <div style={{ fontWeight: 800, fontSize: '1.125rem', color: 'var(--text-primary)' }}>{v.license_plate || 'NOT SET'}</div>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>{v.year} {v.make} {v.model}</h3>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>VIN: {v.vin || 'Pending Entry'}</div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Owner</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{v.customers?.name || 'Unknown'}</div>
                </div>
                <Button variant="ghost" size="sm" style={{ color: 'var(--accent-primary)' }}>View History</Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
