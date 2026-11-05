'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Printer,
  Upload,
  Camera,
  ChevronLeft,
  ChevronRight,
  Shield,
  Trophy,
  CheckCircle,
  Copy,
  Calendar,
  Layers,
  HeartPulse,
  Phone,
  User,
  QrCode,
  Trash2,
  Building2,
  Plus,
  Sliders,
  RefreshCw,
} from 'lucide-react';
import { Student, VolleyballClass, SponsorLogo } from '@/types/volleyball';
import { getAthletePhoto, readFileAsBase64 } from '@/lib/avatarHelpers';
import { QRCodeDisplay } from '@/components/QRCodeDisplay';
import { storageService } from '@/lib/storage';
import { SponsorsManagerModal } from '@/components/SponsorsManagerModal';
import { normalizeCategory } from '@/lib/volleyballHelpers';

/**
 * Builds compact, high-readability JSON QR payload.
 * Keeping the payload clean (~65 characters) produces a low-density QR code matrix (25x25)
 * with large individual modules, allowing cameras to scan it instantly from any distance.
 */
export function getStudentQrPayload(st: Student, _cls?: VolleyballClass): string {
  return JSON.stringify({
    app: 'VOLEIARAÇA',
    id: st.id,
    matricula: st.registrationNumber,
    nome: st.fullName,
  });
}

interface StudentIdCardModalProps {
  isOpen: boolean;
  student: Student | null;
  allStudents: Student[];
  classes: VolleyballClass[];
  onClose: () => void;
  onUpdateStudentPhoto: (studentId: string, photoUrl: string) => void;
  onOpenEditStudent: (student: Student) => void;
  onOpenQrScanner?: (studentRegistration?: string) => void;
  onDeleteStudent?: (student: Student) => void;
}

