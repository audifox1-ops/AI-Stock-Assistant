"use client";

import React, { useState } from 'react';
import { 
  User, 
  Bell, 
  Moon, 
  Sun, 
  Trash2, 
  Info, 
  ChevronRight, 
  ShieldCheck, 
  LogOut,
  AlertTriangle,
  X,
  Check,
  LayoutDashboard
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function SettingsPage() {
  const [isSupplyAlert, setIsSupplyAlert] = useState(true);
  const [isTargetAlert, setIsTargetAlert] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleResetData = async () => {
    setIsDeleting(true);
    try {
      // 보유 종목 삭제
      const { error: holdingsError } = await supabase
        .from('holdings')
        .delete()
        .neq('id', 0); // 모든 데이터 삭제 (임시 처리)

      // 관심 종목 삭제
      const { error: interestsError } = await supabase
        .from('alerts')
        .delete()
        .neq('id', 0);

      localStorage.removeItem('ai_stock_holdings');
      localStorage.removeItem('ai_stock_interests');

      alert('모든 데이터가 초기화되었습니다.');
      setIsResetModalOpen(false);
      window.location.reload(); // 상태 반영을 위해 새로고침
    } catch (err) {
      console.error('Reset error:', err);
      alert('초기화 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-36 font-sans overflow-x-hidden">
      {/* Header */}
      <div className="p-8 pb-6">
        <h1 className="text-2xl font-black bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent italic tracking-tighter">SETTINGS</h1>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">App Configuration & Profile</p>
      </div>

      {/* Profile Section */}
      <div className="px-8 mb-8">
        <div className="bg-slate-800/40 border border-white/5 rounded-[2.5rem] p-6 flex items-center gap-5 relative overflow-hidden group shadow-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-[40px]"></div>
          <div className="w-16 h-16 rounded-2xl bg-slate-700 flex items-center justify-center border border-white/10 shadow-inner group-hover:scale-105 transition-transform duration-500">
            <User size={32} className="text-slate-500" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-black text-slate-100 mb-1">게스트 투자자님</h2>
            <button className="text-[10px] font-black text-blue-500 hover:text-blue-400 uppercase tracking-widest flex items-center gap-1 transition-colors">
              간편 로그인으로 데이터 보호하기
              <ChevronRight size={10} />
            </button>
          </div>
        </div>
      </div>

      {/* Settings List */}
      <div className="px-8 space-y-8">
        {/* Notifications */}
        <section>
          <h3 className="text-xs font-black text-slate-600 uppercase tracking-[0.2em] mb-4 ml-2">Notifications</h3>
          <div className="bg-slate-800/20 border border-white/5 rounded-[2rem] overflow-hidden">
            <div className="p-6 flex justify-between items-center border-b border-white/5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500"><Bell size={18} /></div>
                <div>
                  <p className="text-sm font-bold">외인/기관 수급 포착 알림</p>
                  <p className="text-[10px] text-slate-500 font-medium tracking-tight">주요 세력 매집 포착 시 즉시 알림</p>
                </div>
              </div>
              <button 
                onClick={() => setIsSupplyAlert(!isSupplyAlert)}
                className={`w-12 h-6 rounded-full transition-all duration-300 relative ${isSupplyAlert ? 'bg-blue-500' : 'bg-slate-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${isSupplyAlert ? 'left-7' : 'left-1'}`}></div>
              </button>
            </div>
            <div className="p-6 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500"><ShieldCheck size={18} /></div>
                <div>
                  <p className="text-sm font-bold">목표가 도달 알림</p>
                  <p className="text-[10px] text-slate-500 font-medium tracking-tight">등록된 TP/SL 터치 시 즉시 발송</p>
                </div>
              </div>
              <button 
                onClick={() => setIsTargetAlert(!isTargetAlert)}
                className={`w-12 h-6 rounded-full transition-all duration-300 relative ${isTargetAlert ? 'bg-blue-500' : 'bg-slate-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${isTargetAlert ? 'left-7' : 'left-1'}`}></div>
              </button>
            </div>
          </div>
        </section>

        {/* Display Settings */}
        <section>
          <h3 className="text-xs font-black text-slate-600 uppercase tracking-[0.2em] mb-4 ml-2">Display</h3>
          <div className="bg-slate-800/20 border border-white/5 rounded-[2rem] p-6 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
              </div>
              <div>
                <p className="text-sm font-bold">앱 테마 설정</p>
                <p className="text-[10px] text-slate-500 font-medium">현재: {theme === 'dark' ? '다크 모드' : '라이트 모드'}</p>
              </div>
            </div>
            <div className="flex bg-slate-900/60 p-1 rounded-xl border border-white/5">
              <button 
                onClick={() => setTheme('dark')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${theme === 'dark' ? 'bg-slate-700 text-slate-100 shadow-lg' : 'text-slate-500'}`}
              >
                <Moon size={12} /> Dark
              </button>
              <button 
                onClick={() => setTheme('light')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${theme === 'light' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-500'}`}
              >
                <Sun size={12} /> Light
              </button>
            </div>
          </div>
        </section>

        {/* Data Management */}
        <section>
          <h3 className="text-xs font-black text-slate-600 uppercase tracking-[0.2em] mb-4 ml-2">Data Management</h3>
          <button 
            onClick={() => setIsResetModalOpen(true)}
            className="w-full bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 rounded-[2rem] p-6 flex justify-between items-center transition-all group active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-500/20"><Trash2 size={18} /></div>
              <div className="text-left">
                <p className="text-sm font-black text-red-500 group-hover:text-red-400">내 포트폴리오 데이터 초기화</p>
                <p className="text-[10px] text-slate-500 font-medium">보유/관심 종목을 모두 영구 삭제합니다.</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-red-500/30" />
          </button>
        </section>

        {/* Info Area */}
        <section>
          <h3 className="text-xs font-black text-slate-600 uppercase tracking-[0.2em] mb-4 ml-2">Information</h3>
          <div className="bg-slate-800/20 border border-white/5 rounded-[2rem] overflow-hidden">
            <div className="p-6 flex justify-between items-center border-b border-white/5 hover:bg-white/5 cursor-pointer">
              <div className="flex items-center gap-4"><Info size={18} className="text-slate-500" /><span className="text-sm font-bold">이용약관</span></div>
              <ChevronRight size={16} className="text-slate-700" />
            </div>
            <div className="p-6 flex justify-between items-center border-b border-white/5 hover:bg-white/5 cursor-pointer">
              <div className="flex items-center gap-4"><ShieldCheck size={18} className="text-slate-500" /><span className="text-sm font-bold">개인정보처리방침</span></div>
              <ChevronRight size={16} className="text-slate-700" />
            </div>
            <div className="p-6 flex justify-between items-center text-slate-600">
              <div className="flex items-center gap-4"><LayoutDashboard size={18} /><span className="text-sm font-bold">앱 버전</span></div>
              <span className="text-[10px] font-black">v1.0.0</span>
            </div>
          </div>
        </section>

        <button className="w-full py-5 rounded-[2rem] bg-slate-800 border border-white/5 text-slate-500 font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-800/80 transition-all active:scale-[0.98]">
          <LogOut size={18} />
          로그아웃
        </button>
      </div>

      {/* Reset Confirmation Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-slate-900 w-full max-w-sm rounded-[2.5rem] border border-red-500/20 p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-[2rem] bg-red-500/10 flex items-center justify-center mb-6 text-red-500 animate-bounce">
                <AlertTriangle size={40} />
              </div>
              <h2 className="text-xl font-black text-slate-100 mb-2">데이터 영구 삭제</h2>
              <p className="text-xs text-slate-500 font-medium leading-relaxed mb-8">
                보유 종목, 관심 종목을 포함한 모든 데이터가<br />
                즉시 삭제되며 복구할 수 없습니다.<br />
                정말로 초기화하시겠습니까?
              </p>
              
              <div className="w-full flex gap-3">
                <button 
                  onClick={() => setIsResetModalOpen(false)}
                  className="flex-1 py-4 bg-slate-800 rounded-2xl font-black text-xs text-slate-400 border border-white/5 hover:bg-slate-700 transition-all"
                >
                  취소
                </button>
                <button 
                  onClick={handleResetData}
                  disabled={isDeleting}
                  className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black text-xs shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all disabled:opacity-50 flex items-center justify-center"
                >
                  {isDeleting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : '네, 삭제합니다'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
