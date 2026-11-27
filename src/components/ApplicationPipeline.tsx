import { useState } from 'react';
import type { Application, ApplicationStatus } from '../types';
import { useDebounce } from '../hooks/useDebounce';
import { calculateSkillMatch, getMatchLevel } from '../utils/skillMatcher';
import { ALL_STATUSES, STATUS_LABEL } from '../utils/stateMachine';
import { canBeGhosted, isRawanGhosting } from '../utils/ghostingChecker';
import { formatDateTime, formatRupiah } from '../utils/applicationHelpers';

interface ApplicationPipelineProps {
  applications: Application[];
  kaptenSkills: string[];
  conflictIds: Set<string>;
  onOpenDetail: (id: string) => void;
  onSimulate: (id: string) => void;
  onDelete: (id: string) => void;
  onAddClick: () => void;
}

type PipelineSort = 'newest' | 'interview' | 'offer';

const interviewTime = (app: Application): number =>
  app.status === 'INTERVIEW' && app.interviewDateTime
    ? new Date(app.interviewDateTime).getTime()
    : Number.POSITIVE_INFINITY; // yang tidak punya jadwal ditaruh paling bawah

export default function ApplicationPipeline({
  applications,
  kaptenSkills,
  conflictIds,
  onOpenDetail,
  onSimulate,
  onDelete,
  onAddClick,
}: ApplicationPipelineProps) {
  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebounce(keyword, 300);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'ALL'>('ALL');
  const [onlyGhosting, setOnlyGhosting] = useState(false);
  const [sortBy, setSortBy] = useState<PipelineSort>('newest');

  // derived state: hasil filter + sort dihitung langsung, tidak disimpan di state
  const query = debouncedKeyword.trim().toLowerCase();
  const visible = applications
    .filter((app) => {
      const matchText =
        query === '' ||
        app.company.toLowerCase().includes(query) ||
        app.role.toLowerCase().includes(query);
      const matchStatus = statusFilter === 'ALL' || app.status === statusFilter;
      const matchGhosting = !onlyGhosting || isRawanGhosting(app);
      return matchText && matchStatus && matchGhosting;
    })
    .sort((a, b) => {
      if (sortBy === 'interview') return interviewTime(a) - interviewTime(b);
      if (sortBy === 'offer') return (b.salaryOffer ?? -1) - (a.salaryOffer ?? -1);
      return new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime();
    });

  const resetFilters = () => {
    setKeyword('');
    setStatusFilter('ALL');
    setOnlyGhosting(false);
  };

  return (
    <section className="panel">
      <div className="pipeline-head">
        <h2>War Room Lamaran</h2>
        <button type="button" className="btn btn-primary" onClick={onAddClick}>+ Catat Lamaran</button>
      </div>

      <div className="toolbar">
        <input
          className="input grow"
          type="search"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Cari perusahaan atau posisi..."
          aria-label="Cari lamaran"
        />
        <select
          className="input"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ApplicationStatus | 'ALL')}
          aria-label="Filter status"
        >
          <option value="ALL">Semua Status</option>
          {ALL_STATUSES.map((status) => (
            <option key={status} value={status}>{STATUS_LABEL[status]}</option>
          ))}
        </select>
        <select
          className="input"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as PipelineSort)}
          aria-label="Urutkan lamaran"
        >
          <option value="newest">Terbaru</option>
          <option value="interview">Jadwal Interview Terdekat</option>
          <option value="offer">Offer Tertinggi</option>
        </select>
        <label className="toggle">
          <input type="checkbox" checked={onlyGhosting} onChange={(e) => setOnlyGhosting(e.target.checked)} />
          Hanya Rawan Ghosting
        </label>
      </div>

      {applications.length === 0 ? (
        <div className="empty-state inner">
          <p>Belum ada lamaran. Simpan dari Eksplorasi Lowongan atau klik "+ Catat Lamaran".</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="empty-state inner">
          <p>Tidak ada lamaran yang cocok dengan filter.</p>
          <button type="button" className="btn" onClick={resetFilters}>Reset Filter</button>
        </div>
      ) : (
        <div className="pipeline-list">
          {visible.map((app) => {
            const match = calculateSkillMatch(kaptenSkills, app.requiredSkills);
            const doneCount = app.checklist.filter((item) => item.done).length;
            const ghosting = isRawanGhosting(app);

            return (
              <article key={app.id} className="pipeline-card">
                <div className="pipeline-main">
                  <div className="pipeline-title">
                    <strong>{app.company}</strong>
                    <span className="muted">{app.role} • {app.workMode}</span>
                  </div>
                  <div className="badge-row">
                    <span className={`status-badge status-${app.status.toLowerCase()}`}>
                      {STATUS_LABEL[app.status]}
                    </span>
                    <span className={`match-badge match-${getMatchLevel(match.score)}`}>
                      {match.score}% Match
                    </span>
                    {ghosting && <span className="warn-badge">Rawan Ghosting</span>}
                    {conflictIds.has(app.id) && <span className="warn-badge danger">Jadwal Bentrok</span>}
                  </div>
                </div>

                <dl className="pipeline-meta">
                  <div><dt>Versi CV</dt><dd>{app.cvVersion ?? '-'}</dd></div>
                  <div>
                    <dt>Checklist</dt>
                    <dd>{doneCount}/{app.checklist.length}</dd>
                  </div>
                  <div><dt>Interview</dt><dd>{formatDateTime(app.interviewDateTime)}</dd></div>
                  <div><dt>Offer</dt><dd>{formatRupiah(app.salaryOffer)}</dd></div>
                </dl>

                <div className="pipeline-actions">
                  <button type="button" className="btn btn-primary" onClick={() => onOpenDetail(app.id)}>Detail</button>
                  {canBeGhosted(app) && (
                    <button type="button" className="btn" onClick={() => onSimulate(app.id)}>Simulasi +15 Hari</button>
                  )}
                  <button type="button" className="btn btn-danger" onClick={() => onDelete(app.id)}>Hapus</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}