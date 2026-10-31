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
} from 'lucide-react';
import { Student, VolleyballClass, SponsorLogo } from '@/types/volleyball';
import { getAthletePhoto, readFileAsBase64 } from '@/lib/avatarHelpers';
import { QRCodeDisplay } from '@/components/QRCodeDisplay';
import { storageService } from '@/lib/storage';
import { SponsorsManagerModal } from '@/components/SponsorsManagerModal';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white border-2 border-blue-600 rounded-3xl w-full max-w-4xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden my-auto print:border-none print:shadow-none print:max-w-none print:max-h-none print:overflow-visible">
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
          <div className="text-center text-[11px] text-slate-500 font-medium print:hidden">
            ✂️ <strong>Linhas de demarcação e corte para crachá</strong> (padrão 85mm x 54mm com QR Code de Presença) exibidas abaixo para impressão.
          </div>

          {/* RENDER CARD(S) */}
          <div className="space-y-8">
            {(isBatchMode ? allStudents : [currentStudent]).map((st, idx) => {
              const cls = classes.find((c) => c.id === st.classId);
              const photo = st.photoUrl || getAthletePhoto(st.fullName, st.gender, st.jerseyNumber);

              return (
                <div key={st.id} className="page-break-inside-avoid">
                  {/* Outer Demarcated Cut Frame with DOM ID for Export */}
                  <div
                    id={`id-card-frame-${st.id}`}
                    className="p-4 sm:p-6 bg-slate-50/60 rounded-3xl border-2 border-dashed border-blue-400 max-w-3xl mx-auto shadow-sm relative"
                  >
                    {/* Demarcation label */}
                    <div className="absolute -top-3 left-6 px-3 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full uppercase tracking-wider print:hidden">
                      Linha de Corte da Carteirinha #{idx + 1}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                      {/* ================= FRENTE DA CARTEIRINHA ================= */}
                      <div
                        id={`id-card-front-${st.id}`}
                        className="bg-white rounded-2xl border-2 border-blue-800 shadow-md overflow-hidden flex flex-col justify-between relative min-h-[350px]"
                      >
                        {/* Court Watermark */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.05] p-2" viewBox="0 0 200 300" preserveAspectRatio="none">
                          <rect x="8" y="8" width="184" height="284" fill="none" stroke="#1E40AF" strokeWidth="3" />
                          <line x1="8" y1="100" x2="192" y2="100" stroke="#1E40AF" strokeWidth="2.5" />
                          <line x1="8" y1="200" x2="192" y2="200" stroke="#1E40AF" strokeWidth="2.5" />
                          <line x1="8" y1="150" x2="192" y2="150" stroke="#1E40AF" strokeWidth="4" />
                        </svg>

                        {/* Header Frente */}
                        <div className="bg-gradient-to-r from-blue-800 to-blue-700 text-white p-3.5 border-b-2 border-blue-900 relative z-10 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-white text-blue-800 flex items-center justify-center font-black text-sm">
                              VA
                            </div>
                            <div>
                              <div className="text-[11px] font-extrabold tracking-wider uppercase leading-tight">
                                Academia VoleiAraça
                              </div>
                              <div className="text-[9px] text-blue-200 uppercase font-semibold">
                                Federação de Voleibol Juvenil
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-white text-blue-800 rounded border border-blue-200">
                            {st.category}
                          </span>
                        </div>

                        {/* Corpo da Frente: APENAS Foto Ampliada, Nome, Idade, Atleta Inscrito, Matrícula e QR Code Ampliado */}
                        <div className="p-4 relative z-10 flex-1 flex flex-col justify-between space-y-3.5">
                          <div className="flex gap-4 items-center">
                            {/* Foto de Perfil Ampliada para ocupar o espaço em branco */}
                            <div className="relative shrink-0">
                              <div className="w-28 h-34 sm:w-32 sm:h-38 rounded-2xl border-2 border-blue-700 overflow-hidden bg-blue-50 shadow-md flex items-center justify-center">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={photo}
                                  alt={st.fullName}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              {st.jerseyNumber && (
                                <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-blue-700 text-white font-black text-xs flex items-center justify-center border-2 border-white shadow-sm">
                                  #{st.jerseyNumber}
                                </div>
                              )}
                            </div>

                            {/* Informações: Atleta Inscrito, Nome, Idade e Matrícula */}
                            <div className="flex-1 min-w-0 space-y-1.5">
                              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block">
                                Atleta Inscrito
                              </span>
                              <h3 className="font-black text-slate-900 text-base sm:text-lg leading-snug">
                                {st.fullName}
                              </h3>

                              <div className="text-xs sm:text-sm text-slate-700 font-medium">
                                <span className="text-slate-500">Idade:</span>{' '}
                                <strong className="text-slate-900 font-bold">{st.age} anos</strong>
                              </div>

                              <div className="pt-0.5">
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                                  Matrícula Oficial:
                                </span>
                                <span className="font-mono text-xs sm:text-sm font-black text-blue-900 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 inline-block shadow-2xs">
                                  {st.registrationNumber}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* QR CODE GIGANTE PARA LEITURA DIRETA E INSTANTÂNEA */}
                          <div
                            onClick={() => setShowBigQr(true)}
                            className="bg-blue-50/90 hover:bg-blue-100/80 border-2 border-blue-600 rounded-2xl p-3 flex flex-col items-center justify-center shadow-xs cursor-pointer transition-all hover:scale-[1.01]"
                            title="QR Code Oficial — Clique para ver ampliado"
                          >
                            <div className="flex items-center gap-1.5 text-xs font-black text-blue-900 uppercase tracking-wider mb-2">
                              <QrCode className="w-4 h-4 text-blue-700" />
                              <span>QR Code Oficial</span>
                            </div>

                            <div className="bg-white p-2.5 rounded-2xl border-2 border-blue-700 shadow-sm flex items-center justify-center">
                              <QRCodeDisplay
                                value={getStudentQrPayload(st, cls)}
                                size={200}
                                altText={`QR Code Oficial Sincronizado - ${st.fullName}`}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Rodapé da Frente */}
                        <div className="bg-slate-50 border-t border-slate-200 px-3 py-1.5 flex items-center justify-between text-[9px] text-slate-500 relative z-10">
                          <span>Identificação Oficial do Atleta</span>
                          <span className="font-mono font-bold text-blue-900">{st.registrationNumber}</span>
                        </div>
                      </div>

                      {/* ================= VERSO DA CARTEIRINHA (TOTALMENTE AZUL & EXCLUSIVO PARA PATROCÍNIOS) ================= */}
                      <div
                        id={`id-card-back-${st.id}`}
                        className="bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-950 rounded-2xl border-2 border-blue-900 shadow-md overflow-hidden flex flex-col justify-between relative min-h-[350px] text-white"
                      >
                        {/* Court Watermark in translucent white */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.08] p-2" viewBox="0 0 200 300" preserveAspectRatio="none">
                          <rect x="8" y="8" width="184" height="284" fill="none" stroke="#FFFFFF" strokeWidth="3" />
                          <line x1="8" y1="100" x2="192" y2="100" stroke="#FFFFFF" strokeWidth="2.5" />
                          <line x1="8" y1="200" x2="192" y2="200" stroke="#FFFFFF" strokeWidth="2.5" />
                          <line x1="8" y1="150" x2="192" y2="150" stroke="#FFFFFF" strokeWidth="4" />
                          <circle cx="100" cy="150" r="30" fill="none" stroke="#FFFFFF" strokeWidth="2" />
                        </svg>

                        {/* Header Verso Azul */}
                        <div className="bg-blue-950/60 p-3.5 border-b border-blue-500/30 flex items-center justify-between relative z-10 backdrop-blur-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-white text-blue-800 flex items-center justify-center font-black text-sm shadow-xs">
                              VA
                            </div>
                            <div>
                              <div className="text-[11px] font-black tracking-wider uppercase leading-tight text-white">
                                Academia VoleiAraça
                              </div>
                              <div className="text-[9px] text-blue-200 uppercase font-bold tracking-wider">
                                Patrocinadores & Apoiadores Oficiais
                              </div>
                            </div>
                          </div>
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-blue-600/60 text-blue-100 rounded border border-blue-400/40">
                            Apoio Esportivo
                          </span>
                        </div>

                        {/* Corpo do Verso: DEDICADO EXCLUSIVAMENTE AOS PATROCÍNIOS */}
                        <div className="p-4 relative z-10 flex-1 flex flex-col justify-center space-y-2.5">
                          {activeSponsors.length > 0 ? (
                            <div
                              onClick={() => setIsSponsorsModalOpen(true)}
                              className="space-y-2 cursor-pointer group"
                              title="Clique para gerenciar ou adicionar patrocinadores"
                            >
                              <div className="grid grid-cols-1 gap-2">
                                {activeSponsors.map((sp) => (
                                  <div
                                    key={sp.id}
                                    className="bg-white/95 hover:bg-white text-slate-900 rounded-xl p-2.5 shadow-sm border border-white/40 flex items-center justify-between gap-3 transition-transform group-hover:scale-[1.01]"
                                  >
                                    <div
                                      style={{ height: `${sponsorSize}px` }}
                                      className="w-28 flex items-center justify-center p-0.5 bg-slate-50 rounded-lg shrink-0 overflow-hidden border border-slate-200"
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={sp.logoUrl}
                                        alt={sp.name}
                                        className="max-h-full max-w-full object-contain"
                                      />
                                    </div>
                                    <div className="flex-1 min-w-0 text-right">
                                      <div className="font-extrabold text-xs text-slate-900 truncate">
                                        {sp.name}
                                      </div>
                                      <div className="text-[10px] font-semibold text-blue-800 truncate">
                                        {sp.category || 'Patrocinador Oficial'}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <div className="text-center pt-1 print:hidden">
                                <span className="text-[8px] text-blue-200 hover:text-white underline font-bold uppercase tracking-wider">
                                  Gerenciar Logos & Tamanho ({sponsorSize}px)
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div
                              onClick={() => setIsSponsorsModalOpen(true)}
                              className="p-6 rounded-2xl border-2 border-dashed border-blue-300/40 hover:border-white bg-blue-900/30 text-center cursor-pointer transition-colors space-y-2 group"
                            >
                              <Building2 className="w-8 h-8 text-blue-200 mx-auto group-hover:scale-110 transition-transform" />
                              <div className="text-xs font-bold text-white">
                                Nenhum patrocinador ativo no momento
                              </div>
                              <p className="text-[10px] text-blue-200">
                                Clique para adicionar logos de empresas e apoiadores oficiais no verso desta carteirinha.
                              </p>
                              <button
                                type="button"
                                className="px-3 py-1.5 rounded-xl bg-white text-blue-900 font-bold text-xs shadow-xs hover:bg-blue-50 transition-colors inline-flex items-center gap-1.5"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>+ Adicionar Patrocinador</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Rodapé Verso Azul */}
                        <div className="bg-blue-950/80 p-3 px-4 border-t border-blue-500/30 flex items-center justify-between text-[9px] relative z-10 text-blue-200">
                          <div>
                            <span className="font-bold text-white">Incentivo ao Voleibol Juvenil</span>
                            <span className="block text-[8px] text-blue-300">Faixa Etária Oficial: 07 a 17 Anos</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-white block">Coordenação VoleiAraça</span>
                            <span className="text-[8px] text-blue-300">Temporada 2026</span>
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
                  <strong className="text-blue-900">{currentStudent.category} ({currentStudent.age} anos)</strong>
                </div>
                <div>
                  <span className="text-slate-500">Posição:</span>{' '}
                  <strong className="text-slate-900">{currentStudent.preferredPosition} {currentStudent.jerseyNumber ? `#${currentStudent.jerseyNumber}` : ''}</strong>
                </div>
                <div className="col-span-2 pt-0.5 border-t border-blue-100">
                  <span className="text-slate-500">Responsável:</span>{' '}
                  <strong className="text-slate-900">{currentStudent.guardian.name} ({currentStudent.guardian.phone})</strong>
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
