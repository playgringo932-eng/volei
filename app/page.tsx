'use client';

import dynamic from 'next/dynamic';
import { Trophy, RefreshCw } from 'lucide-react';

const VolleyballAcademyMain = dynamic(
  () => import('@/components/VolleyballAcademyMain').then((mod) => mod.VolleyballAcademyMain),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-700">
        <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg mb-4 animate-pulse">
          <Trophy className="w-8 h-8" />
        </div>
        <h1 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
          <span>VôleiPro</span>
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

export default function Page() {
  return <VolleyballAcademyMain />;
}
