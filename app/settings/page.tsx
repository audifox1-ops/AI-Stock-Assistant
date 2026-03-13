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
  const [theme, setTheme] = useState<'dark' | 'light'>('light'); // 기본 라이트 모드
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleResetData = async () => {
    setIsDeleting(true);
    try {
      // 보유 종목 삭제
      const { error: holdingsError } = await supabase
        .from('holdings')
        .delete()
        .neq('id', 0); 

      // 관심 종목 삭제
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
    <div className="min-h-screen bg-white text-[#191f28] pb-44 overflow-x-hidden animate-in fade-in duration-500">
      {/* Header */}
      <div className="px-8 pt-16 pb-10">
        <h1 className="text-3xl font-black tracking-tight mb-2">설정</h1>
        <p className="text-xs text-gray-400 font-bold uppercase tracking-[0.2em] ml-0.5">App Configuration & Profile</p>
      </div>

      {/* Profile Section */}
      <div className="px-8 mb-12">
        <div className="bg-gray-50/50 border border-gray-100 rounded-[3rem] p-8 flex items-center gap-7 relative overflow-hidden group shadow-sm transition-all hover:bg-gray-50">
          <div className="w-20 h-20 rounded-[2rem] bg-white flex items-center justify-center border border-gray-100 shadow-sm group-hover:scale-105 transition-transform duration-500">
            <User size={36} className="text-gray-300" />
          </div>
          <div className="flex-1 overflow-visible">
            <h2 className="text-2xl font-black text-[#191f28] mb-2 leading-none">게스트 투자자님</h2>
            <button className="text-xs font-black text-[#3182f6] hover:underline uppercase tracking-widest flex items-center gap-2 transition-all min-w-fit overflow-visible">
              데이터 동기화 및 보호하기
              <ChevronRight size={14} strokeWidth={3} />
            </button>
          </div>
        </div>
      </div>

      {/* Settings List */}
      <div className="px-8 space-y-14">
        {/* Notifications */}
        <section className="overflow-visible">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-6 ml-3">Notifications</h3>
          <div className="bg-white border border-gray-100 rounded-[3rem] overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.02)]">
            <div className="p-8 flex justify-between items-center border-b border-gray-50 active:bg-gray-50 transition-colors cursor-pointer group">
              <div className="flex items-center gap-6 overflow-visible">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-[#3182f6] group-hover:scale-110 transition-transform"><Bell size={24} /></div>
                <div className="overflow-visible min-w-fit">
                  <p className="text-lg font-black break-keep whitespace-nowrap overflow-visible">수급 포착 실시간 알림</p>
                  <p className="text-xs text-gray-400 font-bold tracking-tight mt-1">외인/기관 대량 매집 포착 시 발송</p>
                </div>
              </div>
              <button 
                onClick={() => setIsSupplyAlert(!isSupplyAlert)}
                className={`w-14 h-8 rounded-full transition-all duration-400 relative shadow-inner \${isSupplyAlert ? 'bg-[#3182f6]' : 'bg-gray-200'}`}
              >
                <div className={`absolute top-1.5 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-400 \${isSupplyAlert ? 'left-8' : 'left-1.5'}`}></div>
              </button>
            </div>
            <div className="p-8 flex justify-between items-center active:bg-gray-50 transition-colors cursor-pointer group">
              <div className="flex items-center gap-6 overflow-visible">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform"><ShieldCheck size={24} /></div>
                <div className="overflow-visible min-w-fit">
                  <p className="text-lg font-black break-keep whitespace-nowrap overflow-visible">목표가 도달 즉시 알림</p>
                  <p className="text-xs text-gray-400 font-bold tracking-tight mt-1">설정된 TP/SL 터치 시 메시지 발송</p>
                </div>
              </div>
              <button 
                onClick={() => setIsTargetAlert(!isTargetAlert)}
                className={`w-14 h-8 rounded-full transition-all duration-400 relative shadow-inner \${isTargetAlert ? 'bg-[#3182f6]' : 'bg-gray-200'}`}
              >
                <div className={`absolute top-1.5 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-400 \${isTargetAlert ? 'left-8' : 'left-1.5'}`}></div>
              </button>
            </div>
          </div>
        </section>

        {/* Display Settings */}
        <section className="overflow-visible">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-6 ml-3">Appearance</h3>
          <div className="bg-white border border-gray-100 rounded-[3rem] p-8 flex justify-between items-center shadow-[0_10px_40px_rgba(0,0,0,0.02)] overflow-visible">
            <div className="flex items-center gap-6 overflow-visible">
              <div className="w-14 h-14 rounded-2xl bg-yellow-50 flex items-center justify-center text-yellow-500">
                {theme === 'dark' ? <Moon size={24} /> : <Sun size={24} />}
              </div>
              <div className="overflow-visible min-w-fit">
                <p className="text-lg font-black leading-none mb-2 overflow-visible">디스플레이 테마</p>
                <p className="text-xs text-gray-400 font-bold tracking-tight">현재: {theme === 'dark' ? '다크 모드' : '라이트 모드'}</p>
              </div>
            </div>
            <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-100 shadow-inner">
              <button 
                onClick={() => setTheme('dark')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all \${theme === 'dark' ? 'bg-white text-gray-900 shadow-md' : 'text-gray-400'}`}
              >
                <Moon size={14} /> Dark
              </button>
              <button 
                onClick={() => setTheme('light')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all \${theme === 'light' ? 'bg-[#3182f6] text-white shadow-md' : 'text-gray-400'}`}
              >
                <Sun size={14} /> Light
              </button>
            </div>
          </div>
        </section>

        {/* Data Management */}
        <section className="overflow-visible">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-6 ml-3">Privacy & Data</h3>
          <button 
            onClick={() => setIsResetModalOpen(true)}
            className="w-full bg-red-50/30 hover:bg-red-50 border border-red-100 rounded-[3rem] p-8 flex justify-between items-center transition-all group active:scale-[0.98] overflow-visible"
          >
            <div className="flex items-center gap-6 overflow-visible">
              <div className="w-14 h-14 rounded-2xl bg-red-500 text-white flex items-center justify-center shadow-xl shadow-red-500/20 group-hover:rotate-12 transition-transform duration-500"><Trash2 size={24} /></div>
              <div className="text-left overflow-visible min-w-fit">
                <p className="text-lg font-black text-red-500 group-hover:text-red-400 break-keep whitespace-nowrap overflow-visible">포트폴리오 기록 초기화</p>
                <p className="text-xs text-gray-400 font-bold tracking-tight mt-1">저장된 모든 데이터를 영구히 삭제합니다.</p>
              </div>
            </div>
            <ChevronRight size={22} className="text-red-500/30 group-hover:translate-x-1 transition-transform" />
          </button>
        </section>

        {/* Info Area */}
        <section className="overflow-visible">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-6 ml-3">Information</h3>
          <div className="bg-white border border-gray-100 rounded-[3rem] overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.02)]">
            <div className="p-8 flex justify-between items-center border-b border-gray-50 active:bg-gray-50 cursor-pointer group">
              <div className="flex items-center gap-6"><Info size={24} className="text-gray-300 group-hover:text-gray-500 transition-colors" /><span className="text-lg font-black overflow-visible min-w-fit">서비스 이용약관</span></div>
              <ChevronRight size={20} className="text-gray-200" />
            </div>
            <div className="p-8 flex justify-between items-center border-b border-gray-50 active:bg-gray-50 cursor-pointer group">
              <div className="flex items-center gap-6"><ShieldCheck size={24} className="text-gray-300 group-hover:text-gray-500 transition-colors" /><span className="text-lg font-black overflow-visible min-w-fit">개인정보 처리방침</span></div>
              <ChevronRight size={20} className="text-gray-200" />
            </div>
            <div className="p-8 flex justify-between items-center text-gray-400">
              <div className="flex items-center gap-6"><LayoutDashboard size={24} /><span className="text-lg font-black overflow-visible min-w-fit">앱 버전 정보</span></div>
              <span className="text-xs font-black tracking-widest px-3 py-1 bg-gray-50 rounded-full">v1.2.0</span>
            </div>
          </div>
        </section>

        <button className="w-full py-7 rounded-[2.5rem] bg-gray-50 border border-gray-100 text-gray-400 font-black text-base flex items-center justify-center gap-3 hover:bg-gray-100 transition-all active:scale-[0.97] mb-10">
          <LogOut size={22} />
          시스템 로그아웃
        </button>
      </div>

      {/* Reset Confirmation Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-10 bg-black/40 backdrop-blur-md animate-in fade-in duration-500">
          <div className="bg-white w-full max-w-lg rounded-[4rem] border border-gray-100 p-12 shadow-[0_30px_100px_rgba(0,0,0,0.1)] animate-in zoom-in-95 duration-500">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-[3rem] bg-red-50 flex items-center justify-center mb-10 text-red-500 animate-bounce">
                <AlertTriangle size={48} strokeWidth={2.5} />
              </div>
              <h2 className="text-3xl font-black text-[#191f28] mb-4">데이터 영구 삭제</h2>
              <p className="text-base text-gray-400 font-bold leading-relaxed mb-12 break-keep">
                포트폴리오와 관심 종목을 포함한 모든 데이터가<br />
                즉시 삭제되며 다시는 복구할 수 없습니다.<br />
                정말로 초기화하시겠습니까?
              </p>
              
              <div className="w-full flex gap-5">
                <button 
                  onClick={() => setIsResetModalOpen(false)}
                  className="flex-1 py-6 bg-gray-50 rounded-[2rem] font-black text-base text-gray-400 hover:bg-gray-100 transition-all active:scale-95"
                >
                  아니오, 취소
                </button>
                <button 
                  onClick={handleResetData}
                  disabled={isDeleting}
                  className="flex-1 py-6 bg-red-500 text-white rounded-[2rem] font-black text-base shadow-2xl shadow-red-500/20 hover:bg-red-600 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center"
                >
                  {isDeleting ? <div className="w-6 h-6 border-[3px] border-white border-t-transparent rounded-full animate-spin"></div> : '네, 모두 삭제합니다'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