export function StudentIdCardModal({
  isOpen,
  student,
  allStudents,
  classes,
  onClose,
  onUpdateStudentPhoto,
  onOpenEditStudent,
  onOpenQrScanner,
  onDeleteStudent,
}: StudentIdCardModalProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(student?.id || null);
  const [prevStudentPropId, setPrevStudentPropId] = useState<string | null>(student?.id || null);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState(false);
  const [showBigQr, setShowBigQr] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSponsorsModalOpen, setIsSponsorsModalOpen] = useState(false);
  const [sponsorsList, setSponsorsList] = useState<SponsorLogo[]>(() => storageService.getSponsors());
  const [sponsorSize, setSponsorSize] = useState<number>(() => storageService.getSponsorSize());
  const [versoMode, setVersoMode] = useState<'sponsors' | 'giantQr'>('sponsors');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeSponsors = sponsorsList.filter((s) => s.isActive);
  const handleSponsorsUpdate = () => {
    setSponsorsList(storageService.getSponsors());
    setSponsorSize(storageService.getSponsorSize());
  };

  const handleQuickSizeChange = (newSize: number) => {
    setSponsorSize(newSize);
    storageService.saveSponsorSize(newSize);
  };

  const [isSyncing, setIsSyncing] = useState(false);

  const handleForceSync = async () => {
    setIsSyncing(true);
    await storageService.pullFromSharedSync();
    handleSponsorsUpdate();
    setTimeout(() => setIsSyncing(false), 700);
  };

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setSponsorsList(storageService.getSponsors());
      setSponsorSize(storageService.getSponsorSize());
    }
  }

  // Sync sponsors and size with global storage updates
  React.useEffect(() => {
    const unsubscribe = storageService.subscribe(() => {
      setSponsorsList(storageService.getSponsors());
      setSponsorSize(storageService.getSponsorSize());
    });
    return () => unsubscribe();
  }, []);

  // Sync when prop changes without useEffect cascading render
  if (student && student.id !== prevStudentPropId) {
    setPrevStudentPropId(student.id);
    setSelectedStudentId(student.id);
  }

  if (!isOpen) return null;

  const currentStudentId = selectedStudentId ?? student?.id ?? allStudents[0]?.id ?? '';
  const currentStudent = allStudents.find((s) => s.id === currentStudentId) || student || allStudents[0];
  if (!currentStudent) return null;

  const currentClass = classes.find((c) => c.id === currentStudent.classId);

  // Navigation between students
  const currentIndex = allStudents.findIndex((s) => s.id === currentStudent.id);
  const handlePrev = () => {
    const nextIdx = (currentIndex - 1 + allStudents.length) % allStudents.length;
    setSelectedStudentId(allStudents[nextIdx].id);
  };
  const handleNext = () => {
    const nextIdx = (currentIndex + 1) % allStudents.length;
    setSelectedStudentId(allStudents[nextIdx].id);
  };

  // Upload photo handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadError(null);
      const base64 = await readFileAsBase64(file);
      onUpdateStudentPhoto(currentStudent.id, base64);
    } catch {
      setUploadError('Erro ao carregar a imagem. Tente uma foto em formato JPG ou PNG.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyReg = () => {
    navigator.clipboard.writeText(currentStudent.registrationNumber);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 2000);
  };

  const studentPhoto = currentStudent.photoUrl || getAthletePhoto(currentStudent.fullName, currentStudent.gender, currentStudent.jerseyNumber);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto print:p-0 print:m-0 print:bg-transparent print:static print:overflow-visible print:block">
      <div className="bg-white border-2 border-blue-600 rounded-3xl w-full max-w-4xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden my-auto print:border-none print:shadow-none print:max-w-none print:max-h-none print:overflow-visible print:p-0 print:m-0 print:bg-transparent">
        {/* Modal Top Bar - Hidden in Print */}
        <div className="p-4 sm:p-5 bg-blue-700 text-white flex items-center justify-between border-b-2 border-blue-800 print:hidden shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white text-blue-700 flex items-center justify-center font-bold shadow-xs">
              <Trophy className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold tracking-tight">
                  Carteirinha Oficial do Atleta de Vôlei
                </h2>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-800 text-blue-100 border border-blue-500">
                  Documento Oficial
                </span>
              </div>
              <p className="text-xs text-blue-100">
                Identificação para treinos, campeonatos e controle de acesso
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsBatchMode(!isBatchMode)}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                isBatchMode
                  ? 'bg-white text-blue-800 border-white font-bold'
                  : 'bg-blue-800/60 text-white border-blue-500 hover:bg-blue-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>{isBatchMode ? 'Ver Apenas Este Aluno' : 'Imprimir Lote da Turma'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-blue-50 text-blue-700 font-bold text-xs shadow-sm transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Imprimir Carteirinha</span>
              <span className="sm:hidden">Imprimir</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-blue-100 hover:text-white hover:bg-blue-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Bar for Students (Hidden in print) */}
        {!isBatchMode && (
          <div className="bg-blue-50/80 px-4 py-2.5 border-b border-blue-200 flex items-center justify-between text-xs print:hidden shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-medium">Navegar entre atletas:</span>
              <strong className="text-blue-900 font-bold">
                {currentIndex + 1} de {allStudents.length}
              </strong>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrev}
                className="p-1.5 rounded-lg bg-white border border-blue-200 text-slate-700 hover:bg-blue-100 transition-colors"
                title="Aluno Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNext}
                className="p-1.5 rounded-lg bg-white border border-blue-200 text-slate-700 hover:bg-blue-100 transition-colors"
                title="Próximo Aluno"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 print:p-0 print:overflow-visible">
          {/* Print Styles: Isolates STRICTLY the ID cards (102mm x 68mm) and hides everything else */}
          <style
            dangerouslySetInnerHTML={{
              __html: `
            @media print {
              @page {
                size: A4 portrait;
                margin: 8mm;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                width: 100% !important;
                height: auto !important;
                overflow: visible !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              /* 1. Oculta rigorosamente tudo na tela */
              body * {
                visibility: hidden !important;
              }
              /* 2. Torna visível unicamente o contêiner das carteirinhas */
              #only-cards-print-container,
              #only-cards-print-container * {
                visibility: visible !important;
              }
              /* 3. Posiciona o contêiner das carteirinhas no topo da folha */
              #only-cards-print-container {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                background: transparent !important;
                border: none !important;
                box-shadow: none !important;
                z-index: 999999 !important;
              }
              .id-card-outer-frame {
                border: none !important;
                background: transparent !important;
                padding: 0 !important;
                margin: 0 auto !important;
                box-shadow: none !important;
              }
              /* 4. Dimensões oficiais e acabamento de corte do RG (102mm x 68mm) */
              .id-card-rg {
                width: 102mm !important;
                height: 68mm !important;
                min-width: 102mm !important;
                min-height: 68mm !important;
                max-width: 102mm !important;
                max-height: 68mm !important;
                box-sizing: border-box !important;
                break-inside: avoid !important;
                page-break-inside: avoid !important;
                border: 1.5pt solid #1e3a8a !important;
                border-radius: 4mm !important;
                box-shadow: none !important;
                margin: 0 auto !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .id-cards-print-grid {
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                justify-content: flex-start !important;
                gap: 6mm !important;
                margin: 0 auto !important;
                padding: 0 !important;
                border: none !important;
                background: transparent !important;
                break-inside: avoid !important;
                page-break-inside: avoid !important;
              }
              .batch-student-page {
                break-after: page !important;
                page-break-after: always !important;
                margin-bottom: 0 !important;
              }
            }
          `,
            }}
          />

          {/* Hidden File Input for Photo Upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {uploadError && (
            <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded-xl text-xs flex items-center justify-between">
              <span>{uploadError}</span>
              <button onClick={() => setUploadError(null)} className="font-bold underline text-[11px]">Fechar</button>
            </div>
          )}

          {/* Quick Photo Upload, Edit & Sponsor Controls Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 p-3.5 rounded-2xl print:hidden shadow-xs">
            <div className="flex items-center gap-2 text-xs text-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-extrabold text-blue-900">QR Code Oficial:</span>
              <span>Dados sincronizados ao vivo.</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Seletor de Tamanho dos Patrocínios no Verso */}
              <div className="flex items-center gap-1 bg-white border border-blue-200 rounded-xl p-1 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-500 px-1 flex items-center gap-1">
                  <Sliders className="w-3 h-3 text-blue-600" />
                  <span>Tam. Patrocínio:</span>
                </span>
                {[
                  { label: 'P', size: 20 },
                  { label: 'M', size: 28 },
                  { label: 'G', size: 36 },
                  { label: 'GG', size: 48 },
                ].map((s) => (
                  <button
                    key={s.label}
                    onClick={() => handleQuickSizeChange(s.size)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      sponsorSize === s.size
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                    title={`Definir altura dos logos no verso em ${s.size}px`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setIsSponsorsModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 font-bold text-xs shadow-2xs transition-colors cursor-pointer"
                title="Gerenciar logos de patrocinadores no verso"
              >
                <Building2 className="w-3.5 h-3.5 text-blue-700" />
                <span>Patrocinadores ({activeSponsors.length})</span>
              </button>

              <button
                onClick={() => setVersoMode(versoMode === 'sponsors' ? 'giantQr' : 'sponsors')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs shadow-2xs transition-all cursor-pointer ${
                  versoMode === 'giantQr'
                    ? 'bg-blue-800 text-white border-2 border-blue-900 ring-2 ring-blue-300'
                    : 'bg-white border border-blue-300 text-blue-900 hover:bg-blue-50'
                }`}
                title="Alternar Verso entre Patrocinadores ou QR Code Gigante"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>{versoMode === 'giantQr' ? 'Verso: QR Gigante (Ativo)' : 'Verso: QR Gigante'}</span>
              </button>

              <button
                onClick={handleForceSync}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-blue-300 hover:bg-blue-50 text-blue-900 font-bold text-xs shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-60"
                title="Sincronizar dados da carteirinha entre Celular e PC"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-blue-700 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
              </button>

              <button
                onClick={() => setShowBigQr(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-xs transition-colors"
                title="Visualizar QR Code ampliado com todos os dados sincronizados"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Ampliar QR Code</span>
              </button>

              {onOpenQrScanner && (
                <button
                  onClick={() => onOpenQrScanner(currentStudent.registrationNumber)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
                  title="Abrir o leitor e testar o registro automático de presença deste atleta"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Testar no Leitor</span>
                </button>
              )}

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-blue-300 hover:bg-blue-50 text-blue-900 font-semibold text-xs shadow-2xs transition-colors"
              >
                <Camera className="w-3.5 h-3.5 text-blue-700" />
                <span>Trocar Foto</span>
              </button>

              <button
                onClick={() => onOpenEditStudent(currentStudent)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors"
              >
                <span>Editar Aluno</span>
              </button>

              {onDeleteStudent && (
                <button
                  onClick={() => {
                    onClose();
                    onDeleteStudent(currentStudent);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-300 font-bold text-xs transition-colors cursor-pointer"
                  title="Excluir Matrícula deste Atleta"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir</span>
                </button>
              )}
            </div>
          </div>

          {/* Notice of Print Demarcation Lines */}
          <div className="text-center text-xs text-slate-600 font-medium print:hidden bg-blue-50/80 border border-blue-200 p-2.5 rounded-xl max-w-2xl mx-auto shadow-2xs">
            🪪 <strong>Padrão Oficial de RG Brasileiro (102 mm × 68 mm):</strong> Frente e Verso proporcionais para corte exato e plastificação em polaseal padrão de identidade.
          </div>

          {/* RENDER CARD(S) - Wrapped in #only-cards-print-container to strictly print ONLY the cards */}
          <div id="only-cards-print-container" className="space-y-8">
            {(isBatchMode ? allStudents : [currentStudent]).map((st, idx) => {
              const cls = classes.find((c) => c.id === st.classId);
              const photo = st.photoUrl || getAthletePhoto(st.fullName, st.gender, st.jerseyNumber);

              return (
                <div key={st.id} className="batch-student-page page-break-inside-avoid">
                  {/* Outer Demarcated Cut Frame with DOM ID for Export */}
                  <div
                    id={`id-card-frame-${st.id}`}
                    className="id-card-outer-frame p-3 sm:p-5 bg-slate-50/70 rounded-2xl border-2 border-dashed border-blue-400 max-w-4xl mx-auto shadow-xs relative print:p-0 print:border-none print:bg-transparent print:shadow-none print:m-0"
                  >
                    {/* Demarcation label */}
                    <div className="absolute -top-3 left-4 px-3 py-0.5 bg-blue-700 text-white text-[10px] font-black rounded-full uppercase tracking-wider print:hidden shadow-xs">
                      Tamanho Oficial RG (102mm × 68mm) #{idx + 1}
                    </div>

                    <div className="id-cards-print-grid flex flex-wrap items-center justify-center gap-5 sm:gap-6 print:gap-4 overflow-x-auto py-2 print:py-0">
                      {/* ================= FRENTE DA CARTEIRINHA (102mm x 68mm) ================= */}
                      <div
                        id={`id-card-front-${st.id}`}
                        style={{
                          width: '102mm',
                          height: '68mm',
                          minWidth: '102mm',
                          minHeight: '68mm',
                          maxWidth: '102mm',
                          maxHeight: '68mm',
                        }}
                        className="id-card-rg bg-white rounded-xl border-2 border-blue-900 shadow-md overflow-hidden flex flex-col justify-between relative box-border select-none shrink-0 print:border-2 print:border-blue-900"
                      >
                        {/* Court Watermark */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.04] p-1.5" viewBox="0 0 200 133" preserveAspectRatio="none">
                          <rect x="4" y="4" width="192" height="125" fill="none" stroke="#1E40AF" strokeWidth="2" />
                          <line x1="4" y1="44" x2="196" y2="44" stroke="#1E40AF" strokeWidth="1.5" />
                          <line x1="4" y1="88" x2="196" y2="88" stroke="#1E40AF" strokeWidth="1.5" />
                          <line x1="4" y1="66" x2="196" y2="66" stroke="#1E40AF" strokeWidth="2.5" />
                        </svg>

                        {/* Header Frente (8.5mm) */}
                        <div className="bg-gradient-to-r from-blue-950 via-blue-800 to-blue-950 text-white px-2.5 py-1.5 border-b-2 border-blue-950 relative z-10 flex items-center justify-between shrink-0">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-9 bg-white rounded-md p-0.5 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src="/assets/aistudio/WhatsApp_Image_2026-11-03_at_11.29.13_1739d5bf.jpeg"
                                alt="Secretaria Municipal de Esportes"
                                className="h-full w-auto object-contain"
                              />
                            </div>
                            <div>
                              <div className="text-[9.5px] font-black tracking-wider uppercase leading-tight">
                                VoleiAraça • Araçariguama
                              </div>
                              <div className="text-[7px] text-blue-200 uppercase font-bold leading-none">
                                Sec. de Esportes, Lazer e Eventos
                              </div>
                            </div>
                          </div>
                          <span className="text-[8px] font-black uppercase px-1.5 py-0.5 bg-white text-blue-900 rounded shadow-2xs border border-blue-200 shrink-0">
                            {normalizeCategory(st.category, st.age)}
                          </span>
                        </div>

                        {/* Corpo Central Frente: Foto + Dados Oficiais (Esquerda) + QR Code GIGANTE (Direita - Ocupa mais de 42% da carteirinha) */}
                        <div className="px-2 py-1 relative z-10 flex-1 flex items-center justify-between gap-2 overflow-hidden">
                          {/* 1. Coluna Esquerda: Foto 3x4 + Identificação do Atleta (51mm) */}
                          <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-0.5">
                            {/* Linha Superior: Foto 3x4 + Nome + Matrícula */}
                            <div className="flex items-start gap-1.5">
                              {/* Foto Proporcional do Atleta */}
                              <div className="relative shrink-0">
                                <div
                                  style={{ width: '20mm', height: '27mm' }}
                                  className="rounded-lg border-2 border-blue-700 overflow-hidden bg-blue-50 shadow-xs flex items-center justify-center shrink-0"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={photo}
                                    alt={st.fullName}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                {st.jerseyNumber && (
                                  <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full bg-blue-800 text-white font-black text-[8px] flex items-center justify-center border border-white shadow-xs">
                                    #{st.jerseyNumber}
                                  </div>
                                )}
                              </div>

                              {/* Nome do Atleta e Matrícula */}
                              <div className="flex-1 min-w-0">
                                <span className="text-[6px] font-black text-blue-800 uppercase tracking-wider bg-blue-100/90 px-1 py-0.2 rounded border border-blue-300 inline-block mb-0.5">
                                  Atleta Oficial
                                </span>
                                <h3 className="font-black text-slate-900 text-[9.5px] leading-tight uppercase line-clamp-2">
                                  {st.fullName}
                                </h3>
                                <div className="mt-1">
                                  <span className="text-[5.5px] font-black text-slate-500 uppercase tracking-wider block leading-none mb-0.5">
                                    Matrícula Oficial:
                                  </span>
                                  <span className="font-mono text-[8.5px] font-black text-blue-950 bg-blue-50/90 px-1.5 py-0.5 rounded border border-blue-300 inline-block shadow-2xs tracking-wider">
                                    {st.registrationNumber}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Linha Inferior: Idade, Nascimento e Turma */}
                            <div className="bg-slate-50/90 rounded-md p-1 border border-slate-200 text-[7px] space-y-0.5 mt-0.5">
                              <div className="text-slate-700 font-medium leading-tight flex items-center justify-between">
                                <span><strong className="text-slate-900 font-extrabold">{st.age} anos</strong> {st.birthDate && `• ${st.birthDate.split('-').reverse().join('/')}`}</span>
                              </div>
                              {cls?.name && (
                                <div className="text-[6.5px] text-slate-600 truncate leading-tight">
                                  <span className="text-slate-500 font-bold">Turma:</span> {cls.name}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 2. Coluna Direita: QR Code GIGANTE de Presença (Ocupa 43mm de largura x 51mm de altura - Destaque Máximo!) */}
                          <div
                            onClick={() => setShowBigQr(true)}
                            style={{ width: '43mm', height: '51mm' }}
                            className="bg-gradient-to-b from-blue-50 to-blue-100/95 border-2 border-blue-600 rounded-xl p-1 flex flex-col items-center justify-between shrink-0 shadow-md cursor-pointer hover:border-blue-800 transition-all hover:scale-[1.01]"
                            title="QR Code Oficial de Presença — Clique para ampliar"
                          >
                            <div className="flex items-center justify-center gap-1 text-blue-950 font-black text-[7.5px] uppercase tracking-wider">
                              <QrCode className="w-3 h-3 text-blue-700" />
                              <span>QR Presença Oficial</span>
                            </div>

                            <div className="bg-white p-1 rounded-lg border-2 border-blue-500 shadow-xs flex items-center justify-center">
                              <QRCodeDisplay
                                value={getStudentQrPayload(st, cls)}
                                size={135}
                                altText={`QR Code Oficial - ${st.fullName}`}
                              />
                            </div>

                            <span className="text-[6.5px] font-black text-blue-900 text-center leading-none uppercase tracking-wide">
                              Chamada • Acesso aos Treinos
                            </span>
                          </div>
                        </div>

                        {/* Rodapé Frente (6mm) */}
                        <div className="bg-slate-50 border-t border-slate-200 px-2.5 py-0.5 flex items-center justify-between text-[6.5px] text-slate-500 shrink-0 relative z-10">
                          <span className="font-bold text-slate-600">IDENTIFICAÇÃO OFICIAL DO ATLETA</span>
                          <span className="font-mono font-black text-blue-900">
                            VALIDADE: 31/12/2026
                          </span>
                        </div>
                      </div>

                      {/* ================= VERSO DA CARTEIRINHA (102mm x 68mm) ================= */}
                      <div
                        id={`id-card-back-${st.id}`}
                        style={{
                          width: '102mm',
                          height: '68mm',
                          minWidth: '102mm',
                          minHeight: '68mm',
                          maxWidth: '102mm',
                          maxHeight: '68mm',
                        }}
                        className="id-card-rg bg-gradient-to-br from-blue-800 via-blue-900 to-indigo-950 rounded-xl border-2 border-blue-950 shadow-md overflow-hidden flex flex-col justify-between relative text-white box-border select-none shrink-0 print:border-2 print:border-blue-950"
                      >
                        {/* Court Watermark in translucent white */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.06] p-1.5" viewBox="0 0 200 133" preserveAspectRatio="none">
                          <rect x="4" y="4" width="192" height="125" fill="none" stroke="#FFFFFF" strokeWidth="2" />
                          <line x1="4" y1="44" x2="196" y2="44" stroke="#FFFFFF" strokeWidth="1.5" />
                          <line x1="4" y1="88" x2="196" y2="88" stroke="#FFFFFF" strokeWidth="1.5" />
                          <line x1="4" y1="66" x2="196" y2="66" stroke="#FFFFFF" strokeWidth="2.5" />
                          <circle cx="100" cy="66" r="20" fill="none" stroke="#FFFFFF" strokeWidth="1.5" />
                        </svg>

                        {/* Header Verso (8.5mm) */}
                        <div className="bg-blue-950/70 px-2.5 py-1.5 border-b border-blue-400/30 flex items-center justify-between shrink-0 backdrop-blur-2xs relative z-10">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-md bg-white text-blue-900 flex items-center justify-center font-black text-[9px] shadow-2xs">
                              VA
                            </div>
                            <div>
                              <div className="text-[9px] font-black tracking-wider uppercase leading-tight text-white">
                                Academia VoleiAraça
                              </div>
                              <div className="text-[6.5px] text-blue-200 uppercase font-bold tracking-wider leading-none">
                                Patrocinadores & Apoiadores Oficiais
                              </div>
                            </div>
                          </div>
                          <span className="text-[7.5px] font-black uppercase px-1.5 py-0.5 bg-blue-600/70 text-blue-100 rounded border border-blue-300/40 shrink-0">
                            Apoio Esportivo
                          </span>
                        </div>

                        {/* Corpo Central Verso: Patrocinadores OU QR Code Gigante Integral */}
                        <div className="p-1.5 relative z-10 flex-1 flex flex-col justify-center overflow-hidden">
                          {versoMode === 'giantQr' ? (
                            <div
                              onClick={() => setShowBigQr(true)}
                              className="flex items-center justify-center gap-3 h-full cursor-pointer group"
                              title="QR Code de Alta Performance — Ocupando o verso da carteirinha"
                            >
                              {/* QR Code Gigante com moldura branca */}
                              <div className="bg-white p-1 rounded-xl border-2 border-white shadow-lg flex items-center justify-center shrink-0 group-hover:scale-[1.01] transition-transform">
                                <QRCodeDisplay
                                  value={getStudentQrPayload(st, cls)}
                                  size={160}
                                  altText={`QR Code Gigante - ${st.fullName}`}
                                />
                              </div>

                              <div className="flex-1 min-w-0 text-left text-white space-y-1">
                                <span className="text-[6.5px] uppercase font-black px-1.5 py-0.5 rounded bg-blue-500/80 text-blue-100 border border-blue-300/40 inline-block">
                                  Controle de Presença
                                </span>
                                <h4 className="font-black text-[10.5px] uppercase leading-tight line-clamp-2 text-white">
                                  {st.fullName}
                                </h4>
                                <div className="font-mono text-[9px] font-black text-blue-200">
                                  Matrícula: {st.registrationNumber}
                                </div>
                                <div className="text-[7px] text-blue-200 uppercase font-bold leading-tight">
                                  Aponte a câmera para registrar a frequência do treino
                                </div>
                              </div>
                            </div>
                          ) : activeSponsors.length > 0 ? (
                            <div
                              onClick={() => setIsSponsorsModalOpen(true)}
                              className="cursor-pointer group flex flex-col justify-center h-full"
                              title="Clique para gerenciar ou adicionar patrocinadores"
                            >
                              <div className={`grid gap-1.5 ${activeSponsors.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                                {activeSponsors.slice(0, 6).map((sp) => (
                                  <div
                                    key={sp.id}
                                    className="bg-white/95 hover:bg-white text-slate-900 rounded-lg p-1 shadow-2xs border border-white/40 flex items-center gap-1.5 overflow-hidden transition-transform group-hover:scale-[1.01]"
                                  >
                                    <div
                                      style={{ height: `${Math.min(sponsorSize, 24)}px` }}
                                      className="w-12 flex items-center justify-center p-0.5 bg-slate-50 rounded shrink-0 overflow-hidden border border-slate-200"
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={sp.logoUrl}
                                        alt={sp.name}
                                        className="max-h-full max-w-full object-contain"
                                      />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="font-extrabold text-[7.5px] text-slate-900 truncate leading-tight">
                                        {sp.name}
                                      </div>
                                      <div className="text-[6.5px] font-bold text-blue-800 truncate leading-none">
                                        {sp.category || 'Apoiador Oficial'}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <div className="text-center pt-1 print:hidden">
                                <span className="text-[7.5px] text-blue-200 hover:text-white underline font-bold uppercase tracking-wider">
                                  Gerenciar Logos de Patrocínio ({activeSponsors.length})
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div
                              onClick={() => setIsSponsorsModalOpen(true)}
                              className="p-3 rounded-xl border border-dashed border-blue-300/40 hover:border-white bg-blue-900/30 text-center cursor-pointer transition-colors space-y-1 group"
                            >
                              <Building2 className="w-5 h-5 text-blue-200 mx-auto group-hover:scale-110 transition-transform" />
                              <div className="text-[9px] font-bold text-white">
                                Espaço para Patrocinadores Oficiais
                              </div>
                              <p className="text-[7.5px] text-blue-200">
                                Clique para adicionar os logos das empresas apoiadoras do voleibol.
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Rodapé Verso (7mm) */}
                        <div className="bg-blue-950/80 px-2.5 py-1 border-t border-blue-400/30 flex items-center justify-between text-[7px] relative z-10 text-blue-200 shrink-0">
                          <div>
                            <span className="font-bold text-white">Incentivo ao Esporte</span>
                            <span className="text-blue-300"> • 07 a 17 Anos</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-white">VoleiAraça</span>
                            <span className="text-blue-300"> • 2026</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyReg}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors"
            >
              <Copy className="w-3.5 h-3.5 text-blue-700" />
              <span>{copiedNotice ? 'Copiado!' : 'Copiar Matrícula'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Salvar PDF</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>

      {/* Enlarged QR Code Modal Overlay - Responsive Framing */}
      {showBigQr && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border-4 border-blue-600 rounded-3xl p-5 sm:p-6 max-w-md w-full text-center shadow-2xl space-y-4 my-auto max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-blue-100">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-blue-700" />
                <h3 className="font-extrabold text-slate-900 text-sm">QR Code Oficial do Atleta</h3>
              </div>
              <button
                onClick={() => setShowBigQr(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h4 className="font-extrabold text-blue-900 text-base">{currentStudent.fullName}</h4>
              <p className="text-xs text-slate-500 font-mono font-bold mt-0.5">
                Matrícula: {currentStudent.registrationNumber}
              </p>
            </div>

            <div className="p-3.5 bg-white rounded-2xl border-2 border-blue-300 inline-block shadow-inner">
              <QRCodeDisplay
                value={getStudentQrPayload(currentStudent, currentClass)}
                size={240}
                altText={`QR Code Oficial Sincronizado - ${currentStudent.fullName}`}
              />
            </div>

            {/* Sincronização em Tempo Real com o Sistema */}
            <div className="bg-blue-50/90 border border-blue-200 rounded-2xl p-3 text-left text-xs text-slate-800 space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-blue-200/80">
                <span className="font-extrabold text-blue-900 text-[11px] uppercase flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Dados Sincronizados no QR Code:
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                  Ao Vivo
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                <div>
                  <span className="text-slate-500">Turma:</span>{' '}
                  <strong className="text-slate-900 truncate block">{currentClass?.name || 'Turma Geral'}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Turno & Horário:</span>{' '}
                  <strong className="text-slate-900 block">{currentClass?.shift} ({currentClass?.startTime}-{currentClass?.endTime})</strong>
                </div>
                <div>
                  <span className="text-slate-500">Categoria:</span>{' '}
                  <strong className="text-blue-900">{normalizeCategory(currentStudent.category, currentStudent.age)} ({currentStudent.age} anos)</strong>
                </div>
                <div>
                  <span className="text-slate-500">Posição:</span>{' '}
                  <strong className="text-slate-900">{currentStudent.preferredPosition} {currentStudent.jerseyNumber ? `#${currentStudent.jerseyNumber}` : ''}</strong>
                </div>
                <div className="col-span-2 pt-0.5 border-t border-blue-100">
                  <span className="text-slate-500">Responsável:</span>{' '}
                  <strong className="text-slate-900">{currentStudent.guardian?.name || 'Não informado'} ({currentStudent.guardian?.phone || 'Sem contato'})</strong>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              {onOpenQrScanner && (
                <button
                  onClick={() => {
                    setShowBigQr(false);
                    onOpenQrScanner(currentStudent.registrationNumber);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                >
                  <Camera className="w-4 h-4" />
                  <span>Testar no Leitor de QR Code Agora</span>
                </button>
              )}
              <button
                onClick={() => setShowBigQr(false)}
                className="w-full px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
              >
                Voltar à Carteirinha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Gerenciador de Patrocinadores da Carteirinha */}
      <SponsorsManagerModal
        isOpen={isSponsorsModalOpen}
        onClose={() => {
          setIsSponsorsModalOpen(false);
          handleSponsorsUpdate();
        }}
        onSponsorsChange={handleSponsorsUpdate}
      />
    </div>
  );
}
