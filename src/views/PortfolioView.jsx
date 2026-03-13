import React, { useState } from 'react';
import { Plus, TrendingUp, TrendingDown, Target, ShieldAlert } from 'lucide-react';
import './PortfolioView.css';

const PortfolioView = () => {
  const [stocks, setStocks] = useState([
    { id: 1, name: '삼성전자', avgPrice: 72000, currentPrice: 75200, quantity: 100, type: '장기', target: 90000, stopLoss: 68000 },
    { id: 2, name: 'SK하이닉스', avgPrice: 150000, currentPrice: 162000, quantity: 50, type: '스윙', target: 185000, stopLoss: 140000 },
  ]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newStock, setNewStock] = useState({ name: '', avgPrice: '', quantity: '', type: '스윙' });
  const [editingTarget, setEditingTarget] = useState(null);
  const [activeTab, setActiveTab] = useState('전체');
  const [isAiMode, setIsAiMode] = useState(true);

  const handleAddStock = (e) => {
    e.preventDefault();
    if (!newStock.name || !newStock.avgPrice || !newStock.quantity) return;
    
    const stockToAdd = {
      id: Date.now(),
      ...newStock,
      avgPrice: Number(newStock.avgPrice),
      quantity: Number(newStock.quantity),
      currentPrice: Number(newStock.avgPrice),
      target: 0,
      stopLoss: 0,
      aiType: ['단기', '스윙', '장기'][Math.floor(Math.random() * 3)] // Mock AI classification
    };
    
    setStocks([...stocks, stockToAdd]);
    setNewStock({ name: '', avgPrice: '', quantity: '', type: '스윙' });
    setShowAddForm(false);
  };

  const updatePrice = (id, field, value) => {
    setStocks(stocks.map(s => s.id === id ? { ...s, [field]: Number(value) } : s));
    setEditingTarget(null);
  };

  const calculateProfit = (stock) => {
    const profit = (stock.currentPrice - stock.avgPrice) * stock.quantity;
    const rate = stock.avgPrice !== 0 ? ((stock.currentPrice / stock.avgPrice - 1) * 100).toFixed(2) : 0;
    return { profit, rate };
  };

  const filteredStocks = stocks.filter(stock => {
    if (activeTab === '전체') return true;
    const currentType = isAiMode ? stock.aiType || stock.type : stock.type;
    return currentType === activeTab;
  });

  return (
    <div className="portfolio-container fade-in">
      <div className="summary-card glass-panel">
        <div className="summary-label">총 평가 손익</div>
        <div className="summary-value success">+4,250,500원</div>
        <div className="summary-footer">
          <span>수익률 <span className="success">+5.2%</span></span>
          <button className="add-btn" onClick={() => setShowAddForm(true)}>
            <Plus size={18} />
          </button>
        </div>
      </div>

      <div className="classification-settings glass-panel">
        <div className="ai-toggle-group">
          <span className={`toggle-label ${!isAiMode ? 'active' : ''}`}>사용자 설정</span>
          <div className={`toggle-switch ${isAiMode ? 'on' : ''}`} onClick={() => setIsAiMode(!isAiMode)}>
            <div className="toggle-handle" />
          </div>
          <span className={`toggle-label ${isAiMode ? 'active' : ''}`}>AI 추천 분류</span>
        </div>
      </div>

      <div className="filter-tabs">
        {['전체', '단기', '스윙', '장기'].map(tab => (
          <button 
            key={tab} 
            className={`tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="stock-list">
        {filteredStocks.map(stock => {
          const { profit, rate } = calculateProfit(stock);
          const isPositive = profit >= 0;
          const displayType = isAiMode ? stock.aiType || stock.type : stock.type;

          return (
            <div key={stock.id} className="stock-card glass-card">
              <div className="stock-info">
                <div className="stock-main">
                  <span className="stock-name">{stock.name}</span>
                  <span className={`stock-badge ${displayType === '장기' ? 'blue' : displayType === '스윙' ? 'purple' : 'orange'}`}>
                    {displayType}
                  </span>
                  {isAiMode && <span className="ai-marker">AI</span>}
                </div>
                <div className={`stock-rate ${isPositive ? 'success' : 'danger'}`}>
                  {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  {rate}%
                </div>
              </div>

              <div className="stock-details">
                <div className="detail-row">
                  <span>보유: {stock.quantity}주</span>
                  <span>평단: {stock.avgPrice.toLocaleString()}원</span>
                </div>
                <div className="detail-row">
                  <span>현재: {stock.currentPrice.toLocaleString()}원</span>
                  <span className={isPositive ? 'success' : 'danger'}>
                    {isPositive ? '+' : ''}{profit.toLocaleString()}원
                  </span>
                </div>
              </div>

              <div className="stock-actions">
                <div className="action-item target" onClick={() => setEditingTarget({ id: stock.id, field: 'target' })}>
                  <Target size={14} />
                  {editingTarget?.id === stock.id && editingTarget.field === 'target' ? (
                    <input 
                      autoFocus
                      type="number" 
                      className="edit-input"
                      onBlur={(e) => updatePrice(stock.id, 'target', e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && updatePrice(stock.id, 'target', e.target.value)}
                    />
                  ) : (
                    <span>목표 {stock.target > 0 ? stock.target.toLocaleString() : '설정'}</span>
                  )}
                </div>
                <div className="action-item stoploss" onClick={() => setEditingTarget({ id: stock.id, field: 'stopLoss' })}>
                  <ShieldAlert size={14} />
                  {editingTarget?.id === stock.id && editingTarget.field === 'stopLoss' ? (
                    <input 
                      autoFocus
                      type="number" 
                      className="edit-input"
                      onBlur={(e) => updatePrice(stock.id, 'stopLoss', e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && updatePrice(stock.id, 'stopLoss', e.target.value)}
                    />
                  ) : (
                    <span>손절 {stock.stopLoss > 0 ? stock.stopLoss.toLocaleString() : '설정'}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PortfolioView;
