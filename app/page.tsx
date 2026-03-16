"use client";

import React, { useState, useEffect } from 'react';
import { 
  Plus, X, RefreshCcw, Bell, Trash2, BellRing, 
  ArrowRight, TrendingUp, TrendingDown, Star, Wallet, Eye, BarChart3, Bot, Sparkles, Loader2 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSession } from "next-auth/react";

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
  updatedAt?: string;
}

export default function PortfolioPage() {
  const { data: session } = useSession();
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [interestStocks, setInterestStocks] = useState<InterestStock[]>([]);
  const [marketIndices, setMarketIndices] = useState<MarketIndex[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMarketLoading, setIsMarketLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // AI Analysis states
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [selectedStockForAi, setSelectedStockForAi] = useState<Stock | null>(null);

  const [newStock, setNewStock] = useState<Partial<Stock>>({
    name: '', symbol: '', avgPrice: 0, quantity: 0, type: '스윙', target: 0, stopLoss: 0
  });

  const requestNotificationPermission = async () => {
    try {
      if (!('Notification' in window)) return;
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        alert('실시간 주가 및 수급 알림이 활성화되었습니다.');
      }
    } catch (err) { console.error(err); }
  };

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
            setSelectedStockForAi(mapped[0]); // 기본적으로 첫 번째 종목 분석
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
      const res = await fetch('/api/stock', { method: 'POST', body: JSON.stringify({ symbols }), cache: 'no-store' });
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
      // 수급 데이터도 함께 가져와야 하지만, 현재는 주가 및 등락률 위주로 전달 (수급은 API Mock 데이터 처리 가능)
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: stock.symbol,
          name: stock.name,
          price: stock.currentPrice || stock.avgPrice,
          changePercent: stock.changePercent || 0,
          institutional: 1500000, // 임시 목업 수급 데이터
          foreigner: -500000     // 임시 목업 수급 데이터
        }),
      });
      const data = await res.json();
      setAiAnalysis(data.analysis);
    } catch (error) {
      setAiAnalysis("AI 분석을 가져오는 데 실패했습니다.");
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

  const totalCurrentAmount = stocks.reduce((acc, s) => acc + (s.currentPrice || s.avgPrice) * s.quantity, 0);
  const totalBuyAmount = stocks.reduce((acc, s) => acc + (s.avgPrice * s.quantity), 0);
  const totalProfit = totalCurrentAmount - totalBuyAmount;
  const totalRate = totalBuyAmount > 0 ? ((totalCurrentAmount / totalBuyAmount - 1) * 100).toFixed(2) : '0.00';

  return (
    <div className="min-h-screen bg-gray-50/50 pb-40">
      {/* Header */}
      <header className="px-6 pt-12 pb-6 bg-white sticky top-0 z-50 border-b border-gray-100/50 backdrop-blur-2xl bg-white/80 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#3182f6] rounded-2xl flex items-center justify-center shadow-xl shadow-blue-100 transform hover:rotate-6 transition-transform">
             <BarChart3 size={30} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-[#191f28] leading-none">AI Stock</h1>
            <div className="flex items-center gap-1.5 mt-1.5">
               <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
               <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Live Engine Active</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => { fetchMarketIndices(); fetchPrices(); if(selectedStockForAi) runAiAnalysis(selectedStockForAi); }} 
            className="p-3.5 bg-gray-100 rounded-2xl text-gray-500 hover:text-[#3182f6] hover:bg-blue-50 transition-all active:scale-90"
          >
            <RefreshCcw size={24} className={isRefreshing || isMarketLoading ? 'animate-spin' : ''} />
          </button>
          {session?.user?.image && (
            <img src={session.user.image} alt="User" className="w-12 h-12 rounded-2xl border-4 border-white shadow-xl transition-transform hover:scale-105" />
          )}
        </div>
      </header>

      <div className="max-w-xl mx-auto px-6 mt-10 space-y-14">
        
        {/* Market Index Scroller */}
        <section className="space-y-5">
           <div className="flex justify-between items-end px-2">
              <h3 className="text-lg font-black text-[#191f28] flex items-center gap-2">
                 시장 지수
                 <Sparkles size={16} className="text-[#3182f6]" />
              </h3>
              <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">Update Interval 15s</span>
           </div>
           <div className="flex gap-5 overflow-x-auto no-scrollbar pb-4 snap-x pl-2">
              {marketIndices.map(market => {
                 const isUp = market.changePercent >= 0;
                 return (
                    <div key={market.symbol} className="min-w-[200px] bg-white p-8 rounded-[3rem] border border-gray-100 shadow-[0_10px_30px_rgba(0,0,0,0.02)] flex flex-col gap-4 snap-start active:scale-95 transition-all">
                       <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">{market.name}</span>
                       <h2 className={`text-4xl font-black tracking-tighter ${isUp ? 'text-[#EF4444]' : 'text-[#3B82F6]'}`}>
                          {market.price.toLocaleString()}
                       </h2>
                       <div className={`px-3 py-1.5 rounded-xl self-start text-[11px] font-black flex items-center gap-1.5 ${isUp ? 'bg-red-50 text-[#EF4444]' : 'bg-blue-50 text-[#3B82F6]'}`}>
                          {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                          {Math.abs(market.changePercent).toFixed(1)}%
                       </div>
                    </div>
                 );
              })}
           </div>
        </section>

        {/* 🤖 AI Strategy Report Card */}
        <section className="space-y-5">
           <div className="px-2 flex items-center gap-2">
              <Bot size={22} className="text-[#3182f6]" />
              <h3 className="text-xl font-black text-[#191f28]">AI 실시간 전략 리포트</h3>
           </div>
           
           <div className="bg-white rounded-[3rem] p-9 border border-blue-100 shadow-[0_20px_60px_rgba(49,130,246,0.1)] relative overflow-hidden min-h-[220px]">
              <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                 <Sparkles size={100} className="text-[#3182f6]" />
              </div>
              
              {isAiLoading ? (
                 <div className="space-y-6 animate-pulse">
                    <div className="flex items-center gap-3">
                       <div className="w-16 h-8 bg-blue-50 rounded-xl" />
                       <div className="w-32 h-6 bg-gray-50 rounded-xl" />
                    </div>
                    <div className="space-y-3">
                       <div className="w-full h-4 bg-gray-50 rounded-full" />
                       <div className="w-5/6 h-4 bg-gray-50 rounded-full" />
                       <div className="w-4/6 h-4 bg-gray-50 rounded-full" />
                    </div>
                    <div className="pt-4 flex justify-center">
                       <Loader2 className="text-[#3182f6] animate-spin" size={24} />
                    </div>
                 </div>
              ) : aiAnalysis ? (
                 <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    <div className="flex items-center gap-3 mb-6">
                       <span className="px-3 py-1.5 bg-blue-600 text-white text-[10px] font-black rounded-lg uppercase tracking-widest">Analysis</span>
                       <h4 className="text-lg font-black text-[#191f28]">{selectedStockForAi?.name} 전략</h4>
                    </div>
                    <div className="prose prose-sm max-w-none text-gray-500 font-bold leading-relaxed whitespace-pre-line">
                       {aiAnalysis}
                    </div>
                    <div className="mt-8 pt-6 border-t border-gray-50 flex justify-between items-center">
                       <span className="text-[10px] font-black text-gray-300 uppercase">Powered by Gemini AI Engine</span>
                       <button 
                         onClick={() => selectedStockForAi && runAiAnalysis(selectedStockForAi)}
                         className="text-[10px] font-black text-[#3182f6] flex items-center gap-1 underline underline-offset-4"
                       >
                          새로 고침
                       </button>
                    </div>
                 </div>
              ) : (
                 <div className="text-center py-10 opacity-30">
                    <Bot size={48} className="mx-auto mb-4" />
                    <p className="font-bold">분석할 종목을 아래에서 선택하세요.</p>
                 </div>
              )}
           </div>
        </section>

        {/* Portfolio Summary Card */}
        <section className="bg-white p-10 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.03)] border border-gray-100 group">
          <div className="flex items-center gap-3 mb-4">
            <Wallet className="text-[#3182f6]" size={18} strokeWidth={3} />
            <p className="text-xs font-black text-gray-400 uppercase tracking-[0.3em]">Consolidated Portfolio</p>
          </div>
          <div className="flex items-baseline gap-2 mb-12">
            <h3 className="text-6xl font-black text-[#191f28] tracking-tighter">{totalCurrentAmount.toLocaleString()}</h3>
            <span className="text-2xl font-black text-gray-400">{'KRW'}</span>
          </div>
          
          <div className="grid grid-cols-2 gap-5 mb-12">
            <div className="bg-gray-50/50 p-8 rounded-[2rem] flex flex-col gap-1 transition-transform group-hover:-translate-y-1">
              <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">수익 현황</span>
              <p className={`text-2xl font-black ${totalProfit >= 0 ? 'text-[#EF4444]' : 'text-[#3B82F6]'}`}>
                {totalProfit >= 0 ? '+' : ''}{totalProfit.toLocaleString()}원
              </p>
            </div>
            <div className="bg-gray-50/50 p-8 rounded-[2rem] flex flex-col gap-1 transition-transform group-hover:-translate-y-1 delay-75">
              <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">누적 수익률</span>
              <p className={`text-2xl font-black ${parseFloat(totalRate) >= 0 ? 'text-[#EF4444]' : 'text-[#3B82F6]'}`}>
                {parseFloat(totalRate) >= 0 ? '+' : ''}{totalRate}%
              </p>
            </div>
          </div>

          <button 
             onClick={requestNotificationPermission}
             className="w-full h-20 bg-[#3182f6] text-white rounded-[2rem] font-bold flex items-center justify-center gap-4 shadow-xl shadow-blue-100 hover:bg-[#1b64da] active:scale-[0.98] transition-all"
          >
            <BellRing size={24} className="animate-bounce" />
            <span className="text-lg font-black">실시간 목표가 및 수급 알림 설정</span>
          </button>
        </section>

        {/* 1. 보유 종목 리스트 (와이드 카드) */}
        <section className="space-y-6">
          <div className="flex justify-between items-center px-4">
            <h4 className="text-xl font-black text-[#191f28] flex items-center gap-3">
               내 보유 주식
               <span className="text-xs font-black px-2.5 py-1 bg-gray-100 text-[#3182f6] rounded-full">{stocks.length}</span>
            </h4>
          </div>
          <div className="space-y-5">
            {stocks.map(stock => {
              const profitRate = stock.currentPrice ? ((stock.currentPrice / stock.avgPrice - 1) * 100).toFixed(2) : '0.00';
              const isProfit = parseFloat(profitRate) >= 0;
              const isSelected = selectedStockForAi?.id === stock.id;
              
              return (
                <div 
                  key={stock.id} 
                  onClick={() => { setSelectedStockForAi(stock); runAiAnalysis(stock); }}
                  className={`bg-white pl-10 pr-10 py-9 rounded-[3rem] border shadow-sm cursor-pointer transition-all duration-500 overflow-hidden relative group ${isSelected ? 'border-[#3182f6] shadow-blue-50 ring-2 ring-blue-100' : 'border-gray-100 hover:shadow-md'}`}
                >
                  {isSelected && (
                    <div className="absolute top-0 right-0 px-6 py-2 bg-blue-600 text-white text-[9px] font-black rounded-bl-2xl uppercase tracking-widest">Analyzing</div>
                  )}
                  <div className="flex justify-between items-start mb-6">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h5 className="text-2xl font-black text-[#191f28] truncate uppercase tracking-tight">{stock.name}</h5>
                        <div className="w-1.5 h-1.5 bg-gray-200 rounded-full" />
                        <span className="text-xs font-black text-blue-500">{stock.type}</span>
                      </div>
                      <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.25em]">{stock.symbol} · {stock.quantity}주 보유</span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-2xl font-black text-[#191f28]">{(stock.currentPrice || stock.avgPrice).toLocaleString()}원</p>
                      <div className={`text-sm font-black inline-flex items-center gap-1.5 mt-1.5 ${isProfit ? 'text-[#EF4444]' : 'text-[#3B82F6]'}`}>
                        {isProfit ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        {isProfit ? '+' : ''}{profitRate}%
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-7 border-t border-gray-50 flex justify-between items-center text-gray-300">
                    <div className="flex flex-col">
                       <span className="text-[9px] font-black uppercase tracking-widest mb-1.5">평단가</span>
                       <span className="text-sm font-black text-[#191f28]">{stock.avgPrice.toLocaleString()}원</span>
                    </div>
                    <div className="flex flex-col items-end">
                       <span className="text-[9px] font-black uppercase tracking-widest mb-1.5">평가금액</span>
                       <span className="text-sm font-black text-[#191f28]">{((stock.currentPrice || stock.avgPrice) * stock.quantity).toLocaleString()}원</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 2. 관심 종목 리스트 (와이드 카드) */}
        <section className="space-y-6">
          <div className="flex justify-between items-center px-4">
            <h4 className="text-xl font-black text-[#191f28] flex items-center gap-3">
               관심 종목
               <Eye size={22} className="text-amber-400" strokeWidth={3} />
            </h4>
            <button 
               onClick={() => setIsAddModalOpen(true)}
               className="w-11 h-11 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-500 hover:bg-blue-50 hover:text-[#3182f6] transition-all"
            >
              <Plus size={26} strokeWidth={3} />
            </button>
          </div>
          <div className="space-y-4">
            {interestStocks.map(stock => {
              const isUp = (stock.change || 0) >= 0;
              return (
                <div key={stock.id} className="bg-white pl-10 pr-10 py-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center justify-between gap-6 hover:shadow-md transition-all group overflow-hidden active:scale-[0.99]">
                  <div className="flex-1 min-w-0">
                    <h5 className="text-xl font-black text-[#191f28] truncate mb-1 uppercase tracking-tight">{stock.name}</h5>
                    <span className="text-[11px] font-black text-gray-300 uppercase tracking-widest">{stock.symbol}</span>
                  </div>
                  
                  <div className="flex flex-col items-end flex-shrink-0">
                    <p className="text-xl font-black text-[#191f28] leading-none mb-2.5">
                      {(stock.price?.toLocaleString() || '--')}{'원'}
                    </p>
                    <div className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 ${isUp ? 'bg-red-50 text-[#EF4444]' : 'bg-blue-50 text-[#3B82F6]'}`}>
                       <span>{isUp ? '+' : ''}{stock.change?.toFixed(2)}%</span>
                       {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                    <button 
                       onClick={() => removeInterest(stock.id)}
                       className="w-12 h-12 flex items-center justify-center bg-gray-50 rounded-2xl text-gray-200 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 hover:text-[#EF4444]"
                    >
                      <Trash2 size={22} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] bg-white p-10 pt-32 flex flex-col animate-in slide-in-from-bottom duration-700">
           <div className="flex justify-between items-center mb-16 px-4">
              <h2 className="text-4xl font-black tracking-tighter text-[#191f28]">종목 찾기</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="p-5 bg-gray-100 rounded-full text-gray-400 rotate-90 active:scale-95 transition-all shadow-sm">
                <X size={32} />
              </button>
           </div>
           
           <div className="space-y-16 flex-1 overflow-y-auto px-4 no-scrollbar pb-10">
              <div className="space-y-6">
                 <label className="text-xs font-black text-gray-300 uppercase tracking-[0.3em] pl-2">Ticker Symbol</label>
                 <input 
                   type="text" 
                   autoFocus
                   className="w-full text-5xl font-black bg-transparent border-b-[12px] border-gray-50 focus:border-[#3182f6] outline-none py-6 placeholder:text-gray-100 transition-all uppercase tracking-tighter"
                   placeholder="005930"
                   value={newStock.symbol}
                   onChange={e => setNewStock({...newStock, symbol: e.target.value})}
                 />
              </div>
              <div className="space-y-6">
                 <label className="text-xs font-black text-gray-300 uppercase tracking-[0.3em] pl-2">Display Name</label>
                 <input 
                   type="text" 
                   className="w-full text-4xl font-black bg-transparent border-b-[12px] border-gray-50 focus:border-[#3182f6] outline-none py-6 placeholder:text-gray-100 transition-all"
                   placeholder="삼성전자"
                   value={newStock.name}
                   onChange={e => setNewStock({...newStock, name: e.target.value})}
                 />
              </div>
           </div>

           <button 
             onClick={async () => {
                if (!newStock.symbol || !newStock.name) return;
                let sym = newStock.symbol.toUpperCase().trim();
                if (!sym.includes('.') && /^\d{6}$/.test(sym)) {
                    sym += (sym.startsWith('0') || sym.startsWith('1') || sym.startsWith('2')) ? '.KS' : '.KQ';
                }
                await supabase.from('alerts').insert([{ symbol: sym, stock_name: newStock.name, alert_enabled: true }]);
                fetchInterests();
                setIsAddModalOpen(false);
                setNewStock({ name: '', symbol: '' });
             }}
             className="w-full h-24 bg-[#3182f6] text-white rounded-[2.5rem] font-black text-2xl shadow-2xl active:scale-[0.97] shadow-blue-200 transition-all mb-10"
           >
             관심 종목에 추가하기
           </button>
        </div>
      )}
    </div>
  );
}
