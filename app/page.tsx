"use client";

import React, { useState, useEffect } from 'react';
import { 
  Plus, X, RefreshCcw, Bell, Trash2, 
  TrendingUp, TrendingDown, Star, Wallet, Eye, BarChart3, Bot, Sparkles, Loader2, Landmark
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSession } from "next-auth/react";
import Link from 'next/link';

// --- Interfaces ---
interface Stock {
  id: string | number;
  symbol: string;
  name: string;
  avgPrice: number;
  currentPrice: number | null; 
  quantity: number;
  type: string;
  target: number;
  stopLoss: number;
  changePercent?: number;
  updatedAt?: string;
}

interface InterestStock {
  id: string | number;
  name: string;
  symbol: string;
  price: number | null;
  change: number | null;
  alertEnabled: boolean;
  updatedAt?: string;
}

interface MarketIndex {
  name: string;
  symbol: string;
  price: number;
  changePercent: number;
}

export default function PortfolioPage() {
  const { data: session } = useSession();
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [interestStocks, setInterestStocks] = useState<InterestStock[]>([]);
  const [marketIndices, setMarketIndices] = useState<MarketIndex[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMarketLoading, setIsMarketLoading] = useState(true);
  
  // Modals
  const [isAddInterestModalOpen, setIsAddInterestModalOpen] = useState(false);
  const [isAddHoldingModalOpen, setIsAddHoldingModalOpen] = useState(false);

  // AI Analysis states
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [selectedStockForAi, setSelectedStockForAi] = useState<Stock | null>(null);

  // Form states
  const [newStock, setNewStock] = useState<Partial<Stock>>({
    name: '', symbol: '', avgPrice: 0, quantity: 0, type: '스윙', target: 0, stopLoss: 0
  });

  const fetchMarketIndices = async (silent = false) => {
    if (!silent) setIsMarketLoading(true);
    try {
      const res = await fetch('/api/market', { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data)) setMarketIndices(data);
    } catch (error) { console.error(error); }
    finally { if (!silent) setIsMarketLoading(false); }
  };

  const fetchHoldings = async () => {
    try {
      const { data, error } = await supabase.from('holdings').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        const mapped = data.map(item => ({
          id: item.id, symbol: item.symbol, name: item.stock_name,
          avgPrice: Number(item.avg_buy_price), currentPrice: null, quantity: Number(item.quantity),
          type: item.position_type as string, target: Number(item.target_price), stopLoss: Number(item.stop_loss)
        }));
        setStocks(mapped);
        if (mapped.length > 0 && !selectedStockForAi) {
            setSelectedStockForAi(mapped[0]); 
        }
      }
    } catch (err) {}
  };

  const fetchInterests = async () => {
    try {
      const { data, error } = await supabase.from('alerts').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        setInterestStocks(data.map(item => ({
          id: item.id, name: item.stock_name, symbol: item.symbol, price: null, change: null, alertEnabled: item.alert_enabled
        })));
      }
    } catch (err) {}
  };

  const fetchPrices = async (silent = false) => {
    const symbols = Array.from(new Set([...stocks.map(s => s.symbol), ...interestStocks.map(s => s.symbol)])).filter(Boolean);
    if (symbols.length === 0) return;
    if (!silent) setIsRefreshing(true);
    try {
      const res = await fetch('/api/stock', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols }), 
        cache: 'no-store' 
      });
      const data = await res.json();
      setStocks(prev => prev.map(s => data[s.symbol] ? { ...s, currentPrice: data[s.symbol].price, changePercent: data[s.symbol].changePercent, updatedAt: data[s.symbol].updatedAt } : s));
      setInterestStocks(prev => prev.map(s => data[s.symbol] ? { ...s, price: data[s.symbol].price, change: data[s.symbol].changePercent, updatedAt: data[s.symbol].updatedAt } : s));
    } catch (error) {}
    finally { setIsRefreshing(false); }
  };

  const runAiAnalysis = async (stock: Stock) => {
    setIsAiLoading(true);
    setAiAnalysis(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: stock.symbol,
          name: stock.name,
          price: stock.currentPrice || stock.avgPrice,
          changePercent: stock.changePercent || 0,
          institutional: 1500000, 
          foreigner: -500000     
        }),
        cache: 'no-store'
      });
      const data = await res.json();
      if (data.analysis) {
        setAiAnalysis(data.analysis);
      } else {
        setAiAnalysis(data.error || "현재 분석 리포트를 생성할 수 없습니다.");
      }
    } catch (error) {
      setAiAnalysis("네트워크 문제로 AI 분석에 실패했습니다.");
    } finally {
      setIsAiLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketIndices();
    fetchHoldings();
    fetchInterests();
    const interval = setInterval(() => {
      fetchMarketIndices(true);
      fetchPrices(true);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (stocks.length > 0 || interestStocks.length > 0) fetchPrices(true);
  }, [stocks.length, interestStocks.length]);

  useEffect(() => {
    if (selectedStockForAi && !aiAnalysis && !isAiLoading) {
        runAiAnalysis(selectedStockForAi);
    }
  }, [selectedStockForAi]);

  const removeInterest = async (id: string | number) => {
    if (!confirm('관심 종목에서 삭제하시겠습니까?')) return;
    try { await supabase.from('alerts').delete().eq('id', id); fetchInterests(); } catch (err) {}
  };

  const removeHolding = async (id: string | number) => {
    if (!confirm('보유 종목에서 삭제하시겠습니까?')) return;
    try { await supabase.from('holdings').delete().eq('id', id); fetchHoldings(); } catch (err) {}
  };

  const handleAddHolding = async () => {
    if (!newStock.name || !newStock.symbol || !newStock.avgPrice || !newStock.quantity) {
      alert('필수 정보를 모두 입력해 주세요.');
      return;
    }
    
    let sym = newStock.symbol.toUpperCase().trim();
    if (!sym.includes('.') && /^\d{6}$/.test(sym)) {
        sym += (sym.startsWith('0') || sym.startsWith('1') || sym.startsWith('2')) ? '.KS' : '.KQ';
    }

    try {
      const { error } = await supabase.from('holdings').insert([{
        stock_name: newStock.name,
        symbol: sym,
        avg_buy_price: Number(newStock.avgPrice),
        quantity: Number(newStock.quantity),
        position_type: newStock.type || '스윙',
        target_price: Number(newStock.target || 0),
        stop_loss: Number(newStock.stopLoss || 0)
      }]);
      
      if (error) throw error;
      
      fetchHoldings();
      setIsAddHoldingModalOpen(false);
      setNewStock({ name: '', symbol: '', avgPrice: 0, quantity: 0, type: '스윙', target: 0, stopLoss: 0 });
      alert('포트폴리오에 추가되었습니다.');
    } catch (err) {
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  const totalCurrentAmount = stocks.reduce((acc, s) => acc + (s.currentPrice || s.avgPrice) * s.quantity, 0);
  const totalBuyAmount = stocks.reduce((acc, s) => acc + (s.avgPrice * s.quantity), 0);
  const totalProfit = totalCurrentAmount - totalBuyAmount;
  const totalRate = totalBuyAmount > 0 ? ((totalCurrentAmount / totalBuyAmount - 1) * 100).toFixed(2) : '0.00';

  return (
    <div className="min-h-screen bg-slate-50 pb-40">
      {/* Header - Apple Finance Style */}
      <header className="px-6 py-8 bg-white border-b border-slate-200 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center">
             <BarChart3 size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Assitant</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI Financial Intelligence</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsAddHoldingModalOpen(true)}
            className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all flex items-center gap-2 shadow-sm"
          >
            <Plus size={18} />
            자산 추가
          </button>
          <button 
            onClick={() => { fetchMarketIndices(); fetchPrices(); if(selectedStockForAi) runAiAnalysis(selectedStockForAi); }} 
            className="p-3.5 bg-slate-100 rounded-2xl text-slate-600 hover:bg-slate-200 transition-all"
          >
            <RefreshCcw size={22} className={isRefreshing || isMarketLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 mt-12 space-y-16">
        
        {/* Market Indices - Rectangular Cards */}
        <section className="space-y-6">
           <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] px-1">Global Market Index</h3>
           <div className="grid grid-cols-2 gap-4">
              {marketIndices.map(market => {
                 const isUp = market.changePercent >= 0;
                 return (
                    <div key={market.symbol} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3 group">
                       <span className="text-xs font-bold text-slate-400 group-hover:text-slate-900 transition-colors uppercase tracking-tight">{market.name}</span>
                       <div className="flex justify-between items-end">
                          <h2 className={`text-2xl font-bold tracking-tighter ${isUp ? 'text-red-600' : 'text-blue-600'}`}>
                            {market.price.toLocaleString()}
                          </h2>
                          <span className={`text-xs font-bold px-2 py-1 rounded-lg ${isUp ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                             {isUp ? '+' : ''}{market.changePercent.toFixed(1)}%
                          </span>
                       </div>
                    </div>
                 );
              })}
           </div>
        </section>

        {/* AI Strategy Report - Large Modern Card */}
        <section className="space-y-6">
           <div className="flex items-center gap-3 px-1">
              <Sparkles size={20} className="text-slate-900" />
              <h3 className="text-xl font-bold text-slate-900 leading-none">AI 인텔리전스 전략</h3>
           </div>
           
           <div className="bg-slate-900 rounded-[2rem] p-10 text-white relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-slate-800 rounded-full blur-[100px] -z-0 opacity-50" />
              <div className="relative z-10">
                 {isAiLoading ? (
                    <div className="py-6 flex flex-col items-center gap-6">
                       <Loader2 className="animate-spin text-white opacity-50" size={40} />
                       <p className="text-sm font-bold opacity-50 tracking-widest uppercase">Expert Strategy Analysis...</p>
                    </div>
                 ) : aiAnalysis ? (
                    <div className="animate-in fade-in duration-1000">
                       <div className="flex items-center gap-3 mb-8">
                          <div className="px-3 py-1 bg-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest">{selectedStockForAi?.name} Report</div>
                       </div>
                       <p className="text-lg font-bold leading-relaxed text-slate-200 whitespace-pre-line font-serif italic">
                         {aiAnalysis}
                       </p>
                    </div>
                 ) : (
                    <div className="text-center py-10 opacity-30">
                       <Bot size={48} className="mx-auto mb-4" />
                       <p className="text-sm font-bold">분석할 종목을 선택하시면 AI 전략이 생성됩니다.</p>
                    </div>
                 )}
              </div>
           </div>
        </section>

        {/* Portfolio - Wide Rectangular Cards */}
        <section className="space-y-6">
          <div className="flex justify-between items-center px-1">
             <h3 className="text-xl font-bold text-slate-900">내 보유 자산</h3>
             <span className="text-2xl font-bold text-slate-900 tabular-nums">{stocks.length}</span>
          </div>
          
          <div className="space-y-4">
            {stocks.map(stock => {
              const profitRate = stock.currentPrice ? ((stock.currentPrice / stock.avgPrice - 1) * 100).toFixed(2) : '0.00';
              const isProfit = parseFloat(profitRate) >= 0;
              const isSelected = selectedStockForAi?.id === stock.id;
              
              return (
                <div 
                  key={stock.id} 
                  onClick={() => { setSelectedStockForAi(stock); runAiAnalysis(stock); }}
                  className={`w-full flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border cursor-pointer transition-all ${isSelected ? 'border-slate-900 ring-4 ring-slate-100' : 'border-slate-100 hover:border-slate-200'}`}
                >
                  <div className="flex flex-col gap-1 min-w-0">
                    <h4 className="text-xl font-bold text-slate-900 truncate uppercase">{stock.name}</h4>
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stock.symbol}</span>
                       <span className="text-[10px] font-bold text-slate-300">· {stock.quantity}주</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-8">
                    <div className="text-right flex flex-col items-end">
                       <p className="text-2xl font-bold text-slate-900 tracking-tighter leading-none mb-1.5">
                         {(stock.currentPrice || stock.avgPrice).toLocaleString()}
                       </p>
                       <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${isProfit ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                         {isProfit ? '+' : ''}{profitRate}%
                       </span>
                    </div>
                    <button 
                       onClick={(e) => { e.stopPropagation(); removeHolding(stock.id); }}
                       className="p-3 bg-slate-50 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    >
                       <X size={20} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Watchlist - Wide Rectangular Cards */}
        <section className="space-y-6 pb-20">
          <div className="flex justify-between items-center px-1">
             <h3 className="text-xl font-bold text-slate-900">스마트 관심 종목</h3>
             <Link href="/watchlist" className="p-3 bg-white rounded-2xl border border-slate-200 text-slate-400 hover:text-slate-900 transition-all shadow-sm">
                <ArrowRight size={24} />
             </Link>
          </div>
          
          <div className="space-y-4">
            {interestStocks.slice(0, 5).map(stock => {
              const isUp = (stock.change || 0) >= 0;
              return (
                <div key={stock.id} className="w-full flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100 group hover:border-slate-900 transition-all">
                  <div className="flex flex-col gap-1 min-w-0">
                    <h4 className="text-xl font-bold text-slate-900 truncate uppercase">{stock.name}</h4>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stock.symbol}</span>
                  </div>
                  
                  <div className="flex items-center gap-8">
                    <div className="text-right flex flex-col items-end">
                       <p className="text-2xl font-bold text-slate-900 tracking-tighter leading-none mb-1.5">
                         {(stock.price?.toLocaleString() || '--')}
                       </p>
                       <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${isUp ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                         {isUp ? '+' : ''}{stock.change?.toFixed(2)}%
                       </span>
                    </div>
                    <button 
                       onClick={() => removeInterest(stock.id)}
                       className="p-3 bg-slate-50 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    >
                       <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Modals - Rectangular Design (No rounded-full) */}
      {isAddHoldingModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm p-6 flex items-center justify-center">
           <div className="bg-white w-full max-w-md rounded-[2rem] p-10 space-y-10 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center">
                 <h2 className="text-3xl font-bold text-slate-900 tracking-tight">자산 추가</h2>
                 <button onClick={() => setIsAddHoldingModalOpen(false)} className="p-3 bg-slate-100 rounded-2xl text-slate-400 hover:text-slate-900 transition-all">
                    <X size={24} />
                 </button>
              </div>
              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">종목명</label>
                    <input 
                      type="text" 
                      className="w-full h-16 bg-slate-50 rounded-2xl px-6 font-bold text-lg outline-none border-2 border-transparent focus:border-slate-900 transition-all"
                      placeholder="예: 삼성전자"
                      value={newStock.name}
                      onChange={e => setNewStock({...newStock, name: e.target.value})}
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">티커 코드</label>
                    <input 
                      type="text" 
                      className="w-full h-16 bg-slate-50 rounded-2xl px-6 font-bold text-lg outline-none border-2 border-transparent focus:border-slate-900 transition-all uppercase"
                      placeholder="예: 005930"
                      value={newStock.symbol}
                      onChange={e => setNewStock({...newStock, symbol: e.target.value})}
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">평단가</label>
                       <input 
                         type="number" 
                         className="w-full h-16 bg-slate-50 rounded-2xl px-6 font-bold text-lg outline-none border-2 border-transparent focus:border-slate-900 transition-all"
                         value={newStock.avgPrice || ''}
                         onChange={e => setNewStock({...newStock, avgPrice: Number(e.target.value)})}
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">수량</label>
                       <input 
                         type="number" 
                         className="w-full h-16 bg-slate-50 rounded-2xl px-6 font-bold text-lg outline-none border-2 border-transparent focus:border-slate-900 transition-all"
                         value={newStock.quantity || ''}
                         onChange={e => setNewStock({...newStock, quantity: Number(e.target.value)})}
                       />
                    </div>
                 </div>
              </div>
              <button 
                onClick={handleAddHolding}
                className="w-full h-18 bg-slate-900 text-white rounded-2xl font-bold text-xl shadow-lg hover:bg-slate-800 active:scale-95 transition-all"
              >
                포트폴리오 등록
              </button>
           </div>
        </div>
      )}
    </div>
  );
}
