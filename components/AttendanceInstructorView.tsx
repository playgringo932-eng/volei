'use client';

import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Calendar,
  Save,
  CheckCheck,
  Smartphone,
  MessageCircle,
  FileSpreadsheet,
  Search,
  StickyNote,
  Users,
  QrCode,
  Camera,
} from 'lucide-react';
import {
  Student,
  VolleyballClass,
  DailyAttendanceSession,
  AttendanceStatus,
  NotificationLog,
} from '@/types/volleyball';
import { storageService } from '@/lib/storage';
import { exportSessionToExcel } from '@/lib/excelExport';
import { createWhatsAppLink, generateNotificationId } from '@/lib/volleyballHelpers';

interface AttendanceInstructorViewProps {
  students: Student[];
  classes: VolleyballClass[];
  sessions: DailyAttendanceSession[];
  onTriggerNotification?: (notif: NotificationLog) => void;
  onOpenQrScanner?: (classId?: string, date?: string) => void;
}

interface AttendanceSessionBoardProps {
  selectedClass: VolleyballClass;
  selectedDate: string;
  classStudents: Student[];
  allStudents: Student[];
  onTriggerNotification?: (notif: NotificationLog) => void;
  onOpenQrScanner?: () => void;
}

function AttendanceSessionBoard({
  selectedClass,
  selectedDate,
  classStudents,
  allStudents,
  onTriggerNotification,
  onOpenQrScanner,
}: AttendanceSessionBoardProps) {
  const [currentEntries, setCurrentEntries] = useState<
    Record<string, { status: AttendanceStatus; note?: string; updatedAt: string }>
  >(() => {
    const existing = storageService.getSession(selectedClass.id, selectedDate);
    if (existing && existing.entries) {
      return { ...existing.entries };
    }
    const initial: Record<string, { status: AttendanceStatus; note?: string; updatedAt: string }> = {};
    classStudents.forEach((st) => {
      initial[st.id] = {
        status: 'presente',
        updatedAt: new Date().toISOString(),
      };
    });
    return initial;
  });

  const [filterQuery, setFilterQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'falta' | 'presente' | 'pendente'>('all');
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [activeNoteStudentId, setActiveNoteStudentId] = useState<string | null>(null);

  // Synchronize live with storageService updates (e.g. from QR code scans in real-time)
  React.useEffect(() => {
    const handleSync = () => {
      const existing = storageService.getSession(selectedClass.id, selectedDate);
      if (existing && existing.entries) {
        setCurrentEntries({ ...existing.entries });
      }
    };
    const unsubscribe = storageService.subscribe(handleSync);
    return () => unsubscribe();
  }, [selectedClass.id, selectedDate]);

  // Save session to storage
  const persistSession = (entriesToSave = currentEntries) => {
    const session: DailyAttendanceSession = {
      id: `${selectedClass.id}_${selectedDate}`,
      classId: selectedClass.id,
      date: selectedDate,
      instructorName: selectedClass.instructorName,
      entries: entriesToSave,
      savedAt: new Date().toISOString(),
      shift: selectedClass.shift,
    };

    storageService.recordAttendance(session);
    setSaveToast('Chamada salva em tempo real no banco de dados!');
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleSetStatus = (studentId: string, status: AttendanceStatus) => {
    const updated = {
      ...currentEntries,
      [studentId]: {
        ...currentEntries[studentId],
        status,
        updatedAt: new Date().toISOString(),
      },
    };
    setCurrentEntries(updated);
    persistSession(updated);
  };

  const handleSetNote = (studentId: string, note: string) => {
    const updated = {
      ...currentEntries,
      [studentId]: {
        ...currentEntries[studentId],
        note,
        updatedAt: new Date().toISOString(),
      },
    };
    setCurrentEntries(updated);
    persistSession(updated);
  };

  const handleMarkAllPresent = () => {
    const updated: Record<string, { status: AttendanceStatus; note?: string; updatedAt: string }> = {};
    classStudents.forEach((st) => {
      updated[st.id] = {
        status: 'presente',
        note: currentEntries[st.id]?.note,
        updatedAt: new Date().toISOString(),
      };
    });
    setCurrentEntries(updated);
    persistSession(updated);
  };

  const handleExportSession = () => {
    const session: DailyAttendanceSession = {
      id: `${selectedClass.id}_${selectedDate}`,
      classId: selectedClass.id,
      date: selectedDate,
      instructorName: selectedClass.instructorName,
      entries: currentEntries,
      savedAt: new Date().toISOString(),
      shift: selectedClass.shift,
    };
    exportSessionToExcel(session, allStudents, selectedClass);
  };

  const handleSendAbsenceAlert = (student: Student) => {
    const dateFormatted = selectedDate.split('-').reverse().join('/');
    const message = `Olá ${student.guardian.name}! Informamos que o(a) aluno(a) ${student.fullName} registrou falta no treino de Vôlei hoje (${dateFormatted}) na turma ${selectedClass.name}. Caso haja justificativa ou atestado, por gentileza nos envie. Atenciosamente, ${selectedClass.instructorName} - VôleiPro.`;

    const notifLog: NotificationLog = {
      id: generateNotificationId(),
      studentId: student.id,
      studentName: student.fullName,
      guardianName: student.guardian.name,
      guardianPhone: student.guardian.phone,
      guardianEmail: student.guardian.email,
      type: 'Falta no Treino',
      message,
      channel: 'WhatsApp',
      sentAt: new Date().toISOString(),
      status: 'Enviado',
    };
    storageService.addNotification(notifLog);
    if (onTriggerNotification) onTriggerNotification(notifLog);

    const url = createWhatsAppLink(student.guardian.phone, message);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const stats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let justified = 0;
    let late = 0;

    classStudents.forEach((s) => {
      const entry = currentEntries[s.id];
      if (entry?.status === 'presente') present++;
      else if (entry?.status === 'falta') absent++;
      else if (entry?.status === 'justificada') justified++;
      else if (entry?.status === 'atraso') late++;
    });

    const total = classStudents.length;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 100;

    return { total, present, absent, justified, late, rate };
  }, [classStudents, currentEntries]);

  const displayedStudents = useMemo(() => {
    return classStudents.filter((s) => {
      if (filterQuery.trim()) {
        const query = filterQuery.toLowerCase();
        if (!s.fullName.toLowerCase().includes(query) && !s.preferredPosition.toLowerCase().includes(query)) {
          return false;
        }
      }

      if (statusFilter !== 'all') {
        const entry = currentEntries[s.id];
        if (statusFilter === 'falta' && entry?.status !== 'falta') return false;
        if (statusFilter === 'presente' && entry?.status !== 'presente') return false;
        if (statusFilter === 'pendente' && entry?.status) return false;
      }

      return true;
    });
  }, [classStudents, filterQuery, statusFilter, currentEntries]);

  return (
    <div className="space-y-4">
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-blue-700 text-white font-semibold px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-blue-500 animate-bounce">
          <CheckCheck className="w-5 h-5 text-white" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Action shortcuts */}
      <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
        <div className="text-xs text-slate-600 font-medium">
          Ocupação desta turma:{' '}
          <strong className="text-blue-800 font-bold">{classStudents.length}</strong> alunos matriculados
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onOpenQrScanner && (
            <button
              onClick={onOpenQrScanner}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 text-white text-xs font-bold shadow-xs transition-all active:scale-95"
            >
              <QrCode className="w-4 h-4 text-cyan-300" />
              <span>Leitor QR Code</span>
            </button>
          )}
          <button
            onClick={handleExportSession}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Exportar Chamada Excel</span>
          </button>
          <button
            onClick={handleMarkAllPresent}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-bold transition-all"
          >
            <CheckCheck className="w-4 h-4 text-blue-700" />
            <span>Todos Presentes</span>
          </button>
        </div>
      </div>

      {/* Live Attendance Counter Strip - Blue & White */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-xs">
          <span className="text-[10px] text-slate-500 font-semibold block uppercase">Total Turma</span>
          <span className="text-xl font-black text-slate-900 tabular-nums">{stats.total}</span>
        </div>

        <div className="bg-white border border-emerald-200 rounded-xl p-3 text-center shadow-xs">
          <span className="text-[10px] text-emerald-700 font-semibold block uppercase">Presentes</span>
          <span className="text-xl font-black text-emerald-700 tabular-nums">{stats.present}</span>
        </div>

        <div className="bg-white border border-rose-200 rounded-xl p-3 text-center shadow-xs">
          <span className="text-[10px] text-rose-700 font-semibold block uppercase">Faltas</span>
          <span className="text-xl font-black text-rose-700 tabular-nums">{stats.absent}</span>
        </div>

        <div className="bg-white border border-blue-200 rounded-xl p-3 text-center shadow-xs">
          <span className="text-[10px] text-blue-700 font-semibold block uppercase">Justificadas</span>
          <span className="text-xl font-black text-blue-700 tabular-nums">{stats.justified}</span>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-blue-700 text-white rounded-xl p-3 text-center shadow-xs">
          <span className="text-[10px] text-blue-100 font-semibold block uppercase">% Frequência</span>
          <span className="text-xl font-black text-white tabular-nums">{stats.rate}%</span>
        </div>
      </div>

      {/* Filter / Search within class */}
      <div className="flex items-center justify-between gap-2 flex-wrap bg-white border border-slate-200 p-2.5 rounded-xl shadow-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar aluno na chamada..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${
              statusFilter === 'all' ? 'bg-blue-600 text-white font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todos ({classStudents.length})
          </button>
          <button
            onClick={() => setStatusFilter('falta')}
            className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${
              statusFilter === 'falta' ? 'bg-rose-600 text-white font-bold' : 'text-rose-700 hover:bg-rose-50'
            }`}
          >
            Ausentes ({stats.absent})
          </button>
          <button
            onClick={() => setStatusFilter('presente')}
            className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${
              statusFilter === 'presente' ? 'bg-emerald-600 text-white font-bold' : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            Presentes ({stats.present})
          </button>
        </div>
      </div>

      {/* Attendance Student List (Court Tactile Touch Cards) */}
      <div className="space-y-2.5">
        {displayedStudents.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 shadow-xs">
            Nenhum aluno encontrado para os critérios selecionados nesta turma.
          </div>
        ) : (
          displayedStudents.map((student, idx) => {
            const entry = currentEntries[student.id];
            const currentStatus = entry?.status || 'presente';
            const isNoteOpen = activeNoteStudentId === student.id;

            return (
              <div
                key={student.id}
                className={`bg-white border rounded-2xl p-3.5 transition-all shadow-xs ${
                  currentStatus === 'falta'
                    ? 'border-rose-300 bg-rose-50/20'
                    : currentStatus === 'justificada'
                    ? 'border-blue-300 bg-blue-50/20'
                    : currentStatus === 'atraso'
                    ? 'border-amber-300 bg-amber-50/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Student Identity */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-700 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                      {student.jerseyNumber ? `#${student.jerseyNumber}` : idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-sm">{student.fullName}</h4>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/60">
                          {student.age} anos ({student.category})
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>{student.preferredPosition}</span>
                        <span>•</span>
                        <span>Resp: {student.guardian.name}</span>
                      </div>
                    </div>
                  </div>

                  {/* Tactile Big Action Buttons for Instructors */}
                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    {/* [P] Presente */}
                    <button
                      type="button"
                      onClick={() => handleSetStatus(student.id, 'presente')}
                      className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                        currentStatus === 'presente'
                          ? 'bg-emerald-600 text-white shadow-xs font-black'
                          : 'bg-slate-50 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Presente</span>
                    </button>

                    {/* [F] Falta */}
                    <button
                      type="button"
                      onClick={() => handleSetStatus(student.id, 'falta')}
                      className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                        currentStatus === 'falta'
                          ? 'bg-rose-600 text-white shadow-xs font-black'
                          : 'bg-slate-50 text-slate-700 hover:bg-rose-50 hover:text-rose-700 border border-slate-200'
                      }`}
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Falta</span>
                    </button>

                    {/* [J] Justificada */}
                    <button
                      type="button"
                      onClick={() => handleSetStatus(student.id, 'justificada')}
                      className={`flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                        currentStatus === 'justificada'
                          ? 'bg-blue-600 text-white shadow-xs font-black'
                          : 'bg-slate-50 text-slate-700 hover:bg-blue-50 hover:text-blue-700 border border-slate-200'
                      }`}
                      title="Falta com Atestado ou Justificativa"
                    >
                      <span>Justificada</span>
                    </button>

                    {/* [A] Atraso */}
                    <button
                      type="button"
                      onClick={() => handleSetStatus(student.id, 'atraso')}
                      className={`flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                        currentStatus === 'atraso'
                          ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                          : 'bg-slate-50 text-slate-700 hover:bg-amber-50 hover:text-amber-700 border border-slate-200'
                      }`}
                      title="Chegou após o aquecimento"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Atraso</span>
                    </button>

                    {/* Note toggle */}
                    <button
                      type="button"
                      onClick={() => setActiveNoteStudentId(isNoteOpen ? null : student.id)}
                      className={`p-2 rounded-xl border transition-colors ${
                        entry?.note
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-slate-700'
                      }`}
                      title="Adicionar anotação técnica"
                    >
                      <StickyNote className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Sub-row: If Falta, offer WhatsApp Alert */}
                {currentStatus === 'falta' && (
                  <div className="mt-3 pt-2.5 border-t border-rose-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-rose-50/60 p-2.5 rounded-xl">
                    <div className="flex items-center gap-2 text-xs text-rose-800">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>
                        Falta registrada hoje para <strong>{student.fullName}</strong>.
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSendAbsenceAlert(student)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-all active:scale-95 self-start sm:self-auto"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Notificar Pai/Mãe no WhatsApp</span>
                    </button>
                  </div>
                )}

                {/* Inline Instructor Observation Box */}
                {isNoteOpen && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100">
                    <input
                      type="text"
                      placeholder="Observação da aula (ex: Bom saque flutuante, sentiu dores leves, destaque no passe)..."
                      value={entry?.note || ''}
                      onChange={(e) => handleSetNote(student.id, e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>
                )}

                {entry?.note && !isNoteOpen && (
                  <div className="mt-2 text-[11px] text-blue-800 bg-blue-50/80 px-2.5 py-1 rounded-lg border border-blue-100 italic">
                    Obs: {entry.note}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Floating Save Button */}
      <div className="sticky bottom-4 z-20 flex items-center justify-between gap-3 bg-white/95 backdrop-blur-md border border-slate-200 p-3.5 rounded-2xl shadow-lg">
        <div className="text-xs text-slate-700 font-medium">
          Total de presentes hoje:{' '}
          <strong className="text-blue-700 font-bold tabular-nums">{stats.present}</strong> ({stats.rate}%)
        </div>
        <button
          type="button"
          onClick={() => persistSession()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-all active:scale-95"
        >
          <Save className="w-4 h-4" />
          <span>Salvar Chamada</span>
        </button>
      </div>
    </div>
  );
}

export function AttendanceInstructorView({
  students,
  classes,
  onTriggerNotification,
  onOpenQrScanner,
}: AttendanceInstructorViewProps) {
  const defaultDate = '2026-10-29';

  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState<string>(defaultDate);

  const selectedClass = useMemo(() => {
    return classes.find((c) => c.id === selectedClassId) || classes[0];
  }, [classes, selectedClassId]);

  const classStudents = useMemo(() => {
    if (!selectedClass) return [];
    return students.filter((s) => s.classId === selectedClass.id && s.status === 'Ativo');
  }, [students, selectedClass]);

  if (!selectedClass) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-xs">
        Nenhuma turma cadastrada. Crie uma turma primeiro.
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Top Banner: Mobile Instructor Header in Clean Blue & White */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-100 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Chamada em Tempo Real</h2>
                <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/60 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping"></span>
                  Modo Instrutor
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Instrutor: <strong className="text-slate-800">{selectedClass.instructorName}</strong> • {selectedClass.court}
              </p>
            </div>
          </div>

          {onOpenQrScanner && (
            <button
              onClick={() => onOpenQrScanner(selectedClass.id, selectedDate)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 text-white font-extrabold text-xs shadow-sm hover:shadow transition-all active:scale-95 border border-blue-900"
            >
              <Camera className="w-4 h-4 text-cyan-300" />
              <span>Escanear QR Code da Carteirinha</span>
            </button>
          )}
        </div>

        {/* Controls: Class Selector & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Selecione a Turma & Turno
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
            >
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  [{cls.shift}] {cls.name} ({cls.startTime} - {cls.endTime})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Data da Chamada
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Board keyed by session for instant load without effect re-renders */}
      <AttendanceSessionBoard
        key={`${selectedClass.id}_${selectedDate}`}
        selectedClass={selectedClass}
        selectedDate={selectedDate}
        classStudents={classStudents}
        allStudents={students}
        onTriggerNotification={onTriggerNotification}
        onOpenQrScanner={onOpenQrScanner ? () => onOpenQrScanner(selectedClass.id, selectedDate) : undefined}
      />
    </div>
  );
}
