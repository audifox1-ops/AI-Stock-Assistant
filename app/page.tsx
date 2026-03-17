"use client";

import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Star, TrendingUp, TrendingDown, RefreshCcw, Loader2, X,
  ArrowRight, ShieldAlert, Sparkles, AlertCircle, BarChart3, Info, Zap,
  Menu, Bell, Settings, Filter
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface IndexInfo {
  name: string;
  value: string;
  change: string;
  changeRate: string;
  status: 'UP' | 'DOWN' | 'SAME';
}

interface RankedStock {
  itemCode: string;
  stockName: string;
  closePrice: number;
  fluctuationsRatio: string;
  volume: number;
  fluctuationType: string;
}

const TABS = [
  { id: 'kospi_market_cap', label: '코스피 시총', value: 'kospi_market_cap' },
  { id: 'kosdaq_market_cap', label: '코스닥 시총', value: 'kosdaq_market_cap' },
  { id: 'volume', label: '거래량 상위', value: 'volume' },
  { id: 'foreign_buy', label: '외인 매수', value: 'foreign_buy' },
  { id: 'institution_buy', label: '기관 매수', value: 'institution_buy' }
];

export default function HomePage() {
  const [indices, setIndices] = useState<IndexInfo[]>([]);
  const [rankingList, setRankingList] = useState<RankedStock[]>([]);
  const [activeTab, setActiveTab] = useState('kospi_market_cap');
  const [isLoadingIndices, setIsLoadingIndices] = useState(true);
  const [isLoadingRanking, setIsLoadingRanking] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchIndices = async () => {
    setIsLoadingIndices(true);
    try {
      const res = await fetch('/api/market?type=index');
      const data = await res.json();
      if (data.success) {
        setIndices(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingIndices(false);
    }
  };

  const fetchRanking = async (tabValue: string) => {
    setIsLoadingRanking(true);
    try {
      const res = await fetch(`/api/market?type=${tabValue}`);
      const data = await res.json();
      if (data.success) {
        setRankingList(data.data);
      }
    } catch (e) {
      console.error(e);
      setRankingList([]);
    } finally {
      setIsLoadingRanking(false);
      setLastUpdated(new Date().toLocaleTimeString());
    }
  };

  useEffect(() => {
    fetchIndices();
  }, []);

  useEffect(() => {
    fetchRanking(activeTab);
  }, [activeTab]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-50 font-sans">
      {/* 1. 상단 고정 헤더 영역 (지수 및 탭 메뉴) */}
      <section className="flex-none bg-white shadow-xl z-50">
        <header className="px-6 py-8 border-b border-gray-100 flex justify-between items-center">
           <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">Market.AI</h1>
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1">Real-time Trading Cloud</p>
           </div>
           <div className="flex gap-4">
              <button className="p-3 bg-slate-900 text-white rounded-none shadow-lg"><Plus size={18} /></button>
           </div>
        </header>

        {/* 지수 대시보드 */}
        <div className="px-6 py-8 grid grid-cols-2 gap-px bg-slate-100 border-b border-slate-100 font-sans">
          {isLoadingIndices ? (
            <div className="col-span-2 py-10 flex flex-col items-center gap-4 bg-white">
               <Loader2 className="animate-spin text-slate-200" size={24} />
               <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">CONNECTING TO MARKET DATA...</p>
            </div>
          ) : (
            indices.map((idx, i) => {
              const isUp = idx.status === 'UP';
              return (
                <div key={i} className="bg-white p-6 flex flex-col items-start font-sans">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-2 h-2 rounded-full ${isUp ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{idx.name}</span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900 tabular-nums tracking-tighter mb-2">{idx.value}</h2>
                  <div className={`flex items-center gap-3 ${isUp ? 'text-red-500' : 'text-blue-500'}`}>
                    <span className="text-[10px] font-black tabular-nums">{isUp ? '▲' : '▼'} {idx.change}</span>
                    <span className="text-[10px] font-black tabular-nums bg-slate-50 px-2 py-1 rounded-none border border-current">{idx.changeRate}%</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 탭 네비게이션 */}
        <div className="bg-white px-2 py-4 flex gap-2 overflow-x-auto hide-scrollbar">
           {TABS.map(tab => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.value)}
               className={`flex-none px-6 py-3 text-[11px] font-black uppercase tracking-widest transition-all rounded-none border ${
                 activeTab === tab.value 
                   ? 'bg-slate-900 text-white border-slate-900 shadow-xl' 
                   : 'text-slate-400 border-transparent hover:border-slate-100'
               }`}
             >
               {tab.label}
             </button>
           ))}
        </div>
      </section>

      {/* 2. 메인 컨텐츠 영역 (스크롤 리스트) */}
      <main className="flex-1 overflow-y-auto hide-scrollbar pb-32">
        <div className="px-6 py-6 flex justify-between items-center bg-slate-50 border-b border-slate-100 sticky top-0 z-40 backdrop-blur-md bg-white/50">
           <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Market Ranking</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Updated: {lastUpdated}</p>
           </div>
           <button onClick={() => fetchRanking(activeTab)} className="p-3 bg-white border border-slate-200 active:bg-blue-600 active:text-white group">
              <RefreshCcw size={14} className={isLoadingRanking ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
           </button>
        </div>

        <div className="px-6 mt-4 space-y-4">
          {isLoadingRanking ? (
             <div className="py-20 flex flex-col items-center justify-center gap-6">
                <Loader2 className="animate-spin text-slate-200" size={40} />
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">PARSING RANKING DATA...</p>
             </div>
          ) : rankingList.length === 0 ? (
             <div className="bg-white border-2 border-dashed border-slate-200 p-20 text-center flex flex-col items-center gap-5">
                <AlertCircle size={40} className="text-slate-100" />
                <p className="text-xs font-black text-slate-300 uppercase tracking-widest leading-relaxed">준비된 데이터가 없습니다.<br/>잠시 후 다시 시도해주세요.</p>
             </div>
          ) : (
            rankingList.map((stock, idx) => {
              const changeVal = parseFloat(stock.fluctuationsRatio);
              const isPlus = changeVal > 0;
              const isMinus = changeVal < 0;

              return (
                <div key={stock.itemCode} className="bg-white border border-slate-100 p-6 flex flex-col gap-5 hover:border-blue-500 group transition-all duration-300 rounded-none shadow-sm hover:shadow-xl">
                   <div className="flex justify-between items-start">
                      <div className="flex items-center gap-5">
                         <div className="w-12 h-12 bg-slate-900 text-white flex items-center justify-center text-[11px] font-black uppercase">
                            {idx + 1}
                         </div>
                         <div>
                            <h4 className="text-[17px] font-black text-slate-900 tracking-tighter uppercase group-hover:text-blue-600 transition-colors leading-none mb-1">
                               {stock.stockName}
                            </h4>
                            <p className="text-[10px] font-bold text-slate-300 tracking-[0.2em]">{stock.itemCode}</p>
                         </div>
                      </div>
                      <div className="text-right">
                         <p className="text-xl font-black text-slate-900 tracking-tighter tabular-nums leading-none mb-2">
                            {stock.closePrice.toLocaleString()}
                         </p>
                         <div className={`text-[10px] font-black tabular-nums border px-2 py-1 inline-block ${isPlus ? 'text-red-500 border-red-50' : isMinus ? 'text-blue-500 border-blue-50' : 'text-slate-400 border-slate-50'}`}>
                            {isPlus ? '+' : ''}{stock.fluctuationsRatio}%
                         </div>
                      </div>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-5">
                      <div className="flex flex-col gap-1">
                         <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Trading Vol</span>
                         <span className="text-xs font-bold text-slate-900 tabular-nums tracking-tighter">
                            {stock.volume.toLocaleString()} 주
                         </span>
                      </div>
                      <div className="flex flex-col gap-1 text-right">
                         <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Market View</span>
                         <div className="flex justify-end items-center gap-2">
                            {isPlus ? <TrendingUp size={12} className="text-red-500" /> : <TrendingDown size={12} className="text-blue-500" />}
                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Active</span>
                         </div>
                      </div>
                   </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* 3. 하단 고정 내비게이션 (생략 가능하나 구조상 유지) */}
      {/* ... */}
    </div>
  );
}
