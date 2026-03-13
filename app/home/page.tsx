export default function HomePage() {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="p-8 text-center bg-navy-900/50 border border-white/5 rounded-3xl backdrop-blur-xl">
        <h2 className="text-2xl font-bold mb-2">안녕하세요, 투자자님! 👋</h2>
        <p className="text-slate-400">오늘의 시장 현황과 보유 종목을 확인해보세요.</p>
      </div>
      
      <div className="flex gap-4">
        <div className="flex-1 p-5 rounded-2xl bg-white/5 border border-white/5 text-center">
          <p className="text-xs text-slate-500 mb-1 font-medium">KOSPI</p>
          <span className="text-lg font-bold text-stock-up">2,680.35</span>
          <span className="text-xs ml-1 font-bold text-stock-up/80">+0.45%</span>
        </div>
        <div className="flex-1 p-5 rounded-2xl bg-white/5 border border-white/5 text-center">
          <p className="text-xs text-slate-500 mb-1 font-medium">KOSDAQ</p>
          <span className="text-lg font-bold text-stock-down">875.12</span>
          <span className="text-xs ml-1 font-bold text-stock-down/80">-0.12%</span>
        </div>
      </div>
    </div>
  );
}
