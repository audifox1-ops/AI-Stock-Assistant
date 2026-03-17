"use client";

import React, { useEffect, useRef } from 'react';
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
  createSeriesMarkers
} from 'lightweight-charts';

interface StockChartProps {
  data: any[];
  isMinute: boolean;
}

const StockChart: React.FC<StockChartProps> = ({ data, isMinute }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || !data || data.length === 0) return;

    // 차트 생성
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#334155',
      },
      grid: {
        vertLines: { color: '#f1f5f9' },
        horzLines: { color: '#f1f5f9' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        borderColor: '#e2e8f0',
        timeVisible: isMinute,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#e2e8f0',
      },
    });

    chartRef.current = chart;

    // 1. 캔들스틱 시리즈 (Candlestick)
    // [v5 Fix]: addCandlestickSeries 대신 unified addSeries API 사용
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#ef4444',
      downColor: '#3b82f6',
      borderVisible: false,
      wickUpColor: '#ef4444',
      wickDownColor: '#3b82f6',
    });

    const candleData: CandlestickData[] = data.map(d => ({
      time: d.time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    candleSeries.setData(candleData);

    // 2. 거래량 시리즈 (Volume)
    // [v5 Fix]: addHistogramSeries 대신 unified addSeries API 사용
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#cbd5e1',
      priceFormat: { type: 'volume' },
      priceScaleId: '', // 별도의 스케일 (하단 오버레이)
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    const volumeData: HistogramData[] = data.map(d => ({
      time: d.time,
      value: d.volume,
      color: d.close >= d.open ? '#ef444444' : '#3b82f644',
    }));

    volumeSeries.setData(volumeData);

    // 3. 이동평균선 (MA 5, 20, 60, 120)
    const calculateMA = (period: number): LineData[] => {
      const maData: LineData[] = [];
      for (let i = period - 1; i < data.length; i++) {
        const sum = data.slice(i - period + 1, i + 1).reduce((acc, curr) => acc + curr.close, 0);
        maData.push({ time: data[i].time, value: sum / period });
      }
      return maData;
    };

    const colorsMA = ['#ff9900', '#ff00ff', '#00cccc', '#666666'];
    const periodsMA = [5, 20, 60, 120];

    periodsMA.forEach((p, idx) => {
      // [v5 Fix]: addLineSeries 대신 unified addSeries API 사용
      const maSeries = chart.addSeries(LineSeries, {
        color: colorsMA[idx],
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      maSeries.setData(calculateMA(p));
    });

    // 4. 최고점/최저점 마커 표시
    let highIdx = 0;
    let lowIdx = 0;
    for (let i = 1; i < candleData.length; i++) {
       if (candleData[i].high > candleData[highIdx].high) highIdx = i;
       if (candleData[i].low < candleData[lowIdx].low) lowIdx = i;
    }

    const markers: SeriesMarker<any>[] = [
      {
        time: candleData[highIdx].time,
        position: 'aboveBar',
        color: '#ef4444',
        shape: 'arrowDown',
        text: `MAX: ${candleData[highIdx].high.toLocaleString()}`,
      },
      {
        time: candleData[lowIdx].time,
        position: 'belowBar',
        color: '#3b82f6',
        shape: 'arrowUp',
        text: `MIN: ${candleData[lowIdx].low.toLocaleString()}`,
      }
    ];
    // [v5.1 Fix]: setMarkers/createSeriesMarkers는 메서드가 아닌 독립 함수로 호출해야 함
    createSeriesMarkers(candleSeries, markers);

    // 반응형 처리
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    // 줌 최적화
    chart.timeScale().fitContent();

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, isMinute]);

  return (
    <div className="w-full bg-white relative">
       <div ref={chartContainerRef} className="w-full" />
       {/* 차트 상단 범례/정보 표시 (필요 시) */}
       <div className="absolute top-4 left-4 flex gap-3 pointer-events-none">
          <div className="flex items-center gap-1">
             <div className="w-2 h-0.5 bg-[#ff9900]"></div>
             <span className="text-[9px] font-bold text-slate-400">MA5</span>
          </div>
          <div className="flex items-center gap-1">
             <div className="w-2 h-0.5 bg-[#ff00ff]"></div>
             <span className="text-[9px] font-bold text-slate-400">MA20</span>
          </div>
          <div className="flex items-center gap-1">
             <div className="w-2 h-0.5 bg-[#00cccc]"></div>
             <span className="text-[9px] font-bold text-slate-400">MA60</span>
          </div>
          <div className="flex items-center gap-1">
             <div className="w-2 h-0.5 bg-[#666666]"></div>
             <span className="text-[9px] font-bold text-slate-400">MA120</span>
          </div>
       </div>
    </div>
  );
};

export default StockChart;
