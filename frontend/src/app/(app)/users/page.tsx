'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';
import { useUser } from '@/hooks/useUser';

export default function UsersManagement() {
  const { garageId } = useUser();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('mechanic');
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    if (garageId) {
      fetchUsers();
    }
  }, [garageId]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('garage_id', garageId)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load team members');
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!garageId) return;
    setIsInviting(true);
    
    try {
      // Generate a secure invitation token
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // 1. Create the invitation record
      const { error: inviteError } = await supabase.from('staff_invitations').insert({
        garage_id: garageId,
        email: inviteEmail,
        role: inviteRole,
        token: token,
        status: 'pending'
      });

      if (inviteError) throw inviteError;

      // 2. Log the notification
      await supabase.from('notifications').insert({
        garage_id: garageId,
        message: `New staff invitation sent to ${inviteEmail} (Role: ${inviteRole})`,
      });

      // 3. In production, this would trigger an email. 
      // For now, we provide the signup link for manual sharing/testing.
      const inviteLink = `${window.location.origin}/signup?invite=${token}`;
      console.log('SHARE THIS LINK WITH STAFF:', inviteLink);
      
      toast.success(`Invitation created for ${inviteEmail}!`);
      setShowInviteModal(false);
      setInviteEmail('');
      fetchUsers();
    } catch (err: any) {
      console.error('Invite error:', err);
      toast.error(err.message || 'Failed to create invitation');
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Team Management</h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>Manage your mechanics and administrators.</p>
        </div>
        <Button 
          leftIcon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>}
          onClick={() => setShowInviteModal(true)}
        >
          Invite Staff
        </Button>
      </div>

      <Card padding="0">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Full Name</th>
                <th>Role</th>
                <th>Email</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem' }}>Detecting team members...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem' }}>No staff members found. Start by inviting a mechanic.</td></tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.full_name || 'Pending Invite'}</td>
                    <td>
                      <span className={`status-badge ${user.role === 'admin' ? 'status-in_progress' : 'status-done'}`} style={{ fontSize: '0.65rem' }}>
                        {user.role}
                      </span>
                    </td>
                    <td>{user.email || 'N/A'}</td>
                    <td>
                      <span className={`status-badge ${user.status === 'active' ? 'status-paid' : 'status-pending'}`}>
                        {user.status || 'active'}
                      </span>
                    </td>
                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                    <td>
                      <Button variant="ghost" size="sm" style={{ color: 'var(--danger)' }}>Revoke</Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal 
        isOpen={showInviteModal} 
        onClose={() => setShowInviteModal(false)} 
        title="Invite New Staff"
      >
        <form onSubmit={handleInvite}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input 
              type="email" 
              className="form-input" 
              placeholder="mechanic@example.com" 
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">System Role</label>
            <select 
              className="form-input"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
            >
              <option value="mechanic">Mechanic (Restricted Access)</option>
              <option value="admin">Administrator (Full Control)</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <Button variant="secondary" style={{ flex: 1 }} onClick={() => setShowInviteModal(false)}>Cancel</Button>
            <Button type="submit" style={{ flex: 1 }} isLoading={isInviting}>Send Invitation</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
