"use client";

import dynamic from 'next/dynamic';
import React from 'react';

// SSR을 비활성화하여 브라우저 라이브러리 충돌 방지
const ChartComponent = dynamic(() => import('@/components/ChartComponent'), { 
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-slate-500 font-black text-sm animate-pulse">차트 정보를 불러오는 중...</p>
    </div>
  )
});

export default function ChartPage() {
  return <ChartComponent />;
}
