import type { Application } from '../types';
import { calculateStatistics } from '../utils/statistics';
import { findInterviewConflicts } from '../utils/interviewConflict';
import { formatShortDateTime } from '../utils/applicationHelpers';
import Statistics from './Statistics';

interface DashboardProps {
  applications: Application[]; // WAJIB seluruh data, bukan data yang ter-filter
}

export default function Dashboard({ applications }: DashboardProps) {
  // derived state: dihitung ulang tiap render, tidak disimpan di useState
  const stats = calculateStatistics(applications);
  const conflicts = findInterviewConflicts(applications);

  return (
    <div className="dashboard">
      {conflicts.length > 0 && (
        <div className="conflict-banner" role="alert">
          <strong>⚠ Jadwal Interview Bentrok:</strong>
          <ul>
            {conflicts.map(({ first, second }) => (
              <li key={`${first.id}-${second.id}`}>
                {first.company} ({formatShortDateTime(first.interviewDateTime)}) dan {second.company} (
                {formatShortDateTime(second.interviewDateTime)}) berselisih kurang dari 60 menit.
              </li>
            ))}
          </ul>
        </div>
      )}
      <Statistics stats={stats} />
    </div>
  );
}