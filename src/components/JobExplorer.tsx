import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { Application, JobListing } from '../types';
import { fetchJobs, type JobSource } from '../services/jobService';
import { useDebounce } from '../hooks/useDebounce';
import { useSlashFocus } from '../hooks/useSlashFocus';
import { calculateSkillMatch } from '../utils/skillMatcher';
import SkillProfile from './SkillProfile';
import JobCard from './JobCard';
import './JobExplorer.css';

interface JobExplorerProps {
  kaptenSkills: string[];
  onSkillsChange: Dispatch<SetStateAction<string[]>>;
  applications: Application[];
  onSaveToWishlist: (job: JobListing) => void;
}

type FetchStatus = 'loading' | 'success' | 'error';
type JobSort = 'match' | 'default';

// kunci unik company+role, huruf besar/kecil tidak berpengaruh
const makeKey = (company: string, role: string): string =>
  `${company.trim().toLowerCase()}::${role.trim().toLowerCase()}`;

export default function JobExplorer({
  kaptenSkills,
  onSkillsChange,
  applications,
  onSaveToWishlist,
}: JobExplorerProps) {
  // ---------- state fetch ----------
  const [source, setSource] = useState<JobSource>('remote');
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [status, setStatus] = useState<FetchStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  // ---------- state filter ----------
  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebounce(keyword, 400);
  const [category, setCategory] = useState('ALL');
  const [sortBy, setSortBy] = useState<JobSort>('match');

  // bonus: tekan "/" untuk fokus ke kolom cari (useRef)
  const searchRef = useRef<HTMLInputElement>(null);
  useSlashFocus(searchRef);

  // ---------- fetch: useEffect + fetch + AbortController ----------
  useEffect(() => {
    const controller = new AbortController();

    fetchJobs(source, controller.signal)
      .then((data) => {
        setJobs(data);
        setStatus('success');
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return; // dibatalkan, abaikan
        setErrorMessage(error instanceof Error ? error.message : 'Terjadi kesalahan.');
        setStatus('error');
      });

    // cleanup: batalkan request lama saat source berubah / komponen unmount
    return () => controller.abort();
  }, [source, reloadKey]);

  const handleSourceChange = (next: JobSource) => {
    setStatus('loading');
    setSource(next);
    setCategory('ALL');
  };

  const handleRetry = () => {
    setStatus('loading');
    setReloadKey((key) => key + 1);
  };

  // ---------- profil skill (update immutable) ----------
  const handleAddSkill = (skill: string) => onSkillsChange((prev) => [...prev, skill]);
  const handleRemoveSkill = (skill: string) =>
    onSkillsChange((prev) => prev.filter((s) => s !== skill));

  // ---------- derived state ----------
  const appliedKeys = useMemo(
    () => new Set(applications.map((a) => makeKey(a.company, a.role))),
    [applications],
  );

  const categories = useMemo(
    () => Array.from(new Set(jobs.map((job) => job.category))).sort(),
    [jobs],
  );

  const visibleJobs = useMemo(() => {
    const query = debouncedKeyword.trim().toLowerCase();

    const withMatch = jobs.map((job) => ({
      job,
      match: calculateSkillMatch(kaptenSkills, job.tags),
    }));

    const filtered = withMatch.filter(({ job }) => {
      const matchCategory = category === 'ALL' || job.category === category;
      const matchQuery =
        query === '' ||
        job.title.toLowerCase().includes(query) ||
        job.company_name.toLowerCase().includes(query) ||
        job.tags.some((tag) => tag.toLowerCase().includes(query));
      return matchCategory && matchQuery;
    });

    return sortBy === 'match'
      ? [...filtered].sort((a, b) => b.match.score - a.match.score)
      : filtered;
  }, [jobs, kaptenSkills, debouncedKeyword, category, sortBy]);

  const isTyping = keyword !== debouncedKeyword;

  const resetFilters = () => {
    setKeyword('');
    setCategory('ALL');
  };

  // ---------- render ----------
  return (
    <div className="jx-layout">
      <aside className="jx-sidebar">
        <SkillProfile
          skills={kaptenSkills}
          onAddSkill={handleAddSkill}
          onRemoveSkill={handleRemoveSkill}
        />

        <section className="jx-panel">
          <h2 className="jx-panel-title">Sumber Data Lowongan</h2>
          <label className="jx-radio">
            <input
              type="radio"
              name="job-source"
              checked={source === 'remote'}
              onChange={() => handleSourceChange('remote')}
            />
            Remotive API (Live)
          </label>
          <label className="jx-radio">
            <input
              type="radio"
              name="job-source"
              checked={source === 'local'}
              onChange={() => handleSourceChange('local')}
            />
            Dataset Magang ID (Lokal)
          </label>
          <button
            type="button"
            className="jx-btn jx-refresh"
            onClick={handleRetry}
            disabled={status === 'loading'}
          >
            Muat Ulang Data
          </button>
        </section>
      </aside>

      <section className="jx-main">
        <div className="jx-toolbar">
          <input
            ref={searchRef}
            className="jx-input jx-input--grow"
            type="search"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Cari posisi atau perusahaan... (tekan / )"
            aria-label="Cari lowongan"
          />
          <select
            className="jx-input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Filter kategori"
          >
            <option value="ALL">Semua Kategori</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            className="jx-input"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as JobSort)}
            aria-label="Urutkan"
          >
            <option value="match">Match Tertinggi</option>
            <option value="default">Urutan Asli</option>
          </select>
        </div>

        {isTyping && <p className="jx-muted">Mencari…</p>}

        {status === 'loading' && <div className="jx-state">Memuat lowongan…</div>}

        {status === 'error' && (
          <div className="jx-state jx-state--error" role="alert">
            <p><strong>Gagal memuat lowongan.</strong></p>
            <p>{errorMessage}</p>
            <div className="jx-actions">
              <button type="button" className="jx-btn jx-btn--primary" onClick={handleRetry}>
                Coba Lagi
              </button>
              {source === 'remote' && (
                <button type="button" className="jx-btn" onClick={() => handleSourceChange('local')}>
                  Pakai Dataset Lokal
                </button>
              )}
            </div>
          </div>
        )}

        {status === 'success' && visibleJobs.length === 0 && (
          <div className="jx-state">
            <p>Tidak ada lowongan yang cocok.</p>
            <button type="button" className="jx-btn" onClick={resetFilters}>Reset Filter</button>
          </div>
        )}

        {status === 'success' && visibleJobs.length > 0 && (
          <div className="jx-grid">
            {visibleJobs.map(({ job, match }) => (
              <JobCard
                key={job.id}
                job={job}
                match={match}
                alreadyApplied={appliedKeys.has(makeKey(job.company_name, job.title))}
                onSave={onSaveToWishlist}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}