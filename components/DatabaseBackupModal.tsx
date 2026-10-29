'use client';

import React, { useState } from 'react';
import {
  X,
  Database,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { storageService } from '@/lib/storage';

interface DatabaseBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataResetOrRestored: () => void;
}

export function DatabaseBackupModal({
  isOpen,
  onClose,
  onDataResetOrRestored,
}: DatabaseBackupModalProps) {
  const [jsonText, setJsonText] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleDownloadBackup = () => {
    const jsonStr = storageService.exportDatabaseJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VoleiPro_Backup_DB_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMsg({ type: 'success', text: 'Backup exportado com sucesso!' });
  };

  const handleRestoreFromText = () => {
    if (!jsonText.trim()) {
      setStatusMsg({ type: 'error', text: 'Por favor, cole o conteúdo JSON para restauração.' });
      return;
    }
    const success = storageService.restoreDatabaseJSON(jsonText);
    if (success) {
      setStatusMsg({ type: 'success', text: 'Banco de dados restaurado com sucesso!' });
      onDataResetOrRestored();
      setTimeout(() => onClose(), 1500);
    } else {
      setStatusMsg({ type: 'error', text: 'Formato JSON inválido. Verifique o arquivo.' });
    }
  };

  const handleResetDefaults = () => {
    if (
      confirm(
        'Tem certeza que deseja restaurar os dados de demonstração iniciais? Isso atualizará turmas, alunos de 07 a 17 anos e histórico de presença.'
      )
    ) {
      storageService.resetAllData();
      setStatusMsg({ type: 'success', text: 'Dados restaurados para o padrão de demonstração!' });
      onDataResetOrRestored();
      setTimeout(() => onClose(), 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-xl overflow-hidden my-4">
        {/* Header */}
        <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Gestão do Banco de Dados</h3>
              <p className="text-xs text-slate-500">Backup, restauração e persistência local</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          {statusMsg && (
            <div
              className={`p-3 rounded-xl flex items-center gap-2 font-semibold ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* 1. Download Backup */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <div className="font-bold text-slate-900 text-xs">1. Exportar Backup do Banco</div>
            <p className="text-slate-600 text-[11px]">
              Baixa arquivo JSON com todos os alunos matriculados, turmas, frequências e histórico de mensagens.
            </p>
            <button
              onClick={handleDownloadBackup}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 font-semibold text-xs shadow-xs transition-colors"
            >
              <Download className="w-4 h-4 text-blue-700" />
              <span>Baixar Backup Completo (.json)</span>
            </button>
          </div>

          {/* 2. Restore Backup */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <div className="font-bold text-slate-900 text-xs">2. Restaurar Backup JSON</div>
            <p className="text-slate-600 text-[11px]">
              Cole o conteúdo do backup para sobrescrever e carregar no banco de dados.
            </p>
            <textarea
              rows={3}
              placeholder='Cole o JSON aqui: {"version": "1.0", "students": [...], ...}'
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-600"
            />
            <button
              onClick={handleRestoreFromText}
              disabled={!jsonText.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold text-xs shadow-xs transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span>Restaurar Banco</span>
            </button>
          </div>

          {/* 3. Reset to Demo Data */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <div className="font-bold text-slate-900 text-xs">3. Restaurar Dados de Demonstração</div>
            <p className="text-slate-600 text-[11px]">
              Recarrega a base com turmas matutinas, vespertinas e noturnas, alunos de 07 a 17 anos e histórico de assiduidade do mês.
            </p>
            <button
              onClick={handleResetDefaults}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-200/80 text-slate-800 hover:bg-slate-300 font-semibold text-xs transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Resetar para Dados Iniciais</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
