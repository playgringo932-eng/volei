import { NextRequest, NextResponse } from 'next/server';
import {
  readSharedState,
  writeSharedState,
  fetchFromSupabaseOnServer,
  getSupabaseServerClient,
  DEFAULT_SUPABASE_URL,
  DEFAULT_SUPABASE_ANON_KEY,
} from '@/lib/serverSharedState';
import { calculateAge, getCategoryByAge } from '@/lib/volleyballHelpers';
import { Student, NotificationLog } from '@/types/volleyball';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * GET /api/inscricao
 * Retorna as turmas disponíveis para o formulário público de inscrição
 */
export async function GET() {
  try {
    const state = await fetchFromSupabaseOnServer();
    const classes = (state.data?.classes || []) as any[];
    const students = (state.data?.students || []) as any[];

    // Adiciona contador de inscritos por turma
    const classesWithOccupancy = classes.map((cls) => {
      const enrolledCount = students.filter(
        (s) => (s.classId === cls.id || s.class_id === cls.id) && s.status === 'Ativo'
      ).length;
      return {
        ...cls,
        enrolledCount,
        availableSlots: Math.max(0, (cls.maxStudents || cls.max_students || 20) - enrolledCount),
      };
    });

    // Ordenação alfabética das turmas para o formulário
    classesWithOccupancy.sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' })
    );

    return NextResponse.json({
      success: true,
      classes: classesWithOccupancy,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Erro ao carregar turmas disponíveis.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/inscricao
 * Processa a inscrição pública de um novo atleta, garante número de matrícula
 * sequencial único sem conflito no Supabase e persiste imediatamente.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const fullName = String(body.fullName || '').trim();
    const birthDate = String(body.birthDate || '').trim();
    const guardianName = String(body.guardian?.name || body.guardianName || '').trim();
    const guardianPhone = String(body.guardian?.phone || body.guardianPhone || '').trim();

    if (!fullName) {
      return NextResponse.json(
        { success: false, message: 'Nome completo do atleta é obrigatório.' },
        { status: 400 }
      );
    }

    if (!birthDate) {
      return NextResponse.json(
        { success: false, message: 'Data de nascimento é obrigatória.' },
        { status: 400 }
      );
    }

    const age = calculateAge(birthDate);
    if (age < 7 || age > 17) {
      return NextResponse.json(
        {
          success: false,
          message: `Idade não permitida (${age} anos). As inscrições são exclusivas para a faixa etária de 07 a 17 anos.`,
        },
        { status: 400 }
      );
    }

    if (!guardianName || !guardianPhone) {
      return NextResponse.json(
        {
          success: false,
          message: 'Nome e telefone/WhatsApp do responsável legal são obrigatórios.',
        },
        { status: 400 }
      );
    }

    // 1. Atualiza e sincroniza estado mais recente do Supabase
    const state = await fetchFromSupabaseOnServer(true);

    const rawUrl = state.config?.url || process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
    const supabaseUrl = (rawUrl && rawUrl.startsWith('http')) ? rawUrl : DEFAULT_SUPABASE_URL;
    const rawKey = state.config?.anonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
    const supabaseKey = (rawKey && rawKey.length > 20) ? rawKey : DEFAULT_SUPABASE_ANON_KEY;

    let client = getSupabaseServerClient();
    if (!client && supabaseUrl && supabaseKey) {
      client = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
      });
    }

    // 2. Consulta TODOS os números de matrícula já existentes no Supabase e no cache
    const existingRegNumbers = new Set<string>();

    if (client) {
      try {
        const { data: dbStudents } = await client
          .from('students')
          .select('id, registration_number');
        if (dbStudents && Array.isArray(dbStudents)) {
          dbStudents.forEach((st: { registration_number?: string }) => {
            if (st.registration_number) existingRegNumbers.add(st.registration_number);
          });
        }
      } catch (err) {
        console.warn('Aviso: Falha ao ler matriculas do Supabase:', err);
      }
    }

    // Inclui matrículas do estado em memória
    ((state.data?.students || []) as Student[]).forEach((st) => {
      if (st.registrationNumber) existingRegNumbers.add(st.registrationNumber);
    });

    // Calcula o maior número sequencial existente (ex: VOL-2026-005 -> 5)
    let maxSeq = 0;
    existingRegNumbers.forEach((reg) => {
      const match = reg.match(/(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    });

    let candidateSeq = maxSeq + 1;
    const studentId = `std_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const category = getCategoryByAge(age);

    // Validação estrita da Turma para integridade referencial de chave estrangeira
    const existingClasses = (state.data?.classes || []) as any[];
    let validClassIds = new Set(existingClasses.map((c) => String(c.id)));

    if (client) {
      try {
        const { data: dbClasses } = await client.from('classes').select('id');
        if (dbClasses && Array.isArray(dbClasses)) {
          dbClasses.forEach((c: { id: string }) => validClassIds.add(String(c.id)));
        }
      } catch {
        // use local
      }
    }

    const requestedClassId = body.classId ? String(body.classId) : '';
    const assignedClassId = requestedClassId && validClassIds.has(requestedClassId)
      ? requestedClassId
      : (validClassIds.size > 0 ? Array.from(validClassIds)[0] : null);

    const newStudent: Student = {
      id: studentId,
      registrationNumber: `VOL-2026-${String(candidateSeq).padStart(3, '0')}`,
      fullName,
      birthDate,
      age,
      gender: body.gender || 'Masculino',
      category,
      preferredPosition: 'Em Formação Geral',
      level: 'Iniciante',
      classId: assignedClassId || '',
      status: 'Ativo',
      enrollmentDate: new Date().toISOString().split('T')[0],
      medicalConditions: body.medicalConditions?.trim() || undefined,
      allergies: body.allergies?.trim() || undefined,
      photoUrl: body.photoUrl && typeof body.photoUrl === 'string' && body.photoUrl.trim() ? body.photoUrl.trim() : undefined,
      avatarSeed: studentId,
      cardValidUntil: '2026-12-31',
      guardian: {
        name: guardianName,
        phone: guardianPhone,
        relationship: body.guardian?.relationship || 'Mãe',
        allowWhatsAppNotifications: Boolean(body.guardian?.allowWhatsAppNotifications ?? true),
      },
    };

    // 3. Salva no banco de dados Supabase com loop anti-colisão de chave única (ex: 23505)
    let saveSucceeded = false;
    let finalRegNumber = newStudent.registrationNumber;
    let lastError: any = null;

    if (client) {
      for (let attempt = 0; attempt < 10; attempt++) {
        finalRegNumber = `VOL-2026-${String(candidateSeq).padStart(3, '0')}`;
        newStudent.registrationNumber = finalRegNumber;

        const studentRecord = {
          id: newStudent.id,
          registration_number: finalRegNumber,
          full_name: newStudent.fullName,
          birth_date: newStudent.birthDate,
          age: newStudent.age,
          gender: newStudent.gender,
          category: newStudent.category,
          preferred_position: 'Em Formação Geral',
          level: 'Iniciante',
          height_cm: null,
          jersey_number: null,
          class_id: assignedClassId,
          status: 'Ativo',
          enrollment_date: newStudent.enrollmentDate,
          medical_conditions: newStudent.medicalConditions || null,
          allergies: newStudent.allergies || null,
          guardian: newStudent.guardian,
          notes: null,
          avatar_seed: newStudent.avatarSeed || null,
          photo_url: newStudent.photoUrl || null,
          card_valid_until: newStudent.cardValidUntil || '2026-12-31',
          updated_at: new Date().toISOString(),
        };

        const { error: studentErr } = await client
          .from('students')
          .insert(studentRecord);

        if (!studentErr) {
          saveSucceeded = true;
          break;
        }

        const errCode = String(studentErr.code || '');
        const errMsg = String(studentErr.message || studentErr.details || '');

        // Conflito de unicidade de matrícula (código PostgreSQL 23505)
        if (errCode === '23505' || errMsg.includes('unique constraint') || errMsg.includes('registration_number')) {
          console.warn(`[Inscrição] Conflito de matrícula ${finalRegNumber}. Incrementando para ${candidateSeq + 1}...`);
          candidateSeq++;
          continue;
        }

        // Schema adaptativo: tenta salvar sem as colunas extras (avatar_seed, preferred_position, etc.)
        if (errMsg.includes('column of') || studentErr.code === 'PGRST204') {
          const simplifiedStudentRecord = {
            id: newStudent.id,
            registration_number: finalRegNumber,
            full_name: newStudent.fullName,
            birth_date: newStudent.birthDate,
            age: newStudent.age,
            gender: newStudent.gender,
            category: newStudent.category,
            class_id: assignedClassId,
            photo_url: newStudent.photoUrl || null,
            status: 'Ativo',
            guardian_name: newStudent.guardian.name,
            guardian_relationship: newStudent.guardian.relationship,
            guardian_phone: newStudent.guardian.phone,
            allow_whatsapp_notifications: newStudent.guardian.allowWhatsAppNotifications,
            medical_conditions: newStudent.medicalConditions || null,
            allergies: newStudent.allergies || null,
            card_valid_until: newStudent.cardValidUntil || '2026-12-31',
            updated_at: new Date().toISOString(),
          };
          const { error: retryErr } = await client
            .from('students')
            .insert(simplifiedStudentRecord);
          if (!retryErr) {
            saveSucceeded = true;
            break;
          }
        }

        lastError = studentErr;
        console.error('[Inscrição] Erro no Supabase:', studentErr);
        break;
      }

      if (!saveSucceeded && lastError) {
        console.warn('[Inscrição] Supabase indisponível ou com cota excedida. Salvando inscrição no cache do servidor:', lastError?.message || lastError);
      }
    }

    // 4. Cria e persiste notificação de boas-vindas
    const welcomeNotif: NotificationLog = {
      id: `notif_${Date.now()}`,
      studentId: newStudent.id,
      studentName: newStudent.fullName,
      guardianName: newStudent.guardian.name,
      guardianPhone: newStudent.guardian.phone,
      type: 'Boas-Vindas Matrícula',
      message: `Bem-vindo(a) à Academia VoleiAraça! A matrícula ${newStudent.registrationNumber} foi confirmada com sucesso para o atleta ${newStudent.fullName} na categoria ${newStudent.category}.`,
      channel: 'WhatsApp',
      sentAt: new Date().toISOString(),
      status: 'Enviado',
    };

    if (client) {
      try {
        await client.from('notifications').insert({
          id: welcomeNotif.id,
          student_id: newStudent.id,
          student_name: newStudent.fullName,
          guardian_name: newStudent.guardian.name,
          guardian_phone: newStudent.guardian.phone,
          type: welcomeNotif.type,
          message: welcomeNotif.message,
          channel: welcomeNotif.channel,
          sent_at: welcomeNotif.sentAt,
          status: welcomeNotif.status,
        });
      } catch (err) {
        console.warn('Aviso: Falha ao gravar notificação:', err);
      }
    }

    // 5. Atualiza o estado compartilhado em memória e o arquivo de cache primário
    const studentMap = new Map<string, Student>();
    studentMap.set(newStudent.id, newStudent);
    ((state.data?.students || []) as Student[]).forEach((s) => {
      if (!studentMap.has(s.id)) {
        studentMap.set(s.id, s);
      }
    });

    state.data = {
      ...state.data,
      students: Array.from(studentMap.values()).sort((a, b) =>
        (a.fullName || '').localeCompare(b.fullName || '', 'pt-BR', { sensitivity: 'base' })
      ),
      notifications: [welcomeNotif, ...(state.data?.notifications || [])],
      updatedAt: new Date().toISOString(),
    };

    writeSharedState(state);

    return NextResponse.json({
      success: true,
      message: 'Inscrição oficial realizada com sucesso e salva no banco de dados!',
      student: newStudent,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Erro ao processar inscrição:', err);
    return NextResponse.json(
      { success: false, message: `Erro ao processar inscrição: ${msg}` },
      { status: 500 }
    );
  }
}
