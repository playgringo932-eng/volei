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

// ==========================================
// DATA NORMALIZATION & DEFENSIVE SANITIZATION
// Prevents any client crash from unparsed JSON,
// snake_case/camelCase mismatch, or missing null fields
// ==========================================

export function normalizeStudent(raw: any): Student {
  if (!raw || typeof raw !== 'object') {
    return {
      id: `s_fallback_${Date.now()}`,
      registrationNumber: 'REG-000',
      fullName: 'Atleta',
      birthDate: '2012-01-01',
      age: 12,
      gender: 'Masculino',
      category: 'Sub-15',
      preferredPosition: 'Ponteiro(a)',
      level: 'Iniciante',
      classId: '',
      status: 'Ativo',
      enrollmentDate: new Date().toISOString().split('T')[0],
      guardian: {
        name: 'Responsável',
        phone: '',
        relationship: 'Mãe',
        email: '',
        allowWhatsAppNotifications: true,
      },
      cardValidUntil: '2026-12-31',
    };
  }

  // Handle guardian (can be string, object, null or snake_case)
  let guardianRaw = raw.guardian;
  if (typeof guardianRaw === 'string') {
    try {
      guardianRaw = JSON.parse(guardianRaw);
    } catch {
      guardianRaw = null;
    }
  }
  if (!guardianRaw || typeof guardianRaw !== 'object') {
    guardianRaw = {};
  }

  const guardian: Student['guardian'] = {
    name: String(guardianRaw.name || guardianRaw.nome || raw.guardian_name || 'Responsável').trim(),
    phone: String(guardianRaw.phone || guardianRaw.telefone || raw.guardian_phone || '').trim(),
    relationship: (guardianRaw.relationship || guardianRaw.parentesco || 'Mãe') as Student['guardian']['relationship'],
    email: guardianRaw.email || raw.guardian_email || '',
    emergencyPhone: guardianRaw.emergencyPhone || guardianRaw.emergency_phone || undefined,
    allowWhatsAppNotifications: Boolean(guardianRaw.allowWhatsAppNotifications ?? true),
  };

  const id = String(raw.id || raw.registration_number || raw.registrationNumber || `s_${Math.random().toString(36).substring(2, 9)}`);
  const registrationNumber = String(
    raw.registrationNumber || raw.registration_number || raw.matricula || raw.reg || id
  );
  const fullName = String(raw.fullName || raw.full_name || raw.nome || raw.name || 'Atleta').trim();
  const birthDate = String(raw.birthDate || raw.birth_date || raw.data_nascimento || '2012-01-01');
  const age = Number(raw.age) || 12;
  const gender = String(raw.gender || raw.genero || 'Masculino') as Student['gender'];
  const category = String(raw.category || raw.categoria || 'Sub-15') as Student['category'];
  const preferredPosition = String(raw.preferredPosition || raw.preferred_position || raw.posicao || 'Ponteiro(a)') as Student['preferredPosition'];
  const level = String(raw.level || raw.nivel || 'Iniciante') as Student['level'];
  const heightCm = raw.heightCm != null ? Number(raw.heightCm) : (raw.height_cm != null ? Number(raw.height_cm) : undefined);
  const jerseyNumber = raw.jerseyNumber != null ? Number(raw.jerseyNumber) : (raw.jersey_number != null ? Number(raw.jersey_number) : undefined);
  const classId = String(raw.classId || raw.class_id || '');
  const status = (raw.status || 'Ativo') as Student['status'];
  const enrollmentDate = String(raw.enrollmentDate || raw.enrollment_date || new Date().toISOString().split('T')[0]);
  const medicalConditions = raw.medicalConditions || raw.medical_conditions || undefined;
  const allergies = raw.allergies || undefined;
  const notes = raw.notes || undefined;
  const avatarSeed = String(raw.avatarSeed || raw.avatar_seed || id);
  const photoUrl = raw.photoUrl || raw.photo_url || undefined;
  const cardValidUntil = String(raw.cardValidUntil || raw.card_valid_until || '2026-12-31');

  return {
    id,
    registrationNumber,
    fullName,
    birthDate,
    age,
    gender,
    category,
    preferredPosition,
    level,
    heightCm,
    jerseyNumber,
    classId,
    status,
    enrollmentDate,
    medicalConditions,
    allergies,
    guardian,
    notes,
    avatarSeed,
    photoUrl,
    cardValidUntil,
  };
}

