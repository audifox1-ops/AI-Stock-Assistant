"use client";

import React, { useState } from 'react';
import { Bell, Search, Plus, Trash2 } from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';

interface InterestStock {
  id: number;
  name: string;
  code: string;
  price: number;
  change: number;
  alertEnabled: boolean;
}

export default function InterestPage() {
  const { notifications } = useNotifications();
  const [interestStocks, setInterestStocks] = useState<InterestStock[]>([
    { id: 1, name: '카카오', code: '035720', price: 48000, change: -1.2, alertEnabled: true },
    { id: 2, name: 'NAVER', code: '035420', price: 185000, change: 2.1, alertEnabled: true },
  ]);
  const [searchTerm, setSearchTerm] = useState('');

  const toggleAlert = (id: number) => {
    setInterestStocks(interestStocks.map(s => s.id === id ? { ...s, alertEnabled: !s.alertEnabled } : s));
  };

  const removeStock = (id: number) => {
    if (confirm('관심 종목에서 삭제할까요?')) {
      setInterestStocks(interestStocks.filter(s => s.id !== id));
    }
  };

  const addStock = () => {
    if (!searchTerm) return;
    const newStock: InterestStock = {
      id: Date.now(),
      name: searchTerm,
      code: '000000',
      price: 50000,
      change: 0,
      alertEnabled: true
    };
    setInterestStocks([...interestStocks, newStock]);
    setSearchTerm('');
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 p-6 pb-24">
      <h2 className="text-2xl font-bold font-heading">관심 종목</h2>
      
      {/* Search & Add */}
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-slate-800 border border-white/5 rounded-2xl shadow-xl">
          <Search size={18} className="text-slate-500" />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addStock()}
            placeholder="종목 추가 (예: 삼성전자)" 
            className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-600"
          />
        </div>
        <button 
          onClick={addStock}
          className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg active:scale-95 transition-all"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* Watchlist */}
      <section>
        <div className="flex justify-between items-center mb-4 px-1">
          <h3 className="text-lg font-bold font-heading">실시간 시세 ({interestStocks.length})</h3>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {interestStocks.map(stock => (
            <div key={stock.id} className="p-5 bg-slate-800 border border-white/5 rounded-3xl hover:border-blue-500/30 transition-all flex justify-between items-center group">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-slate-100">{stock.name}</span>
                  <span className="text-[10px] text-slate-500">{stock.code}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{stock.price.toLocaleString()}원</span>
                  <span className={`text-xs font-bold ${stock.change >= 0 ? 'text-red-500' : 'text-blue-400'}`}>
                    {stock.change >= 0 ? '+' : ''}{stock.change}%
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    stock.alertEnabled 
                    ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' 
                    : 'bg-white/5 text-slate-600 border border-white/5'
                  }`}
                  onClick={() => toggleAlert(stock.id)}
                >
                  <Bell size={18} />
                </button>
                <button 
                  onClick={() => removeStock(stock.id)}
                  className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center opacitiy-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Notifications History */}
      <section>
        <div className="flex justify-between items-center mb-4 px-1">
          <h3 className="text-lg font-bold font-heading">수급 알림 히스토리</h3>
          <span className="text-xs text-slate-500">최근 24시간</span>
        </div>
        
        <div className="space-y-3">
          {notifications.map(notif => (
            <div key={notif.id} className={`p-5 border rounded-3xl transition-all ${notif.isRead ? 'bg-slate-800/40 border-white/5' : 'bg-slate-800 border-blue-500/20 shadow-lg'}`}>
              <div className="flex justify-between items-center mb-3">
                <div className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  notif.type === 'supply' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                  notif.type === 'target' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                  'bg-slate-700 text-slate-300 border-slate-600'
                }`}>
                  {notif.type === 'supply' ? '수급 발생' : notif.type === 'target' ? '목표 도달' : '알림'}
                </div>
                <span className="text-[10px] text-slate-500 font-medium">{notif.time}</span>
              </div>
              <div>
                <span className="font-bold text-slate-100 block mb-1">{notif.stockName}</span>
                <p className="text-xs text-slate-400 leading-relaxed">{notif.message}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
