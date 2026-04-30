'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useUser } from '@/hooks/useUser';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';

export default function InitializeWorkshopPage() {
  const { user, refreshProfile } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    bays_count: '3',
    tax_rate: '20'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      // 1. Create the Garage record
      const { data: garage, error: garageError } = await supabase
        .from('garages')
        .insert({
          name: formData.name,
          bays_count: parseInt(formData.bays_count),
          tax_rate: parseFloat(formData.tax_rate),
          working_hours: {
            monday: { open: '08:00', close: '17:00' },
            tuesday: { open: '08:00', close: '17:00' },
            wednesday: { open: '08:00', close: '17:00' },
            thursday: { open: '08:00', close: '17:00' },
            friday: { open: '08:00', close: '17:00' },
            saturday: { open: '09:00', close: '13:00' },
            sunday: { open: '', close: '' }
          }
        })
        .select()
        .single();

      if (garageError) throw garageError;

      // 2. Create the User Profile record linked to this garage
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          garage_id: garage.id,
          role: 'admin',
          full_name: user.email?.split('@')[0] || 'Owner'
        });

      if (userError) throw userError;

      toast.success('Workshop initialized successfully!');
      
      // 3. Refresh the user profile in context so the app knows we have a garage
      await refreshProfile();
      
      // 4. Go to dashboard
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Initialization error:', error);
      toast.error(error.message || 'Failed to initialize workshop');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="bg-orb" style={{ top: '-10%', right: '-10%', opacity: 0.15 }}></div>
      
      <div style={{ maxWidth: '500px', width: '100%', position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{ width: '64px', height: '64px', background: 'var(--accent-gradient)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '0 0 30px var(--accent-glow)' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: '0.5rem' }}>Launch Workshop</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem' }}>Set up your digital service center infrastructure.</p>
        </div>

        <Card glass padding="2.5rem">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">Workshop Trading Name</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. VARR Performance Center" 
                required 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Service Bays</label>
                <input 
                  type="number" 
                  className="form-input" 
                  min="1" 
                  max="50" 
                  required 
                  value={formData.bays_count}
                  onChange={(e) => setFormData({ ...formData, bays_count: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Default VAT %</label>
                <input 
                  type="number" 
                  className="form-input" 
                  min="0" 
                  max="100" 
                  required 
                  value={formData.tax_rate}
                  onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })}
                />
              </div>
            </div>

            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '0.8125rem', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
              By initializing, you will be assigned as the <strong>System Administrator</strong> for this workshop. You can invite your team after setup.
            </div>

            <Button type="submit" size="lg" isLoading={loading} style={{ width: '100%', marginTop: '1rem', height: '3.5rem' }}>
              Initialize Workshop OS
            </Button>
          </form>
        </Card>
        
        <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.75rem', color: 'var(--text-tertiary)', letterSpacing: '0.05em' }}>
          VARR AUTOMOTIVE • ENTERPRISE MULTI-TENANCY ACTIVE
        </p>
      </div>
    </div>
  );
}
