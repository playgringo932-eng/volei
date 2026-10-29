'use client';

import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Download,
  Search,
} from 'lucide-react';
import { Student, VolleyballClass, DailyAttendanceSession } from '@/types/volleyball';
import { storageService } from '@/lib/storage';
import { exportMonthlyAttendanceReportToExcel } from '@/lib/excelExport';

interface AttendanceReportsViewProps {
  students: Student[];
  classes: VolleyballClass[];
  sessions: DailyAttendanceSession[];
}

export function AttendanceReportsView({
  students,
  classes,
  sessions,
}: AttendanceReportsViewProps) {
  const [selectedMonth, setSelectedMonth] = useState('2026-10'); // YYYY-MM
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [filterRiskOnly, setFilterRiskOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');

  const classMap = useMemo(() => {
    const map = new Map<string, VolleyballClass>();
    classes.forEach((c) => map.set(c.id, c));
    return map;
  }, [classes]);

  const monthSessions = useMemo(() => {
    return sessions
      .filter((s) => s.date.startsWith(selectedMonth) && (selectedClassId === 'all' || s.classId === selectedClassId))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [sessions, selectedMonth, selectedClassId]);

  const uniqueDates = useMemo(() => {
    return Array.from(new Set(monthSessions.map((s) => s.date))).sort();
  }, [monthSessions]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (s.status !== 'Ativo') return false;
      if (selectedClassId !== 'all' && s.classId !== selectedClassId) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        if (!s.fullName.toLowerCase().includes(query) && !s.registrationNumber.toLowerCase().includes(query)) {
          return false;
        }
      }

      if (filterRiskOnly) {
        const summary = storageService.getStudentAttendanceSummary(s.id, selectedMonth);
        if (!summary.isAtRisk) return false;
      }

      return true;
    });
  }, [students, selectedClassId, searchQuery, filterRiskOnly, selectedMonth]);

  const overallStats = useMemo(() => {
    let totalPresence = 0;
    let totalClassesCount = 0;
    let totalAbsences = 0;
    let atRiskCount = 0;

    filteredStudents.forEach((st) => {
      const summary = storageService.getStudentAttendanceSummary(st.id, selectedMonth);
      totalPresence += summary.presentCount;
      totalAbsences += summary.absentCount;
      totalClassesCount += summary.totalClasses;
      if (summary.isAtRisk) atRiskCount++;
    });

    const averageRate = totalClassesCount > 0 ? Math.round((totalPresence / totalClassesCount) * 100) : 100;

    return { totalPresence, totalAbsences, totalClassesCount, atRiskCount, averageRate };
  }, [filteredStudents, selectedMonth]);

  const handleDownloadExcel = () => {
    exportMonthlyAttendanceReportToExcel(
      selectedMonth,
      selectedClassId,
      students,
      classes,
      sessions
    );
  };

  return (
    <div className="space-y-5">
      {/* Top Controls & Month Picker */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-blue-700" />
              <h2 className="text-lg font-bold text-slate-900">Relatório Mensal de Assiduidade</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Matriz consolidada de presenças por treino e exportação oficial em Excel (.xlsx)
            </p>
          </div>

          <button
            onClick={handleDownloadExcel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs hover:shadow transition-all active:scale-95 self-start lg:self-auto"
          >
            <Download className="w-4 h-4" />
            <span>Baixar Planilha Excel (.xlsx)</span>
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Mês de Referência
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
              >
                <option value="2026-10">Outubro 2026 (Atual)</option>
                <option value="2026-09">Setembro 2026</option>
                <option value="2026-08">Agosto 2026</option>
                <option value="2026-11">Novembro 2026</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Filtrar por Turma
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
            >
              <option value="all">Todas as Turmas do Vôlei</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} ({cls.shift})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Buscar Aluno
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Nome ou matrícula..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Quick Filter Pill */}
        <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 text-xs">
          <label className="flex items-center gap-2 cursor-pointer text-slate-700">
            <input
              type="checkbox"
              checked={filterRiskOnly}
              onChange={(e) => setFilterRiskOnly(e.target.checked)}
              className="w-4 h-4 rounded text-rose-600 accent-rose-600"
            />
            <span className="font-semibold flex items-center gap-1.5 text-rose-700">
              <AlertTriangle className="w-3.5 h-3.5" />
              Filtrar apenas alunos com assiduidade abaixo da meta (&lt; 75%)
            </span>
          </label>

          <span className="text-slate-500 font-medium">
            {uniqueDates.length} aulas registradas no período
          </span>
        </div>
      </div>

      {/* Summary Stat Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 block uppercase">
            Média de Assiduidade
          </span>
          <span className="text-2xl font-black text-blue-800 tabular-nums">{overallStats.averageRate}%</span>
        </div>

        <div className="bg-white border border-emerald-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-700 block uppercase">
            Presenças no Mês
          </span>
          <span className="text-2xl font-black text-emerald-700 tabular-nums">{overallStats.totalPresence}</span>
        </div>

        <div className="bg-white border border-rose-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-[11px] font-semibold text-rose-700 block uppercase">
            Faltas Não Justificadas
          </span>
          <span className="text-2xl font-black text-rose-700 tabular-nums">{overallStats.totalAbsences}</span>
        </div>

        <div className="bg-white border border-amber-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-[11px] font-semibold text-amber-800 block uppercase">
            Alunos em Risco (&lt;75%)
          </span>
          <span className={`text-2xl font-black tabular-nums ${overallStats.atRiskCount > 0 ? 'text-rose-700' : 'text-blue-700'}`}>
            {overallStats.atRiskCount}
          </span>
        </div>
      </div>

      {/* Attendance Matrix Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
        {/* Table Legend */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-[11px] text-slate-600 flex-wrap gap-2">
          <span className="font-bold uppercase tracking-wider text-slate-500">
            Legenda do Relatório:
          </span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-5 h-5 rounded bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center">
                P
              </span>{' '}
              Presente
            </span>
            <span className="flex items-center gap-1">
              <span className="w-5 h-5 rounded bg-rose-100 text-rose-800 font-bold flex items-center justify-center">
                F
              </span>{' '}
              Falta
            </span>
            <span className="flex items-center gap-1">
              <span className="w-5 h-5 rounded bg-blue-100 text-blue-800 font-bold flex items-center justify-center">
                J
              </span>{' '}
              Justificada
            </span>
            <span className="flex items-center gap-1">
              <span className="w-5 h-5 rounded bg-amber-100 text-amber-800 font-bold flex items-center justify-center">
                A
              </span>{' '}
              Atraso
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 min-w-[180px]">Aluno & Categoria</th>
                <th className="py-3 px-3 min-w-[120px]">Turma</th>
                {uniqueDates.map((date) => {
                  const day = date.split('-')[2];
                  return (
                    <th key={date} className="py-3 px-2 text-center min-w-[36px]" title={date}>
                      {day}
                    </th>
                  );
                })}
                <th className="py-3 px-3 text-center min-w-[55px]">Aulas</th>
                <th className="py-3 px-3 text-center min-w-[55px] text-emerald-700">Pres.</th>
                <th className="py-3 px-3 text-center min-w-[55px] text-rose-700">Faltas</th>
                <th className="py-3 px-4 text-center min-w-[85px]">% Assiduidade</th>
                <th className="py-3 px-4 text-right min-w-[105px]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={uniqueDates.length + 7} className="py-12 text-center text-slate-400">
                    Nenhum aluno encontrado para este filtro de relatório.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const cls = classMap.get(student.classId);
                  const summary = storageService.getStudentAttendanceSummary(student.id, selectedMonth);

                  return (
                    <tr key={student.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{student.fullName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {student.age} anos • {student.category} • {student.registrationNumber}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="text-slate-800 font-medium truncate max-w-[110px]">
                          {cls?.name || '-'}
                        </div>
                        <div className="text-[10px] text-blue-700 font-semibold">{cls?.shift}</div>
                      </td>

                      {uniqueDates.map((date) => {
                        const session = monthSessions.find((s) => s.date === date && (s.classId === student.classId || selectedClassId === 'all'));
                        const entry = session?.entries[student.id];

                        let symbol = '-';
                        let colorClass = 'text-slate-300';

                        if (entry) {
                          if (entry.status === 'presente') {
                            symbol = 'P';
                            colorClass = 'bg-emerald-100 text-emerald-800 font-bold';
                          } else if (entry.status === 'falta') {
                            symbol = 'F';
                            colorClass = 'bg-rose-100 text-rose-800 font-bold';
                          } else if (entry.status === 'justificada') {
                            symbol = 'J';
                            colorClass = 'bg-blue-100 text-blue-800 font-bold';
                          } else if (entry.status === 'atraso') {
                            symbol = 'A';
                            colorClass = 'bg-amber-100 text-amber-800 font-bold';
                          }
                        }

                        return (
                          <td key={date} className="py-2 px-1 text-center">
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 rounded text-[11px] ${colorClass}`}
                              title={`${date}: ${symbol}`}
                            >
                              {symbol}
                            </span>
                          </td>
                        );
                      })}

                      <td className="py-3 px-3 text-center font-semibold text-slate-700 tabular-nums">
                        {summary.totalClasses}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-emerald-700 tabular-nums">
                        {summary.presentCount}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-rose-700 tabular-nums">
                        {summary.absentCount}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-black text-xs tabular-nums ${
                            summary.isAtRisk ? 'text-rose-600' : 'text-blue-700'
                          }`}
                        >
                          {summary.attendanceRate}%
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        {summary.isAtRisk ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertTriangle className="w-3 h-3" />
                            Em Risco
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Regular
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
