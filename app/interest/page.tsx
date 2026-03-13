"use client";

import React, { useState } from 'react';
import { Bell, Search } from 'lucide-react';

export default function InterestPage() {
  const [interestStocks, setInterestStocks] = useState([
    { id: 1, name: '카카오', code: '035720', price: 48000, change: -1.2, alertEnabled: true },
    { id: 2, name: 'NAVER', code: '035420', price: 185000, change: 2.1, alertEnabled: true },
  ]);

  const [alerts] = useState([
    { id: 1, stockName: 'SK하이닉스', type: '외인', message: '오전 10:15 - 외국인 50,000주 순매수 포착', time: '1시간 전' },
    { id: 2, stockName: '삼성전자', type: '기관', message: '오전 09:45 - 기관 3일 연속 순매수 기록', time: '2시간 전' },
    { id: 3, stockName: '현대차', type: '실시간', message: '현재 대량 거래 동반한 기관 수급 유입 중', time: '3시간 전' },
  ]);

  const toggleAlert = (id: number) => {
    setInterestStocks(interestStocks.map((s: any) => s.id === id ? { ...s, alertEnabled: !s.alertEnabled } : s));
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="sticky top-0 z-10 py-2">
        <div className="flex items-center gap-3 px-5 py-3.5 bg-navy-900/50 border border-white/5 rounded-2xl backdrop-blur-xl shadow-xl">
          <Search size={18} className="text-slate-500" />
          <input 
            type="text" 
            placeholder="관심 종목 추가 (예: LG에너지솔루션)" 
            className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-600"
          />
        </div>
      </div>

      <section>
        <div className="flex justify-between items-center mb-4 px-1">
          <h3 className="text-lg font-bold font-heading">관심 종목 ({interestStocks.length})</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {interestStocks.map((stock: any) => (
            <div key={stock.id} className="p-4 bg-navy-900/40 border border-white/5 rounded-2xl hover:bg-navy-900/60 transition-all">
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-slate-200">{stock.name}</span>
                <button 
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                    stock.alertEnabled 
                    ? 'bg-warning/10 text-warning border border-warning/20' 
                    : 'bg-white/5 text-slate-600 border border-white/5'
                  }`}
                  onClick={() => toggleAlert(stock.id)}
                >
                  <Bell size={14} />
                </button>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold">{stock.price.toLocaleString()}원</span>
                <span className={`text-xs font-bold ${stock.change >= 0 ? 'text-stock-up' : 'text-stock-down'}`}>
                  {stock.change >= 0 ? '+' : ''}{stock.change}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex justify-between items-center mb-4 px-1">
          <h3 className="text-lg font-bold font-heading">수급 알림 히스토리</h3>
          <span className="text-xs text-slate-500">최근 24시간</span>
        </div>
        
        <div className="space-y-3">
          {alerts.map((alert: any) => (
            <div key={alert.id} className="p-4 bg-navy-900/40 border border-white/5 rounded-2xl animate-in slide-in-from-bottom-2 duration-400">
              <div className="flex justify-between items-center mb-3">
                <div className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  alert.type === '외인' ? 'bg-accent-primary/10 text-accent-primary border-accent-primary/20' :
                  alert.type === '기관' ? 'bg-accent-secondary/10 text-accent-secondary border-accent-secondary/20' :
                  'bg-success/10 text-success border-success/20'
                }`}>
                  {alert.type} 수급
                </div>
                <span className="text-[10px] text-slate-500">{alert.time}</span>
              </div>
              <div>
                <span className="font-bold text-sm block mb-1">{alert.stockName}</span>
                <p className="text-xs text-slate-400 leading-relaxed">{alert.message}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
