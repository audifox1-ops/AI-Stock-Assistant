"use client";

import dynamic from 'next/dynamic';
import React from 'react';

const ChartComponent = dynamic(() => import('@/components/ChartComponent'), { ssr: false });

export default function AnalysisPage() {
  return <ChartComponent />;
}
