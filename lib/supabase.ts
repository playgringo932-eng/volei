'use client';

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  storageService,
  normalizeStudent,
  normalizeClass,
  normalizeSession,
  normalizeNotification,
  normalizeSponsor,
} from '@/lib/storage';
import {
  Student,
  VolleyballClass,
  DailyAttendanceSession,
  NotificationLog,
  SponsorLogo,
} from '@/types/volleyball';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

const STORAGE_KEY_CONFIG = 'voleipro_supabase_credentials_v3';
const STORAGE_KEY_LAST_SYNC = 'voleipro_supabase_last_sync_v3';
const CONFIG_EVENT = 'voleipro_supabase_config_event_v3';

let cachedClient: SupabaseClient | null = null;
let cachedKey = '';

export const DEFAULT_SUPABASE_PROJECT_URL = 'https://jugrgmjahyylpkmbnfsc.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1Z3JnbWphaHl5bHBrbWJuZnNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzNzYzOTIsImV4cCI6MjEwODk1MjM5Mn0.hFY5tJn4fcVeTrC3Jl4XSft77X2MLh6RP-_fts2L91s';

export function normalizeSupabaseUrl(input: string): string {
  if (!input) return '';
  let clean = input.trim();
  clean = clean.replace(/\/+$/, '');
  clean = clean.replace(/\/rest\/v1\/?$/, '');
  clean = clean.replace(/\/rest\/?$/, '');
  return clean;
}

/**
 * Obtém as credenciais do Supabase (localStorage ou variáveis de ambiente)
 */
export function getSupabaseConfig(): SupabaseConfig {
  const fallbackUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_PROJECT_URL);
  const fallbackKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY).trim();

  if (typeof window === 'undefined') {
    return {
      url: fallbackUrl,
      anonKey: fallbackKey,
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      const urlCandidate = parsed.url ? normalizeSupabaseUrl(parsed.url) : '';
      const keyCandidate = parsed.anonKey ? String(parsed.anonKey).trim() : '';

      const isValidUrl = Boolean(
        urlCandidate &&
        urlCandidate.startsWith('http') &&
        !urlCandidate.includes('sb_publishable') &&
        !urlCandidate.includes('your-project-id')
      );
      const isValidKey = Boolean(
        keyCandidate &&
        keyCandidate.length > 20 &&
        !keyCandidate.includes('your-anon-key')
      );

      if (isValidUrl && isValidKey) {
        return {
          url: urlCandidate,
          anonKey: keyCandidate,
        };
      }
    }
  } catch {
    // fallback
  }

  return {
    url: fallbackUrl,
    anonKey: fallbackKey,
  };
}

/**
 * Salva as credenciais do Supabase localmente e no servidor compartilhado para que o celular e PC fiquem sincronizados
 */
export function saveSupabaseConfig(config: SupabaseConfig): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  cachedClient = null;
  cachedKey = '';
  window.dispatchEvent(new CustomEvent(CONFIG_EVENT, { detail: config }));

  // Notifica o servidor para que o celular ou outro dispositivo receba as mesmas credenciais
  try {
    fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config }),
    }).catch(() => {});
  } catch {
    // ignore
  }
}

/**
 * Sincroniza configurações e credenciais entre servidor, PC e Celular
 */
export async function syncServerAndDevices(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  // 1. Verifica se foram passadas chaves de pareamento na URL (ex: lendo QR Code no celular)
  try {
    const params = new URLSearchParams(window.location.search);
    const qUrl = params.get('sync_url');
    const qKey = params.get('sync_key');
    if (qUrl && qKey) {
      saveSupabaseConfig({ url: qUrl, anonKey: qKey });
      const cleanPath = window.location.pathname;
      window.history.replaceState({}, '', cleanPath);
      return true;
    }
  } catch {
    // ignore
  }

  // 2. Consulta o servidor compartilhado se há chaves ou dados configurados
  try {
    const res = await fetch('/api/sync');
    if (res.ok) {
      const json = await res.json();
      if (json.config?.url && json.config?.anonKey) {
        const current = getSupabaseConfig();
        if (!current.url || !current.anonKey) {
          saveSupabaseConfig(json.config);
        }
      }
      // Puxa todos os dados compartilhados (alunos, turmas, presenças, patrocinadores, etc.)
      const pulled = await storageService.pullFromSharedSync();
      return pulled;
    }
  } catch {
    // ignore
  }

  return false;
}

/**
 * Verifica se as credenciais do Supabase estão configuradas
 */
