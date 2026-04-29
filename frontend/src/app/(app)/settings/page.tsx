'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { useUser } from '@/hooks/useUser';

export default function GarageSettings() {
  const { garageId } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [garageData, setGarageData] = useState<any>(null);

  useEffect(() => {
    if (garageId) {
      fetchGarage();
    }
  }, [garageId]);

  const fetchGarage = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('garages')
      .select('*')
      .eq('id', garageId)
      .single();

    if (error) {
      toast.error('Failed to load shop settings');
    } else {
      setGarageData(data);
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const { error } = await supabase
      .from('garages')
      .update({
        name: garageData.name,
        bays_count: parseInt(garageData.bays_count),
        working_hours: garageData.working_hours,
        tax_rate: parseFloat(garageData.tax_rate)
      })
      .eq('id', garageId);

    if (error) {
      toast.error('Failed to save settings');
    } else {
      toast.success('Shop settings updated successfully');
    }
    setSaving(false);
  };

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}>Synchronizing shop profile...</div>;

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Garage Configuration</h1>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>Define your workshop capacity and operational hours.</p>
      </div>

      <form onSubmit={handleSave}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          {/* Profile Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <Card title="Shop Profile">
              <div className="form-group">
                <label className="form-label">Workshop Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={garageData.name}
                  onChange={(e) => setGarageData({ ...garageData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Service Bay Capacity</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={garageData.bays_count}
                    onChange={(e) => setGarageData({ ...garageData, bays_count: e.target.value })}
                    min="1"
                    max="20"
                    required
                  />
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>Total active bays</span>
                </div>
              </div>
            </Card>

            <Card title="System Preferences">
              <div className="form-group">
                <label className="form-label">Timezone</label>
                <select className="form-input" disabled>
                  <option>Europe/London (GMT +1)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Currency Symbol</label>
                <select className="form-input" disabled>
                  <option>£ (GBP)</option>
                </select>
              </div>
            </Card>
          </div>

          {/* Hours Card */}
          <Card title="Operational Hours">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {days.map((day) => (
                <div key={day} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                  <div style={{ textTransform: 'capitalize', fontWeight: 600, width: '100px' }}>{day}</div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input 
                      type="time" 
                      className="form-input" 
                      style={{ width: '120px', padding: '0.5rem' }}
                      value={garageData.working_hours[day]?.open || ''}
                      onChange={(e) => {
                        const newHours = { ...garageData.working_hours };
                        newHours[day] = { ...newHours[day], open: e.target.value };
                        setGarageData({ ...garageData, working_hours: newHours });
                      }}
                    />
                    <span style={{ color: 'var(--text-tertiary)' }}>to</span>
                    <input 
                      type="time" 
                      className="form-input" 
                      style={{ width: '120px', padding: '0.5rem' }}
                      value={garageData.working_hours[day]?.close || ''}
                      onChange={(e) => {
                        const newHours = { ...garageData.working_hours };
                        newHours[day] = { ...newHours[day], close: e.target.value };
                        setGarageData({ ...garageData, working_hours: newHours });
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="submit" size="lg" isLoading={saving}>Save System Configuration</Button>
        </div>
      </form>
    </div>
  );
}
