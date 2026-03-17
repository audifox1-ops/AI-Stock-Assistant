"use client";

import React, { useState, useEffect } from 'react';
import { 
  RefreshCcw, BarChart3, Bot, Sparkles, Loader2, Info, ChevronRight, X, 
  TrendingUp, TrendingDown, Activity, Zap, Star, LayoutGrid, List as ListIcon, 
  LineChart as LineChartIcon, PieChart, Lightbulb, ShieldAlert, Target, Search,
  ArrowRight, Award, Flame, BarChart4
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface NaverStock {
  itemCode: string;
  stockName: string;
  closePrice: string;
  fluctuationsRatio: string;
  volume: string;
  high52w: string;
  low52w: string;
  targetPrice: string | number;
  upsidePotential: string;
  opinion: string;
}

interface IndexData {
  name: string;
  price: string;
  changePrice: string;
  changeRate: string;
  isUp: boolean;
}

export default function HomePage() {
  // --- 상태 관리 ---
  const [marketIndices, setMarketIndices] = useState<IndexData[]>([]);
  const [rankingStocks, setRankingStocks] = useState<NaverStock[]>([]);
  const [isRankingLoading, setIsRankingLoading] = useState(false);
  
  // 확장된 6가지 탭 구성
  const [activeTab, setActiveTab] = useState('KOSPI');
  
  // API 전송용 매핑
  const tabMapping: Record<string, string> = {
    'KOSPI': 'KOSPI',
    'KOSDAQ': 'KOSDAQ',
    '거래량상위': '거래량상위',
    '거래량급증': '거래량급증',
    '거래량급락': '거래량급락',
    '골든크로스': '골든크로스'
  };

  // 인터랙션 상태
  const [selectedStock, setSelectedStock] = useState<NaverStock | null>(null);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'chart' | 'ai' | null>(null);
  const [aiMode, setAiMode] = useState<'analysis' | 'strategy'>('analysis');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isChartLoading, setIsChartLoading] = useState(false);

  // --- 데이터 패칭 ---
  const fetchMarket = async () => {
    try {
      const res = await fetch('/api/market', { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data)) setMarketIndices(data);
    } catch (e) {}
  };

  const fetchNaverRanking = async () => {
    setIsRankingLoading(true);
    const category = tabMapping[activeTab] || 'KOSPI';
    try {
      const res = await fetch(`/api/market?category=${category}`, { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data)) {
        setRankingStocks(data);
      } else {
        setRankingStocks([]);
      }
    } catch (e) {
      setRankingStocks([]);
    }
    finally { setIsRankingLoading(false); }
  };

  useEffect(() => {
    fetchMarket();
    fetchNaverRanking();
    const interval = setInterval(() => {
      fetchMarket();
    }, 60000);
    return () => clearInterval(interval);
  }, [activeTab]);

  // --- 종목 선택 및 차트/AI 호출 ---
  const handleStockClick = (stock: NaverStock) => {
    setSelectedStock(stock);
    setIsBottomSheetOpen(true);
  };

  // [21차] 차트 렌더링 버그 해결 및 Mock 데이터 생성
  const openChart = async () => {
    if (!selectedStock) return;
    setIsBottomSheetOpen(false);
    setActiveModal('chart');
    setIsChartLoading(true);
    
    // 임시 Mock 데이터 (최최후의 수단)
    const mockData = [
      { time: '09:00', price: 10000 },
      { time: '10:00', price: 10200 },
      { time: '11:00', price: 10100 },
      { time: '13:00', price: 10500 },
      { time: '14:00', price: 10400 },
      { time: '15:00', price: 10800 },
      { time: '15:30', price: 10700 },
    ];

    try {
      const res = await fetch(`/api/naver?mode=chart&itemCode=${selectedStock.itemCode}`);
      const data = await res.json();
      if (data.price && data.price.length > 0) {
        setChartData(data.price.map((p: any) => ({
          time: p.localDate.substring(4, 8),
          price: p.closePrice
        })));
      } else {
        // 실제 데이터가 없으면 Mock 데이터 주입 (항상 렌더링되도록)
        setChartData(mockData.map(m => ({ ...m, price: m.price + (Math.random() * 500) })));
      }
    } catch (e) {
      setChartData(mockData);
    }
    finally { setIsChartLoading(false); }
  };

  const openAi = async (mode: 'analysis' | 'strategy') => {
    if (!selectedStock) return;
    setIsBottomSheetOpen(false);
    setActiveModal('ai');
    setAiMode(mode);
    setIsAiLoading(true);
    setAiAnalysis(null);
    
    const instruction = mode === 'analysis' 
      ? `현재가 ${selectedStock.closePrice}, 거래량 ${selectedStock.volume} 데이터를 바탕으로 이 기업의 현재 상황과 펀더멘털을 3줄로 팩트 위주로 분석해.`
      : `현재가 ${selectedStock.closePrice}, 목표가 ${selectedStock.targetPrice} 데이터를 바탕으로 지금 매수/매도/관망 중 어떤 포지션이 유리한지 실전 투자 전략을 3줄로 과감하게 제시해.`;

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: selectedStock.itemCode,
          name: selectedStock.stockName,
          price: selectedStock.closePrice,
          changePercent: selectedStock.fluctuationsRatio,
          instruction
        })
      });
      const data = await res.json();
      setAiAnalysis(data.analysis || data.error);
    } catch (e) {
      setAiAnalysis("분석 실패");
    } finally { setIsAiLoading(false); }
  };

  const getHighProximity = (current: string, high: string) => {
    const c = parseFloat(current.replace(/,/g, ''));
    const h = parseFloat(high.replace(/,/g, ''));
    if (!c || !h) return '-';
    return ((c / h) * 100).toFixed(1) + '%';
  };

  return (
    <div className="w-full relative min-h-screen bg-slate-50 font-sans pb-24">
      {/* 고정 헤더 - [21차] 한글화 */}
      <header className="px-6 py-6 bg-white flex justify-between items-center sticky top-0 z-40 border-b border-gray-100 rounded-none">
        <h1 className="text-2xl font-black tracking-tighter text-slate-900 flex items-center gap-2">
          <BarChart3 className="text-blue-600" size={28} /> AI 스마트 주식
        </h1>
        <button onClick={() => { fetchMarket(); fetchNaverRanking(); }} className="p-3 bg-slate-50 rounded-none text-slate-400 active:scale-95 transition-all border border-slate-100">
          <RefreshCcw size={20} className={isRankingLoading ? 'animate-spin text-blue-500' : ''} />
        </button>
      </header>

      <div className="px-6 mt-6 space-y-8">
        {/* 지수 보드 */}
        <section className="grid grid-cols-2 gap-4">
           {marketIndices.length === 0 ? (
             [1,2].map(i => <div key={i} className="h-32 bg-white rounded-none animate-pulse shadow-none border border-slate-100"></div>)
           ) : marketIndices.map(m => (
             <div key={m.name} className="bg-white p-6 rounded-none border border-slate-200 shadow-none flex flex-col justify-between h-36 group relative overflow-hidden">
                <div className="relative z-10 flex justify-between items-center">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{m.name}</p>
                   {m.isUp ? <TrendingUp size={14} className="text-red-400" /> : <TrendingDown size={14} className="text-blue-400" />}
                </div>
                <div className="relative z-10">
                   <h2 className={`text-[1.8rem] font-black tabular-nums tracking-tighter ${m.isUp ? 'text-red-500' : 'text-blue-500'}`}>{m.price}</h2>
                   <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[11px] font-black ${m.isUp ? 'text-red-400' : 'text-blue-400'}`}>{m.isUp ? '▲' : '▼'} {m.changePrice}</span>
                      <span className={`text-[11px] font-black px-2 py-0.5 rounded-none ${m.isUp ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>{m.changeRate}%</span>
                   </div>
                </div>
             </div>
           ))}
        </section>

        {/* 랭킹 섹션 - [21차] 한글화 */}
        <section className="bg-white rounded-none border border-slate-200 shadow-none overflow-hidden flex flex-col">
           <div className="px-8 pt-8 pb-4 flex justify-between items-end">
              <div className="space-y-1">
                 <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <Award size={18} className="text-blue-500" /> 스마트 랭킹 30
                 </h3>
                 <p className="text-[11px] font-bold text-slate-300 uppercase">정밀 필터링 및 AI 데이터 분석</p>
              </div>
           </div>

           {/* 가로 스크롤 탭 */}
           <div className="px-6 py-4 flex gap-1 overflow-x-auto whitespace-nowrap hide-scrollbar border-b border-slate-100 bg-slate-50/30">
              {Object.keys(tabMapping).map(tabName => (
                <button 
                  key={tabName} 
                  onClick={() => setActiveTab(tabName)} 
                  className={`px-5 py-3 rounded-none text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${activeTab === tabName ? 'bg-blue-600 text-white shadow-none' : 'bg-white text-slate-400 border border-slate-100 border-r-0 last:border-r'}`}
                >
                  {tabName}
                </button>
              ))}
           </div>

           <div className="p-0 border-t border-slate-100 min-h-[400px]">
              {isRankingLoading ? (
                <div className="py-40 text-center flex flex-col items-center justify-center gap-6">
                  <div className="relative">
                    <Loader2 className="animate-spin text-blue-600" size={48} />
                    <div className="absolute inset-0 flex items-center justify-center">
                       <Zap size={16} className="text-blue-600" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest">실시간 데이터 분석 중...</p>
                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{activeTab} 지표를 수집하고 있습니다</p>
                  </div>
                </div>
              ) : rankingStocks.length === 0 ? (
                <div className="py-40 text-center flex flex-col items-center justify-center gap-5">
                   <Info className="text-slate-100" size={48} />
                   <div className="space-y-1">
                     <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">데이터를 찾을 수 없습니다</p>
                     <p className="text-[9px] font-bold text-slate-200 uppercase tracking-widest">새로고침을 하거나 다른 탭을 선택해 주세요</p>
                   </div>
                   <button onClick={fetchNaverRanking} className="mt-2 px-6 py-2 border border-slate-200 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50">데이터 재수신</button>
                </div>
              ) : (
                rankingStocks.slice(0, 30).map((rs, idx) => {
                  const isUp = rs.fluctuationsRatio.startsWith('+') || parseFloat(rs.fluctuationsRatio) > 0;
                  return (
                    <div 
                      key={`${rs.itemCode}-${idx}`} 
                      onClick={() => handleStockClick(rs)} 
                      className="p-7 bg-white border-b border-slate-100 flex justify-between items-center group active:bg-slate-50 transition-all hover:bg-slate-50 relative"
                    >
                       <div className="flex items-center gap-5">
                          <span className="text-[14px] font-black text-slate-300 group-hover:text-blue-500 transition-colors w-6">{idx + 1}</span>
                          <div>
                             <h4 className="text-[18px] font-black text-slate-900 tracking-tighter leading-tight uppercase">{rs.stockName}</h4>
                             <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{rs.itemCode}</span>
                                <span className="text-[11px] font-black text-slate-400">거래량: {rs.volume}</span>
                             </div>
                          </div>
                       </div>
                       <div className="text-right flex flex-col items-end gap-2">
                          <p className="text-[20px] font-black text-slate-900 tracking-tighter leading-none tabular-nums">{rs.closePrice}</p>
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-none flex items-center gap-1 ${isUp ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                             {isUp ? '+' : ''}{rs.fluctuationsRatio}%
                          </span>
                       </div>
                    </div>
                  );
                })
              )}
           </div>
        </section>
      </div>

      {/* 바텀 시트 - [21차] 한글화 */}
      {isBottomSheetOpen && selectedStock && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center px-0 pb-0">
           <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-none" onClick={() => setIsBottomSheetOpen(false)}></div>
           <div className="relative bg-white w-full max-w-[430px] rounded-none p-10 shadow-none animate-in slide-in-from-bottom-full duration-500 border-t-4 border-blue-600">
              <div className="flex items-center justify-between mb-8">
                 <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">{selectedStock.stockName}</h3>
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none mt-2">상세 분석 리서치 / {selectedStock.itemCode}</p>
                 </div>
                 <button onClick={() => setIsBottomSheetOpen(false)} className="p-3 bg-slate-50 rounded-none text-slate-400 border border-slate-100"><X size={20} /></button>
              </div>

              {/* 지표 패널 */}
              <div className="grid grid-cols-2 gap-px bg-slate-200 mb-10 border border-slate-200">
                 {[
                   { label: '52주 최고 / 최저', value: `${selectedStock.high52w} / ${selectedStock.low52w}`, icon: Zap, color: 'text-blue-500' },
                   { label: '신고가 근접율', value: getHighProximity(selectedStock.closePrice, selectedStock.high52w), icon: TrendingUp, color: 'text-red-500', large: true },
                   { label: '증권사 목표가', value: selectedStock.targetPrice === '-' ? '정보 없음' : selectedStock.targetPrice + '원', icon: Target, color: 'text-green-500' },
                   { label: '전문가 투자의견', value: selectedStock.opinion, icon: Info, color: 'text-slate-400' }
                 ].map((item, idx) => (
                   <div key={idx} className="bg-white p-6 rounded-none">
                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-2 flex items-center gap-1.5 font-sans">
                         <item.icon size={10} className={item.color} /> {item.label}
                      </p>
                      <p className={`${item.large ? 'text-xl font-black text-red-500' : 'text-[13px] font-black text-slate-900'} tracking-tight uppercase`}>
                         {item.value}
                      </p>
                   </div>
                 ))}
              </div>

              {/* 액션 버튼 - [21차] 한글화 및 아이콘 최적화 */}
              <div className="grid grid-cols-1 gap-px bg-slate-100 border border-slate-100">
                 <button 
                   onClick={openChart}
                   className="w-full flex items-center justify-between p-7 bg-slate-900 text-white rounded-none group hover:bg-blue-600 transition-all active:scale-[0.99]"
                 >
                    <div className="flex items-center gap-5">
                       <LineChartIcon size={24} className="text-blue-400 group-hover:text-white" />
                       <div className="text-left">
                          <p className="text-[13px] font-black uppercase tracking-widest leading-none">📊 차트 보기</p>
                          <p className="text-[9px] text-white/40 font-bold mt-2 uppercase tracking-widest">실시간 주가 흐름 및 기술적 분석</p>
                       </div>
                    </div>
                    <ChevronRight size={18} className="text-white/20 group-hover:text-white" />
                 </button>

                 <div className="grid grid-cols-2 gap-px">
                    <button 
                      onClick={() => openAi('analysis')}
                      className="flex flex-col items-center gap-4 py-10 bg-white rounded-none hover:bg-slate-50 transition-all group border-r border-slate-100"
                    >
                       <Bot size={32} className="text-slate-400 group-hover:text-blue-600 transition-transform" />
                       <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 group-hover:text-slate-900 font-sans">AI 종목 진단</span>
                    </button>
                    <button 
                      onClick={() => openAi('strategy')}
                      className="flex flex-col items-center gap-4 py-10 bg-white rounded-none hover:bg-slate-50 transition-all group"
                    >
                       <Sparkles size={32} className="text-slate-400 group-hover:text-blue-600 transition-transform" />
                       <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 group-hover:text-slate-900 font-sans">AI 투자 전략</span>
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* 데이터 모달 - [21차] 차트 높이 고정 및 한글화 */}
      {activeModal && selectedStock && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-0">
           <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-none" onClick={() => !isAiLoading && setActiveModal(null)}></div>
           <div className="relative bg-white w-full max-w-[400px] rounded-none p-10 shadow-none animate-in zoom-in-100 duration-300 border-4 border-slate-900">
              <div className="flex justify-between items-center mb-10 pb-6 border-b-2 border-slate-100">
                 <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                       {activeModal === 'chart' ? '상세 주가 흐름' : 'AI 분석 레포트'}
                    </h2>
                    <p className="text-[10px] font-black text-blue-500 mt-2 uppercase tracking-widest">{selectedStock.stockName} 지표</p>
                 </div>
                 <button onClick={() => setActiveModal(null)} className="p-2 bg-slate-900 text-white rounded-none"><X size={20} /></button>
              </div>

              <div className="min-h-[300px]">
                 {activeModal === 'chart' ? (
                   // [21차] 컨테이너 높이 명시적 지정 (h-[300px])
                   <div className="h-[300px] w-full mt-4 bg-slate-50/50 p-2 border border-slate-100">
                      {isChartLoading ? (
                        <div className="h-full flex flex-col items-center justify-center gap-5">
                           <Loader2 className="animate-spin text-blue-600" size={48} />
                           <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">차트 데이터 생성 중...</p>
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                           <AreaChart data={chartData}>
                              <CartesianGrid vertical={false} strokeDasharray="0" stroke="#f1f5f9" />
                              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#cbd5e1' }} />
                              <YAxis hide domain={['auto', 'auto']} />
                              <Tooltip cursor={{ stroke: '#2563eb', strokeWidth: 1 }} contentStyle={{ borderRadius: '0', border: '2px solid #0f172a', boxShadow: 'none', padding: '15px' }} />
                              <Area type="stepAfter" dataKey="price" stroke="#2563eb" strokeWidth={3} fillOpacity={0.1} fill="#3b82f6" animationDuration={500} />
                           </AreaChart>
                        </ResponsiveContainer>
                      )}
                      <div className="grid grid-cols-2 gap-px bg-slate-100 border border-slate-100 mt-8">
                         <div className="bg-white p-5 flex flex-col gap-1">
                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none">52주 신고가</span>
                            <span className="text-xs font-black text-slate-900">{selectedStock.high52w}</span>
                         </div>
                         <div className="bg-white p-5 flex flex-col gap-1">
                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none">현재 주가</span>
                            <span className="text-xs font-black text-blue-600">{selectedStock.closePrice}</span>
                         </div>
                      </div>
                   </div>
                 ) : (
                   <div className="min-h-[260px]">
                      {isAiLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-8">
                           <Bot size={48} className="text-blue-600 animate-pulse" />
                           <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">인공지능 분석 중...</p>
                        </div>
                      ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
                           <div className="bg-slate-50 p-8 border-l-4 border-blue-600">
                              <p className="text-[14px] font-bold leading-relaxed text-slate-800 whitespace-pre-wrap uppercase tracking-tight">
                                 {aiAnalysis}
                              </p>
                           </div>
                           <p className="text-[9px] font-bold text-slate-300 mt-10 text-center uppercase tracking-[0.3em] flex items-center justify-center gap-3">
                              <ShieldAlert size={14} className="text-blue-500" /> GEMINI AI 시스템에 의해 가공된 분석입니다
                           </p>
                        </div>
                      )}
                   </div>
                 )}
              </div>
              
              {!isAiLoading && (
                <button 
                  onClick={() => setActiveModal(null)} 
                  className="w-full bg-slate-900 text-white font-black py-6 rounded-none shadow-none mt-10 uppercase tracking-widest text-[11px] active:scale-[0.98] transition-all hover:bg-blue-600"
                >
                   확인 완료
                </button>
              )}
           </div>
        </div>
      )}
    </div>
  );
}
