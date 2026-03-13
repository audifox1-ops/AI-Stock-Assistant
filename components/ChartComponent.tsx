"use client";

import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { 
  LayoutDashboard, 
  Bell, 
  TrendingUp, 
  TrendingDown, 
  Sparkles
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface StockData {
  id: string | number;
  symbol: string;
  name: string;
}

interface ChartData {
  date: string;
  price: number;
}

export default function ChartComponent() {
  const [activeTab, setActiveTab] = useState<'holdings' | 'interests'>('holdings');
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        if (activeTab === 'holdings') {
          const { data } = await supabase.from('holdings').select('id, symbol, stock_name');
          if (data) {
            const mapped = data.map(d => ({ id: d.id, symbol: d.symbol, name: d.stock_name }));
            setStocks(mapped);
            if (mapped.length > 0) setSelectedStock(mapped[0]);
          }
        } else {
          const { data } = await supabase.from('alerts').select('id, symbol, stock_name');
          if (data) {
            const mapped = data.map(d => ({ id: d.id, symbol: d.symbol, name: d.stock_name }));
            setStocks(mapped);
            if (mapped.length > 0) setSelectedStock(mapped[0]);
          }
        }
      } catch (error) { console.error(error); } 
      finally { setIsLoading(false); }
    };
    fetchData();
  }, [activeTab]);

  useEffect(() => {
    if (selectedStock) {
      const fetchHistory = async () => {
        setIsDataLoading(true);
        try {
          const res = await fetch(`/api/history?symbol=${selectedStock.symbol}`);
          const data = await res.json();
          setChartData(Array.isArray(data) ? data : []);
        } catch (error) { setChartData([]); }
        finally { setIsDataLoading(false); }
      };
      fetchHistory();
    }
  }, [selectedStock]);

  const isTrendUp = chartData.length >= 2 && chartData[chartData.length - 1].price >= chartData[0].price;
  const trendColor = isTrendUp ? '#ef4444' : '#3b82f6';
  const trendGradient = isTrendUp ? 'url(#colorUp)' : 'url(#colorDown)';

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 p-3 rounded-2xl shadow-xl">
          <p className="text-[10px] text-gray-400 font-bold mb-1">{label}</p>
          <p className="text-sm font-bold text-gray-800">{payload[0].value.toLocaleString()}원</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-32 font-sans p-6 animate-in fade-in duration-500">
      <header className="mb-8">
        <h1 className="text-2xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent italic tracking-tighter mb-5">Stock Charts</h1>
        <div className="flex p-1.5 bg-gray-200/50 border border-gray-200 rounded-[2rem] gap-1">
          <button onClick={() => setActiveTab('holdings')} className={`flex-1 py-3 px-4 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'holdings' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><LayoutDashboard size={14} /> 보유종목</button>
          <button onClick={() => setActiveTab('interests')} className={`flex-1 py-3 px-4 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'interests' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Bell size={14} /> 관심종목</button>
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-6 scrollbar-none">
        {stocks.map(stock => (
          <button key={stock.id} onClick={() => setSelectedStock(stock)} className={`min-w-[130px] p-5 rounded-[2rem] border transition-all text-left shadow-sm ${selectedStock?.id === stock.id ? 'bg-blue-600 border-blue-600 text-white shadow-blue-100' : 'bg-white border-gray-200 text-gray-800 hover:border-gray-300'}`}>
            <p className={`text-[10px] font-bold mb-1 uppercase tracking-tighter truncate ${selectedStock?.id === stock.id ? 'text-blue-100' : 'text-gray-400'}`}>{stock.symbol}</p>
            <p className="text-sm font-bold truncate">{stock.name}</p>
          </button>
        ))}
      </div>

      {selectedStock && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-[2.5rem] p-6 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${isTrendUp ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'}`}>{isTrendUp ? <TrendingUp size={20} className="text-red-500" /> : <TrendingDown size={20} className="text-blue-600" />}</div>
                <div><h2 className="text-lg font-bold text-gray-800">{selectedStock.name}</h2><p className="text-[11px] text-gray-400 font-bold">최근 3개월 주가 추이</p></div>
              </div>
            </div>
            <div className="h-[300px] w-full">
              {isDataLoading ? (<div className="w-full h-full flex flex-col items-center justify-center gap-3"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div><p className="text-[11px] text-gray-400 font-bold animate-pulse">차트 정보를 불러오는 중...</p></div>) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorUp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                      <linearGradient id="colorDown" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/><stop offset="95%" stopColor="#2563eb" stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} minTickGap={30} />
                    <YAxis hide={true} domain={['auto', 'auto']} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="price" stroke={trendColor} strokeWidth={3} fillOpacity={1} fill={trendGradient} animationDuration={1000} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          <div className="p-8 bg-white border border-gray-200 rounded-[2.5rem] shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600/10 group-hover:bg-blue-600 transition-all"></div>
            <div className="flex items-center gap-2 mb-4"><Sparkles size={18} className="text-blue-600" /><h4 className="text-sm font-bold text-gray-800 tracking-tight">AI 차트 분석 엔진</h4></div>
            <p className="text-sm text-gray-600 leading-relaxed font-medium">
              {isTrendUp ? `${selectedStock.name}은 최근 3개월간 우상향 추세를 보이고 있습니다. 지지선을 확보하며 안정적인 흐름을 유지 중인 기술적 우상향 구간입니다.` : `${selectedStock.name}은 최근 단기 조정을 보이고 있습니다. 기술적 지지선 확인이 필요하며 바닥권 다지기 이후 재진입을 고려하십시오.`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
