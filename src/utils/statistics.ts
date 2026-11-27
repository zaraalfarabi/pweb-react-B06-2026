import type { Application, ApplicationStatus } from '../types';
import { isRawanGhosting } from './ghostingChecker';

export interface DashboardStats {
  total: number;
  active: number;
  responded: number;
  responseRate: number;
  interviewed: number;
  interviewRate: number;
  ghostingRisk: number;
  offers: number;
}

// sudah dapat respon dari perusahaan (lolos atau ditolak)
const RESPONDED: ApplicationStatus[] = ['SCREENING', 'INTERVIEW', 'OFFER', 'REJECTED'];
// pernah sampai tahap wawancara
const INTERVIEWED: ApplicationStatus[] = ['INTERVIEW', 'OFFER'];
// masih berjalan di pipeline
const ACTIVE: ApplicationStatus[] = ['APPLIED', 'SCREENING', 'INTERVIEW'];

const percent = (part: number, whole: number): number =>
  whole === 0 ? 0 : Math.round((part / whole) * 100);

// fungsi murni: dipanggil langsung saat render (derived state, tanpa useState)
export function calculateStatistics(
  applications: Application[],
  now: number = Date.now(),
): DashboardStats {
  const total = applications.length;
  const countBy = (statuses: ApplicationStatus[]): number =>
    applications.filter((app) => statuses.includes(app.status)).length;

  const responded = countBy(RESPONDED);
  const interviewed = countBy(INTERVIEWED);

  return {
    total,
    active: countBy(ACTIVE),
    responded,
    responseRate: percent(responded, total),
    interviewed,
    interviewRate: percent(interviewed, total),
    ghostingRisk: applications.filter((app) => isRawanGhosting(app, now)).length,
    offers: countBy(['OFFER']),
  };
}