'use client';

import {
  Student,
  VolleyballClass,
  DailyAttendanceSession,
  NotificationLog,
  AttendanceSummary,
  AttendanceStatus,
  SponsorLogo,
} from '@/types/volleyball';
import {
  INITIAL_CLASSES,
  INITIAL_STUDENTS,
  generateInitialAttendanceSessions,
  INITIAL_NOTIFICATIONS,
} from './mockData';
import { DEFAULT_SPONSORS } from './sponsorPresets';

const STORAGE_KEYS = {
  STUDENTS: 'voleipro_students_v1',
  CLASSES: 'voleipro_classes_v1',
  ATTENDANCE: 'voleipro_attendance_v1',
  NOTIFICATIONS: 'voleipro_notifications_v1',
  SPONSORS: 'voleiaraca_sponsors_v1',
  SPONSOR_SIZE: 'voleiaraca_sponsor_size_v1',
};

const SYNC_EVENT = 'voleipro_data_updated';

// Helper to check browser environment
const isClient = typeof window !== 'undefined';

function syncToServer(data: Record<string, unknown>): void {
  if (!isClient) return;
  try {
    fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    }).catch(() => {});
  } catch {
    // ignore
  }
}

export const storageService = {
  // --- STUDENTS ---
  getStudents(): Student[] {
    if (!isClient) return INITIAL_STUDENTS;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(INITIAL_STUDENTS));
        return INITIAL_STUDENTS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_STUDENTS;
    }
  },

  saveStudents(students: Student[], sync = true): void {
    if (!isClient) return;
    try {
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    } catch (err) {
      console.warn('Erro ao salvar alunos:', err);
    }
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { type: 'students' } }));
    if (sync) syncToServer({ students });
  },

  addStudent(student: Student): void {
    const list = this.getStudents();
    list.unshift(student);
    this.saveStudents(list);
  },

  updateStudent(student: Student): void {
    const list = this.getStudents();
    const index = list.findIndex((s) => s.id === student.id);
    if (index !== -1) {
      list[index] = student;
      this.saveStudents(list);
    }
  },

  deleteStudent(id: string): void {
    const list = this.getStudents().filter((s) => s.id !== id);
    this.saveStudents(list);

    // Also clean up any attendance session entries for this student
    const sessions = this.getAttendanceSessions();
    let modifiedSessions = false;
    sessions.forEach((sess) => {
      if (sess.entries && sess.entries[id]) {
        delete sess.entries[id];
        modifiedSessions = true;
      }
    });
    if (modifiedSessions) {
      this.saveAttendanceSessions(sessions);
    }
  },

  // --- CLASSES (TURMAS) ---
  getClasses(): VolleyballClass[] {
    if (!isClient) return INITIAL_CLASSES;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CLASSES);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(INITIAL_CLASSES));
        return INITIAL_CLASSES;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_CLASSES;
    }
  },

  saveClasses(classes: VolleyballClass[], sync = true): void {
    if (!isClient) return;
    try {
      localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes));
    } catch (err) {
      console.warn('Erro ao salvar turmas:', err);
    }
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { type: 'classes' } }));
    if (sync) syncToServer({ classes });
  },

  addClass(cls: VolleyballClass): void {
    const list = this.getClasses();
    list.push(cls);
    this.saveClasses(list);
  },

  updateClass(cls: VolleyballClass): void {
    const list = this.getClasses();
    const index = list.findIndex((c) => c.id === cls.id);
    if (index !== -1) {
      list[index] = cls;
      this.saveClasses(list);
    }
  },

  deleteClass(id: string): void {
    const list = this.getClasses().filter((c) => c.id !== id);
    this.saveClasses(list);
  },

  // --- ATTENDANCE SESSIONS ---
  getAttendanceSessions(): DailyAttendanceSession[] {
    if (!isClient) return generateInitialAttendanceSessions();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
      if (!data) {
        const initial = generateInitialAttendanceSessions();
        localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(initial));
        return initial;
      }
      return JSON.parse(data);
    } catch {
      return generateInitialAttendanceSessions();
    }
  },

  saveAttendanceSessions(sessions: DailyAttendanceSession[], sync = true): void {
    if (!isClient) return;
    try {
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(sessions));
    } catch (err) {
      console.warn('Erro ao salvar chamadas:', err);
    }
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { type: 'attendance' } }));
    if (sync) syncToServer({ sessions });
  },

  getSession(classId: string, date: string): DailyAttendanceSession | undefined {
    const sessions = this.getAttendanceSessions();
    return sessions.find((s) => s.classId === classId && s.date === date);
  },

  recordAttendance(session: DailyAttendanceSession): void {
    const sessions = this.getAttendanceSessions();
    const index = sessions.findIndex((s) => s.id === session.id || (s.classId === session.classId && s.date === session.date));
    if (index !== -1) {
      sessions[index] = session;
    } else {
      sessions.push(session);
    }
    this.saveAttendanceSessions(sessions);
  },

  checkInStudentByQrCode(rawCode: string, targetDate?: string, targetClassId?: string): {
    success: boolean;
    student?: Student;
    classObj?: VolleyballClass;
    alreadyPresent?: boolean;
    message: string;
    timestamp: string;
  } {
    const now = new Date();
    const timestamp = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = targetDate || '2026-10-29';

    // Extract student identifier
    let studentIdCandidate = '';
    let regCandidate = '';
    let nameCandidate = '';
    const trimmed = (rawCode || '').trim();

    if (!trimmed) {
      return {
        success: false,
        message: 'Código vazio ou não fornecido.',
        timestamp,
      };
    }

    if (trimmed.startsWith('{') || trimmed.includes('"matricula"') || trimmed.includes('"id"')) {
      try {
        const cleanJson = trimmed.replace(/'/g, '"');
        const parsed = JSON.parse(cleanJson);
        studentIdCandidate = parsed.studentId || parsed.id || '';
        regCandidate = parsed.reg || parsed.registrationNumber || parsed.matricula || '';
        nameCandidate = parsed.nome || parsed.name || parsed.fullName || '';
      } catch {
        // Fallback regex extraction if malformed JSON
        const regMatch = trimmed.match(/"(?:matricula|reg|registrationNumber)"\s*:\s*"([^"]+)"/i);
        const idMatch = trimmed.match(/"(?:id|studentId)"\s*:\s*"([^"]+)"/i);
        const nameMatch = trimmed.match(/"(?:nome|name|fullName)"\s*:\s*"([^"]+)"/i);
        if (regMatch) regCandidate = regMatch[1];
        if (idMatch) studentIdCandidate = idMatch[1];
        if (nameMatch) nameCandidate = nameMatch[1];
      }
    } else if (trimmed.includes(':')) {
      const parts = trimmed.split(':');
      if (parts.length >= 3) {
        studentIdCandidate = parts[1];
        regCandidate = parts[2];
      } else {
        studentIdCandidate = parts[0];
        regCandidate = parts[1];
      }
    } else {
      studentIdCandidate = trimmed;
      regCandidate = trimmed;
    }

    const students = this.getStudents();
    const normalizedQuery = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '');

    const student = students.find((s) => {
      const sId = (s.id || '').toLowerCase();
      const sReg = (s.registrationNumber || '').toLowerCase();
      const sRegNorm = sReg.replace(/[^a-z0-9]/g, '');
      const sName = (s.fullName || '').toLowerCase();

      if (studentIdCandidate && sId === studentIdCandidate.toLowerCase()) return true;
      if (regCandidate && sReg === regCandidate.toLowerCase()) return true;
      if (regCandidate && sRegNorm === regCandidate.toLowerCase().replace(/[^a-z0-9]/g, '')) return true;
      if (nameCandidate && sName === nameCandidate.toLowerCase()) return true;

      // Direct checks
      if (sId === trimmed.toLowerCase()) return true;
      if (sReg === trimmed.toLowerCase()) return true;
      if (sRegNorm === normalizedQuery) return true;
      if (sName === trimmed.toLowerCase()) return true;

      // Match by number suffix (e.g. "0001" matches "VP-2026-0001")
      if (trimmed.length >= 3 && sReg.endsWith(trimmed.toLowerCase())) return true;

      return false;
    });

    if (!student) {
      return {
        success: false,
        message: `Carteirinha não localizada no sistema (${trimmed}). Verifique o código.`,
        timestamp,
      };
    }

    const classes = this.getClasses();
    // Resolve target class: specified class, student's assigned class, or first available class
    const classObj =
      (targetClassId && classes.find((c) => c.id === targetClassId)) ||
      classes.find((c) => c.id === student.classId) ||
      classes[0] || {
        id: 'class-general',
        name: 'Turma Geral de Vôlei',
        category: student.category,
        shift: 'Manhã',
        startTime: '08:00',
        endTime: '09:30',
        daysOfWeek: ['Segunda', 'Quarta', 'Sexta'],
        instructorName: 'Coordenação VoleiAraça',
        court: 'Quadra Central',
        maxCapacity: 30,
        enrolledCount: 1,
      };

    // Find or create attendance session for this class and date
    const sessions = this.getAttendanceSessions();
    const sessionId = `${classObj.id}_${dateStr}`;
    let session = sessions.find((s) => s.id === sessionId || (s.classId === classObj.id && s.date === dateStr));

    const alreadyPresent = session?.entries?.[student.id]?.status === 'presente';

    if (!session) {
      session = {
        id: sessionId,
        classId: classObj.id,
        date: dateStr,
        instructorName: classObj.instructorName,
        entries: {},
        savedAt: now.toISOString(),
        shift: classObj.shift,
      };
      sessions.push(session);
    }

    if (!session.entries) {
      session.entries = {};
    }

    // Mark presence
    session.entries[student.id] = {
      status: 'presente',
      note: 'Presença confirmada via Leitor QR Code',
      updatedAt: now.toISOString(),
    };
    session.savedAt = now.toISOString();

    this.saveAttendanceSessions(sessions);

    return {
      success: true,
      student,
      classObj,
      alreadyPresent,
      message: alreadyPresent
        ? `Presença já confirmada anteriormente para ${student.fullName}.`
        : `Presença registrada com sucesso para ${student.fullName}!`,
      timestamp,
    };
  },

  // --- NOTIFICATIONS ---
  getNotifications(): NotificationLog[] {
    if (!isClient) return INITIAL_NOTIFICATIONS;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(INITIAL_NOTIFICATIONS));
        return INITIAL_NOTIFICATIONS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  },

  saveNotifications(logs: NotificationLog[], sync = true): void {
    if (!isClient) return;
    try {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(logs));
    } catch (err) {
      console.warn('Erro ao salvar notificações:', err);
    }
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { type: 'notifications' } }));
    if (sync) syncToServer({ notifications: logs });
  },

  addNotification(log: NotificationLog): void {
    const list = this.getNotifications();
    list.unshift(log);
    this.saveNotifications(list);
  },

  // --- SPONSORS (PATROCINADORES DA CARTEIRINHA) ---
  getSponsors(): SponsorLogo[] {
    if (!isClient) return DEFAULT_SPONSORS;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SPONSORS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.SPONSORS, JSON.stringify(DEFAULT_SPONSORS));
        return DEFAULT_SPONSORS;
      }
      return JSON.parse(data);
    } catch {
      return DEFAULT_SPONSORS;
    }
  },

  saveSponsors(sponsors: SponsorLogo[], sync = true): void {
    if (!isClient) return;
    try {
      localStorage.setItem(STORAGE_KEYS.SPONSORS, JSON.stringify(sponsors));
    } catch (err) {
      console.warn('Erro ao salvar patrocinadores no localStorage:', err);
    }
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { type: 'sponsors' } }));
    if (sync) syncToServer({ sponsors });
  },

  addSponsor(sponsor: SponsorLogo): void {
    const list = this.getSponsors();
    list.push(sponsor);
    this.saveSponsors(list);
  },

  updateSponsor(sponsor: SponsorLogo): void {
    const list = this.getSponsors();
    const idx = list.findIndex((s) => s.id === sponsor.id);
    if (idx !== -1) {
      list[idx] = sponsor;
      this.saveSponsors(list);
    }
  },

  toggleSponsor(id: string): void {
    const list = this.getSponsors();
    const target = list.find((s) => s.id === id);
    if (target) {
      target.isActive = !target.isActive;
      this.saveSponsors(list);
    }
  },

  deleteSponsor(id: string): void {
    const list = this.getSponsors().filter((s) => s.id !== id);
    this.saveSponsors(list);
  },

  getSponsorSize(): number {
    if (!isClient) return 28;
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SPONSOR_SIZE);
      if (saved) {
        const num = parseInt(saved, 10);
        if (!isNaN(num) && num >= 14 && num <= 70) return num;
      }
      return 28;
    } catch {
      return 28;
    }
  },

  saveSponsorSize(size: number, sync = true): void {
    if (!isClient) return;
    const clamped = Math.max(14, Math.min(70, Math.round(size)));
    try {
      localStorage.setItem(STORAGE_KEYS.SPONSOR_SIZE, clamped.toString());
    } catch {
      // ignore
    }
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { type: 'sponsor_size', size: clamped } }));
    if (sync) syncToServer({ sponsorSize: clamped });
  },

  // --- ANALYTICS / CALCULATIONS ---
  getStudentAttendanceSummary(studentId: string, monthYear?: string): AttendanceSummary {
    const sessions = this.getAttendanceSessions();
    const filteredSessions = monthYear
      ? sessions.filter((s) => s.date.startsWith(monthYear))
      : sessions;

    let totalClasses = 0;
    let presentCount = 0;
    let absentCount = 0;
    let justifiedCount = 0;
    let lateCount = 0;

    // Sort chronologically for consecutive absences
    const sortedSessions = [...filteredSessions].sort((a, b) => a.date.localeCompare(b.date));
    let consecutiveAbsences = 0;

    sortedSessions.forEach((session) => {
      const entry = session.entries[studentId];
      if (entry) {
        totalClasses++;
        if (entry.status === 'presente') {
          presentCount++;
          consecutiveAbsences = 0;
        } else if (entry.status === 'atraso') {
          lateCount++;
          presentCount++; // Late counts as present with remark
          consecutiveAbsences = 0;
        } else if (entry.status === 'justificada') {
          justifiedCount++;
          // doesn't increment consecutive unexcused absences
        } else if (entry.status === 'falta') {
          absentCount++;
          consecutiveAbsences++;
        }
      }
    });

    const attendanceRate = totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : 100;
    const isAtRisk = totalClasses >= 3 && (attendanceRate < 75 || consecutiveAbsences >= 2);

    return {
      studentId,
      totalClasses,
      presentCount,
      absentCount,
      justifiedCount,
      lateCount,
      attendanceRate,
      consecutiveAbsences,
      isAtRisk,
    };
  },

  // Reset database to rich original seed data
  resetAllData(): void {
    if (!isClient) return;
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(INITIAL_STUDENTS));
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(INITIAL_CLASSES));
    const initialAttendance = generateInitialAttendanceSessions();
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(initialAttendance));
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(INITIAL_NOTIFICATIONS));
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { type: 'reset' } }));
  },

  // Export full backup
  exportDatabaseJSON(): string {
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      students: this.getStudents(),
      classes: this.getClasses(),
      attendance: this.getAttendanceSessions(),
      notifications: this.getNotifications(),
      sponsors: this.getSponsors(),
      sponsorSize: this.getSponsorSize(),
    };
    return JSON.stringify(backup, null, 2);
  },

  // Restore backup from JSON
  restoreDatabaseJSON(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.students && Array.isArray(parsed.students)) {
        this.saveStudents(parsed.students);
      }
      if (parsed.classes && Array.isArray(parsed.classes)) {
        this.saveClasses(parsed.classes);
      }
      if (parsed.attendance && Array.isArray(parsed.attendance)) {
        this.saveAttendanceSessions(parsed.attendance);
      }
      if (parsed.notifications && Array.isArray(parsed.notifications)) {
        this.saveNotifications(parsed.notifications);
      }
      if (parsed.sponsors && Array.isArray(parsed.sponsors)) {
        this.saveSponsors(parsed.sponsors);
      }
      if (typeof parsed.sponsorSize === 'number') {
        this.saveSponsorSize(parsed.sponsorSize);
      }
      return true;
    } catch {
      return false;
    }
  },

  // Pull all synchronized data from the shared server (used by Mobile & other tabs)
  async pullFromSharedSync(): Promise<boolean> {
    if (!isClient) return false;
    try {
      const res = await fetch('/api/sync');
      if (!res.ok) return false;
      const json = await res.json();
      if (!json.data) return false;

      let changed = false;
      if (json.data.students && Array.isArray(json.data.students) && json.data.students.length > 0) {
        this.saveStudents(json.data.students, false);
        changed = true;
      }
      if (json.data.classes && Array.isArray(json.data.classes) && json.data.classes.length > 0) {
        this.saveClasses(json.data.classes, false);
        changed = true;
      }
      if (json.data.sessions && Array.isArray(json.data.sessions) && json.data.sessions.length > 0) {
        this.saveAttendanceSessions(json.data.sessions, false);
        changed = true;
      }
      if (json.data.notifications && Array.isArray(json.data.notifications) && json.data.notifications.length > 0) {
        this.saveNotifications(json.data.notifications, false);
        changed = true;
      }
      if (json.data.sponsors && Array.isArray(json.data.sponsors) && json.data.sponsors.length > 0) {
        this.saveSponsors(json.data.sponsors, false);
        changed = true;
      }
      if (typeof json.data.sponsorSize === 'number') {
        this.saveSponsorSize(json.data.sponsorSize, false);
        changed = true;
      }
      return changed;
    } catch {
      return false;
    }
  },

  // Push all current local state to shared server
  pushAllToSharedSync(): void {
    if (!isClient) return;
    syncToServer({
      students: this.getStudents(),
      classes: this.getClasses(),
      sessions: this.getAttendanceSessions(),
      notifications: this.getNotifications(),
      sponsors: this.getSponsors(),
      sponsorSize: this.getSponsorSize(),
    });
  },

  // Subscribe to updates
  subscribe(callback: (type?: string) => void): () => void {
    if (!isClient) return () => {};
    const handler = (e: Event) => {
      const custom = e as CustomEvent;
      callback(custom.detail?.type);
    };
    window.addEventListener(SYNC_EVENT, handler);
    return () => window.removeEventListener(SYNC_EVENT, handler);
  },
};
