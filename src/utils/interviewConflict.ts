import type { Application } from '../types';

export interface InterviewConflict {
  first: Application;
  second: Application;
  diffMinutes: number;
}

// cek dari SELURUH lamaran berstatus INTERVIEW, selisih < 60 menit = bentrok
export function findInterviewConflicts(applications: Application[]): InterviewConflict[] {
  const interviews = applications
    .filter((app) => app.status === 'INTERVIEW' && app.interviewDateTime)
    .map((app) => ({ app, time: new Date(app.interviewDateTime ?? '').getTime() }))
    .filter((item) => !Number.isNaN(item.time))
    .sort((a, b) => a.time - b.time);

  const conflicts: InterviewConflict[] = [];
  for (let i = 0; i < interviews.length; i++) {
    for (let j = i + 1; j < interviews.length; j++) {
      const diffMinutes = (interviews[j].time - interviews[i].time) / 60000;
      if (diffMinutes >= 60) break; // sudah urut, sisanya pasti >= 60
      conflicts.push({ first: interviews[i].app, second: interviews[j].app, diffMinutes });
    }
  }
  return conflicts;
}

// kumpulan id lamaran yang terlibat bentrok (untuk badge di kartu)
export function getConflictIds(conflicts: InterviewConflict[]): Set<string> {
  const ids = new Set<string>();
  for (const { first, second } of conflicts) {
    ids.add(first.id);
    ids.add(second.id);
  }
  return ids;
}