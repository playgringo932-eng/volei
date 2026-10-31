'use client';

import React, { useState } from 'react';
import {
  Trophy,
  Users,
  Smartphone,
  FileSpreadsheet,
  CalendarDays,
  Bell,
  Plus,
  Database,
  Menu,
  X,
  Camera,
  QrCode,
  Save,
  RefreshCw,
  CloudUpload,
  Settings,
} from 'lucide-react';

interface NavbarProps {
  currentTab: 'admin' | 'instructor' | 'reports' | 'notifications' | 'classes';
  onSelectTab: (tab: 'admin' | 'instructor' | 'reports' | 'notifications' | 'classes') => void;
  onOpenNewStudent: () => void;
  onOpenBackupModal: () => void;
  onOpenQrScanner?: () => void;
  onSaveData?: () => void;
  isSaving?: boolean;
  onOpenSupabaseModal?: () => void;
  isCloudConnected?: boolean;
  totalStudents: number;
  activeStudents: number;
}

export function Navbar({
  currentTab,
  onSelectTab,
  onOpenNewStudent,
  onOpenBackupModal,
  onOpenQrScanner,
  onSaveData,
  isSaving = false,
  onOpenSupabaseModal,
  isCloudConnected = false,
  totalStudents,
  activeStudents,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    {
      id: 'admin' as const,
      label: 'Alunos & Matrículas',
      icon: Users,
      count: activeStudents,
    },
    {
      id: 'instructor' as const,
      label: 'Chamada Mobile',
      icon: Smartphone,
      highlight: true,
      sublabel: 'Tempo Real',
    },
    {
      id: 'reports' as const,
      label: 'Relatórios de Assiduidade',
      icon: FileSpreadsheet,
    },
    {
      id: 'classes' as const,
      label: 'Turnos & Turmas',
      icon: CalendarDays,
    },
    {
      id: 'notifications' as const,
      label: 'Avisos aos Pais',
      icon: Bell,
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="w-full max-w-[1720px] mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 gap-3 xl:gap-4">
          {/* Brand Identity - Clean Blue & White */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-blue-700 flex items-center justify-center shadow-sm text-white font-black shrink-0">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-lg sm:text-xl font-extrabold tracking-tight text-blue-900">
                  VOLEIARAÇA
                </span>
                <span className="text-[10px] sm:text-[11px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/60">
                  07 a 17 Anos
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden xl:block font-medium">
                Gestão Oficial da Academia de Vôlei Juvenil
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center gap-1.5 xl:gap-2 px-2.5 xl:px-3.5 py-1.5 xl:py-2 rounded-lg text-[11px] xl:text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-blue-900 hover:bg-white/80'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 xl:w-4 xl:h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                  {item.count !== undefined && (
                    <span
                      className={`text-[10px] xl:text-[11px] px-1.5 py-0.2 rounded font-bold ${
                        isActive ? 'bg-blue-700 text-blue-100' : 'bg-slate-200/80 text-slate-600'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                  {item.sublabel && !isActive && (
                    <span className="text-[9px] xl:text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 hidden xl:inline">
                      {item.sublabel}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Direct Leitor QR Code Navigation Item */}
            {onOpenQrScanner && (
              <button
                onClick={onOpenQrScanner}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-extrabold whitespace-nowrap bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all active:scale-95 cursor-pointer"
                title="Abrir Leitor de QR Code para Chamada Rápida"
              >
                <Camera className="w-4 h-4 text-white stroke-[2.5]" />
                <span>Leitor QR</span>
                <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-emerald-800 text-white">
                  Chamada
                </span>
              </button>
            )}
          </nav>

          {/* Primary Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* O ÚNICO BOTÃO DE SALVAMENTO NOVO DO SISTEMA */}
            {onSaveData && (
              <button
                onClick={onSaveData}
                disabled={isSaving}
                title={isCloudConnected ? "Salvar tudo no banco Supabase (sincroniza com todos os aparelhos)" : "Conectar ao Supabase para salvar e sincronizar"}
                className="flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs shadow-sm hover:shadow transition-all active:scale-95 cursor-pointer border border-emerald-500 disabled:opacity-50"
              >
                {isSaving ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <CloudUpload className="w-4 h-4 text-emerald-100" />
                )}
                <span>{isSaving ? 'Salvando...' : (isCloudConnected ? 'Salvar no Supabase' : 'Conectar Supabase')}</span>
                <span
                  className={`w-2 h-2 rounded-full ${isCloudConnected ? 'bg-emerald-300 animate-pulse' : 'bg-amber-300'}`}
                  title={isCloudConnected ? 'Supabase Conectado' : 'Supabase Pendente'}
                />
              </button>
            )}

            {onOpenSupabaseModal && (
              <button
                onClick={onOpenSupabaseModal}
                title="Configurações do Supabase & Migrations SQL"
                className="hidden sm:flex p-2.5 rounded-xl text-slate-600 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 transition-colors cursor-pointer"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onOpenBackupModal}
              title="Gerenciar Backups JSON"
              className="hidden sm:flex p-2.5 rounded-xl text-slate-600 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 transition-colors"
            >
              <Database className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenNewStudent}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm hover:shadow transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">Nova Matrícula</span>
              <span className="sm:hidden">Matricular</span>
            </button>

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-blue-700 hover:bg-slate-100 border border-slate-200"
              aria-label="Abrir menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5 text-slate-700" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-4 space-y-1 shadow-lg">
          {/* O Único Botão de Salvamento Novo no Mobile */}
          {onSaveData && (
            <button
              onClick={() => {
                onSaveData();
                setMobileMenuOpen(false);
              }}
              disabled={isSaving}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors mb-2 cursor-pointer disabled:opacity-60"
            >
              <div className="flex items-center gap-2.5">
                {isSaving ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <CloudUpload className="w-4 h-4 text-emerald-100" />
                )}
                <span>{isSaving ? 'Salvando...' : (isCloudConnected ? 'Salvar no Supabase (Nuvem)' : 'Conectar Supabase')}</span>
              </div>
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${isCloudConnected ? 'bg-emerald-800' : 'bg-amber-600'} text-white`}>
                {isCloudConnected ? 'Salvar' : 'Conectar'}
              </span>
            </button>
          )}
          {onOpenQrScanner && (
            <button
              onClick={() => {
                onOpenQrScanner();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold bg-blue-50 text-blue-800 border border-blue-200 transition-colors mb-2"
            >
              <div className="flex items-center gap-2.5">
                <Camera className="w-4 h-4 text-blue-700" />
                <span>Escanear QR Code da Carteirinha</span>
              </div>
              <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded bg-blue-600 text-white">
                Ao Vivo
              </span>
            </button>
          )}
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </div>
                {item.count !== undefined && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-md font-bold ${
                      isActive ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {item.count} alunos
                  </span>
                )}
              </button>
            );
          })}

          <button
            onClick={() => {
              onOpenBackupModal();
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors border-t border-slate-100 mt-1"
          >
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-slate-500" />
              <span>Backup & Banco de Dados</span>
            </div>
            <span className="text-xs text-slate-400">JSON</span>
          </button>
        </div>
      )}

      {/* Linha de Demarcação Oficial da Quadra (Vôlei - Linha Central & Quadra) */}
      <div className="w-full h-1 bg-blue-700 flex items-center justify-between relative overflow-hidden">
        <div className="w-1/3 h-full bg-blue-600"></div>
        <div className="w-8 h-full bg-white shadow-xs" title="Linha Central / Rede"></div>
        <div className="w-1/3 h-full bg-blue-600"></div>
      </div>
    </header>
  );
}
