'use client';

import React, { useState } from 'react';
import {
  X,
  Server,
  CloudUpload,
  CloudDownload,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  FileCode,
  RefreshCw,
  Save,
  Eye,
  EyeOff,
  ClipboardPaste,
  ExternalLink,
  Smartphone,
  Laptop,
  QrCode,
} from 'lucide-react';
import QRCode from 'qrcode';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  isSupabaseConfigured,
  testSupabaseConnection,
  saveAllToSupabase,
  loadAllFromSupabase,
  getLastSyncTime,
  getSupabaseMigrationSql,
  downloadSupabaseMigrationFile,
} from '@/lib/supabase';

interface SupabaseConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncSuccess?: () => void;
}

export function SupabaseConnectionModal({
  isOpen,
  onClose,
  onSyncSuccess,
}: SupabaseConnectionModalProps) {
  const [url, setUrl] = useState(() => getSupabaseConfig().url);
  const [anonKey, setAnonKey] = useState(() => getSupabaseConfig().anonKey);
  const [showKey, setShowKey] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlCode, setShowSqlCode] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const [showMobileQr, setShowMobileQr] = useState(false);
  const [qrImage, setQrImage] = useState<string | null>(null);

  const [lastSync, setLastSync] = useState<string | null>(() => getLastSyncTime());

  const handleGenerateMobileQr = async () => {
    const cleanUrl = url.trim();
    const cleanKey = anonKey.trim();
    if (!cleanUrl || !cleanKey) {
      setStatusMessage({
        type: 'error',
        text: 'Preencha a URL e a Chave antes de gerar o QR Code de sincronização do celular.',
      });
      return;
    }
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const pairUrl = `${origin}/?sync_url=${encodeURIComponent(cleanUrl)}&sync_key=${encodeURIComponent(cleanKey)}`;
      const dataUrl = await QRCode.toDataURL(pairUrl, {
        width: 260,
        margin: 2,
        color: { dark: '#1e3a8a', light: '#ffffff' },
      });
      setQrImage(dataUrl);
      setShowMobileQr(true);
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  const handlePasteUrl = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setUrl(text.trim());
    } catch {
      // Fallback
    }
  };

  const handlePasteKey = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setAnonKey(text.trim());
    } catch {
      // Fallback
    }
  };

  const handleConnectAndSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setStatusMessage(null);
    setIsLoading(true);

    const cleanUrl = url.trim();
    const cleanKey = anonKey.trim();

    if (!cleanUrl || !cleanKey) {
      setStatusMessage({
        type: 'error',
        text: 'Preencha a URL do Projeto e a Chave Anon para continuar.',
      });
      setIsLoading(false);
      return;
    }

    saveSupabaseConfig({ url: cleanUrl, anonKey: cleanKey });

    try {
      // 1. Testa a conexão e verifica as tabelas
      const testRes = await testSupabaseConnection();

      if (!testRes.success) {
        setStatusMessage({
          type: 'error',
          text: testRes.message,
        });
        setIsLoading(false);
        return;
      }

      if (!testRes.tablesExist) {
        setStatusMessage({
          type: 'error',
          text: 'Conexão ativa, mas as tabelas ainda não foram criadas no Supabase! Copie o script SQL abaixo e execute no SQL Editor do Supabase.',
        });
        setIsLoading(false);
        return;
      }

      // 2. Se tudo certo, salva os dados locais no Supabase
      const saveRes = await saveAllToSupabase();
      if (saveRes.success) {
        setLastSync(getLastSyncTime());
        setStatusMessage({
          type: 'success',
          text: '✓ Sucesso! Dados salvos e sincronizados no Supabase. Qualquer dispositivo com estas chaves carregará as alterações automaticamente!',
        });
        if (onSyncSuccess) onSyncSuccess();
      } else {
        setStatusMessage({
          type: 'error',
          text: saveRes.message,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro na sincronização';
      setStatusMessage({
        type: 'error',
        text: `Falha: ${msg}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadFromSupabase = async () => {
    setStatusMessage(null);
    setIsLoading(true);

    if (url.trim() && anonKey.trim()) {
      saveSupabaseConfig({ url: url.trim(), anonKey: anonKey.trim() });
    }

    try {
      const res = await loadAllFromSupabase();
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `✓ Dados carregados do Supabase! (${res.counts?.students || 0} alunos, ${res.counts?.classes || 0} turmas e ${res.counts?.sessions || 0} presenças)`,
        });
        if (onSyncSuccess) onSyncSuccess();
      } else {
        setStatusMessage({
          type: 'error',
          text: res.message,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao carregar';
      setStatusMessage({
        type: 'error',
        text: `Erro: ${msg}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(getSupabaseMigrationSql());
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const configured = isSupabaseConfigured();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border-2 border-blue-600 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white p-5 sm:p-6 border-b-2 border-blue-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shadow-xs">
              <Server className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  Salvar e Sincronizar com Supabase
                </h2>
                {configured ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-black">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Conectado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[10px] font-black">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                    Pendente
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-200">
                Acesse e salve seus dados de qualquer celular, computador ou tablet
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

        {/* Multi-Device Explanatory Banner */}
        <div className="bg-blue-50 border-b border-blue-200/80 px-5 py-3 flex items-center justify-between gap-3 text-xs text-blue-950 font-semibold shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex items-center -space-x-1">
              <Laptop className="w-4 h-4 text-blue-700" />
              <Smartphone className="w-4 h-4 text-blue-700" />
            </div>
            <span>
              Ao conectar o Supabase, todas as alterações são salvas na nuvem e carregadas em qualquer aparelho!
            </span>
          </div>
          {lastSync && (
            <span className="text-[11px] text-blue-800 shrink-0 font-bold hidden sm:inline">
              Último salvamento: {lastSync}
            </span>
          )}
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* PASSO 1: CREDENCIAIS */}
          <form onSubmit={handleConnectAndSave} className="space-y-4">
            <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                    1
                  </span>
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-800">
                    Insira as Chaves do seu Supabase
                  </h3>
                </div>
                <a
                  href="https://supabase.com/dashboard/project/jugrgmjahyylpkmbnfsc/settings/api"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-md border border-blue-200"
                >
                  <span>Copiar chave em Settings → API</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* URL input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Project URL (URL do Projeto)
                </label>
                <div className="relative flex items-center">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://seu-projeto-id.supabase.co"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 pr-20 text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                  <button
                    type="button"
                    onClick={handlePasteUrl}
                    className="absolute right-2 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-900 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer border border-slate-200"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" />
                    <span>Colar</span>
                  </button>
                </div>
              </div>

              {/* Anon Key input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Project API Key (anon / public key)
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={anonKey}
                    onChange={(e) => setAnonKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 pr-28 text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                  <div className="absolute right-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                      title={showKey ? 'Ocultar Chave' : 'Mostrar Chave'}
                    >
                      {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={handlePasteKey}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-900 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer border border-slate-200"
                    >
                      <ClipboardPaste className="w-3.5 h-3.5" />
                      <span>Colar</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Botão de Salvar & Sincronizar */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-black text-xs sm:text-sm shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <CloudUpload className="w-4 h-4 text-white" />
                  )}
                  <span>{isLoading ? 'Conectando e salvando...' : '💾 Conectar & Salvar Tudo no Supabase'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleLoadFromSupabase}
                  disabled={isLoading}
                  className="px-4 py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border-2 border-slate-300 font-bold text-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
                  title="Baixar dados salvos no Supabase para este aparelho"
                >
                  <CloudDownload className="w-4 h-4 text-slate-600 inline mr-1.5" />
                  <span>Carregar do Supabase</span>
                </button>
              </div>

              {/* Botão de Pareamento Instantâneo com Celular */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleGenerateMobileQr}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-xs font-bold transition-all cursor-pointer"
                >
                  <Smartphone className="w-4 h-4 text-indigo-700" />
                  <span>📱 Sincronizar com o Celular via QR Code (Sem precisar digitar chaves)</span>
                </button>

                {showMobileQr && qrImage && (
                  <div className="mt-3 p-4 bg-white border-2 border-indigo-300 rounded-2xl flex flex-col items-center text-center space-y-2 animate-in fade-in zoom-in-95 duration-150">
                    <p className="text-xs font-black text-indigo-950">
                      Aponte a câmera do seu celular para o QR Code abaixo:
                    </p>
                    <p className="text-[11px] text-slate-600 max-w-sm">
                      O aplicativo abrirá no seu telefone já conectado ao mesmo banco de dados, sincronizando todas as alterações em tempo real!
                    </p>
                    <div className="p-3 bg-white border-2 border-indigo-200 rounded-xl shadow-xs">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrImage} alt="QR Code de Conexão com Celular" className="w-48 h-48" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowMobileQr(false)}
                      className="text-[11px] font-bold text-slate-500 hover:text-slate-800 underline pt-1 cursor-pointer"
                    >
                      Ocultar QR Code
                    </button>
                  </div>
                )}
              </div>
              {statusMessage && (
                <div
                  className={`p-3.5 rounded-xl border text-xs font-semibold flex items-start gap-2.5 ${
                    statusMessage.type === 'success'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-rose-50 border-rose-300 text-rose-900'
                  }`}
                >
                  {statusMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span>{statusMessage.text}</span>
                </div>
              )}
            </div>
          </form>

          {/* PASSO 2: MIGRATIONS SQL (CRIAR TABELAS) */}
          <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                  2
                </span>
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-800">
                  Criar as Tabelas no Supabase (SQL Migrations)
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-slate-500">
                Necessário apenas na 1ª vez
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              No painel do Supabase, clique no menu lateral em <strong>SQL Editor</strong> → clique em <strong>New query</strong> → cole o código e clique em <strong>Run</strong>:
            </p>

            <div className="flex items-center gap-2 flex-wrap pt-1">
              <button
                type="button"
                onClick={handleCopySql}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Código SQL Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar Script SQL</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => downloadSupabaseMigrationFile()}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border-2 border-slate-300 font-bold text-xs transition-all cursor-pointer"
              >
                <CloudDownload className="w-4 h-4 text-slate-600" />
                <span>Baixar .sql</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSqlCode(!showSqlCode)}
                className="text-xs text-blue-700 hover:underline font-bold ml-auto cursor-pointer"
              >
                {showSqlCode ? 'Ocultar Código' : 'Visualizar Código SQL'}
              </button>
            </div>

            {showSqlCode && (
              <pre className="bg-slate-900 text-emerald-400 p-3.5 rounded-xl text-xs font-mono overflow-x-auto max-h-48 border border-slate-800">
                <code>{getSupabaseMigrationSql()}</code>
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
