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
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('mechanic');
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    if (garageId) {
      fetchData();
    }
  }, [garageId]);

  const fetchData = async () => {
    setLoading(true);
    
    const [usersRes, invitesRes] = await Promise.all([
      supabase.from('users').select('*').eq('garage_id', garageId).order('created_at', { ascending: false }),
      supabase.from('staff_invitations').select('*').eq('garage_id', garageId).eq('status', 'pending').order('created_at', { ascending: false })
    ]);

    if (usersRes.error) toast.error('Failed to load team members');
    else setUsers(usersRes.data || []);

    if (!invitesRes.error) setInvites(invitesRes.data || []);
    
    setLoading(false);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!garageId) return;
    setIsInviting(true);
    
    try {
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      const { error: inviteError } = await supabase.from('staff_invitations').insert({
        garage_id: garageId,
        email: inviteEmail,
        role: inviteRole,
        token: token,
        status: 'pending'
      });

      if (inviteError) throw inviteError;

      await supabase.from('notifications').insert({
        garage_id: garageId,
        message: `New staff invitation sent to ${inviteEmail}`,
      });

      toast.success(`Invitation created for ${inviteEmail}!`);
      setShowInviteModal(false);
      setInviteEmail('');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRevokeInvite = async (id: string) => {
    const { error } = await supabase.from('staff_invitations').delete().eq('id', id).eq('garage_id', garageId);
    if (error) toast.error('Failed to revoke invitation');
    else {
      toast.success('Invitation revoked');
      fetchData();
    }
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/signup?invite=${token}`;
    navigator.clipboard.writeText(link);
    toast.success('Invite link copied to clipboard!');
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
        
        {/* Active Team Section */}
        <section>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }}></span>
            Active Personnel ({users.length})
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
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.full_name || 'Owner'}</td>
                        <td>
                          <span className={`status-badge ${user.role === 'admin' ? 'status-in_progress' : 'status-done'}`} style={{ fontSize: '0.65rem' }}>
                            {user.role}
                          </span>
                        </td>
                        <td>{user.email || 'N/A'}</td>
                        <td>
                          <span className="status-badge status-paid">active</span>
                        </td>
                        <td>{new Date(user.created_at).toLocaleDateString()}</td>
                        <td>
                          <Button variant="ghost" size="sm" style={{ color: 'var(--danger)' }} disabled={user.role === 'admin' && users.length === 1}>Revoke</Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </section>

        {/* Pending Invitations Section */}
        {invites.length > 0 && (
          <section className="animate-fade-in">
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--warning)' }}></span>
              Awaiting Acceptance ({invites.length})
            </div>
            <Card padding="0" style={{ border: '1px solid rgba(245, 158, 11, 0.2)', background: 'rgba(245, 158, 11, 0.02)' }}>
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Email Address</th>
                      <th>Intended Role</th>
                      <th>Sent</th>
                      <th>Expiry</th>
                      <th>Link Control</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invites.map((invite) => (
                      <tr key={invite.id}>
                        <td style={{ fontWeight: 700 }}>{invite.email}</td>
                        <td><span className="status-badge status-pending" style={{ fontSize: '0.65rem' }}>{invite.role}</span></td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>{new Date(invite.created_at).toLocaleDateString()}</td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--warning)', fontWeight: 600 }}>{new Date(invite.expires_at).toLocaleDateString()}</td>
                        <td>
                          <Button variant="secondary" size="sm" onClick={() => copyInviteLink(invite.token)} leftIcon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>}>
                            Copy Link
                          </Button>
                        </td>
                        <td>
                          <Button variant="ghost" size="sm" style={{ color: 'var(--danger)' }} onClick={() => handleRevokeInvite(invite.id)}>Cancel Invite</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </section>
        )}
      </div>

      <Modal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} title="Invite New Staff">
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
            <select className="form-input" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
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
