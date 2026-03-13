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
  Sparkles,
  ChevronRight
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
  const trendColor = isTrendUp ? '#ef4444' : '#3182f6';
  const trendGradient = isTrendUp ? 'url(#colorUp)' : 'url(#colorDown)';

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-100 p-4 rounded-[2rem] shadow-2xl">
          <p className="text-[10px] text-gray-400 font-bold mb-1 uppercase tracking-widest">{label}</p>
          <p className="text-base font-black text-[#191f28]">{payload[0].value.toLocaleString()}원</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-white text-[#191f28] pb-32 animate-in fade-in duration-500">
      <header className="px-6 pt-12 pb-6">
        <h1 className="text-2xl font-bold tracking-tight mb-8">차트 분석</h1>
        
        {/* Tab Selection */}
        <div className="flex gap-4 border-b border-gray-100">
          <button 
            onClick={() => setActiveTab('holdings')}
            className={`pb-3 px-2 text-sm font-bold transition-all relative ${activeTab === 'holdings' ? 'text-[#3182f6]' : 'text-gray-400'}`}
          >
            내 주식
            {activeTab === 'holdings' && <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-[#3182f6]"></div>}
          </button>
          <button 
            onClick={() => setActiveTab('interests')}
            className={`pb-3 px-2 text-sm font-bold transition-all relative ${activeTab === 'interests' ? 'text-[#3182f6]' : 'text-gray-400'}`}
          >
            관심 종목
            {activeTab === 'interests' && <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-[#3182f6]"></div>}
          </button>
        </div>
      </header>

      {/* Stock Selection List */}
      <div className="flex gap-3 overflow-x-auto px-6 pb-6 no-scrollbar">
        {stocks.map(stock => (
          <button 
            key={stock.id}
            onClick={() => setSelectedStock(stock)}
            className={`min-w-[100px] py-4 px-5 rounded-3xl border transition-all text-center ${selectedStock?.id === stock.id ? 'bg-[#3182f6] border-[#3182f6] text-white shadow-lg shadow-blue-100' : 'bg-gray-50 border-transparent text-gray-600'}`}
          >
            <p className="text-sm font-bold truncate">{stock.name}</p>
          </button>
        ))}
      </div>

      {selectedStock && (
        <div className="px-6 space-y-8">
          <div className="bg-white rounded-[2.5rem] py-8">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-black text-[#191f28]">{selectedStock.name}</h2>
                <p className="text-xs font-bold text-gray-400">최근 3개월 가격 변동</p>
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-black text-xs ${isTrendUp ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-[#3182f6]'}`}>
                {isTrendUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {isTrendUp ? '상승세' : '조정기'}
              </div>
            </div>

            <div className="h-[280px] w-full">
              {isDataLoading ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                  <div className="w-10 h-10 border-4 border-[#3182f6] border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs font-bold text-gray-400 animate-pulse">차트를 그리는 중입니다...</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorUp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorDown" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3182f6" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#3182f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#adb5bd', fontSize: 10, fontWeight: 700 }}
                      minTickGap={40}
                    />
                    <YAxis hide={true} domain={['auto', 'auto']} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="price" 
                      stroke={trendColor} 
                      strokeWidth={3} 
                      strokeLinecap="round"
                      fillOpacity={1} 
                      fill={trendGradient} 
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* AI Insight Row */}
          <div className="bg-gray-50 rounded-[2.5rem] p-8 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles size={20} className="text-[#3182f6]" />
              <h4 className="text-base font-bold text-[#191f28]">전문가 인사이트</h4>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed font-bold">
              {isTrendUp 
                ? `${selectedStock.name}은(는) 안정적인 우상향 궤도에 진입했습니다. 현재 구간에서는 지지선을 이탈하지 않는 한 비중을 유지하는 전술이 유효합니다.` 
                : `${selectedStock.name}은(는) 현재 기술적 조정을 거치고 있습니다. 섣부른 추격 매수보다는 하방 지지력이 확인되는 구간까지 기다리는 미덕이 필요합니다.`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
