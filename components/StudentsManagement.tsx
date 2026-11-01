'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  FileSpreadsheet,
  Plus,
  Phone,
  MessageCircle,
  Eye,
  Edit,
  Trash2,
  LayoutGrid,
  List,
  AlertTriangle,
  User,
  CreditCard,
  Printer,
  ChevronDown,
  Camera,
  QrCode,
} from 'lucide-react';
import { Student, VolleyballClass, EnrollmentStatus } from '@/types/volleyball';
import { storageService } from '@/lib/storage';
import { exportStudentsToExcel } from '@/lib/excelExport';
import { createWhatsAppLink } from '@/lib/volleyballHelpers';
import { getAthletePhoto } from '@/lib/avatarHelpers';
import { QRCodeDisplay } from '@/components/QRCodeDisplay';
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal';

interface StudentsManagementProps {
  students: Student[];
  classes: VolleyballClass[];
  onOpenNewStudent: () => void;
  onViewStudent: (student: Student) => void;
  onEditStudent: (student: Student) => void;
  onDeleteStudent: (id: string) => void;
  onOpenNotifyModal: (student: Student) => void;
  onViewIdCard: (student: Student) => void;
  onBatchPrintIdCards?: () => void;
  onQuickUpdateStatus?: (studentId: string, status: EnrollmentStatus) => void;
  onOpenQrScanner?: (studentRegistration?: string) => void;
}