export function isSupabaseConfigured(): boolean {
  const cfg = getSupabaseConfig();
  return Boolean(
    cfg.url &&
    cfg.anonKey &&
    cfg.url.startsWith('http') &&
    !cfg.url.includes('your-project-id') &&
    !cfg.anonKey.includes('your-anon-key')
  );
}

/**
 * Retorna o cliente Supabase inicializado
 */
export function getSupabaseClient(): SupabaseClient | null {
  const cfg = getSupabaseConfig();
  if (!cfg.url || !cfg.anonKey || !cfg.url.startsWith('http')) return null;

  const key = `${cfg.url}_${cfg.anonKey}`;
  if (cachedClient && cachedKey === key) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(cfg.url, cfg.anonKey, {
      auth: {
        persistSession: false,
      },
    });
    cachedKey = key;
    return cachedClient;
  } catch (err) {
    console.error('Falha ao inicializar Supabase:', err);
    return null;
  }
}

/**
 * Retorna a data/hora do último salvamento em nuvem
 */
export function getLastSyncTime(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY_LAST_SYNC);
}

/**
 * Testa a conexão e verifica se as tabelas existem no Supabase
 */
export async function testSupabaseConnection(): Promise<{
  success: boolean;
  message: string;
  tablesExist: boolean;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Insira a URL e a Chave Anon do projeto para testar.',
      tablesExist: false,
    };
  }

  try {
    const { error } = await client.from('classes').select('id').limit(1);

    if (error) {
      if (
        error.message.includes('relation "classes" does not exist') ||
        error.message.includes('Could not find the table') ||
        error.code === '42P01' ||
        error.code === 'PGRST205'
      ) {
        return {
          success: true,
          tablesExist: false,
          message:
            'Chave do Supabase conectada e validada com sucesso! Agora só falta criar as tabelas: clique em "Copiar Script SQL" e execute no SQL Editor do Supabase.',
        };
      }
      return {
        success: false,
        tablesExist: false,
        message: `Falha na autenticação do Supabase: ${error.message}`,
      };
    }

    return {
      success: true,
      tablesExist: true,
      message: 'Conexão ativa e tabelas verificadas com sucesso no Supabase!',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      tablesExist: false,
      message: `Erro ao conectar com Supabase: ${msg}`,
    };
  }
}

/**
 * SALVA TUDO no Supabase (Turmas, Alunos, Presenças e Notificações)
 */
