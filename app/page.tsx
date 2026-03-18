"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, Activity, Star, Search, 
  BarChart3, Globe, Zap, ArrowRight, ShieldCheck, 
  ChevronRight, Sparkles, Filter, Loader2, X, Info, 
  Target, AlertCircle, PieChart, Wallet, Bot
} from 'lucide-react';
import StockChart from '@/components/StockChart';

export const dynamic = 'force-dynamic';

interface StockRank {
  itemCode: string;
  stockName: string;
  closePrice: number;
  fluctuationsRatio: string | number;
  volume: number;
  fluctuationType: string;
}

interface IndexData {
  name: string;
  value: string;
  change: string;
  changeRate: string;
  status: 'UP' | 'DOWN' | 'SAME';
}

interface StockDetail {
  ticker: string;
  stockName: string;
  price: number;
  changeRate: string | number;
  high52w: number;
  low52w: number;
  targetPrice: number;
  marketCap: number;
  per: number;
  pbr: number;
  eps: number;
  bps: number;
  dividendYield: string | number;
  industryName: string;
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('시가총액');
  const [rankingData, setRankingData] = useState<StockRank[]>([]);
  const [indices, setIndices] = useState<IndexData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedStock, setSelectedStock] = useState<StockRank | null>(null);
  const [detailData, setDetailData] = useState<StockDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  
  // 차트 데이터 상태 추가
  const [chartData, setChartData] = useState<any[]>([]);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [isMinute, setIsMinute] = useState(false);

  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // 상단 인덱스 데이터 로드
  const fetchIndices = async () => {
    try {
      const res = await fetch('/api/market?type=index');
      const json = await res.json();
      if (json.success) setIndices(json.data);
    } catch (e) {
      console.error('Index Fetch Error:', e);
    }
  };

  // 랭킹 데이터 로드
  const fetchRankings = async (tab: string) => {
    setIsLoading(true);
    let type = 'kospi_market_cap';
    if (tab === '코스닥') type = 'kosdaq_market_cap';
    if (tab === '거래량') type = 'volume';
    if (tab === '외국인순매수') type = 'foreign_buy';
    if (tab === '기관순매수') type = 'institution_buy';

    try {
      const res = await fetch(`/api/market?type=${type}`);
      const json = await res.json();
      if (json.success) setRankingData(json.data);
    } catch (e) {
      console.error('Ranking Fetch Error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIndices();
    fetchRankings(activeTab);
    const timer = setInterval(fetchIndices, 60000);
    return () => clearInterval(timer);
  }, [activeTab]);

  // 종목 상세 정보 및 차트 로드
  const handleStockClick = async (stock: StockRank) => {
    setSelectedStock(stock);
    setIsDetailLoading(true);
    setIsChartLoading(true);
    setAiReport(null);
    setChartData([]); // 데이터 초기화

    try {
      // 1. 상세 재무 지표 페칭
      const detailRes = await fetch(`/api/market?type=detail&ticker=${stock.itemCode}`);
      const detailJson = await detailRes.json();
      if (detailJson.success) setDetailData(detailJson.data);

      // 2. 차트 시세 페칭 (기본 일봉)
      const chartRes = await fetch(`/api/stock/chart?ticker=${stock.itemCode}&timeframe=day`);
      const chartJson = await chartRes.json();
      if (chartJson.success) {
        setChartData(chartJson.data);
        setIsMinute(false);
      }
    } catch (e) {
      console.error('Data Fetch Error:', e);
    } finally {
      setIsDetailLoading(false);
      setIsChartLoading(false);
    }
  };

  // AI 분석 리포트 생성
  const generateAiReport = async () => {
    if (!selectedStock) return;
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/analyze-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: selectedStock.itemCode,
          name: selectedStock.stockName,
          price: selectedStock.closePrice,
          change: selectedStock.fluctuationsRatio
        })
      });
      const json = await res.json();
      setAiReport(json.analysis);
    } catch (e) {
      setAiReport("분석 서버 연결에 실패했습니다.");
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="w-full bg-white min-h-screen text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* 고도화된 대시보드 헤더 */}
      <header className="px-8 py-10 bg-slate-50 border-b border-slate-100">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-200">
                  <Activity className="text-white" size={24} />
                </div>
                <h1 className="text-2xl font-black tracking-tighter uppercase italic">Antigravity Terminal</h1>
              </div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Globe size={14} className="text-slate-300" /> Global Market Real-time Node
              </p>
            </div>

            <div className="flex gap-4 w-full md:w-auto overflow-x-auto hide-scrollbar pb-2">
              {indices.map((idx, i) => (
                <div key={i} className="bg-white px-8 py-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-3 min-w-[200px] transition-all hover:border-blue-200 hover:shadow-md group">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-tighter">{idx.name}</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${idx.status === 'UP' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                      {idx.status}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black tracking-tight tabular-nums">{idx.value}</span>
                    <span className="text-[10px] font-bold text-slate-300 uppercase">pt</span>
                  </div>
                  <div className={`text-xs font-black flex items-center gap-1 ${idx.status === 'UP' ? 'text-red-500' : 'text-blue-500'}`}>
                    {idx.status === 'UP' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {idx.changeRate}% ({idx.change})
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-8 py-12">
        {/* 탭 네비게이션 */}
        <div className="flex items-center justify-between mb-12 pb-6 border-b-2 border-slate-50">
          <div className="flex gap-8">
            {['시가총액', '코스닥', '거래량', '외국인순매수', '기관순매수'].map((tab) => (
               <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative pb-6 text-sm font-black uppercase tracking-widest transition-all ${
                  activeTab === tab ? 'text-slate-900 border-b-4 border-blue-600' : 'text-slate-300 hover:text-slate-500'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-4">
             <div className="bg-slate-50 px-6 py-3 rounded-2xl flex items-center gap-3 border border-slate-100 shadow-inner group">
                <Search className="text-slate-300 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input type="text" placeholder="Symbol Search..." className="bg-transparent border-none outline-none text-xs font-bold text-slate-900 uppercase tracking-widest placeholder:text-slate-300 w-48" />
             </div>
             <button className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl shadow-slate-200 hover:scale-105 active:scale-95 transition-all">
                <Filter size={18} />
             </button>
          </div>
        </div>

        {/* 랭킹 리스트 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {isLoading ? (
            Array(9).fill(0).map((_, i) => (
              <div key={i} className="h-64 bg-slate-50 rounded-[2.5rem] animate-pulse"></div>
            ))
          ) : (
            rankingData.map((item, idx) => {
              const isPlus = item.fluctuationsRatio.toString().startsWith('+') || Number(item.fluctuationsRatio) > 0;
              const isMinus = item.fluctuationsRatio.toString().startsWith('-') || Number(item.fluctuationsRatio) < 0;

              return (
                <div 
                  key={idx}
                  onClick={() => handleStockClick(item)}
                  className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:border-blue-100 transition-all duration-500 cursor-pointer group relative overflow-hidden flex flex-col justify-between active:scale-[0.98]"
                >
                  <div className="absolute top-0 left-0 w-2 h-full bg-slate-900 scale-y-0 group-hover:scale-y-100 transition-transform duration-500 origin-top"></div>
                  
                  <div className="flex justify-between items-start mb-10">
                    <div className="bg-slate-50 w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-lg font-black text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-all duration-500 shadow-sm italic leading-none">
                      {item.stockName.substring(0, 1)}
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Index</span>
                      <p className="text-xs font-black text-slate-900 tracking-tighter opacity-50">#{idx + 1}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xl font-black tracking-tighter text-slate-900 group-hover:text-blue-600 transition-colors uppercase leading-tight truncate">
                      {item.stockName}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase">Symbol: {item.itemCode}</p>
                    
                    <div className="pt-8 border-t border-slate-50 flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Last Price</p>
                        <p className="text-[1.3rem] font-black tabular-nums tracking-tighter">
                          {item.closePrice.toLocaleString()} 
                          <span className="text-xs font-medium ml-1 text-slate-400">KRW</span>
                        </p>
                      </div>
                      <div className={`px-4 py-2 rounded-2xl text-sm font-black tabular-nums flex items-center gap-1 ${
                        isPlus ? 'bg-red-50 text-red-500' : isMinus ? 'bg-blue-50 text-blue-500' : 'bg-slate-50 text-slate-400'
                      }`}>
                         {isPlus ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                         {item.fluctuationsRatio}%
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* 종목 상세 모달 (Premium Full-Screen Overlay) */}
      {selectedStock && (
        <div className="fixed inset-0 z-[200] flex items-center justify-end bg-slate-950/40 backdrop-blur-xl transition-all duration-500 animate-in fade-in">
          <div className="absolute inset-0" onClick={() => setSelectedStock(null)}></div>
          <div className="relative w-full max-w-[1000px] h-full bg-white shadow-[-40px_0_80px_rgba(0,0,0,0.1)] p-12 overflow-y-auto flex flex-col ring-1 ring-white/20 animate-in slide-in-from-right duration-500">
            <div className="flex justify-between items-center mb-16 pb-10 border-b-2 border-slate-50">
              <div className="flex items-center gap-8">
                <div className="w-20 h-20 bg-slate-900 rounded-[2rem] flex items-center justify-center text-2xl font-black text-white italic shadow-2xl">
                  {selectedStock.stockName.substring(0, 1)}
                </div>
                <div>
                  <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-tight">
                    {selectedStock.stockName}
                  </h2>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">{selectedStock.itemCode}</span>
                    <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                    <span className="text-sm font-bold text-blue-600 uppercase tracking-widest">{detailData?.industryName || 'Market Node'}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedStock(null)}
                className="p-6 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-[2rem] transition-all duration-500 active:scale-90"
              >
                <X size={28} />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 flex-1">
              <div className="lg:col-span-8 space-y-16">
                {/* 차트 영역 */}
                <div className="bg-slate-50 p-1 rounded-[3.5rem] overflow-hidden border-4 border-slate-50 shadow-inner min-h-[500px] relative group flex items-center justify-center">
                  {isChartLoading ? (
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="animate-spin text-blue-500" size={40} />
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading Chart Data...</p>
                    </div>
                  ) : chartData.length > 0 ? (
                    <>
                      <div className="absolute top-10 left-10 z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-white/80 backdrop-blur px-6 py-3 rounded-2xl border border-slate-200/50 shadow-2xl">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Feed</p>
                        </div>
                      </div>
                      <StockChart 
                        data={chartData} 
                        isMinute={isMinute} 
                        className="w-full h-full" 
                        ticker={selectedStock.itemCode}
                      />
                    </>
                  ) : (
                    <div className="text-slate-400 text-xs font-black uppercase tracking-widest">차트 데이터를 불러올 수 없습니다.</div>
                  )}
                </div>

                {/* AI 리포트 영역 */}
                <div className="space-y-8">
                  <div className="flex justify-between items-center px-4">
                    <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                      <Sparkles className="text-blue-500" size={24} /> AI Analyst Intelligence
                    </h4>
                    <button 
                      onClick={generateAiReport}
                      disabled={isAiLoading}
                      className="px-8 py-4 bg-blue-600 text-white text-xs font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center gap-3"
                    >
                      {isAiLoading ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16} fill="currentColor" />}
                      Generate Report
                    </button>
                  </div>

                  {aiReport ? (
                    <div className="bg-slate-50 p-12 rounded-[3.5rem] border border-slate-100 prose prose-slate max-w-none shadow-sm animate-in fade-in slide-in-from-bottom-8 duration-700">
                      <div className="text-[15px] font-medium leading-relaxed text-slate-700 whitespace-pre-wrap">
                        {aiReport}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 p-20 rounded-[3.5rem] border-2 border-dashed border-slate-200 text-center flex flex-col items-center gap-6 group hover:border-blue-200 transition-colors">
                      <div className="bg-white p-6 rounded-3xl shadow-sm text-slate-300 group-hover:text-blue-400 transition-colors">
                        <Bot size={40} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">AI 시황 정밀 분석 대기 중</p>
                        <p className="text-[11px] font-bold text-slate-300 uppercase tracking-tighter mt-1">Click the button above to initialize core intelligence</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-4 space-y-8">
                <div className="bg-slate-900 p-10 rounded-[3rem] text-white space-y-10 shadow-2xl shadow-slate-200 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/20 rounded-full blur-[80px] -mr-20 -mt-20 group-hover:bg-blue-400/30 transition-colors duration-1000"></div>
                  
                  <div className="relative">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Pricing Terminal</p>
                    <div className="flex items-baseline gap-4">
                      <h3 className="text-5xl font-black tracking-tighter tabular-nums leading-none">
                        {selectedStock.closePrice.toLocaleString()}
                      </h3>
                      <span className="text-lg font-bold text-slate-500 uppercase">KRW</span>
                    </div>
                    <div className={`text-lg font-black mt-6 flex items-center gap-2 ${
                      selectedStock.fluctuationsRatio.toString().includes('+') ? 'text-red-400' : 'text-blue-400'
                    }`}>
                      {selectedStock.fluctuationsRatio}% 
                      <ArrowRight size={18} className="opacity-50" />
                    </div>
                  </div>

                  <div className="space-y-6 pt-10 border-t border-white/5 relative">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Market Quantitative Metrics</p>
                    <div className="grid grid-cols-1 gap-6">
                      <div className="flex justify-between items-center p-6 bg-white/5 rounded-3xl border border-white/5 hover:bg-white/10 transition-colors group/item">
                        <span className="text-xs font-bold text-white/40 group-hover/item:text-white/60">52주 최고가</span>
                        <span className="text-sm font-black tabular-nums">{(detailData?.high52w || 0).toLocaleString()}원</span>
                      </div>
                      <div className="flex justify-between items-center p-6 bg-white/5 rounded-3xl border border-white/5 hover:bg-white/10 transition-colors group/item">
                        <span className="text-xs font-bold text-white/40 group-hover/item:text-white/60">52주 최저가</span>
                        <span className="text-sm font-black tabular-nums">{(detailData?.low52w || 0).toLocaleString()}원</span>
                      </div>
                      <div className="flex justify-between items-center p-6 bg-white/5 rounded-3xl border border-white/5 hover:bg-white/10 transition-colors group/item">
                        <span className="text-xs font-bold text-white/40 group-hover/item:text-white/60">시가총액</span>
                        <span className="text-sm font-black tabular-nums">{(detailData?.marketCap || 0).toLocaleString()}억원</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-6 bg-white/5 rounded-3xl border border-white/5 text-center hover:bg-white/10 transition-colors">
                          <p className="text-[9px] font-bold text-white/30 uppercase mb-2">PER Node</p>
                          <p className="text-lg font-black tabular-nums">{(detailData?.per || 0).toFixed(2)}</p>
                        </div>
                        <div className="p-6 bg-white/5 rounded-3xl border border-white/5 text-center hover:bg-white/10 transition-colors">
                          <p className="text-[9px] font-bold text-white/30 uppercase mb-2">PBR Node</p>
                          <p className="text-lg font-black tabular-nums">{(detailData?.pbr || 0).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-8">
                    <div className="p-6 bg-blue-600 rounded-[2rem] flex items-center justify-between shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Target size={20} className="text-white" />
                        <span className="text-xs font-black uppercase tracking-widest">Supply Alert Set</span>
                      </div>
                      <ChevronRight size={18} />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 flex flex-col gap-6">
                  <h5 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                    <Info size={14} className="text-blue-500" /> Executive Guidance
                  </h5>
                  <p className="text-xs font-semibold text-slate-600 leading-relaxed italic">
                    "현재 종목의 퀀트 지표와 AI 리포트를 종합하여 리스크 관리 관점의 의사결정을 수행하십시오. 특히 52주 고가 대비 현재 위치는 기술적 지지선의 기준이 됩니다."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
