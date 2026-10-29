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
} from 'lucide-react';
import { Student, VolleyballClass } from '@/types/volleyball';
import { getAthletePhoto, readFileAsBase64 } from '@/lib/avatarHelpers';
import { QRCodeDisplay } from '@/components/QRCodeDisplay';

/**
 * Builds rich, fully synchronized JSON QR payload containing
 * all live student details matching the database and carteirinha.
 */
export function getStudentQrPayload(st: Student, cls?: VolleyballClass): string {
  return JSON.stringify({
    app: 'VOLEIPRO',
    id: st.id,
    matricula: st.registrationNumber,
    nome: st.fullName,
    idade: st.age,
    categoria: st.category,
    turma: cls?.name || 'Turma Geral',
    turno: cls?.shift || 'Geral',
    horario: cls ? `${cls.startTime} às ${cls.endTime}` : '08:00 às 09:30',
    posicao: st.preferredPosition,
    camisa: st.jerseyNumber || null,
    responsavel: st.guardian.name,
    contato: st.guardian.phone,
    status: st.status,
    validade: '2026-12-31',
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
              className="p-1.5 rounded-lg text-blue-100 hover:text-white hover:bg-blue-800 transition-colors"
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

          {/* Quick Photo Upload, Edit & Delete Actions (Hidden in print) */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 p-3.5 rounded-2xl print:hidden shadow-xs">
            <div className="flex items-center gap-2 text-xs text-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-extrabold text-blue-900">QR Code Ativo:</span>
              <span>Dados 100% sincronizados com o cadastro oficial da academia.</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
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
                  {/* Outer Demarcated Cut Frame */}
                  <div className="p-4 sm:p-6 bg-slate-50/60 rounded-3xl border-2 border-dashed border-blue-400 max-w-3xl mx-auto shadow-sm relative">
                    {/* Demarcation label */}
                    <div className="absolute -top-3 left-6 px-3 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full uppercase tracking-wider print:hidden">
                      Linha de Corte da Carteirinha #{idx + 1}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                      {/* ================= FRENTE DA CARTEIRINHA ================= */}
                      <div className="bg-white rounded-2xl border-2 border-blue-800 shadow-md overflow-hidden flex flex-col justify-between relative min-h-[340px]">
                        {/* Court Watermark Demarcation Line Pattern (Linhas de Fundo, Laterais, Ataque 3m e Central) */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.06] p-2" viewBox="0 0 200 300" preserveAspectRatio="none">
                          <rect x="8" y="8" width="184" height="284" fill="none" stroke="#1E40AF" strokeWidth="3" />
                          {/* Attack Lines 3m */}
                          <line x1="8" y1="100" x2="192" y2="100" stroke="#1E40AF" strokeWidth="2.5" />
                          <line x1="8" y1="200" x2="192" y2="200" stroke="#1E40AF" strokeWidth="2.5" />
                          {/* Center Net Line (Demarcated with double line) */}
                          <line x1="8" y1="150" x2="192" y2="150" stroke="#1E40AF" strokeWidth="4" />
                          {/* Service Marks */}
                          <line x1="8" y1="286" x2="8" y2="292" stroke="#1E40AF" strokeWidth="2" />
                          <line x1="192" y1="286" x2="192" y2="292" stroke="#1E40AF" strokeWidth="2" />
                        </svg>

                        {/* Card Header */}
                        <div className="bg-gradient-to-r from-blue-800 to-blue-700 text-white p-3.5 border-b-2 border-blue-900 relative z-10 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-white text-blue-800 flex items-center justify-center font-black text-sm">
                              VP
                            </div>
                            <div>
                              <div className="text-[11px] font-extrabold tracking-wider uppercase leading-tight">
                                Academia VôleiPro
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

                        {/* Card Body Front */}
                        <div className="p-4 relative z-10 flex-1 flex flex-col justify-between space-y-3">
                          <div className="flex gap-3.5 items-start">
                            {/* Photo Box with Demarcation Line */}
                            <div className="relative shrink-0">
                              <div className="w-24 h-28 rounded-xl border-2 border-blue-700 overflow-hidden bg-blue-50 shadow-xs flex items-center justify-center">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={photo}
                                  alt={st.fullName}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              {st.jerseyNumber && (
                                <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-blue-700 text-white font-black text-xs flex items-center justify-center border-2 border-white shadow-xs">
                                  #{st.jerseyNumber}
                                </div>
                              )}
                            </div>

                            {/* Athlete Details */}
                            <div className="flex-1 min-w-0 space-y-1">
                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                                Atleta Inscrito
                              </span>
                              <h3 className="font-extrabold text-slate-900 text-sm leading-tight truncate">
                                {st.fullName}
                              </h3>

                              <div className="text-[11px] text-slate-700 pt-1 space-y-0.5 font-medium">
                                <div>
                                  <span className="text-slate-500">Idade:</span>{' '}
                                  <strong className="text-slate-900">{st.age} anos</strong> (07 a 17)
                                </div>
                                <div>
                                  <span className="text-slate-500">Posição:</span>{' '}
                                  <strong className="text-blue-800">{st.preferredPosition}</strong>
                                </div>
                                <div>
                                  <span className="text-slate-500">Nível:</span> {st.level}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Turma & Turno Strip */}
                          <div className="bg-blue-50/80 border border-blue-200/80 rounded-xl p-2 text-[10px] space-y-0.5 text-slate-700">
                            <div className="flex justify-between">
                              <span className="text-slate-500 font-semibold">Turma:</span>
                              <strong className="text-blue-900 truncate max-w-[170px]">{cls?.name || 'Vôlei Geral'}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500 font-semibold">Turno & Horário:</span>
                              <span className="font-bold text-slate-800">
                                {cls?.shift} ({cls?.startTime} às {cls?.endTime})
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* QR Code, Barcode & Registration Footer */}
                        <div className="bg-slate-50 border-t-2 border-slate-200 p-2.5 px-3 flex items-center justify-between relative z-10 gap-2.5">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                Matrícula:
                              </span>
                              <span className="font-mono text-xs font-black text-blue-900 bg-blue-100 px-1.5 py-0.2 rounded border border-blue-200">
                                {st.registrationNumber}
                              </span>
                            </div>
                            {/* Barcode representation */}
                            <div className="flex items-center gap-[2px] h-3.5 my-1">
                              <span className="w-[2px] h-full bg-slate-900"></span>
                              <span className="w-[1px] h-full bg-slate-900"></span>
                              <span className="w-[3px] h-full bg-slate-900"></span>
                              <span className="w-[1px] h-full bg-slate-900"></span>
                              <span className="w-[2px] h-full bg-slate-900"></span>
                              <span className="w-[4px] h-full bg-slate-900"></span>
                              <span className="w-[1px] h-full bg-slate-900"></span>
                              <span className="w-[2px] h-full bg-slate-900"></span>
                              <span className="w-[1px] h-full bg-slate-900"></span>
                              <span className="w-[3px] h-full bg-slate-900"></span>
                            </div>
                            <span className="text-[8px] text-slate-400 font-mono block">CARTEIRINHA DIGITAL VÔLEIPRO</span>
                          </div>

                          {/* Interactive Scannable QR Code - 100% Sincronizado */}
                          <div
                            onClick={() => setShowBigQr(true)}
                            className="shrink-0 flex items-center gap-2 bg-white border-2 border-blue-600 hover:border-blue-700 rounded-xl p-1.5 shadow-xs cursor-pointer transition-transform hover:scale-105"
                            title="Clique para ampliar este QR Code e ver os dados sincronizados"
                          >
                            <QRCodeDisplay
                              value={getStudentQrPayload(st, cls)}
                              size={82}
                              altText={`QR Code Oficial Sincronizado - ${st.fullName}`}
                            />
                            <div className="flex flex-col text-[8px] font-black text-blue-900 leading-tight">
                              <span className="text-[12px] text-blue-700">📷</span>
                              <span>QR CODE</span>
                              <span className="text-emerald-700">SINCRONIZADO</span>
                              <span className="text-[7px] text-blue-500 font-bold underline">Ampliar</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ================= VERSO DA CARTEIRINHA ================= */}
                      <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-md overflow-hidden flex flex-col justify-between relative min-h-[340px]">
                        {/* Court Watermark Demarcation Line Pattern */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.04] p-2" viewBox="0 0 200 300" preserveAspectRatio="none">
                          <rect x="8" y="8" width="184" height="284" fill="none" stroke="#0F172A" strokeWidth="3" />
                          <line x1="8" y1="100" x2="192" y2="100" stroke="#0F172A" strokeWidth="2" />
                          <line x1="8" y1="200" x2="192" y2="200" stroke="#0F172A" strokeWidth="2" />
                          <line x1="8" y1="150" x2="192" y2="150" stroke="#0F172A" strokeWidth="3" />
                        </svg>

                        {/* Header Verso */}
                        <div className="bg-slate-100 p-3 border-b border-slate-200 flex items-center justify-between text-xs relative z-10">
                          <span className="font-bold text-slate-700 uppercase text-[10px] tracking-wider">
                            Informações Legais & Emergência
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500">
                            Verso do Documento
                          </span>
                        </div>

                        {/* Body Verso */}
                        <div className="p-4 space-y-3 text-[11px] text-slate-700 flex-1">
                          {/* Guardian / Responsável */}
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1">
                            <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                              <User className="w-3 h-3 text-blue-700" />
                              <span>Responsável Legal:</span>
                            </div>
                            <div className="font-bold text-slate-900 text-xs">
                              {st.guardian.name} ({st.guardian.relationship})
                            </div>
                            <div className="flex items-center gap-1.5 font-mono text-blue-800 font-semibold pt-0.5">
                              <Phone className="w-3 h-3 text-emerald-600" />
                              <span>{st.guardian.phone}</span>
                            </div>
                            {st.guardian.emergencyPhone && (
                              <div className="text-[10px] text-slate-600 font-mono">
                                Emergência 2: {st.guardian.emergencyPhone}
                              </div>
                            )}
                          </div>

                          {/* Health & Medical */}
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1">
                            <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                              <HeartPulse className="w-3 h-3 text-rose-600" />
                              <span>Observações Médicas & Alergias:</span>
                            </div>
                            <div className="text-slate-800 text-[10px] leading-tight">
                              {st.allergies || st.medicalConditions ? (
                                <>
                                  {st.allergies && <span>Alergias: {st.allergies}. </span>}
                                  {st.medicalConditions && <span>Condições: {st.medicalConditions}</span>}
                                </>
                              ) : (
                                <span className="text-slate-500">Nenhuma restrição médica declarada.</span>
                              )}
                            </div>
                          </div>

                          {/* QR Code Presença Automática Verso - Grandioso e Destacado */}
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-2.5 rounded-2xl border-2 border-blue-400 flex items-center gap-3 shadow-2xs">
                            <div
                              onClick={() => setShowBigQr(true)}
                              className="shrink-0 bg-white p-1 rounded-xl border-2 border-blue-600 shadow-xs cursor-pointer hover:scale-105 transition-transform"
                              title="Clique para ampliar este QR Code"
                            >
                              <QRCodeDisplay
                                value={getStudentQrPayload(st, cls)}
                                size={78}
                                altText={`QR Code Oficial Sincronizado - ${st.fullName}`}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 text-xs font-black text-blue-900 uppercase">
                                <QrCode className="w-4 h-4 text-blue-700" />
                                <span>QR Code Oficial de Presença</span>
                              </div>
                              <p className="text-[10px] text-slate-700 leading-tight pt-1">
                                Aproxime da câmera ou do leitor do instrutor na entrada da quadra para marcar presença automática.
                              </p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-[9px] font-mono font-bold text-blue-800 bg-white px-2 py-0.5 rounded border border-blue-300 shadow-2xs">
                                  {st.registrationNumber}
                                </span>
                                <span className="text-[8px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  ✓ Check-in Automático
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Normativa */}
                          <div className="text-[9px] text-slate-500 leading-tight">
                            Este documento é de uso pessoal e intransferível. Válido mediante apresentação nas aulas, treinos, chamadas com instrutor e torneios oficiais da modalidade.
                          </div>
                        </div>

                        {/* Footer Verso: Validade e Assinatura */}
                        <div className="bg-slate-50 border-t border-slate-200 p-3 flex items-center justify-between text-[10px]">
                          <div>
                            <span className="text-slate-500 block text-[9px] uppercase font-semibold">Validade da Carteirinha:</span>
                            <strong className="text-blue-900 font-bold">31 / DEZEMBRO / 2026</strong>
                          </div>

                          <div className="text-right">
                            <div className="border-b border-slate-400 w-28 mx-auto mb-0.5"></div>
                            <span className="text-[8px] text-slate-500 uppercase font-semibold">
                              Coordenação VôleiPro
                            </span>
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
    </div>
  );
}
