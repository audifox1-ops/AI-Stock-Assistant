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
  Time
} from 'lightweight-charts';

interface StockChartProps {
  data: any[];
  isMinute: boolean;
}

const StockChart: React.FC<StockChartProps> = ({ data, isMinute }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  
  // 실시간 가격 정보 상태
  const [hoverData, setHoverData] = useState<any>(null);

  useEffect(() => {
    if (!chartContainerRef.current || !data || data.length === 0) return;

    // 차트 생성
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#334155',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: '#f1f5f9' },
        horzLines: { color: '#f1f5f9' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        borderColor: '#e2e8f0',
        timeVisible: true, // 항상 시간 표시 (가독성)
        secondsVisible: false,
        barSpacing: 6,
      },
      rightPriceScale: {
        borderColor: '#e2e8f0',
        autoScale: true,
      },
      crosshair: {
        mode: 1, // Magnet mode
        vertLine: {
          color: '#64748b',
          width: 1, // Fixed: LineWidth must be an integer (1, 2, 3...)
          style: 1,
          labelBackgroundColor: '#1e293b',
        },
        horzLine: {
          color: '#64748b',
          width: 1, // Fixed: LineWidth must be an integer (1, 2, 3...)
          style: 1,
          labelBackgroundColor: '#1e293b',
        },
      },
    });

    chartRef.current = chart;

    // 1. 캔들스틱 시리즈
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

    // 2. 거래량 시리즈
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#cbd5e1',
      priceFormat: { type: 'volume' },
      priceScaleId: '', 
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    const volumeData: HistogramData[] = data.map(d => ({
      time: d.time as Time,
      value: d.volume,
      color: d.close >= d.open ? '#ef444444' : '#3b82f644',
    }));

    volumeSeries.setData(volumeData);

    // 3. 이동평균선
    const calculateMA = (period: number): LineData[] => {
      const maData: LineData[] = [];
      for (let i = period - 1; i < data.length; i++) {
        const sum = data.slice(i - period + 1, i + 1).reduce((acc, curr) => acc + curr.close, 0);
        maData.push({ time: data[i].time as Time, value: sum / period });
      }
      return maData;
    };

    const colorsMA = ['#ff9900', '#ff00ff', '#00cccc', '#666666'];
    const periodsMA = [5, 20, 60, 120];

    periodsMA.forEach((p, idx) => {
      const maSeries = chart.addSeries(LineSeries, {
        color: colorsMA[idx],
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      maSeries.setData(calculateMA(p));
    });

    // 4. 최고점/최저점 마커
    let highIdx = 0;
    let lowIdx = 0;
    for (let i = 1; i < candleData.length; i++) {
       if (candleData[i].high > candleData[highIdx].high) highIdx = i;
       if (candleData[i].low < candleData[lowIdx].low) lowIdx = i;
    }

    const markers: SeriesMarker<Time>[] = [
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
    createSeriesMarkers(candleSeries, markers);

    // 5. CrosshairMove 연동 (실시간 툴팁 데이터 감지)
    chart.subscribeCrosshairMove(param => {
      if (
        param.point === undefined ||
        !param.time ||
        param.point.x < 0 ||
        param.point.x > chartContainerRef.current!.clientWidth ||
        param.point.y < 0 ||
        param.point.y > 400
      ) {
        setHoverData(null);
      } else {
        const d = param.seriesData.get(candleSeries) as CandlestickData;
        const v = param.seriesData.get(volumeSeries) as HistogramData;
        if (d) {
          // 시간 포맷팅
          let timeStr = '';
          if (typeof d.time === 'number') {
            const date = new Date(d.time * 1000);
            timeStr = isMinute 
              ? `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
              : `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
          } else {
            timeStr = d.time as string;
          }

          setHoverData({
            time: timeStr,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
            volume: v?.value || 0
          });
        }
      }
    });

    // 반응형 처리
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
  }, [data, isMinute]);

  return (
    <div className="w-full bg-white relative font-sans overflow-hidden">
       {/* 실시간 가격 정보 툴팁 (상단 영역) */}
       <div className="absolute top-2 left-4 right-4 z-20 flex flex-wrap gap-x-4 gap-y-1 pointer-events-none bg-white/80 backdrop-blur-sm p-2 rounded-none border border-slate-100 shadow-sm min-h-[40px] items-center">
          {hoverData ? (
             <>
                <div className="flex items-center gap-1.5">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">TIME</span>
                   <span className="text-[11px] font-black text-slate-900 tabular-nums">{hoverData.time}</span>
                </div>
                <div className="flex items-center gap-1.5">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">OPEN</span>
                   <span className="text-[11px] font-black text-slate-900 tabular-nums">{hoverData.open.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1.5">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">HIGH</span>
                   <span className="text-[11px] font-black text-red-600 tabular-nums">{hoverData.high.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1.5">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">LOW</span>
                   <span className="text-[11px] font-black text-blue-600 tabular-nums">{hoverData.low.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1.5 border-r border-slate-200 pr-4">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">CLOSE</span>
                   <span className={`text-[11px] font-black tabular-nums ${hoverData.close >= hoverData.open ? 'text-red-600' : 'text-blue-600'}`}>{hoverData.close.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1.5">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">VOL</span>
                   <span className="text-[11px] font-black text-slate-900 tabular-nums">{hoverData.volume.toLocaleString()}</span>
                </div>
             </>
          ) : (
             <div className="w-full flex justify-between items-center opacity-40">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">MOVE MOUSE OVER CHART TO SEE DATA</span>
                <div className="flex gap-3">
                   {['MA5', 'MA20', 'MA60', 'MA120'].map((ma, i) => (
                      <div key={ma} className="flex items-center gap-1">
                         <div className={`w-2 h-0.5 ${['bg-[#ff9900]', 'bg-[#ff00ff]', 'bg-[#00cccc]', 'bg-[#666666]'][i]}`}></div>
                         <span className="text-[9px] font-bold text-slate-400">{ma}</span>
                      </div>
                   ))}
                </div>
             </div>
          )}
       </div>

       <div ref={chartContainerRef} className="w-full" />
    </div>
  );
};

export default StockChart;
