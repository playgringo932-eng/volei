-- =========================================================================
-- VÔLEIPRO - SISTEMA OFICIAL DE GESTÃO E PRESENÇA DA ACADEMIA DE VÔLEI
-- Migration Inicial para Banco de Dados Relacional PostgreSQL (Supabase)
-- Data: 2026-10-30
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
  id TEXT PRIMARY KEY, -- formato: {class_id}_{date}
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

-- Inserir credencial administrativa padrão inicial (se não existir)
INSERT INTO admin_credentials (id, username, password_hash, updated_at)
VALUES ('admin-root', 'admin', 'volei2026', NOW())
ON CONFLICT (id) DO NOTHING;

-- Índices de Alta Performance
CREATE INDEX IF NOT EXISTS idx_students_reg ON students(registration_number);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_sessions(date);
CREATE INDEX IF NOT EXISTS idx_attendance_class ON attendance_sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_notifications_student ON notifications(student_id);

-- Configuração de Row Level Security (RLS) permissivo para acesso com anon key
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_credentials ENABLE ROW LEVEL SECURITY;

-- Políticas de Leitura e Escrita Públicas (Chave Anon)
DROP POLICY IF EXISTS "Permitir tudo para classes" ON classes;
CREATE POLICY "Permitir tudo para classes" ON classes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo para students" ON students;
CREATE POLICY "Permitir tudo para students" ON students FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo para attendance_sessions" ON attendance_sessions;
CREATE POLICY "Permitir tudo para attendance_sessions" ON attendance_sessions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo para notifications" ON notifications;
CREATE POLICY "Permitir tudo para notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo para admin_credentials" ON admin_credentials;
CREATE POLICY "Permitir tudo para admin_credentials" ON admin_credentials FOR ALL USING (true) WITH CHECK (true);
