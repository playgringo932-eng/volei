'use client';

import {
  Student,
  VolleyballClass,
  DailyAttendanceSession,
  NotificationLog,
  AttendanceSummary,
  AttendanceStatus,
} from '@/types/volleyball';
import {
  INITIAL_CLASSES,
  INITIAL_STUDENTS,
  generateInitialAttendanceSessions,
  INITIAL_NOTIFICATIONS,
} from './mockData';

const STORAGE_KEYS = {
  STUDENTS: 'voleipro_students_v1',
  CLASSES: 'voleipro_classes_v1',
  ATTENDANCE: 'voleipro_attendance_v1',
  NOTIFICATIONS: 'voleipro_notifications_v1',
};

const SYNC_EVENT = 'voleipro_data_updated';

// Helper to check browser environment
const isClient = typeof window !== 'undefined';

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

  saveStudents(students: Student[]): void {
    if (!isClient) return;
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { type: 'students' } }));
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

  saveClasses(classes: VolleyballClass[]): void {
    if (!isClient) return;
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes));
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { type: 'classes' } }));
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

  saveAttendanceSessions(sessions: DailyAttendanceSession[]): void {
    if (!isClient) return;
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(sessions));
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { type: 'attendance' } }));
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

  checkInStudentByQrCode(rawCode: string, targetDate?: string): {
    success: boolean;
    student?: Student;
    classObj?: VolleyballClass;
    alreadyPresent?: boolean;
    message: string;
    timestamp: string;
  } {
    const now = new Date();
    const timestamp = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = targetDate || now.toISOString().split('T')[0];

    // Extract student identifier
    let studentIdCandidate = '';
    let regCandidate = '';
    const trimmed = rawCode.trim();

    let nameCandidate = '';

    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        studentIdCandidate = parsed.studentId || parsed.id || '';
        regCandidate = parsed.reg || parsed.registrationNumber || parsed.matricula || '';
        nameCandidate = parsed.nome || parsed.name || parsed.fullName || '';
      } catch {
        // Fallback
      }
    } else if (trimmed.startsWith('VOLEIPRO:')) {
      const parts = trimmed.split(':');
      studentIdCandidate = parts[1] || '';
      regCandidate = parts[2] || '';
    } else {
      studentIdCandidate = trimmed;
      regCandidate = trimmed;
    }

    const students = this.getStudents();
    const student = students.find(
      (s) =>
        (studentIdCandidate && s.id.toLowerCase() === studentIdCandidate.toLowerCase()) ||
        (regCandidate && s.registrationNumber.toLowerCase() === regCandidate.toLowerCase()) ||
        (nameCandidate && s.fullName.toLowerCase() === nameCandidate.toLowerCase()) ||
        s.id.toLowerCase() === trimmed.toLowerCase() ||
        s.registrationNumber.toLowerCase() === trimmed.toLowerCase()
    );

    if (!student) {
      return {
        success: false,
        message: `Carteirinha não localizada no sistema (${trimmed}). Verifique o código.`,
        timestamp,
      };
    }

    const classes = this.getClasses();
    const classObj = classes.find((c) => c.id === student.classId);

    if (!classObj) {
      return {
        success: false,
        student,
        message: `Aluno ${student.fullName} encontrado, mas nenhuma turma ativa vinculada.`,
        timestamp,
      };
    }

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

  saveNotifications(logs: NotificationLog[]): void {
    if (!isClient) return;
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(logs));
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { type: 'notifications' } }));
  },

  addNotification(log: NotificationLog): void {
    const list = this.getNotifications();
    list.unshift(log);
    this.saveNotifications(list);
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
      return true;
    } catch {
      return false;
    }
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