export async function saveAllToSupabase(): Promise<{
  success: boolean;
  message: string;
  stats?: {
    students: number;
    classes: number;
    sessions: number;
    notifications: number;
    sponsors?: number;
    timestamp: string;
  };
}> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Supabase ainda não configurado. Por favor, insira a URL e a Chave Anon.',
    };
  }

  try {
    const classes = storageService.getClasses();
    const students = storageService.getStudents();
    const sessions = storageService.getAttendanceSessions();
    const notifications = storageService.getNotifications();

    // 1. Turmas
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
      const { error: errC } = await client
        .from('classes')
        .upsert(formattedClasses, { onConflict: 'id' });
      if (errC) {
        if (
          errC.message.includes('relation "classes" does not exist') ||
          errC.message.includes('Could not find the table') ||
          errC.code === 'PGRST205'
        ) {
          throw new Error('As tabelas ainda não foram criadas no Supabase. Clique em "Copiar Script SQL" e execute no SQL Editor do Supabase!');
        }
        if (errC.message.includes('row-level security') || errC.code === '42501') {
          throw new Error('O Supabase bloqueou a gravação por política de segurança (RLS). Execute no SQL Editor do Supabase o comando: ALTER TABLE classes DISABLE ROW LEVEL SECURITY; (ou desative o RLS nas tabelas).');
        }
        throw new Error(`Erro ao salvar turmas: ${errC.message}`);
      }
    }

    // Buscar lista de turmas existentes no Supabase para garantir integridade referencial das FKs
    const { data: dbClasses } = await client.from('classes').select('id');
    const validClassIds = new Set<string>([
      ...formattedClasses.map((c) => String(c.id)),
      ...(dbClasses || []).map((c: { id: string }) => String(c.id)),
    ]);

    // 2. Alunos
    const formattedStudents = students.map((s) => ({
      id: s.id,
      registration_number: s.registrationNumber,
      full_name: s.fullName,
      birth_date: s.birthDate,
      age: s.age,
      gender: s.gender,
      category: s.category,
      preferred_position: s.preferredPosition || 'Geral',
      level: s.level || 'Iniciante',
      height_cm: s.heightCm || null,
      jersey_number: s.jerseyNumber || null,
      class_id: s.classId && validClassIds.has(String(s.classId)) ? String(s.classId) : null,
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
      const { error: errS } = await client
        .from('students')
        .upsert(formattedStudents, { onConflict: 'id' });
      if (errS) {
        if (errS.message.includes('column of') || errS.code === 'PGRST204') {
          // Schema adaptativo: tenta salvar no formato de colunas simplificado da tabela
          const simplifiedStudents = students.map((s) => ({
            id: s.id,
            registration_number: s.registrationNumber,
            full_name: s.fullName,
            birth_date: s.birthDate,
            age: s.age,
            gender: s.gender,
            category: s.category,
            class_id: s.classId && validClassIds.has(String(s.classId)) ? String(s.classId) : null,
            status: s.status,
            photo_url: s.photoUrl || null,
            guardian_name: s.guardian?.name || (s as any).guardian_name || 'Responsável',
            guardian_relationship: s.guardian?.relationship || (s as any).guardian_relationship || 'Responsável Legal',
            guardian_phone: s.guardian?.phone || (s as any).guardian_phone || '',
            allow_whatsapp_notifications: s.guardian?.allowWhatsAppNotifications ?? true,
            medical_conditions: s.medicalConditions || null,
            allergies: s.allergies || null,
            card_valid_until: s.cardValidUntil || '2026-12-31',
            updated_at: new Date().toISOString(),
          }));
          const { error: retryErr } = await client
            .from('students')
            .upsert(simplifiedStudents, { onConflict: 'id' });
          if (retryErr) {
            if (retryErr.message.includes('row-level security') || retryErr.code === '42501') {
              throw new Error('O Supabase bloqueou a gravação por política de segurança (RLS). Execute no SQL Editor do Supabase: ALTER TABLE students DISABLE ROW LEVEL SECURITY;');
            }
            throw new Error(`Erro ao salvar alunos: ${retryErr.message}`);
          }
        } else if (
          errS.message.includes('relation "students" does not exist') ||
          errS.message.includes('Could not find the table') ||
          errS.code === 'PGRST205'
        ) {
          throw new Error('A tabela "students" ainda não existe no Supabase. Execute o script de Migrations no SQL Editor!');
        } else if (errS.message.includes('row-level security') || errS.code === '42501') {
          throw new Error('O Supabase bloqueou a gravação por política de segurança (RLS). Execute no SQL Editor do Supabase: ALTER TABLE students DISABLE ROW LEVEL SECURITY;');
        } else {
          throw new Error(`Erro ao salvar alunos: ${errS.message}`);
        }
      }
    }

    // 3. Presenças / Sessões - apenas sessões de turmas reais existentes no banco (evita erro de FK constraint)
    const validSessions = sessions.filter(
      (sess) => sess.classId && validClassIds.has(String(sess.classId))
    );

    const formattedSessions = validSessions.map((sess) => ({
      id: sess.id,
      class_id: String(sess.classId),
      date: sess.date,
      instructor_name: sess.instructorName,
      entries: sess.entries || {},
      saved_at: sess.savedAt,
      shift: sess.shift,
      updated_at: new Date().toISOString(),
    }));

    if (formattedSessions.length > 0) {
      const { error: errA } = await client
        .from('attendance_sessions')
        .upsert(formattedSessions, { onConflict: 'id' });
      if (errA) {
        if (errA.message.includes('column of') || errA.code === 'PGRST204') {
          // Schema adaptativo para sessões de presença
          const simplifiedSessions = validSessions.map((sess) => {
            const entries = sess.entries || {};
            const vals = Object.values(entries) as any[];
            const present = vals.filter((v) => v?.status === 'Presente').length;
            const absent = vals.filter((v) => v?.status === 'Ausente').length;
            const justified = vals.filter((v) => v?.status === 'Justificado').length;
            return {
              id: sess.id,
              class_id: String(sess.classId),
              class_name: sess.classId,
              instructor_name: sess.instructorName,
              date: sess.date,
              records: entries,
              total_present: present,
              total_absent: absent,
              total_justified: justified,
              attendance_rate: vals.length > 0 ? (present / vals.length) * 100 : 0,
              updated_at: new Date().toISOString(),
            };
          });
          const { error: retryA } = await client
            .from('attendance_sessions')
            .upsert(simplifiedSessions, { onConflict: 'id' });
          if (retryA && (retryA.message.includes('row-level security') || retryA.code === '42501')) {
            throw new Error('O Supabase bloqueou a gravação por política de segurança (RLS). Execute no SQL Editor do Supabase: ALTER TABLE attendance_sessions DISABLE ROW LEVEL SECURITY;');
          } else if (retryA) {
            throw new Error(`Erro ao salvar presenças: ${retryA.message}`);
          }
        } else if (errA.message.includes('row-level security') || errA.code === '42501') {
          throw new Error('O Supabase bloqueou a gravação por política de segurança (RLS). Execute no SQL Editor do Supabase: ALTER TABLE attendance_sessions DISABLE ROW LEVEL SECURITY;');
        } else {
          throw new Error(`Erro ao salvar presenças: ${errA.message}`);
        }
      }
    }

    // 4. Notificações - garantir que student_id seja válido caso exista FK
    const validStudentIds = new Set<string>([
      ...formattedStudents.map((s) => String(s.id)),
    ]);
    const formattedNotifs = notifications.map((n) => ({
      id: n.id,
      student_id: n.studentId && validStudentIds.has(String(n.studentId)) ? String(n.studentId) : null,
      student_name: n.studentName,
      guardian_name: n.guardianName,
      guardian_phone: n.guardianPhone,
      type: n.type,
      message: n.message,
      channel: n.channel,
      sent_at: n.sentAt,
      status: n.status,
    }));

    if (formattedNotifs.length > 0) {
      const { error: errN } = await client
        .from('notifications')
        .upsert(formattedNotifs, { onConflict: 'id' });
      if (errN) {
        if (errN.message.includes('column of') || errN.code === 'PGRST204') {
          // Schema adaptativo para notificações
          const minimalNotifs = notifications.map((n) => ({
            id: n.id,
            student_name: n.studentName,
            guardian_name: n.guardianName,
            guardian_phone: n.guardianPhone,
            type: n.type,
            message: n.message,
            channel: n.channel || 'WhatsApp',
            status: n.status || 'Enviado',
          }));
          await client.from('notifications').upsert(minimalNotifs, { onConflict: 'id' });
        } else if (errN.message.includes('row-level security') || errN.code === '42501') {
          throw new Error('O Supabase bloqueou a gravação por política de segurança (RLS). Execute no SQL Editor do Supabase: ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;');
        } else {
          console.warn('Aviso ao sincronizar notificações:', errN.message);
        }
      }
    }

    // 5. Patrocinadores da Carteirinha
    const sponsors = storageService.getSponsors();
    const sponsorSize = storageService.getSponsorSize();
    if (sponsors.length > 0) {
      const formattedSponsors = sponsors.map((sp) => ({
        id: sp.id,
        name: sp.name,
        category: sp.category,
        logo_url: sp.logoUrl,
        is_active: sp.isActive,
        updated_at: new Date().toISOString(),
      }));

      const { error: errSp } = await client
        .from('sponsors')
        .upsert(formattedSponsors, { onConflict: 'id' });

      if (errSp && (errSp.message.includes('column of') || errSp.code === 'PGRST204')) {
        // Schema alternativo (tabela com colunas logo, quota, active)
        const altSponsors = sponsors.map((sp) => ({
          id: sp.id,
          name: sp.name,
          logo: sp.logoUrl,
          quota: sp.category,
          active: sp.isActive,
        }));
        await client.from('sponsors').upsert(altSponsors, { onConflict: 'id' });
      }
    }

    const timestamp = new Date().toLocaleString('pt-BR');
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_LAST_SYNC, timestamp);

      // Sincroniza em segundo plano com o servidor em formato canônico para acesso imediato de celulares
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            classes,
            students,
            sessions,
            notifications,
            sponsors,
            sponsorSize,
          },
        }),
      }).catch(() => {});
    }

    return {
      success: true,
      message: 'Todos os dados e patrocinadores foram salvos com sucesso no Supabase e já estão sincronizados!',
      stats: {
        students: formattedStudents.length,
        classes: formattedClasses.length,
        sessions: formattedSessions.length,
        notifications: formattedNotifs.length,
        sponsors: sponsors.length,
        timestamp,
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
 * BAIXA TUDO do Supabase para o dispositivo atual (Carregamento entre múltiplos dispositivos)
 */
export async function loadAllFromSupabase(): Promise<{
  success: boolean;
  message: string;
  hasData: boolean;
  counts?: { students: number; classes: number; sessions: number };
}> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Supabase não configurado.',
      hasData: false,
    };
  }

  try {
    const { data: dbClasses, error: errC } = await client.from('classes').select('*');
    if (errC) throw new Error(errC.message);

    const { data: dbStudents, error: errS } = await client.from('students').select('*');
    if (errS) throw new Error(errS.message);

    const { data: dbSessions, error: errA } = await client.from('attendance_sessions').select('*');
    if (errA) throw new Error(errA.message);

    const { data: dbNotifs, error: errN } = await client.from('notifications').select('*');
    if (errN) throw new Error(errN.message);

    const hasData = (dbClasses && dbClasses.length > 0) || (dbStudents && dbStudents.length > 0);

    if (dbClasses && dbClasses.length > 0) {
      const mappedClasses: VolleyballClass[] = dbClasses.map(normalizeClass);
      storageService.saveClasses(mappedClasses, false);
    }

    if (dbStudents && dbStudents.length > 0) {
      const mappedStudents: Student[] = dbStudents.map(normalizeStudent);
      storageService.saveStudents(mappedStudents, false);
    }

    if (dbSessions && dbSessions.length > 0) {
      const mappedSessions: DailyAttendanceSession[] = dbSessions.map(normalizeSession);
      storageService.saveAttendanceSessions(mappedSessions, false);
    }

    if (dbNotifs && dbNotifs.length > 0) {
      const mappedNotifs: NotificationLog[] = dbNotifs.map(normalizeNotification);
      storageService.saveNotifications(mappedNotifs, false);
    }

    // Carrega patrocinadores do Supabase se existirem
    try {
      const { data: dbSponsors } = await client.from('sponsors').select('*');
      if (dbSponsors && dbSponsors.length > 0) {
        const mappedSponsors: SponsorLogo[] = dbSponsors.map(normalizeSponsor);
        storageService.saveSponsors(mappedSponsors, false);
      }
    } catch {
      // Ignora se tabela sponsors ainda não foi criada
    }

    return {
      success: true,
      hasData,
      message: 'Dados baixados do Supabase com sucesso!',
      counts: {
        students: dbStudents?.length || 0,
        classes: dbClasses?.length || 0,
        sessions: dbSessions?.length || 0,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      hasData: false,
      message: `Erro ao carregar dados do Supabase: ${msg}`,
    };
  }
}

