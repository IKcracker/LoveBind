import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, Filter, RefreshCw, ShieldAlert } from 'lucide-react';
import { request } from './api';

type Report = { id: string; reporterId: string; reportedId: string; category: string; details: string | null;
  status: string; createdAt: string; reviewedBy: string | null; resolution: string | null;
  reported: { profile: { displayName: string } | null } };
type Queue = { reports: Report[]; page: number; pages: number; total: number };

function ReportStatus({ value }: { value: string }) {
  const key = value.toLowerCase().replaceAll('_', '-').replaceAll(' ', '-');
  const tone = key === 'open' || key === 'reviewing' ? 'pill-pending' : key === 'resolved' ? 'pill-success' : 'pill-neutral';
  return <span className={'pill ' + tone}><span className="pill-dot" />{value.replaceAll('_', ' ')}</span>;
}

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
  return <article className="report-card">
    <div className="report-card-head">
      <div>
        <div className="eyebrow">REPORT</div>
        <h2>{report.category.replaceAll('_', ' ')}</h2>
      </div>
      <ReportStatus value={report.status} />
    </div>
    <div className="report-card-body">
      <div className="report-meta">
        <span>{report.reported.profile?.displayName ?? 'Member'} · {new Date(report.createdAt).toLocaleString('en-ZA')}</span>
        <button className="text-button" onClick={() => openMember(report.reportedId)}>Review member</button>
      </div>
      <p className="report-details">{report.details || 'No additional details.'}</p>
      {report.status === 'RESOLVED' ? <div className="report-resolution">
        <strong>Resolution</strong>
        <p>{report.resolution || 'No resolution recorded.'}</p>
        <small>Reviewed by {report.reviewedBy ?? 'Moderator'}</small>
      </div> : <div className="report-actions">
        <label className="report-note-field">
          Moderator notes
          <textarea className="report-note" value={resolution} maxLength={2000} onChange={e => setResolution(e.target.value)} />
        </label>
        <div className="report-buttons">
          <button className="btn btn-white" disabled={busy || resolution.trim().length < 5} onClick={() => { void review('REVIEWING'); }}>Mark reviewing</button>
          <button className="btn btn-primary" disabled={busy || resolution.trim().length < 5} onClick={() => { void review('RESOLVED'); }}>Resolve report</button>
        </div>
      </div>}
      {error ? <p className="report-error" role="alert">{error}</p> : null}
    </div>
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
    <div className="section-top">
      <div>
        <div className="eyebrow">MEMBER SAFETY</div>
        <h1>Safety reports.</h1>
        <p className="subheading">Confidential reports. Record your review and any action taken before resolving.</p>
      </div>
      <button className="btn btn-white" onClick={reload}><RefreshCw size={16}/> Refresh</button>
    </div>
    <section className="card table-card report-shell">
      <div className="table-toolbar report-toolbar">
        <div className="report-toolbar-copy">
          <div className="eyebrow">REPORT QUEUE</div>
          <h2>{status === 'OPEN' ? 'Open reports' : status === 'REVIEWING' ? 'In review' : 'Resolved reports'}</h2>
        </div>
        <div className="select-wrap report-status-select">
          <Filter size={17} />
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
            {['OPEN', 'REVIEWING', 'RESOLVED'].map(value => <option key={value}>{value}</option>)}
          </select>
          <ChevronDown size={14} />
        </div>
      </div>
      {error ? <div className="report-alert"><ShieldAlert size={16}/> <p role="alert">{error}</p></div> : null}
      {!queue && !error ? <div className="empty-large report-loading"><div className="empty-icon"><RefreshCw size={28} className="spin" /></div><h2>Loading safety reports</h2><p>Checking the latest moderation queues.</p></div> : null}
      {queue && queue.total === 0 ? <div className="empty-large"><div className="empty-icon"><ShieldAlert size={28}/></div><h2>No reports in this queue</h2><p>New member safety reports will appear here as they come in.</p></div> : null}
      {queue?.reports.map(report => <ReportReview key={report.id} report={report} token={token} onReview={reload} openMember={openMember} />)}
      {queue ? <div className="table-footer"><span>{queue.total} report{queue.total === 1 ? '' : 's'} total</span><div className="pager"><button disabled={page <= 1} onClick={() => setPage(value => value - 1)}><ChevronDown size={15} style={{ transform: 'rotate(90deg)' }} /></button><span>Page {page} of {queue.pages}</span><button disabled={page >= queue.pages} onClick={() => setPage(value => value + 1)}><ChevronDown size={15} style={{ transform: 'rotate(-90deg)' }} /></button></div></div> : null}
    </section>
  </>;
}
