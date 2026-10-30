'use client';

import React, { useState } from 'react';
import {
  X,
  Database,
  CloudUpload,
  CloudDownload,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  FileCode,
  RefreshCw,
  Save,
  Server,
  Terminal,
} from 'lucide-react';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  testSupabaseConnection,
  saveAllToSupabase,
  fetchFromSupabase,
  getLastSyncTime,
  getSupabaseMigrationSql,
  SyncStats,
} from '@/lib/supabase';
import { storageService } from '@/lib/storage';

interface SupabaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataSyncSuccess?: () => void;
  initialTab?: 'sync' | 'migrations';
}

export function SupabaseSyncModal(props: SupabaseSyncModalProps) {
  if (!props.isOpen) return null;
  return (
    <SupabaseSyncModalContent
      key={`${props.initialTab || 'sync'}-${props.isOpen}`}
      {...props}
    />
  );
}

function SupabaseSyncModalContent({
  onClose,
  onDataSyncSuccess,
  initialTab = 'sync',
}: SupabaseSyncModalProps) {
  const [activeTab, setActiveTab] = useState<'sync' | 'migrations'>(initialTab);

  // Supabase Config & Sync State
  const [supabaseUrl, setSupabaseUrl] = useState(() => getSupabaseConfig().url);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(() => getSupabaseConfig().anonKey);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [syncingData, setSyncingData] = useState(false);
  const [restoringData, setRestoringData] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string; stats?: SyncStats } | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => getLastSyncTime());

  // Migrations State
  const [copiedSql, setCopiedSql] = useState(false);

  // Handle Save Supabase Config
  const handleSaveConfig = () => {
    saveSupabaseConfig({ url: supabaseUrl, anonKey: supabaseAnonKey });
    setTestResult({
      success: true,
      message: 'Configuração do Supabase salva com sucesso!',
    });
  };

  // Test Connection
  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    saveSupabaseConfig({ url: supabaseUrl, anonKey: supabaseAnonKey });
    try {
      const res = await testSupabaseConnection();
      setTestResult(res);
    } catch {
      setTestResult({
        success: false,
        message: 'Erro inesperado ao conectar com o Supabase.',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  // Sync to Supabase
  const handleSaveToSupabase = async () => {
    setSyncingData(true);
    setSyncResult(null);
    saveSupabaseConfig({ url: supabaseUrl, anonKey: supabaseAnonKey });
    try {
      const res = await saveAllToSupabase();
      setSyncResult(res);
      if (res.success) {
        setLastSyncTime(getLastSyncTime());
        if (onDataSyncSuccess) onDataSyncSuccess();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na conexão';
      setSyncResult({
        success: false,
        message: `Erro ao sincronizar: ${msg}`,
      });
    } finally {
      setSyncingData(false);
    }
  };

  // Fetch / Restore from Supabase
  const handleRestoreFromSupabase = async () => {
    setRestoringData(true);
    setSyncResult(null);
    try {
      const res = await fetchFromSupabase();
      setSyncResult(res);
      if (res.success && onDataSyncSuccess) {
        onDataSyncSuccess();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao restaurar';
      setSyncResult({
        success: false,
        message: `Erro: ${msg}`,
      });
    } finally {
      setRestoringData(false);
    }
  };

  // Copy Migration SQL
  const handleCopySql = () => {
    navigator.clipboard.writeText(getSupabaseMigrationSql());
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border-2 border-blue-600 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white p-5 sm:p-6 border-b-2 border-blue-900 flex items-center justify-between relative shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shadow-xs">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
                Banco de Dados Supabase
              </h2>
              <p className="text-xs text-blue-200">
                Sincronização em nuvem, migrações SQL e persistência segura
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-blue-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-4 sm:px-6 pt-2 shrink-0">
          <button
            onClick={() => setActiveTab('sync')}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'sync'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CloudUpload className="w-4 h-4" />
            <span>Salvar no Banco Supabase</span>
          </button>

          <button
            onClick={() => setActiveTab('migrations')}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'migrations'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>Script de Migrations SQL</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: SYNC & CONNECTION */}
          {activeTab === 'sync' && (
            <div className="space-y-6">
              {/* Primary Action Card: Salvar no Banco Supabase */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50/60 border-2 border-blue-300 rounded-2xl p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <h3 className="text-sm sm:text-base font-extrabold text-blue-950">
                        Sincronização Completa com a Nuvem
                      </h3>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Garante o salvamento seguro e permanente de todos os alunos, presenças com QR Code, turmas e avisos no banco PostgreSQL Supabase.
                    </p>
                    {lastSyncTime && (
                      <p className="text-[11px] font-semibold text-blue-800 pt-1">
                        Último salvamento: {new Date(lastSyncTime).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={handleSaveToSupabase}
                    disabled={syncingData}
                    className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {syncingData ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <CloudUpload className="w-4 h-4 text-blue-100" />
                    )}
                    <span>{syncingData ? 'Sincronizando...' : '☁️ Salvar Tudo no Banco Agora'}</span>
                  </button>
                </div>

                {/* Sync Feedback Alert */}
                {syncResult && (
                  <div
                    className={`mt-4 p-3.5 rounded-xl border text-xs font-semibold flex items-start gap-2.5 ${
                      syncResult.success
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-rose-50 border-rose-300 text-rose-900'
                    }`}
                  >
                    {syncResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-bold">{syncResult.message}</p>
                      {syncResult.stats && (
                        <p className="text-[11px] text-emerald-800 mt-1">
                          ✓ {syncResult.stats.studentsCount} alunos salvos | ✓ {syncResult.stats.classesCount} turmas | ✓ {syncResult.stats.sessionsCount} sessões de presença
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Configuration Inputs */}
              <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-blue-600" />
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-800">
                      Credenciais do Projeto Supabase
                    </h4>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">
                    Supabase Dashboard → Settings → API
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Project URL (URL do Projeto)
                    </label>
                    <input
                      type="url"
                      value={supabaseUrl}
                      onChange={(e) => setSupabaseUrl(e.target.value)}
                      placeholder="https://seu-projeto-id.supabase.co"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Anon Public Key (Chave Pública Anon)
                    </label>
                    <input
                      type="password"
                      value={supabaseAnonKey}
                      onChange={(e) => setSupabaseAnonKey(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Test Feedback Alert */}
                {testResult && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2.5 ${
                      testResult.success
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-amber-50 border-amber-300 text-amber-900'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                )}

                {/* Config Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveConfig}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5 text-slate-600" />
                      <span>Salvar Configuração</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={testingConnection}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                    >
                      {testingConnection ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-700" />
                      ) : (
                        <Server className="w-3.5 h-3.5 text-blue-700" />
                      )}
                      <span>{testingConnection ? 'Testando...' : 'Testar Conexão'}</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleRestoreFromSupabase}
                    disabled={restoringData}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                    title="Baixar e restaurar dados salvos no Supabase"
                  >
                    {restoringData ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-600" />
                    ) : (
                      <CloudDownload className="w-3.5 h-3.5 text-slate-600" />
                    )}
                    <span>Restaurar do Supabase</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MIGRATIONS SQL */}
          {activeTab === 'migrations' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Terminal className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-blue-950">
                      Como aplicar as Migrations no Supabase
                    </h4>
                    <p className="text-xs text-blue-800 mt-0.5">
                      1. Abra seu painel no Supabase → Vá em <strong>SQL Editor</strong>.
                      <br />
                      2. Cole o código abaixo e clique em <strong>Run</strong>.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleCopySql}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>Copiado com Sucesso!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copiar Script SQL</span>
                    </>
                  )}
                </button>
              </div>

              {/* Code viewer */}
              <div className="relative rounded-2xl overflow-hidden border-2 border-slate-800 shadow-md">
                <div className="bg-slate-900 px-4 py-2 text-xs font-mono text-slate-400 flex items-center justify-between border-b border-slate-800">
                  <span>supabase/migrations/20261030_initial_schema.sql</span>
                  <span className="text-[11px] text-slate-500">PostgreSQL / Supabase</span>
                </div>
                <pre className="bg-slate-950 text-emerald-400 p-4 text-xs font-mono overflow-x-auto max-h-[380px] leading-relaxed">
                  <code>{getSupabaseMigrationSql()}</code>
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
