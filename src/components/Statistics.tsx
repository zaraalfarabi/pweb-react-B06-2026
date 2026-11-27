import type { DashboardStats } from '../utils/statistics';

interface StatisticsProps {
  stats: DashboardStats;
}

export default function Statistics({ stats }: StatisticsProps) {
  const cards = [
    { label: 'Total Lamaran', value: `${stats.total}`, note: `${stats.active} aktif di pipeline`, tone: '' },
    { label: 'Response Rate', value: `${stats.responseRate}%`, note: `${stats.responded} dari ${stats.total} diproses`, tone: '' },
    { label: 'Interview Rate', value: `${stats.interviewRate}%`, note: `${stats.interviewed} masuk wawancara`, tone: '' },
    { label: 'Rawan Ghosting', value: `${stats.ghostingRisk}`, note: '>14 hari tanpa kabar', tone: stats.ghostingRisk > 0 ? 'danger' : '' },
    { label: 'Total Offer', value: `${stats.offers}`, note: stats.offers >= 2 ? 'Siap dibandingkan' : 'Butuh 2 untuk dibandingkan', tone: stats.offers > 0 ? 'success' : '' },
  ];

  return (
    <section className="stats-grid">
      {cards.map((card) => (
        <article key={card.label} className="stat-card">
          <span className="stat-label">{card.label}</span>
          <strong className={`stat-value ${card.tone}`}>{card.value}</strong>
          <span className="stat-note">{card.note}</span>
        </article>
      ))}
    </section>
  );
}