export function normalizeClass(raw: any): VolleyballClass {
  if (!raw || typeof raw !== 'object') {
    return INITIAL_CLASSES[0];
  }
  let days = raw.daysOfWeek ?? raw.days_of_week;
  if (typeof days === 'string') {
    try {
      days = JSON.parse(days);
    } catch {
      days = [];
    }
  }
  if (!Array.isArray(days)) {
    days = ['Segunda', 'Quarta'];
  }

  return {
    id: String(raw.id || `c_${Math.random().toString(36).substring(2, 9)}`),
    name: String(raw.name || raw.nome || 'Turma'),
    category: (raw.category || raw.categoria || 'Sub-15') as VolleyballClass['category'],
    shift: (raw.shift || raw.turno || 'Tarde') as VolleyballClass['shift'],
    startTime: String(raw.startTime || raw.start_time || '14:00'),
    endTime: String(raw.endTime || raw.end_time || '15:30'),
    daysOfWeek: days,
    instructorName: String(raw.instructorName || raw.instructor_name || 'Prof. Responsável'),
    court: String(raw.court || raw.quadra || 'Quadra Principal'),
    maxCapacity: Number(raw.maxCapacity || raw.max_capacity) || 30,
    minAge: Number(raw.minAge || raw.min_age) || 7,
    maxAge: Number(raw.maxAge || raw.max_age) || 17,
    colorTag: raw.colorTag || raw.color_tag || 'blue',
  };
}

export function normalizeSession(raw: any): DailyAttendanceSession {
  if (!raw || typeof raw !== 'object') {
    return {
      id: `session_${Date.now()}`,
      classId: '',
      date: new Date().toISOString().split('T')[0],
      instructorName: '',
      entries: {},
      savedAt: new Date().toISOString(),
      shift: 'Tarde',
    };
  }

  let entries = raw.entries;
  if (typeof entries === 'string') {
    try {
      entries = JSON.parse(entries);
    } catch {
      entries = {};
    }
  }
  if (!entries || typeof entries !== 'object' || Array.isArray(entries)) {
    entries = {};
  }

  return {
    id: String(raw.id || `${raw.classId || raw.class_id || 'class'}_${raw.date || ''}`),
    classId: String(raw.classId || raw.class_id || ''),
    date: String(raw.date || ''),
    instructorName: String(raw.instructorName || raw.instructor_name || ''),
    entries,
    savedAt: String(raw.savedAt || raw.saved_at || new Date().toISOString()),
    shift: (raw.shift || 'Tarde') as DailyAttendanceSession['shift'],
  };
}

export function normalizeNotification(raw: any): NotificationLog {
  return {
    id: String(raw?.id || `notif_${Date.now()}`),
    studentId: String(raw?.studentId || raw?.student_id || ''),
    studentName: String(raw?.studentName || raw?.student_name || 'Aluno'),
    guardianName: String(raw?.guardianName || raw?.guardian_name || 'Responsável'),
    guardianPhone: String(raw?.guardianPhone || raw?.guardian_phone || ''),
    guardianEmail: raw?.guardianEmail || raw?.guardian_email || undefined,
    type: raw?.type || 'presenca',
    message: String(raw?.message || ''),
    channel: raw?.channel || 'WhatsApp',
    sentAt: String(raw?.sentAt || raw?.sent_at || new Date().toISOString()),
    status: raw?.status || 'Enviado',
  };
}

export function normalizeSponsor(raw: any): SponsorLogo {
  return {
    id: String(raw?.id || `sp_${Date.now()}`),
    name: String(raw?.name || 'Patrocinador'),
    category: String(raw?.category || 'Apoiador Oficial'),
    logoUrl: String(raw?.logoUrl || raw?.logo_url || ''),
    isActive: Boolean(raw?.isActive ?? raw?.is_active ?? true),
  };
}

