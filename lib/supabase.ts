'use client';

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Student, VolleyballClass, DailyAttendanceSession, NotificationLog } from '@/types/volleyball';
import { storageService } from '@/lib/storage';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

const STORAGE_KEYS = {
  SUPABASE_CONFIG: 'voleipro_supabase_config_v1',
  SUPABASE_LAST_SYNC: 'voleipro_supabase_last_sync_v1',
};

/**
 * Returns currently active Supabase credentials (environment variable or localStorage user override)
 */
export function getSupabaseConfig(): SupabaseConfig {
  if (typeof window === 'undefined') {
    return {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    };
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SUPABASE_CONFIG);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.url && parsed.anonKey) {
        return parsed;
      }
    }
  } catch {
    // fallback to env
  }

  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  };
}

/**
 * Persists user Supabase credentials locally
 */
export function saveSupabaseConfig(config: SupabaseConfig): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.SUPABASE_CONFIG, JSON.stringify(config));
}

/**
 * Checks if Supabase has valid non-placeholder credentials
 */
export function isSupabaseConfigured(): boolean {
  const cfg = getSupabaseConfig();
  return Boolean(
    cfg.url &&
    cfg.anonKey &&
    !cfg.url.includes('your-project-id') &&
    !cfg.anonKey.includes('your-anon-key')
  );
}

/**
 * Creates or retrieves the Supabase client instance
 */
let cachedClient: SupabaseClient | null = null;
let lastClientKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const cfg = getSupabaseConfig();
  if (!cfg.url || !cfg.anonKey) return null;

  const key = `${cfg.url}_${cfg.anonKey}`;
  if (cachedClient && lastClientKey === key) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(cfg.url, cfg.anonKey, {
      auth: {
        persistSession: false,
      },
    });
    lastClientKey = key;
    return cachedClient;
  } catch (err) {
    console.error('Erro ao inicializar cliente Supabase:', err);
    return null;
  }
}

/**
 * Tests live connection to the Supabase instance
 */
