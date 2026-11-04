import {
  Student,
  VolleyballClass,
  DailyAttendanceSession,
  NotificationLog,
  SponsorLogo,
} from '@/types/volleyball';
import { normalizeCategory } from '@/lib/volleyballHelpers';
import { INITIAL_CLASSES } from '@/lib/mockData';

// ==========================================
// DATA NORMALIZATION & DEFENSIVE SANITIZATION
// Universal (server & client) pure functions
// Prevents any crash from unparsed JSON,
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
      category: 'Sub-13',
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
  const category = normalizeCategory(raw.category || raw.categoria, age) as Student['category'];
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

  const minAge = Number(raw.minAge || raw.min_age) || 7;
  const maxAge = Number(raw.maxAge || raw.max_age) || 17;
  let categoryRaw = raw.category || raw.categoria;
  if (!categoryRaw || categoryRaw === 'Sub-9' || categoryRaw === 'Sub-11' || categoryRaw === 'Sub-15' || categoryRaw === 'Geral') {
    if (maxAge <= 10) categoryRaw = 'Sub-10';
    else if (maxAge <= 13) categoryRaw = 'Sub-13';
    else categoryRaw = 'Sub-17';
  }
  const category = normalizeCategory(categoryRaw) as VolleyballClass['category'];

  return {
    id: String(raw.id || `c_${Math.random().toString(36).substring(2, 9)}`),
    name: String(raw.name || raw.nome || 'Turma'),
    category,
    shift: (raw.shift || raw.turno || 'Tarde') as VolleyballClass['shift'],
    startTime: String(raw.startTime || raw.start_time || '14:00'),
    endTime: String(raw.endTime || raw.end_time || '15:30'),
    daysOfWeek: days,
    instructorName: String(raw.instructorName || raw.instructor_name || 'Prof. Responsável'),
    court: String(raw.court || raw.quadra || 'Quadra Principal'),
    maxCapacity: Number(raw.maxCapacity || raw.max_capacity) || 30,
    minAge,
    maxAge,
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