// ==========================================
// STORAGE SERVICE IMPLEMENTATION
// ==========================================

export const storageService = {
  // --- STUDENTS ---
  getStudents(): Student[] {
    if (!isClient) return INITIAL_STUDENTS.map(normalizeStudent);
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      if (!data) {
        const initial = INITIAL_STUDENTS.map(normalizeStudent);
        localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(initial));
        return initial;
      }
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) return INITIAL_STUDENTS.map(normalizeStudent);
      return parsed.map(normalizeStudent);
    } catch {
      return INITIAL_STUDENTS.map(normalizeStudent);
    }
  },

  saveStudents(students: Student[], sync = true): void {
    if (!isClient) return;
    try {
      const normalized = (Array.isArray(students) ? students : []).map(normalizeStudent);
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(normalized));
      window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { type: 'students' } }));
      if (sync) syncToServer({ students: normalized });
    } catch (err) {
      console.warn('Erro ao salvar alunos:', err);
    }
  },

  addStudent(student: Student): void {
    const list = this.getStudents();
    list.unshift(normalizeStudent(student));
    this.saveStudents(list);
  },

  updateStudent(student: Student): void {
    const list = this.getStudents();
    const index = list.findIndex((s) => s.id === student.id);
    if (index !== -1) {
      list[index] = normalizeStudent(student);
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
    if (!isClient) return INITIAL_CLASSES.map(normalizeClass);
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CLASSES);
      if (!data) {
        const initial = INITIAL_CLASSES.map(normalizeClass);
        localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(initial));
        return initial;
      }
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) return INITIAL_CLASSES.map(normalizeClass);
      return parsed.map(normalizeClass);
    } catch {
      return INITIAL_CLASSES.map(normalizeClass);
    }
  },

  saveClasses(classes: VolleyballClass[], sync = true): void {
    if (!isClient) return;
    try {
      const normalized = (Array.isArray(classes) ? classes : []).map(normalizeClass);
      localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(normalized));
      window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { type: 'classes' } }));
      if (sync) syncToServer({ classes: normalized });
    } catch (err) {
      console.warn('Erro ao salvar turmas:', err);
    }
  },

  addClass(cls: VolleyballClass): void {
    const list = this.getClasses();
    list.push(normalizeClass(cls));
    this.saveClasses(list);
  },

  updateClass(cls: VolleyballClass): void {
    const list = this.getClasses();
    const index = list.findIndex((c) => c.id === cls.id);
    if (index !== -1) {
      list[index] = normalizeClass(cls);
      this.saveClasses(list);
    }
  },

  deleteClass(id: string): void {
    const list = this.getClasses().filter((c) => c.id !== id);
    this.saveClasses(list);
  },

  // --- ATTENDANCE SESSIONS ---
  getAttendanceSessions(): DailyAttendanceSession[] {
    if (!isClient) return generateInitialAttendanceSessions().map(normalizeSession);
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
      if (!data) {
        const initial = generateInitialAttendanceSessions().map(normalizeSession);
        localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(initial));
        return initial;
      }
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) return generateInitialAttendanceSessions().map(normalizeSession);
      return parsed.map(normalizeSession);
    } catch {
      return generateInitialAttendanceSessions().map(normalizeSession);
    }
  },

  saveAttendanceSessions(sessions: DailyAttendanceSession[], sync = true): void {
    if (!isClient) return;
    try {
      const normalized = (Array.isArray(sessions) ? sessions : []).map(normalizeSession);
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(normalized));
      window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { type: 'attendance' } }));
      if (sync) syncToServer({ sessions: normalized });
    } catch (err) {
      console.warn('Erro ao salvar chamadas:', err);
    }
  },

  getSession(classId: string, date: string): DailyAttendanceSession | undefined {
    const sessions = this.getAttendanceSessions();
    return sessions.find((s) => s.classId === classId && s.date === date);
  },

  recordAttendance(session: DailyAttendanceSession): void {
    const normalized = normalizeSession(session);
    const sessions = this.getAttendanceSessions();
    const index = sessions.findIndex(
      (s) => s.id === normalized.id || (s.classId === normalized.classId && s.date === normalized.date)
    );
    if (index !== -1) {
      sessions[index] = normalized;
    } else {
      sessions.push(normalized);
    }
    this.saveAttendanceSessions(sessions);
  },

  checkInStudentByQrCode(
    rawCode: string,
    targetDate?: string,
    targetClassId?: string
  ): {
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
    const student = students.find(
      (s) =>
        (studentIdCandidate && s.id.toLowerCase() === studentIdCandidate.toLowerCase()) ||
        (regCandidate && s.registrationNumber.toLowerCase() === regCandidate.toLowerCase()) ||
        (nameCandidate && s.fullName.toLowerCase().includes(nameCandidate.toLowerCase()))
    );

    if (!student) {
      return {
        success: false,
        message: `Atleta não encontrado no sistema para o código: "${trimmed.slice(0, 30)}"`,
        timestamp,
      };
    }

    const effectiveClassId = targetClassId || student.classId;
    const classes = this.getClasses();
    const classObj = classes.find((c) => c.id === effectiveClassId) || classes[0];

    if (!classObj) {
      return {
        success: false,
        student,
        message: 'Nenhuma turma configurada para registrar a presença.',
        timestamp,
      };
    }

    let session = this.getSession(classObj.id, dateStr);
    let alreadyPresent = false;

    if (!session) {
      session = {
        id: `${classObj.id}_${dateStr}`,
        classId: classObj.id,
        date: dateStr,
        instructorName: classObj.instructorName,
        entries: {},
        savedAt: new Date().toISOString(),
        shift: classObj.shift,
      };
    }

    if (!session.entries) session.entries = {};

    if (session.entries[student.id]?.status === 'presente') {
      alreadyPresent = true;
    } else {
      session.entries[student.id] = {
        status: 'presente',
        updatedAt: new Date().toISOString(),
      };
      session.savedAt = new Date().toISOString();
      this.recordAttendance(session);
    }

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
    if (!isClient) return INITIAL_NOTIFICATIONS.map(normalizeNotification);
    try {
      const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      if (!data) {
        const initial = INITIAL_NOTIFICATIONS.map(normalizeNotification);
        localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(initial));
        return initial;
      }
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) return INITIAL_NOTIFICATIONS.map(normalizeNotification);
      return parsed.map(normalizeNotification);
    } catch {
      return INITIAL_NOTIFICATIONS.map(normalizeNotification);
    }
  },

  saveNotifications(logs: NotificationLog[], sync = true): void {
    if (!isClient) return;
    try {
      const normalized = (Array.isArray(logs) ? logs : []).map(normalizeNotification);
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(normalized));
      window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { type: 'notifications' } }));
      if (sync) syncToServer({ notifications: normalized });
    } catch (err) {
      console.warn('Erro ao salvar notificações:', err);
    }
  },

  addNotification(log: NotificationLog): void {
    const list = this.getNotifications();
    list.unshift(normalizeNotification(log));
    this.saveNotifications(list);
  },

  // --- SPONSORS (PATROCINADORES DA CARTEIRINHA) ---
  getSponsors(): SponsorLogo[] {
    if (!isClient) return DEFAULT_SPONSORS.map(normalizeSponsor);
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SPONSORS);
      if (!data) {
        const initial = DEFAULT_SPONSORS.map(normalizeSponsor);
        localStorage.setItem(STORAGE_KEYS.SPONSORS, JSON.stringify(initial));
        return initial;
      }
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) return DEFAULT_SPONSORS.map(normalizeSponsor);
      return parsed.map(normalizeSponsor);
    } catch {
      return DEFAULT_SPONSORS.map(normalizeSponsor);
    }
  },

  saveSponsors(sponsors: SponsorLogo[], sync = true): void {
    if (!isClient) return;
    try {
      const normalized = (Array.isArray(sponsors) ? sponsors : []).map(normalizeSponsor);
      localStorage.setItem(STORAGE_KEYS.SPONSORS, JSON.stringify(normalized));
      window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { type: 'sponsors' } }));
      if (sync) syncToServer({ sponsors: normalized });
    } catch (err) {
      console.warn('Erro ao salvar patrocinadores no localStorage:', err);
    }
  },

  addSponsor(sponsor: SponsorLogo): void {
    const list = this.getSponsors();
    list.push(normalizeSponsor(sponsor));
    this.saveSponsors(list);
  },

  updateSponsor(sponsor: SponsorLogo): void {
    const list = this.getSponsors();
    const idx = list.findIndex((s) => s.id === sponsor.id);
    if (idx !== -1) {
      list[idx] = normalizeSponsor(sponsor);
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
    const defaultSummary: AttendanceSummary = {
      studentId: studentId || '',
      totalClasses: 0,
      presentCount: 0,
      absentCount: 0,
      justifiedCount: 0,
      lateCount: 0,
      attendanceRate: 100,
      consecutiveAbsences: 0,
      isAtRisk: false,
    };

    if (!studentId) return defaultSummary;

    const rawSessions = this.getAttendanceSessions();
    const sessions = Array.isArray(rawSessions) ? rawSessions : [];
    const filteredSessions = monthYear
      ? sessions.filter((s) => s && s.date && typeof s.date === 'string' && s.date.startsWith(monthYear))
      : sessions.filter((s) => s && s.date);

    let totalClasses = 0;
    let presentCount = 0;
    let absentCount = 0;
    let justifiedCount = 0;
    let lateCount = 0;

    // Sort chronologically for consecutive absences
    const sortedSessions = [...filteredSessions].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    let consecutiveAbsences = 0;

    sortedSessions.forEach((session) => {
      if (!session || !session.entries || typeof session.entries !== 'object') return;
      const entry = session.entries[studentId];
      if (entry && entry.status) {
        totalClasses++;
        if (entry.status === 'presente') {
          presentCount++;
          consecutiveAbsences = 0;
        } else if (entry.status === 'atraso') {
          lateCount++;
          presentCount++;
          consecutiveAbsences = 0;
        } else if (entry.status === 'justificada') {
          justifiedCount++;
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
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(INITIAL_STUDENTS.map(normalizeStudent)));
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(INITIAL_CLASSES.map(normalizeClass)));
    const initialAttendance = generateInitialAttendanceSessions().map(normalizeSession);
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(initialAttendance));
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(INITIAL_NOTIFICATIONS.map(normalizeNotification)));
    localStorage.setItem(STORAGE_KEYS.SPONSORS, JSON.stringify(DEFAULT_SPONSORS.map(normalizeSponsor)));
    localStorage.setItem(STORAGE_KEYS.SPONSOR_SIZE, '28');
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { type: 'reset' } }));
    this.pushAllToSharedSync();
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
        const normalized = json.data.students.map(normalizeStudent);
        this.saveStudents(normalized, false);
        changed = true;
      }
      if (json.data.classes && Array.isArray(json.data.classes) && json.data.classes.length > 0) {
        const normalized = json.data.classes.map(normalizeClass);
        this.saveClasses(normalized, false);
        changed = true;
      }
      if (json.data.sessions && Array.isArray(json.data.sessions) && json.data.sessions.length > 0) {
        const normalized = json.data.sessions.map(normalizeSession);
        this.saveAttendanceSessions(normalized, false);
        changed = true;
      }
      if (json.data.notifications && Array.isArray(json.data.notifications) && json.data.notifications.length > 0) {
        const normalized = json.data.notifications.map(normalizeNotification);
        this.saveNotifications(normalized, false);
        changed = true;
      }
      if (json.data.sponsors && Array.isArray(json.data.sponsors) && json.data.sponsors.length > 0) {
        const normalized = json.data.sponsors.map(normalizeSponsor);
        this.saveSponsors(normalized, false);
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
