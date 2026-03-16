"use client";

import React, { useState, useEffect } from 'react';
import { 
  RefreshCcw, Search, ChevronLeft, Star, Trash2, Plus, Loader2, AlertCircle, Bot
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

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
  "현대차": "005380.KS"
};

export default function WatchlistPage() {
  const [interestStocks, setInterestStocks] = useState<InterestStock[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // [8차 수정] alerts -> interest_stocks 테이블명 변경 및 필드명(stock_code) 대응
  const fetchInterests = async () => {
    try {
      const { data } = await supabase.from('interest_stocks').select('*').order('created_at', { ascending: false });
      if (data) {
        setInterestStocks(data.map(item => ({
          id: item.id, 
          name: item.stock_name || item.stock_code, // stock_name 컬럼이 없을 경우 대비
          symbol: item.stock_code, 
          price: null, 
          change: null
        })));
      }
    } catch (e) {}
  };

  const fetchPrices = async (silent = false) => {
    const symbols = interestStocks.map(s => s.symbol).filter(Boolean);
    if (symbols.length === 0) {
      if (!silent) setIsRefreshing(false);
      return;
    }
    if (!silent) setIsRefreshing(true);
    try {
      const res = await fetch('/api/stock', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols }),
        cache: 'no-store'
      });
      const data = await res.json();
      setInterestStocks(prev => prev.map(s => data[s.symbol] ? { 
        ...s, price: data[s.symbol].price, change: data[s.symbol].changePercent
      } : s));
    } catch (e) {}
    finally { setIsRefreshing(false); }
  };

  // [8차 수정] 관심 종목 저장 시 interest_stocks 테이블 사용 및 필드명 정렬
  const handleAddStock = async () => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return;

    const symbol = stockMap[trimmedQuery];
    
    if (!symbol) {
      alert("검색 결과가 없습니다. (정확한 종목명을 입력하세요: 예: 태웅, 삼성전자)");
      return;
    }

    setIsSubmitting(true);
    try {
      if (interestStocks.some(s => s.symbol === symbol)) {
        alert("이미 관심 종목에 등록된 종목입니다.");
        setSearchQuery('');
        return;
      }

      // [8차 핵심] interest_stocks 스키마 준수 (stock_code)
      const { error } = await supabase.from('interest_stocks').insert([{
        stock_code: symbol,
        alert_enabled: true
      }]);

      if (error) throw error;
      
      await fetchInterests();
      setSearchQuery('');
    } catch (err: any) {
      alert("추가 실패: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeInterest = async (id: string | number) => {
    if (!confirm('관심 종목에서 삭제하시겠습니까?')) return;
    try {
      await supabase.from('interest_stocks').delete().eq('id', id);
      fetchInterests();
    } catch (err) {}
  };

  useEffect(() => {
    fetchInterests();
    const interval = setInterval(() => fetchPrices(true), 20000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { if(interestStocks.length > 0) fetchPrices(true); }, [interestStocks.length]);

  return (
    <div className="w-full bg-slate-50 min-h-screen">
      <header className="px-5 py-6 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
           <Link href="/" className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-blue-500 transition-colors">
             <ChevronLeft size={22} />
           </Link>
           <h1 className="text-xl font-bold tracking-tight text-slate-900">관심 종목</h1>
        </div>
        <button onClick={() => { fetchInterests(); fetchPrices(); }} className="p-2 bg-slate-50 rounded-xl text-slate-400">
           <RefreshCcw size={18} className={isRefreshing ? 'animate-spin text-blue-500' : ''} />
        </button>
      </header>

      <div className="px-5 mt-6 space-y-6">
         <div className="flex gap-2">
            <div className="bg-white rounded-2xl px-5 h-14 flex items-center gap-3 border border-gray-300 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 flex-1 transition-all">
               <Search className="text-slate-300" size={20} />
               <input 
                 type="text" 
                 placeholder="종목명 입력 (예: 태웅, 삼성전자)" 
                 className="bg-transparent border-none outline-none font-bold text-base text-slate-900 w-full placeholder:text-gray-400"
                 value={searchQuery}
                 onChange={e => setSearchQuery(e.target.value)}
                 onKeyPress={e => e.key === 'Enter' && handleAddStock()}
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

         <div className="space-y-4 pb-24">
            <div className="flex justify-between items-center px-1">
               <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest leading-none">My Watchlist</h3>
               <span className="text-[10px] font-bold text-slate-300">Total {interestStocks.length}</span>
            </div>
            
            {interestStocks.map(s => {
              const isUp = (s.change || 0) >= 0;
              return (
                <div key={s.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center group active:scale-[0.99] transition-all hover:border-blue-100">
                   <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
                         <Star size={20} fill="currentColor" className="opacity-80" />
                      </div>
                      <div className="min-w-0">
                         <h4 className="text-lg font-bold text-slate-900 truncate">{s.name}</h4>
                         <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest leading-none">{s.symbol}</span>
                      </div>
                   </div>
                   <div className="flex items-center gap-5">
                      <div className="text-right flex flex-col items-end gap-1.5">
                         <p className="text-xl font-bold text-slate-900 tabular-nums leading-none tracking-tight">
                            {(s.price?.toLocaleString() || '--')}
                         </p>
                         <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${isUp ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                            {isUp ? '+' : ''}{s.change?.toFixed(2)}%
                         </span>
                      </div>
                      <button 
                        onClick={() => removeInterest(s.id)} 
                        className="p-2 text-slate-200 hover:text-red-400 transition-colors"
                      >
                         <Trash2 size={18} />
                      </button>
                   </div>
                </div>
              );
            })}

            {interestStocks.length === 0 && (
               <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-3xl">
                  <Bot size={48} className="mx-auto mb-4 text-slate-100" />
                  <p className="text-sm font-bold text-slate-300">관심 종목을 검색하고 추가해보세요!</p>
               </div>
            )}
         </div>
      </div>
    </div>
  );
}
