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
  ChevronUp,
  AlertCircle,
  RefreshCcw,
  Trash2,
  LayoutDashboard,
  ChevronDown
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
  currentPrice: number | null; 
  quantity: number;
  type: '단기' | '스윙' | '장기';
  target: number;
  stopLoss: number;
  supplyTrend: string;
  analysis?: AiAnalysisResult;
  error?: string;
  changePercent?: number;
  fetchError?: boolean;
}

const STORAGE_KEY = 'ai_stock_holdings';

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

  const formatCurrentTime = () => {
    const now = new Date();
    return now.toTimeString().split(' ')[0];
  };

  // 1. 데이터 불러오기 (Supabase -> LocalStorage -> State)
  const fetchHoldings = async () => {
    setIsInitialLoading(true);
    let finalStocks: Stock[] = [];

    const localData = localStorage.getItem(STORAGE_KEY);
    if (localData) {
      try {
        finalStocks = JSON.parse(localData);
        setStocks(finalStocks);
      } catch (e) {
        console.error("Local storage parse error:", e);
      }
    }

    try {
      const { data, error } = await supabase
        .from('holdings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
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
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mappedStocks));
        setStocks(mappedStocks);
        finalStocks = mappedStocks;
      }
    } catch (err) {
      console.error('Supabase fetch failed, using local fallback:', err);
    } finally {
      setIsInitialLoading(false);
    }
    return finalStocks;
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
      
      setStocks(prev => {
        const next = prev.map(stock => {
          const liveData = data[stock.symbol];
          if (liveData && liveData.success) {
            return {
              ...stock,
              currentPrice: liveData.price,
              changePercent: liveData.changePercent,
              fetchError: false
            };
          } else if (liveData && liveData.error) {
            return { ...stock, fetchError: true };
          }
          return stock;
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
      setLastSyncTime(formatCurrentTime());
    } catch (error) {
      console.error("Price fetch error:", error);
      setStocks(prev => prev.map(s => ({ ...s, fetchError: true })));
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const loadedStocks = await fetchHoldings();
      if (loadedStocks.length > 0) {
        fetchPrices(loadedStocks);
      }
    };
    init();

    const interval = setInterval(() => fetchPrices(), 60000);
    return () => clearInterval(interval);
  }, []);

  const calculateProfit = (stock: Stock) => {
    if (stock.currentPrice === null || stock.fetchError) return { profit: 0, rate: '0.00', isPositive: true, error: stock.fetchError };
    const profit = (stock.currentPrice - stock.avgPrice) * stock.quantity;
    const rate = ((stock.currentPrice / stock.avgPrice - 1) * 100).toFixed(2);
    return { profit, rate, isPositive: profit >= 0, error: false };
  };

  const handleAddStock = async () => {
    if (!newStock.name || !newStock.avgPrice || !newStock.symbol) {
      alert('필수 정보를 모두 입력해 주세요.');
      return;
    }
    
    let symbol = newStock.symbol.toUpperCase().trim();
    if (!symbol.includes('.')) {
      if (/^\d{6}$/.test(symbol)) symbol += '.KS';
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
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedStocks));
        setIsAddModalOpen(false);
        setNewStock({ name: '', symbol: '', avgPrice: 0, quantity: 0, type: '스윙', target: 0, stopLoss: 0, supplyTrend: '수급 분석 대기 중' });
        
        setTimeout(() => fetchPrices(updatedStocks), 500);
      }
    } catch (err) {
      console.error('Error adding stock to Supabase:', err);
      alert('데이터베이스 저장에 실패했습니다. 형식에 맞춰 다시 시도해 주세요.');
    }
  };

  const handleDeleteStock = async (stockId: string | number) => {
    if (!confirm('정말 이 종목을 삭제하시겠습니까?')) return;

    try {
      const { error } = await supabase
        .from('holdings')
        .delete()
        .eq('id', stockId);

      const updated = stocks.filter(s => s.id !== stockId);
      setStocks(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      if (expandedStockId === stockId) setExpandedStockId(null);

      if (error) console.error('Error deleting stock from Supabase:', error);
    } catch (err) {
      console.error('Error in handleDelete:', err);
    }
  };

  const analyzeStock = async (stock: Stock) => {
    if (stock.currentPrice === null || stock.fetchError) return;
    if (expandedStockId === stock.id) { setExpandedStockId(null); return; }
    if (stock.analysis || stock.error) { setExpandedStockId(stock.id); return; }

    setLoadingAi(prev => ({ ...prev, [stock.id]: true }));
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: stock.name, currentPrice: stock.currentPrice, rate: calculateProfit(stock).rate, supplyTrend: stock.supplyTrend
        })
      });
      const data = await res.json();
      setStocks(prev => prev.map(s => s.id === stock.id ? { ...s, analysis: data.error ? undefined : data, error: data.error } : s));
      setExpandedStockId(stock.id);
    } catch (err) {
      setStocks(prev => prev.map(s => s.id === stock.id ? { ...s, error: "일시적인 오류 발생" } : s));
      setExpandedStockId(stock.id);
    } finally {
      setLoadingAi(prev => ({ ...prev, [stock.id]: false }));
    }
  };

  const totalBuyAmount = stocks.reduce((acc, s) => acc + s.avgPrice * s.quantity, 0);
  const totalCurrentAmount = stocks.reduce((acc, s) => acc + (s.currentPrice || s.avgPrice) * s.quantity, 0);
  const totalProfit = totalCurrentAmount - totalBuyAmount;
  const totalProfitRate = totalBuyAmount > 0 ? (totalProfit / totalBuyAmount * 100) : 0;
  const isTotalPositive = totalProfit >= 0;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-36 font-sans overflow-x-hidden">
      {/* Header */}
      <div className="p-8 pb-4">
        <div className="flex justify-between items-center mb-6">
          <div className="flex flex-col">
            <h1 className="text-2xl font-black bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent italic tracking-tighter">AI STOCK</h1>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Live Sync Status</span>
              {lastSyncTime && (
                <span className="text-[10px] text-blue-500/80 font-black animate-pulse">{lastSyncTime}</span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => fetchPrices()}
              disabled={isRefreshing}
              className="w-10 h-10 rounded-xl bg-slate-800 border border-white/5 flex items-center justify-center text-slate-400 hover:text-blue-400 transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCcw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => setIsAddModalOpen(true)} className="w-10 h-10 rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-500/20 flex items-center justify-center hover:bg-blue-600 transition-all active:scale-90"><Plus size={20} /></button>
          </div>
        </div>

        {/* Total Summary Widget (Premium Glassmorphism) */}
        <div className="relative overflow-hidden rounded-[2.5rem] p-1 bg-gradient-to-br from-blue-500/20 via-indigo-500/10 to-transparent border border-white/10 shadow-2xl group">
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-40 h-40 bg-blue-500/10 rounded-full blur-[80px]"></div>
          <div className="bg-slate-900/60 backdrop-blur-3xl rounded-[2.3rem] p-7 pt-8 relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Total Portfolio Value</p>
                <h2 className="text-3xl font-black text-slate-100 tracking-tight">
                  {(totalCurrentAmount).toLocaleString()}원
                </h2>
              </div>
              <div className={`px-4 py-2 rounded-2xl flex items-center gap-1.5 font-black text-sm border ${
                isTotalPositive 
                ? 'bg-red-500/10 text-red-500 border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]' 
                : 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]'
              }`}>
                {isTotalPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {isTotalPositive ? '+' : ''}{totalProfitRate.toFixed(2)}%
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-white/5 flex justify-between gap-6">
              <div className="flex-1">
                <p className="text-[10px] text-slate-500 mb-1 font-bold">총 수익금</p>
                <p className={`text-lg font-black tracking-tight ${isTotalPositive ? 'text-red-500' : 'text-blue-400'}`}>
                  {isTotalPositive ? '+' : ''}{totalProfit.toLocaleString()}
                </p>
              </div>
              <div className="flex-1 text-right">
                <p className="text-[10px] text-slate-500 mb-1 font-bold">총 매수금액</p>
                <p className="text-lg font-black text-slate-300">{(totalBuyAmount / 10000).toLocaleString()}만</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stock List Section */}
      <div className="px-8 mt-4 space-y-6">
        <div className="flex justify-between items-center px-1">
          <h3 className="font-black text-lg text-slate-100 tracking-tight flex items-center gap-2">
            <LayoutDashboard size={18} className="text-blue-500" />
            My Holdings
            <span className="text-xs text-slate-600 font-bold ml-1">{stocks.length}</span>
          </h3>
          <button className="text-[10px] font-black text-slate-500 hover:text-slate-300 uppercase tracking-widest transition-colors">Sort By Net Profit</button>
        </div>

        {isInitialLoading && stocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 font-black text-xs uppercase tracking-widest">Connecting to Database...</p>
          </div>
        ) : stocks.length === 0 ? (
          /* Empty State (Premium Design) */
          <div className="bg-slate-800/20 border-2 border-dashed border-white/5 rounded-[3rem] p-12 py-16 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-700">
            <div className="w-20 h-20 rounded-[2rem] bg-slate-800/50 flex items-center justify-center mb-6 shadow-inner">
              <LayoutDashboard size={40} className="text-slate-700" />
            </div>
            <h4 className="text-xl font-bold text-slate-200 mb-3">포트폴리오가 비어있습니다.</h4>
            <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-[200px] mb-8">
              첫 종목을 추가하고 AI의 정교한 관리를 지금 바로 시작해 보세요!
            </p>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="px-8 py-4 bg-blue-500 text-white rounded-[1.5rem] font-black text-sm flex items-center gap-2 shadow-xl shadow-blue-500/20 hover:scale-105 transition-all active:scale-95"
            >
              <Plus size={18} />
              새로운 종목 추가하기
            </button>
          </div>
        ) : (
          stocks.map(stock => {
            const { profit, rate, isPositive, error: hasFetchError } = calculateProfit(stock);
            const isExpanded = expandedStockId === stock.id;
            const badgeColors = { '장기': 'bg-blue-500/10 text-blue-400 border-blue-500/20', '스윙': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', '단기': 'bg-orange-500/10 text-orange-400 border-orange-500/20' };

            return (
              <div key={stock.id} className="bg-slate-800/40 border border-white/5 rounded-[2.5rem] p-6 hover:bg-slate-800/60 transition-all duration-300 shadow-xl relative overflow-hidden group/card text-slate-100">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-xl font-black">{stock.name}</h4>
                      <span className={`text-[10px] px-3 py-1 rounded-full border font-black tracking-tighter ${badgeColors[stock.type]}`}>{stock.type}</span>
                    </div>
                    <p className="text-xs text-slate-500 font-bold tracking-tight">{stock.symbol} · {stock.quantity}주</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteStock(stock.id); }} className="text-slate-700 hover:text-red-500 transition-colors p-2 -mt-2 -mr-2 opacity-0 group-hover/card:opacity-100"><Trash2 size={16} /></button>
                    <div className="text-right mt-1">
                      {stock.currentPrice === null && !stock.fetchError ? (
                        <div className="w-20 h-6 bg-white/5 animate-pulse rounded-lg"></div>
                      ) : hasFetchError ? (
                        <div className="text-red-500 font-black text-xs bg-red-500/10 px-2 py-1 rounded-lg border border-red-500/20">데이터 오류</div>
                      ) : (
                        <>
                          <div className={`flex items-center justify-end gap-1 font-black text-xl ${isPositive ? 'text-red-500' : 'text-blue-400'}`}>
                            {isPositive ? <TrendingUp size={20} /> : <TrendingDown size={20} />} {rate}%
                          </div>
                          <p className={`text-xs font-bold ${isPositive ? 'text-red-500/70' : 'text-blue-400/70'}`}>{isPositive ? '+' : ''}{profit.toLocaleString()}원</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-900/40 rounded-2xl p-4 border border-white/5">
                    <span className="text-[10px] text-slate-600 font-black uppercase mb-1 block">매수 평단</span>
                    <span className="text-sm font-black text-slate-300 tracking-tight">{stock.avgPrice.toLocaleString()}원</span>
                  </div>
                  <div className="bg-slate-900/40 rounded-2xl p-4 border border-white/5">
                    <span className="text-[10px] text-slate-600 font-black uppercase mb-1 block tracking-widest">현재가</span>
                    {stock.currentPrice === null && !stock.fetchError ? (
                      <span className="text-xs text-slate-500 font-black animate-pulse">조회 중...</span>
                    ) : stock.fetchError ? (
                      <span className="text-xs text-red-500/70 font-black italic">오류</span>
                    ) : (
                      <span className={`text-sm font-black ${stock.changePercent && stock.changePercent >= 0 ? 'text-red-500' : 'text-blue-400'}`}>{stock.currentPrice?.toLocaleString()}원</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-900/40 rounded-2xl p-3 border border-white/5 flex items-center gap-2">
                    <Target size={14} className="text-red-500/50" /><span className="text-[11px] font-bold text-red-500/80">TP {stock.target.toLocaleString()}</span>
                  </div>
                  <div className="bg-slate-900/40 rounded-2xl p-3 border border-white/5 flex items-center gap-2">
                    <ShieldAlert size={14} className="text-blue-500/50" /><span className="text-[11px] font-bold text-blue-400/80">SL {stock.stopLoss.toLocaleString()}</span>
                  </div>
                </div>

                <button 
                  onClick={() => analyzeStock(stock)}
                  disabled={loadingAi[stock.id] || stock.currentPrice === null || stock.fetchError}
                  className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-black transition-all active:scale-[0.98] disabled:opacity-30 ${isExpanded ? 'bg-slate-700/50 border border-white/10 text-slate-300' : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg'}`}
                >
                  {loadingAi[stock.id] ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><Sparkles size={18} /><span>{isExpanded ? "분석 결과 접기" : "Gemini AI 전략 분석"}</span></>}
                </button>

                <div className={`transition-all duration-500 overflow-hidden ${isExpanded ? 'max-h-[500px] mt-6 opacity-100' : 'max-h-0 opacity-0'}`}>
                  {stock.error ? <div className="bg-red-500/10 rounded-[2rem] border border-red-500/20 p-6 flex items-center gap-3 text-red-500 text-xs font-bold"><AlertCircle size={20} />{stock.error}</div> :
                  stock.analysis ? (
                    <div className="bg-slate-900/60 rounded-[2rem] border border-blue-500/20 p-6 shadow-inner text-slate-100">
                      <div className="flex gap-3 mb-6">
                        <div className="flex-1 bg-white/5 rounded-2xl p-4 border border-white/5">
                          <p className="text-[10px] text-slate-500 font-black mb-1 uppercase">포지션</p>
                          <span className="text-sm font-black text-blue-400">{String(stock.analysis.position)}</span>
                        </div>
                        <div className="flex-1 bg-white/5 rounded-2xl p-4 border border-white/5 text-center">
                          <p className="text-[10px] text-slate-500 font-black mb-1 uppercase">권장 행동</p>
                          <span className={`text-sm font-black px-3 py-1 rounded-full ${stock.analysis.action === '추매' ? 'bg-red-500/20 text-red-500' : stock.analysis.action === '손절' ? 'bg-blue-500/20 text-blue-500' : 'bg-slate-700 font-black'}`}>{String(stock.analysis.action)}</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed font-medium">{String(stock.analysis.reason)}</p>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-slate-900 w-full max-w-md rounded-[2.5rem] border border-white/10 p-8 shadow-2xl animate-in zoom-in-95 duration-500 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <div><h2 className="text-2xl font-black text-slate-100 tracking-tight">종목 신규 등록</h2></div>
              <button onClick={() => setIsAddModalOpen(false)} className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-6">
              <div className="space-y-2"><label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">심볼 (예: 005930.KS)</label><input type="text" value={newStock.symbol} onChange={e => setNewStock({...newStock, symbol: e.target.value})} className="w-full bg-slate-800 border border-white/5 rounded-2xl px-6 py-4 font-bold text-slate-100 outline-none focus:border-blue-500" placeholder="005930.KS" /></div>
              <div className="space-y-2"><label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">종목명</label><input type="text" value={newStock.name} onChange={e => setNewStock({...newStock, name: e.target.value})} className="w-full bg-slate-800 border border-white/5 rounded-2xl px-6 py-4 font-bold text-slate-100 outline-none focus:border-blue-500" placeholder="삼성전자" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">매수 단가</label><input type="number" value={newStock.avgPrice || ''} onChange={e => setNewStock({...newStock, avgPrice: Number(e.target.value)})} className="w-full bg-slate-800 border-white/5 rounded-2xl px-6 py-4 font-bold outline-none" placeholder="75000" /></div>
                <div className="space-y-2"><label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">보유 수량</label><input type="number" value={newStock.quantity || ''} onChange={e => setNewStock({...newStock, quantity: Number(e.target.value)})} className="w-full bg-slate-800 border-white/5 rounded-2xl px-6 py-4 font-bold outline-none" placeholder="100" /></div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">투자 포지션</label>
                <div className="flex gap-2 p-1 bg-slate-950/40 border-white/5 rounded-2xl">
                  {['단기', '스윙', '장기'].map(t => (<button key={t} onClick={() => setNewStock({...newStock, type: t as any})} className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${newStock.type === t ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>{t}</button>))}
                </div>
              </div>
              <button onClick={handleAddStock} className="w-full py-5 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-black text-lg flex items-center justify-center gap-3 shadow-xl active:scale-[0.98] mt-4"><Check size={24} /><span>포트폴리오에 저장</span></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
