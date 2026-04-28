'use client';

type JobProps = {
  job: {
    id: string;
    status: string;
    description: string;
    assigned_mechanic_id: string | null;
    vehicles?: { make: string; model: string } | null;
    customers?: { name: string } | null;
  };
  onAddPart?: (jobId: string) => void;
};

export default function JobCard({ job, onAddPart }: JobProps) {
  const shortId = job.id.split('-')[0].toUpperCase();
  
  return (
    <div className="job-card">
      <div className="job-id">#{shortId}</div>
      <div className="job-desc">{job.description || 'No description provided'}</div>
      
      <div className="job-meta">
        <div>
          <svg style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          {job.vehicles?.make || 'Unknown'} {job.vehicles?.model || 'Vehicle'}
        </div>
      </div>
      
      <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {job.assigned_mechanic_id ? (
            <><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'inline-block' }}></div> Assigned</>
          ) : (
            <><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--border-color)', display: 'inline-block' }}></div> Unassigned</>
          )}
        </div>
        {onAddPart && (job.status === 'in_progress' || job.status === 'waiting_parts') && (
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); onAddPart(job.id); }} 
            className="btn-secondary" 
            style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', border: 'none' }}
          >
            + Part
          </button>
        )}
      </div>
    </div>
  );
}
