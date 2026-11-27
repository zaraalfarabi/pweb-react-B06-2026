export type AppTab = 'explore' | 'pipeline' | 'offer';
export type Theme = 'light' | 'dark';

interface NavbarProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  pipelineCount: number;
  offerCount: number;
  onAddClick: () => void;
  theme: Theme;
  onToggleTheme: () => void;
}

export default function Navbar({
  activeTab,
  onTabChange,
  pipelineCount,
  offerCount,
  onAddClick,
  theme,
  onToggleTheme,
}: NavbarProps) {
  const tabs: { id: AppTab; label: string; count: number | null }[] = [
    { id: 'explore', label: 'Eksplorasi Lowongan', count: null },
    { id: 'pipeline', label: 'Pipeline Lamaran', count: pipelineCount },
    { id: 'offer', label: 'Bandingkan Offer', count: offerCount },
  ];

  return (
    <aside className="navbar">
      <div className="navbar-brand">
        <span className="navbar-logo">MY</span>
        <div className="navbar-name">
          <strong>MagangYuk</strong>
          <small>Teman berburu magang</small>
        </div>
      </div>

      <nav className="navbar-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`navbar-tab ${activeTab === tab.id ? 'is-active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <span>{tab.label}</span>
            {tab.count !== null && <span className="navbar-count">{tab.count}</span>}
          </button>
        ))}
      </nav>

      {/* bonus: dark mode, pilihan disimpan lewat useLocalStorage di App */}
      <button type="button" className="navbar-theme" onClick={onToggleTheme}>
        {theme === 'dark' ? '☀️ Mode Terang' : '🌙 Mode Gelap'}
      </button>

      <button type="button" className="btn btn-accent navbar-cta" onClick={onAddClick}>
        + Catat Lamaran
      </button>
      <p className="navbar-foot">Kelompok B06 • Modul 5</p>
    </aside>
  );
}