'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('invite');

  const [invitation, setInvitation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    async function verifyInvite() {
      if (!token) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('staff_invitations')
        .select('*, garages(name)')
        .eq('token', token)
        .eq('status', 'pending')
        .single();

      if (error || !data) {
        toast.error('Invitation invalid or expired');
      } else {
        setInvitation(data);
      }
      setLoading(false);
    }

    verifyInvite();
  }, [token]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation) return;
    setIsRegistering(true);

    try {
      // 1. Sign up the user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitation.email,
        password: password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Signup failed');

      // 2. Create the internal user profile record
      const { error: profileError } = await supabase.from('users').insert({
        id: authData.user.id,
        garage_id: invitation.garage_id,
        role: invitation.role,
        full_name: fullName || invitation.email.split('@')[0]
      });

      if (profileError) throw profileError;

      // 3. Mark the invitation as accepted
      await supabase
        .from('staff_invitations')
        .update({ status: 'accepted' })
        .eq('token', token);

      toast.success('Account created! Welcome to the team.');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setIsRegistering(false);
    }
  };

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Verifying invitation...</div>;
  }

  if (!invitation) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <Card style={{ maxWidth: '440px', textAlign: 'center', padding: '3rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '1rem' }}>Invalid Invitation</h2>
          <p style={{ color: 'var(--text-tertiary)', marginBottom: '2rem' }}>This invitation link is invalid, expired, or has already been used.</p>
          <Button onClick={() => router.push('/')}>Return to Login</Button>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="bg-orb" style={{ top: '-10%', left: '-10%', opacity: 0.1 }}></div>
      
      <div style={{ width: '100%', maxWidth: '460px', position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '1rem' }}>Team Onboarding</div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 900, letterSpacing: '-0.03em' }}>Join {invitation.garages?.name}</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Complete your profile to access the workshop dashboard.</p>
        </div>

        <Card glass padding="2.5rem">
          <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input type="email" className="form-input" disabled value={invitation.email} style={{ opacity: 0.6, cursor: 'not-allowed' }} />
            </div>

            <div className="form-group">
              <label className="form-label">Your Full Name</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="John Doe" 
                required 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Create Password</label>
              <input 
                type="password" 
                className="form-input" 
                placeholder="••••••••" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              You are joining as a <strong>{invitation.role?.toUpperCase()}</strong>.
            </div>

            <Button type="submit" size="lg" isLoading={isRegistering} style={{ width: '100%', marginTop: '1rem' }}>
              Finalize & Join Team
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div>Loading signup...</div>}>
      <SignupContent />
    </Suspense>
  );
}
