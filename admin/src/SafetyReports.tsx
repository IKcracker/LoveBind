import { useCallback, useEffect, useState } from 'react';
import { request } from './api';

type Report = { id: string; reporterId: string; reportedId: string; category: string; details: string | null;
  status: string; createdAt: string; reviewedBy: string | null; resolution: string | null;
  reported: { profile: { displayName: string } | null } };
type Queue = { reports: Report[]; page: number; pages: number; total: number };

function ReportReview({ report, token, onReview, openMember }: {
  report: Report; token: string; onReview: () => void; openMember: (id: string) => void;
}) {
  const [resolution, setResolution] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function review(status: 'REVIEWING' | 'RESOLVED') {
    if (busy) return;
    setBusy(true); setError('');
    try {
      await request('/safety/reports/' + encodeURIComponent(report.id) + '/review', token, 'POST', { status, resolution });
      onReview();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to review report'); }
    finally { setBusy(false); }
  }
  return <article className="card" style={{ padding: 24, marginBottom: 16 }}>
    <h2>{report.category.replaceAll('_', ' ')} · {report.reported.profile?.displayName ?? 'Member'}</h2>
    <p>Submitted {new Date(report.createdAt).toLocaleString('en-ZA')} · {report.status}</p>
    <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{report.details || 'No additional details.'}</p>
    <button className="btn btn-white" onClick={() => openMember(report.reportedId)}>Review reported member</button>
    {report.status === 'RESOLVED' ? <p>Resolution: {report.resolution} · Reviewer: {report.reviewedBy}</p> : <>
      <label style={{ display: 'block', marginTop: 16 }}>Moderator notes
        <textarea value={resolution} maxLength={2000} onChange={e => setResolution(e.target.value)}
          style={{ display: 'block', width: '100%', minHeight: 90 }} />
      </label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
        <button className="btn btn-white" disabled={busy || resolution.trim().length < 5} onClick={() => { void review('REVIEWING'); }}>Mark reviewing</button>
        <button className="btn btn-primary" disabled={busy || resolution.trim().length < 5} onClick={() => { void review('RESOLVED'); }}>Resolve report</button>
      </div>
    </>}
    {error ? <p role="alert">{error}</p> : null}
  </article>;
}

export function SafetyReports({ token, openMember }: { token: string; openMember: (id: string) => void }) {
  const [status, setStatus] = useState('OPEN');
  const [page, setPage] = useState(1);
  const [queue, setQueue] = useState<Queue | null>(null);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion(value => value + 1), []);
  useEffect(() => {
    let active = true;
    setQueue(null); setError('');
    request<Queue>('/safety/reports?status=' + status + '&page=' + page, token)
      .then(data => { if (active) setQueue(data); })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : 'Unable to load reports'); });
    return () => { active = false; };
  }, [token, status, page, version]);
  return <>
    <div className="section-top"><div><div className="eyebrow">MEMBER SAFETY</div><h1>Safety reports.</h1>
      <p className="subheading">Confidential reports. Record your review and any action taken before resolving.</p></div>
      <button className="btn btn-white" onClick={reload}>Refresh</button></div>
    <label>Report status <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
      {['OPEN', 'REVIEWING', 'RESOLVED'].map(value => <option key={value}>{value}</option>)}</select></label>
    {error ? <p role="alert">{error}</p> : null}
    {!queue && !error ? <p role="status">Loading reports…</p> : null}
    {queue?.reports.map(report => <ReportReview key={report.id} report={report} token={token} onReview={reload} openMember={openMember} />)}
    {queue && !queue.total ? <p>No reports in this queue.</p> : null}
    {queue ? <div className="pager"><button disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Previous</button>
      <span>Page {page} of {queue.pages}</span><button disabled={page >= queue.pages} onClick={() => setPage(value => value + 1)}>Next</button></div> : null}
  </>;
}
