import { useEffect, useRef, useState } from 'react';
import type { Application, ApplicationStatus, JobListing } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { inferWorkMode } from './services/jobService';
import { createActivityLog, isDuplicateApplication } from './utils/applicationHelpers';
import { applyTransition, validateTransition, type TransitionPayload } from './utils/stateMachine';
import { canBeGhosted, shiftDateBackward, SIMULATION_DAYS } from './utils/ghostingChecker';
import { findInterviewConflicts, getConflictIds } from './utils/interviewConflict';
import Navbar, { type AppTab, type Theme } from './components/Navbar';
import Dashboard from './components/Dashboard';
import JobExplorer from './components/JobExplorer';
import ApplicationForm from './components/ApplicationForm';
import ApplicationPipeline from './components/ApplicationPipeline';
import ApplicationDetail from './components/ApplicationDetail';
import OfferComparator from './components/OfferComparator';
import './App.css';

const DEFAULT_SKILLS: string[] = ['React', 'TypeScript', 'CSS'];
const UNDO_DURATION_MS = 5000;

interface PendingDelete {
  application: Application;
  index: number; // posisi semula, supaya kembali di tempat yang sama
}

// toast Undo dengan hitung mundur "Undo (4d)"; timer hapus tetap di useRef milik App
function UndoToast({ company, onUndo }: { company: string; onUndo: () => void }) {
  const [secondsLeft, setSecondsLeft] = useState(UNDO_DURATION_MS / 1000);

  useEffect(() => {
    const intervalId = setInterval(() => setSecondsLeft((prev) => (prev > 1 ? prev - 1 : prev)), 1000);
    return () => clearInterval(intervalId); // cleanup saat toast hilang / diganti
  }, []);

  return (
    <div className="toast" role="status">
      <span>
        Lamaran <strong>{company}</strong> telah dihapus.
      </span>
      <button type="button" className="toast-undo" onClick={onUndo}>Undo ({secondsLeft}d)</button>
      <div className="toast-progress" />
    </div>
  );
}