export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Supabase ainda não configurado. Insira a URL e Chave Anon do seu projeto.',
    };
  }

  try {
    const { error } = await client.from('classes').select('id').limit(1);
    if (error) {
      if (error.message.includes('relation "classes" does not exist') || error.code === '42P01') {
        return {
          success: false,
          message: 'Conectou ao Supabase, mas as tabelas ainda não foram criadas! Execute o script de Migration no SQL Editor.',
        };
      }
      return {
        success: false,
        message: `Falha na conexão Supabase: ${error.message}`,
      };
    }
    return {
      success: true,
      message: 'Conexão com o Supabase estabelecida e tabelas validadas com sucesso!',
    };
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Erro ao comunicar com Supabase: ${errMessage}`,
    };
  }
}

export interface SyncStats {
  studentsCount: number;
  classesCount: number;
  sessionsCount: number;
  notificationsCount: number;
  syncedAt: string;
}

/**
 * Safely saves all local database entities (alunos, turmas, chamadas, notificações) to Supabase
 */
export async function saveAllToSupabase(): Promise<{
  success: boolean;
  message: string;
  stats?: SyncStats;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Configuração do Supabase ausente. Defina a URL e Chave Anon.',
    };
  }

  try {
    const students = storageService.getStudents();
    const classes = storageService.getClasses();
    const sessions = storageService.getAttendanceSessions();
    const notifications = storageService.getNotifications();

    // 1. Sync Classes (Turmas)
    const formattedClasses = classes.map((c) => ({
      id: c.id,
      name: c.name,
      category: c.category,
      shift: c.shift,
      start_time: c.startTime,
      end_time: c.endTime,
      days_of_week: c.daysOfWeek,
      instructor_name: c.instructorName,
      court: c.court,
      max_capacity: c.maxCapacity,
      min_age: c.minAge,
      max_age: c.maxAge,
      color_tag: c.colorTag,
      updated_at: new Date().toISOString(),
    }));

    if (formattedClasses.length > 0) {
      const { error: classErr } = await client
        .from('classes')
        .upsert(formattedClasses, { onConflict: 'id' });
      if (classErr) throw new Error(`Erro ao salvar turmas: ${classErr.message}`);
    }

    // 2. Sync Students (Alunos)
    const formattedStudents = students.map((s) => ({
      id: s.id,
      registration_number: s.registrationNumber,
      full_name: s.fullName,
      birth_date: s.birthDate,
      age: s.age,
      gender: s.gender,
      category: s.category,
      preferred_position: s.preferredPosition,
      level: s.level,
      height_cm: s.heightCm || null,
      jersey_number: s.jerseyNumber || null,
      class_id: s.classId || null,
      status: s.status,
      enrollment_date: s.enrollmentDate,
      medical_conditions: s.medicalConditions || null,
      allergies: s.allergies || null,
      guardian: s.guardian,
      notes: s.notes || null,
      avatar_seed: s.avatarSeed || null,
      photo_url: s.photoUrl || null,
      card_valid_until: s.cardValidUntil || '2026-12-31',
      updated_at: new Date().toISOString(),
    }));

    if (formattedStudents.length > 0) {
      const { error: studentErr } = await client
        .from('students')
        .upsert(formattedStudents, { onConflict: 'id' });
      if (studentErr) throw new Error(`Erro ao salvar alunos: ${studentErr.message}`);
    }

    // 3. Sync Attendance Sessions (Presenças em tempo real)
    const formattedSessions = sessions.map((sess) => ({
      id: sess.id,
      class_id: sess.classId,
      date: sess.date,
      instructor_name: sess.instructorName,
      entries: sess.entries || {},
      saved_at: sess.savedAt,
      shift: sess.shift,
      updated_at: new Date().toISOString(),
    }));

    if (formattedSessions.length > 0) {
      const { error: sessErr } = await client
        .from('attendance_sessions')
        .upsert(formattedSessions, { onConflict: 'id' });
      if (sessErr) throw new Error(`Erro ao salvar presenças: ${sessErr.message}`);
    }

    // 4. Sync Notifications (Avisos aos responsáveis)
    const formattedNotifs = notifications.map((n) => ({
      id: n.id,
      student_id: n.studentId,
      student_name: n.studentName,
      guardian_name: n.guardianName,
      guardian_phone: n.guardianPhone,
      guardian_email: n.guardianEmail || null,
      type: n.type,
      message: n.message,
      channel: n.channel,
      sent_at: n.sentAt,
      status: n.status,
    }));

    if (formattedNotifs.length > 0) {
      const { error: notifErr } = await client
        .from('notifications')
        .upsert(formattedNotifs, { onConflict: 'id' });
      if (notifErr) throw new Error(`Erro ao salvar notificações: ${notifErr.message}`);
    }

    const timestamp = new Date().toLocaleString('pt-BR');
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.SUPABASE_LAST_SYNC, timestamp);
    }

    return {
      success: true,
      message: 'Todos os dados foram salvos com sucesso no banco de dados Supabase!',
      stats: {
        studentsCount: formattedStudents.length,
        classesCount: formattedClasses.length,
        sessionsCount: formattedSessions.length,
        notificationsCount: formattedNotifs.length,
        syncedAt: timestamp,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Erro na sincronização com Supabase:', err);
    return {
      success: false,
      message: msg,
    };
  }
}

/**
 * Downloads latest data from Supabase and restores into local storage
 */
export async function fetchFromSupabase(): Promise<{
  success: boolean;
  message: string;
  stats?: SyncStats;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Supabase não configurado.',
    };
  }

  try {
    const { data: dbClasses, error: errC } = await client.from('classes').select('*');
    if (errC) throw new Error(`Erro ao buscar turmas: ${errC.message}`);

    const { data: dbStudents, error: errS } = await client.from('students').select('*');
    if (errS) throw new Error(`Erro ao buscar alunos: ${errS.message}`);

    const { data: dbSessions, error: errA } = await client.from('attendance_sessions').select('*');
    if (errA) throw new Error(`Erro ao buscar presenças: ${errA.message}`);

    const { data: dbNotifs, error: errN } = await client.from('notifications').select('*');
    if (errN) throw new Error(`Erro ao buscar notificações: ${errN.message}`);

    if (dbClasses && dbClasses.length > 0) {
      const mappedClasses: VolleyballClass[] = dbClasses.map((c) => ({
        id: c.id,
        name: c.name,
        category: c.category,
        shift: c.shift,
        startTime: c.start_time,
        endTime: c.end_time,
        daysOfWeek: c.days_of_week,
        instructorName: c.instructor_name,
        court: c.court,
        maxCapacity: c.max_capacity,
        minAge: c.min_age,
        maxAge: c.max_age,
        colorTag: c.color_tag,
      }));
      storageService.saveClasses(mappedClasses);
    }

    if (dbStudents && dbStudents.length > 0) {
      const mappedStudents: Student[] = dbStudents.map((s) => ({
        id: s.id,
        registrationNumber: s.registration_number,
        fullName: s.full_name,
        birthDate: s.birth_date,
        age: s.age,
        gender: s.gender,
        category: s.category,
        preferredPosition: s.preferred_position,
        level: s.level,
        heightCm: s.height_cm,
        jerseyNumber: s.jersey_number,
        classId: s.class_id,
        status: s.status,
        enrollmentDate: s.enrollment_date,
        medicalConditions: s.medical_conditions,
        allergies: s.allergies,
        guardian: s.guardian,
        notes: s.notes,
        avatarSeed: s.avatar_seed,
        photoUrl: s.photo_url,
        cardValidUntil: s.card_valid_until,
      }));
      storageService.saveStudents(mappedStudents);
    }

    if (dbSessions && dbSessions.length > 0) {
      const mappedSessions: DailyAttendanceSession[] = dbSessions.map((sess) => ({
        id: sess.id,
        classId: sess.class_id,
        date: sess.date,
        instructorName: sess.instructor_name,
        entries: sess.entries || {},
        savedAt: sess.saved_at,
        shift: sess.shift,
      }));
      storageService.saveAttendanceSessions(mappedSessions);
    }

    if (dbNotifs && dbNotifs.length > 0) {
      const mappedNotifs: NotificationLog[] = dbNotifs.map((n) => ({
        id: n.id,
        studentId: n.student_id,
        studentName: n.student_name,
        guardianName: n.guardian_name,
        guardianPhone: n.guardian_phone,
        guardianEmail: n.guardian_email,
        type: n.type,
        message: n.message,
        channel: n.channel,
        sentAt: n.sent_at,
        status: n.status,
      }));
      storageService.saveNotifications(mappedNotifs);
    }

    const timestamp = new Date().toLocaleString('pt-BR');

    return {
      success: true,
      message: 'Dados importados do Supabase com sucesso!',
      stats: {
        studentsCount: dbStudents?.length || 0,
        classesCount: dbClasses?.length || 0,
        sessionsCount: dbSessions?.length || 0,
        notificationsCount: dbNotifs?.length || 0,
        syncedAt: timestamp,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: msg,
    };
  }
}

/**
 * Returns the latest synchronization timestamp
 */
export function getLastSyncTime(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEYS.SUPABASE_LAST_SYNC);
}

/**
 * Returns the complete SQL migration for Supabase
 */
export function getSupabaseMigrationSql(): string {
  return `-- =========================================================================
-- VÔLEIPRO - SISTEMA OFICIAL DE GESTÃO E PRESENÇA DA ACADEMIA DE VÔLEI
-- Migration Inicial para Banco de Dados Relacional PostgreSQL (Supabase)
-- =========================================================================

-- 1. Tabela de Turmas, Turnos e Horários
CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  shift TEXT NOT NULL CHECK (shift IN ('Manhã', 'Tarde', 'Noite')),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  days_of_week JSONB NOT NULL DEFAULT '[]'::jsonb,
  instructor_name TEXT NOT NULL,
  court TEXT NOT NULL,
  max_capacity INTEGER NOT NULL DEFAULT 30,
  min_age INTEGER NOT NULL DEFAULT 7,
  max_age INTEGER NOT NULL DEFAULT 17,
  color_tag TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Alunos e Matrículas (Faixa Etária Oficial: 07 a 17 anos)
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  registration_number TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  birth_date TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 7 AND age <= 17),
  gender TEXT NOT NULL,
  category TEXT NOT NULL,
  preferred_position TEXT NOT NULL,
  level TEXT NOT NULL,
  height_cm NUMERIC,
  jersey_number INTEGER,
  class_id TEXT REFERENCES classes(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Em Espera', 'Trancado', 'Pendente')),
  enrollment_date TEXT NOT NULL,
  medical_conditions TEXT,
  allergies TEXT,
  guardian JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  avatar_seed TEXT,
  photo_url TEXT,
  card_valid_until TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de Sessões de Chamada e Frequência em Tempo Real
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  instructor_name TEXT NOT NULL,
  entries JSONB NOT NULL DEFAULT '{}'::jsonb,
  saved_at TEXT NOT NULL,
  shift TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de Logs de Notificações e Mensagens aos Responsáveis
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  guardian_name TEXT NOT NULL,
  guardian_phone TEXT NOT NULL,
  guardian_email TEXT,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'WhatsApp',
  sent_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Enviado',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabela de Credenciais Administrativas do Sistema
CREATE TABLE IF NOT EXISTS admin_credentials (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  last_login TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir credencial inicial padrão
INSERT INTO admin_credentials (id, username, password_hash, updated_at)
VALUES ('admin-root', 'admin', 'volei2026', NOW())
ON CONFLICT (id) DO NOTHING;

-- Índices
CREATE INDEX IF NOT EXISTS idx_students_reg ON students(registration_number);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_sessions(date);
CREATE INDEX IF NOT EXISTS idx_attendance_class ON attendance_sessions(class_id);

-- RLS
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir tudo para classes" ON classes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo para students" ON students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo para attendance_sessions" ON attendance_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo para notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo para admin_credentials" ON admin_credentials FOR ALL USING (true) WITH CHECK (true);`;
}
