"use client";

import React, { useEffect, useRef, useState } from 'react';
import { 
  createChart, 
  ColorType, 
  IChartApi, 
  CandlestickData, 
  HistogramData,
  LineData,
  SeriesMarker,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  createSeriesMarkers,
  Time,
  ISeriesApi
} from 'lightweight-charts';

/**
 * [chart-master] 인터페이스 정렬:
 * - Vercel 빌드 에러 방지를 위해 ticker, className 등 모든 프롭스를 명시적으로 정의합니다.
 */
interface StockChartProps {
  data: any[];
  isMinute: boolean;
  ticker?: string;      // 빌드 에러 방지용 (선택적)
  className?: string;   // 컨테이너 스타일용
}

/**
 * [chart-master] 역할:
 * - 수천 개의 캔들 데이터를 부동하게 렌더링하고 모바일 대응을 완료합니다.
 * - OHLCV 레전드, 이동평균선, 실시간 상호작용을 완벽하게 구현합니다.
 */

const StockChart: React.FC<StockChartProps> = ({ data, isMinute, className }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  
  // 실시간 레전드(Legend) 상태
  const [legendData, setLegendData] = useState<any>(null);

  useEffect(() => {
    if (!chartContainerRef.current || !data || data.length === 0) return;

    // 차트 초기화
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#64748b',
        fontSize: 11,
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      grid: {
        vertLines: { color: '#f8fafc' },
        horzLines: { color: '#f8fafc' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 450,
      timeScale: {
        borderColor: '#f1f5f9',
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 8,
      },
      rightPriceScale: {
        borderColor: '#f1f5f9',
        autoScale: true,
        scaleMargins: {
          top: 0.1,
          bottom: 0.25, // 하단 거래량 공간 확보
        },
      },
      crosshair: {
        mode: 1, // Magnet
        vertLine: {
          color: '#cbd5e1',
          width: 1,
          style: 3, // Dotted
          labelBackgroundColor: '#0f172a',
        },
        horzLine: {
          color: '#cbd5e1',
          width: 1,
          style: 3, // Dotted
          labelBackgroundColor: '#0f172a',
        },
      },
      handleScroll: { vertTouchDrag: false }, // 모바일 스크롤 간섭 방지
    });

    chartRef.current = chart;

    // 1. [chart-master] 캔들스틱 시리즈 (OHLC)
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#ef4444',
      downColor: '#3b82f6',
      borderVisible: false,
      wickUpColor: '#ef4444',
      wickDownColor: '#3b82f6',
    });

    const candleData: CandlestickData[] = data.map(d => ({
      time: d.time as Time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    candleSeries.setData(candleData);

    // 2. [chart-master] 거래량 시리즈 (Isolate to bottom 20%)
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#cbd5e1',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume-scale', // 전용 스케일 아이디 부여 (침범 방지)
    });

    chart.priceScale('volume-scale').applyOptions({
      scaleMargins: {
        top: 0.8, // 상단 80% 비움
        bottom: 0,
      },
    });

    const volumeData: HistogramData[] = data.map(d => ({
      time: d.time as Time,
      value: d.volume,
      color: d.close >= d.open ? '#fee2e2' : '#dbeafe', // 연한 색상으로 캔들 가독성 방해 금지
    }));

    volumeSeries.setData(volumeData);

    // 3. [chart-master] 이동평균선 (MA5, MA20, MA60)
    const calculateMA = (period: number): LineData[] => {
      const maData: LineData[] = [];
      for (let i = period - 1; i < data.length; i++) {
        const sum = data.slice(i - period + 1, i + 1).reduce((acc, curr) => acc + curr.close, 0);
        maData.push({ time: data[i].time as Time, value: sum / period });
      }
      return maData;
    };

    const maConfig: { period: number; color: string; width: 1 | 2 | 3 | 4 }[] = [
      { period: 5, color: '#f59e0b', width: 1 },
      { period: 20, color: '#ec4899', width: 1 },
      { period: 60, color: '#06b6d4', width: 1 }
    ];

    maConfig.forEach(cfg => {
      const maSeries = chart.addSeries(LineSeries, {
        color: cfg.color,
        lineWidth: cfg.width,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      maSeries.setData(calculateMA(cfg.period));
    });

    // 4. [chart-master] 최고/최저가 마커
    let highIdx = 0;
    let lowIdx = 0;
    for (let i = 1; i < candleData.length; i++) {
      if (candleData[i].high > candleData[highIdx].high) highIdx = i;
      if (candleData[i].low < candleData[lowIdx].low) lowIdx = i;
    }

    createSeriesMarkers(candleSeries, [
      { time: candleData[highIdx].time, position: 'aboveBar', color: '#ef4444', shape: 'arrowDown', text: `▼ ${candleData[highIdx].high.toLocaleString()}` },
      { time: candleData[lowIdx].time, position: 'belowBar', color: '#3b82f6', shape: 'arrowUp', text: `▲ ${candleData[lowIdx].low.toLocaleString()}` }
    ]);

    // 5. [chart-master] 실시간 Crosshair & Legend (O, H, L, C, V)
    chart.subscribeCrosshairMove(param => {
      if (!param.time || !param.point || param.point.x < 0) {
        // 기본값은 마지막 데이터
        const last = data[data.length - 1];
        if (last) {
          setLegendData({ ...last, isLast: true });
        }
        return;
      }

      const candle = param.seriesData.get(candleSeries) as CandlestickData;
      const volume = param.seriesData.get(volumeSeries) as HistogramData;

      if (candle) {
        setLegendData({
          time: candle.time,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: volume?.value || 0,
          isLast: false
        });
      }
    });

    // 초기 레전드 설정
    if (data.length > 0) {
      setLegendData({ ...data[data.length - 1], isLast: true });
    }

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);
    chart.timeScale().fitContent();

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data]);

  // 시간 포맷함수
  const formatTime = (t: any) => {
    if (!t) return '';
    if (typeof t === 'number') {
      const date = new Date(t * 1000);
      return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    return t;
  };

  return (
    <div className={`bg-white relative rounded-2xl border border-slate-100 shadow-sm overflow-hidden ${className || 'w-full'}`}>
      {/* PROFESSIONAL LEGEND UI */}
      <div className="absolute top-4 left-4 z-20 pointer-events-none bg-white/60 backdrop-blur-md p-3 rounded-xl border border-white/40 shadow-sm">
        <div className="flex flex-col gap-2">
          {legendData && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400">TIME</span>
                <span className="text-xs font-bold text-slate-700 tabular-nums">{formatTime(legendData.time)}</span>
                {legendData.isLast && <span className="text-[8px] bg-blue-500 text-white px-1 rounded-sm animate-pulse">LIVE</span>}
              </div>
              <div className="flex gap-4">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-400">O</span>
                  <span className="text-[13px] font-bold text-slate-900 tabular-nums">{legendData.open.toLocaleString()}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-400">H</span>
                  <span className="text-[13px] font-bold text-red-500 tabular-nums">{legendData.high.toLocaleString()}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-400">L</span>
                  <span className="text-[13px] font-bold text-blue-500 tabular-nums">{legendData.low.toLocaleString()}</span>
                </div>
                <div className="flex flex-col border-r border-slate-100 pr-4">
                  <span className="text-[9px] font-bold text-slate-400">C</span>
                  <span className={`text-[13px] font-bold tabular-nums ${legendData.close >= legendData.open ? 'text-red-500' : 'text-blue-500'}`}>{legendData.close.toLocaleString()}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-400">VOL</span>
                  <span className="text-[13px] font-bold text-slate-900 tabular-nums">{(legendData.volume || 0).toLocaleString()}</span>
                </div>
              </div>
            </>
          )}
          
          <div className="flex gap-3 mt-1 pt-2 border-t border-slate-50">
            <div className="flex items-center gap-1">
              <div className="w-2 h-0.5 bg-[#f59e0b]"></div>
              <span className="text-[9px] font-bold text-slate-400">MA5</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-0.5 bg-[#ec4899]"></div>
              <span className="text-[9px] font-bold text-slate-400">MA20</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-0.5 bg-[#06b6d4]"></div>
              <span className="text-[9px] font-bold text-slate-400">MA60</span>
            </div>
          </div>
        </div>
      </div>

      <div ref={chartContainerRef} className="w-full" />
    </div>
  );
};

export default StockChart;