export default function App() {
  // ---------- state utama (persisten lewat custom hook useLocalStorage) ----------
  const [kaptenSkills, setKaptenSkills] = useLocalStorage<string[]>('kaptenSkills', DEFAULT_SKILLS);
  const [applications, setApplications] = useLocalStorage<Application[]>('applications', []);
  const [theme, setTheme] = useLocalStorage<Theme>('theme', 'light'); // bonus: dark mode tersimpan

  // ---------- state UI ----------
  const [activeTab, setActiveTab] = useState<AppTab>('explore');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---------- derived state ----------
  const selectedApplication = applications.find((app) => app.id === selectedId) ?? null;
  const offerCount = applications.filter((app) => app.status === 'OFFER').length;
  const conflictIds = getConflictIds(findInterviewConflicts(applications)); // dari SELURUH data

  // bersihkan timer undo jika App unmount
  useEffect(() => {
    return () => {
      if (undoTimerRef.current !== null) clearTimeout(undoTimerRef.current);
    };
  }, []);

  // update 1 lamaran secara immutable
  const updateApplication = (id: string, updater: (app: Application) => Application) =>
    setApplications((prev) => prev.map((app) => (app.id === id ? updater(app) : app)));

  // ---------- Fitur 1: simpan dari katalog ----------
  const handleSaveToWishlist = (job: JobListing) => {
    const newApplication: Application = {
      id: crypto.randomUUID(),
      company: job.company_name,
      role: job.title,
      workMode: inferWorkMode(job.candidate_required_location),
      status: 'WISHLIST',
      requiredSkills: job.tags,
      lastUpdatedAt: new Date().toISOString(),
      checklist: [],
      activityLogs: [createActivityLog('Disimpan ke Wishlist dari Katalog')],
    };
    setApplications((prev) =>
      isDuplicateApplication(prev, job.company_name, job.title) ? prev : [newApplication, ...prev],
    );
  };

  // ---------- Fitur 2: form manual ----------
  const handleAddApplication = (application: Application) => {
    setApplications((prev) =>
      isDuplicateApplication(prev, application.company, application.role) ? prev : [application, ...prev],
    );
    setIsFormOpen(false);
    setActiveTab('pipeline');
  };

  // ---------- Fitur 4: state machine ----------
  const handleChangeStatus = (id: string, to: ApplicationStatus, payload: TransitionPayload) => {
    const current = applications.find((app) => app.id === id);
    if (!current) return;
    if (Object.keys(validateTransition(current.status, to, payload)).length > 0) return; // jaga-jaga
    const updated = applyTransition(current, to, payload);
    updateApplication(id, () => updated);
  };

  // ---------- Fitur 3: simulasi +15 hari ----------
  const handleSimulate = (id: string) => {
    const log = createActivityLog(`Simulasi: lastUpdatedAt dimundurkan ${SIMULATION_DAYS} hari`);
    updateApplication(id, (app) =>
      canBeGhosted(app)
        ? {
            ...app,
            lastUpdatedAt: shiftDateBackward(app.lastUpdatedAt, SIMULATION_DAYS),
            activityLogs: [...app.activityLogs, log],
          }
        : app,
    );
  };

  // ---------- Fitur 6: undo delete 5 detik ----------
  const handleDelete = (id: string) => {
    const index = applications.findIndex((app) => app.id === id);
    if (index === -1) return;

    setApplications((prev) => prev.filter((app) => app.id !== id));
    if (selectedId === id) setSelectedId(null);

    // hapus 2x berturut-turut: timer lama WAJIB dibersihkan
    if (undoTimerRef.current !== null) clearTimeout(undoTimerRef.current);
    setPendingDelete({ application: applications[index], index });
    undoTimerRef.current = setTimeout(() => {
      setPendingDelete(null);
      undoTimerRef.current = null;
    }, UNDO_DURATION_MS);
  };

  const handleUndo = () => {
    if (pendingDelete === null) return;
    if (undoTimerRef.current !== null) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = null;

    const { application, index } = pendingDelete;
    // kembali utuh (checklist & activity log ikut), di posisi semula
    setApplications((prev) =>
      prev.some((app) => app.id === application.id)
        ? prev
        : [...prev.slice(0, index), application, ...prev.slice(index)],
    );
    setPendingDelete(null);
  };

  return (
    <div className="app" data-theme={theme}>
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pipelineCount={applications.length}
        offerCount={offerCount}
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        onAddClick={() => setIsFormOpen(true)}
      />

      <main className="app-main">
        {/* banner bentrok + statistik selalu dari SELURUH data, walau filter aktif */}
        <Dashboard applications={applications} />

        {activeTab === 'explore' && (
          <JobExplorer
            kaptenSkills={kaptenSkills}
            onSkillsChange={setKaptenSkills}
            applications={applications}
            onSaveToWishlist={handleSaveToWishlist}
          />
        )}

        {activeTab === 'pipeline' && (
          <ApplicationPipeline
            applications={applications}
            kaptenSkills={kaptenSkills}
            conflictIds={conflictIds}
            onOpenDetail={setSelectedId}
            onSimulate={handleSimulate}
            onDelete={handleDelete}
            onAddClick={() => setIsFormOpen(true)}
          />
        )}

        {activeTab === 'offer' && (
          <OfferComparator applications={applications} kaptenSkills={kaptenSkills} />
        )}
      </main>

      {isFormOpen && (
        <div className="modal-overlay" onClick={() => setIsFormOpen(false)}>
          <div className="modal form-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2>Catat Lamaran Manual</h2>
            <ApplicationForm
              applications={applications}
              onSubmit={handleAddApplication}
              onCancel={() => setIsFormOpen(false)}
            />
          </div>
        </div>
      )}

      {selectedApplication !== null && (
        <ApplicationDetail
          key={selectedApplication.id}
          application={selectedApplication}
          onClose={() => setSelectedId(null)}
          onChangeStatus={handleChangeStatus}
          onUpdate={updateApplication}
          onSimulate={handleSimulate}
          onDelete={handleDelete}
        />
      )}

      {pendingDelete !== null && (
        <UndoToast
          key={pendingDelete.application.id}
          company={pendingDelete.application.company}
          onUndo={handleUndo}
        />
      )}
    </div>
  );
}