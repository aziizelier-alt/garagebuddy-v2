'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useParams } from 'next/navigation';

export default function BookingPage() {
  const params = useParams();
  const garageId = params.garage_id as string;

  const [garageName, setGarageName] = useState<string>('Loading...');
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: '',
    issue_description: '',
    preferred_date: ''
  });

  useEffect(() => {
    async function fetchGarage() {
      if (!garageId) return;

      const { data, error } = await supabase
        .from('garages')
        .select('name')
        .eq('id', garageId)
        .single();

      if (data) {
        setGarageName(data.name);
      } else {
        setGarageName('Garage Not Found');
        setError('The booking link appears to be invalid.');
      }
      setLoading(false);
    }
    fetchGarage();
  }, [garageId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const { error: insertError } = await supabase
      .from('booking_requests')
      .insert({
        garage_id: garageId,
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone,
        customer_email: formData.customer_email,
        vehicle_make: formData.vehicle_make,
        vehicle_model: formData.vehicle_model,
        vehicle_year: formData.vehicle_year ? parseInt(formData.vehicle_year) : null,
        issue_description: formData.issue_description,
        preferred_date: formData.preferred_date || null
      });

    if (insertError) {
      console.error(insertError);
      setError('Failed to submit booking request. Please try again.');
    } else {
      setSubmitted(true);
    }
    setSubmitting(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const isEmbed = searchParams?.get('embed') === 'true';

  if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading booking portal...</div>;

  return (
    <div style={{
      minHeight: isEmbed ? 'auto' : '100vh',
      background: isEmbed ? 'transparent' : 'var(--bg-color)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: isEmbed ? '0' : '2rem 1rem'
    }}>
      <div className={isEmbed ? "" : "glass-panel"} style={{
        maxWidth: '600px',
        width: '100%',
        padding: isEmbed ? '1rem' : '3rem',
        borderRadius: isEmbed ? '0' : '16px',
        border: isEmbed ? 'none' : '1px solid var(--border-color)',
        boxShadow: isEmbed ? 'none' : 'var(--shadow-xl)',
        background: isEmbed ? 'transparent' : 'rgba(15, 17, 23, 0.7)'
      }}>

        {submitted ? (
          <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s ease-out' }}>
            <div style={{ width: '80px', height: '80px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <h2 style={{ fontSize: '1.75rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Booking Requested!</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '2rem' }}>
              Thank you for booking with <strong>{garageName}</strong>. Your request has been securely transmitted. We will contact you shortly via phone or email to confirm your slot!
            </p>
            <a
              href="https://nottinghamscootercentre.uk"
              className="btn btn-secondary"
              style={{ textDecoration: 'none', display: 'inline-block' }}
            >
              Return to Website
            </a>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ color: 'var(--accent-primary)', fontWeight: 800, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                Service & Repairs
              </div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                {garageName}
              </h1>
              <p style={{ color: 'var(--text-secondary)' }}>
                Professional Maintenance & Repair Services
              </p>
            </div>

            {error && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center' }}>
                {error}
              </div>
            )}

            {!error && (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Personal Info */}
                <div>
                  <h3 style={{ fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Your Information</h3>
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input type="text" name="customer_name" required className="form-input" value={formData.customer_name} onChange={handleChange} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group mb-0">
                      <label className="form-label">Phone Number *</label>
                      <input type="tel" name="customer_phone" required className="form-input" value={formData.customer_phone} onChange={handleChange} />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label">Email Address</label>
                      <input type="email" name="customer_email" className="form-input" value={formData.customer_email} onChange={handleChange} />
                    </div>
                  </div>
                </div>

                {/* Vehicle Info */}
                <div>
                  <h3 style={{ fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Scooter / Bike Details</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr', gap: '1rem' }}>
                    <div className="form-group mb-0">
                      <label className="form-label">Make *</label>
                      <input type="text" name="vehicle_make" placeholder="e.g. Vespa" required className="form-input" value={formData.vehicle_make} onChange={handleChange} />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label">Model *</label>
                      <input type="text" name="vehicle_model" placeholder="e.g. GTS 300" required className="form-input" value={formData.vehicle_model} onChange={handleChange} />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label">Year</label>
                      <input type="number" name="vehicle_year" placeholder="2021" className="form-input" value={formData.vehicle_year} onChange={handleChange} />
                    </div>
                  </div>
                </div>

                {/* Service Needed */}
                <div>
                  <h3 style={{ fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Service Required</h3>
                  <div className="form-group">
                    <label className="form-label">Describe the work needed *</label>
                    <textarea name="issue_description" rows={4} required placeholder="e.g. Full service, MOT, tire replacement..." className="form-input" value={formData.issue_description} onChange={handleChange}></textarea>
                  </div>
                  <div className="form-group mb-0">
                    <label className="form-label">Requested Date</label>
                    <input type="date" name="preferred_date" className="form-input" value={formData.preferred_date} onChange={handleChange} />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" disabled={submitting} style={{ width: '100%', marginTop: '1rem', padding: '1rem', fontSize: '1.1rem', background: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }}>
                  {submitting ? 'Sending Request...' : 'Book Service Now'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
