"use client";

import React, { useState, useEffect } from 'react';
import { 
  RefreshCcw, Search, ChevronLeft, Star, Trash2, Plus, Loader2, Bot, TrendingUp, TrendingDown
} from 'lucide-react';
import Link from 'next/link';

// [9차 핵심] localStorage 키 정의
const STORAGE_KEY = 'myWatchlist';

interface InterestStock {
  id: string | number;
  name: string;
  symbol: string;
  price: number | null;
  change: number | null;
}

// 종목명 -> 티커 변환 맵핑 딕셔너리
const stockMap: Record<string, string> = { 
  "태웅": "044490.KQ", 
  "삼성전자": "005930.KS", 
  "SK하이닉스": "000660.KS", 
  "카카오": "035720.KS", 
  "에코프로": "086520.KQ",
  "네이버": "035420.KS",
  "현대차": "005380.KS",
  "LG에너지솔루션": "373220.KS",
  "삼성바이오로직스": "207940.KS"
};

export default function WatchlistPage() {
  const [interestStocks, setInterestStocks] = useState<InterestStock[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);

  // [14차] 시세 정보 실시간 업데이트 기능
  const fetchPrices = async (stocksToUpdate: InterestStock[]) => {
    if (stocksToUpdate.length === 0) return;
    
    setIsLoadingPrices(true);
    try {
      const symbols = stocksToUpdate.map(s => s.symbol);
      const res = await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols }),
        cache: 'no-store'
      });
      const data = await res.json();
      
      const updated = stocksToUpdate.map(s => {
        const live = data[s.symbol];
        if (live) {
          return { ...s, price: live.price, change: live.changePercent };
        }
        return s;
      });
      
      setInterestStocks(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("시세 업데이트 실패:", e);
    } finally {
      setIsLoadingPrices(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setInterestStocks(parsed);
        // [14차] 로드 시 즉시 시세 패칭
        fetchPrices(parsed);
      } catch (e) {
        console.error("데이터 로드 실패:", e);
      }
    }
  }, []);

  const handleAddStock = () => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return;

    const symbol = stockMap[trimmedQuery];
    if (!symbol) {
      alert("종목을 찾을 수 없습니다. 정확한 이름을 입력하세요.");
      return;
    }

    setIsSubmitting(true);
    
    if (interestStocks.some(s => s.symbol === symbol)) {
      alert("이미 추가된 종목입니다.");
      setSearchQuery('');
      setIsSubmitting(false);
      return;
    }

    const newStock: InterestStock = {
      id: Date.now(),
      name: trimmedQuery,
      symbol: symbol,
      price: null,
      change: null
    };

    const updatedList = [newStock, ...interestStocks];
    setInterestStocks(updatedList);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    setSearchQuery('');
    
    // 추가 후 시세 즉시 패칭
    fetchPrices(updatedList);
    
    setTimeout(() => {
      setIsSubmitting(false);
    }, 300);
  };

  const removeInterest = (id: string | number) => {
    if (!confirm('관심 종목에서 삭제하시겠습니까?')) return;
    
    const updatedList = interestStocks.filter(s => s.id !== id);
    setInterestStocks(updatedList);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
  };

  return (
    <div className="w-full bg-slate-50 min-h-screen">
      <header className="px-5 py-6 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
           <Link href="/" className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-blue-500 transition-colors">
             <ChevronLeft size={22} />
           </Link>
           <h1 className="text-xl font-bold tracking-tight text-slate-900">관심 종목</h1>
        </div>
        <button onClick={() => fetchPrices(interestStocks)} className="p-2 bg-slate-50 rounded-xl text-slate-400">
           <RefreshCcw size={18} className={isLoadingPrices ? 'animate-spin' : ''} />
        </button>
      </header>

      <div className="px-5 mt-6 space-y-6">
         {/* 검색 및 추가 입력창 */}
         <div className="flex gap-2">
            <div className="bg-white rounded-2xl px-5 h-14 flex items-center gap-3 border border-gray-300 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 flex-1 transition-all">
               <Search className="text-slate-300" size={20} />
               <input 
                 type="text" 
                 placeholder="종목명 입력 (예: 삼성전자, 태웅)" 
                 className="bg-transparent border-none outline-none font-bold text-base text-slate-900 w-full placeholder:text-gray-400"
                 value={searchQuery}
                 onChange={e => setSearchQuery(e.target.value)}
                 onKeyDown={e => e.key === 'Enter' && handleAddStock()}
               />
            </div>
            <button 
              onClick={handleAddStock}
              disabled={isSubmitting}
              className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100 active:scale-95 transition-all"
            >
               {isSubmitting ? <Loader2 className="animate-spin" size={24} /> : <Plus size={24} />}
            </button>
         </div>

         {/* 관심 종목 리스트 */}
         <div className="space-y-4 pb-24">
            <div className="flex justify-between items-center px-1">
               <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest leading-none">My Real-time Watchlist</h3>
               <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Live Connect Active</span>
            </div>
            
            {interestStocks.length === 0 ? (
               <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-[2.5rem]">
                  <Bot size={48} className="mx-auto mb-4 text-slate-100" />
                  <p className="text-sm font-bold text-slate-300 leading-relaxed uppercase tracking-widest">No assets saved</p>
               </div>
            ) : interestStocks.map(s => {
              const isUp = (s.change || 0) >= 0;
              return (
                <div key={s.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex justify-between items-center group active:scale-[0.99] transition-all hover:border-blue-100 relative overflow-hidden">
                   <div className="flex items-center gap-4 min-w-0 relative z-10">
                      <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
                         <Star size={22} fill="currentColor" className="opacity-80" />
                      </div>
                      <div className="min-w-0">
                         <h4 className="text-[18px] font-black text-slate-900 truncate tracking-tight">{s.name}</h4>
                         <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest leading-none">{s.symbol}</span>
                      </div>
                   </div>
                   <div className="flex items-center gap-6 relative z-10">
                      {isLoadingPrices && s.price === null ? (
                        <div className="w-24 h-10 bg-slate-50 animate-pulse rounded-xl"></div>
                      ) : (
                        <div className="text-right flex flex-col items-end gap-1.5">
                           <p className="text-[1.3rem] font-black text-slate-900 tabular-nums leading-none tracking-tighter">
                              {s.price ? s.price.toLocaleString() : '--'}
                           </p>
                           <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg flex items-center gap-1 ${isUp ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                              {s.change !== null ? (isUp ? <TrendingUp size={12}/> : <TrendingDown size={12}/>) : null}
                              {s.change !== null ? (isUp ? '+' : '') + s.change?.toFixed(2) + '%' : 'Connecting...'}
                           </span>
                        </div>
                      )}
                      <button 
                        onClick={() => removeInterest(s.id)} 
                        className="p-2.5 bg-slate-50 rounded-xl text-slate-300 hover:text-red-500 transition-all hover:bg-red-50 group/del"
                       >
                         <Trash2 size={18} className="group-hover/del:scale-110 transition-transform" />
                      </button>
                   </div>
                </div>
              );
            })}
         </div>

         {/* [14차] 지저분한 오프라인 경고창 영구 삭제 완료 */}
      </div>
    </div>
  );
}
