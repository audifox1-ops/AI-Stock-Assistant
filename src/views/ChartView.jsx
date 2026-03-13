import React, { useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';
import './ChartView.css';

const ChartView = () => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const [activePeriod, setActivePeriod] = useState('일');
  const [activeIndicator, setActiveIndicator] = useState(['5일선', '20일선']);

  const mockData = {
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
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: 'transparent' },
        textColor: '#94a3b8',
        fontSize: 10,
        fontFamily: 'Inter',
      },
      grid: {
        vertLines: { color: 'rgba(30, 41, 59, 0.5)' },
        horzLines: { color: 'rgba(30, 41, 59, 0.5)' },
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

    const series = chart.addCandlestickSeries({
      upColor: '#ef4444',
      downColor: '#38bdf8',
      borderUpColor: '#ef4444',
      borderDownColor: '#38bdf8',
      wickUpColor: '#ef4444',
      wickDownColor: '#38bdf8',
    });

    series.setData(mockData[activePeriod]);
    
    chartRef.current = chart;
    seriesRef.current = series;

    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current.clientWidth });
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

  const toggleIndicator = (id) => {
    setActiveIndicator(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="chart-container fade-in">
      <div className="chart-header">
        <div className="stock-selector glass-panel">
          <h3>삼성전자</h3>
          <span className="stock-symbol">005930</span>
        </div>
        <div className="period-toggles glass-panel">
          {['일', '주', '월'].map(p => (
            <button 
              key={p} 
              className={`period-btn ${activePeriod === p ? 'active' : ''}`}
              onClick={() => setActivePeriod(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      
      <div className="chart-wrapper-container glass-panel">
        <div ref={chartContainerRef} className="chart-inner" />
      </div>

      <div className="indicator-panel">
        {['5일선', '20일선', '60일선', '120일선'].map(ind => (
          <button 
            key={ind}
            className={`indicator-chip ${activeIndicator.includes(ind) ? 'active' : ''}`}
            onClick={() => toggleIndicator(ind)}
          >
            {ind}
          </button>
        ))}
        <button className="add-indicator">+</button>
      </div>

      <div className="analysis-summary glass-panel slide-up">
        <div className="summary-title">⭐ AI 차트 분석 의견</div>
        <p className="summary-text">
          현재 20일 이동평균선 지지를 받으며 반등 시도 중입니다. 
          최근 외국인 수급이 개선되고 있어 76,000원 돌파 시 추가 상승이 기대되는 기술적 구간입니다.
        </p>
      </div>
    </div>
  );
};

export default ChartView;
