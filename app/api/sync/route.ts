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
import {
  normalizeStudent,
  normalizeClass,
  normalizeSession,
  normalizeNotification,
} from '@/lib/normalization';
import { Student, VolleyballClass, DailyAttendanceSession, NotificationLog } from '@/types/volleyball';

export const dynamic = 'force-dynamic';

/**
 * GET /api/sync
 * Retorna as credenciais de autenticação, configurações e os dados mais recentes
 * sincronizados diretamente do Supabase em nuvem.
 */
export async function GET(req: NextRequest) {
  try {
    const force = req.nextUrl.searchParams.get('force') === 'true';
    const state = await fetchFromSupabaseOnServer(force);
    return NextResponse.json({
      success: true,
      config: state.config,
      adminAuth: state.adminAuth,
      data: state.data,
    });
  } catch (err) {
    console.error('GET /api/sync fallback error:', err);
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
 * Atualiza dados entre dispositivos usando fusão não-destrutiva por ID,
 * garantindo que nenhum aluno ou turma seja apagado acidentalmente por abas ou celulares desatualizados.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const current = await fetchFromSupabaseOnServer();

    const nowIso = new Date().toISOString();

    // Fusão inteligente e aditiva de Alunos (nunca perde alunos criados no Supabase)
    let updatedStudents: Student[] = current.data.students || [];
    if (body.data?.students && Array.isArray(body.data.students)) {
      const studentMap = new Map<string, Student>();
      (current.data.students || []).forEach((s) => studentMap.set(s.id, normalizeStudent(s)));
      body.data.students.forEach((s: any) => {
        if (s && s.id) {
          studentMap.set(String(s.id), normalizeStudent(s));
        }
      });
      if (body.data.deletedStudentId) {
        studentMap.delete(String(body.data.deletedStudentId));
      }
      updatedStudents = Array.from(studentMap.values());
    } else if (body.data?.deletedStudentId) {
      updatedStudents = (current.data.students || []).filter((s) => s.id !== String(body.data.deletedStudentId));
    }

    // Fusão inteligente e aditiva de Turmas
    let updatedClasses: VolleyballClass[] = current.data.classes || [];
    if (body.data?.classes && Array.isArray(body.data.classes)) {
      const classMap = new Map<string, VolleyballClass>();
      (current.data.classes || []).forEach((c) => classMap.set(c.id, normalizeClass(c)));
      body.data.classes.forEach((c: any) => {
        if (c && c.id) {
          classMap.set(String(c.id), normalizeClass(c));
        }
      });
      if (body.data.deletedClassId) {
        classMap.delete(String(body.data.deletedClassId));
      }
      updatedClasses = Array.from(classMap.values());
    } else if (body.data?.deletedClassId) {
      updatedClasses = (current.data.classes || []).filter((c) => c.id !== String(body.data.deletedClassId));
    }

    // Ordenação alfabética estrita para todas as listas
    updatedStudents.sort((a, b) =>
      (a.fullName || '').localeCompare(b.fullName || '', 'pt-BR', { sensitivity: 'base' })
    );
    updatedClasses.sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' })
    );

    // Fusão inteligente de Sessões de Presença
    let updatedSessions: DailyAttendanceSession[] = current.data.sessions || [];
    if (body.data?.sessions && Array.isArray(body.data.sessions)) {
      const sessionMap = new Map<string, DailyAttendanceSession>();
      (current.data.sessions || []).forEach((sess) => sessionMap.set(sess.id, normalizeSession(sess)));
      body.data.sessions.forEach((sess: any) => {
        if (sess && sess.id) {
          sessionMap.set(String(sess.id), normalizeSession(sess));
        }
      });
      updatedSessions = Array.from(sessionMap.values());
    }

    // Fusão inteligente de Notificações
    let updatedNotifications: NotificationLog[] = current.data.notifications || [];
    if (body.data?.notifications && Array.isArray(body.data.notifications)) {
      const notifMap = new Map<string, NotificationLog>();
      (current.data.notifications || []).forEach((n) => notifMap.set(n.id, normalizeNotification(n)));
      body.data.notifications.forEach((n: any) => {
        if (n && n.id) {
          notifMap.set(String(n.id), normalizeNotification(n));
        }
      });
      updatedNotifications = Array.from(notifMap.values());
    }

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
      data: {
        students: updatedStudents,
        classes: updatedClasses,
        sessions: updatedSessions,
        notifications: updatedNotifications,
        sponsors: body.data?.sponsors ?? current.data.sponsors,
        sponsorSize: body.data?.sponsorSize ?? current.data.sponsorSize,
        updatedAt: nowIso,
      },
    };

    writeSharedState(updatedState);

    // Persiste também no Supabase em segundo plano com a versão mesclada e íntegra
    if (body.data) {
      saveToSupabaseOnServer({
        ...body.data,
        students: updatedStudents,
        classes: updatedClasses,
        sessions: updatedSessions,
        notifications: updatedNotifications,
      }).catch((e) => {
        console.warn('Erro assíncrono ao salvar no Supabase:', e);
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Sincronização entre dispositivos atualizada com segurança sem perda de dados!',
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
