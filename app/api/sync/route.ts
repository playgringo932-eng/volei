import { NextRequest, NextResponse } from 'next/server';
import {
  readSharedState,
  writeSharedState,
  normalizeSupabaseUrl,
  SharedState,
} from '@/lib/serverSharedState';

export const dynamic = 'force-dynamic';

/**
 * GET /api/sync
 * Retorna as credenciais de autenticação, configurações e dados compartilhados
 */
export async function GET() {
  const state = readSharedState();
  return NextResponse.json({
    success: true,
    config: state.config,
    adminAuth: state.adminAuth,
    data: state.data,
  });
}

/**
 * POST /api/sync
 * Atualiza senha de administrador, credenciais e/ou dados em todos os aparelhos
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const current = readSharedState();

    const nowIso = new Date().toISOString();

    const updatedState: SharedState = {
      config: {
        url: body.config?.url ? normalizeSupabaseUrl(body.config.url) : current.config.url,
        anonKey: body.config?.anonKey?.trim() ?? current.config.anonKey,
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

    return NextResponse.json({
      success: true,
      message: 'Sincronização entre dispositivos atualizada com sucesso no servidor!',
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
