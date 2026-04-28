'use client';

import React from 'react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

type JobProps = {
  job: {
    id: string;
    status: string;
    description: string;
    assigned_mechanic_id: string | null;
    vehicles?: { make: string; model: string, customers?: { name: string } | null } | null;
  };
  onAddPart?: (jobId: string) => void;
};

export default function JobCard({ job, onAddPart }: JobProps) {
  const shortId = job.id.split('-')[0].toUpperCase();
  
  return (
    <Card 
      padding="1.25rem" 
      style={{ 
        marginBottom: '1rem', 
        cursor: 'grab', 
        transition: 'transform 0.2s, box-shadow 0.2s',
        border: '1px solid var(--border-color)',
        background: 'rgba(255, 255, 255, 0.02)'
      }}
      className="job-card-item"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>#{shortId}</span>
        {job.assigned_mechanic_id ? (
          <Badge variant="info" style={{ fontSize: '0.6rem', padding: '2px 6px' }}>Assigned</Badge>
        ) : (
          <Badge variant="warning" style={{ fontSize: '0.6rem', padding: '2px 6px' }}>Pending</Badge>
        )}
      </div>

      <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
        {job.vehicles?.make} {job.vehicles?.model}
      </div>
      
      <div style={{ 
        fontSize: '0.8125rem', 
        color: 'var(--text-secondary)', 
        lineHeight: 1.5,
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        marginBottom: '1rem'
      }}>
        {job.description || 'No description provided'}
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
           {job.vehicles?.customers?.name || 'Walk-in'}
        </div>
        {onAddPart && (job.status === 'in_progress' || job.status === 'waiting_parts') && (
          <Button 
            variant="ghost" 
            size="sm" 
            style={{ padding: '0.25rem 0.5rem', height: 'auto', fontSize: '0.7rem' }}
            onClick={(e) => { e.stopPropagation(); onAddPart(job.id); }}
          >
            + Part
          </Button>
        )}
      </div>
    </Card>
  );
}
