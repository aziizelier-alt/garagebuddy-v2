'use client';

import { useState, useEffect, FormEvent } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/dashboard');
    });
  }, [router]);

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    console.log('Auth attempt started...');
    setLoading(true);
    setError(null);
    
    try {
      if (isLogin) {
        console.log('Attempting login with:', email);
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        console.log('Login successful, data:', data);
        // Manual redirect in case middleware is slow
        router.push('/dashboard');
        router.refresh();
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Verification email sent! Check your inbox.');
      }
    } catch (err: any) {
      console.error('Auth Error Details:', err);
      setError(err.message || 'Authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '500px', background: 'radial-gradient(circle at 50% -20%, rgba(59, 130, 246, 0.15) 0%, transparent 70%)', pointerEvents: 'none' }}></div>
      
      <div className="animate-fade-in" style={{ width: '100%', maxWidth: '440px', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            background: 'rgba(255, 255, 255, 0.05)', 
            borderRadius: '24px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 1.5rem auto', 
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 0 30px rgba(59, 130, 246, 0.1)' 
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="5" r="2.5" fill="var(--text-primary)"/>
              <path d="M12 7.5V16.5M12 16.5L9 21.5M12 16.5L15 21.5M9 11.5L5 9.5M15 11.5L19 9.5" stroke="var(--text-primary)" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M5 10C5 10 8 7.5 12 7.5C16 7.5 19 10 19 10" stroke="var(--warning)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 3"/>
              <path d="M5 19C5 19 8 21.5 12 21.5C16 21.5 19 19 19 19" stroke="var(--warning)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 3"/>
            </svg>
          </div>
          <h1 style={{ fontSize: '3.5rem', fontWeight: 900, letterSpacing: '-0.05em', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>VARR</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem' }}>The high-performance Enterprise OS for modern workshops.</p>
        </div>

        <div className="glass-panel" style={{ padding: '2.5rem', borderRadius: '24px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '2rem', textAlign: 'center' }}>
            {isLogin ? 'Welcome back' : 'Create your workspace'}
          </h2>
          
          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              {error}
            </div>
          )}

          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)' }}>Email Address</label>
              <input 
                type="email" 
                className="form-input" 
                required 
                placeholder="name@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.2)', padding: '1rem', color: 'white' }}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)' }}>Password</label>
              <input 
                type="password" 
                className="form-input" 
                required 
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.2)', padding: '1rem', color: 'white' }}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading}
              style={{ width: '100%', padding: '1rem', fontSize: '1rem', marginTop: '0.5rem' }}
            >
              {loading ? 'Processing...' : isLogin ? 'Sign in to Workspace' : 'Get Started Now'}
            </button>
          </form>

          <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button 
              type="button" 
              onClick={() => { setIsLogin(!isLogin); setError(null); }}
              style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 600, padding: 0 }}
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </div>
        </div>

        <div style={{ marginTop: '4rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
            Trusted by premium workshops including <strong>Nottingham Scooter Centre</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
