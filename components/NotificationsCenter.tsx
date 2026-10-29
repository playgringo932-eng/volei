'use client';

import React, { useState, useMemo } from 'react';
import {
  Bell,
  MessageCircle,
  Send,
  AlertTriangle,
  CheckCircle2,
  Phone,
  CheckCheck,
} from 'lucide-react';
import {
  Student,
  VolleyballClass,
  DailyAttendanceSession,
  NotificationLog,
} from '@/types/volleyball';
import { storageService } from '@/lib/storage';
import { createWhatsAppLink, generateNotificationId } from '@/lib/volleyballHelpers';

interface NotificationsCenterProps {
  students: Student[];
  classes: VolleyballClass[];
  sessions: DailyAttendanceSession[];
  notifications: NotificationLog[];
  onAddNotification: (log: NotificationLog) => void;
  preSelectedStudent?: Student | null;
}

export function NotificationsCenter({
  students,
  classes,
  sessions,
  notifications,
  onAddNotification,
  preSelectedStudent,
}: NotificationsCenterProps) {
  const todayStr = '2026-10-29';

  const [activeTab, setActiveTab] = useState<'dailyAbsences' | 'lowAttendance' | 'customSender' | 'history'>('dailyAbsences');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    preSelectedStudent?.id || students[0]?.id || ''
  );
  const [customChannel, setCustomChannel] = useState<'WhatsApp' | 'SMS' | 'Email'>('WhatsApp');
  const [customMessageType, setCustomMessageType] = useState<
    'Falta no Treino' | 'Alerta Baixa Frequência' | 'Aviso Geral' | 'Boas-Vindas Matrícula'
  >('Falta no Treino');
  const [customText, setCustomText] = useState(
    'Olá {responsavel}! Informamos que o aluno(a) {nome_aluno} registrou falta no treino de vôlei hoje na turma {turma}. Caso tenha atestado ou justificativa, por gentileza nos informe.'
  );
  const [bulkSentToast, setBulkSentToast] = useState<string | null>(null);

  const classMap = useMemo(() => {
    const map = new Map<string, VolleyballClass>();
    classes.forEach((c) => map.set(c.id, c));
    return map;
  }, [classes]);

  const todayAbsentStudents = useMemo(() => {
    const absents: { student: Student; cls?: VolleyballClass; date: string }[] = [];
    const todaySessions = sessions.filter((s) => s.date === todayStr);

    todaySessions.forEach((sess) => {
      Object.entries(sess.entries).forEach(([sId, entry]) => {
        if (entry.status === 'falta') {
          const student = students.find((s) => s.id === sId);
          if (student) {
            absents.push({
              student,
              cls: classMap.get(sess.classId),
              date: sess.date,
            });
          }
        }
      });
    });

    return absents;
  }, [sessions, students, classMap]);

  const lowAttendanceStudents = useMemo(() => {
    return students
      .filter((s) => s.status === 'Ativo')
      .map((s) => {
        const summary = storageService.getStudentAttendanceSummary(s.id, '2026-10');
        return {
          student: s,
          cls: classMap.get(s.classId),
          summary,
        };
      })
      .filter((item) => item.summary.isAtRisk);
  }, [students, classMap]);

  const targetStudent = useMemo(() => {
    return students.find((s) => s.id === selectedStudentId) || students[0];
  }, [students, selectedStudentId]);

  const resolvedCustomMessage = useMemo(() => {
    if (!targetStudent) return '';
    const cls = classMap.get(targetStudent.classId);
    const summary = storageService.getStudentAttendanceSummary(targetStudent.id, '2026-10');

    return customText
      .replace(/{nome_aluno}/g, targetStudent.fullName)
      .replace(/{responsavel}/g, targetStudent.guardian.name)
      .replace(/{turma}/g, cls?.name || 'Turma de Vôlei')
      .replace(/{data}/g, todayStr.split('-').reverse().join('/'))
      .replace(/{frequencia}/g, `${summary.attendanceRate}%`);
  }, [targetStudent, customText, classMap]);

  const handleSendSingleWhatsApp = (student: Student, message: string, type: any = 'Falta no Treino') => {
    const log: NotificationLog = {
      id: generateNotificationId(),
      studentId: student.id,
      studentName: student.fullName,
      guardianName: student.guardian.name,
      guardianPhone: student.guardian.phone,
      guardianEmail: student.guardian.email,
      type,
      message,
      channel: 'WhatsApp',
      sentAt: new Date().toISOString(),
      status: 'Enviado',
    };

    storageService.addNotification(log);
    onAddNotification(log);

    const url = createWhatsAppLink(student.guardian.phone, message);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleBulkDispatchTodayAbsences = () => {
    if (todayAbsentStudents.length === 0) return;

    todayAbsentStudents.forEach(({ student, cls }) => {
      const msg = `Olá ${student.guardian.name}! Comunicado da Academia VôleiPro: o aluno(a) ${student.fullName} teve falta registrada no treino de hoje (${todayStr.split('-').reverse().join('/')}) na turma ${cls?.name || 'de Vôlei'}. Por favor, nos avise se houver justificativa.`;
      
      const log: NotificationLog = {
        id: generateNotificationId(),
        studentId: student.id,
        studentName: student.fullName,
        guardianName: student.guardian.name,
        guardianPhone: student.guardian.phone,
        guardianEmail: student.guardian.email,
        type: 'Falta no Treino',
        message: msg,
        channel: 'WhatsApp',
        sentAt: new Date().toISOString(),
        status: 'Enviado',
      };
      storageService.addNotification(log);
      onAddNotification(log);
    });

    setBulkSentToast(`Notificações automáticas registradas para ${todayAbsentStudents.length} responsáveis!`);
    setTimeout(() => setBulkSentToast(null), 4000);
  };

  return (
    <div className="space-y-5">
      {bulkSentToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-700 text-white font-semibold px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-emerald-500">
          <CheckCheck className="w-5 h-5 text-white" />
          <span>{bulkSentToast}</span>
        </div>
      )}

      {/* Header & Tabs */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-700" />
            <h2 className="text-lg font-bold text-slate-900">
              Sistema de Notificações aos Responsáveis
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Avisos de ausência, alertas de frequência e comunicados com envio direto via WhatsApp
          </p>
        </div>

        {/* Tab Pills */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs flex-wrap">
          <button
            onClick={() => setActiveTab('dailyAbsences')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'dailyAbsences'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Faltas de Hoje ({todayAbsentStudents.length})
          </button>
          <button
            onClick={() => setActiveTab('lowAttendance')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'lowAttendance'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Baixa Assiduidade ({lowAttendanceStudents.length})
          </button>
          <button
            onClick={() => setActiveTab('customSender')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'customSender'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Mensagem Personalizada
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Histórico ({notifications.length})
          </button>
        </div>
      </div>

      {/* TAB 1: Today's Absences */}
      {activeTab === 'dailyAbsences' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Alunos Ausentes no Treino de Hoje ({todayStr.split('-').reverse().join('/')})</h3>
              <p className="text-xs text-slate-500">
                Alunos marcados com falta na chamada em tempo real.
              </p>
            </div>

            {todayAbsentStudents.length > 0 && (
              <button
                onClick={handleBulkDispatchTodayAbsences}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-all active:scale-95"
              >
                <Send className="w-4 h-4" />
                <span>Registrar Disparo em Lote ({todayAbsentStudents.length})</span>
              </button>
            )}
          </div>

          {todayAbsentStudents.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-xs">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
              <h4 className="font-bold text-slate-900 text-sm">Nenhuma falta pendente de notificação hoje!</h4>
              <p className="text-xs text-slate-500 mt-1">
                Todas as turmas estão com frequência registrada sem pendências de envio.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {todayAbsentStudents.map(({ student, cls }) => {
                const message = `Olá ${student.guardian.name}! Comunicado da Academia VôleiPro: informamos que o(a) aluno(a) ${student.fullName} registrou falta no treino hoje (${todayStr.split('-').reverse().join('/')}) na turma ${cls?.name}. Contamos com seu apoio para justificar a ausência.`;

                return (
                  <div
                    key={student.id}
                    className="bg-white border border-rose-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{student.fullName}</div>
                          <span className="text-xs text-slate-500">
                            {student.age} anos • {student.category} • {cls?.name} ({cls?.shift})
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          Falta Hoje
                        </span>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-3 my-2 text-xs text-slate-700 border border-slate-100">
                        <div className="font-semibold text-slate-900">{student.guardian.name} ({student.guardian.relationship})</div>
                        <div className="text-blue-700 font-semibold flex items-center gap-1.5 mt-0.5 font-mono">
                          <Phone className="w-3.5 h-3.5" />
                          <span>{student.guardian.phone}</span>
                        </div>
                      </div>

                      <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200 text-[11px] text-slate-600 italic mb-3">
                        &ldquo;{message}&rdquo;
                      </div>
                    </div>

                    <button
                      onClick={() => handleSendSingleWhatsApp(student, message, 'Falta no Treino')}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-all active:scale-95"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Abrir WhatsApp do Responsável</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Low Attendance */}
      {activeTab === 'lowAttendance' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <h3 className="font-bold text-slate-900 text-sm">Alunos com Frequência Crítica (&lt; 75%)</h3>
            <p className="text-xs text-slate-500">
              Atletas com faltas acumuladas no mês corrente. Recomenda-se aviso preventivo aos pais para evitar evasão escolar/esportiva.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lowAttendanceStudents.map(({ student, cls, summary }) => {
              const alertMessage = `Prezado(a) ${student.guardian.name}, a coordenação pedagógica da Academia VôleiPro gostaria de conversar sobre a assiduidade do(a) aluno(a) ${student.fullName}. Ele(a) está atualmente com ${summary.attendanceRate}% de frequência (${summary.absentCount} faltas no mês), abaixo do mínimo de 75% exigido. Estamos à disposição para apoiar!`;

              return (
                <div
                  key={student.id}
                  className="bg-white border border-amber-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{student.fullName}</h4>
                        <span className="text-xs text-slate-500">
                          {student.age} anos • {student.category} • {cls?.name}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 tabular-nums">
                        {summary.attendanceRate}% Assiduidade
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 my-3 text-center text-xs">
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-500 block uppercase">Aulas</span>
                        <strong className="text-slate-800 tabular-nums">{summary.totalClasses}</strong>
                      </div>
                      <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                        <span className="text-[10px] text-emerald-700 block uppercase">Presenças</span>
                        <strong className="text-emerald-700 tabular-nums">{summary.presentCount}</strong>
                      </div>
                      <div className="bg-rose-50 p-2 rounded-lg border border-rose-100">
                        <span className="text-[10px] text-rose-700 block uppercase">Faltas</span>
                        <strong className="text-rose-700 tabular-nums">{summary.absentCount}</strong>
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 mb-3">
                      <strong>Responsável:</strong> {student.guardian.name} • Tel: <span className="font-mono">{student.guardian.phone}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSendSingleWhatsApp(student, alertMessage, 'Alerta Baixa Frequência')}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-all active:scale-95"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Enviar Alerta de Assiduidade via WhatsApp</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: Custom Sender */}
      {activeTab === 'customSender' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Criar Mensagem Personalizada</h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Selecione o Aluno e Responsável
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-semibold focus:bg-white"
              >
                {students.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.fullName} ({st.category}) — Resp: {st.guardian.name} ({st.guardian.phone})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tipo de Notificação
                </label>
                <select
                  value={customMessageType}
                  onChange={(e) => setCustomMessageType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                >
                  <option value="Falta no Treino">Falta no Treino</option>
                  <option value="Alerta Baixa Frequência">Alerta Baixa Frequência</option>
                  <option value="Aviso Geral">Aviso Geral / Torneio</option>
                  <option value="Boas-Vindas Matrícula">Boas-Vindas Matrícula</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Canal de Envio
                </label>
                <select
                  value={customChannel}
                  onChange={(e) => setCustomChannel(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                >
                  <option value="WhatsApp">WhatsApp (Oficial)</option>
                  <option value="SMS">SMS</option>
                  <option value="Email">E-mail</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Modelo de Mensagem
                </label>
                <span className="text-[10px] text-blue-700 font-semibold">
                  Tags: {'{nome_aluno}'}, {'{responsavel}'}, {'{turma}'}, {'{data}'}
                </span>
              </div>
              <textarea
                rows={4}
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-mono focus:bg-white"
              />
            </div>

            <button
              onClick={() => {
                if (targetStudent) {
                  handleSendSingleWhatsApp(targetStudent, resolvedCustomMessage, customMessageType);
                }
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-all active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>Enviar para {targetStudent?.guardian.name} no WhatsApp</span>
            </button>
          </div>

          {/* WhatsApp Preview Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                <MessageCircle className="w-5 h-5 text-emerald-600" />
                <h4 className="font-bold text-slate-900 text-xs">
                  Pré-visualização da Mensagem (WhatsApp)
                </h4>
              </div>

              {/* Chat bubble */}
              <div className="bg-slate-100 rounded-xl p-4 border border-slate-200 max-w-sm mx-auto">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 mb-2">
                  <div className="w-7 h-7 rounded-full bg-blue-700 flex items-center justify-center font-bold text-white text-[10px]">
                    VP
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-xs">VôleiPro Oficial</div>
                    <div className="text-[10px] text-emerald-700 font-semibold">online</div>
                  </div>
                </div>

                <div className="bg-white text-slate-800 p-3 rounded-xl text-xs leading-relaxed shadow-xs border border-slate-200">
                  <div>{resolvedCustomMessage}</div>
                  <div className="text-[9px] text-slate-400 text-right mt-1">10:45 ✓✓</div>
                </div>
              </div>
            </div>

            <div className="mt-3 p-3 bg-blue-50/70 rounded-xl text-xs text-blue-900 border border-blue-100">
              Ao clicar no botão de envio, o sistema abre diretamente o WhatsApp do responsável com a mensagem personalizada pronta para disparo.
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: History */}
      {activeTab === 'history' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-900 text-xs uppercase tracking-wider">
            Histórico de Notificações Registradas ({notifications.length})
          </div>

          <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                Nenhum aviso enviado até o momento.
              </div>
            ) : (
              notifications.map((notif) => (
                <div key={notif.id} className="p-3.5 hover:bg-slate-50/80 transition-colors text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{notif.studentName}</span>
                      <span className="text-slate-500">→ Resp: {notif.guardianName} ({notif.guardianPhone})</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(notif.sentAt).toLocaleString('pt-BR')}
                    </span>
                  </div>

                  <div className="text-slate-700 text-xs bg-slate-50 p-2 rounded-lg border border-slate-100">
                    {notif.message}
                  </div>

                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      {notif.type}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {notif.channel}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-semibold ml-auto flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {notif.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
