'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Calendar,
  CheckCircle2,
  AlertCircle,
  User,
  Phone,
  Mail,
  ShieldCheck,
  Send,
  Printer,
  Share2,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  HeartPulse,
  Activity,
  Layers,
  Camera,
  Upload,
  Trash2,
  Image as ImageIcon,
} from 'lucide-react';
import { VolleyballClass, Student } from '@/types/volleyball';
import { calculateAge, getCategoryByAge, formatBrazilianPhone } from '@/lib/volleyballHelpers';
import { QRCodeDisplay } from '@/components/QRCodeDisplay';
import { INITIAL_CLASSES } from '@/lib/mockData';
import { storageService } from '@/lib/storage';
import { getAthletePhoto } from '@/lib/avatarHelpers';

/**
 * Converte e otimiza qualquer formato de imagem enviado (PNG, JPG, JPEG, WEBP, GIF, HEIC, BMP, SVG, etc.)
 */
async function processImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao processar o arquivo de imagem.'));
    reader.onload = () => {
      const result = reader.result as string;
      if (file.type === 'image/svg+xml') {
        resolve(result);
        return;
      }
      const img = new Image();
      img.onerror = () => resolve(result);
      img.onload = () => {
        try {
          const maxDim = 640;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.88));
          } else {
            resolve(result);
          }
        } catch {
          resolve(result);
        }
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  });
}

