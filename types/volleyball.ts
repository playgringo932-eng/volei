export type ShiftType = 'Manhã' | 'Tarde' | 'Noite';

export type WeekDay = 'Segunda' | 'Terça' | 'Quarta' | 'Quinta' | 'Sexta' | 'Sábado';

export type VolleyballCategory = 'Sub-9' | 'Sub-11' | 'Sub-13' | 'Sub-15' | 'Sub-17';

export type VolleyballPosition = 
  | 'Levantador(a)' 
  | 'Ponteiro(a)' 
  | 'Oposto(a)' 
  | 'Central' 
  | 'Líbero' 
  | 'Em Formação Geral';

export type StudentLevel = 'Iniciante' | 'Intermediário' | 'Avançado / Competição';

export type EnrollmentStatus = 'Ativo' | 'Em Espera' | 'Trancado' | 'Pendente';

export type AttendanceStatus = 'presente' | 'falta' | 'justificada' | 'atraso';

export interface Guardian {
  name: string;
  relationship: 'Mãe' | 'Pai' | 'Tutor(a) Legal' | 'Avô/Avó' | 'Outro';
  phone: string; // WhatsApp formatted
  email: string;
  emergencyPhone?: string;
  allowWhatsAppNotifications: boolean;
}

export interface Student {
  id: string;
  registrationNumber: string; // ex: "VOL-2026-001"
  fullName: string;
  birthDate: string; // YYYY-MM-DD
  age: number; // strictly 7 to 17
  gender: 'Feminino' | 'Masculino' | 'Outro';
  category: VolleyballCategory; // Calculated from age
  preferredPosition: VolleyballPosition;
  level: StudentLevel;
  heightCm?: number;
  jerseyNumber?: number;
  classId: string; // Linked to Turma
  status: EnrollmentStatus;
  enrollmentDate: string;
  medicalConditions?: string;
  allergies?: string;
  guardian: Guardian;
  notes?: string;
  avatarSeed?: string;
  photoUrl?: string; // Base64 data URL or photo link
  cardValidUntil?: string; // YYYY-MM-DD or MM/YYYY
}

export interface VolleyballClass {
  id: string;
  name: string; // ex: "Sub-13 Iniciante A"
  shift: ShiftType;
  startTime: string; // "08:00"
  endTime: string; // "09:30"
  daysOfWeek: WeekDay[];
  court: string; // "Quadra Principal", "Quadra 2", "Quadra de Areia"
  instructorName: string;
  maxCapacity: number;
  minAge: number;
  maxAge: number;
  category: VolleyballCategory;
  colorTag: string;
}

export interface AttendanceEntry {
  studentId: string;
  status: AttendanceStatus;
  note?: string;
  timestamp: string;
}

export interface DailyAttendanceSession {
  id: string; // classId_YYYY-MM-DD
  classId: string;
  date: string; // YYYY-MM-DD
  instructorName: string;
  entries: Record<string, { status: AttendanceStatus; note?: string; updatedAt: string }>;
  savedAt: string;
  shift: ShiftType;
}

export interface NotificationLog {
  id: string;
  studentId: string;
  studentName: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail?: string;
  type: 'Falta no Treino' | 'Alerta Baixa Frequência' | 'Aviso Geral' | 'Boas-Vindas Matrícula';
  message: string;
  channel: 'WhatsApp' | 'Email' | 'SMS';
  sentAt: string;
  status: 'Enviado' | 'Pendente' | 'Simulado';
}

export interface AttendanceSummary {
  studentId: string;
  totalClasses: number;
  presentCount: number;
  absentCount: number;
  justifiedCount: number;
  lateCount: number;
  attendanceRate: number; // 0 to 100%
  consecutiveAbsences: number;
  isAtRisk: boolean; // attendanceRate < 75%
}
