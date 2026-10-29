'use client';

import React from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  HeartPulse,
  ShieldCheck,
  MessageCircle,
  Edit,
  CreditCard,
  Trash2,
} from 'lucide-react';
import { Student, VolleyballClass, DailyAttendanceSession } from '@/types/volleyball';
import { storageService } from '@/lib/storage';
import { createWhatsAppLink } from '@/lib/volleyballHelpers';

interface StudentDetailsModalProps {
  isOpen: boolean;
  student: Student | null;
  classes: VolleyballClass[];
  sessions: DailyAttendanceSession[];
  onClose: () => void;
  onEdit: (student: Student) => void;
  onOpenNotifyModal?: (student: Student) => void;
  onViewIdCard?: (student: Student) => void;
  onDelete?: (student: Student) => void;
}

export function StudentDetailsModal({
  isOpen,
  student,
  classes,
  sessions,
  onClose,
  onEdit,
  onOpenNotifyModal,
  onViewIdCard,
  onDelete,
}: StudentDetailsModalProps) {
  if (!isOpen || !student) return null;

  const currentClass = classes.find((c) => c.id === student.classId);
  const summary = storageService.getStudentAttendanceSummary(student.id, '2026-10');

  const studentSessions = sessions
    .filter((s) => s.entries[student.id])
    .sort((a, b) => b.date.localeCompare(a.date));

  const handleWhatsAppClick = () => {
    const text = `Olá ${student.guardian.name}, tudo bem? Aqui é da coordenação da Academia VôleiPro sobre o(a) atleta ${student.fullName}.`;
    const url = createWhatsAppLink(student.guardian.phone, text);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Header with profile banner in Blue & White */}
        <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-200 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-blue-700 flex items-center justify-center text-white font-black text-lg sm:text-xl shadow-xs shrink-0">
              {student.jerseyNumber ? `#${student.jerseyNumber}` : student.fullName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">{student.fullName}</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                  {student.category}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                <span>Matrícula: <strong className="text-slate-800 font-mono">{student.registrationNumber}</strong></span>
                <span>•</span>
                <span>{student.age} anos (Nasc: {student.birthDate.split('-').reverse().join('/')})</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {onDelete && (
              <button
                onClick={() => {
                  onClose();
                  onDelete(student);
                }}
                className="p-2 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                title="Excluir Matrícula deste Aluno"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => {
                onClose();
                onEdit(student);
              }}
              className="p-2 rounded-xl text-slate-500 hover:text-blue-700 hover:bg-slate-200/60 transition-colors"
              title="Editar Cadastro"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-slate-700">
          {/* Status & Technical Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 font-semibold block mb-1">Status</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {student.status}
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 font-semibold block mb-1">Posição</span>
              <span className="font-bold text-slate-900 text-xs">{student.preferredPosition}</span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 font-semibold block mb-1">Nível</span>
              <span className="font-bold text-slate-800 text-xs">{student.level}</span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 font-semibold block mb-1">Altura</span>
              <span className="font-bold text-slate-800 text-xs">{student.heightCm ? `${student.heightCm} cm` : 'Não informada'}</span>
            </div>
          </div>

          {/* Attendance KPI Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-700" />
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Frequência Mensal (Outubro 2026)
                </h3>
              </div>
              {summary.isAtRisk ? (
                <span className="flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Alerta: &lt;75% Assiduidade
                </span>
              ) : (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  Frequência Regular
                </span>
              )}
            </div>

            <div className="grid grid-cols-4 gap-2 text-center py-1">
              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                <span className="block text-2xl font-black text-blue-800 tabular-nums">{summary.attendanceRate}%</span>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Taxa Geral</span>
              </div>
              <div className="bg-emerald-50 rounded-xl p-2.5 border border-emerald-100">
                <span className="block text-2xl font-black text-emerald-700 tabular-nums">{summary.presentCount}</span>
                <span className="text-[10px] text-emerald-700 uppercase font-semibold">Presenças</span>
              </div>
              <div className="bg-rose-50 rounded-xl p-2.5 border border-rose-100">
                <span className="block text-2xl font-black text-rose-700 tabular-nums">{summary.absentCount}</span>
                <span className="text-[10px] text-rose-700 uppercase font-semibold">Faltas</span>
              </div>
              <div className="bg-blue-50 rounded-xl p-2.5 border border-blue-100">
                <span className="block text-2xl font-black text-blue-700 tabular-nums">{summary.justifiedCount}</span>
                <span className="text-[10px] text-blue-700 uppercase font-semibold">Justificadas</span>
              </div>
            </div>
          </div>

          {/* Turma & Horário */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-700" />
              Turma e Horário de Treino
            </h4>
            {currentClass ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-slate-900 text-sm">{currentClass.name}</div>
                  <div className="text-xs text-slate-500">
                    Turno: <strong className="text-blue-800 font-semibold">{currentClass.shift}</strong> •{' '}
                    {currentClass.startTime} às {currentClass.endTime} • {currentClass.court}
                  </div>
                </div>
                <div className="text-xs text-slate-700 bg-white px-3 py-1.5 rounded-xl border border-slate-200 font-medium">
                  Instrutor: <strong className="text-slate-900">{currentClass.instructorName}</strong>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400">Nenhuma turma vinculada</div>
            )}
          </div>

          {/* Guardian Info & Direct WhatsApp Trigger */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-700" />
                Responsável Legal
              </h4>
              <button
                onClick={handleWhatsAppClick}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-all active:scale-95"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp do Responsável
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <User className="w-4 h-4 text-slate-400" />
                <span>
                  <strong>{student.guardian.name}</strong> ({student.guardian.relationship})
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 font-mono">
                <Phone className="w-4 h-4 text-emerald-600" />
                <span>{student.guardian.phone}</span>
              </div>
              {student.guardian.email && (
                <div className="flex items-center gap-2 text-slate-700">
                  <Mail className="w-4 h-4 text-blue-600" />
                  <span>{student.guardian.email}</span>
                </div>
              )}
              {student.guardian.emergencyPhone && (
                <div className="flex items-center gap-2 text-slate-700 font-mono">
                  <Phone className="w-4 h-4 text-amber-600" />
                  <span>Emergência: {student.guardian.emergencyPhone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Health & Allergies */}
          {(student.allergies || student.medicalConditions || student.notes) && (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-blue-700" />
                Saúde & Observações
              </h4>
              {student.allergies && (
                <div className="text-slate-700">
                  <strong className="text-rose-700">Alergias:</strong> {student.allergies}
                </div>
              )}
              {student.medicalConditions && (
                <div className="text-slate-700">
                  <strong className="text-amber-700">Condições de Saúde:</strong> {student.medicalConditions}
                </div>
              )}
              {student.notes && (
                <div className="text-slate-600 italic">
                  <strong>Anotação Técnica:</strong> &ldquo;{student.notes}&rdquo;
                </div>
              )}
            </div>
          )}

          {/* Recent Attendance Session History */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-700" />
              Histórico Recente de Presenças
            </h4>
            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
              {studentSessions.length === 0 ? (
                <div className="text-xs text-slate-400 py-2">Nenhum registro de presença ainda.</div>
              ) : (
                studentSessions.map((sess) => {
                  const entry = sess.entries[student.id];
                  if (!entry) return null;

                  let badgeColor = 'bg-slate-100 text-slate-700';
                  let label = 'Presente';
                  let icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;

                  if (entry.status === 'presente') {
                    badgeColor = 'bg-emerald-50 text-emerald-800 border border-emerald-200';
                    label = 'Presente';
                  } else if (entry.status === 'falta') {
                    badgeColor = 'bg-rose-50 text-rose-800 border border-rose-200';
                    label = 'Falta Não Justificada';
                    icon = <XCircle className="w-3.5 h-3.5 text-rose-600" />;
                  } else if (entry.status === 'justificada') {
                    badgeColor = 'bg-blue-50 text-blue-800 border border-blue-200';
                    label = 'Justificada';
                    icon = <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />;
                  } else if (entry.status === 'atraso') {
                    badgeColor = 'bg-amber-50 text-amber-800 border border-amber-200';
                    label = 'Atraso Tolerado';
                    icon = <Clock className="w-3.5 h-3.5 text-amber-600" />;
                  }

                  return (
                    <div
                      key={sess.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        {icon}
                        <span className="font-semibold text-slate-800">
                          {sess.date.split('-').reverse().join('/')}
                        </span>
                        <span className="text-slate-500 text-[11px]">({sess.shift})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {entry.note && (
                          <span className="text-slate-500 text-[11px] truncate max-w-[150px]" title={entry.note}>
                            Obs: {entry.note}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${badgeColor}`}>
                          {label}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {onViewIdCard && (
              <button
                onClick={() => {
                  onClose();
                  onViewIdCard(student);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
              >
                <CreditCard className="w-4 h-4" />
                <span>Ver Carteirinha Oficial</span>
              </button>
            )}

            <button
              onClick={() => {
                onClose();
                if (onOpenNotifyModal) onOpenNotifyModal(student);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-blue-700 hover:bg-blue-50 text-xs font-semibold transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Avisar Responsável</span>
            </button>

            {onDelete && (
              <button
                onClick={() => {
                  onClose();
                  onDelete(student);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white border border-rose-300 text-xs font-bold transition-all"
                title="Excluir Matrícula Definitivamente"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir Matrícula</span>
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 text-slate-700 hover:bg-slate-300 text-xs font-semibold transition-colors ml-auto sm:ml-0"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
