import type { Application, WorkMode } from '../types';
import { calculateSkillMatch } from './skillMatcher';

export const OFFER_WEIGHTS = { salary: 0.5, workMode: 0.25, skill: 0.25 } as const;

export const WORK_MODE_SCORE: Record<WorkMode, number> = {
  Remote: 100,
  Hybrid: 75,
  Onsite: 50,
};

export interface OfferScore {
  application: Application;
  salary: number;
  salaryScore: number;   // 0..50 (sudah dikali bobot)
  workModeScore: number; // 0..25
  skillMatch: number;    // 0..100 (%)
  matchedCount: number;
  totalRequired: number;
  skillScore: number;    // 0..25
  total: number;         // 0..100
}

export interface OfferComparison {
  a: OfferScore;
  b: OfferScore;
  winnerId: string | null; // null = skor sama persis
}

function scoreOffer(app: Application, kaptenSkills: string[], maxSalary: number): OfferScore {
  const salary = app.salaryOffer ?? 0;
  // normalisasi gaji: gaji tertinggi dari 2 offer = 100
  const normalizedSalary = maxSalary > 0 ? (salary / maxSalary) * 100 : 0;
  const match = calculateSkillMatch(kaptenSkills, app.requiredSkills);

  const salaryScore = normalizedSalary * OFFER_WEIGHTS.salary;
  const workModeScore = WORK_MODE_SCORE[app.workMode] * OFFER_WEIGHTS.workMode;
  const skillScore = match.score * OFFER_WEIGHTS.skill;

  return {
    application: app,
    salary,
    salaryScore,
    workModeScore,
    skillMatch: match.score,
    matchedCount: match.matched.length,
    totalRequired: app.requiredSkills.length,
    skillScore,
    total: salaryScore + workModeScore + skillScore,
  };
}

export function compareOffers(
  offerA: Application,
  offerB: Application,
  kaptenSkills: string[],
): OfferComparison {
  const maxSalary = Math.max(offerA.salaryOffer ?? 0, offerB.salaryOffer ?? 0);
  const a = scoreOffer(offerA, kaptenSkills, maxSalary);
  const b = scoreOffer(offerB, kaptenSkills, maxSalary);

  let winnerId: string | null = null;
  if (a.total > b.total) winnerId = offerA.id;
  else if (b.total > a.total) winnerId = offerB.id;

  return { a, b, winnerId };
}