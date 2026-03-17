"use client";

import React, { useState, useEffect } from 'react';
import { 
  RefreshCcw, Wallet, BarChart3, Bot, Sparkles, Loader2, HelpCircle, 
  Info, ChevronRight, X, Plus, TrendingUp, Search, AlertCircle, TrendingDown,
  Target, Activity, Zap, Star
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

// 종목명 기반 티커 자동 매핑 딕셔너리
const stockTickerMap: Record<string, string> = { 
  "태웅": "044490.KQ", 
  "삼성전자": "005930.KS", 
  "SK하이닉스": "000660.KS", 
  "카카오": "035720.KS",
  "네이버": "035420.KS",
  "현대차": "005380.KS",
  "LG에너지솔루션": "373220.KS",
  "삼성바이오로직스": "207940.KS"
};

interface NaverStock {
  symbol: string;
  name: string;
  price: string;
  changeRate: string;
  volume: string;
  high52: string;
  low52: string;
  targetPrice: string | number;
  opinion: string;
}

interface Stock {
  id: string | number;
  symbol: string;
  name: string;
  avgPrice: number;
  currentPrice: number | null; 
  quantity: number;
  changePercent?: number;
}

interface MarketIndex {
  name: string;
  symbol: string;
  price: number;
  changePercent: number;
}

export default function PortfolioPage() {
  // --- 상태 관리 ---
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [marketIndices, setMarketIndices] = useState<MarketIndex[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [showBanner, setShowBanner] = useState(true);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  
  // 네이버 랭킹 상태
  const [rankingType, setRankingType] = useState('marketValue'); // marketValue, search, volume
  const [rankingCategory, setRankingCategory] = useState('KOSPI');
  const [rankingStocks, setRankingStocks] = useState<NaverStock[]>([]);
  const [isRankingLoading, setIsRankingLoading] = useState(false);

  // 모달 및 폼 상태
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newStock, setNewStock] = useState({ nameOrSymbol: '', avgPrice: '', quantity: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    try {
      const res = await fetch(`/api/naver?type=${rankingType}&category=${rankingCategory}`, { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data)) setRankingStocks(data);
    } catch (e) {}
    finally { setIsRankingLoading(false); }
  };

  const fetchHoldings = async () => {
    try {
      const { data } = await supabase.from('portfolio_stocks').select('*').order('created_at', { ascending: false });
      if (data) {
        setStocks(data.map(item => ({
          id: item.id, 
          symbol: item.stock_code, 
          name: item.stock_name,
          avgPrice: Number(item.avg_buy_price), 
          currentPrice: item.last_price ? Number(item.last_price) : null, 
          quantity: Number(item.quantity)
        })));
      }
    } catch (e) {}
  };

  const fetchPrices = async () => {
    const symbols = stocks.map(s => s.symbol).filter(Boolean);
    if (symbols.length === 0) {
      setIsRefreshing(false);
      return;
    }
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/stock', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols }),
        cache: 'no-store'
      });
      const data = await res.json();
      setStocks(prev => prev.map(s => data[s.symbol] ? { 
        ...s, currentPrice: data[s.symbol].price, changePercent: data[s.symbol].changePercent 
      } : s));
    } catch (e) {}
    finally { setIsRefreshing(false); }
  };

  const runAnalysis = async (stock: Stock) => {
    setIsAiLoading(true);
    setAiAnalysis(null);
    setSelectedStock(stock);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: stock.symbol,
          name: stock.name,
          price: stock.currentPrice || stock.avgPrice,
          changePercent: stock.changePercent || 0
        }),
        cache: 'no-store'
      });
      const data = await res.json();
      setAiAnalysis(data.analysis || data.error);
    } catch (e) {
      setAiAnalysis("네트워크 상태를 확인해 주세요.");
    } finally { setIsAiLoading(false); }
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStock.nameOrSymbol || !newStock.avgPrice || !newStock.quantity) return;
    
    setIsSubmitting(true);
    try {
      const input = newStock.nameOrSymbol.trim();
      const mappedTicker = stockTickerMap[input] || input;
      const stockName = stockTickerMap[input] ? input : input;

      const { error } = await supabase.from('portfolio_stocks').insert([{
        stock_code: mappedTicker.toUpperCase(),
        stock_name: stockName,
        avg_buy_price: parseFloat(newStock.avgPrice),
        quantity: parseFloat(newStock.quantity)
      }]);

      if (error) throw error;
      
      await fetchHoldings();
      setIsAddModalOpen(false);
      setNewStock({ nameOrSymbol: '', avgPrice: '', quantity: '' });
    } catch (e: any) {
      alert("추가 중 오류 발생: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchMarket();
    fetchHoldings();
    fetchNaverRanking();
    const interval = setInterval(() => {
      fetchMarket();
      fetchPrices();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchNaverRanking();
  }, [rankingType, rankingCategory]);

  useEffect(() => { if(stocks.length > 0) fetchPrices(); }, [stocks.length]);

  const totalCurrent = stocks.reduce((acc, s) => acc + (s.currentPrice || s.avgPrice) * s.quantity, 0);
  const totalBuy = stocks.reduce((acc, s) => acc + (s.avgPrice * s.quantity), 0);
  const totalRate = totalBuy > 0 ? ((totalCurrent / totalBuy - 1) * 100).toFixed(2) : '0.00';

  return (
    <div className="w-full pb-20 relative min-h-screen bg-slate-50 font-sans">
      <header className="px-5 py-6 bg-white flex justify-between items-center border-b border-gray-100 z-40 sticky top-0">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <BarChart3 className="text-blue-600" size={24} /> AI-Stock
        </h1>
        <div className="flex items-center gap-2">
           <Link href="/watchlist" className="p-2 bg-slate-50 rounded-xl text-slate-400">
              <Star size={18} />
           </Link>
           <button onClick={() => { fetchMarket(); fetchPrices(); fetchNaverRanking(); }} className="p-2 bg-slate-50 rounded-xl text-slate-400">
              <RefreshCcw className={isRefreshing ? 'animate-spin text-blue-500' : ''} size={18} />
           </button>
        </div>
      </header>

      <div className="px-5 mt-4 space-y-6">
        {/* Banner */}
        {showBanner && (
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
             <button onClick={() => setShowBanner(false)} className="absolute top-3 right-3 opacity-60 hover:opacity-100">
                <X size={18} />
             </button>
             <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-md">
                   <Sparkles size={20} />
                </div>
                <h4 className="font-bold text-base">스마트한 투자 시작</h4>
             </div>
             <p className="text-sm text-blue-50 font-medium leading-snug mb-4">
                보유 종목을 추가하고 실시간 AI 전략과 정밀 리포트를 받아보세요!
             </p>
             <button onClick={() => setIsAddModalOpen(true)} className="inline-flex items-center gap-1.5 bg-white text-blue-600 px-4 py-2 rounded-xl text-xs font-black hover:bg-blue-50 transition-colors">
                지금 종목 추가하기 <Plus size={14} />
             </button>
          </div>
        )}

        {/* Market Indices */}
        <section className="grid grid-cols-2 gap-3">
           {marketIndices.map(m => (
             <div key={m.symbol} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-24">
                <p className="text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                   {m.name}
                </p>
                <div className="flex justify-between items-end">
                   <h2 className={`text-xl font-bold ${m.changePercent >= 0 ? 'text-red-500' : 'text-blue-500'}`}>{m.price.toLocaleString()}</h2>
                   <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${m.changePercent >= 0 ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600'}`}>
                      {m.changePercent >= 0 ? '+' : ''}{m.changePercent.toFixed(1)}%
                   </span>
                </div>
             </div>
           ))}
        </section>

        {/* Native News Tab - Naver TOP 30 Rankings */}
        <section className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
           <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">
                 <TrendingUp size={16} className="text-red-500" /> Naver Market Top 30
              </h3>
              <div className="flex gap-1">
                 <button onClick={() => setRankingCategory('KOSPI')} className={`px-2 py-1 rounded-md text-[9px] font-black ${rankingCategory === 'KOSPI' ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 border border-gray-100'}`}>KOSPI</button>
                 <button onClick={() => setRankingCategory('KOSDAQ')} className={`px-2 py-1 rounded-md text-[9px] font-black ${rankingCategory === 'KOSDAQ' ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 border border-gray-100'}`}>KOSDAQ</button>
              </div>
           </div>
           
           <div className="flex px-4 py-3 gap-2 overflow-x-auto no-scrollbar bg-white">
              <button onClick={() => setRankingType('marketValue')} className={`flex-shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${rankingType === 'marketValue' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-slate-400'}`}>시총상위</button>
              <button onClick={() => setRankingType('search')} className={`flex-shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${rankingType === 'search' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-slate-400'}`}>검색상위</button>
              <button onClick={() => setRankingType('volume')} className={`flex-shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${rankingType === 'volume' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-slate-400'}`}>거래량상위</button>
           </div>

           <div className="max-h-[400px] overflow-y-auto p-4 space-y-3">
              {isRankingLoading ? (
                 <div className="py-20 text-center flex flex-col items-center gap-3">
                    <Loader2 className="animate-spin text-blue-500" size={32} />
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Loading Market Data...</p>
                 </div>
              ) : rankingStocks.map((rs, idx) => {
                 const isUp = rs.changeRate.startsWith('+') || parseFloat(rs.changeRate) > 0;
                 return (
                    <div key={rs.symbol} className="p-4 bg-slate-50/50 rounded-2xl border border-white hover:border-blue-100 transition-all group">
                       <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] font-black text-blue-600 w-4">{idx + 1}</span>
                             <h4 className="text-sm font-bold text-slate-800">{rs.name}</h4>
                             <span className="text-[9px] font-bold text-slate-300 uppercase">{rs.symbol}</span>
                          </div>
                          <div className="text-right">
                             <p className="text-sm font-black text-slate-900 leading-none">{rs.price}</p>
                             <p className={`text-[10px] font-black ${isUp ? 'text-red-500' : 'text-blue-500'}`}>{rs.changeRate}%</p>
                          </div>
                       </div>
                       <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/50">
                          <div className="space-y-1">
                             <p className="text-[8px] font-black text-slate-300 uppercase flex items-center gap-1"><Activity size={8} /> Volume: <span className="text-slate-500">{rs.volume}</span></p>
                             <p className="text-[8px] font-black text-slate-300 uppercase flex items-center gap-1"><TrendingUp size={8} className="text-red-400" /> 52W High: <span className="text-slate-500">{rs.high52}</span></p>
                             <p className="text-[8px] font-black text-slate-300 uppercase flex items-center gap-1"><TrendingDown size={8} className="text-blue-400" /> 52W Low: <span className="text-slate-500">{rs.low52}</span></p>
                          </div>
                          <div className="space-y-1 text-right">
                             <p className="text-[8px] font-black text-slate-300 uppercase flex items-center justify-end gap-1"><Target size={8} className="text-blue-500" /> Target: <span className="text-blue-600 font-bold">{rs.targetPrice}</span></p>
                             <p className="text-[8px] font-black text-slate-300 uppercase">Opinion: <span className="bg-blue-100 text-blue-600 px-1 rounded-sm text-[7px] font-black">{rs.opinion}</span></p>
                          </div>
                       </div>
                    </div>
                 );
              })}
           </div>
        </section>

        {/* Portfolio Stats */}
        <section className="bg-white p-7 rounded-[2rem] border border-gray-100 shadow-sm">
           <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5 text-slate-400 opacity-80">
                 <Wallet size={14} />
                 <span className="text-[10px] font-black uppercase tracking-widest leading-none">Total Assets</span>
              </div>
              <Info size={14} className="text-slate-200 cursor-pointer" />
           </div>
           <div className="flex items-baseline gap-3 mb-6">
              <h2 className="text-3xl font-bold text-slate-900 tabular-nums tracking-tight">{totalCurrent.toLocaleString()}원</h2>
              <p className={`text-sm font-bold px-2 py-0.5 rounded-lg ${parseFloat(totalRate) >= 0 ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                {parseFloat(totalRate) >= 0 ? '+' : ''}{totalRate}%
              </p>
           </div>
           <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-50">
              <div>
                 <p className="text-[10px] font-bold text-slate-300 uppercase mb-0.5 opacity-70">실시간 손익</p>
                 <p className={`text-base font-bold ${totalCurrent - totalBuy >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                    {(totalCurrent - totalBuy).toLocaleString()}원
                 </p>
              </div>
              <div>
                 <p className="text-[10px] font-bold text-slate-300 uppercase mb-0.5 opacity-70">투자 원금</p>
                 <p className="text-base font-bold text-slate-900">{totalBuy.toLocaleString()}원</p>
              </div>
           </div>
        </section>

        {/* AI Insight */}
        <section className="space-y-4">
           <div className="flex items-center justify-between px-1">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="text-blue-600" size={20} /> AI 투자 인사이트
              </h3>
           </div>
           <div className="bg-blue-50 rounded-[2rem] p-6 text-gray-800 shadow-sm border border-blue-100 flex flex-col justify-center min-h-[180px] relative overflow-hidden group">
              {isAiLoading ? (
                <div className="text-center flex flex-col items-center gap-3">
                   <Loader2 className="animate-spin text-blue-400" size={32} />
                   <p className="text-[10px] font-bold text-blue-300 tracking-widest uppercase">Deep Analyzing...</p>
                </div>
              ) : aiAnalysis ? (
                <div className="animate-in fade-in duration-700">
                   <div className="flex justify-between items-center mb-4">
                      <div className="px-2 py-0.5 bg-blue-500 text-white rounded-md text-[9px] font-black uppercase tracking-widest">{selectedStock?.name} Report</div>
                      <Link href="/chart" className="text-[9px] font-bold text-blue-500 flex items-center gap-0.5">상세 차트 <ChevronRight size={10} /></Link>
                   </div>
                   <p className="text-[15px] font-bold leading-relaxed text-slate-700 whitespace-pre-wrap opacity-90">
                      {aiAnalysis}
                   </p>
                </div>
              ) : (
                <div className="text-center py-6">
                   <Bot size={44} className="mx-auto mb-4 text-blue-100" />
                   <p className="text-sm font-bold text-slate-400">내 주식 리스트에서 분석할 종목을<br/>터치하여 전략을 받아보세요.</p>
                </div>
              )}
           </div>
        </section>

        {/* Portfolio List */}
        <section className="space-y-4 pb-12">
           <div className="flex justify-between items-center px-1">
              <h3 className="text-lg font-bold text-slate-900">내 주식</h3>
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md active:scale-[0.95] transition-all"
              >
                <Plus size={14} /> 종목 추가
              </button>
           </div>
           
           <div className="space-y-3">
              {stocks.length === 0 ? (
                <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-10 text-center flex flex-col items-center gap-3">
                   <div className="p-3 bg-slate-50 rounded-full">
                      <Search size={24} className="text-slate-300" />
                   </div>
                   <p className="text-sm font-bold text-slate-400 leading-relaxed">
                      아직 등록된 주식이 없습니다.<br/>위의 + 버튼을 눌러 추가해 보세요.
                   </p>
                </div>
              ) : (
                stocks.map(s => {
                  const profitRate = s.currentPrice ? ((s.currentPrice / s.avgPrice - 1) * 100).toFixed(2) : '0.00';
                  const isProfit = parseFloat(profitRate) >= 0;
                  const isSelected = selectedStock?.id === s.id;
                  
                  return (
                    <div 
                      key={s.id} 
                      onClick={() => runAnalysis(s)} 
                      className={`w-full flex justify-between items-center p-5 rounded-2xl border transition-all active:scale-[0.98] cursor-pointer shadow-sm
                        ${isSelected ? 'bg-blue-600 border-blue-600 shadow-blue-100' : 'bg-white border-gray-100 hover:bg-slate-50'}
                      `}
                    >
                       <div className="flex flex-col gap-0.5">
                          <h4 className={`text-lg font-bold ${isSelected ? 'text-white' : 'text-slate-900'}`}>{s.name}</h4>
                          <span className={`text-[10px] font-bold uppercase tracking-widest leading-none ${isSelected ? 'text-blue-100' : 'text-slate-300'}`}>
                             {s.symbol} · {s.quantity}주
                          </span>
                       </div>
                       <div className="text-right flex flex-col items-end gap-1.5">
                          <p className={`text-xl font-bold tabular-nums leading-none tracking-tight ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                             {(s.currentPrice || s.avgPrice).toLocaleString()}
                          </p>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                            isSelected 
                              ? 'bg-white/20 text-white' 
                              : (isProfit ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500')
                          }`}>
                             {isProfit ? '+' : ''}{profitRate}%
                          </span>
                       </div>
                    </div>
                  );
                })
              )}
           </div>
        </section>
      </div>

      {/* Add Stock Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-5">
           <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)}></div>
           <div className="relative bg-white w-full max-w-[380px] rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-bold text-slate-900">새 종목 추가</h2>
                 <button onClick={() => setIsAddModalOpen(false)} className="p-1 bg-slate-50 rounded-lg text-slate-400"><X size={20} /></button>
              </div>
              
              <form onSubmit={handleAddStock} className="space-y-5">
                 <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 ml-1">종목명 입력</label>
                    <input 
                      type="text" required placeholder="종목명 입력 (예: 태웅, 삼성전자)"
                      className="w-full border border-gray-300 bg-white text-slate-900 placeholder-gray-400 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold"
                      value={newStock.nameOrSymbol} onChange={e => setNewStock({...newStock, nameOrSymbol: e.target.value})}
                    />
                    <p className="text-[10px] text-blue-500 font-bold ml-1 tracking-tight">💡 이름을 입력하면 코드가 자동 매핑됩니다.</p>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-xs font-bold text-slate-700 ml-1">매수 평단가</label>
                       <input 
                         type="number" required placeholder="단가"
                         className="w-full border border-gray-300 bg-white text-slate-900 placeholder-gray-400 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold"
                         value={newStock.avgPrice} onChange={e => setNewStock({...newStock, avgPrice: e.target.value})}
                       />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-xs font-bold text-slate-700 ml-1">보유 수량</label>
                       <input 
                         type="number" required placeholder="수량"
                         className="w-full border border-gray-300 bg-white text-slate-900 placeholder-gray-400 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold"
                         value={newStock.quantity} onChange={e => setNewStock({...newStock, quantity: e.target.value})}
                       />
                    </div>
                 </div>
                 
                 <div className="pt-2 flex items-center gap-2">
                    <AlertCircle size={14} className="text-blue-500 flex-shrink-0" />
                    <p className="text-[10px] font-bold text-slate-400">데이터는 암호화되어 안전하게 보관됩니다.</p>
                 </div>

                 <button 
                   disabled={isSubmitting}
                   className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                 >
                    {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : '종목 저장하기'}
                 </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
