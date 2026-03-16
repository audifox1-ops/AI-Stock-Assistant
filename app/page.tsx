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
      alert('성공적으로 추가되었습니다.');
    } catch (err) {
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  const totalCurrentAmount = stocks.reduce((acc, s) => acc + (s.currentPrice || s.avgPrice) * s.quantity, 0);
  const totalBuyAmount = stocks.reduce((acc, s) => acc + (s.avgPrice * s.quantity), 0);
  const totalProfit = totalCurrentAmount - totalBuyAmount;
  const totalRate = totalBuyAmount > 0 ? ((totalCurrentAmount / totalBuyAmount - 1) * 100).toFixed(2) : '0.00';

  return (
    <div className="min-h-screen bg-gray-50 pb-40">
      {/* Header */}
      <header className="px-6 py-6 bg-white sticky top-0 z-50 border-b border-gray-100 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#3182f6] rounded-2xl flex items-center justify-center">
             <BarChart3 size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#191f28]">AI Stock</h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsAddHoldingModalOpen(true)}
            className="px-4 py-2 bg-blue-50 text-[#3182f6] rounded-xl text-xs font-bold hover:bg-blue-100 transition-all flex items-center gap-2"
          >
            <Plus size={16} />
            내 주식 추가
          </button>
          <button 
            onClick={() => { fetchMarketIndices(); fetchPrices(); if(selectedStockForAi) runAiAnalysis(selectedStockForAi); }} 
            className="p-2.5 bg-gray-50 rounded-xl text-gray-500 hover:text-[#3182f6] transition-colors"
          >
            <RefreshCcw size={20} className={isRefreshing || isMarketLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-6 mt-8 space-y-12">
        
        {/* Market Index Scroller (Slim Version) */}
        <section className="space-y-4">
           <h3 className="text-sm font-bold text-gray-400 px-1 uppercase tracking-wider">시장 지표</h3>
           <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 snap-x">
              {marketIndices.map(market => {
                 const isUp = market.changePercent >= 0;
                 return (
                    <div key={market.symbol} className="min-w-[160px] bg-white px-6 py-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-1 snap-start">
                       <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{market.name}</span>
                       <div className="flex justify-between items-baseline">
                          <h2 className={`text-xl font-bold tracking-tight ${isUp ? 'text-[#EF4444]' : 'text-[#3B82F6]'}`}>
                            {market.price.toLocaleString()}
                          </h2>
                          <span className={`text-[10px] font-bold ${isUp ? 'text-[#EF4444]' : 'text-[#3B82F6]'}`}>
                             {isUp ? '▲' : '▼'}{Math.abs(market.changePercent).toFixed(1)}%
                          </span>
                       </div>
                    </div>
                 );
              })}
           </div>
        </section>

        {/* 🤖 AI Strategy Report Card */}
        <section className="space-y-4">
           <div className="px-1 flex items-center gap-2">
              <Bot size={18} className="text-[#3182f6]" />
              <h3 className="text-lg font-bold text-[#191f28]">AI 실시간 전략 분석</h3>
           </div>
           
           <div className="bg-white rounded-2xl p-8 border border-blue-50 shadow-sm relative overflow-hidden min-h-[180px]">
              {isAiLoading ? (
                 <div className="space-y-4 animate-pulse">
                    <div className="w-1/2 h-5 bg-gray-50 rounded-lg" />
                    <div className="space-y-2">
                       <div className="w-full h-3 bg-gray-50 rounded-full" />
                       <div className="w-5/6 h-3 bg-gray-50 rounded-full" />
                    </div>
                    <div className="flex justify-center pt-2">
                       <Loader2 className="text-[#3182f6] animate-spin" size={20} />
                    </div>
                 </div>
              ) : aiAnalysis ? (
                 <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
                    <div className="flex items-center gap-2 mb-4">
                       <span className="px-2 py-0.5 bg-blue-50 text-[#3182f6] text-[10px] font-bold rounded-lg uppercase tracking-wider">Analysis</span>
                       <h4 className="text-sm font-bold text-[#191f28]">{selectedStockForAi?.name} 전략</h4>
                    </div>
                    <div className="text-sm text-gray-500 font-medium leading-relaxed whitespace-pre-line">
                       {aiAnalysis}
                    </div>
                    <div className="mt-6 pt-4 border-t border-gray-50 flex justify-between items-center text-gray-300">
                       <span className="text-[9px] font-bold uppercase tracking-widest">Powered by Gemini AI Engine</span>
                       <button onClick={() => selectedStockForAi && runAiAnalysis(selectedStockForAi)} className="text-[10px] font-bold text-[#3182f6]">Re-Analyze</button>
                    </div>
                 </div>
              ) : (
                 <div className="text-center py-10 opacity-40">
                    <Bot size={36} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-xs font-bold text-gray-400">보유 종목을 선택하여 AI 분석을 시작하세요.</p>
                 </div>
              )}
           </div>
        </section>

        {/* Portfolio Summary Card */}
        <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-6 text-gray-400">
            <Wallet size={16} />
            <p className="text-[10px] font-bold uppercase tracking-widest">나의 총 자산 현황</p>
          </div>
          
          <div className="flex items-baseline gap-2 mb-8">
            <h3 className="text-4xl font-bold text-[#191f28] tracking-tight">{totalCurrentAmount.toLocaleString()}원</h3>
            <div className={`px-3 py-1 rounded-xl text-xs font-bold ${parseFloat(totalRate) >= 0 ? 'bg-red-50 text-[#EF4444]' : 'bg-blue-50 text-[#3B82F6]'}`}>
              {parseFloat(totalRate) >= 0 ? '+' : ''}{totalRate}%
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-50 p-6 rounded-2xl">
              <span className="text-[10px] font-bold text-gray-400 block mb-1">총 평가수익</span>
              <p className={`text-xl font-bold ${totalProfit >= 0 ? 'text-[#EF4444]' : 'text-[#3B82F6]'}`}>
                {totalProfit >= 0 ? '+' : ''}{totalProfit.toLocaleString()}원
              </p>
            </div>
            <div className="bg-gray-50 p-6 rounded-2xl">
              <span className="text-[10px] font-bold text-gray-400 block mb-1">총 투자원금</span>
              <p className="text-xl font-bold text-[#191f28]">{totalBuyAmount.toLocaleString()}원</p>
            </div>
          </div>
        </section>

        {/* '내 주식(보유 종목)' 섹션 */}
        <section className="space-y-6">
          <div className="flex justify-between items-center px-1">
             <h4 className="text-lg font-bold text-[#191f28] flex items-center gap-2">
                내 주식 리스트
                <span className="text-xs bg-gray-100 text-[#3182f6] px-2 py-0.5 rounded-lg font-bold">{stocks.length}</span>
             </h4>
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
                  className={`bg-white px-8 py-7 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${isSelected ? 'border-[#3182f6] bg-blue-50/10' : 'border-gray-100 shadow-sm hover:shadow-md'}`}
                >
                  <div className="flex justify-between items-start mb-5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h5 className="text-xl font-bold text-[#191f28] truncate">{stock.name}</h5>
                        <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-lg uppercase">{stock.type}</span>
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{stock.symbol} · {stock.quantity}주</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-[#191f28]">{(stock.currentPrice || stock.avgPrice).toLocaleString()}원</p>
                      <div className={`text-xs font-bold inline-flex items-center gap-1 ${isProfit ? 'text-[#EF4444]' : 'text-[#3B82F6]'}`}>
                        {isProfit ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {isProfit ? '+' : ''}{profitRate}%
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-5 border-t border-gray-50 flex justify-between items-center text-gray-400">
                    <div className="flex flex-col">
                       <span className="text-[9px] font-bold uppercase tracking-widest mb-1">평단가</span>
                       <span className="text-sm font-bold text-gray-700">{stock.avgPrice.toLocaleString()}원</span>
                    </div>
                    <div className="flex items-center gap-4">
                       <div className="flex flex-col items-end">
                          <span className="text-[9px] font-bold uppercase tracking-widest mb-1">평가손익</span>
                          <span className={`text-sm font-bold ${isProfit ? 'text-[#EF4444]' : 'text-[#3B82F6]'}`}>
                             {isProfit ? '+' : ''}{((stock.currentPrice || stock.avgPrice - stock.avgPrice) * stock.quantity).toLocaleString()}원
                          </span>
                       </div>
                       <button 
                         onClick={(e) => { e.stopPropagation(); removeHolding(stock.id); }}
                         className="p-2 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all ml-2"
                       >
                         <Trash2 size={18} />
                       </button>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {stocks.length === 0 && (
               <div className="bg-white border-2 border-dashed border-gray-100 rounded-2xl p-12 text-center">
                  <Landmark className="mx-auto mb-4 text-gray-200" size={48} />
                  <p className="text-sm font-bold text-gray-400">등록된 보유 주식이 없습니다.<br/>'내 주식 추가' 버튼을 눌러 등록해 보세요.</p>
               </div>
            )}
          </div>
        </section>

        {/* 2. 관심 종목 리스트 */}
        <section className="space-y-6 pb-20">
          <div className="flex justify-between items-center px-1">
            <h4 className="text-lg font-bold text-[#191f28] flex items-center gap-2">
               관심 종목
               <Eye size={18} className="text-gray-400" />
            </h4>
            <div className="flex items-center gap-3">
               <Link href="/watchlist" className="text-xs font-bold text-[#3182f6] hover:underline px-2">전체보기</Link>
               <button 
                  onClick={() => setIsAddInterestModalOpen(true)}
                  className="w-10 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-[#3182f6] shadow-sm hover:shadow-md transition-all active:scale-90"
               >
                 <Plus size={24} />
               </button>
            </div>
          </div>
          
          <div className="space-y-3">
            {interestStocks.map(stock => {
              const isUp = (stock.change || 0) >= 0;
              return (
                <div key={stock.id} className="bg-white px-8 py-7 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
                  <div className="min-w-0 flex-1">
                    <h5 className="text-base font-bold text-[#191f28] truncate mb-0.5">{stock.name}</h5>
                    <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">{stock.symbol}</span>
                  </div>
                  
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-base font-bold text-[#191f28]">{(stock.price?.toLocaleString() || '--')}원</p>
                      <span className={`text-xs font-bold ${isUp ? 'text-[#EF4444]' : 'text-[#3B82F6]'}`}>
                        {isUp ? '+' : ''}{stock.change?.toFixed(2)}%
                      </span>
                    </div>
                    
                    <button 
                       onClick={() => removeInterest(stock.id)}
                       className="p-2 text-gray-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* 1. Add Holding Modal */}
      {isAddHoldingModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm p-6 flex items-center justify-center animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-center">
                 <h2 className="text-2xl font-black text-[#191f28]">내 주식 추가</h2>
                 <button onClick={() => setIsAddHoldingModalOpen(false)} className="p-3 bg-gray-50 rounded-2xl text-gray-400">
                    <X size={24} />
                 </button>
              </div>
              
              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">종목명</label>
                    <input 
                      type="text" 
                      className="w-full h-16 bg-gray-50 rounded-2xl px-6 font-bold outline-none focus:ring-2 focus:ring-blue-100 border border-transparent focus:border-blue-200 transition-all"
                      placeholder="삼성전자"
                      value={newStock.name}
                      onChange={e => setNewStock({...newStock, name: e.target.value})}
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">종목코드 (Ticker)</label>
                    <input 
                      type="text" 
                      className="w-full h-16 bg-gray-50 rounded-2xl px-6 font-bold outline-none focus:ring-2 focus:ring-blue-100 border border-transparent focus:border-blue-200 transition-all uppercase"
                      placeholder="005930"
                      value={newStock.symbol}
                      onChange={e => setNewStock({...newStock, symbol: e.target.value})}
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">매수 평단가</label>
                       <input 
                         type="number" 
                         className="w-full h-16 bg-gray-50 rounded-2xl px-6 font-bold outline-none border border-transparent focus:border-blue-200 transition-all"
                         placeholder="72000"
                         value={newStock.avgPrice || ''}
                         onChange={e => setNewStock({...newStock, avgPrice: Number(e.target.value)})}
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">보유 수량</label>
                       <input 
                         type="number" 
                         className="w-full h-16 bg-gray-50 rounded-2xl px-6 font-bold outline-none border border-transparent focus:border-blue-200 transition-all"
                         placeholder="10"
                         value={newStock.quantity || ''}
                         onChange={e => setNewStock({...newStock, quantity: Number(e.target.value)})}
                       />
                    </div>
                 </div>
              </div>

              <button 
                onClick={handleAddHolding}
                className="w-full h-18 bg-[#3182f6] text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-50 hover:bg-[#1b64da] active:scale-[0.98] transition-all"
              >
                포트폴리오에 추가하기
              </button>
           </div>
        </div>
      )}

      {/* 2. Add Interest Modal */}
      {isAddInterestModalOpen && (
        <div className="fixed inset-0 z-[100] bg-white p-10 pt-20 flex flex-col animate-in slide-in-from-bottom duration-500">
           <div className="flex justify-between items-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight text-[#191f28]">관심 종목 추가</h2>
              <button onClick={() => setIsAddInterestModalOpen(false)} className="p-3 bg-gray-50 rounded-xl text-gray-400 active:scale-90 transition-all">
                <X size={24} />
              </button>
           </div>
           
           <div className="space-y-10 flex-1 overflow-y-auto no-scrollbar">
              <div className="space-y-3 px-1">
                 <label className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">티커 코드</label>
                 <input 
                   type="text" 
                   autoFocus
                   className="w-full text-4xl font-bold bg-transparent border-b-4 border-gray-50 focus:border-[#3182f6] outline-none py-4 placeholder:text-gray-100 transition-all uppercase tracking-tighter"
                   placeholder="005930"
                   value={newStock.symbol}
                   onChange={e => setNewStock({...newStock, symbol: e.target.value})}
                 />
              </div>
              <div className="space-y-3 px-1">
                 <label className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">종목 이름</label>
                 <input 
                   type="text" 
                   className="w-full text-3xl font-bold bg-transparent border-b-4 border-gray-50 focus:border-[#3182f6] outline-none py-4 placeholder:text-gray-100 transition-all"
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
                alert('관심 종목에 추가되었습니다.');
             }}
             className="w-full h-18 bg-[#3182f6] text-white rounded-2xl font-bold text-xl shadow-lg shadow-blue-50 active:scale-[0.98] transition-all mb-8"
           >
             관심 목록에 담기
           </button>
        </div>
      )}
    </div>
  );
}
