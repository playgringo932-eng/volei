'use client';

import React, { useState } from 'react';
import {
  X,
  UserCheck,
  AlertCircle,
  CheckCircle,
  Phone,
  Mail,
  HeartPulse,
  Trophy,
  Calendar,
  ShieldCheck,
} from 'lucide-react';
import { Student, VolleyballClass, VolleyballPosition, StudentLevel, EnrollmentStatus } from '@/types/volleyball';
import { validateStudentAge, formatBRPhone, generateRegistrationCode } from '@/lib/volleyballHelpers';
import { readFileAsBase64, getAthletePhoto } from '@/lib/avatarHelpers';
import { Camera, Image as ImageIcon } from 'lucide-react';

interface StudentRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveStudent: (student: Student) => void;
  classes: VolleyballClass[];
  studentToEdit?: Student | null;
  existingStudentsCount: number;
}

const POSITIONS: VolleyballPosition[] = [
  'Levantador(a)',
  'Ponteiro(a)',
  'Oposto(a)',
  'Central',
  'Líbero',
  'Em Formação Geral',
];

const LEVELS: StudentLevel[] = ['Iniciante', 'Intermediário', 'Avançado / Competição'];

interface StudentFormProps {
  onClose: () => void;
  onSaveStudent: (student: Student) => void;
  classes: VolleyballClass[];
  studentToEdit?: Student | null;
  existingStudentsCount: number;
}

