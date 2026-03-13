"use client";

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  Plus, 
  Target, 
  ShieldAlert,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  RefreshCcw,
  Trash2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AiAnalysisResult {
  position: string;
  action: string;
  targetPrice: number;
  reason: string;
}

interface Stock {
  id: string | number;
  symbol: string; // 야후 파이낸스 심볼 (예: 005930.KS)
  name: string;
  avgPrice: number;
  currentPrice: number | null; // 0 대신 null로 초기화하여 로딩 상태 구분
  quantity: number;
  type: '단기' | '스윙' | '장기';
  target: number;
  stopLoss: number;
  supplyTrend: string;
  analysis?: AiAnalysisResult;
  error?: string;
  changePercent?: number;
}

export default function PortfolioPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [expandedStockId, setExpandedStockId] = useState<string | number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [newStock, setNewStock] = useState<Partial<Stock>>({
    name: '',
    symbol: '',
    avgPrice: 0,
    quantity: 0,
    type: '스윙',
    target: 0,
    stopLoss: 0,
    supplyTrend: '수급 분석 대기 중'
  });

  const [loadingAi, setLoadingAi] = useState<Record<string | number, boolean>>({});

  // 시간 포맷팅 함수 (HH:mm:ss)
  const formatCurrentTime = () => {
    const now = new Date();
    return now.toTimeString().split(' ')[0];
  };

  // 1. Supabase에서 보유 종목 가져오기
  const fetchHoldings = async () => {
    try {
      const { data, error } = await supabase
        .from('holdings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const mappedStocks: Stock[] = data.map(item => ({
          id: item.id,
          symbol: item.symbol,
          name: item.stock_name,
          avgPrice: Number(item.avg_buy_price),
          currentPrice: null,
          quantity: Number(item.quantity),
          type: item.position_type as '단기' | '스윙' | '장기',
          target: Number(item.target_price),
          stopLoss: Number(item.stop_loss),
          supplyTrend: '수급 동향 조회 중...'
        }));
        setStocks(mappedStocks);
        return mappedStocks;
      }
    } catch (err) {
      console.error('Error fetching holdings:', err);
    } finally {
      setIsInitialLoading(false);
    }
    return [];
  };

  // 2. 실시간 주가 데이터 가져오기
  const fetchPrices = async (targetStocks?: Stock[]) => {
    const currentStocks = targetStocks || stocks;
    if (currentStocks.length === 0) return;

    setIsRefreshing(true);
    try {
      const symbols = currentStocks.map(s => s.symbol).filter(Boolean);
      const res = await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols })
      });
      const data = await res.json();
      
      setStocks(prev => prev.map(stock => {
        const liveData = data[stock.symbol];
        if (liveData && !liveData.error) {
          return {
            ...stock,
            currentPrice: liveData.price,
            changePercent: liveData.changePercent
          };
        }
        return stock;
      }));
      setLastSyncTime(formatCurrentTime());
    } catch (error) {
      console.error("Price fetch error:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const loadedStocks = await fetchHoldings();
      if (loadedStocks.length > 0) {
        await fetchPrices(loadedStocks);
      }
    };
    init();

    // 1분마다 자동 갱신
    const interval = setInterval(() => fetchPrices(), 60000);
    return () => clearInterval(interval);
  }, []);

  const calculateProfit = (stock: Stock) => {
    if (stock.currentPrice === null) return { profit: 0, rate: '0.00', isPositive: true };
    const profit = (stock.currentPrice - stock.avgPrice) * stock.quantity;
    const rate = ((stock.currentPrice / stock.avgPrice - 1) * 100).toFixed(2);
    return { profit, rate, isPositive: profit >= 0 };
  };

  const handleAddStock = async () => {
    if (!newStock.name || !newStock.avgPrice || !newStock.symbol) return;
    
    let symbol = newStock.symbol.toUpperCase();
    if (!symbol.includes('.')) {
      symbol += '.KS';
    }

    try {
      const { data, error } = await supabase
        .from('holdings')
        .insert([{
          symbol: symbol,
          stock_name: newStock.name,
          avg_buy_price: Number(newStock.avgPrice),
          quantity: Number(newStock.quantity),
          position_type: newStock.type,
          target_price: Number(newStock.target),
          stop_loss: Number(newStock.stopLoss)
        }])
        .select();

      if (error) throw error;

      if (data && data[0]) {
        const newItem = data[0];
        const stockToAdd: Stock = {
          id: newItem.id,
          symbol: newItem.symbol,
          name: newItem.stock_name,
          avgPrice: Number(newItem.avg_buy_price),
          currentPrice: null,
          quantity: Number(newItem.quantity),
          type: newItem.position_type as '단기' | '스윙' | '장기',
          target: Number(newItem.target_price),
          stopLoss: Number(newItem.stop_loss),
          supplyTrend: '신규 등록 종목'
        };

        const updatedStocks = [stockToAdd, ...stocks];
        setStocks(updatedStocks);
        setIsAddModalOpen(false);
        setNewStock({ name: '', symbol: '', avgPrice: 0, quantity: 0, type: '스윙', target: 0, stopLoss: 0, supplyTrend: '수급 분석 대기 중' });
        
        // 가격 즉시 동기화
        setTimeout(() => fetchPrices(updatedStocks), 500);
      }
    } catch (err) {
      console.error('Error adding stock:', err);
      alert('종목 등록 중 오류가 발생했습니다. DB 설정을 확인해주세요.');
    }
  };

  const handleDeleteStock = async (stockId: string | number) => {
    if (!confirm('정말 이 종목을 삭제하시겠습니까?')) return;

    try {
      const { error } = await supabase
        .from('holdings')
        .delete()
        .eq('id', stockId);

      if (error) throw error;

      setStocks(prev => prev.filter(s => s.id !== stockId));
      if (expandedStockId === stockId) setExpandedStockId(null);
    } catch (err) {
      console.error('Error deleting stock:', err);
      alert('종목 삭제 중 오류가 발생했습니다.');
    }
  };

  const analyzeStock = async (stock: Stock) => {
    if (stock.currentPrice === null) return;

    if ((stock.analysis || stock.error) && expandedStockId === stock.id) {
      setExpandedStockId(null);
      return;
    }

    if (stock.analysis || stock.error) {
      setExpandedStockId(stock.id);
      return;
    }

    setLoadingAi(prev => ({ ...prev, [stock.id]: true }));
    try {
      const { rate } = calculateProfit(stock);
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: stock.name,
          currentPrice: stock.currentPrice,
          rate: rate,
          supplyTrend: stock.supplyTrend
        })
      });

      if (!res.ok) throw new Error('API 호출에 실패했습니다.');

      const data = await res.json();
      if (data.error) {
        setStocks(prev => prev.map(s => s.id === stock.id ? { ...s, error: data.error, analysis: undefined } : s));
      } else {
        setStocks(prev => prev.map(s => s.id === stock.id ? { ...s, analysis: data, error: undefined } : s));
      }
      setExpandedStockId(stock.id);
    } catch (err) {
      setStocks(prev => prev.map(s => s.id === stock.id ? { ...s, error: "일시적인 오류가 발생했습니다.", analysis: undefined } : s));
      setExpandedStockId(stock.id);
    } finally {
      setLoadingAi(prev => ({ ...prev, [stock.id]: false }));
    }
  };

  // 포트폴리오 요약 계산
  const totalBuyAmount = stocks.reduce((acc, s) => acc + s.avgPrice * s.quantity, 0);
  const totalCurrentAmount = stocks.reduce((acc, s) => acc + (s.currentPrice || s.avgPrice) * s.quantity, 0);
  const totalProfit = totalCurrentAmount - totalBuyAmount;
  const totalProfitRate = totalBuyAmount > 0 ? (totalProfit / totalBuyAmount * 100) : 0;
  const isTotalPositive = totalProfit >= 0;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-32 font-sans overflow-x-hidden">
      {/* Header Summary */}
      <div className="p-8 bg-gradient-to-b from-slate-800 to-slate-900">
        <div className="flex justify-between items-center mb-8">
          <div className="flex flex-col">
            <h1 className="text-2xl font-black font-heading bg-gradient-to-r from-blue-500 to-indigo-400 bg-clip-text text-transparent">
              내 자산 현황
            </h1>
            <div className="flex flex-col gap-1 mt-1">
              <span className="text-[10px] text-slate-500 font-bold">AI가 실시간으로 타이밍을 감시 중입니다.</span>
              {lastSyncTime && (
                <span className="text-[10px] text-blue-500/70 font-black">마지막 동기화: {lastSyncTime}</span>
              )}
            </div>
            <button 
              onClick={() => fetchPrices()}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 w-fit px-3 py-1.5 mt-3 rounded-full bg-slate-800/50 border border-white/5 text-[10px] text-slate-400 font-black hover:text-blue-400 transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCcw size={10} className={isRefreshing ? 'animate-spin' : ''} />
              {isRefreshing ? '조회 중...' : '↻ 새로고침'}
            </button>
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="w-12 h-12 rounded-2xl bg-blue-500 text-white shadow-lg shadow-blue-500/20 flex items-center justify-center hover:bg-blue-600 transition-all active:scale-90"
          >
            <Plus size={24} />
          </button>
        </div>

        <div className="bg-slate-800/40 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-700"></div>
          <p className="text-slate-500 text-xs mb-1 font-black uppercase tracking-widest">실시간 총 평가 손익</p>
          <div className="flex items-baseline gap-2 mb-6">
            <h2 className={`text-4xl font-black tracking-tight ${isTotalPositive ? 'text-red-500' : 'text-blue-400'}`}>
              {isTotalPositive ? '+' : ''}{totalProfit.toLocaleString()}원
            </h2>
            <span className={`text-lg font-black ${isTotalPositive ? 'text-red-500' : 'text-blue-400'}`}>
              {isTotalPositive ? '+' : ''}{totalProfitRate.toFixed(2)}%
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900/40 rounded-3xl p-4 border border-white/5">
              <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider font-bold">평가 금액</p>
              <p className="text-lg font-bold">
                {(totalCurrentAmount / 1000000).toFixed(1)}M
              </p>
            </div>
            <div className="bg-slate-900/40 rounded-3xl p-4 border border-white/5">
              <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider font-bold">매수 금액</p>
              <p className="text-lg font-bold">
                {(totalBuyAmount / 1000000).toFixed(1)}M
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Cards List */}
      <div className="px-8 space-y-6">
        <div className="flex justify-between items-center px-1">
          <h3 className="font-black text-lg text-slate-200 font-heading">보유 종목 ({stocks.length})</h3>
          <div className="flex gap-2">
            <button className="px-5 py-2 rounded-full bg-slate-800 text-slate-400 text-xs font-black border border-white/5 hover:bg-slate-700 transition-all">필터</button>
          </div>
        </div>

        {isInitialLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 font-black text-sm">데이터베이스 연결 중...</p>
          </div>
        ) : stocks.length === 0 ? (
          <div className="bg-slate-800/20 border border-dashed border-white/10 rounded-[2.5rem] p-12 text-center">
            <p className="text-slate-500 font-bold mb-4">등록된 종목이 없습니다.</p>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="px-6 py-3 bg-blue-500/10 text-blue-500 rounded-2xl font-black text-sm border border-blue-500/20 hover:bg-blue-500/20 transition-all"
            >
              첫 종목 추가하기
            </button>
          </div>
        ) : (
          stocks.map(stock => {
            const { profit, rate, isPositive } = calculateProfit(stock);
            const isExpanded = expandedStockId === stock.id;
            const badgeColors = {
              '장기': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
              '스윙': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
              '단기': 'bg-orange-500/10 text-orange-400 border-orange-500/20'
            };

            return (
              <div key={stock.id} className="bg-slate-800/40 border border-white/5 rounded-[2.5rem] p-6 hover:bg-slate-800/60 transition-all duration-300 shadow-xl relative overflow-hidden group/card">
                {/* Card Header */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-xl font-black text-slate-100">{stock.name}</h4>
                      <span className={`text-[10px] px-3 py-1 rounded-full border font-black tracking-tighter ${badgeColors[stock.type]}`}>
                        {stock.type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-bold">{stock.symbol} · {stock.quantity}주</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteStock(stock.id); }}
                      className="text-slate-700 hover:text-red-500 transition-colors p-2 -mt-2 -mr-2 opacity-0 group-hover/card:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                    <div className="text-right mt-1">
                      {stock.currentPrice === null ? (
                        <div className="flex flex-col items-end gap-1">
                          <div className="w-20 h-6 bg-white/5 animate-pulse rounded-lg"></div>
                          <div className="w-12 h-4 bg-white/5 animate-pulse rounded-lg mt-1"></div>
                        </div>
                      ) : (
                        <>
                          <div className={`flex items-center justify-end gap-1 font-black text-xl ${isPositive ? 'text-red-500' : 'text-blue-400'}`}>
                            {isPositive ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                            {rate}%
                          </div>
                          <p className={`text-xs font-bold ${isPositive ? 'text-red-500/70' : 'text-blue-400/70'}`}>
                            {isPositive ? '+' : ''}{profit.toLocaleString()}원
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Targets & Current */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center gap-3 bg-slate-900/40 rounded-2xl p-4 border border-white/5 relative overflow-hidden">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-600 font-black uppercase mb-1">매수 평단</span>
                      <span className="text-sm font-black text-slate-300">{stock.avgPrice.toLocaleString()}원</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-900/40 rounded-2xl p-4 border border-white/5 relative">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-600 font-black uppercase mb-1">실시간 현재가</span>
                      {stock.currentPrice === null ? (
                        <span className="text-xs text-slate-500 font-black animate-pulse">조회 중...</span>
                      ) : (
                        <span className={`text-sm font-black ${stock.changePercent && stock.changePercent >= 0 ? 'text-red-500' : 'text-blue-400'}`}>
                          {stock.currentPrice.toLocaleString()}원
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center gap-3 bg-slate-900/40 rounded-2xl p-3 border border-white/5">
                    <Target size={14} className="text-red-500/50" />
                    <span className="text-[11px] font-bold text-red-500/80">TP {stock.target.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-900/40 rounded-2xl p-3 border border-white/5">
                    <ShieldAlert size={14} className="text-blue-500/50" />
                    <span className="text-[11px] font-bold text-blue-400/80">SL {stock.stopLoss.toLocaleString()}</span>
                  </div>
                </div>

                {/* AI Analysis Button */}
                <button 
                  onClick={() => analyzeStock(stock)}
                  disabled={loadingAi[stock.id] || stock.currentPrice === null}
                  className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-black transition-all active:scale-[0.98] disabled:opacity-30 overflow-hidden relative group ${
                    isExpanded ? 'bg-slate-700/50 border border-white/10 text-slate-300' : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/20'
                  }`}
                >
                  {loadingAi[stock.id] ? (
                    <div className="flex items-center gap-3 animate-pulse">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>AI 전략 분석 중...</span>
                    </div>
                  ) : (
                    <>
                      <Sparkles size={18} className={isExpanded ? "text-blue-400" : "text-white animate-pulse"} />
                      <span>{isExpanded ? "분석 결과 접기" : "Gemini AI 전략 분석"}</span>
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </>
                  )}
                </button>

                {/* AI Result Accordion */}
                <div className={`transition-all duration-500 overflow-hidden ${isExpanded ? 'max-h-[500px] mt-6 opacity-100' : 'max-h-0 opacity-0'}`}>
                  {stock.error ? (
                    <div className="bg-red-500/10 rounded-[2rem] border border-red-500/20 p-6 flex items-center gap-3 shadow-inner">
                      <AlertCircle size={20} className="text-red-500" />
                      <p className="text-xs font-bold text-red-500">{stock.error}</p>
                    </div>
                  ) : stock.analysis ? (
                    <div className="bg-slate-900/60 rounded-[2rem] border border-blue-500/20 p-6 shadow-inner relative overflow-hidden">
                      <div className="flex gap-3 mb-6">
                        <div className="flex-1 bg-white/5 rounded-2xl p-4 border border-white/5">
                          <p className="text-[10px] text-slate-500 font-black mb-1 uppercase tracking-widest">포지션</p>
                          <span className="text-sm font-black text-blue-400">{String(stock.analysis.position)}</span>
                        </div>
                        <div className="flex-1 bg-white/5 rounded-2xl p-4 border border-white/5 text-center">
                          <p className="text-[10px] text-slate-500 font-black mb-1 uppercase tracking-widest">권장 행동</p>
                          <span className={`text-sm font-black px-3 py-1 rounded-full ${
                            stock.analysis.action === '추매' ? 'bg-red-500/20 text-red-500' : 
                            stock.analysis.action === '손절' ? 'bg-blue-500/20 text-blue-500' : 
                            'bg-slate-700 text-slate-300'
                          }`}>
                            {String(stock.analysis.action)}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed font-medium">
                        {String(stock.analysis.reason)}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Stock Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-slate-900 w-full max-w-md rounded-[2.5rem] border border-white/10 p-8 shadow-2xl animate-in zoom-in-95 duration-500 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-black font-heading text-slate-100">종목 신규 등록</h2>
                <p className="text-xs text-slate-500 mt-1 font-bold">포트폴리오에 새로운 자산을 추가합니다.</p>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)} 
                className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 font-black uppercase ml-1 tracking-widest">종목 코드 (Symbol)</label>
                <input 
                  type="text" 
                  value={newStock.symbol}
                  onChange={e => setNewStock({...newStock, symbol: e.target.value})}
                  className="w-full bg-slate-800/50 border border-white/5 rounded-2xl px-6 py-4 focus:border-blue-500/50 focus:outline-none transition-all font-bold text-slate-100 placeholder:text-slate-700"
                  placeholder="예: 005930.KS"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 font-black uppercase ml-1 tracking-widest">종목명</label>
                <input 
                  type="text" 
                  value={newStock.name}
                  onChange={e => setNewStock({...newStock, name: e.target.value})}
                  className="w-full bg-slate-800/50 border border-white/5 rounded-2xl px-6 py-4 focus:border-blue-500/50 focus:outline-none transition-all font-bold text-slate-100"
                  placeholder="예: 삼성전자"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 font-black uppercase ml-1 tracking-widest">매수 단가</label>
                  <input 
                    type="number" 
                    value={newStock.avgPrice || ''}
                    onChange={e => setNewStock({...newStock, avgPrice: Number(e.target.value)})}
                    className="w-full bg-slate-800/50 border border-white/5 rounded-2xl px-6 py-4 focus:border-blue-500/50 focus:outline-none font-bold"
                    placeholder="75000"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 font-black uppercase ml-1 tracking-widest">보유 수량</label>
                  <input 
                    type="number" 
                    value={newStock.quantity || ''}
                    onChange={e => setNewStock({...newStock, quantity: Number(e.target.value)})}
                    className="w-full bg-slate-800/50 border border-white/5 rounded-2xl px-6 py-4 focus:border-blue-500/50 focus:outline-none font-bold"
                    placeholder="100"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 font-black uppercase ml-1 tracking-widest text-red-500/70">목표가 (TP)</label>
                  <input 
                    type="number" 
                    value={newStock.target || ''}
                    onChange={e => setNewStock({...newStock, target: Number(e.target.value)})}
                    className="w-full bg-slate-800/50 border border-white/5 rounded-2xl px-6 py-4 focus:border-blue-500/50 focus:outline-none font-bold text-red-400"
                    placeholder="90000"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 font-black uppercase ml-1 tracking-widest text-blue-500/70">손절가 (SL)</label>
                  <input 
                    type="number" 
                    value={newStock.stopLoss || ''}
                    onChange={e => setNewStock({...newStock, stopLoss: Number(e.target.value)})}
                    className="w-full bg-slate-800/50 border border-white/5 rounded-2xl px-6 py-4 focus:border-blue-500/50 focus:outline-none font-bold text-blue-400"
                    placeholder="68000"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 font-black uppercase ml-1 tracking-widest">투자 포지션</label>
                <div className="flex gap-2 p-1 bg-slate-950/40 border border-white/5 rounded-2xl">
                  {['단기', '스윙', '장기'].map(t => (
                    <button
                      key={t}
                      onClick={() => setNewStock({...newStock, type: t as any})}
                      className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${
                        newStock.type === t 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                        : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <button 
                onClick={handleAddStock}
                className="w-full py-5 mt-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-blue-500/30 hover:from-blue-500 hover:to-blue-400 transition-all active:scale-[0.98]"
              >
                <Check size={24} />
                <span>포트폴리오에 저장</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Styles for scrollbar */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
