import fs from 'fs';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  INITIAL_CLASSES,
  INITIAL_STUDENTS,
  generateInitialAttendanceSessions,
  INITIAL_NOTIFICATIONS,
} from '@/lib/mockData';
import { DEFAULT_SPONSORS } from '@/lib/sponsorPresets';
import {
  Student,
  VolleyballClass,
  DailyAttendanceSession,
  NotificationLog,
  SponsorLogo,
} from '@/types/volleyball';
import {
  normalizeClass,
  normalizeStudent,
  normalizeSession,
  normalizeNotification,
  normalizeSponsor,
} from '@/lib/normalization';

export interface SharedAdminAuth {
  password?: string;
  updatedAt?: string;
}

export interface SharedState {
  config: {
    url: string;
    anonKey: string;
  };
  adminAuth: SharedAdminAuth;
  data: {
    students: Student[];
    classes: VolleyballClass[];
    sessions: DailyAttendanceSession[];
    notifications: NotificationLog[];
    sponsors: SponsorLogo[];
    sponsorSize: number;
    updatedAt: string;
  };
}

const PRIMARY_CACHE_FILE = path.join(process.cwd(), 'data', 'voleipro_shared_sync.json');
const BACKUP_CACHE_FILE = path.join('/tmp', 'voleipro_shared_sync.json');

export function normalizeSupabaseUrl(input: string): string {
  if (!input) return '';
  let clean = input.trim();
  clean = clean.replace(/\/+$/, '');
  clean = clean.replace(/\/rest\/v1\/?$/, '');
  clean = clean.replace(/\/rest\/?$/, '');
  return clean;
}

export const DEFAULT_SUPABASE_URL = 'https://jugrgmjahyylpkmbnfsc.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1Z3JnbWphaHl5bHBrbWJuZnNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzNzYzOTIsImV4cCI6MjEwODk1MjM5Mn0.hFY5tJn4fcVeTrC3Jl4XSft77X2MLh6RP-_fts2L91s';

// Estado inicial padrão
let inMemoryState: SharedState = {
  config: {
    url: normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL),
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY,
  },
  adminAuth: {
    password: 'admin',
    updatedAt: new Date().toISOString(),
  },
  data: {
    students: INITIAL_STUDENTS.map(normalizeStudent),
    classes: INITIAL_CLASSES.map(normalizeClass),
    sessions: [],
    notifications: INITIAL_NOTIFICATIONS.map(normalizeNotification),
    sponsors: DEFAULT_SPONSORS.map(normalizeSponsor),
    sponsorSize: 28,
    updatedAt: new Date().toISOString(),
  },
};

let serverSupabaseClient: SupabaseClient | null = null;
let lastSupabaseFetchTime = 0;

export function getSupabaseServerClient(): SupabaseClient | null {
  const url = inMemoryState.config?.url || DEFAULT_SUPABASE_URL;
  const anonKey = inMemoryState.config?.anonKey || DEFAULT_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  if (!serverSupabaseClient) {
    serverSupabaseClient = createClient(url, anonKey, {
      auth: { persistSession: false },
    });
  }
  return serverSupabaseClient;
}

export function isValidSupabaseUrl(url?: string): boolean {
  if (!url) return false;
  const clean = url.trim().toLowerCase();
  return clean.startsWith('http') && !clean.includes('sb_publishable') && !clean.includes('your-project-id');
}

export function readSharedState(): SharedState {
  try {
    let raw = '';
    if (fs.existsSync(PRIMARY_CACHE_FILE)) {
      raw = fs.readFileSync(PRIMARY_CACHE_FILE, 'utf-8');
    } else if (fs.existsSync(BACKUP_CACHE_FILE)) {
      raw = fs.readFileSync(BACKUP_CACHE_FILE, 'utf-8');
    }

    if (raw) {
      const parsed = JSON.parse(raw);
      const urlCandidate = parsed.config?.url ? normalizeSupabaseUrl(parsed.config.url) : '';
      const keyCandidate = parsed.config?.anonKey ? String(parsed.config.anonKey).trim() : '';

      inMemoryState = {
        config: {
          url: isValidSupabaseUrl(urlCandidate) ? urlCandidate : DEFAULT_SUPABASE_URL,
          anonKey: keyCandidate && keyCandidate.length > 20 && !keyCandidate.includes('your-anon-key') ? keyCandidate : DEFAULT_SUPABASE_ANON_KEY,
        },
        adminAuth: {
          password: parsed.adminAuth?.password || inMemoryState.adminAuth.password || 'admin',
          updatedAt: parsed.adminAuth?.updatedAt || inMemoryState.adminAuth.updatedAt,
        },
        data: {
          students: Array.isArray(parsed.data?.students) && parsed.data.students.length > 0
            ? parsed.data.students.map(normalizeStudent)
            : inMemoryState.data.students,
          classes: Array.isArray(parsed.data?.classes) && parsed.data.classes.length > 0
            ? parsed.data.classes.map(normalizeClass)
            : inMemoryState.data.classes,
          sessions: Array.isArray(parsed.data?.sessions)
            ? parsed.data.sessions.map(normalizeSession)
            : inMemoryState.data.sessions,
          notifications: Array.isArray(parsed.data?.notifications) && parsed.data.notifications.length > 0
            ? parsed.data.notifications.map(normalizeNotification)
            : inMemoryState.data.notifications,
          sponsors: Array.isArray(parsed.data?.sponsors) && parsed.data.sponsors.length > 0
            ? parsed.data.sponsors.map(normalizeSponsor)
            : inMemoryState.data.sponsors,
          sponsorSize: typeof parsed.data?.sponsorSize === 'number' ? parsed.data.sponsorSize : inMemoryState.data.sponsorSize,
          updatedAt: parsed.data?.updatedAt || inMemoryState.data.updatedAt,
        },
      };
    }
  } catch (err) {
    console.error('Erro ao ler cache compartilhado do servidor:', err);
  }
  return inMemoryState;
}

