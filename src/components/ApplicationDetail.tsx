import { useEffect, useState, type FormEvent } from 'react';
import type { Application, ApplicationStatus, WorkMode } from '../types';
import {
  STATUS_LABEL,
  getAllowedTransitions,
  isFinalStatus,
  validateTransition,
  type TransitionErrors,
  type TransitionPayload,
} from '../utils/stateMachine';
import { canBeGhosted, isRawanGhosting } from '../utils/ghostingChecker';
import { createActivityLog, formatDateTime, formatLogTime } from '../utils/applicationHelpers';
import Checklist from './Checklist';
import InterviewTimer from './InterviewTimer';

interface ApplicationDetailProps {
  application: Application;
  onClose: () => void;
  onChangeStatus: (id: string, to: ApplicationStatus, payload: TransitionPayload) => void;
  onUpdate: (id: string, updater: (app: Application) => Application) => void;
  onSimulate: (id: string) => void;
  onDelete: (id: string) => void;
}

const STAGES: ApplicationStatus[] = ['WISHLIST', 'APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER'];

export default function ApplicationDetail({
  application: app,
  onClose,
  onChangeStatus,
  onUpdate,
  onSimulate,
  onDelete,
}: ApplicationDetailProps) {
  const [target, setTarget] = useState<ApplicationStatus | null>(null);
  const [cvVersion, setCvVersion] = useState(app.cvVersion ?? '');
  const [appliedDate, setAppliedDate] = useState(app.appliedDate ?? '');
  const [interviewDateTime, setInterviewDateTime] = useState(app.interviewDateTime ?? '');
  const [salaryText, setSalaryText] = useState(app.salaryOffer !== undefined ? String(app.salaryOffer) : '');
  const [workMode, setWorkMode] = useState<WorkMode>(app.workMode);
  const [errors, setErrors] = useState<TransitionErrors>({});
  const [note, setNote] = useState('');

  // tutup modal dengan tombol Escape (listener dibersihkan saat unmount)
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const allowed = getAllowedTransitions(app.status);
  const stageIndex = STAGES.indexOf(app.status);
  const ghosting = isRawanGhosting(app);
  const logs = [...app.activityLogs].reverse(); // terbaru di atas, tanpa mutasi array asli

  const chooseTarget = (status: ApplicationStatus) => {
    setTarget(status);
    setErrors({});
  };

  const handleConfirm = () => {
    if (target === null) return;
    const payload: TransitionPayload = {
      cvVersion,
      appliedDate,
      interviewDateTime,
      salaryOffer: Number(salaryText) || 0,
      workMode,
    };
    const nextErrors = validateTransition(app.status, target, payload);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    onChangeStatus(app.id, target, payload);
    setTarget(null);
    setErrors({});
  };

  // ---------- update bertingkat yang immutable: applications -> app -> checklist ----------
  const addChecklistItem = (text: string) => {
    const item = { id: crypto.randomUUID(), text, done: false };
    onUpdate(app.id, (a) => ({ ...a, checklist: [...a.checklist, item] }));
  };
  const toggleChecklistItem = (itemId: string) =>
    onUpdate(app.id, (a) => ({
      ...a,
      checklist: a.checklist.map((item) => (item.id === itemId ? { ...item, done: !item.done } : item)),
    }));
  const removeChecklistItem = (itemId: string) =>
    onUpdate(app.id, (a) => ({ ...a, checklist: a.checklist.filter((item) => item.id !== itemId) }));

  const handleAddNote = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (note.trim() === '') return;
    const log = createActivityLog(`Catatan: ${note.trim()}`);
    onUpdate(app.id, (a) => ({ ...a, activityLogs: [...a.activityLogs, log] }));
    setNote('');
  };

  return (
    <div className="modal-overlay drawer" onClick={onClose}>
      <div className="modal detail" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <header className="detail-head">
          <div className="detail-avatar">{app.company.slice(0, 2).toUpperCase()}</div>
          <div className="detail-title">
            <h2>{app.role} — {app.company}</h2>
            <p className="muted">
              {app.workMode} • CV: {app.cvVersion ?? '-'} • Jadwal Interview: {formatDateTime(app.interviewDateTime)}
            </p>
          </div>
          <div className="detail-head-actions">
            <span className={`status-badge status-${app.status.toLowerCase()}`}>{STATUS_LABEL[app.status]}</span>
            {ghosting && <span className="warn-badge">Rawan Ghosting</span>}
            {canBeGhosted(app) && (
              <button type="button" className="btn" onClick={() => onSimulate(app.id)}>Simulasi +15 Hari</button>
            )}
            <button type="button" className="btn btn-danger" onClick={() => onDelete(app.id)}>Hapus</button>
            <button type="button" className="icon-btn close" onClick={onClose} aria-label="Tutup">×</button>
          </div>
        </header>

        <div className="detail-body">
          <div className="detail-left">
            <section>
              <span className="section-title">Tahap Seleksi</span>
              <ol className="stages">
                {STAGES.map((stage, index) => (
                  <li
                    key={stage}
                    className={`${index <= stageIndex ? 'is-reached' : ''} ${index === stageIndex ? 'is-current' : ''}`}
                  >
                    {index + 1}. {STATUS_LABEL[stage]}
                  </li>
                ))}
              </ol>
              {stageIndex === -1 && (
                <p className="muted">Status saat ini: <strong>{STATUS_LABEL[app.status]}</strong></p>
              )}
            </section>

            <section className="transition-box">
              {isFinalStatus(app.status) ? (
                <p className="muted">Status {STATUS_LABEL[app.status]} bersifat final dan tidak bisa diubah lagi.</p>
              ) : (
                <>
                  <div className="transition-row">
                    <span>Pindahkan status ke:</span>
                    <div className="transition-options">
                      {/* hanya status tujuan yang sah menurut state machine */}
                      {allowed.map((status) => (
                        <button
                          key={status}
                          type="button"
                          className={`btn ${target === status ? 'btn-primary' : ''}`}
                          onClick={() => chooseTarget(status)}
                        >
                          {STATUS_LABEL[status]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {target !== null && (
                    <div className="transition-form">
                      {target === 'APPLIED' && (
                        <>
                          <label className="field">
                            <span>Versi CV</span>
                            <input className="input" value={cvVersion} onChange={(e) => setCvVersion(e.target.value)} placeholder="Kapten-CV-v2.pdf" />
                            {errors.cvVersion && <small className="error-text">{errors.cvVersion}</small>}
                          </label>
                          <label className="field">
                            <span>Tanggal Melamar</span>
                            <input type="date" className="input" value={appliedDate} onChange={(e) => setAppliedDate(e.target.value)} />
                            {errors.appliedDate && <small className="error-text">{errors.appliedDate}</small>}
                          </label>
                        </>
                      )}
                      {target === 'INTERVIEW' && (
                        <label className="field">
                          <span>Jadwal Interview</span>
                          <input
                            type="datetime-local"
                            className="input"
                            value={interviewDateTime}
                            onChange={(e) => setInterviewDateTime(e.target.value)}
                          />
                          {errors.interviewDateTime && <small className="error-text">{errors.interviewDateTime}</small>}
                        </label>
                      )}
                      {target === 'OFFER' && (
                        <>
                          <label className="field">
                            <span>Uang Saku / Gaji (Rp)</span>
                            <input
                              type="number"
                              min={0}
                              className="input"
                              value={salaryText}
                              onChange={(e) => setSalaryText(e.target.value)}
                              placeholder="Rp 5.500.000"
                            />
                            {errors.salaryOffer && <small className="error-text">{errors.salaryOffer}</small>}
                          </label>
                          <label className="field">
                            <span>Mode Kerja</span>
                            <select className="input" value={workMode} onChange={(e) => setWorkMode(e.target.value as WorkMode)}>
                              <option value="Remote">Remote</option>
                              <option value="Hybrid">Hybrid</option>
                              <option value="Onsite">Onsite</option>
                            </select>
                          </label>
                        </>
                      )}
                      {errors.status && <small className="error-text">{errors.status}</small>}
                      <button type="button" className="btn btn-primary confirm" onClick={handleConfirm}>
                        Konfirmasi
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>

            <Checklist
              items={app.checklist}
              onAdd={addChecklistItem}
              onToggle={toggleChecklistItem}
              onRemove={removeChecklistItem}
            />
          </div>

          <div className="detail-right">
            {/* key: timer di-reset per lamaran & ikut unmount saat modal ditutup */}
            <InterviewTimer key={app.id} />

            <section>
              <span className="section-title">Riwayat Aktivitas</span>
              <form className="inline-form" onSubmit={handleAddNote}>
                <input
                  className="input grow"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Tambah catatan manual..."
                  aria-label="Catatan manual"
                />
                <button type="submit" className="btn">Catat</button>
              </form>
              <ul className="timeline">
                {logs.map((log) => (
                  <li key={log.id}>
                    <span className="mono muted">{formatLogTime(log.timestamp)}</span>
                    <p>{log.message}</p>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}