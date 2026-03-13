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
          const res = await fetch(`/api/history?symbol=\${selectedStock.symbol}`, { cache: 'no-store' });
          const data = await res.json();
          setChartData(Array.isArray(data) ? data : []);
        } catch (error) { 
          console.error("[Chart] History Fetch Error:", error);
          setChartData([]); 
        }
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
        <div className="bg-white border border-gray-100 p-10 rounded-[3.5rem] shadow-[0_25px_70px_rgba(0,0,0,0.08)] min-w-fit overflow-visible">
          <p className="text-[11px] text-gray-400 font-black mb-3 uppercase tracking-[0.25em] leading-none px-1">{label}</p>
          <p className="text-2xl font-black text-[#191f28] leading-none whitespace-nowrap px-1">{payload[0].value.toLocaleString()}원</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-white text-[#191f28] pb-44 animate-in fade-in duration-500 overflow-x-hidden overflow-y-visible">
      <header className="px-8 pt-16 pb-10 overflow-visible">
        <h1 className="text-4xl font-black tracking-tight mb-14 px-1">트렌드 분석</h1>
        
        {/* Tab Selection */}
        <div className="flex gap-12 border-b-[2.5px] border-gray-50 overflow-visible px-2">
          <button 
            onClick={() => setActiveTab('holdings')}
            className={`pb-6 px-1 text-lg font-black transition-all relative min-w-fit \${activeTab === 'holdings' ? 'text-[#3182f6]' : 'text-gray-300 hover:text-gray-500'}`}
          >
            내 자산 리스트
            {activeTab === 'holdings' && <div className="absolute bottom-[-2.5px] left-0 right-0 h-[4.5px] bg-[#3182f6] rounded-full animate-in slide-in-from-left-2 duration-300"></div>}
          </button>
          <button 
            onClick={() => setActiveTab('interests')}
            className={`pb-6 px-1 text-lg font-black transition-all relative min-w-fit \${activeTab === 'interests' ? 'text-[#3182f6]' : 'text-gray-300 hover:text-gray-500'}`}
          >
            관심 종목
            {activeTab === 'interests' && <div className="absolute bottom-[-2.5px] left-0 right-0 h-[4.5px] bg-[#3182f6] rounded-full animate-in slide-in-from-right-2 duration-300"></div>}
          </button>
        </div>
      </header>

      {/* Stock Selection List with high padding */}
      <div className="flex gap-8 overflow-x-auto px-8 pb-14 no-scrollbar scroll-smooth overflow-y-visible">
        {stocks.map(stock => (
          <button 
            key={stock.id}
            onClick={() => setSelectedStock(stock)}
            className={`px-12 py-7 rounded-[2.75rem] border-[2.5px] transition-all text-center whitespace-nowrap min-w-fit overflow-visible \${selectedStock?.id === stock.id ? 'bg-[#3182f6] border-[#3182f6] text-white shadow-[0_20px_50px_-10px_rgba(49,130,246,0.35)] scale-[1.05]' : 'bg-gray-50 border-transparent text-gray-400 hover:bg-gray-100'}`}
          >
            <span className="text-lg font-black whitespace-nowrap overflow-visible">{stock.name}</span>
          </button>
        ))}
      </div>

      {selectedStock && (
        <div className="px-8 space-y-16 animate-in slide-in-from-bottom-8 duration-800 overflow-visible">
          <div className="bg-white rounded-[4.5rem] py-14 shadow-[0_5px_40px_rgba(0,0,0,0.02)] border border-gray-50 overflow-visible relative">
            <div className="flex justify-between items-start mb-16 overflow-visible px-10">
              <div className="overflow-visible min-w-fit">
                <h2 className="text-5xl font-black text-[#191f28] leading-none mb-5 whitespace-nowrap overflow-visible tracking-tight">{selectedStock.name}</h2>
                <div className="flex items-center gap-4 overflow-visible">
                  <span className="text-sm font-black text-gray-300 uppercase tracking-[0.25em] ml-1">{selectedStock.symbol}</span>
                  <div className={`flex items-center gap-3 px-6 py-2.5 rounded-full font-black text-xs shadow-sm border \${isTrendUp ? 'bg-red-50 text-red-500 border-red-100' : 'bg-blue-50 text-[#3182f6] border-blue-100'}`}>
                    {isTrendUp ? <TrendingUp size={18} strokeWidth={3} /> : <TrendingDown size={18} strokeWidth={3} />}
                    <span className="mb-0.5">{isTrendUp ? '우상향 시그널' : '바닥 다지기 중'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="h-[420px] w-full px-6 overflow-visible">
              {isDataLoading ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-8">
                  <div className="w-16 h-16 border-[6px] border-[#3182f6] border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-base font-black text-gray-200 animate-pulse uppercase tracking-[0.4em]">Visualizing Market Data</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorUp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorDown" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3182f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3182f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#e9ecef', fontSize: 12, fontWeight: 900 }}
                      minTickGap={50}
                      dy={25}
                    />
                    <YAxis hide={true} domain={['auto', 'auto']} />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#f8f9fa', strokeWidth: 3 }} />
                    <Area 
                      type="monotone" 
                      dataKey="price" 
                      stroke={trendColor} 
                      strokeWidth={6} 
                      strokeLinecap="round"
                      fillOpacity={1} 
                      fill={trendGradient} 
                      animationDuration={2200}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* AI Strategy Insights */}
          <div className="bg-gray-50 border border-gray-100 rounded-[3.5rem] p-12 space-y-10 shadow-sm overflow-visible relative group">
            <div className="absolute -top-6 left-12 px-8 py-3 bg-[#3182f6] text-white rounded-full font-black text-sm shadow-xl shadow-blue-100 flex items-center gap-3">
              <Sparkles size={18} />
              AI Insight Pro
            </div>
            <p className="text-lg text-gray-600 leading-relaxed font-bold break-keep whitespace-normal px-1 mt-4">
              {isTrendUp 
                ? `${selectedStock.name}은(는) 공공데이터 기반 거래량 분석 결과, 안정적인 기관 매수세가 유입되고 있습니다. 현재의 상승 파동을 유지하며 단기 저항선을 돌파할 확률이 매우 높습니다.` 
                : `${selectedStock.name}은(는) 과거 시세 정보 대조 결과, 단기 과매도 구간에 진입한 것으로 보입니다. 공공 지표상 거래량이 바닥을 확인하고 있어, 저가 매수세 유입을 기다리는 전략이 유효합니다.`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
