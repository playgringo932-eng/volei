'use client';

import dynamic from 'next/dynamic';
import { Trophy, RefreshCw } from 'lucide-react';

const VolleyballAcademyMain = dynamic(
  () => import('@/components/VolleyballAcademyMain').then((mod) => mod.VolleyballAcademyMain),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-700">
        <div className="h-20 w-auto max-w-[200px] flex items-center justify-center p-2 rounded-2xl bg-white border border-slate-200 shadow-lg mb-4 animate-pulse">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/aistudio/WhatsApp_Image_2026-11-03_at_11.29.13_1739d5bf.jpeg"
            alt="Secretaria Municipal de Esportes, Lazer e Eventos - Araçariguama-SP"
            className="h-full w-auto object-contain"
          />
        </div>
        <h1 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
          <span>VoleiAraça</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">Oficial</span>
        </h1>
        <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5 font-medium">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
          <span>Carregando dados da academia...</span>
        </p>
      </div>
    ),
  }
);

import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function Page() {
  return (
    <ErrorBoundary>
      <VolleyballAcademyMain />
    </ErrorBoundary>
  );
}