export function writeSharedState(state: SharedState): void {
  inMemoryState = state;
  const jsonStr = JSON.stringify(state, null, 2);

  try {
    const primaryDir = path.dirname(PRIMARY_CACHE_FILE);
    if (!fs.existsSync(primaryDir)) {
      fs.mkdirSync(primaryDir, { recursive: true });
    }
    fs.writeFileSync(PRIMARY_CACHE_FILE, jsonStr, 'utf-8');
  } catch (err) {
    console.warn('Aviso: Falha ao gravar cache primário:', err);
  }

  try {
    fs.writeFileSync(BACKUP_CACHE_FILE, jsonStr, 'utf-8');
  } catch (err) {
    console.warn('Aviso: Falha ao gravar cache secundário:', err);
  }
}

/**
 * Consulta o banco Supabase em nuvem diretamente no servidor para garantir
 * que qualquer aparelho (celular, tablet ou PC) receba SEMPRE a última versão salva.
 */
export async function fetchFromSupabaseOnServer(force = false): Promise<SharedState> {
  const now = Date.now();
  // Cache leve de 1,5 segundos para evitar chamadas redundantes em rajada
  if (!force && now - lastSupabaseFetchTime < 1500) {
    return inMemoryState;
  }

  const client = getSupabaseServerClient();
  if (!client) return readSharedState();

  try {
    const fetchPromise = Promise.all([
      client.from('classes').select('*'),
      client.from('students').select('*'),
      client.from('attendance_sessions').select('*'),
      client.from('notifications').select('*'),
    ]);

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout ao conectar com Supabase')), 3000)
    );

    const [resClasses, resStudents, resSessions, resNotifs] = await Promise.race([
      fetchPromise,
      timeoutPromise,
    ]);

    let changed = false;

    if (resClasses?.data && Array.isArray(resClasses.data) && resClasses.data.length > 0) {
      inMemoryState.data.classes = resClasses.data.map(normalizeClass);
      changed = true;
    }

    if (resStudents?.data && Array.isArray(resStudents.data) && resStudents.data.length > 0) {
      inMemoryState.data.students = resStudents.data.map(normalizeStudent);
      changed = true;
    }

    if (resSessions?.data && Array.isArray(resSessions.data) && resSessions.data.length > 0) {
      inMemoryState.data.sessions = resSessions.data.map(normalizeSession);
      changed = true;
    }

    if (resNotifs?.data && Array.isArray(resNotifs.data) && resNotifs.data.length > 0) {
      inMemoryState.data.notifications = resNotifs.data.map(normalizeNotification);
      changed = true;
    }

    try {
      const resSponsors = await client.from('sponsors').select('*');
      if (resSponsors?.data && Array.isArray(resSponsors.data) && resSponsors.data.length > 0) {
        inMemoryState.data.sponsors = resSponsors.data.map(normalizeSponsor);
        changed = true;
      }
    } catch {
      // Tabela de sponsors opcional
    }

    lastSupabaseFetchTime = now;

    if (changed) {
      inMemoryState.data.updatedAt = new Date().toISOString();
      writeSharedState(inMemoryState);
    }
  } catch (err) {
    console.warn('Aviso: Falha ou timeout ao consultar Supabase no servidor, usando cache local:', err);
    readSharedState();
  }

  return inMemoryState;
}

/**
 * Salva e sincroniza alterações diretamente no Supabase em segundo plano
 */
