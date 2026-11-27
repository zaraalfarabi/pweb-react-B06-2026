import { useState } from 'react';
import type { Application } from '../types';
import { compareOffers, WORK_MODE_SCORE, type OfferScore } from '../utils/offerCalculator';

interface OfferComparatorProps {
  applications: Application[];
  kaptenSkills: string[];
}

const formatRupiah = (value: number): string => `Rp ${value.toLocaleString('id-ID')}`;

function OfferColumn({ score, isBest }: { score: OfferScore; isBest: boolean }) {
  const { application } = score;
  return (
    <article className={`offer-card ${isBest ? 'is-best' : ''}`}>
      <header className="offer-card-head">
        <div>
          <h3>{application.company}</h3>
          <p className="muted">{application.role}</p>
        </div>
        {isBest && <span className="badge-best">Rekomendasi Terbaik</span>}
      </header>

      <dl className="offer-rows">
        <div className="offer-row">
          <dt>Uang Saku / Bulan</dt>
          <dd>{formatRupiah(score.salary)}</dd>
          <dd className="mono">{score.salaryScore.toFixed(1)} / 50</dd>
        </div>
        <div className="offer-row">
          <dt>Mode Kerja</dt>
          <dd>{application.workMode} ({WORK_MODE_SCORE[application.workMode]})</dd>
          <dd className="mono">{score.workModeScore.toFixed(1)} / 25</dd>
        </div>
        <div className="offer-row">
          <dt>Kecocokan Skill</dt>
          <dd>{score.skillMatch}% ({score.matchedCount} dari {score.totalRequired} skill)</dd>
          <dd className="mono">{score.skillScore.toFixed(1)} / 25</dd>
        </div>
      </dl>

      <div className="offer-total">
        <span>Total Skor Berbobot</span>
        <strong className="mono">{score.total.toFixed(1)}</strong>
      </div>
    </article>
  );
}

export default function OfferComparator({ applications, kaptenSkills }: OfferComparatorProps) {
  const [selectedAId, setSelectedAId] = useState('');
  const [selectedBId, setSelectedBId] = useState('');

  const offers = applications.filter((app) => app.status === 'OFFER');

  if (offers.length < 2) {
    return (
      <section className="panel empty-state">
        <h2>Bandingkan Offer Magang</h2>
        <p>
          Butuh minimal <strong>2 lamaran berstatus OFFER</strong> untuk dibandingkan. Saat ini
          baru ada {offers.length} offer.
        </p>
      </section>
    );
  }

  // derived: pilihan default = 2 offer pertama, dan A tidak boleh sama dengan B
  const offerA = offers.find((o) => o.id === selectedAId) ?? offers[0];
  const optionsB = offers.filter((o) => o.id !== offerA.id);
  const offerB = optionsB.find((o) => o.id === selectedBId) ?? optionsB[0];

  const { a, b, winnerId } = compareOffers(offerA, offerB, kaptenSkills);

  return (
    <section className="panel">
      <div className="offer-header">
        <div>
          <h2>Bandingkan Offer Magang</h2>
          <p className="muted">Bobot penilaian: Uang Saku 50% • Mode Kerja 25% • Kecocokan Skill 25%</p>
        </div>
        <div className="offer-selects">
          <select className="input" value={offerA.id} onChange={(e) => setSelectedAId(e.target.value)}>
            {offers.map((o) => (
              <option key={o.id} value={o.id}>Offer A: {o.company}</option>
            ))}
          </select>
          <span className="muted">vs</span>
          <select className="input" value={offerB.id} onChange={(e) => setSelectedBId(e.target.value)}>
            {optionsB.map((o) => (
              <option key={o.id} value={o.id}>Offer B: {o.company}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="offer-grid">
        <OfferColumn score={a} isBest={winnerId === offerA.id} />
        <OfferColumn score={b} isBest={winnerId === offerB.id} />
      </div>
      {winnerId === null && <p className="muted center">Skor kedua offer sama persis.</p>}
    </section>
  );
}