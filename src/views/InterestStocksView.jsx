import React, { useState } from 'react';
import { Bell, Search, Info } from 'lucide-react';
import './InterestStocksView.css';

const InterestStocksView = () => {
  const [interestStocks, setInterestStocks] = useState([
    { id: 1, name: '카카오', code: '035720', price: 48000, change: -1.2, alertEnabled: true },
    { id: 2, name: 'NAVER', code: '035420', price: 185000, change: 2.1, alertEnabled: true },
  ]);

  const [alerts, setAlerts] = useState([
    { id: 1, stockName: 'SK하이닉스', type: '외인', message: '오전 10:15 - 외국인 50,000주 순매수 포착', time: '1시간 전' },
    { id: 2, stockName: '삼성전자', type: '기관', message: '오전 09:45 - 기관 3일 연속 순매수 기록', time: '2시간 전' },
    { id: 3, stockName: '현대차', type: '실시간', message: '현재 대량 거래 동반한 기관 수급 유입 중', time: '3시간 전' },
  ]);

  const toggleAlert = (id) => {
    setInterestStocks(interestStocks.map(s => s.id === id ? { ...s, alertEnabled: !s.alertEnabled } : s));
  };

  return (
    <div className="interest-container fade-in">
      <div className="search-section">
        <div className="search-bar glass-panel">
          <Search size={18} className="search-icon" />
          <input type="text" placeholder="관심 종목 추가 (예: LG에너지솔루션)" />
        </div>
      </div>

      <div className="watchlist-section">
        <div className="section-header">
          <h3>관심 종목 ({interestStocks.length})</h3>
        </div>
        <div className="watchlist-grid">
          {interestStocks.map(stock => (
            <div key={stock.id} className="interest-card glass-card">
              <div className="card-top">
                <span className="stock-name">{stock.name}</span>
                <button 
                  className={`alert-toggle ${stock.alertEnabled ? 'active' : ''}`}
                  onClick={() => toggleAlert(stock.id)}
                >
                  <Bell size={14} />
                </button>
              </div>
              <div className="card-price">
                <span className="price">{stock.price.toLocaleString()}원</span>
                <span className={`change ${stock.change >= 0 ? 'success' : 'danger'}`}>
                  {stock.change >= 0 ? '+' : ''}{stock.change}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="alert-section">
        <div className="section-header">
          <h3>수급 알림 히스토리</h3>
          <span className="history-count">최근 24시간</span>
        </div>
        
        <div className="alert-list">
          {alerts.map(alert => (
            <div key={alert.id} className="alert-item glass-card slide-up">
              <div className="alert-header">
                <div className={`alert-badge ${alert.type === '외인' ? 'foreign' : alert.type === '기관' ? 'inst' : 'realtime'}`}>
                  {alert.type} 수급
                </div>
                <span className="alert-time">{alert.time}</span>
              </div>
              <div className="alert-content">
                <div className="stock-info">
                  <span className="name">{alert.stockName}</span>
                </div>
                <p className="message">{alert.message}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InterestStocksView;