export async function saveToSupabaseOnServer(data: Partial<SharedState['data']>): Promise<void> {
  const client = getSupabaseServerClient();
  if (!client || !data) return;

  try {
    const rawData = data as any;
    if (rawData.deletedClassId) {
      await client.from('classes').delete().eq('id', String(rawData.deletedClassId));
    }
    if (rawData.deletedStudentId) {
      await client.from('students').delete().eq('id', String(rawData.deletedStudentId));
    }

    // 1. Turmas e Turnos
    if (data.classes && Array.isArray(data.classes) && data.classes.length > 0) {
      const formattedClasses = data.classes.map((c: any) => ({
        id: String(c.id),
        name: String(c.name || 'Turma'),
        category: c.category || 'Sub-13',
        shift: c.shift || 'Tarde',
        start_time: c.startTime || c.start_time || '14:00',
        end_time: c.endTime || c.end_time || '15:30',
        days_of_week: c.daysOfWeek || c.days_of_week || ['Segunda', 'Quarta'],
        instructor_name: c.instructorName || c.instructor_name || 'Prof. Responsável',
        court: c.court || 'Quadra Principal',
        max_capacity: Number(c.maxCapacity || c.max_capacity) || 30,
        min_age: Number(c.minAge || c.min_age) || 7,
        max_age: Number(c.maxAge || c.max_age) || 17,
        color_tag: c.colorTag || c.color_tag || 'blue',
        updated_at: new Date().toISOString(),
      }));

      await client.from('classes').upsert(formattedClasses, { onConflict: 'id' });
    }

    // Buscar lista de turmas existentes no Supabase para garantir integridade referencial das FKs
    const { data: dbClasses } = await client.from('classes').select('id');
    const validClassIds = new Set<string>([
      ...(data.classes && Array.isArray(data.classes) ? data.classes.map((c: any) => String(c.id)) : []),
      ...(dbClasses || []).map((c: { id: string }) => String(c.id)),
    ]);

    // 2. Alunos e Matrículas
    let validStudentIds = new Set<string>();
    if (data.students && Array.isArray(data.students) && data.students.length > 0) {
      const formattedStudents = data.students.map((s: any) => ({
        id: String(s.id),
        registration_number: s.registrationNumber || s.registration_number,
        full_name: s.fullName || s.full_name,
        birth_date: s.birthDate || s.birth_date,
        age: s.age,
        gender: s.gender,
        category: s.category,
        preferred_position: s.preferredPosition || s.preferred_position || 'Geral',
        level: s.level || s.level || 'Iniciante',
        height_cm: s.heightCm || s.height_cm || null,
        jersey_number: s.jerseyNumber || s.jersey_number || null,
        class_id: (s.classId || s.class_id) && validClassIds.has(String(s.classId || s.class_id))
          ? String(s.classId || s.class_id)
          : null,
        status: s.status || 'Ativo',
        enrollment_date: s.enrollmentDate || s.enrollment_date,
        medical_conditions: s.medicalConditions || s.medical_conditions || null,
        allergies: s.allergies || null,
        guardian: s.guardian || {
          name: s.guardian_name,
          phone: s.guardian_phone,
          relationship: s.guardian_relationship,
          email: s.guardian_email,
        },
        notes: s.notes || null,
        avatar_seed: s.avatarSeed || s.avatar_seed || null,
        photo_url: s.photoUrl || s.photo_url || null,
        card_valid_until: s.cardValidUntil || s.card_valid_until || '2026-12-31',
        updated_at: new Date().toISOString(),
      }));

      validStudentIds = new Set<string>(formattedStudents.map((s: any) => s.id));
      await client.from('students').upsert(formattedStudents, { onConflict: 'id' });
    }

    // 3. Chamadas de Presença - apenas sessões com turmas válidas
    if (data.sessions && Array.isArray(data.sessions) && data.sessions.length > 0) {
      const validSessions = data.sessions.filter(
        (sess: any) => sess && (sess.classId || sess.class_id) && validClassIds.has(String(sess.classId || sess.class_id))
      );

      if (validSessions.length > 0) {
        const formattedSessions = validSessions.map((sess: any) => ({
          id: sess.id,
          class_id: String(sess.classId || sess.class_id),
          date: sess.date,
          instructor_name: sess.instructorName || sess.instructor_name,
          entries: sess.entries || {},
          saved_at: sess.savedAt || sess.saved_at || new Date().toISOString(),
          shift: sess.shift || 'Tarde',
        }));

        await client.from('attendance_sessions').upsert(formattedSessions, { onConflict: 'id' });
      }
    }

    // 4. Notificações aos Pais
    if (data.notifications && Array.isArray(data.notifications) && data.notifications.length > 0) {
      const formattedNotifs = data.notifications.map((n: any) => ({
        id: n.id,
        student_id: (n.studentId || n.student_id) && validStudentIds.has(String(n.studentId || n.student_id))
          ? String(n.studentId || n.student_id)
          : null,
        student_name: n.studentName || n.student_name,
        guardian_name: n.guardianName || n.guardian_name,
        guardian_phone: n.guardianPhone || n.guardian_phone,
        guardian_email: n.guardianEmail || n.guardian_email || null,
        type: n.type,
        message: n.message,
        channel: n.channel || 'WhatsApp',
        sent_at: n.sentAt || n.sent_at || new Date().toISOString(),
        status: n.status || 'Enviado',
      }));

      await client.from('notifications').upsert(formattedNotifs, { onConflict: 'id' });
    }
  } catch (err) {
    console.warn('Aviso: Falha ao persistir no Supabase no servidor:', err);
  }
}
