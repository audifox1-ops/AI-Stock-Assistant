export default function HomePage() {
  return (
    <div className="main-content fade-in">
      <div className="welcome-banner glass-panel">
        <h2>안녕하세요, 투자자님! 👋</h2>
        <p>오늘의 시장 현황과 보유 종목을 확인해보세요.</p>
      </div>
      <div className="market-overview">
        <div className="glass-card index-card">KOSPI <span>2,680.35 (+0.45%)</span></div>
        <div className="glass-card index-card">KOSDAQ <span>875.12 (-0.12%)</span></div>
      </div>
      <style jsx>{`
        .welcome-banner { padding: 32px; text-align: center; margin-bottom: 24px; }
        .welcome-banner h2 { margin-bottom: 8px; font-size: 24px; }
        .welcome-banner p { color: var(--text-secondary); font-size: 15px; }
        .market-overview { display: flex; gap: 12px; }
        .index-card { flex: 1; padding: 20px; text-align: center; font-weight: 600; font-size: 14px; }
        .index-card span { display: block; margin-top: 8px; font-size: 16px; font-weight: 700; color: var(--accent-primary); }
      `}</style>
    </div>
  );
}
