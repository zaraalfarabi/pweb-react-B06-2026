import type { ActivityLog, Application } from '../types';

// kunci unik company+role: huruf besar/kecil & spasi tepi tidak berpengaruh
export const makeApplicationKey = (company: string, role: string): string =>
  `${company.trim().toLowerCase()}::${role.trim().toLowerCase()}`;

export function isDuplicateApplication(
  applications: Application[],
  company: string,
  role: string,
): boolean {
  const key = makeApplicationKey(company, role);
  return applications.some((app) => makeApplicationKey(app.company, app.role) === key);
}

export function createActivityLog(message: string): ActivityLog {
  return { id: crypto.randomUUID(), timestamp: new Date().toISOString(), message };
}

// "React, typescript , React" -> ["React", "typescript"] (tanpa kosong & duplikat)
export function parseSkills(text: string): string[] {
  const result: string[] = [];
  for (const raw of text.split(',')) {
    const skill = raw.trim();
    if (skill !== '' && !result.some((s) => s.toLowerCase() === skill.toLowerCase())) {
      result.push(skill);
    }
  }
  return result;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const pad = (n: number): string => String(n).padStart(2, '0');

function dateParts(value?: string) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return {
    day: d.getDate(),
    month: MONTHS[d.getMonth()],
    year: d.getFullYear(),
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

// "22 Nov 2026, 10:00" (header detail & kartu pipeline)
export const formatDateTime = (value?: string): string => {
  const p = dateParts(value);
  return p ? `${p.day} ${p.month} ${p.year}, ${p.time}` : '-';
};

// "22 Nov, 10:00" (banner bentrok & activity log)
export const formatShortDateTime = (value?: string): string => {
  const p = dateParts(value);
  return p ? `${p.day} ${p.month}, ${p.time}` : '-';
};

// "09 Nov 2026 • 20:00" (waktu di Riwayat Aktivitas)
export const formatLogTime = (value?: string): string => {
  const p = dateParts(value);
  return p ? `${pad(p.day)} ${p.month} ${p.year} • ${p.time}` : '-';
};

export const formatRupiah = (value?: number): string =>
  value !== undefined ? `Rp ${value.toLocaleString('id-ID')}` : '-';