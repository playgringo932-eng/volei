'use client';

import * as XLSX from 'xlsx';
import { Student, VolleyballClass, DailyAttendanceSession, AttendanceSummary } from '@/types/volleyball';
import { storageService } from './storage';

/**
 * Downloads a generated XLSX workbook in the browser
 */
function downloadWorkbook(workbook: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(workbook, filename, { bookType: 'xlsx' });
}

/**
 * 1. Export Students Roster to Excel
 */
export function exportStudentsToExcel(students: Student[], classes: VolleyballClass[]) {
  const classMap = new Map<string, VolleyballClass>();
  classes.forEach((c) => classMap.set(c.id, c));

  const rows = students.map((s, idx) => {
    const cls = classMap.get(s.classId);
    return {
      '#': idx + 1,
      'Nº Matrícula': s.registrationNumber,
      'Nome do Aluno': s.fullName,
      'Idade': s.age,
      'Data Nasc.': s.birthDate,
      'Categoria': s.category,
      'Gênero': s.gender,
      'Posição Preferida': s.preferredPosition,
      'Nível': s.level,
      'Turma': cls ? cls.name : 'Sem Turma',
      'Turno': cls ? cls.shift : '-',
      'Horário': cls ? `${cls.startTime} às ${cls.endTime}` : '-',
      'Dias': cls ? cls.daysOfWeek.join(', ') : '-',
      'Instrutor': cls ? cls.instructorName : '-',
      'Status': s.status,
      'Data Matrícula': s.enrollmentDate,
      'Nome do Responsável': s.guardian.name,
      'Parentesco': s.guardian.relationship,
      'WhatsApp Responsável': s.guardian.phone,
      'E-mail Responsável': s.guardian.email || '-',
      'Tel. Emergência': s.guardian.emergencyPhone || '-',
      'Observações Médicas': s.allergies || s.medicalConditions || 'Nenhuma informada',
      'Notas Pedagógicas': s.notes || '-',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Alunos Cadastrados');

  const today = new Date().toISOString().split('T')[0];
  downloadWorkbook(workbook, `VoleiPro_Alunos_Matriculados_${today}.xlsx`);
}

/**
 * 2. Export Monthly Attendance Matrix Report to Excel
 */
export function exportMonthlyAttendanceReportToExcel(
  monthYear: string, // "2026-10"
  selectedClassId: string | 'all',
  students: Student[],
  classes: VolleyballClass[],
  sessions: DailyAttendanceSession[]
) {
  const classMap = new Map<string, VolleyballClass>();
  classes.forEach((c) => classMap.set(c.id, c));

  // Filter students
  const filteredStudents = selectedClassId === 'all'
    ? students
    : students.filter((s) => s.classId === selectedClassId);

  // Filter sessions in this month
  const monthSessions = sessions
    .filter((s) => s.date.startsWith(monthYear) && (selectedClassId === 'all' || s.classId === selectedClassId))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Unique session dates
  const uniqueDates = Array.from(new Set(monthSessions.map((s) => s.date))).sort();

  const rows = filteredStudents.map((s) => {
    const summary: AttendanceSummary = storageService.getStudentAttendanceSummary(s.id, monthYear);
    const cls = classMap.get(s.classId);

    const row: Record<string, string | number> = {
      'Matrícula': s.registrationNumber,
      'Nome do Aluno': s.fullName,
      'Idade': s.age,
      'Categoria': s.category,
      'Turma': cls ? cls.name : '-',
      'Turno': cls ? cls.shift : '-',
    };

    // Columns for each day
    uniqueDates.forEach((date) => {
      // Find session entry for this date and student's class
      const session = monthSessions.find((sess) => sess.date === date && (sess.classId === s.classId || selectedClassId === 'all'));
      const entry = session?.entries[s.id];
      const dayFormatted = date.split('-').slice(1).join('/'); // "10/14"
      
      let symbol = '-';
      if (entry) {
        if (entry.status === 'presente') symbol = 'P';
        else if (entry.status === 'falta') symbol = 'F';
        else if (entry.status === 'justificada') symbol = 'J';
        else if (entry.status === 'atraso') symbol = 'A';
      }
      row[dayFormatted] = symbol;
    });

    row['Total Aulas'] = summary.totalClasses;
    row['Presenças'] = summary.presentCount;
    row['Faltas'] = summary.absentCount;
    row['Justificadas'] = summary.justifiedCount;
    row['Atrasos'] = summary.lateCount;
    row['% Assiduidade'] = `${summary.attendanceRate}%`;
    row['Status Risco'] = summary.isAtRisk ? 'EM RISCO (<75%)' : 'REGULAR';
    row['Responsável'] = s.guardian.name;
    row['WhatsApp'] = s.guardian.phone;

    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Assiduidade ${monthYear}`);

  // Add a Legend sheet
  const legendRows = [
    { 'Sigla': 'P', 'Significado': 'Presente' },
    { 'Sigla': 'F', 'Significado': 'Falta não justificada' },
    { 'Sigla': 'J', 'Significado': 'Falta Justificada (Atestado)' },
    { 'Sigla': 'A', 'Significado': 'Atraso tolerado' },
    { 'Sigla': '-', 'Significado': 'Sem aula para esta turma' },
    { 'Sigla': 'Nota', 'Significado': 'Idades permitidas no projeto: 07 a 17 anos' },
  ];
  const legendSheet = XLSX.utils.json_to_sheet(legendRows);
  XLSX.utils.book_append_sheet(workbook, legendSheet, 'Legenda e Critérios');

  downloadWorkbook(workbook, `VoleiPro_Relatorio_Assiduidade_${monthYear}.xlsx`);
}

/**
 * 3. Export Single Session Attendance Sheet
 */
export function exportSessionToExcel(session: DailyAttendanceSession, students: Student[], cls: VolleyballClass) {
  const classStudents = students.filter((s) => s.classId === cls.id);

  const rows = classStudents.map((s, idx) => {
    const entry = session.entries[s.id];
    let statusLabel = 'Não Marcado';
    if (entry) {
      if (entry.status === 'presente') statusLabel = 'Presente';
      else if (entry.status === 'falta') statusLabel = 'Falta';
      else if (entry.status === 'justificada') statusLabel = 'Justificada';
      else if (entry.status === 'atraso') statusLabel = 'Atraso';
    }

    return {
      '#': idx + 1,
      'Matrícula': s.registrationNumber,
      'Aluno': s.fullName,
      'Idade': s.age,
      'Posição': s.preferredPosition,
      'Status Presença': statusLabel,
      'Observação / Feedback': entry?.note || '-',
      'Responsável': s.guardian.name,
      'WhatsApp Contato': s.guardian.phone,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Chamada ${session.date}`);

  downloadWorkbook(workbook, `Chamada_${cls.name.replace(/\s+/g, '_')}_${session.date}.xlsx`);
}
