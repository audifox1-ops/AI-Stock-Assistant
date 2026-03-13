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
        <div className="bg-white border border-gray-100 p-8 rounded-[3rem] shadow-[0_20px_60px_rgba(0,0,0,0.08)] min-w-fit overflow-visible border-opacity-50">
          <p className="text-[10px] text-gray-400 font-black mb-2 uppercase tracking-[0.2em] leading-none px-1">{label}</p>
          <p className="text-xl font-black text-[#191f28] leading-none whitespace-nowrap px-1">{payload[0].value.toLocaleString()}원</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-white text-[#191f28] pb-40 animate-in fade-in duration-500 overflow-visible">
      <header className="px-6 pt-12 pb-8 overflow-visible">
        <h1 className="text-3xl font-black tracking-tight mb-12 px-1">차트 분석</h1>
        
        {/* Tab Selection */}
        <div className="flex gap-10 border-b-[2px] border-gray-100 overflow-visible">
          <button 
            onClick={() => setActiveTab('holdings')}
            className={`pb-5 px-4 text-base font-black transition-all relative min-w-fit \${activeTab === 'holdings' ? 'text-[#3182f6]' : 'text-gray-400 hover:text-gray-600'}`}
          >
            내 자산
            {activeTab === 'holdings' && <div className="absolute bottom-[-2px] left-0 right-0 h-[4px] bg-[#3182f6] rounded-full animate-in fade-in zoom-in-95"></div>}
          </button>
          <button 
            onClick={() => setActiveTab('interests')}
            className={`pb-5 px-4 text-base font-black transition-all relative min-w-fit \${activeTab === 'interests' ? 'text-[#3182f6]' : 'text-gray-400 hover:text-gray-600'}`}
          >
            관심 종목
            {activeTab === 'interests' && <div className="absolute bottom-[-2px] left-0 right-0 h-[4px] bg-[#3182f6] rounded-full animate-in fade-in zoom-in-95"></div>}
          </button>
        </div>
      </header>

      {/* Stock Selection List */}
      <div className="flex gap-6 overflow-x-auto px-6 pb-12 no-scrollbar scroll-smooth overflow-y-visible">
        {stocks.map(stock => (
          <button 
            key={stock.id}
            onClick={() => setSelectedStock(stock)}
            className={`px-10 py-6 rounded-[2.5rem] border-[2px] transition-all text-center whitespace-nowrap min-w-fit overflow-visible \${selectedStock?.id === stock.id ? 'bg-[#3182f6] border-[#3182f6] text-white shadow-[0_15px_40px_-10px_rgba(49,130,246,0.3)] scale-[1.03]' : 'bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100'}`}
          >
            <span className="text-base font-black whitespace-nowrap overflow-visible">{stock.name}</span>
          </button>
        ))}
      </div>

      {selectedStock && (
        <div className="px-6 space-y-12 animate-in slide-in-from-bottom-5 duration-700 overflow-visible">
          <div className="bg-white rounded-[4rem] py-12 shadow-[0_0_50px_rgba(0,0,0,0.03)] border border-gray-50 overflow-visible">
            <div className="flex justify-between items-start mb-12 overflow-visible px-4">
              <div className="overflow-visible min-w-fit">
                <h2 className="text-4xl font-black text-[#191f28] leading-none mb-4 whitespace-nowrap overflow-visible">{selectedStock.name}</h2>
                <div className="flex items-center gap-3 overflow-visible">
                  <span className="text-sm font-black text-gray-300 uppercase tracking-[0.15em] ml-1">{selectedStock.symbol}</span>
                  <div className={`flex items-center gap-2 px-5 py-2 rounded-full font-black text-xs shadow-sm \${isTrendUp ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-[#3182f6]'}`}>
                    {isTrendUp ? <TrendingUp size={16} strokeWidth={3} /> : <TrendingDown size={16} strokeWidth={3} />}
                    <span className="mb-0.5">{isTrendUp ? '상승 테세' : '조정 기간'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="h-[360px] w-full px-2 overflow-visible">
              {isDataLoading ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-6">
                  <div className="w-14 h-14 border-[5px] border-[#3182f6] border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm font-black text-gray-300 animate-pulse uppercase tracking-[0.3em]">Drawing Analysis</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 30, right: 15, left: 15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorUp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorDown" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3182f6" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#3182f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#ced4da', fontSize: 11, fontWeight: 900 }}
                      minTickGap={45}
                      dy={20}
                    />
                    <YAxis hide={true} domain={['auto', 'auto']} />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#f1f3f5', strokeWidth: 2 }} />
                    <Area 
                      type="monotone" 
                      dataKey="price" 
                      stroke={trendColor} 
                      strokeWidth={5} 
                      strokeLinecap="round"
                      fillOpacity={1} 
                      fill={trendGradient} 
                      animationDuration={1800}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* AI Insight Row */}
          <div className="bg-gray-50 rounded-[3rem] p-10 space-y-7 border border-gray-100 shadow-sm overflow-visible">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white rounded-2xl shadow-sm text-[#3182f6]">
                <Sparkles size={26} strokeWidth={2.5} />
              </div>
              <h4 className="text-xl font-black text-[#191f28]">AI 기술적 분석 리포트</h4>
            </div>
            <p className="text-base text-gray-700 leading-relaxed font-bold break-words whitespace-normal px-1">
              {isTrendUp 
                ? `${selectedStock.name}은(는) 현재 강력한 전고점 돌파 이후 안정적인 지지선을 구축하고 있습니다. 수급의 질이 개선되고 있어, 단기 숨고르기 발생 시 추가 비중 확대가 유리한 구간입니다.` 
                : `${selectedStock.name}은(는) 매물벽 저항으로 인해 단기 박스권 하단 테스트를 진행 중입니다. 현재는 공격적인 매수보다는 주요 이평선 회복 여부를 확인하며 보수적으로 접근할 시기입니다.`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