function StudentForm({
  onClose,
  onSaveStudent,
  classes,
  studentToEdit,
  existingStudentsCount,
}: StudentFormProps) {
  const defaultDate = studentToEdit?.birthDate || '2014-05-15'; // ~12 years old (Sub-13)

  const [photoUrl, setPhotoUrl] = useState(studentToEdit?.photoUrl || '');
  const [fullName, setFullName] = useState(studentToEdit?.fullName || '');
  const [birthDate, setBirthDate] = useState(defaultDate);
  const [gender, setGender] = useState<'Feminino' | 'Masculino' | 'Outro'>(studentToEdit?.gender || 'Feminino');
  const [preferredPosition, setPreferredPosition] = useState<VolleyballPosition>(
    studentToEdit?.preferredPosition || 'Em Formação Geral'
  );
  const [level, setLevel] = useState<StudentLevel>(studentToEdit?.level || 'Iniciante');
  const [heightCm, setHeightCm] = useState<number | ''>(studentToEdit?.heightCm || '');
  const [jerseyNumber, setJerseyNumber] = useState<number | ''>(studentToEdit?.jerseyNumber || '');
  const [classId, setClassId] = useState(studentToEdit?.classId || classes[0]?.id || '');
  const [status, setStatus] = useState<EnrollmentStatus>(studentToEdit?.status || 'Ativo');
  const [medicalConditions, setMedicalConditions] = useState(studentToEdit?.medicalConditions || '');
  const [allergies, setAllergies] = useState(studentToEdit?.allergies || '');
  const [notes, setNotes] = useState(studentToEdit?.notes || '');

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await readFileAsBase64(file);
      setPhotoUrl(base64);
    } catch {
      alert('Falha ao processar arquivo de foto.');
    }
  };

  // Guardian info
  const [guardianName, setGuardianName] = useState(studentToEdit?.guardian.name || '');
  const [guardianRelationship, setGuardianRelationship] = useState<
    'Mãe' | 'Pai' | 'Tutor(a) Legal' | 'Avô/Avó' | 'Outro'
  >(studentToEdit?.guardian.relationship || 'Mãe');
  const [guardianPhone, setGuardianPhone] = useState(studentToEdit?.guardian.phone || '');
  const [guardianEmail, setGuardianEmail] = useState(studentToEdit?.guardian.email || '');
  const [emergencyPhone, setEmergencyPhone] = useState(studentToEdit?.guardian.emergencyPhone || '');
  const [allowWhatsApp, setAllowWhatsApp] = useState(
    studentToEdit ? studentToEdit.guardian.allowWhatsAppNotifications : true
  );

  // Age validation result
  const [ageValidation, setAgeValidation] = useState(() => validateStudentAge(defaultDate));

  const handleBirthDateChange = (val: string) => {
    setBirthDate(val);
    const result = validateStudentAge(val);
    setAgeValidation(result);
  };

  const handlePhoneChange = (val: string) => {
    setGuardianPhone(formatBRPhone(val));
  };

  const handleEmergencyPhoneChange = (val: string) => {
    setEmergencyPhone(formatBRPhone(val));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!ageValidation.isValid) {
      return;
    }

    if (!fullName.trim() || !guardianName.trim() || !guardianPhone.trim()) {
      alert('Por favor preencha o Nome do Aluno e os dados principais do Responsável.');
      return;
    }

    const todayDate = new Date().toISOString().split('T')[0];

    const studentData: Student = {
      id: studentToEdit ? studentToEdit.id : `std-${Date.now()}`,
      registrationNumber: studentToEdit
        ? studentToEdit.registrationNumber
        : generateRegistrationCode(existingStudentsCount + 1),
      fullName: fullName.trim(),
      birthDate,
      age: ageValidation.age,
      gender,
      category: ageValidation.category || 'Sub-13',
      preferredPosition,
      level,
      heightCm: heightCm ? Number(heightCm) : undefined,
      jerseyNumber: jerseyNumber ? Number(jerseyNumber) : undefined,
      classId: classId || (classes[0]?.id ?? 'turma-m1'),
      status,
      enrollmentDate: studentToEdit ? studentToEdit.enrollmentDate : todayDate,
      medicalConditions: medicalConditions.trim() || undefined,
      allergies: allergies.trim() || undefined,
      notes: notes.trim() || undefined,
      photoUrl: photoUrl || undefined,
      guardian: {
        name: guardianName.trim(),
        relationship: guardianRelationship,
        phone: guardianPhone.trim(),
        email: guardianEmail.trim(),
        emergencyPhone: emergencyPhone.trim() || undefined,
        allowWhatsAppNotifications: allowWhatsApp,
      },
    };

    onSaveStudent(studentData);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Seção 1: Dados do Aluno */}
      <div>
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
          <Trophy className="w-4 h-4 text-blue-700" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            1. Dados Pessoais do Aluno
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Foto do Aluno para Carteirinha */}
          <div className="md:col-span-2 bg-slate-50 border border-blue-200 p-3.5 rounded-2xl flex flex-col sm:flex-row items-center gap-4">
            <div className="w-20 h-24 rounded-xl border-2 border-blue-600 bg-white overflow-hidden shadow-xs shrink-0 flex items-center justify-center relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoUrl || getAthletePhoto(fullName || 'Novo Aluno', gender, Number(jerseyNumber) || undefined)}
                alt="Foto do Aluno"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 text-xs space-y-1.5 text-center sm:text-left">
              <span className="font-bold text-slate-900 block">Foto Oficial para Carteirinha do Atleta</span>
              <p className="text-[11px] text-slate-500">
                A foto será exibida na carteirinha impressa e no crachá do aluno. Você pode enviar uma foto real do dispositivo.
              </p>
              <div className="flex items-center gap-2 justify-center sm:justify-start pt-1">
                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs cursor-pointer shadow-xs transition-colors">
                  <Camera className="w-3.5 h-3.5" />
                  <span>Escolher Foto do Arquivo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
                {photoUrl && (
                  <button
                    type="button"
                    onClick={() => setPhotoUrl('')}
                    className="px-2.5 py-1.5 rounded-xl text-slate-500 hover:text-rose-600 text-xs font-semibold hover:bg-slate-200/60"
                  >
                    Restaurar Padrão
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nome Completo do Aluno *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Gabriel Moreira da Silva"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Data de Nascimento * (Idade permitida: 07 a 17 anos)
            </label>
            <input
              type="date"
              required
              value={birthDate}
              onChange={(e) => handleBirthDateChange(e.target.value)}
              className={`w-full bg-slate-50 border rounded-xl px-4 py-2 text-xs text-slate-900 focus:outline-none transition-colors ${
                ageValidation.isValid
                  ? 'border-slate-200 focus:border-blue-600 focus:bg-white'
                  : 'border-rose-400 bg-rose-50'
              }`}
            />

            <div className="mt-2">
              {birthDate && (
                <div
                  className={`flex items-start gap-2 p-2.5 rounded-xl text-xs ${
                    ageValidation.isValid
                      ? 'bg-blue-50 border border-blue-200 text-blue-800'
                      : 'bg-rose-50 border border-rose-200 text-rose-800'
                  }`}
                >
                  {ageValidation.isValid ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">{ageValidation.age} anos</span> — Categoria:{' '}
                        <span className="font-bold underline text-blue-900">
                          {ageValidation.category}
                        </span>{' '}
                        (Idade dentro do regulamento da modalidade).
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="font-semibold">{ageValidation.errorMessage}</div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Gênero</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
            >
              <option value="Feminino">Feminino</option>
              <option value="Masculino">Masculino</option>
              <option value="Outro">Outro / Misto</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Posição Preferida no Vôlei
            </label>
            <select
              value={preferredPosition}
              onChange={(e) => setPreferredPosition(e.target.value as VolleyballPosition)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
            >
              {POSITIONS.map((pos) => (
                <option key={pos} value={pos}>
                  {pos}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nível Técnico</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as StudentLevel)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
            >
              {LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Altura Estimada (cm)
            </label>
            <input
              type="number"
              placeholder="Ex: 165"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value ? Number(e.target.value) : '')}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nº Camisa / Uniforme
            </label>
            <input
              type="number"
              placeholder="Ex: 7"
              value={jerseyNumber}
              onChange={(e) => setJerseyNumber(e.target.value ? Number(e.target.value) : '')}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Seção 2: Turma, Turno e Horário */}
      <div>
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
          <Calendar className="w-4 h-4 text-blue-700" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            2. Turma, Turno e Horários
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Selecione a Turma *
            </label>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
            >
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  [{cls.shift.toUpperCase()}] {cls.name} — {cls.startTime} às {cls.endTime} (
                  {cls.daysOfWeek.join('/')}) • {cls.court}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Status da Matrícula
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as EnrollmentStatus)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
            >
              <option value="Ativo">Ativo</option>
              <option value="Em Espera">Em Lista de Espera</option>
              <option value="Pendente">Documentação Pendente</option>
              <option value="Trancado">Trancado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Seção 3: Dados do Responsável */}
      <div>
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
          <ShieldCheck className="w-4 h-4 text-blue-700" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            3. Dados do Responsável Legal (Para Notificações Automáticas)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nome do Responsável *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Ana Paula da Silva"
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Grau de Parentesco *
            </label>
            <select
              value={guardianRelationship}
              onChange={(e) => setGuardianRelationship(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
            >
              <option value="Mãe">Mãe</option>
              <option value="Pai">Pai</option>
              <option value="Tutor(a) Legal">Tutor(a) Legal</option>
              <option value="Avô/Avó">Avô/Avó</option>
              <option value="Outro">Outro</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              WhatsApp do Responsável * (Para avisos em tempo real)
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-emerald-600 absolute left-3.5 top-2.5" />
              <input
                type="tel"
                required
                placeholder="(11) 99999-9999"
                value={guardianPhone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              E-mail do Responsável
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                type="email"
                placeholder="responsavel@email.com"
                value={guardianEmail}
                onChange={(e) => setGuardianEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Telefone de Emergência Alternativo
            </label>
            <input
              type="tel"
              placeholder="(11) 98888-7777"
              value={emergencyPhone}
              onChange={(e) => handleEmergencyPhoneChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white font-mono"
            />
          </div>

          <div className="flex items-center pt-4">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700">
              <input
                type="checkbox"
                checked={allowWhatsApp}
                onChange={(e) => setAllowWhatsApp(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 accent-blue-600"
              />
              <span className="font-medium">Autoriza notificações automáticas via WhatsApp</span>
            </label>
          </div>
        </div>
      </div>

      {/* Seção 4: Saúde & Observações */}
      <div>
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
          <HeartPulse className="w-4 h-4 text-blue-700" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            4. Informações Médicas e Observações
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Alergias ou Cuidados Especiais
            </label>
            <input
              type="text"
              placeholder="Ex: Alergia a picada de insetos..."
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Condições de Saúde / Restrições Físicas
            </label>
            <input
              type="text"
              placeholder="Ex: Nenhuma restrição conhecida"
              value={medicalConditions}
              onChange={(e) => setMedicalConditions(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Observações Gerais do Instrutor
            </label>
            <textarea
              rows={2}
              placeholder="Histórico esportivo, metas individuais..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors text-xs font-semibold"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!ageValidation.isValid}
          className={`px-6 py-2.5 rounded-xl font-semibold text-xs shadow-xs transition-all ${
            ageValidation.isValid
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm active:scale-95'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60'
          }`}
        >
          {studentToEdit ? 'Salvar Alterações' : 'Confirmar Matrícula'}
        </button>
      </div>
    </form>
  );
}

export function StudentRegistrationModal({
  isOpen,
  onClose,
  onSaveStudent,
  classes,
  studentToEdit,
  existingStudentsCount,
}: StudentRegistrationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-4">
        {/* Header */}
        <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {studentToEdit ? 'Editar Cadastro de Aluno' : 'Nova Matrícula - Vôlei'}
              </h2>
              <p className="text-xs text-slate-500">
                Idade permitida pelo regulamento: <strong className="text-blue-700">07 a 17 anos</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <StudentForm
          key={studentToEdit?.id || 'new-student'}
          onClose={onClose}
          onSaveStudent={onSaveStudent}
          classes={classes}
          studentToEdit={studentToEdit}
          existingStudentsCount={existingStudentsCount}
        />
      </div>
    </div>
  );
}
