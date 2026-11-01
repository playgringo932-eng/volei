'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Trophy, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';
import { storageService } from '@/lib/storage';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturou uma exceção:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    try {
      storageService.resetAllData();
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white border-2 border-blue-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-center shadow-xl space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-blue-700 text-white flex items-center justify-center mx-auto shadow-md">
              <Trophy className="w-8 h-8" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Recuperação Automática</span>
              </div>
              <h2 className="text-xl font-black text-slate-900">
                Academia VoleiAraça
              </h2>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Detectamos uma atualização de dados pendente ou incompatibilidade temporária na sincronização. Seus dados estão seguros.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Recarregar Página</span>
              </button>

              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-300 transition-all cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-blue-700" />
                <span>Restaurar Padrão</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