export default function PublicEnrollmentPage() {
  const [classes, setClasses] = useState<VolleyballClass[]>(INITIAL_CLASSES);
  const [loadingClasses, setLoadingClasses] = useState(true);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'Masculino' | 'Feminino'>('Masculino');
  const [classId, setClassId] = useState('');
  const [medicalConditions, setMedicalConditions] = useState('');
  const [allergies, setAllergies] = useState('');

  // Foto do Aluno (suporta PNG, JPG, JPEG, WEBP, GIF, HEIC, BMP, SVG e todos os outros)
  const [photoUrl, setPhotoUrl] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Guardian
  const [guardianName, setGuardianName] = useState('');
  const [guardianRelationship, setGuardianRelationship] = useState<'Mãe' | 'Pai' | 'Responsável Legal' | 'Avô/Avó' | 'Outro'>('Mãe');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [allowWhatsApp, setAllowWhatsApp] = useState(true);
  const [agreedTerms, setAgreedTerms] = useState(false);

  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdStudent, setCreatedStudent] = useState<Student | null>(null);

  const logoSrc = '/assets/aistudio/WhatsApp_Image_2026-11-03_at_11.29.13_1739d5bf.jpeg';

  // Load available classes from server, sorted alphabetically
  useEffect(() => {
    async function loadAvailableClasses() {
      try {
        const res = await fetch('/api/inscricao');
        if (res.ok) {
          const json = await res.json();
          if (json.classes && Array.isArray(json.classes) && json.classes.length > 0) {
            const sortedClasses = json.classes
              .slice()
              .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' }));
            setClasses(sortedClasses);
            setClassId(sortedClasses[0]?.id || '');
          } else {
            setClassId(INITIAL_CLASSES[0].id);
          }
        }
      } catch {
        setClassId(INITIAL_CLASSES[0].id);
      } finally {
        setLoadingClasses(false);
      }
    }
    loadAvailableClasses();
  }, []);

  const currentAge = birthDate ? calculateAge(birthDate) : 0;
  const currentCategory = birthDate && currentAge >= 7 && currentAge <= 17 ? getCategoryByAge(currentAge) : null;
  const isAgeValid = birthDate ? currentAge >= 7 && currentAge <= 17 : true;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError(null);
    setIsUploadingPhoto(true);
    try {
      const optimized = await processImageFile(file);
      setPhotoUrl(optimized);
    } catch {
      setPhotoError('Não foi possível carregar a imagem. Tente outro formato.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGuardianPhone(formatBrazilianPhone(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim()) {
      setErrorMessage('Por favor, informe o nome completo do aluno.');
      return;
    }

    if (!birthDate) {
      setErrorMessage('Por favor, preencha a data de nascimento.');
      return;
    }

    if (currentAge < 7 || currentAge > 17) {
      setErrorMessage(`Idade de ${currentAge} anos não é permitida. As inscrições são restritas para a faixa etária de 07 a 17 anos.`);
      return;
    }

    if (!guardianName.trim()) {
      setErrorMessage('Por favor, informe o nome do responsável legal.');
      return;
    }

    if (!guardianPhone.trim() || guardianPhone.replace(/\D/g, '').length < 10) {
      setErrorMessage('Por favor, informe um telefone/WhatsApp válido com DDD.');
      return;
    }

    if (!agreedTerms) {
      setErrorMessage('É necessário concordar com os termos de compromisso e frequência para concluir a inscrição.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        fullName: fullName.trim(),
        birthDate,
        gender,
        classId: classId || classes[0]?.id || 'turma-m1',
        photoUrl: photoUrl || undefined,
        medicalConditions: medicalConditions.trim() || undefined,
        allergies: allergies.trim() || undefined,
        guardian: {
          name: guardianName.trim(),
          relationship: guardianRelationship,
          phone: guardianPhone.trim(),
          allowWhatsAppNotifications: allowWhatsApp,
        },
      };

      const res = await fetch('/api/inscricao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      setIsSubmitting(false);

      if (json.success && json.student) {
        setCreatedStudent(json.student);
        try {
          await storageService.pullFromSharedSync(true);
        } catch {
          // fallback
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setErrorMessage(json.message || 'Erro ao enviar inscrição. Tente novamente.');
      }
    } catch {
      setIsSubmitting(false);
      setErrorMessage('Falha na conexão com o servidor. Verifique sua internet e tente novamente.');
    }
  };

  const handleShareWhatsApp = () => {
    if (!createdStudent) return;
    const selectedCls = classes.find((c) => c.id === createdStudent.classId);
    const text = `🎉 *Inscrição Confirmada no Vôlei Juvenil - Araçariguama-SP!*

*Atleta:* ${createdStudent.fullName}
*Matrícula Oficial:* ${createdStudent.registrationNumber}
*Categoria:* ${createdStudent.category} (${createdStudent.age} anos)
*Turma:* ${selectedCls?.name || 'Vôlei Juvenil'} (${selectedCls?.shift || 'Geral'})
*Horário:* ${selectedCls?.startTime} às ${selectedCls?.endTime} (${selectedCls?.daysOfWeek?.join('/')})
*Local:* ${selectedCls?.court || 'Quadra Municipal'}

_Secretaria Municipal de Esportes, Lazer e Eventos de Araçariguama-SP_`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleResetForm = () => {
    setFullName('');
    setBirthDate('');
    setGender('Masculino');
    setPhotoUrl('');
    setPhotoError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setMedicalConditions('');
    setAllergies('');
    setGuardianName('');
    setGuardianPhone('');
    setAgreedTerms(false);
    setCreatedStudent(null);
    setErrorMessage(null);
  };

  const selectedClassObj = classes.find((c) => c.id === (createdStudent?.classId || classId));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Top Header Institucional */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs print:hidden">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-auto max-w-[140px] flex items-center justify-center p-0.5 bg-white rounded-xl border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoSrc}
                alt="Secretaria Municipal de Esportes - Araçariguama-SP"
                className="h-full w-auto object-contain"
              />
            </div>
            <div>
              <span className="text-base sm:text-lg font-black text-blue-900 tracking-tight block">
                VOLEIARAÇA
              </span>
              <span className="text-[10px] sm:text-xs text-slate-500 font-medium">
                Secretaria Municipal de Esportes • Araçariguama-SP
              </span>
            </div>
          </div>

          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-blue-700 hover:bg-slate-50 text-xs font-bold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Painel Administrativo</span>
            <span className="sm:hidden">Voltar</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-6 sm:py-10">
        {/* Banner Informativo */}
        {!createdStudent && (
          <div className="text-center mb-8 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold border border-blue-200">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Inscrições Gratuitas Abertas • Temporada 2026</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Ficha de Inscrição Oficial de Vôlei
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
              Academia de Voleibol da Secretaria Municipal de Esportes, Lazer e Eventos de Araçariguama. Atendimento a crianças e jovens de <strong>07 a 17 anos</strong>.
            </p>
          </div>
        )}

        {/* TELA DE SUCESSO / COMPROVANTE */}
        {createdStudent ? (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Cartão de Confirmação e Comprovante */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border-2 border-emerald-500/40 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row items-center gap-4 pb-6 border-b border-slate-100 text-center sm:text-left">
                <div className="relative shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={createdStudent.photoUrl || getAthletePhoto(createdStudent.id, createdStudent.gender)}
                    alt={createdStudent.fullName}
                    className="w-20 h-24 rounded-2xl object-cover border-2 border-emerald-500 shadow-md bg-slate-100"
                  />
                  <span className="absolute -bottom-2 -right-2 bg-emerald-600 text-white p-1 rounded-full shadow-xs">
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                </div>
                <div className="flex-1">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 inline-block mb-1">
                    Inscrição Confirmada com Sucesso!
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                    {createdStudent.fullName}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Os dados e a foto já foram cadastrados e estão visíveis para a coordenação esportiva.
                  </p>
                </div>
              </div>

              {/* Detalhes Oficiais do Comprovante */}
              <div className="py-6 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Matrícula</span>
                    <strong className="font-mono text-sm sm:text-base font-black text-blue-900">{createdStudent.registrationNumber}</strong>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Categoria</span>
                    <strong className="text-sm sm:text-base font-black text-blue-700">{createdStudent.category}</strong>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Idade</span>
                    <strong className="text-sm sm:text-base font-black text-slate-800">{createdStudent.age} anos</strong>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Status</span>
                    <strong className="text-sm sm:text-base font-black text-emerald-700">Ativo</strong>
                  </div>
                </div>

                {/* Turma e Local */}
                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Turma & Horário Escolhidos</span>
                    <strong className="text-slate-900 text-sm block mt-0.5">{selectedClassObj?.name || 'Turma Selecionada'}</strong>
                    <span className="text-slate-600 block">
                      Turno: <strong>{selectedClassObj?.shift}</strong> • {selectedClassObj?.startTime} às {selectedClassObj?.endTime} ({selectedClassObj?.daysOfWeek?.join('/')})
                    </span>
                    <span className="text-slate-500 text-[11px] block mt-0.5">
                      Local: {selectedClassObj?.court} • Instrutor: {selectedClassObj?.instructorName}
                    </span>
                  </div>

                  {/* QR Code de Presença do Aluno */}
                  <div className="bg-white p-2.5 rounded-2xl border border-blue-300 shadow-xs flex flex-col items-center shrink-0">
                    <QRCodeDisplay
                      value={JSON.stringify({
                        app: 'VOLEIARAÇA',
                        id: createdStudent.id,
                        matricula: createdStudent.registrationNumber,
                        nome: createdStudent.fullName,
                      })}
                      size={100}
                    />
                    <span className="text-[9px] font-bold text-slate-500 mt-1 uppercase">QR Code Oficial</span>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1">
                  <div><strong>Responsável Legal:</strong> {createdStudent.guardian.name} ({createdStudent.guardian.relationship})</div>
                  <div><strong>WhatsApp para avisos:</strong> {createdStudent.guardian.phone}</div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3 print:hidden">
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Enviar Comprovante pelo WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="py-3 px-4 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Comprovante</span>
                </button>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 text-center print:hidden">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="text-xs font-bold text-blue-700 hover:text-blue-900 underline cursor-pointer"
                >
                  Cadastrar outro aluno / atleta
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* FORMULÁRIO DE INSCRIÇÃO */
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-8">
            {errorMessage && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">{errorMessage}</div>
              </div>
            )}

            {/* SEÇÃO 1: DADOS DO ALUNO */}
            <div>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
                <User className="w-4 h-4 text-blue-700" />
                <h3 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wider">
                  1. Dados do Aluno / Atleta (07 a 17 Anos)
                </h3>
              </div>

              {/* Upload de Foto do Aluno / Atleta */}
              <div className="mb-5 p-4 rounded-2xl bg-blue-50/50 border border-blue-200">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                  {/* Input invisível para todos os formatos de imagem */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.png,.jpg,.jpeg,.pjpeg,.pjp,.webp,.gif,.bmp,.avif,.heic,.heif,.svg,.tiff"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    id="student-photo-upload"
                  />

                  {/* Thumbnail / Preview */}
                  <div className="relative w-24 h-32 rounded-2xl border-2 border-dashed border-blue-300 bg-white overflow-hidden flex flex-col items-center justify-center shrink-0 shadow-xs">
                    {isUploadingPhoto ? (
                      <div className="flex flex-col items-center justify-center p-2 text-center text-blue-600 space-y-1">
                        <RefreshCw className="w-6 h-6 animate-spin" />
                        <span className="text-[10px] font-bold">Processando...</span>
                      </div>
                    ) : photoUrl ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photoUrl}
                          alt="Foto do Aluno"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setPhotoUrl('');
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="absolute top-1 right-1 p-1 rounded-full bg-rose-600 text-white shadow-xs hover:bg-rose-700 transition-colors cursor-pointer"
                          title="Remover foto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-slate-400 hover:text-blue-600 hover:bg-blue-50/50 transition-colors cursor-pointer"
                      >
                        <Camera className="w-7 h-7 mb-1 text-blue-600" />
                        <span className="text-[10px] font-bold text-slate-600 leading-tight">Adicionar Foto</span>
                        <span className="text-[8px] text-slate-400">3x4 ou selfie</span>
                      </div>
                    )}
                  </div>

                  {/* Detalhes e Botões de Escolha */}
                  <div className="flex-1 text-center sm:text-left space-y-2">
                    <div>
                      <div className="flex items-center justify-center sm:justify-start gap-1.5">
                        <Camera className="w-4 h-4 text-blue-700" />
                        <label className="text-xs font-black text-slate-900 uppercase tracking-wide">
                          Foto Oficial do Aluno / Carteirinha
                        </label>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                          Opcional
                        </span>
                      </div>
                      <p className="text-[11px] sm:text-xs text-slate-600 mt-1 leading-relaxed">
                        Envie uma foto do rosto do atleta para constar na carteirinha e na ficha de presença.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingPhoto}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{photoUrl ? 'Trocar Foto' : 'Escolher / Tirar Foto'}</span>
                      </button>

                      {photoUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setPhotoUrl('');
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="px-3 py-1.5 rounded-xl border border-rose-300 hover:bg-rose-50 text-rose-700 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remover</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-center sm:justify-start gap-1.5 text-[10px] text-slate-500">
                      <ImageIcon className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>
                        Aceita <strong>PNG, JPG, JPEG, WEBP, GIF, HEIC, BMP, SVG</strong> e todos os outros formatos.
                      </span>
                    </div>

                    {photoError && (
                      <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-semibold rounded-xl flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>{photoError}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Nome Completo do Aluno *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ex: Gabriel Henrique Silva"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 font-semibold focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Data de Nascimento *
                  </label>
                  <input
                    type="date"
                    required
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 font-semibold focus:outline-none focus:border-blue-600 focus:bg-white"
                  />

                  {birthDate && (
                    <div className="mt-2 text-xs">
                      {isAgeValid ? (
                        <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 font-semibold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>
                            Idade: <strong>{currentAge} anos</strong> • Categoria: <strong>{currentCategory}</strong>
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 p-2 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-semibold">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>Idade de {currentAge} anos fora da faixa permitida (07 a 17 anos).</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Gênero *
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as 'Masculino' | 'Feminino')}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 font-semibold focus:outline-none focus:border-blue-600 focus:bg-white"
                  >
                    <option value="Masculino">Masculino</option>
                    <option value="Feminino">Feminino</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SEÇÃO 2: TURMA E TURNO */}
            <div>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
                <Calendar className="w-4 h-4 text-blue-700" />
                <h3 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wider">
                  2. Escolha da Turma e Turno de Treino
                </h3>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Selecione a Turma Disponível *
                </label>
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  disabled={loadingClasses}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-900 font-bold focus:outline-none focus:border-blue-600 focus:bg-white"
                >
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      [{cls.shift.toUpperCase()}] {cls.name} — {cls.startTime} às {cls.endTime} ({cls.daysOfWeek?.join('/')}) • {cls.court}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Turmas com treinos regulares nas quadras esportivas municipais de Araçariguama.
                </p>
              </div>
            </div>

            {/* SEÇÃO 3: SAÚDE E CUIDADOS */}
            <div>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
                <HeartPulse className="w-4 h-4 text-blue-700" />
                <h3 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wider">
                  3. Informações de Saúde e Cuidados
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Condições Médicas / Restrições Físicas
                  </label>
                  <input
                    type="text"
                    value={medicalConditions}
                    onChange={(e) => setMedicalConditions(e.target.value)}
                    placeholder="Ex: Asma, bronquite (ou deixe em branco se nenhuma)"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Alergias Conhecidas
                  </label>
                  <input
                    type="text"
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    placeholder="Ex: Medicamentos, picada de abelha (ou deixe em branco se nenhuma)"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* SEÇÃO 4: DADOS DO RESPONSÁVEL */}
            <div>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
                <ShieldCheck className="w-4 h-4 text-blue-700" />
                <h3 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wider">
                  4. Dados do Responsável Legal (Para Notificações de Frequência)
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Nome Completo do Responsável *
                  </label>
                  <input
                    type="text"
                    required
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                    placeholder="Ex: Mariana Silva"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 font-semibold focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Grau de Parentesco *
                  </label>
                  <select
                    value={guardianRelationship}
                    onChange={(e) => setGuardianRelationship(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 font-semibold focus:outline-none focus:border-blue-600 focus:bg-white"
                  >
                    <option value="Mãe">Mãe</option>
                    <option value="Pai">Pai</option>
                    <option value="Responsável Legal">Responsável Legal</option>
                    <option value="Avô/Avó">Avô / Avó</option>
                    <option value="Outro">Outro Familiar</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Celular / WhatsApp com DDD *
                  </label>
                  <input
                    type="tel"
                    required
                    value={guardianPhone}
                    onChange={handlePhoneChange}
                    placeholder="(11) 98765-4321"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 font-semibold focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>

                <div className="sm:col-span-2 pt-1">
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={allowWhatsApp}
                      onChange={(e) => setAllowWhatsApp(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 accent-blue-600 shrink-0 mt-0.5 cursor-pointer"
                    />
                    <span>
                      Autorizo o recebimento de notificações oficiais da coordenação e avisos de frequência dos treinos via WhatsApp.
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* SEÇÃO 5: TERMO DE COMPROMISSO */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700">
                <input
                  type="checkbox"
                  required
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 accent-blue-600 shrink-0 mt-0.5 cursor-pointer"
                />
                <span className="font-semibold text-slate-800">
                  Declaro que as informações acima são verdadeiras, autorizo a participação do atleta nas atividades de vôlei e estou ciente de que a frequência mínima de 75% é exigida para manutenção da vaga.
                </span>
              </label>
            </div>

            {/* BOTÃO FINAL DE SUBMISSÃO */}
            <button
              type="submit"
              disabled={isSubmitting || !isAgeValid}
              className="w-full py-4 px-6 rounded-2xl bg-blue-700 hover:bg-blue-800 active:scale-[0.99] text-white font-extrabold text-sm sm:text-base tracking-wide shadow-xl shadow-blue-700/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Enviando inscrição para a Secretaria de Esportes...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Confirmar Inscrição Oficial</span>
                </>
              )}
            </button>
          </form>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500 print:hidden">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <strong className="text-blue-900 font-bold">VoleiAraça</strong> — Sistema Oficial desenvolvido por <strong className="text-slate-900 font-bold">Hian Salles</strong>
          </div>
          <div>Prefeitura Municipal de Araçariguama - SP</div>
        </div>
      </footer>
    </div>
  );
}
