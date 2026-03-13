"use client";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 p-6">
      <div className="p-8 text-center bg-slate-800/50 border border-white/5 rounded-[2.5rem] backdrop-blur-xl">
        <h2 className="text-2xl font-bold mb-2 font-heading">안녕하세요, 투자자님! 👋</h2>
        <p className="text-slate-400 text-sm">오늘의 시장 현황과 보유 종목을 확인해보세요.</p>
      </div>
      
      <div className="flex gap-4">
        <div className="flex-1 p-6 rounded-3xl bg-slate-800 border border-white/5 text-center shadow-xl">
          <p className="text-[10px] text-slate-500 mb-2 font-black uppercase tracking-widest">KOSPI</p>
          <div className="flex flex-col">
            <span className="text-xl font-bold text-red-500">2,680.35</span>
            <span className="text-xs font-bold text-red-500/80">+0.45%</span>
          </div>
        </div>
        <div className="flex-1 p-6 rounded-3xl bg-slate-800 border border-white/5 text-center shadow-xl">
          <p className="text-[10px] text-slate-500 mb-2 font-black uppercase tracking-widest">KOSDAQ</p>
          <div className="flex flex-col">
            <span className="text-xl font-bold text-blue-400">875.12</span>
            <span className="text-xs font-bold text-blue-400/80">-0.12%</span>
          </div>
        </div>
      </div>

      <div className="mt-4 p-6 bg-blue-500/10 border border-blue-500/20 rounded-[2rem]">
        <h3 className="text-sm font-black text-blue-500 mb-2 uppercase tracking-tighter">AI Market Insight</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          오늘 국내 증시는 반도체 업종의 강세로 코스피가 상승 출발했습니다. 
          외국인의 순매수 규모를 주시하며 변동성에 유의하시기 바랍니다.
        </p>
      </div>
    </div>
  );
}
