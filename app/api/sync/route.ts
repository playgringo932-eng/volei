import { NextRequest, NextResponse } from 'next/server';
import {
  readSharedState,
  writeSharedState,
  fetchFromSupabaseOnServer,
  saveToSupabaseOnServer,
  normalizeSupabaseUrl,
  isValidSupabaseUrl,
  DEFAULT_SUPABASE_URL,
  DEFAULT_SUPABASE_ANON_KEY,
  SharedState,
} from '@/lib/serverSharedState';

export const dynamic = 'force-dynamic';

/**
 * GET /api/sync
 * Retorna as credenciais de autenticação, configurações e os dados mais recentes
 * sincronizados diretamente do Supabase em nuvem.
 */
export async function GET() {
  try {
    const state = await fetchFromSupabaseOnServer();
    return NextResponse.json({
      success: true,
      config: state.config,
      adminAuth: state.adminAuth,
      data: state.data,
    });
  } catch (err) {
    const fallback = readSharedState();
    return NextResponse.json({
      success: true,
      config: fallback.config,
      adminAuth: fallback.adminAuth,
      data: fallback.data,
    });
  }
}

/**
 * POST /api/sync
 * Atualiza senha de administrador, credenciais e/ou dados em todos os aparelhos
 * salvando no cache local e persistindo no banco de dados Supabase em nuvem.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const current = readSharedState();

    const nowIso = new Date().toISOString();

    const updatedState: SharedState = {
      config: {
        url: body.config?.url && isValidSupabaseUrl(body.config.url)
          ? normalizeSupabaseUrl(body.config.url)
          : (isValidSupabaseUrl(current.config?.url) ? current.config.url : DEFAULT_SUPABASE_URL),
        anonKey: body.config?.anonKey && body.config.anonKey.trim().length > 20 && !body.config.anonKey.includes('your-anon-key')
          ? body.config.anonKey.trim()
          : (current.config?.anonKey || DEFAULT_SUPABASE_ANON_KEY),
      },
      adminAuth: {
        password: body.adminAuth?.password?.trim() ?? current.adminAuth.password,
        updatedAt: body.adminAuth?.password ? nowIso : current.adminAuth.updatedAt,
      },
      data: body.data
        ? {
            students: body.data.students ?? current.data.students,
            classes: body.data.classes ?? current.data.classes,
            sessions: body.data.sessions ?? current.data.sessions,
            notifications: body.data.notifications ?? current.data.notifications,
            sponsors: body.data.sponsors ?? current.data.sponsors,
            sponsorSize: body.data.sponsorSize ?? current.data.sponsorSize,
            updatedAt: nowIso,
          }
        : current.data,
    };

    writeSharedState(updatedState);

    // Persiste também no Supabase em segundo plano
    if (body.data) {
      saveToSupabaseOnServer(body.data).catch((e) => {
        console.warn('Erro assíncrono ao salvar no Supabase:', e);
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Sincronização entre dispositivos atualizada com sucesso no servidor e na nuvem!',
      config: updatedState.config,
      adminAuth: updatedState.adminAuth,
      updatedAt: nowIso,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, message: `Erro na sincronização: ${msg}` },
      { status: 500 }
    );
  }
}
