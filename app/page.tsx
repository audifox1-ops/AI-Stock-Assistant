"use client";

import React, { useState, useEffect } from 'react';
import { Plus, X, RefreshCcw, Bell, Trash2, BellRing } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// --- Interfaces ---
interface AiAnalysisResult {
  position: string;
  action: string;
  targetPrice: number;
  reason: string;
}

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
  analysis?: AiAnalysisResult;
  error?: string;
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

// --- Utility: Base64 to Uint8Array for VAPID ---
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// --- Skeleton UI ---
const SkeletonCircle = () => (
  <div className="w-16 h-16 bg-gray-100 rounded-2xl animate-pulse"></div>
);

export default function PortfolioPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [interestStocks, setInterestStocks] = useState<InterestStock[]>([]);
  const [marketIndices, setMarketIndices] = useState<MarketIndex[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMarketLoading, setIsMarketLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [pushSubscription, setPushSubscription] = useState<any>(null);

  const [newStock, setNewStock] = useState<Partial<Stock>>({
    name: '', symbol: '', avgPrice: 0, quantity: 0, type: '스윙', target: 0, stopLoss: 0
  });

  // 1. 서비스 워커 등록 및 푸시 구독 로직
  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => {
          console.log('[SW] Registered:', reg);
          return reg.pushManager.getSubscription();
        })
        .then(sub => {
          if (sub) {
            console.log('[Push] Existing Sub:', sub);
            setPushSubscription(sub);
          }
        })
        .catch(err => console.error('[SW/Push] Error:', err));
    }
  }, []);

  const requestNotificationPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
        });
        console.log('[Push] New Sub:', JSON.stringify(sub));
        setPushSubscription(sub);
        alert('알림 권한이 승인되었습니다!');

        // 테스트 발송 호출
        await fetch('/api/push', {
          method: 'POST',
          body: JSON.stringify({
            subscription: sub,
            title: "AI Stock 알림 활성화",
            body: "이제 실시간 목표가 알림을 브라우저로 받으실 수 있습니다.",
            url: "/"
          })
        });
      }
    } catch (err) {
      console.error('[Push] Subscribe failed:', err);
      alert('알림 구독에 실패했습니다.');
    }
  };

  // Data Fetching
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
      if (error) throw error;
      if (data) {
        const mapped = data.map(item => ({
          id: item.id, symbol: item.symbol, name: item.stock_name,
          avgPrice: Number(item.avg_buy_price), currentPrice: null, quantity: Number(item.quantity),
          type: item.position_type as string, target: Number(item.target_price), stopLoss: Number(item.stop_loss),
        }));
        setStocks(mapped);
        return mapped;
      }
    } catch (err) { console.error(err); }
    return [];
  };

  const fetchInterests = async () => {
    try {
      const { data, error } = await supabase.from('alerts').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (data) {
        const mapped = data.map(item => ({
          id: item.id, name: item.stock_name, symbol: item.symbol, price: null, change: null, alertEnabled: item.alert_enabled,
        }));
        setInterestStocks(mapped);
        return mapped;
      }
    } catch (err) { console.error(err); }
    return [];
  };

  const fetchPrices = async (targetStocks: Stock[], targetInterests: InterestStock[], silent = false) => {
    if (targetStocks.length === 0 && targetInterests.length === 0) return;
    if (!silent) setIsRefreshing(true);
    try {
      const symbols = Array.from(new Set([...targetStocks.map(s => s.symbol), ...targetInterests.map(s => s.symbol)])).filter(Boolean);
      const res = await fetch('/api/stock', { method: 'POST', body: JSON.stringify({ symbols }), cache: 'no-store' });
      const data = await res.json();
      
      setStocks(prev => prev.map(s => data[s.symbol] ? { ...s, currentPrice: data[s.symbol].price, changePercent: data[s.symbol].changePercent, updatedAt: data[s.symbol].updatedAt } : s));
      setInterestStocks(prev => prev.map(s => data[s.symbol] ? { ...s, price: data[s.symbol].price, change: data[s.symbol].changePercent, updatedAt: data[s.symbol].updatedAt } : s));
    } catch (error) { console.error(error); }
    finally { if (!silent) setIsRefreshing(false); }
  };

  useEffect(() => {
    const init = async () => {
      setIsInitialLoading(true);
      fetchMarketIndices();
      const [h, i] = await Promise.all([fetchHoldings(), fetchInterests()]);
      await fetchPrices(h, i);
      setIsInitialLoading(false);
    };
    init();

    const interval = setInterval(() => {
      fetchMarketIndices(true);
      setStocks(curr => {
        setInterestStocks(iCurr => { fetchPrices(curr, iCurr, true); return iCurr; });
        return curr;
      });
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleAddStock = async () => {
    if (!newStock.name || !newStock.avgPrice || !newStock.symbol) return;
    try {
      const { data, error } = await supabase.from('holdings').insert([{
        symbol: newStock.symbol.toUpperCase(), stock_name: newStock.name, avg_buy_price: Number(newStock.avgPrice),
        quantity: Number(newStock.quantity), position_type: newStock.type,
        target_price: Number(newStock.target), stop_loss: Number(newStock.stopLoss)
      }]).select();
      if (!error) { fetchHoldings().then(h => fetchPrices(h, interestStocks)); setIsAddModalOpen(false); }
    } catch (err) { console.error(err); }
  };

  const removeInterest = async (id: string | number) => {
    if (!confirm('삭제할까요?')) return;
    try { await supabase.from('alerts').delete().eq('id', id); setInterestStocks(prev => prev.filter(s => s.id !== id)); } catch (err) {}
  };

  return (
    <div className="min-h-screen bg-gray-50/30 text-[#191f28] pb-44 animate-in fade-in duration-500 overflow-x-hidden overflow-y-visible">
      {/* Header */}
      <header className="w-full px-8 pt-14 pb-8 overflow-hidden box-border bg-white border-b border-gray-100">
        <div className="flex justify-between items-center mb-12 overflow-visible">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-black tracking-tight text-[#3182f6]">AI Stock</h1>
            {/* [지시사항] 알림 설정 버튼 */}
            {!pushSubscription && (
              <button 
                onClick={requestNotificationPermission}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-500 rounded-full text-xs font-bold animate-pulse"
              >
                <BellRing size={16} /> 알림 연동
              </button>
            )}
          </div>
          <div className="flex gap-6 overflow-visible">
            <button onClick={() => { fetchMarketIndices(); fetchPrices(stocks, interestStocks); }} className="p-4 text-gray-400 bg-gray-50 rounded-full shadow-sm hover:bg-gray-100">
              <RefreshCcw size={24} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => setIsAddModalOpen(true)} className="p-4 text-[#3182f6] bg-blue-50 rounded-full shadow-sm hover:bg-blue-100">
              <Plus size={30} strokeWidth={3} />
            </button>
          </div>
        </div>

        <div className="flex gap-10 items-center overflow-x-auto no-scrollbar py-4 w-full">
          {isMarketLoading ? <div className="w-40 h-4 bg-gray-100 animate-pulse rounded" /> : marketIndices.map(market => (
            <div key={market.symbol} className="flex flex-col gap-1 min-w-fit">
              <div className="flex items-center gap-4 whitespace-nowrap">
                <span className="text-sm font-black text-gray-400">{market.name}</span>
                <span className={`text-lg font-black ${market.changePercent >= 0 ? 'text-red-500' : 'text-blue-600'}`}>{market.price.toLocaleString()}</span>
                <span className={`text-xs font-black px-10 py-3 rounded-full ${market.changePercent >= 0 ? 'text-red-500 bg-red-50' : 'text-blue-600 bg-blue-50'}`}>{market.changePercent >= 0 ? '▲' : '▼'}{Math.abs(market.changePercent).toFixed(1)}%</span>
              </div>
              <p className="text-[10px] text-gray-400 font-bold ml-1">({market.updatedAt || '--:--:--'} 기준)</p>
            </div>
          ))}
        </div>
      </header>

      {/* Asset Summary */}
      <section className="px-8 py-12 bg-white">
        <p className="text-sm font-black text-gray-400 mb-3 tracking-wider uppercase">Portfolio Balance</p>
        <div className="flex flex-wrap items-center gap-6 overflow-visible">
          <h2 className="text-5xl font-black tracking-tight leading-none overflow-visible">{totalCurrentAmount.toLocaleString()}원</h2>
          <div className={`px-10 py-3 rounded-full text-sm font-black min-w-max shadow-sm border ${parseFloat(totalRate) >= 0 ? 'text-red-600 bg-red-50 border-red-100' : 'text-blue-600 bg-blue-50 border-blue-100'}`}>
            {parseFloat(totalRate) >= 0 ? '+' : ''}{totalRate}%
          </div>
        </div>
      </section>

      {/* Interests Section - 모던 클린 카드형 */}
      <section className="px-8 py-12 bg-gray-50/50">
        <h3 className="text-2xl font-black mb-12">관심있는 종목</h3>
        <div className="space-y-4">
          {interestStocks.map(stock => {
            const isUp = (stock.change || 0) >= 0;
            return (
              <div key={stock.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-row items-center justify-between transition-all hover:bg-gray-50">
                <div className="flex flex-col min-w-0 flex-1">
                  <h4 className="text-xl font-bold text-gray-900 mb-1 truncate uppercase">{stock.name}</h4>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded uppercase">{stock.symbol}</span>
                    {stock.updatedAt && <span className="text-[10px] font-bold text-gray-400">{stock.updatedAt} 기준</span>}
                  </div>
                </div>
                <div className="flex flex-row items-center gap-6 flex-shrink-0 ml-4">
                  <div className="text-right">
                    <p className="text-xl font-black text-gray-900 leading-tight">{(stock.price?.toLocaleString() || '--')}원</p>
                    <p className={`text-xs font-black mt-1 ${isUp ? 'text-red-500' : 'text-blue-600'}`}>{isUp ? '▲' : '▼'}{Math.abs(stock.change || 0).toFixed(2)}%</p>
                  </div>
                  <div className="flex items-center gap-3 border-l border-gray-100 pl-6 ml-2">
                    <button className={`p-3 rounded-xl transition-all ${stock.alertEnabled ? 'text-blue-500 bg-blue-50' : 'text-gray-300 bg-gray-50'}`}><Bell size={20} /></button>
                    <button onClick={() => removeInterest(stock.id)} className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={20} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] bg-white p-10 pt-28 flex flex-col animate-in slide-in-from-bottom duration-500 overflow-visible">
          <div className="flex justify-between items-start mb-20 overflow-visible">
            <h2 className="text-5xl font-black leading-[1.1]">자산 등록</h2>
            <button onClick={() => setIsAddModalOpen(false)} className="p-5 bg-gray-100 rounded-full text-gray-400"><X size={32} /></button>
          </div>
          <div className="space-y-14 flex-1 overflow-y-auto no-scrollbar pb-10">
            <div className="space-y-4">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-2">종목 코드 (6자리)</label>
              <input type="text" className="w-full border-b-[5px] border-gray-100 py-6 text-3xl font-black focus:border-[#3182f6] outline-none placeholder:text-gray-200 bg-transparent" placeholder="005930" value={newStock.symbol} onChange={e => setNewStock({...newStock, symbol: e.target.value})} />
            </div>
            <div className="space-y-4">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-2">관리용 명칭</label>
              <input type="text" className="w-full border-b-[5px] border-gray-100 py-6 text-3xl font-black focus:border-[#3182f6] outline-none placeholder:text-gray-200 bg-transparent" placeholder="삼성전자" value={newStock.name} onChange={e => setNewStock({...newStock, name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-12">
              <input type="number" className="w-full border-b-[5px] border-gray-100 py-4 text-2xl font-black focus:border-[#3182f6] outline-none bg-transparent" placeholder="평단가" value={newStock.avgPrice || ''} onChange={e => setNewStock({...newStock, avgPrice: Number(e.target.value)})} />
              <input type="number" className="w-full border-b-[5px] border-gray-100 py-4 text-2xl font-black focus:border-[#3182f6] outline-none bg-transparent" placeholder="수량" value={newStock.quantity || ''} onChange={e => setNewStock({...newStock, quantity: Number(e.target.value)})} />
            </div>
          </div>
          <button onClick={handleAddStock} className="w-full py-8 bg-[#3182f6] text-white rounded-[3rem] font-black text-3xl shadow-2xl active:scale-95 transition-all mb-14">연결하기</button>
        </div>
      )}
    </div>
  );
}
