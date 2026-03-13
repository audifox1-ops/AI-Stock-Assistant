"use client";

import React, { useState, useEffect } from 'react';
import { Bell, Search, Plus, Trash2, RefreshCcw } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface InterestStock {
  id: string | number;
  name: string;
  symbol: string;
  price: number | null;
  change: number | null;
  alertEnabled: boolean;
  fetchError?: boolean;
}

const INTERESTS_STORAGE_KEY = 'ai_stock_interests';

export default function InterestPage() {
  const [interestStocks, setInterestStocks] = useState<InterestStock[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // 1. 데이터 불러오기 (Supabase -> LocalStorage -> State)
  const fetchInterests = async () => {
    setIsInitialLoading(true);
    let finalStocks: InterestStock[] = [];

    // 로컬 스토리지 우선 복구
    const localData = localStorage.getItem(INTERESTS_STORAGE_KEY);
    if (localData) {
      try {
        finalStocks = JSON.parse(localData);
        setInterestStocks(finalStocks);
      } catch (e) {
        console.error("Local storage error:", e);
      }
    }

    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const mapped: InterestStock[] = data.map(item => ({
          id: item.id,
          name: item.stock_name,
          symbol: item.symbol,
          price: null,
          change: null,
          alertEnabled: item.alert_enabled,
        }));
        localStorage.setItem(INTERESTS_STORAGE_KEY, JSON.stringify(mapped));
        setInterestStocks(mapped);
        finalStocks = mapped;
      }
    } catch (err) {
      console.error("Supabase fetch failed (Interests):", err);
    } finally {
      setIsInitialLoading(false);
    }
    return finalStocks;
  };

  // 2. 실시간 시세 연동
  const fetchPrices = async (targetStocks?: InterestStock[]) => {
    const list = targetStocks || interestStocks;
    if (list.length === 0) return;

    setIsRefreshing(true);
    try {
      const symbols = list.map(s => s.symbol).filter(Boolean);
      const res = await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols })
      });
      const data = await res.json();

      setInterestStocks(prev => {
        const next = prev.map(stock => {
          const live = data[stock.symbol];
          if (live && live.success) {
            return { ...stock, price: live.price, change: live.changePercent, fetchError: false };
          } else if (live && live.error) {
            return { ...stock, fetchError: true };
          }
          return stock;
        });
        localStorage.setItem(INTERESTS_STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    } catch (err) {
      console.error("Price fetch error (Interests):", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const loaded = await fetchInterests();
      if (loaded.length > 0) {
        fetchPrices(loaded);
      }
    };
    init();
  }, []);

  const addStock = async () => {
    if (!searchTerm) return;
    
    let symbol = searchTerm.toUpperCase().trim();
    // 심볼 형식 보정 (한글 이름 입력 시 처리 필요하지만 일단 심볼로 가정)
    if (!symbol.includes('.') && /^\d{6}$/.test(symbol)) {
      symbol += '.KS';
    }

    try {
      const { data, error } = await supabase
        .from('alerts')
        .insert([{
          symbol: symbol,
          stock_name: searchTerm, // 이름도 일단 입력값으로
          alert_enabled: true
        }])
        .select();

      if (error) throw error;

      if (data && data[0]) {
        const newItem: InterestStock = {
          id: data[0].id,
          name: data[0].stock_name,
          symbol: data[0].symbol,
          price: null,
          change: null,
          alertEnabled: true
        };
        const updated = [newItem, ...interestStocks];
        setInterestStocks(updated);
        localStorage.setItem(INTERESTS_STORAGE_KEY, JSON.stringify(updated));
        setSearchTerm('');
        fetchPrices(updated);
      }
    } catch (err) {
      console.error("Error adding interest stock:", err);
      // 로컬 강제 추가 (동기화 보장)
      const tempId = Date.now();
      const newItem: InterestStock = { id: tempId, name: searchTerm, symbol, price: null, change: null, alertEnabled: true };
      const updated = [newItem, ...interestStocks];
      setInterestStocks(updated);
      localStorage.setItem(INTERESTS_STORAGE_KEY, JSON.stringify(updated));
      alert("DB 저장 실패 - 로컬에 임시 저장되었습니다.");
    }
  };

  const removeStock = async (id: string | number) => {
    if (!confirm('관심 종목에서 삭제할까요?')) return;

    try {
      const { error } = await supabase
        .from('alerts')
        .delete()
        .eq('id', id);

      const updated = interestStocks.filter(s => s.id !== id);
      setInterestStocks(updated);
      localStorage.setItem(INTERESTS_STORAGE_KEY, JSON.stringify(updated));

      if (error) console.error("Supabase delete failed:", error);
    } catch (err) {
      console.error("Remove failed:", err);
    }
  };

  const toggleAlert = async (id: string | number, current: boolean) => {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({ alert_enabled: !current })
        .eq('id', id);

      setInterestStocks(prev => prev.map(s => s.id === id ? { ...s, alertEnabled: !current } : s));
      
      if (error) throw error;
    } catch (err) {
      console.error("Alert toggle error:", err);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 p-6 pb-32">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black font-heading bg-gradient-to-r from-blue-500 to-indigo-400 bg-clip-text text-transparent">관심 종목</h2>
        <button 
          onClick={() => fetchPrices()} 
          disabled={isRefreshing}
          className="p-2 bg-slate-800 rounded-xl border border-white/5 text-slate-400 hover:text-blue-400 active:scale-95 transition-all disabled:opacity-50"
        >
          <RefreshCcw size={16} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      </div>
      
      {/* Search & Add */}
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-3 px-4 py-4 bg-slate-800 border border-white/5 rounded-2xl shadow-xl focus-within:border-blue-500/50 transition-all">
          <Search size={18} className="text-slate-500" />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addStock()}
            placeholder="추가할 종목코드 또는 이름 (005930.KS)" 
            className="bg-transparent border-none outline-none text-sm w-full font-bold placeholder:text-slate-600 text-slate-100"
          />
        </div>
        <button 
          onClick={addStock}
          className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg active:scale-95 hover:bg-blue-600 transition-all"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* Watchlist */}
      <section>
        <div className="flex justify-between items-center mb-6 px-1">
          <h3 className="text-lg font-black text-slate-200">실시간 관심 시세 ({interestStocks.length})</h3>
        </div>
        
        {isInitialLoading && interestStocks.length === 0 ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>
        ) : interestStocks.length === 0 ? (
          <div className="py-12 bg-slate-800/20 border border-dashed border-white/10 rounded-3xl text-center text-slate-500 font-bold">등록된 관심 종목이 없습니다.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {interestStocks.map(stock => (
              <div key={stock.id} className="p-6 bg-slate-800/40 border border-white/5 rounded-[2rem] hover:bg-slate-800/60 transition-all flex justify-between items-center group relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/20"></div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-black text-lg text-slate-100">{stock.name}</span>
                    <span className="text-[10px] text-slate-500 font-bold bg-slate-900 px-2 py-0.5 rounded border border-white/5">{stock.symbol}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {stock.price === null ? (
                      <span className="text-sm text-slate-600 animate-pulse font-bold tracking-tighter">불러오는 중...</span>
                    ) : stock.fetchError ? (
                      <span className="text-xs text-red-500/70 font-black italic">데이터 오류</span>
                    ) : (
                      <>
                        <span className="text-xl font-black text-slate-100">{stock.price.toLocaleString()}원</span>
                        <div className={`flex items-center gap-0.5 text-xs font-black ${stock.change && stock.change >= 0 ? 'text-red-500' : 'text-blue-400'}`}>
                          {stock.change && stock.change >= 0 ? '▲' : '▼'}{stock.change ? Math.abs(stock.change).toFixed(2) : '0.00'}%
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => toggleAlert(stock.id, stock.alertEnabled)}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                      stock.alertEnabled 
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' 
                      : 'bg-slate-900/60 text-slate-600 border border-white/5'
                    }`}
                  >
                    <Bell size={20} className={stock.alertEnabled ? 'animate-bounce' : ''} />
                  </button>
                  <button 
                    onClick={() => removeStock(stock.id)}
                    className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
