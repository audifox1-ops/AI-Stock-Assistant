"use client";

import React, { useState, useEffect } from 'react';
import { 
  Plus, X, RefreshCcw, Bell, Trash2, BellRing, 
  ArrowRight, TrendingUp, TrendingDown, Star, Wallet, Eye, BarChart3, Bot, Sparkles, Loader2, Landmark
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
  updatedAt?: string;
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
      // 캐시 방지 강제 적용
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
      // 주가 페칭 시 캐시 방지 강제 적용
      const res = await fetch('/api/stock', { 
        method: 'POST', 
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
        cache: 'no-store' // AI 분석도 최신 데이터 기반 강제
      });
      const data = await res.json();
      setAiAnalysis(data.analysis);
    } catch (error) {
      setAiAnalysis("AI 기술 엔진에서 전략을 생성할 수 없습니다. 잠시 후 다시 시도해 주세요.");
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
      alert('모든 정보를 입력해 주세요.');
      return;
    }
    
    let sym = newStock.symbol.toUpperCase().trim();
    // 티커 형식 정밀화 (.KS/.KQ 자동 할당)
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
      alert('성공적으로 등록되었습니다.');
    } catch (err) {
      alert('데이터베이스 저장 중 오류가 발생했습니다.');
    }
  };

  const totalCurrentAmount = stocks.reduce((acc, s) => acc + (s.currentPrice || s.avgPrice) * s.quantity, 0);
  const totalBuyAmount = stocks.reduce((acc, s) => acc + (s.avgPrice * s.quantity), 0);
  const totalProfit = totalCurrentAmount - totalBuyAmount;
  const totalRate = totalBuyAmount > 0 ? ((totalCurrentAmount / totalBuyAmount - 1) * 100).toFixed(2) : '0.00';

  return (
    <div className="min-h-screen bg-gray-50 pb-40">
      {/* Header - No rounded-full */}
      <header className="px-6 py-6 bg-white sticky top-0 z-50 border-b border-gray-100 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#3182f6] rounded-xl flex items-center justify-center">
             <BarChart3 size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#191f28]">AI-Stock Assistant</h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsAddHoldingModalOpen(true)}
            className="px-5 py-2.5 bg-[#3182f6] text-white rounded-xl text-xs font-bold hover:bg-[#1b64da] transition-all flex items-center gap-2 shadow-sm"
          >
            <Plus size={16} />
            내 주식 추가
          </button>
          <button 
            onClick={() => { fetchMarketIndices(); fetchPrices(); if(selectedStockForAi) runAiAnalysis(selectedStockForAi); }} 
            className="p-3 bg-gray-50 rounded-xl text-gray-500 hover:text-[#3182f6] transition-colors border border-gray-100"
          >
            <RefreshCcw size={20} className={isRefreshing || isMarketLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-6 mt-10 space-y-12">
        
        {/* Market Index Section - No rounded-full */}
        <section className="space-y-4">
           <div className="flex justify-between items-center px-1">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">실시간 지수</h3>
              <span className="text-[10px] font-bold text-gray-300">Yahoo Finance 실시간 연동</span>
           </div>
           <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 snap-x">
              {marketIndices.map(market => {
                 const isUp = market.changePercent >= 0;
                 return (
                    <div key={market.symbol} className="min-w-[170px] bg-white px-6 py-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-1.5 snap-start group hover:border-[#3182f6] transition-colors">
                       <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest group-hover:text-[#3182f6] transition-colors">{market.name}</span>
                       <div className="flex justify-between items-baseline">
                          <h2 className={`text-xl font-black tracking-tight ${isUp ? 'text-[#EF4444]' : 'text-[#3B82F6]'}`}>
                            {market.price.toLocaleString()}
                          </h2>
                          <span className={`text-[10px] font-bold ${isUp ? 'text-[#EF4444] bg-red-50' : 'text-[#3B82F6] bg-blue-50'} px-1.5 py-0.5 rounded-lg`}>
                             {isUp ? '+' : ''}{market.changePercent.toFixed(1)}%
                          </span>
                       </div>
                    </div>
                 );
              })}
           </div>
        </section>

        {/* AI Analysis Strategy Report - Modern Wide Card */}
        <section className="space-y-5">
           <div className="px-1 flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                 <Bot size={18} className="text-[#3182f6]" />
              </div>
              <h3 className="text-lg font-bold text-[#191f28]">AI 3줄 투자 전략 리포트</h3>
           </div>
           
           <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm relative overflow-hidden min-h-[200px]">
              {isAiLoading ? (
                 <div className="space-y-5 animate-pulse">
                    <div className="w-1/3 h-5 bg-gray-50 rounded-xl" />
                    <div className="space-y-3">
                       <div className="w-full h-3.5 bg-gray-50 rounded-xl" />
                       <div className="w-5/6 h-3.5 bg-gray-50 rounded-xl" />
                       <div className="w-4/5 h-3.5 bg-gray-50 rounded-xl" />
                    </div>
                    <div className="flex justify-center pt-4">
                       <Loader2 className="text-[#3182f6] animate-spin" size={24} />
                    </div>
                 </div>
              ) : aiAnalysis ? (
                 <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    <div className="flex items-center gap-3 mb-6">
                       <span className="px-3 py-1 bg-[#3182f6] text-white text-[10px] font-black rounded-lg uppercase tracking-widest shadow-lg shadow-blue-50">Intelligence</span>
                       <h4 className="text-base font-bold text-[#191f28]">{selectedStockForAi?.name} 분석 정보</h4>
                    </div>
                    <div className="text-[15px] text-gray-600 font-bold leading-relaxed whitespace-pre-line border-l-4 border-blue-50 pl-6 my-4">
                       {aiAnalysis}
                    </div>
                    <div className="mt-10 pt-6 border-t border-gray-50 flex justify-between items-center">
                       <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Gemini-1.5-Flash Engine</span>
                       <button onClick={() => selectedStockForAi && runAiAnalysis(selectedStockForAi)} className="text-[10px] font-bold text-[#3182f6] bg-blue-50 px-3 py-1.5 rounded-xl hover:bg-blue-100 transition-colors">새로 고침</button>
                    </div>
                 </div>
              ) : (
                 <div className="text-center py-12 flex flex-col items-center gap-4">
                    <Bot size={48} className="text-gray-100" />
                    <div className="space-y-1">
                       <p className="text-sm font-bold text-gray-400">데이터를 분석할 종목을 선택해 주세요.</p>
                       <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Select a stock to generate AI strategy</p>
                    </div>
                 </div>
              )}
           </div>
        </section>

        {/* Asset Summary - No rounded-full */}
        <section className="bg-white p-10 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50/50 rounded-bl-[100px] -z-10" />
          <div className="flex items-center gap-2 mb-8 text-gray-400">
            <Wallet size={18} />
            <p className="text-[11px] font-black uppercase tracking-widest">My Portfolio Asset Status</p>
          </div>
          
          <div className="flex items-baseline gap-3 mb-10">
            <h3 className="text-5xl font-black text-[#191f28] tracking-tighter">{totalCurrentAmount.toLocaleString()}원</h3>
            <div className={`px-3 py-1.5 rounded-xl text-sm font-black ${parseFloat(totalRate) >= 0 ? 'bg-red-50 text-[#EF4444]' : 'bg-blue-50 text-[#3B82F6]'}`}>
              {parseFloat(totalRate) >= 0 ? '+' : ''}{totalRate}%
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-5">
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100/50">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">총 평가수익</span>
              <p className={`text-xl font-black ${totalProfit >= 0 ? 'text-[#EF4444]' : 'text-[#3B82F6]'}`}>
                {totalProfit >= 0 ? '+' : ''}{totalProfit.toLocaleString()}원
              </p>
            </div>
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100/50">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">실제 투자원금</span>
              <p className="text-xl font-black text-[#191f28]">{totalBuyAmount.toLocaleString()}원</p>
            </div>
          </div>
        </section>

        {/* Portfolio Holdings Section - No rounded-full, px-8 wide cards */}
        <section className="space-y-6">
          <div className="flex justify-between items-center px-1">
             <h4 className="text-lg font-bold text-[#191f28] flex items-center gap-3">
                보유 종목 현황
                <span className="text-[10px] font-black bg-[#191f28] text-white px-2.5 py-1 rounded-lg">{stocks.length}</span>
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
                  className={`bg-white px-8 py-8 rounded-2xl border transition-all cursor-pointer relative overflow-hidden min-h-[140px] flex flex-col justify-center ${isSelected ? 'border-[#3182f6] bg-blue-50/10 ring-2 ring-blue-50' : 'border-gray-100 shadow-sm hover:border-[#3182f6]'}`}
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h5 className="text-xl font-black text-[#191f28] truncate">{stock.name}</h5>
                        <span className="text-[9px] font-black text-blue-500 bg-blue-50 px-2 py-1 rounded-lg uppercase tracking-wide">{stock.type}</span>
                      </div>
                      <span className="text-[11px] font-bold text-gray-300 uppercase tracking-widest">{stock.symbol} · {stock.quantity}주 보유</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-[#191f28] mb-1">{(stock.currentPrice || stock.avgPrice).toLocaleString()}원</p>
                      <div className={`text-sm font-black inline-flex items-center gap-1 ${isProfit ? 'text-[#EF4444]' : 'text-[#3B82F6]'}`}>
                        {isProfit ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        {isProfit ? '+' : ''}{profitRate}%
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-6 border-t border-gray-50 flex justify-between items-center">
                    <div className="flex gap-10">
                       <div className="flex flex-col">
                          <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1.5">평단가</span>
                          <span className="text-sm font-bold text-gray-500">{stock.avgPrice.toLocaleString()}원</span>
                       </div>
                       <div className="flex flex-col">
                          <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1.5">평가금액</span>
                          <span className="text-sm font-bold text-gray-700">{( (stock.currentPrice || stock.avgPrice) * stock.quantity ).toLocaleString()}원</span>
                       </div>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeHolding(stock.id); }}
                      className="p-3 hover:bg-red-50 text-gray-200 hover:text-[#EF4444] rounded-xl transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              );
            })}
            
            {stocks.length === 0 && (
               <div className="bg-white border-2 border-dashed border-gray-100 rounded-2xl p-16 text-center flex flex-col items-center gap-5">
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-200">
                     <Landmark size={36} />
                  </div>
                  <div className="space-y-1">
                     <p className="text-base font-bold text-gray-400">등록된 보유 주식이 없습니다.</p>
                     <p className="text-xs font-bold text-gray-300 uppercase tracking-widest">Add your holdings to start analyzing</p>
                  </div>
                  <button 
                    onClick={() => setIsAddHoldingModalOpen(true)}
                    className="mt-2 px-6 py-2 bg-gray-50 text-gray-400 hover:text-[#3182f6] hover:bg-blue-50 font-black rounded-xl text-xs transition-all"
                  >
                    + 지금 추가하기
                  </button>
               </div>
            )}
          </div>
        </section>

        {/* Watchlist Section - No rounded-full, px-8 wide cards */}
        <section className="space-y-6 pb-20">
          <div className="flex justify-between items-center px-1">
            <h4 className="text-lg font-bold text-[#191f28] flex items-center gap-3">
               관심 종목
               <Eye size={18} className="text-gray-400" />
            </h4>
            <div className="flex items-center gap-4">
               <Link href="/watchlist" className="text-[11px] font-black text-[#3182f6] hover:underline uppercase tracking-widest">View All</Link>
               <button 
                  onClick={() => setIsAddInterestModalOpen(true)}
                  className="w-11 h-11 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-[#3182f6] shadow-sm hover:shadow-md transition-all active:scale-90"
               >
                 <Plus size={24} />
               </button>
            </div>
          </div>
          
          <div className="space-y-4">
            {interestStocks.map(stock => {
              const isUp = (stock.change || 0) >= 0;
              return (
                <div key={stock.id} className="bg-white px-8 py-8 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-[#3182f6] transition-all overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-50 opacity-0 group-hover:opacity-100 transition-all" />
                  <div className="min-w-0 flex-1">
                    <h5 className="text-lg font-black text-[#191f28] truncate mb-1">{stock.name}</h5>
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{stock.symbol} · Alert Active</span>
                  </div>
                  
                  <div className="flex items-center gap-10">
                    <div className="text-right">
                      <p className="text-lg font-black text-[#191f28] mb-1">{(stock.price?.toLocaleString() || '--')}원</p>
                      <span className={`text-xs font-black ${isUp ? 'text-[#EF4444] bg-red-50' : 'text-[#3B82F6] bg-blue-50'} px-2 py-0.5 rounded-lg`}>
                        {isUp ? '+' : ''}{stock.change?.toFixed(2)}%
                      </span>
                    </div>
                    
                    <button 
                       onClick={() => removeInterest(stock.id)}
                       className="p-3 text-gray-200 hover:text-[#EF4444] hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
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

      {/* --- Modals - No rounded-full --- */}

      {/* 1. Add Holding Modal */}
      {isAddHoldingModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md p-6 flex items-center justify-center animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 space-y-10 animate-in slide-in-from-bottom-6 duration-600 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-[#3182f6]" />
              <div className="flex justify-between items-center">
                 <div>
                    <h2 className="text-3xl font-black text-[#191f28] tracking-tight">내 주식 등록</h2>
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mt-1.5">Register your portfolio holdings</p>
                 </div>
                 <button onClick={() => setIsAddHoldingModalOpen(false)} className="p-3 bg-gray-50 rounded-2xl text-gray-300 hover:text-gray-900 transition-colors">
                    <X size={26} />
                 </button>
              </div>
              
              <div className="space-y-8">
                 <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">종목명</label>
                       <input 
                         type="text" 
                         className="w-full h-18 bg-gray-50 rounded-2xl px-6 font-bold text-lg outline-none focus:ring-4 focus:ring-blue-50 border-2 border-transparent focus:border-blue-100 transition-all placeholder:text-gray-200"
                         placeholder="삼성전자"
                         value={newStock.name}
                         onChange={e => setNewStock({...newStock, name: e.target.value})}
                       />
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">티커/코드</label>
                       <input 
                         type="text" 
                         className="w-full h-18 bg-gray-50 rounded-2xl px-6 font-bold text-lg outline-none focus:ring-4 focus:ring-blue-50 border-2 border-transparent focus:border-blue-100 transition-all placeholder:text-gray-200 uppercase"
                         placeholder="005930"
                         value={newStock.symbol}
                         onChange={e => setNewStock({...newStock, symbol: e.target.value})}
                       />
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">매수 평단가</label>
                       <input 
                         type="number" 
                         className="w-full h-18 bg-gray-50 rounded-2xl px-6 font-bold text-lg outline-none border-2 border-transparent focus:border-blue-100 transition-all"
                         placeholder="72000"
                         value={newStock.avgPrice || ''}
                         onChange={e => setNewStock({...newStock, avgPrice: Number(e.target.value)})}
                       />
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">보유 수량</label>
                       <input 
                         type="number" 
                         className="w-full h-18 bg-gray-50 rounded-2xl px-6 font-bold text-lg outline-none border-2 border-transparent focus:border-blue-100 transition-all"
                         placeholder="10"
                         value={newStock.quantity || ''}
                         onChange={e => setNewStock({...newStock, quantity: Number(e.target.value)})}
                       />
                    </div>
                 </div>
              </div>

              <button 
                onClick={handleAddHolding}
                className="w-full h-20 bg-[#3182f6] text-white rounded-2xl font-black text-xl shadow-2xl shadow-blue-50 hover:bg-[#1b64da] active:scale-[0.98] transition-all"
              >
                포트폴리오에 저장하기
              </button>
           </div>
        </div>
      )}

      {/* 2. Add Interest Modal */}
      {isAddInterestModalOpen && (
        <div className="fixed inset-0 z-[100] bg-white p-12 pt-24 flex flex-col animate-in slide-in-from-bottom-8 duration-500">
           <div className="flex justify-between items-center mb-16">
              <div>
                 <h2 className="text-4xl font-black tracking-tighter text-[#191f28]">관심 종목 추가</h2>
                 <p className="text-xs font-bold text-gray-300 uppercase tracking-widest mt-2">Add new symbol to your smart watchlist</p>
              </div>
              <button onClick={() => setIsAddInterestModalOpen(false)} className="p-4 bg-gray-50 rounded-2xl text-gray-400 active:scale-90 transition-all">
                <X size={32} />
              </button>
           </div>
           
           <div className="space-y-12 flex-1 overflow-y-auto no-scrollbar max-w-lg mx-auto w-full">
              <div className="space-y-4">
                 <label className="text-[11px] font-black text-gray-300 uppercase tracking-[0.2em] px-1">티커 코드 번호 (6자리)</label>
                 <input 
                   type="text" 
                   autoFocus
                   className="w-full text-5xl font-black bg-transparent border-b-8 border-gray-50 focus:border-[#3182f6] outline-none py-6 placeholder:text-gray-100 transition-all uppercase tracking-tighter"
                   placeholder="005930"
                   value={newStock.symbol}
                   onChange={e => setNewStock({...newStock, symbol: e.target.value})}
                 />
              </div>
              <div className="space-y-4">
                 <label className="text-[11px] font-black text-gray-300 uppercase tracking-[0.2em] px-1">정확한 종목 이름</label>
                 <input 
                   type="text" 
                   className="w-full text-4xl font-black bg-transparent border-b-8 border-gray-50 focus:border-[#3182f6] outline-none py-6 placeholder:text-gray-100 transition-all"
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
                setIsAddInterestModalOpen(false);
                setNewStock({ name: '', symbol: '' });
                alert('관심 종목 리스트에 안전하게 저장되었습니다.');
             }}
             className="w-full h-22 bg-[#3182f6] text-white rounded-[2rem] font-black text-2xl shadow-2xl shadow-blue-100 active:scale-[0.98] transition-all mb-10 max-w-lg mx-auto"
           >
             관심 목록에 담기
           </button>
        </div>
      )}
    </div>
  );
}
