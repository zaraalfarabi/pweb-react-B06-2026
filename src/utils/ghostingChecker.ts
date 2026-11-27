import type { Application } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;
export const GHOSTING_THRESHOLD_DAYS = 14;
export const SIMULATION_DAYS = 15;

export const canBeGhosted = (app: Application): boolean =>
  app.status === 'APPLIED' || app.status === 'SCREENING';

// APPLIED / SCREENING yang tidak berubah > 14 hari = Rawan Ghosting (derived, tidak disimpan)
export function isRawanGhosting(app: Application, now: number = Date.now()): boolean {
  if (!canBeGhosted(app)) return false;
  return now - new Date(app.lastUpdatedAt).getTime() > GHOSTING_THRESHOLD_DAYS * DAY_MS;
}

// dipakai tombol "Simulasi +15 Hari": mundurkan tanggal sebanyak `days` hari
export function shiftDateBackward(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() - days * DAY_MS).toISOString();
}