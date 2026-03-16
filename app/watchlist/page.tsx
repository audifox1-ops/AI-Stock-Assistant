"use client";

import React, { useState, useEffect } from 'react';
import { 
  RefreshCcw, Search, ChevronLeft, Star, Trash2, Plus, Loader2, AlertCircle, Bot
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
  "현대차": "005380.KS"
};

export default function WatchlistPage() {
  const [interestStocks, setInterestStocks] = useState<InterestStock[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // [9차 핵심] DB 호출 대신 localStorage에서 데이터 불러오기
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setInterestStocks(JSON.parse(saved));
      } catch (e) {
        console.error("데이터 로드 실패:", e);
      }
    }
  }, []);

  // [9차 핵심] API 통신 코드를 전면 삭제하라는 지침에 따라 fetchPrices 제거

  // [9차 핵심] 종목 추가 로직 - localStorage 기반으로 수정
  const handleAddStock = () => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return;

    // 이름으로 티커 찾기
    const symbol = stockMap[trimmedQuery];
    
    if (!symbol) {
      alert("검색 결과가 없습니다. (정확한 종목명을 입력하세요: 예: 태웅, 삼성전자)");
      return;
    }

    setIsSubmitting(true);
    
    // 중복 체크
    if (interestStocks.some(s => s.symbol === symbol)) {
      alert("이미 관심 종목에 등록된 종목입니다.");
      setSearchQuery('');
      setIsSubmitting(false);
      return;
    }

    // 새 종목 객체 생성
    const newStock: InterestStock = {
      id: Date.now(), // 로컬 ID 생성
      name: trimmedQuery,
      symbol: symbol,
      price: null,
      change: null
    };

    // 상태 업데이트 및 localStorage 저장
    const updatedList = [newStock, ...interestStocks];
    setInterestStocks(updatedList);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    
    setSearchQuery('');
    
    // 추가 성공 후 즉각 렌더링을 위해 인위적인 딜레이(UI 피드백) 후 종료
    setTimeout(() => {
      setIsSubmitting(false);
    }, 300);
  };

  // [9차 핵심] 종목 삭제 로직 - localStorage 반영
  const removeInterest = (id: string | number) => {
    if (!confirm('관심 종목에서 삭제하시겠습니까?')) return;
    
    const updatedList = interestStocks.filter(s => s.id !== id);
    setInterestStocks(updatedList);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
  };

  return (
    <div className="w-full bg-slate-50 min-h-screen">
      {/* 헤더 */}
      <header className="px-5 py-6 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
           <Link href="/" className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-blue-500 transition-colors">
             <ChevronLeft size={22} />
           </Link>
           <h1 className="text-xl font-bold tracking-tight text-slate-900">관심 종목</h1>
        </div>
        <div className="p-2 bg-slate-50 rounded-xl text-slate-200">
           <RefreshCcw size={18} title="오프라인 모드" />
        </div>
      </header>

      <div className="px-5 mt-6 space-y-6">
         {/* 검색 및 추가 입력창 */}
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

         {/* 관심 종목 리스트 - localStorage 직접 렌더링 */}
         <div className="space-y-4 pb-24">
            <div className="flex justify-between items-center px-1">
               <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest leading-none">Local Watchlist</h3>
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
                            {s.price ? s.price.toLocaleString() : '--'}
                         </p>
                         <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${isUp ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                            {s.change !== null ? (isUp ? '+' : '') + s.change?.toFixed(2) + '%' : '연결 안됨'}
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
                  <p className="text-sm font-bold text-slate-300">기기에 저장된 종목이 없습니다.<br/>검색하여 추가해보세요!</p>
               </div>
            )}
         </div>

         <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] font-bold text-blue-600/70 leading-relaxed">
               현재 시스템은 오프라인 모드로 작동 중입니다. 데이터는 브라우저(`localStorage`)에만 저장되며, 앱 삭제 또는 데이터 삭제 시 초기화됩니다. 시세 정보를 보려면 추후 DB 연결이 필요합니다.
            </p>
         </div>
      </div>
    </div>
  );
}
