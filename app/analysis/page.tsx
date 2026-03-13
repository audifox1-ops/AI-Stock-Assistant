"use client";

import React, { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';
import { Sparkles } from 'lucide-react';

export default function AnalysisPage() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  const [activePeriod, setActivePeriod] = useState<string>('일');
  const [activeIndicator, setActiveIndicator] = useState<string[]>(['5일선', '20일선']);

  const mockData: any = {
    '일': [
      { time: '2024-03-01', open: 72000, high: 73000, low: 71500, close: 72500 },
      { time: '2024-03-02', open: 72500, high: 74000, low: 72000, close: 73800 },
      { time: '2024-03-03', open: 73800, high: 75000, low: 73500, close: 74900 },
      { time: '2024-03-04', open: 74900, high: 75500, low: 74000, close: 74200 },
      { time: '2024-03-05', open: 74200, high: 76000, low: 74200, close: 75800 },
    ],
    '주': [
      { time: '2024-02-05', open: 68000, high: 71000, low: 67500, close: 70500 },
      { time: '2024-02-12', open: 70500, high: 72500, low: 70000, close: 71800 },
      { time: '2024-02-19', open: 71800, high: 73500, low: 71000, close: 73200 },
      { time: '2024-02-26', open: 73200, high: 76500, low: 73000, close: 75800 },
    ],
    '월': [
      { time: '2023-12-01', open: 62000, high: 68000, low: 61000, close: 67500 },
      { time: '2024-01-01', open: 67500, high: 71000, low: 66000, close: 70200 },
      { time: '2024-02-01', open: 70200, high: 77000, low: 69500, close: 75800 },
    ]
  };

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: 'transparent' },
        textColor: '#94a3b8',
        fontSize: 10,
        fontFamily: 'Inter',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      crosshair: {
        mode: 0,
        vertLine: { color: '#38bdf8', labelBackgroundColor: '#38bdf8' },
        horzLine: { color: '#38bdf8', labelBackgroundColor: '#38bdf8' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
    });

    const series = (chart as any).addCandlestickSeries({
      upColor: '#ef4444',
      downColor: '#3b82f6',
      borderUpColor: '#ef4444',
      borderDownColor: '#3b82f6',
      wickUpColor: '#ef4444',
      wickDownColor: '#3b82f6',
    });

    series.setData(mockData[activePeriod]);
    
    chartRef.current = chart;
    seriesRef.current = series;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (seriesRef.current) {
      seriesRef.current.setData(mockData[activePeriod]);
      chartRef.current.timeScale().fitContent();
    }
  }, [activePeriod]);

  const toggleIndicator = (id: string) => {
    setActiveIndicator(prev => 
      prev.includes(id) ? prev.filter((i: string) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-500 pb-10">
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-bold font-heading">삼성전자</h3>
          <span className="text-xs text-slate-500 font-medium">005930</span>
        </div>
        <div className="flex p-1 bg-navy-900/50 border border-white/5 rounded-xl">
          {['일', '주', '월'].map(p => (
            <button 
              key={p} 
              className={`px-3 py-1 text-xs rounded-lg transition-all ${
                activePeriod === p ? "bg-navy-800 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
              }`}
              onClick={() => setActivePeriod(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      
      <div className="bg-navy-900/40 border border-white/5 rounded-3xl p-3 h-[400px]">
        <div ref={chartContainerRef} className="w-full h-full" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {['5일선', '20일선', '60일선', '120일선'].map(ind => (
          <button 
            key={ind}
            className={`px-4 py-2 rounded-xl text-xs font-bold border whitespace-nowrap transition-all ${
              activeIndicator.includes(ind) 
              ? 'bg-accent-primary/10 text-accent-primary border-accent-primary/20' 
              : 'bg-white/5 text-slate-500 border-white/5'
            }`}
            onClick={() => toggleIndicator(ind)}
          >
            {ind}
          </button>
        ))}
      </div>

      <div className="p-6 bg-navy-900/50 border border-white/5 rounded-3xl animate-in slide-in-from-bottom-3 duration-600">
        <div className="flex items-center gap-2 mb-3 text-accent-primary">
          <Sparkles size={16} />
          <h4 className="text-sm font-bold">AI 차트 분석 의견</h4>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          현재 20일 이동평균선 지지를 받으며 반등 시도 중입니다. 
          최근 외국인 수급이 개선되고 있어 76,000원 돌파 시 추가 상승이 기대되는 기술적 구간입니다.
        </p>
      </div>
    </div>
  );
}
