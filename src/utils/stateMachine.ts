import type { Application, ApplicationStatus, WorkMode } from '../types';
import { createActivityLog, formatDateTime, formatRupiah } from './applicationHelpers';

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  WISHLIST: 'Wishlist',
  APPLIED: 'Applied',
  SCREENING: 'Screening',
  INTERVIEW: 'Interview',
  OFFER: 'Offer',
  REJECTED: 'Rejected',
  GHOSTED: 'Ghosted',
};

export const ALL_STATUSES = Object.keys(STATUS_LABEL) as ApplicationStatus[];

// Diagram State Machine: hanya panah di bawah ini yang sah.
// OFFER & REJECTED final (tidak punya tujuan). GHOSTED khusus boleh kembali ke SCREENING.
export const STATUS_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  WISHLIST: ['APPLIED'],
  APPLIED: ['SCREENING', 'REJECTED', 'GHOSTED'],
  SCREENING: ['INTERVIEW', 'REJECTED', 'GHOSTED'],
  INTERVIEW: ['OFFER', 'REJECTED', 'GHOSTED'],
  GHOSTED: ['SCREENING'],
  OFFER: [],
  REJECTED: [],
};

export const getAllowedTransitions = (status: ApplicationStatus): ApplicationStatus[] =>
  STATUS_TRANSITIONS[status];

export const canTransition = (from: ApplicationStatus, to: ApplicationStatus): boolean =>
  STATUS_TRANSITIONS[from].includes(to);

export const isFinalStatus = (status: ApplicationStatus): boolean =>
  STATUS_TRANSITIONS[status].length === 0;

// data tambahan yang diisi saat pindah status
export interface TransitionPayload {
  cvVersion: string;
  appliedDate: string;
  interviewDateTime: string; // YYYY-MM-DDTHH:mm
  salaryOffer: number;
  workMode: WorkMode;
}

export type TransitionField = keyof TransitionPayload;
export type TransitionErrors = Partial<Record<TransitionField | 'status', string>>;

export function validateTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
  payload: TransitionPayload,
): TransitionErrors {
  const errors: TransitionErrors = {};

  if (!canTransition(from, to)) {
    errors.status = `Status ${STATUS_LABEL[from]} tidak bisa pindah ke ${STATUS_LABEL[to]}.`;
    return errors;
  }
  if (to === 'APPLIED') {
    if (payload.cvVersion.trim() === '') errors.cvVersion = 'Versi CV wajib diisi.';
    if (payload.appliedDate === '') errors.appliedDate = 'Tanggal melamar wajib diisi.';
  }
  if (to === 'INTERVIEW' && payload.interviewDateTime === '') {
    errors.interviewDateTime = 'Jadwal interview wajib diisi.';
  }
  if (to === 'OFFER') {
    if (!(payload.salaryOffer > 0)) errors.salaryOffer = 'Uang saku / gaji harus lebih dari 0.';
    if (!payload.workMode) errors.workMode = 'Mode kerja wajib dipilih.';
  }
  return errors;
}

function describeTransition(from: ApplicationStatus, to: ApplicationStatus, p: TransitionPayload): string {
  const base = `Pindah dari ${STATUS_LABEL[from]} ke ${STATUS_LABEL[to]}`;
  if (to === 'APPLIED') return `${base} (CV: ${p.cvVersion.trim()})`;
  if (to === 'INTERVIEW') return `${base} (jadwal ${formatDateTime(p.interviewDateTime)})`;
  if (to === 'OFFER') return `${base} (${formatRupiah(p.salaryOffer)}, ${p.workMode})`;
  return base;
}

// menghasilkan objek BARU (immutable), tidak mengubah objek lama
export function applyTransition(
  app: Application,
  to: ApplicationStatus,
  payload: TransitionPayload,
): Application {
  const extra: Partial<Application> =
    to === 'APPLIED'
      ? { cvVersion: payload.cvVersion.trim(), appliedDate: payload.appliedDate }
      : to === 'INTERVIEW'
        ? { interviewDateTime: payload.interviewDateTime }
        : to === 'OFFER'
          ? { salaryOffer: payload.salaryOffer, workMode: payload.workMode }
          : {};

  return {
    ...app,
    ...extra,
    status: to,
    lastUpdatedAt: new Date().toISOString(),
    activityLogs: [...app.activityLogs, createActivityLog(describeTransition(app.status, to, payload))],
  };
}