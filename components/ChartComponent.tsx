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
          const res = await fetch(`/api/history?symbol=\${selectedStock.symbol}`);
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
        <div className="bg-white border border-gray-100 p-6 rounded-[2.5rem] shadow-[0_10px_40px_rgba(0,0,0,0.06)] min-w-[140px] overflow-visible">
          <p className="text-[11px] text-gray-400 font-black mb-1.5 uppercase tracking-widest leading-none">{label}</p>
          <p className="text-lg font-black text-[#191f28] leading-none whitespace-nowrap overflow-visible">{payload[0].value.toLocaleString()}원</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-white text-[#191f28] pb-40 animate-in fade-in duration-500">
      <header className="px-6 pt-12 pb-8">
        <h1 className="text-2xl font-black tracking-tight mb-10">차트 분석</h1>
        
        {/* Tab Selection */}
        <div className="flex gap-6 border-b border-gray-100">
          <button 
            onClick={() => setActiveTab('holdings')}
            className={`pb-4 px-3 text-sm font-black transition-all relative w-fit \${activeTab === 'holdings' ? 'text-[#3182f6]' : 'text-gray-400'}`}
          >
            내 주식
            {activeTab === 'holdings' && <div className="absolute bottom-[-1.5px] left-0 right-0 h-[3px] bg-[#3182f6] rounded-full"></div>}
          </button>
          <button 
            onClick={() => setActiveTab('interests')}
            className={`pb-4 px-3 text-sm font-black transition-all relative w-fit \${activeTab === 'interests' ? 'text-gray-400' : 'text-gray-400 hover:text-gray-600'}`}
          >
            관심 종목
            {activeTab === 'interests' && <div className="absolute bottom-[-1.5px] left-0 right-0 h-[3px] bg-[#3182f6] rounded-full"></div>}
          </button>
        </div>
      </header>

      {/* Stock Selection List */}
      <div className="flex gap-4 overflow-x-auto px-6 pb-8 no-scrollbar scroll-smooth">
        {stocks.map(stock => (
          <button 
            key={stock.id}
            onClick={() => setSelectedStock(stock)}
            className={`min-w-fit px-8 py-5 rounded-[2rem] border transition-all text-center whitespace-nowrap overflow-visible \${selectedStock?.id === stock.id ? 'bg-[#3182f6] border-[#3182f6] text-white shadow-xl shadow-blue-100 scale-[1.02]' : 'bg-gray-50 border-transparent text-gray-600 hover:bg-gray-100'}`}
          >
            <p className="text-sm font-black whitespace-nowrap overflow-visible px-1">{stock.name}</p>
          </button>
        ))}
      </div>

      {selectedStock && (
        <div className="px-6 space-y-10 animate-in slide-in-from-bottom-2 duration-500">
          <div className="bg-white rounded-[3rem] py-10 shadow-[0_0_30px_rgba(0,0,0,0.02)]">
            <div className="flex justify-between items-start mb-10 overflow-visible px-2">
              <div className="overflow-visible flex-1">
                <h2 className="text-3xl font-black text-[#191f28] leading-tight mb-2 break-all whitespace-normal">{selectedStock.name}</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{selectedStock.symbol}</span>
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-black text-[10px] shadow-sm \${isTrendUp ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-[#3182f6]'}`}>
                    {isTrendUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {isTrendUp ? '상승세' : '조정기'}
                  </div>
                </div>
              </div>
            </div>

            <div className="h-[320px] w-full px-1">
              {isDataLoading ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                  <div className="w-12 h-12 border-4 border-[#3182f6] border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs font-black text-gray-300 animate-pulse uppercase tracking-[0.2em]">Designing Chart</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorUp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorDown" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3182f6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#3182f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#adb5bd', fontSize: 10, fontWeight: 900 }}
                      minTickGap={40}
                      dy={15}
                    />
                    <YAxis hide={true} domain={['auto', 'auto']} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="price" 
                      stroke={trendColor} 
                      strokeWidth={4} 
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
          <div className="bg-gray-50 rounded-[2.5rem] p-8 space-y-5 border border-gray-100 shadow-sm overflow-visible">
            <div className="flex items-center gap-3">
              <Sparkles size={22} className="text-[#3182f6]" />
              <h4 className="text-lg font-black text-[#191f28]">전문가 기술 분석</h4>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed font-black break-words whitespace-normal px-1">
              {isTrendUp 
                ? `${selectedStock.name}은(는) 안정적인 우상향 궤도에 진입했습니다. 현재 구간에서는 단기 과매수 여부를 체크한 뒤, 지지선을 이탈하지 않는 한 비중을 유지하는 전략이 유효합니다.` 
                : `${selectedStock.name}은(는) 현재 기술적 조정을 거치고 있습니다. 섣부른 추격 매수보다는 하방 지지력이 확인되고 거래량이 실리는 저점 구간까지 관망하는 미덕이 필요합니다.`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
