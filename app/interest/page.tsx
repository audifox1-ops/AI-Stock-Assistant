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
  updatedAt?: string;
}

export default function InterestPage() {
  const [interestStocks, setInterestStocks] = useState<InterestStock[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // 1. 데이터 불러오기
  const fetchInterests = async () => {
    setIsInitialLoading(true);
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const mapped: InterestStock[] = data.map(item => ({
          id: item.id,
          name: item.stock_name,
          symbol: item.symbol,
          price: null,
          change: null,
          alertEnabled: item.alert_enabled,
        }));
        setInterestStocks(mapped);
        return mapped;
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsInitialLoading(false);
    }
    return [];
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
        body: JSON.stringify({ symbols }),
        cache: 'no-store'
      });
      const data = await res.json();

      setInterestStocks(prev => prev.map(stock => {
        const live = data[stock.symbol];
        if (live && live.success) {
          return { 
            ...stock, 
            price: live.price, 
            change: live.changePercent, 
            fetchError: false,
            updatedAt: live.updatedAt
          };
        }
        return stock;
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const loaded = await fetchInterests();
      if (loaded.length > 0) fetchPrices(loaded);
    };
    init();
    
    const interval = setInterval(() => {
      setInterestStocks(curr => {
        fetchPrices(curr);
        return curr;
      });
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const addStock = async () => {
    if (!searchTerm) return;
    let symbol = searchTerm.toUpperCase().trim();
    if (!symbol.includes('.') && /^\d{6}$/.test(symbol)) symbol += '.KS';

    try {
      const { data, error } = await supabase.from('alerts').insert([{
        symbol: symbol,
        stock_name: searchTerm,
        alert_enabled: true
      }]).select();

      if (!error && data && data[0]) {
        fetchInterests().then(loaded => fetchPrices(loaded));
        setSearchTerm('');
      }
    } catch (err) { console.error(err); }
  };

  const removeStock = async (id: string | number) => {
    if (!confirm('삭제할까요?')) return;
    try {
      await supabase.from('alerts').delete().eq('id', id);
      setInterestStocks(prev => prev.filter(s => s.id !== id));
    } catch (err) { console.error(err); }
  };

  const toggleAlert = async (id: string | number, current: boolean) => {
    try {
      await supabase.from('alerts').update({ alert_enabled: !current }).eq('id', id);
      setInterestStocks(prev => prev.map(s => s.id === id ? { ...s, alertEnabled: !current } : s));
    } catch (err) { console.error(err); }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 pb-44 animate-in fade-in duration-500 overflow-x-hidden">
      <div className="max-w-xl mx-auto">
        <header className="flex justify-between items-center mb-10">
          <h2 className="text-3xl font-black text-gray-900">관심 종목</h2>
          <button 
            onClick={() => fetchPrices()} 
            disabled={isRefreshing}
            className="p-3 bg-white border border-gray-100 rounded-2xl shadow-sm text-gray-400 hover:text-blue-500 active:scale-95 transition-all"
          >
            <RefreshCcw size={20} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </header>
        
        <div className="flex gap-3 mb-12">
          <div className="flex-1 flex items-center gap-3 px-6 py-5 bg-white border border-gray-100 rounded-[2rem] shadow-sm focus-within:border-blue-400/50 transition-all">
            <Search size={22} className="text-gray-300" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addStock()}
              placeholder="종목명 또는 코드 입력" 
              className="bg-transparent border-none outline-none text-lg w-full font-bold text-gray-900"
            />
          </div>
          <button 
            onClick={addStock}
            className="w-16 h-16 bg-[#3182f6] rounded-2xl flex items-center justify-center text-white shadow-lg active:scale-95 transition-all"
          >
            <Plus size={30} strokeWidth={3} />
          </button>
        </div>

        <section>
          <div className="flex justify-between items-center mb-8 px-2">
            <h3 className="text-xl font-bold text-gray-900">실시간 관심 시세</h3>
            <span className="text-sm font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{interestStocks.length}</span>
          </div>
          
          {isInitialLoading && interestStocks.length === 0 ? (
            <div className="py-20 flex justify-center"><div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>
          ) : interestStocks.length === 0 ? (
            <div className="py-20 bg-white border border-dashed border-gray-100 rounded-3xl text-center text-gray-400 font-bold">등록된 관심 종목이 없습니다.</div>
          ) : (
            <div className="space-y-4">
              {interestStocks.map(stock => {
                const isUp = (stock.change || 0) >= 0;
                return (
                  <div 
                    key={stock.id} 
                    className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-row items-center justify-between transition-all hover:border-blue-100"
                  >
                    <div className="flex flex-col min-w-0 flex-1">
                      <h4 className="text-xl font-bold text-gray-900 mb-1 truncate uppercase">
                        {stock.name}
                      </h4>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded uppercase">
                          {stock.symbol}
                        </span>
                        {stock.updatedAt && (
                          <span className="text-[10px] font-bold text-gray-400">
                            {stock.updatedAt} {'기준'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-row items-center gap-6 flex-shrink-0 ml-4">
                      <div className="text-right">
                        <p className="text-xl font-black text-gray-900 leading-tight">
                          {(stock.price?.toLocaleString() || '--')}{'원'}
                        </p>
                        <p className={`text-xs font-black mt-1 ${isUp ? 'text-red-500' : 'text-blue-600'}`}>
                          {isUp ? '\u25B2' : '\u25BC'}{Math.abs(stock.change || 0).toFixed(2)}%
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2 border-l border-gray-100 pl-6 ml-2">
                        <button 
                          onClick={() => toggleAlert(stock.id, stock.alertEnabled)}
                          className={`p-3 rounded-xl transition-all ${stock.alertEnabled ? 'text-blue-500 bg-blue-50' : 'text-gray-300 bg-gray-50'}`}
                        >
                          <Bell size={20} className={stock.alertEnabled ? 'animate-bounce' : ''} />
                        </button>
                        <button 
                          onClick={() => removeStock(stock.id)}
                          className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
