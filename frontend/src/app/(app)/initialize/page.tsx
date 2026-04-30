'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useUser } from '@/hooks/useUser';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';

export default function InitializeWorkshopPage() {
  const { user, refreshProfile } = useUser();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [allocationProgress, setAllocationProgress] = useState(0);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    email: '',
    bays_count: '3',
    tax_rate: '20',
    currency: 'GBP',
    labor_rate: '85',
    specialized_makes: [] as string[]
  });

  const [newTag, setNewTag] = useState('');

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  const addTag = () => {
    if (newTag && !formData.specialized_makes.includes(newTag)) {
      setFormData({ ...formData, specialized_makes: [...formData.specialized_makes, newTag] });
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, specialized_makes: formData.specialized_makes.filter(t => t !== tag) });
  };

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    setStep(4); // Show allocation screen

    // Allocation Progress Animation
    let progress = 0;
    const interval = setInterval(() => {
      progress += 2;
      setAllocationProgress(progress);
      if (progress >= 100) clearInterval(interval);
    }, 50);

    try {
      // 1. Create the Garage record
      const { data: garage, error: garageError } = await supabase
        .from('garages')
        .insert({
          name: formData.name,
          bays_count: parseInt(formData.bays_count),
          tax_rate: parseFloat(formData.tax_rate),
          phone: formData.phone,
          address: formData.address,
          currency: formData.currency,
          labor_rate: parseFloat(formData.labor_rate),
          specialized_makes: formData.specialized_makes,
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

      // 2. Create/Update the User Profile record
      const { error: userError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          garage_id: garage.id,
          role: 'admin',
          full_name: user.email?.split('@')[0] || 'Owner'
        });

      if (userError) throw userError;

      // Ensure animation finishes
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      toast.success('Workshop Space Allocated!');
      await refreshProfile();
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Initialization error:', error);
      toast.error(error.message || 'Failed to initialize workshop');
      setStep(3); // Go back to fix
    } finally {
      setLoading(false);
      clearInterval(interval);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', color: 'var(--text-primary)' }}>
      {/* Background Orbs */}
      <div className="bg-orb" style={{ top: '-10%', right: '-10%', background: 'var(--accent-primary)', opacity: 0.1 }}></div>
      <div className="bg-orb" style={{ bottom: '-10%', left: '-10%', background: 'var(--accent-secondary)', opacity: 0.05 }}></div>
      
      <div style={{ maxWidth: '600px', width: '100%', position: 'relative' }}>
        
        {step < 4 && (
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div style={{ width: '80px', height: '80px', background: 'var(--accent-gradient)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '0 0 30px var(--accent-glow)' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: '0.5rem' }}>Deploy Workshop</h1>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ width: '40px', height: '4px', borderRadius: '2px', background: step >= i ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)', transition: 'all 0.3s' }}></div>
              ))}
            </div>
          </div>
        )}

        <Card glass padding="2.5rem" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
          
          {step === 1 && (
            <div className="animate-slide-in">
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '2rem' }}>Identity & Brand</h3>
              <div className="form-group">
                <label className="form-label">Workshop Trading Name *</label>
                <input type="text" className="form-input" placeholder="e.g. VARR Performance London" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label">Business Phone *</label>
                  <input type="tel" className="form-input" placeholder="+44..." required value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Business Email</label>
                  <input type="email" className="form-input" placeholder="office@..." value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                </div>
              </div>
              <div className="form-group" style={{ marginTop: '1.5rem' }}>
                <label className="form-label">Full Workshop Address *</label>
                <textarea className="form-input" rows={2} placeholder="Street, City, Postcode" required value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} style={{ resize: 'none' }} />
              </div>
              <Button style={{ width: '100%', marginTop: '2.5rem' }} size="lg" onClick={nextStep} disabled={!formData.name || !formData.phone}>Operational DNA →</Button>
            </div>
          )}

          {step === 2 && (
            <div className="animate-slide-in">
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '2rem' }}>Operational DNA</h3>
              <div className="form-group">
                <label className="form-label">Active Service Bays *</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <input type="range" min="1" max="20" style={{ flex: 1, accentColor: 'var(--accent-primary)' }} value={formData.bays_count} onChange={e => setFormData({ ...formData, bays_count: e.target.value })} />
                  <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent-primary)', minWidth: '40px' }}>{formData.bays_count}</span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.5rem' }}>This allocates space in your master scheduler.</p>
              </div>

              <div className="form-group" style={{ marginTop: '2rem' }}>
                <label className="form-label">Technical Specialization (Car Makes)</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <input type="text" className="form-input" placeholder="e.g. BMW, Tesla, Audi" value={newTag} onChange={e => setNewTag(e.target.value)} onKeyPress={e => e.key === 'Enter' && addTag()} />
                  <Button onClick={addTag} variant="secondary">Add</Button>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {formData.specialized_makes.map(tag => (
                    <span key={tag} onClick={() => removeTag(tag)} className="status-badge" style={{ cursor: 'pointer', background: 'var(--accent-primary)', color: 'white' }}>{tag} ×</span>
                  ))}
                  {formData.specialized_makes.length === 0 && <span style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>No specializations selected.</span>}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem' }}>
                <Button variant="secondary" style={{ flex: 1 }} onClick={prevStep}>Back</Button>
                <Button style={{ flex: 1 }} onClick={nextStep}>Financial Core →</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-slide-in">
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '2rem' }}>Financial Core</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label">Currency</label>
                  <select className="form-input" value={formData.currency} onChange={e => setFormData({ ...formData, currency: e.target.value })}>
                    <option value="GBP">GBP (£)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">VAT / Sales Tax %</label>
                  <input type="number" className="form-input" value={formData.tax_rate} onChange={e => setFormData({ ...formData, tax_rate: e.target.value })} />
                </div>
              </div>
              <div className="form-group" style={{ marginTop: '1.5rem' }}>
                <label className="form-label">Standard Hourly Labor Rate ({formData.currency})</label>
                <input type="number" className="form-input" placeholder="e.g. 85" value={formData.labor_rate} onChange={e => setFormData({ ...formData, labor_rate: e.target.value })} />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.5rem' }}>This powers automatic job estimating.</p>
              </div>

              <div style={{ marginTop: '2rem', padding: '1.25rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--danger)', marginBottom: '0.25rem' }}>Ready for Deployment?</div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  This will allocate your multi-tenant space on the VARR Network. 
                  You will be designated as <strong>Primary Administrator</strong>.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem' }}>
                <Button variant="secondary" style={{ flex: 1 }} onClick={prevStep}>Back</Button>
                <Button style={{ flex: 1 }} onClick={handleSubmit} isLoading={loading}>Launch Workshop OS</Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div style={{ textAlign: 'center', padding: '3rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div className="pulse-glow" style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '3rem' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="animate-spin-slow">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              </div>
              <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '1rem' }}>Allocating Secure Space</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem' }}>Configuring multi-tenant isolation and intelligence layers...</p>
              
              <div style={{ width: '100%', maxWidth: '300px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.75rem', fontWeight: 800 }}>
                  <span>Network Sync</span>
                  <span>{allocationProgress}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${allocationProgress}%`, height: '100%', background: 'var(--accent-primary)', boxShadow: '0 0 15px var(--accent-primary)', transition: 'width 0.1s linear' }}></div>
                </div>
              </div>
            </div>
          )}

        </Card>
        
        <p style={{ textAlign: 'center', marginTop: '2.5rem', fontSize: '0.7rem', color: 'var(--text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          VARR AUTOMOTIVE • Enterprise Workspace Deployment
        </p>
      </div>

      <style jsx global>{`
        @keyframes slide-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-in {
          animation: slide-in 0.4s ease-out forwards;
        }
        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .pulse-glow {
          box-shadow: 0 0 50px rgba(59, 130, 246, 0.3);
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 50px rgba(59, 130, 246, 0.3); }
          50% { box-shadow: 0 0 80px rgba(59, 130, 246, 0.5); }
          100% { box-shadow: 0 0 50px rgba(59, 130, 246, 0.3); }
        }
      `}</style>
    </div>
  );
}
