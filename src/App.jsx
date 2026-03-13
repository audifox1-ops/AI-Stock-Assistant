import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import PortfolioView from './views/PortfolioView';
import InterestStocksView from './views/InterestStocksView';

// Temporary components for routing
const HomeView = () => (
  <div className="main-content fade-in">
    <div className="welcome-banner glass-panel">
      <h2>안녕하세요, 투자자님! 👋</h2>
      <p>오늘의 시장 현황과 보유 종목을 확인해보세요.</p>
    </div>
    <div className="market-overview">
      <div className="glass-card index-card">KOSPI <span>2,680.35 (+0.45%)</span></div>
      <div className="glass-card index-card">KOSDAQ <span>875.12 (-0.12%)</span></div>
    </div>
  </div>
);
const AnalysisView = () => <div className="main-content"><h2>차트 분석 준비 중</h2></div>;

function App() {
  return (
    <Router>
      <div className="app-container">
        <header className="app-header fade-in">
          <div className="header-content">
            <h1 className="logo-text">AI STOCK</h1>
            <div className="user-profile">
              <div className="avatar"></div>
            </div>
          </div>
        </header>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<PortfolioView />} />
            <Route path="/home" element={<HomeView />} />
            <Route path="/interest" element={<InterestStocksView />} />
            <Route path="/analysis" element={<AnalysisView />} />
          </Routes>
        </main>

        <Navigation />
      </div>
    </Router>
  );
}

export default App;
