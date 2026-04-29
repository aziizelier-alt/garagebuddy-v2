'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUser } from '@/hooks/useUser';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';

export default function InventoryPage() {
  const { garageId, userId } = useUser();
  const [parts, setParts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPart, setSelectedPart] = useState<any>(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState(0);
  const [adjustReason, setAdjustReason] = useState('Manual Stock Adjustment');

  useEffect(() => {
    if (garageId) fetchParts();
  }, [garageId]);

  const fetchParts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('parts')
      .select('*')
      .eq('garage_id', garageId)
      .order('name', { ascending: true });
    
    if (data) setParts(data);
    setLoading(false);
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPart || !userId) return;

    const newStock = selectedPart.quantity + adjustAmount;
    
    // 1. Update Parts Table
    const { error: pErr } = await supabase
      .from('parts')
      .update({ quantity: newStock })
      .eq('id', selectedPart.id)
      .eq('garage_id', garageId);

    if (pErr) {
      toast.error("Failed to update stock");
      return;
    }

    // 2. Log Movement
    await supabase.from('inventory_logs').insert({
      garage_id: garageId,
      part_id: selectedPart.id,
      change_amount: adjustAmount,
      reason: adjustReason,
      created_by: userId
    });

    toast.success("Inventory synchronized");
    setShowAdjustModal(false);
    fetchParts();
  };

  const filteredParts = parts.filter(p => 
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Inventory & Parts</h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>Track stock levels, bin locations, and part movements.</p>
        </div>
        <Button 
          leftIcon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>}
        >
          Add New Part
        </Button>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <input 
          type="text" 
          className="form-input" 
          placeholder="Search by Name or SKU..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ maxWidth: '400px' }}
        />
      </div>

      <Card padding="0">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Part Description</th>
                <th>SKU / Reference</th>
                <th>Location</th>
                <th>Stock Level</th>
                <th>Unit Price</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredParts.map(part => (
                <tr key={part.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{part.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{part.description || 'No description'}</div>
                  </td>
                  <td><code style={{ fontSize: '0.8125rem' }}>{part.sku || 'N/A'}</code></td>
                  <td>
                    <span className="status-badge status-pending" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                      {part.bin_location || 'Unset'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontWeight: 800, fontSize: '1rem', color: part.quantity <= (part.min_stock_level || 5) ? 'var(--danger)' : 'var(--text-primary)' }}>
                        {part.quantity}
                      </span>
                      {part.quantity <= (part.min_stock_level || 5) && (
                        <span className="status-badge status-pending" style={{ fontSize: '0.65rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}>LOW STOCK</span>
                      )}
                    </div>
                  </td>
                  <td>£{part.price?.toFixed(2)}</td>
                  <td>
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedPart(part); setShowAdjustModal(true); }}>Adjust</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={showAdjustModal} onClose={() => setShowAdjustModal(false)} title={`Adjust Stock: ${selectedPart?.name}`}>
        <form onSubmit={handleAdjustStock}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginBottom: '0.5rem' }}>Current Inventory</div>
            <div style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--accent-primary)' }}>{selectedPart?.quantity}</div>
          </div>

          <div className="form-group">
            <label className="form-label">Adjustment Amount (e.g. +10 or -2)</label>
            <input 
              type="number" 
              className="form-input" 
              required 
              value={adjustAmount} 
              onChange={(e) => setAdjustAmount(parseInt(e.target.value))} 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Reason for Change</label>
            <select className="form-input" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)}>
              <option>Manual Stock Take</option>
              <option>Stock Received (Restock)</option>
              <option>Damaged / Scrapped</option>
              <option>Correction</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <Button variant="secondary" style={{ flex: 1 }} onClick={() => setShowAdjustModal(false)}>Cancel</Button>
            <Button type="submit" style={{ flex: 1 }}>Update Stock</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