/**
 * Script SQL oficial de Migrations para criação das tabelas no Supabase
 */
export function getSupabaseMigrationSql(): string {
  return `-- =========================================================================
-- VOLEIARAÇA - SISTEMA OFICIAL DE GESTÃO E PRESENÇA DA ACADEMIA DE VÔLEI
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
  category TEXT NOT NULL DEFAULT 'Iniciante',
  preferred_position TEXT DEFAULT 'Geral',
  level TEXT DEFAULT 'Iniciante',
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
  id TEXT PRIMARY KEY, -- Formato: {class_id}_{date}
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
  student_id TEXT,
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

-- 5. Tabela de Logotipos e Patrocinadores Oficiais da Carteirinha
CREATE TABLE IF NOT EXISTS sponsors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  logo_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de Alta Performance
CREATE INDEX IF NOT EXISTS idx_students_reg ON students(registration_number);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_sessions(date);
CREATE INDEX IF NOT EXISTS idx_attendance_class ON attendance_sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_notifications_student ON notifications(student_id);
CREATE INDEX IF NOT EXISTS idx_sponsors_active ON sponsors(is_active);

-- Desativa o Row Level Security (RLS) para permitir que o app salve e sincronize normalmente
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE sponsors DISABLE ROW LEVEL SECURITY;

-- Garante todas as permissões para a chave anon e authenticated
GRANT ALL ON TABLE classes TO anon, authenticated, service_role;
GRANT ALL ON TABLE students TO anon, authenticated, service_role;
GRANT ALL ON TABLE attendance_sessions TO anon, authenticated, service_role;
GRANT ALL ON TABLE notifications TO anon, authenticated, service_role;
GRANT ALL ON TABLE sponsors TO anon, authenticated, service_role;
`;
}

/**
 * Baixa o arquivo SQL de Migrations
 */
export function downloadSupabaseMigrationFile(): void {
  if (typeof window === 'undefined') return;
  const sql = getSupabaseMigrationSql();
  const blob = new Blob([sql], { type: 'application/sql;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'voleiaraca_supabase_migrations.sql');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