export function StudentsManagement({
  students,
  classes,
  onOpenNewStudent,
  onViewStudent,
  onEditStudent,
  onDeleteStudent,
  onOpenNotifyModal,
  onViewIdCard,
  onBatchPrintIdCards,
  onQuickUpdateStatus,
  onOpenQrScanner,
}: StudentsManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [selectedShiftFilter, setSelectedShiftFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<'all' | 'risk' | 'regular'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [studentPendingDelete, setStudentPendingDelete] = useState<Student | null>(null);

  const classMap = useMemo(() => {
    const map = new Map<string, VolleyballClass>();
    classes.forEach((c) => map.set(c.id, c));
    return map;
  }, [classes]);

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (!s) return false;

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const name = (s.fullName || '').toLowerCase();
        const reg = (s.registrationNumber || '').toLowerCase();
        const guardianName = (s.guardian?.name || '').toLowerCase();
        const guardianPhone = s.guardian?.phone || '';
        const matchesName = name.includes(query);
        const matchesReg = reg.includes(query);
        const matchesGuardian = guardianName.includes(query);
        const matchesPhone = guardianPhone.includes(query);
        if (!matchesName && !matchesReg && !matchesGuardian && !matchesPhone) {
          return false;
        }
      }

      if (selectedClassFilter !== 'all' && s.classId !== selectedClassFilter) {
        return false;
      }

      if (selectedShiftFilter !== 'all') {
        const cls = classMap.get(s.classId);
        if (!cls || cls.shift !== selectedShiftFilter) return false;
      }

      if (selectedCategoryFilter !== 'all' && s.category !== selectedCategoryFilter) {
        return false;
      }

      if (selectedRiskFilter !== 'all') {
        const summary = storageService.getStudentAttendanceSummary(s.id, '2026-10');
        if (selectedRiskFilter === 'risk' && !summary.isAtRisk) return false;
        if (selectedRiskFilter === 'regular' && summary.isAtRisk) return false;
      }

      return true;
    });
  }, [students, searchTerm, selectedClassFilter, selectedShiftFilter, selectedCategoryFilter, selectedRiskFilter, classMap]);

  const handleExportExcel = () => {
    exportStudentsToExcel(filteredStudents, classes);
  };

  const handleWhatsApp = (student: Student) => {
    const guardianName = student.guardian?.name || 'Responsável';
    const guardianPhone = student.guardian?.phone || '';
    const text = `Olá ${guardianName}, tudo bem? Aqui é da coordenação da Academia VoleiAraça sobre as aulas de vôlei do(a) ${student.fullName || ''}.`;
    const url = createWhatsAppLink(guardianPhone, text);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleStatusChange = (student: Student, newStatus: EnrollmentStatus) => {
    if (onQuickUpdateStatus) {
      onQuickUpdateStatus(student.id, newStatus);
    } else {
      const updated: Student = { ...student, status: newStatus };
      storageService.updateStudent(updated);
    }
  };

  return (
    <div className="space-y-5">
      {/* Central de Chamada Automática e Carteirinhas com QR Code - Destaque Principal */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 rounded-3xl p-5 sm:p-6 text-white shadow-lg border-2 border-blue-500 relative overflow-hidden">
        {/* Court line watermark */}
        <div className="absolute -right-8 -bottom-8 w-48 h-48 border-4 border-white/10 rounded-full pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5 max-w-3xl flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/80 border border-blue-400 text-xs font-bold text-blue-100">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Controle de Presença & Chamada Automática</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight">
              Leitor de QR Code & Carteirinhas Oficiais
            </h2>
            <p className="text-xs sm:text-sm text-blue-100 font-medium">
              Aproxime a carteirinha do atleta para validar a frequência instantaneamente. O leitor marca presença automática e identifica turma, turno e responsável.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {onOpenQrScanner && (
              <button
                onClick={() => onOpenQrScanner()}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white hover:bg-blue-50 text-blue-900 font-extrabold text-sm shadow-md transition-all active:scale-95 hover:shadow-lg cursor-pointer"
                title="Abrir o leitor de QR Code para chamada em tempo real"
              >
                <Camera className="w-5 h-5 text-blue-700 stroke-[2.5]" />
                <span>📷 Abrir Leitor de QR Code</span>
              </button>
            )}

            <button
              onClick={onBatchPrintIdCards || (() => onViewIdCard(students[0]))}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-blue-600/90 hover:bg-blue-600 text-white font-bold text-xs border border-blue-400/80 transition-all active:scale-95 cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              <span>Ver Carteirinhas com QR ({students.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar with crisp Demarcation Lines */}
      <div className="bg-white border-2 border-blue-600/20 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between mb-4">
          {/* Search box */}
          <div className="relative flex-1 min-w-[280px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar aluno por nome, matrícula, responsável ou WhatsApp..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
            />
          </div>

          {/* Action buttons with 100% operational handlers */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Direct QR Scanner in action bar */}
            {onOpenQrScanner && (
              <button
                onClick={() => onOpenQrScanner()}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white border border-blue-800 text-xs font-bold transition-all active:scale-95 shadow-xs"
                title="Abrir câmera para escanear QR Code"
              >
                <Camera className="w-4 h-4 text-white" />
                <span>Leitor QR Code</span>
              </button>
            )}

            {/* Batch ID Cards Button */}
            <button
              onClick={onBatchPrintIdCards || (() => onViewIdCard(filteredStudents[0] || students[0]))}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-blue-50 text-blue-800 border-2 border-blue-200 hover:bg-blue-100 hover:border-blue-300 text-xs font-bold transition-all active:scale-95 shadow-xs"
              title="Gerar e imprimir carteirinhas dos alunos com foto e matrícula"
            >
              <CreditCard className="w-4 h-4 text-blue-700" />
              <QrCode className="w-3.5 h-3.5 text-blue-700" />
              <span>Carteirinhas & QR</span>
            </button>

            {/* Export Excel Button */}
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-50 text-emerald-800 border-2 border-emerald-200 hover:bg-emerald-100 text-xs font-bold transition-all"
              title="Exportar alunos para planilha Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>Exportar Excel ({filteredStudents.length})</span>
            </button>

            {/* New Student Button */}
            <button
              onClick={onOpenNewStudent}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs hover:shadow transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Nova Matrícula (07 a 17)</span>
            </button>

            {/* View switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-300">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'table' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Visualização em Tabela"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'cards' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Visualização em Cards"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Demarcation line */}
        <div className="border-t-2 border-blue-100 pt-3">
          {/* Dropdown Filters row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Turma de Vôlei</label>
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-blue-600 font-medium"
              >
                <option value="all">Todas as Turmas ({students.length})</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.shift})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Turno</label>
              <select
                value={selectedShiftFilter}
                onChange={(e) => setSelectedShiftFilter(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-blue-600 font-medium"
              >
                <option value="all">Todos os Turnos</option>
                <option value="Manhã">Manhã</option>
                <option value="Tarde">Tarde</option>
                <option value="Noite">Noite</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Categoria (Idades 07-17)</label>
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-blue-600 font-medium"
              >
                <option value="all">Todas as Categorias</option>
                <option value="Sub-9">Sub-9 (7 a 9 anos)</option>
                <option value="Sub-11">Sub-11 (10 e 11 anos)</option>
                <option value="Sub-13">Sub-13 (12 e 13 anos)</option>
                <option value="Sub-15">Sub-15 (14 e 15 anos)</option>
                <option value="Sub-17">Sub-17 (16 e 17 anos)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Assiduidade</label>
              <select
                value={selectedRiskFilter}
                onChange={(e) => setSelectedRiskFilter(e.target.value as any)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-blue-600 font-medium"
              >
                <option value="all">Todos os Status</option>
                <option value="risk">⚠️ Alerta de Risco (&lt;75% presença)</option>
                <option value="regular">✓ Frequência Regular (&ge;75%)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Results Header with Demarcation Divider */}
      <div className="flex items-center justify-between text-xs text-slate-600 px-1 border-b border-blue-200 pb-2">
        <span>
          Mostrando <strong className="text-blue-900 font-bold">{filteredStudents.length}</strong> de{' '}
          <strong className="text-slate-900">{students.length}</strong> atletas cadastrados (07 a 17 anos)
        </span>
        {filteredStudents.length < students.length && (
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedClassFilter('all');
              setSelectedShiftFilter('all');
              setSelectedCategoryFilter('all');
              setSelectedRiskFilter('all');
            }}
            className="text-blue-700 hover:underline font-bold"
          >
            Limpar Filtros
          </button>
        )}
      </div>

      {/* Render Table or Cards */}
      {viewMode === 'table' ? (
        <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs min-w-[840px]">
              <thead className="bg-blue-50 text-[11px] uppercase font-bold text-blue-900 tracking-wider border-b-2 border-blue-200">
                <tr>
                  <th className="py-3 px-4">Aluno & Matrícula</th>
                  <th className="py-3 px-4">Idade & Categoria</th>
                  <th className="py-3 px-4">Turma & Turno</th>
                  <th className="py-3 px-4">Posição & Nível</th>
                  <th className="py-3 px-4 text-center">Status Matrícula</th>
                  <th className="py-3 px-4 text-center">Assiduidade</th>
                  <th className="py-3 px-4">Responsável</th>
                  <th className="py-3 px-4 text-right min-w-[190px]">Carteirinha & QR Code</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Nenhum aluno encontrado para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => {
                    const cls = classMap.get(student.classId);
                    const summary = storageService.getStudentAttendanceSummary(student.id, '2026-10');
                    const photo = student.photoUrl || getAthletePhoto(student.fullName, student.gender, student.jerseyNumber);

                    return (
                      <tr
                        key={student.id}
                        className="hover:bg-blue-50/50 transition-colors group cursor-pointer border-b border-slate-100"
                        onClick={() => onViewStudent(student)}
                      >
                        {/* Student Name & Photo with Demarcated Badge */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-10 rounded-lg border-2 border-blue-600 bg-white overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={photo}
                                alt={student.fullName}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors flex items-center gap-1.5">
                                <span>{student.fullName}</span>
                                {student.jerseyNumber && (
                                  <span className="text-[10px] px-1 py-0.2 rounded bg-blue-100 text-blue-800 font-bold font-mono">
                                    #{student.jerseyNumber}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-blue-800 font-mono font-bold">
                                {student.registrationNumber}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Age & Category */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900">{student.age} anos</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                              {student.category}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 block">
                            Nasc: {student.birthDate ? student.birthDate.split('-').reverse().join('/') : '-'}
                          </span>
                        </td>

                        {/* Class & Shift */}
                        <td className="py-3 px-4">
                          {cls ? (
                            <div>
                              <div className="font-semibold text-slate-900 truncate max-w-[170px]">
                                {cls.name}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                <span className="text-blue-800 font-bold">{cls.shift}</span> • {cls.startTime} às {cls.endTime}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400">Sem turma</span>
                          )}
                        </td>

                        {/* Position & Level */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{student.preferredPosition}</div>
                          <div className="text-[11px] text-slate-500">{student.level}</div>
                        </td>

                        {/* Quick Editable Status */}
                        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={student.status}
                            onChange={(e) => handleStatusChange(student, e.target.value as any)}
                            className="text-[11px] font-bold rounded-lg px-2 py-1 border border-blue-200 bg-white text-blue-900 focus:outline-none focus:border-blue-600 shadow-xs cursor-pointer"
                          >
                            <option value="Ativo">Ativo</option>
                            <option value="Em Espera">Em Espera</option>
                            <option value="Pendente">Pendente</option>
                            <option value="Trancado">Trancado</option>
                          </select>
                        </td>

                        {/* Attendance Rate */}
                        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex flex-col items-center">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span
                                className={`font-black text-xs tabular-nums ${
                                  summary.isAtRisk ? 'text-rose-600' : 'text-blue-800'
                                }`}
                              >
                                {summary.attendanceRate}%
                              </span>
                              {summary.isAtRisk && (
                                <span
                                  className="p-0.5 rounded bg-rose-100 text-rose-700"
                                  title="Abaixo de 75% ou faltas repetidas"
                                >
                                  <AlertTriangle className="w-3 h-3" />
                                </span>
                              )}
                            </div>
                            <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  summary.isAtRisk ? 'bg-rose-500' : 'bg-blue-600'
                                }`}
                                style={{ width: `${summary.attendanceRate}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Guardian & WhatsApp */}
                        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-between gap-1">
                            <div>
                              <div className="font-semibold text-slate-900 truncate max-w-[130px]">
                                {student.guardian?.name || 'Responsável'}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                {student.guardian?.phone || 'Sem contato'}
                              </div>
                            </div>
                            <button
                              onClick={() => handleWhatsApp(student)}
                              title="Conversar no WhatsApp"
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-300 transition-colors"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* Actions with Carteirinha & QR Button */}
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Carteirinha do Aluno Button com QR Code */}
                            <button
                              onClick={() => onViewIdCard(student)}
                              title="Ver / Imprimir Carteirinha do Aluno com Foto e QR Code"
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-900 hover:bg-blue-600 hover:text-white border-2 border-blue-300 text-xs font-bold transition-all shadow-xs cursor-pointer"
                            >
                              <QrCode className="w-3.5 h-3.5 text-blue-700" />
                              <span>Carteirinha & QR</span>
                            </button>

                            {/* Quick Scan / Check-in via QR Button */}
                            {onOpenQrScanner && (
                              <button
                                onClick={() => onOpenQrScanner(student.registrationNumber)}
                                title="Abrir Leitor de QR Code para este atleta"
                                className="p-1.5 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white border border-emerald-300 transition-colors"
                              >
                                <Camera className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* View Student Card */}
                            <button
                              onClick={() => onViewStudent(student)}
                              title="Ficha Completa do Aluno"
                              className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Edit Student Button */}
                            <button
                              onClick={() => onEditStudent(student)}
                              title="Editar Matrícula"
                              className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            {/* Delete Student Button with Reliable Custom Modal */}
                            <button
                              onClick={() => setStudentPendingDelete(student)}
                              title="Excluir Matrícula de Aluno"
                              className="p-1.5 rounded-lg text-rose-500 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Cards View with Demarcation Lines */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {filteredStudents.map((student) => {
            const cls = classMap.get(student.classId);
            const summary = storageService.getStudentAttendanceSummary(student.id, '2026-10');
            const photo = student.photoUrl || getAthletePhoto(student.fullName, student.gender, student.jerseyNumber);

            return (
              <div
                key={student.id}
                onClick={() => onViewStudent(student)}
                className="bg-white border-2 border-slate-200 hover:border-blue-500 rounded-2xl p-5 shadow-xs hover:shadow transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-3 border-b-2 border-blue-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-14 rounded-xl border-2 border-blue-600 overflow-hidden bg-white shrink-0 shadow-xs">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo}
                          alt={student.fullName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 group-hover:text-blue-700 transition-colors text-sm">
                          {student.fullName}
                        </h4>
                        <span className="text-xs text-blue-800 font-mono font-bold block">{student.registrationNumber}</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-900 border border-blue-200">
                      {student.category}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 py-2 border-b border-slate-200 my-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Idade:</span>
                      <span className="font-bold text-slate-900">{student.age} anos (07 a 17)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Posição:</span>
                      <span className="font-bold text-blue-900">{student.preferredPosition}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Turma:</span>
                      <span className="font-semibold text-slate-800 truncate max-w-[170px]">
                        {cls?.name || 'Sem turma'} ({cls?.shift})
                      </span>
                    </div>
                  </div>

                  {/* Attendance Bar */}
                  <div className="bg-blue-50/60 rounded-xl p-2.5 mb-3 border border-blue-200">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-600 font-medium">Assiduidade Mensal</span>
                      <span className={`font-bold tabular-nums ${summary.isAtRisk ? 'text-rose-600' : 'text-blue-800'}`}>
                        {summary.attendanceRate}% {summary.isAtRisk && '(Abaixo 75%)'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${summary.isAtRisk ? 'bg-rose-500' : 'bg-blue-600'}`}
                        style={{ width: `${summary.attendanceRate}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Mini QR Code preview strip */}
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewIdCard(student);
                  }}
                  className="flex items-center justify-between bg-blue-50/80 hover:bg-blue-100/80 p-2 rounded-xl border border-blue-200 mb-2 cursor-pointer transition-colors"
                  title="Clique para ver a carteirinha completa deste aluno"
                >
                  <div className="flex items-center gap-2">
                    <QRCodeDisplay
                      value={`VOLEIARAÇA:${student.id}:${student.registrationNumber}`}
                      size={38}
                    />
                    <div>
                      <div className="flex items-center gap-1 text-[10px] font-black text-blue-900">
                        <QrCode className="w-3 h-3 text-blue-700" />
                        <span>QR Presença Ativo</span>
                      </div>
                      <span className="text-[9px] text-blue-700 font-mono font-bold block">
                        {student.registrationNumber}
                      </span>
                    </div>
                  </div>
                  {onOpenQrScanner && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenQrScanner(student.registrationNumber);
                      }}
                      className="text-[10px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-2 py-1 rounded-md border border-emerald-300"
                    >
                      Escanear
                    </button>
                  )}
                </div>

                {/* Card Footer with Carteirinha & Action Buttons */}
                <div
                  className="flex items-center justify-between pt-2.5 border-t-2 border-slate-100 text-xs gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => onViewIdCard(student)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Carteirinha & QR</span>
                  </button>

                  <div className="flex items-center gap-1.5 ml-auto">
                    <button
                      onClick={() => handleWhatsApp(student)}
                      className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-300 transition-colors"
                      title="WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEditStudent(student)}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 transition-colors"
                      title="Editar Matrícula"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setStudentPendingDelete(student)}
                      className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 transition-colors cursor-pointer"
                      title="Excluir Matrícula deste Aluno"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm Delete Student Modal - Reliable Custom Dialog without window.confirm */}
      <ConfirmDeleteModal
        isOpen={!!studentPendingDelete}
        student={studentPendingDelete}
        classes={classes}
        onClose={() => setStudentPendingDelete(null)}
        onConfirm={() => {
          if (studentPendingDelete) {
            onDeleteStudent(studentPendingDelete.id);
            setStudentPendingDelete(null);
          }
        }}
      />
    </div>
  );
}
