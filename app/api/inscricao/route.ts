import { NextRequest, NextResponse } from 'next/server';
import { readSharedState, writeSharedState } from '@/lib/serverSharedState';
import { calculateAge, getCategoryByAge } from '@/lib/volleyballHelpers';
import { Student } from '@/types/volleyball';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * GET /api/inscricao
 * Retorna as turmas disponíveis para o formulário público de inscrição
 */
export async function GET() {
  try {
    const state = readSharedState();
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

    return NextResponse.json({
      success: true,
      classes: classesWithOccupancy,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: 'Erro ao carregar turmas disponíveis.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/inscricao
 * Processa a inscrição pública de um novo atleta e salva no sistema oficial
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const fullName = String(body.fullName || '').trim();
    const birthDate = String(body.birthDate || '').trim();
    const guardianName = String(body.guardian?.name || '').trim();
    const guardianPhone = String(body.guardian?.phone || '').trim();

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

    const state = readSharedState();
    const existingStudents = ((state.data?.students || []) as Student[]);

    // Gera o próximo número de matrícula oficial sequencial (ex: VOL-2026-009)
    let nextSeq = 1;
    existingStudents.forEach((st) => {
      const match = (st.registrationNumber || '').match(/(\d+)$/);
      if (match) {
        const val = parseInt(match[1], 10);
        if (!isNaN(val) && val >= nextSeq) {
          nextSeq = val + 1;
        }
      }
    });

    const regNumber = `VOL-2026-${String(nextSeq).padStart(3, '0')}`;
    const studentId = `std_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const category = getCategoryByAge(age);

    const newStudent: Student = {
      id: studentId,
      registrationNumber: regNumber,
      fullName,
      birthDate,
      age,
      gender: body.gender || 'Masculino',
      category,
      preferredPosition: body.preferredPosition || 'Ponteiro(a)',
      level: body.level || 'Iniciante',
      heightCm: body.heightCm ? Number(body.heightCm) : undefined,
      jerseyNumber: body.jerseyNumber ? Number(body.jerseyNumber) : undefined,
      classId: body.classId || 'turma-m1',
      status: 'Ativo',
      enrollmentDate: new Date().toISOString().split('T')[0],
      medicalConditions: body.medicalConditions?.trim() || undefined,
      allergies: body.allergies?.trim() || undefined,
      notes: body.notes?.trim() || 'Inscrição realizada via formulário público online.',
      avatarSeed: studentId,
      cardValidUntil: '2026-12-31',
      guardian: {
        name: guardianName,
        phone: guardianPhone,
        relationship: body.guardian?.relationship || 'Mãe',
        email: body.guardian?.email?.trim() || '',
        allowWhatsAppNotifications: Boolean(body.guardian?.allowWhatsAppNotifications ?? true),
      },
    };

    // Notificação de boas-vindas
    const welcomeNotif = {
      id: `notif_${Date.now()}`,
      studentId: newStudent.id,
      studentName: newStudent.fullName,
      guardianName: newStudent.guardian.name,
      guardianPhone: newStudent.guardian.phone,
      guardianEmail: newStudent.guardian.email,
      type: 'Boas-Vindas Matrícula',
      message: `Bem-vindo(a) à Academia VoleiAraça! A matrícula ${newStudent.registrationNumber} foi confirmada com sucesso para o atleta ${newStudent.fullName} na categoria ${newStudent.category}.`,
      channel: 'WhatsApp',
      sentAt: new Date().toISOString(),
      status: 'Enviado',
    };

    // Salva no estado compartilhado do servidor
    const updatedStudents = [newStudent, ...existingStudents];
    const updatedNotifications = [welcomeNotif, ...(state.data?.notifications || [])];

    state.data = {
      ...state.data,
      students: updatedStudents,
      notifications: updatedNotifications,
      updatedAt: new Date().toISOString(),
    };

    writeSharedState(state);

    // Se o Supabase estiver configurado, salva também remotamente
    if (state.config?.url && state.config?.anonKey) {
      try {
        const client = createClient(state.config.url, state.config.anonKey, {
          auth: { persistSession: false },
        });

        const record = {
          id: newStudent.id,
          registration_number: newStudent.registrationNumber,
          full_name: newStudent.fullName,
          birth_date: newStudent.birthDate,
          age: newStudent.age,
          gender: newStudent.gender,
          category: newStudent.category,
          preferred_position: newStudent.preferredPosition,
          level: newStudent.level,
          height_cm: newStudent.heightCm || null,
          jersey_number: newStudent.jerseyNumber || null,
          class_id: newStudent.classId,
          status: newStudent.status,
          enrollment_date: newStudent.enrollmentDate,
          medical_conditions: newStudent.medicalConditions || null,
          allergies: newStudent.allergies || null,
          notes: newStudent.notes || null,
          guardian_name: newStudent.guardian.name,
          guardian_phone: newStudent.guardian.phone,
          guardian_relationship: newStudent.guardian.relationship,
          guardian_email: newStudent.guardian.email || null,
          allow_whatsapp_notifications: newStudent.guardian.allowWhatsAppNotifications,
          avatar_seed: newStudent.avatarSeed,
          card_valid_until: newStudent.cardValidUntil,
        };

        await client.from('students').upsert(record, { onConflict: 'id' });
      } catch (err) {
        console.warn('Aviso: Falha não crítica ao salvar no Supabase:', err);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Inscrição oficial realizada com sucesso!',
      student: newStudent,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, message: `Erro ao processar inscrição: ${msg}` },
      { status: 500 }
    );
  }
}
