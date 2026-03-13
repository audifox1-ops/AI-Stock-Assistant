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
  Search,
  ChevronRight,
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

  // 데이터 로드
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
      } catch (error) {
        console.error("Fetch stocks error:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [activeTab]);

  // 차트 데이터 로드
  useEffect(() => {
    if (selectedStock) {
      const fetchHistory = async () => {
        setIsDataLoading(true);
        try {
          const res = await fetch(`/api/history?symbol=${selectedStock.symbol}`);
          const data = await res.json();
          if (Array.isArray(data)) {
            setChartData(data);
          } else {
            setChartData([]);
          }
        } catch (error) {
          console.error("Fetch history error:", error);
          setChartData([]);
        } finally {
          setIsDataLoading(false);
        }
      };
      fetchHistory();
    }
  }, [selectedStock]);

  const isTrendUp = chartData.length >= 2 && chartData[chartData.length - 1].price >= chartData[0].price;
  const trendColor = isTrendUp ? '#ef4444' : '#3b82f6'; // 상승 빨강, 하락 파랑
  const trendGradient = isTrendUp ? 'url(#colorUp)' : 'url(#colorDown)';

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-white/10 p-3 rounded-2xl shadow-2xl backdrop-blur-xl">
          <p className="text-[10px] text-slate-500 font-black mb-1">{label}</p>
          <p className="text-sm font-black text-slate-100">{payload[0].value.toLocaleString()}원</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-36 font-sans p-6 animate-in fade-in duration-500">
      <header className="mb-8">
        <h1 className="text-2xl font-black bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent italic tracking-tighter mb-4">Stock Charts</h1>
        
        {/* Tab Selection */}
        <div className="flex p-1.5 bg-slate-800/50 border border-white/5 rounded-[2rem] gap-1">
          <button 
            onClick={() => setActiveTab('holdings')}
            className={`flex-1 py-3 px-4 rounded-full text-xs font-black transition-all flex items-center justify-center gap-2 ${activeTab === 'holdings' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <LayoutDashboard size={14} /> 보유종목
          </button>
          <button 
            onClick={() => setActiveTab('interests')}
            className={`flex-1 py-3 px-4 rounded-full text-xs font-black transition-all flex items-center justify-center gap-2 ${activeTab === 'interests' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Bell size={14} /> 관심종목
          </button>
        </div>
      </header>

      {/* Stock Selection List */}
      <div className="flex gap-2 overflow-x-auto pb-6 scrollbar-none">
        {isLoading ? (
          [1,2,3].map(i => <div key={i} className="min-w-[120px] h-20 bg-slate-800/40 rounded-3xl animate-pulse"></div>)
        ) : stocks.length === 0 ? (
          <div className="w-full text-center py-4 bg-slate-800/20 rounded-3xl border border-dashed border-white/5">
            <p className="text-slate-500 text-xs font-bold">표시할 종목이 없습니다.</p>
          </div>
        ) : (
          stocks.map(stock => (
            <button 
              key={stock.id}
              onClick={() => setSelectedStock(stock)}
              className={`min-w-[120px] p-4 rounded-3xl border transition-all text-left group ${selectedStock?.id === stock.id ? 'bg-slate-800 border-blue-500/50 shadow-xl' : 'bg-slate-800/30 border-white/5 hover:border-white/10'}`}
            >
              <p className="text-[10px] text-slate-500 font-bold mb-1 uppercase tracking-tighter truncate">{stock.symbol}</p>
              <p className={`text-sm font-black truncate ${selectedStock?.id === stock.id ? 'text-blue-400' : 'text-slate-300'}`}>{stock.name}</p>
            </button>
          ))
        )}
      </div>

      {selectedStock && (
        <div className="space-y-6">
          <div className="bg-slate-800/40 border border-white/5 rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                  {isTrendUp ? <TrendingUp size={20} className="text-red-500" /> : <TrendingDown size={20} className="text-blue-400" />}
                </div>
                <div>
                  <h2 className="text-xl font-black">{selectedStock.name}</h2>
                  <p className="text-[10px] text-slate-500 font-bold">최근 3개월 주가 추이</p>
                </div>
              </div>
            </div>

            <div className="h-[300px] w-full">
              {isDataLoading ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                  <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-[10px] text-slate-500 font-black animate-pulse">데이터 로드 중...</p>
                </div>
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorUp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorDown" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                      minTickGap={30}
                    />
                    <YAxis 
                      hide={true} 
                      domain={['auto', 'auto']} 
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="price" 
                      stroke={trendColor} 
                      strokeWidth={3} 
                      fillOpacity={1} 
                      fill={trendGradient} 
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-slate-500 text-xs font-bold">차트 데이터를 가져올 수 없습니다.</p>
                </div>
              )}
            </div>
          </div>

          <div className="p-8 bg-slate-800/50 border border-white/5 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500/30 group-hover:bg-blue-500 transition-all"></div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={16} className="text-blue-500" />
              <h4 className="text-sm font-black text-slate-200 uppercase tracking-tighter">Market Insight</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              {isTrendUp 
                ? `${selectedStock.name}은 최근 3개월간 우상향 추세를 보이고 있습니다. 지지선을 확보하며 안정적인 흐름을 유지 중입니다.` 
                : `${selectedStock.name}은 최근 단기 조정을 보이고 있습니다. 기술적 반등 구간 확인이 필요하며 변동성에 유의하십시오.`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
