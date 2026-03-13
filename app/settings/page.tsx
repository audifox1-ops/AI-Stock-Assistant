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
  const [theme, setTheme] = useState<'dark' | 'light'>('light'); 
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleResetData = async () => {
    setIsDeleting(true);
    try {
      const { error: holdingsError } = await supabase
        .from('holdings')
        .delete()
        .neq('id', 0); 

      const { error: interestsError } = await supabase
        .from('alerts')
        .delete()
        .neq('id', 0);

      localStorage.removeItem('ai_stock_holdings');
      localStorage.removeItem('ai_stock_interests');

      alert('모든 데이터가 초기화되었습니다.');
      setIsResetModalOpen(false);
      window.location.reload(); 
    } catch (err) {
      console.error('Reset error:', err);
      alert('초기화 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#191f28] pb-44 overflow-x-hidden animate-in fade-in duration-500 overflow-y-visible">
      {/* Header */}
      <div className="px-8 pt-16 pb-10 overflow-visible">
        <h1 className="text-3xl font-black tracking-tight mb-2 overflow-visible">설정</h1>
        <p className="text-xs text-gray-400 font-bold uppercase tracking-[0.2em] ml-0.5 overflow-visible">App Configuration & Profile</p>
      </div>

      {/* Profile Section */}
      <div className="px-8 mb-12 overflow-visible">
        {/* Physical Separation: flex items-center, gap-x-8 */}
        <div className="bg-gray-50/50 border border-gray-100 rounded-[3rem] p-10 flex items-center gap-x-8 overflow-visible group shadow-sm transition-all hover:bg-gray-50">
          <div className="w-20 h-20 rounded-[2rem] bg-white flex items-center justify-center border border-gray-100 shadow-sm flex-shrink-0">
            <User size={40} className="text-gray-300" />
          </div>
          <div className="flex-1 overflow-visible min-w-0">
            <h2 className="text-2xl font-black text-[#191f28] mb-2 leading-none overflow-visible whitespace-nowrap px-0.5">게스트 투자자님</h2>
            <button className="text-xs font-black text-[#3182f6] hover:underline uppercase tracking-widest flex items-center gap-2 transition-all min-w-max overflow-visible whitespace-nowrap">
              데이터 동기화 및 보호하기
              <ChevronRight size={14} strokeWidth={3} />
            </button>
          </div>
        </div>
      </div>

      {/* Settings List */}
      <div className="px-8 space-y-14 overflow-visible">
        {/* Notifications */}
        <section className="overflow-visible">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-6 ml-3 overflow-visible">Notifications</h3>
          <div className="bg-white border border-gray-100 rounded-[3.5rem] overflow-visible shadow-[0_10px_40px_rgba(0,0,0,0.02)]">
            <div className="p-10 flex justify-between items-center border-b border-gray-50 active:bg-gray-50 transition-colors cursor-pointer group overflow-visible">
              <div className="flex items-center gap-x-8 overflow-visible flex-1 min-w-0">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-[#3182f6] group-hover:scale-110 transition-transform flex-shrink-0"><Bell size={28} /></div>
                <div className="overflow-visible min-w-0 flex-1">
                  <p className="text-xl font-black break-keep whitespace-nowrap overflow-visible px-0.5">수급 포착 실시간 알림</p>
                  <p className="text-xs text-gray-400 font-bold tracking-tight mt-1 overflow-visible whitespace-nowrap">외인/기관 대량 매집 포착 시 발송</p>
                </div>
              </div>
              <button 
                onClick={() => setIsSupplyAlert(!isSupplyAlert)}
                className={`w-16 h-9 rounded-full transition-all duration-400 relative shadow-inner flex-shrink-0 ml-8 \${isSupplyAlert ? 'bg-[#3182f6]' : 'bg-gray-200'}`}
              >
                <div className={`absolute top-1.5 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-400 \${isSupplyAlert ? 'left-8.5' : 'left-1.5'}`}></div>
              </button>
            </div>
            <div className="p-10 flex justify-between items-center active:bg-gray-50 transition-colors cursor-pointer group overflow-visible">
              <div className="flex items-center gap-x-8 overflow-visible flex-1 min-w-0">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform flex-shrink-0"><ShieldCheck size={28} /></div>
                <div className="overflow-visible min-w-0 flex-1">
                  <p className="text-xl font-black break-keep whitespace-nowrap overflow-visible px-0.5">목표가 도달 즉시 알림</p>
                  <p className="text-xs text-gray-400 font-bold tracking-tight mt-1 overflow-visible whitespace-nowrap">설정된 TP/SL 터치 시 메시지 발송</p>
                </div>
              </div>
              <button 
                onClick={() => setIsTargetAlert(!isTargetAlert)}
                className={`w-16 h-9 rounded-full transition-all duration-400 relative shadow-inner flex-shrink-0 ml-8 \${isTargetAlert ? 'bg-[#3182f6]' : 'bg-gray-200'}`}
              >
                <div className={`absolute top-1.5 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-400 \${isTargetAlert ? 'left-8.5' : 'left-1.5'}`}></div>
              </button>
            </div>
          </div>
        </section>

        {/* Display Settings */}
        <section className="overflow-visible">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-6 ml-3 overflow-visible">Appearance</h3>
          <div className="bg-white border border-gray-100 rounded-[3.5rem] p-10 flex justify-between items-center shadow-[0_10px_40px_rgba(0,0,0,0.02)] overflow-visible">
            <div className="flex items-center gap-x-8 overflow-visible flex-1 min-w-0">
              <div className="w-16 h-16 rounded-2xl bg-yellow-50 flex items-center justify-center text-yellow-500 flex-shrink-0">
                {theme === 'dark' ? <Moon size={28} /> : <Sun size={28} />}
              </div>
              <div className="overflow-visible min-w-0 flex-1">
                <p className="text-xl font-black leading-none mb-2 overflow-visible whitespace-nowrap px-0.5">디스플레이 테마</p>
                <p className="text-xs text-gray-400 font-bold tracking-tight overflow-visible whitespace-nowrap">현재: {theme === 'dark' ? '다크 모드' : '라이트 모드'}</p>
              </div>
            </div>
            <div className="flex bg-gray-50 p-2 rounded-2xl border border-gray-100 shadow-inner overflow-visible ml-8">
              <button 
                onClick={() => setTheme('dark')}
                className={`flex items-center gap-2 px-10 py-3 rounded-xl text-xs font-black transition-all whitespace-nowrap min-w-max \${theme === 'dark' ? 'bg-white text-gray-900 shadow-md' : 'text-gray-400'}`}
              >
                <Moon size={14} /> Dark
              </button>
              <button 
                onClick={() => setTheme('light')}
                className={`flex items-center gap-2 px-10 py-3 rounded-xl text-xs font-black transition-all whitespace-nowrap min-w-max \${theme === 'light' ? 'bg-[#3182f6] text-white shadow-md' : 'text-gray-400'}`}
              >
                <Sun size={14} /> Light
              </button>
            </div>
          </div>
        </section>

        {/* Data Management */}
        <section className="overflow-visible">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-6 ml-3 overflow-visible">Privacy & Data</h3>
          <button 
            onClick={() => setIsResetModalOpen(true)}
            className="w-full bg-red-50/30 hover:bg-red-50 border border-red-100 rounded-[3.5rem] p-10 flex justify-between items-center transition-all group active:scale-[0.98] overflow-visible"
          >
            <div className="flex items-center gap-x-8 overflow-visible flex-1 min-w-0">
              <div className="w-16 h-16 rounded-2xl bg-red-500 text-white flex items-center justify-center shadow-xl shadow-red-500/20 flex-shrink-0"><Trash2 size={28} /></div>
              <div className="text-left overflow-visible min-w-0 flex-1">
                <p className="text-xl font-black text-red-500 break-keep whitespace-nowrap overflow-visible px-0.5">포트폴리오 기록 초기화</p>
                <p className="text-xs text-gray-400 font-bold tracking-tight mt-1 overflow-visible whitespace-nowrap">저장된 모든 데이터를 영구히 삭제합니다.</p>
              </div>
            </div>
            <ChevronRight size={24} className="text-red-500/30 group-hover:translate-x-2 transition-transform ml-8 flex-shrink-0" />
          </button>
        </section>

        <button className="w-full py-8 rounded-[3rem] bg-gray-50 border border-gray-100 text-gray-400 font-black text-lg flex items-center justify-center gap-4 hover:bg-gray-100 transition-all active:scale-[0.97] mb-10 px-10 whitespace-nowrap min-w-max">
          <LogOut size={24} />
          시스템 로그아웃
        </button>
      </div>

      {/* Reset Confirmation Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-10 bg-black/40 backdrop-blur-md animate-in fade-in duration-500 overflow-visible">
          <div className="bg-white w-full max-w-lg rounded-[4.5rem] border border-gray-100 p-14 shadow-[0_30px_100px_rgba(0,0,0,0.1)] animate-in zoom-in-95 duration-500 overflow-visible">
            <div className="flex flex-col items-center text-center overflow-visible">
              <div className="w-24 h-24 rounded-[3.5rem] bg-red-50 flex items-center justify-center mb-12 text-red-500 animate-bounce overflow-visible shadow-sm">
                <AlertTriangle size={56} strokeWidth={2.5} />
              </div>
              <h2 className="text-4xl font-black text-[#191f28] mb-6 overflow-visible">데이터 영구 삭제</h2>
              <p className="text-lg text-gray-400 font-bold leading-relaxed mb-14 break-keep overflow-visible px-4">
                포트폴리오와 관심 종목을 포함한 모든 데이터가<br />
                즉시 삭제되며 다시는 복구할 수 없습니다.<br />
                정말로 초기화하시겠습니까?
              </p>
              
              <div className="w-full flex gap-6 overflow-visible">
                <button 
                  onClick={() => setIsResetModalOpen(false)}
                  className="flex-1 py-7 bg-gray-50 rounded-[2.5rem] font-black text-lg text-gray-400 hover:bg-gray-100 transition-all active:scale-95 px-10 whitespace-nowrap min-w-max"
                >
                  아니오, 취소
                </button>
                <button 
                  onClick={handleResetData}
                  disabled={isDeleting}
                  className="flex-1 py-7 bg-red-500 text-white rounded-[2.5rem] font-black text-lg shadow-2xl shadow-red-500/20 hover:bg-red-600 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center px-10 whitespace-nowrap min-w-max"
                >
                  {isDeleting ? <div className="w-8 h-8 border-[4px] border-white border-t-transparent rounded-full animate-spin"></div> : '네, 모두 삭제합니다'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
