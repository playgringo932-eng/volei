'use client';

import React, { useState } from 'react';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ArrowRight,
  RefreshCw,
  ShieldAlert,
  X,
} from 'lucide-react';
import { authService, AdminUser } from '@/lib/authService';

interface AdminLoginScreenProps {
  onLoginSuccess: (user: AdminUser) => void;
}

export function AdminLoginScreen({ onLoginSuccess }: AdminLoginScreenProps) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  // Estados do Modal de Recuperação por PIN (3007)
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<1 | 2>(1); // 1 = PIN, 2 = Nova Senha
  const [pinInput, setPinInput] = useState('');
  const [newRecoveryPassword, setNewRecoveryPassword] = useState('');
  const [confirmRecoveryPassword, setConfirmRecoveryPassword] = useState('');
  const [showRecoveryPasswords, setShowRecoveryPasswords] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  const logoSrc = '/assets/aistudio/WhatsApp_Image_2026-11-03_at_11.29.13_1739d5bf.jpeg';

  // Sincroniza a senha do administrador e os dados com o servidor imediatamente ao abrir em qualquer dispositivo
  React.useEffect(() => {
    authService.syncWithServer().catch(() => {});
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setResetSuccessMessage(null);
    setIsLoading(true);

    try {
      const result = await authService.login(username, password, rememberMe);
      setIsLoading(false);

      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setErrorMessage(result.message);
      }
    } catch {
      setIsLoading(false);
      setErrorMessage('Erro ao autenticar. Verifique sua conexão e tente novamente.');
    }
  };

  const handleOpenRecovery = () => {
    setRecoveryStep(1);
    setPinInput('');
    setNewRecoveryPassword('');
    setConfirmRecoveryPassword('');
    setRecoveryError(null);
    setShowRecoveryModal(true);
  };

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);

    if (authService.validateRecoveryPin(pinInput)) {
      setRecoveryStep(2);
    } else {
      setRecoveryError('PIN de segurança incorreto. Tente novamente.');
    }
  };

  const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);

    if (newRecoveryPassword.length < 3) {
      setRecoveryError('A nova senha deve possuir pelo menos 3 caracteres.');
      return;
    }

    if (newRecoveryPassword !== confirmRecoveryPassword) {
      setRecoveryError('A confirmação não confere com a nova senha digitada.');
      return;
    }

    const res = await authService.resetPasswordWithPin(pinInput, newRecoveryPassword);
    if (res.success) {
      setPassword(newRecoveryPassword);
      setResetSuccessMessage('✓ Nova senha de administrador estabelecida com sucesso! Você já pode entrar.');
      setShowRecoveryModal(false);
      setRecoveryStep(1);
      setPinInput('');
      setNewRecoveryPassword('');
      setConfirmRecoveryPassword('');
    } else {
      setRecoveryError(res.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden select-none">
      {/* Decorative Background Lighting & Volleyball Court Grid Lines */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.04] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-300">
        {/* Header Institution Card */}
        <div className="text-center mb-6 space-y-3">
          {/* Logo Oficial da Secretaria de Esportes */}
          <div className="inline-block p-2 bg-white rounded-2xl shadow-2xl border-2 border-blue-500/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoSrc}
              alt="Secretaria Municipal de Esportes, Lazer e Eventos - Araçariguama-SP"
              className="h-16 sm:h-20 w-auto object-contain"
            />
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center justify-center gap-2">
              <span>VOLEIARAÇA</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/40">
                Oficial
              </span>
            </h1>
            <p className="text-xs text-blue-200/80 font-medium mt-1">
              Secretaria Municipal de Esportes, Lazer e Eventos • Araçariguama-SP
            </p>
          </div>
        </div>

        {/* Login Form Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-blue-100 relative">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-700 text-white flex items-center justify-center shadow-md">
                <Lock className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                  Painel de Administração
                </h2>
                <span className="text-[11px] text-slate-500">
                  Acesso restrito para coordenação e professores
                </span>
              </div>
            </div>

            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Protegido</span>
            </span>
          </div>

          {/* Feedback Messages */}
          {errorMessage && (
            <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-semibold">{errorMessage}</div>
            </div>
          )}

          {resetSuccessMessage && (
            <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-semibold">{resetSuccessMessage}</div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Campo de Usuário */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Usuário / Identificação
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Digite seu usuário"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 font-semibold focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Campo de Senha */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Senha de Acesso
                </label>
                <button
                  type="button"
                  onClick={handleOpenRecovery}
                  className="text-[11px] font-bold text-blue-700 hover:text-blue-900 hover:underline cursor-pointer"
                >
                  Esqueci a senha?
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha de administrador"
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 font-semibold focus:outline-none focus:border-blue-600 focus:bg-white transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Opção Lembrar */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                />
                <span className="font-medium">Permanecer conectado neste dispositivo</span>
              </label>
            </div>

            {/* Botão de Entrar */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 active:scale-[0.99] text-white font-extrabold text-xs sm:text-sm tracking-wide shadow-lg shadow-blue-700/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Validando credenciais...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Link para Inscrição Pública de Alunos */}
          <div className="mt-5 pt-4 border-t border-slate-200 text-center space-y-2">
            <span className="text-[11px] font-semibold text-slate-500 block">
              É aluno ou responsável e quer se inscrever?
            </span>
            <a
              href="/inscricao"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-200" />
              <span>Abrir Ficha de Inscrição Oficial</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Institutional Footer */}
        <div className="text-center mt-6 text-xs text-blue-200/70">
          <p>
            Sistema Oficial de Vôlei Juvenil • Desenvolvido por <strong>Hian Salles</strong>
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            Prefeitura Municipal de Araçariguama - SP
          </p>
        </div>
      </div>

      {/* Modal: Recuperação de Senha com PIN 3007 */}
      {showRecoveryModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in"
          onClick={() => setShowRecoveryModal(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl border border-slate-200 text-slate-800 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 leading-tight">
                    {recoveryStep === 1 ? 'Validação de Segurança' : 'Estabelecer Nova Senha'}
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    {recoveryStep === 1 ? 'Etapa 1 de 2: PIN Mestre' : 'Etapa 2 de 2: Nova Senha'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowRecoveryModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mensagem de Erro no Modal */}
            {recoveryError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{recoveryError}</span>
              </div>
            )}

            {/* ETAPA 1: DIGITAÇÃO DO PIN (3007) */}
            {recoveryStep === 1 && (
              <form onSubmit={handleVerifyPin} className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Para redefinir a senha do administrador, informe o <strong>PIN de segurança</strong> autorizado.
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    PIN de Segurança
                  </label>
                  <input
                    type="password"
                    required
                    autoFocus
                    maxLength={10}
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    placeholder="Digite o PIN"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-center text-lg font-black tracking-widest text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white font-mono"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowRecoveryModal(false)}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 px-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-md transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Validar PIN</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            )}

            {/* ETAPA 2: FORMULÁRIO DE NOVA SENHA */}
            {recoveryStep === 2 && (
              <form onSubmit={handleSaveNewPassword} className="space-y-3.5">
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>PIN validado com sucesso! Crie a nova senha de acesso.</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nova Senha
                  </label>
                  <input
                    type={showRecoveryPasswords ? 'text' : 'password'}
                    required
                    autoFocus
                    value={newRecoveryPassword}
                    onChange={(e) => setNewRecoveryPassword(e.target.value)}
                    placeholder="Mínimo de 3 caracteres"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:border-blue-600 focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Confirmar Nova Senha
                  </label>
                  <input
                    type={showRecoveryPasswords ? 'text' : 'password'}
                    required
                    value={confirmRecoveryPassword}
                    onChange={(e) => setConfirmRecoveryPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:border-blue-600 focus:bg-white font-mono"
                  />
                </div>

                <div className="flex items-center justify-between pt-0.5">
                  <button
                    type="button"
                    onClick={() => setShowRecoveryPasswords(!showRecoveryPasswords)}
                    className="text-[11px] font-semibold text-slate-600 hover:text-blue-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    {showRecoveryPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showRecoveryPasswords ? 'Ocultar senhas' : 'Exibir senhas'}</span>
                  </button>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRecoveryModal(false)}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
                  >
                    Salvar Nova Senha
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
