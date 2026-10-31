import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface SharedState {
  config: {
    url: string;
    anonKey: string;
  };
  data?: {
    students?: unknown[];
    classes?: unknown[];
    sessions?: unknown[];
    notifications?: unknown[];
    sponsors?: unknown[];
    sponsorSize?: number;
    updatedAt?: string;
  };
}

const CACHE_FILE = path.join('/tmp', 'voleipro_shared_sync.json');

function normalizeSupabaseUrl(input: string): string {
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

// In-memory fallback
let inMemoryState: SharedState = {
  config: {
    url: normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL),
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY,
  },
};

function readSharedState(): SharedState {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        ...inMemoryState,
        ...parsed,
        config: {
          url: normalizeSupabaseUrl(parsed.config?.url || inMemoryState.config.url),
          anonKey: parsed.config?.anonKey || inMemoryState.config.anonKey,
        },
      };
    }
  } catch (err) {
    console.error('Erro ao ler cache compartilhado:', err);
  }
  return inMemoryState;
}

function writeSharedState(state: SharedState): void {
  try {
    inMemoryState = state;
    fs.writeFileSync(CACHE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Erro ao escrever cache compartilhado:', err);
  }
}

/**
 * GET /api/sync
 * Retorna as credenciais e dados compartilhados entre PC e Celular
 */
export async function GET() {
  const state = readSharedState();
  return NextResponse.json({
    success: true,
    config: state.config,
    data: state.data || null,
  });
}

/**
 * POST /api/sync
 * Atualiza as credenciais do Supabase e/ou dados para sincronizar entre todos os aparelhos
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const current = readSharedState();

    const updatedState: SharedState = {
      config: {
        url: body.config?.url?.trim() ?? current.config.url,
        anonKey: body.config?.anonKey?.trim() ?? current.config.anonKey,
      },
      data: body.data
        ? {
            ...(current.data || {}),
            ...body.data,
            updatedAt: new Date().toISOString(),
          }
        : current.data,
    };

    writeSharedState(updatedState);

    return NextResponse.json({
      success: true,
      message: 'Sincronização entre dispositivos atualizada com sucesso no servidor!',
      config: updatedState.config,
      updatedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, message: `Erro na sincronização: ${msg}` },
      { status: 500 }
    );
  }
}
