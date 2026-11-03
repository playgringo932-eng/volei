import fs from 'fs';
import path from 'path';
import {
  INITIAL_CLASSES,
  INITIAL_STUDENTS,
  generateInitialAttendanceSessions,
  INITIAL_NOTIFICATIONS,
} from '@/lib/mockData';
import { DEFAULT_SPONSORS } from '@/lib/sponsorPresets';

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
    students: unknown[];
    classes: unknown[];
    sessions: unknown[];
    notifications: unknown[];
    sponsors: unknown[];
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

const DEFAULT_SUPABASE_URL = 'https://jugrgmjahyylpkmbnfsc.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
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
    students: INITIAL_STUDENTS,
    classes: INITIAL_CLASSES,
    sessions: generateInitialAttendanceSessions(),
    notifications: INITIAL_NOTIFICATIONS,
    sponsors: DEFAULT_SPONSORS,
    sponsorSize: 28,
    updatedAt: new Date().toISOString(),
  },
};

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
      inMemoryState = {
        config: {
          url: normalizeSupabaseUrl(parsed.config?.url || inMemoryState.config.url),
          anonKey: parsed.config?.anonKey || inMemoryState.config.anonKey,
        },
        adminAuth: {
          password: parsed.adminAuth?.password || inMemoryState.adminAuth.password || 'admin',
          updatedAt: parsed.adminAuth?.updatedAt || inMemoryState.adminAuth.updatedAt,
        },
        data: {
          students: Array.isArray(parsed.data?.students) && parsed.data.students.length > 0 ? parsed.data.students : inMemoryState.data.students,
          classes: Array.isArray(parsed.data?.classes) && parsed.data.classes.length > 0 ? parsed.data.classes : inMemoryState.data.classes,
          sessions: Array.isArray(parsed.data?.sessions) && parsed.data.sessions.length > 0 ? parsed.data.sessions : inMemoryState.data.sessions,
          notifications: Array.isArray(parsed.data?.notifications) && parsed.data.notifications.length > 0 ? parsed.data.notifications : inMemoryState.data.notifications,
          sponsors: Array.isArray(parsed.data?.sponsors) && parsed.data.sponsors.length > 0 ? parsed.data.sponsors : inMemoryState.data.sponsors,
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
