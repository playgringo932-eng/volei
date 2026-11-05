'use client';

import React, { useState } from 'react';
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Plus,
  Edit,
  Trash2,
  X,
  UserCheck,
} from 'lucide-react';
import { VolleyballClass, Student, ShiftType, WeekDay, VolleyballCategory } from '@/types/volleyball';
import { normalizeCategory } from '@/lib/volleyballHelpers';

interface ClassesManagementProps {
  classes: VolleyballClass[];
  students: Student[];
  onAddClass: (cls: VolleyballClass) => void;
  onUpdateClass: (cls: VolleyballClass) => void;
  onDeleteClass: (id: string) => void;
  onSelectClassToCall?: (classId: string) => void;
}

const ALL_WEEKDAYS: WeekDay[] = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function ClassesManagement({
  classes,
  students,
  onAddClass,
  onUpdateClass,
  onDeleteClass,
  onSelectClassToCall,
}: ClassesManagementProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<VolleyballClass | null>(null);
  const [classPendingDelete, setClassPendingDelete] = useState<VolleyballClass | null>(null);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<'all' | 'Sub-10' | 'Sub-13' | 'Sub-17'>('all');

  const [name, setName] = useState('');
  const [shift, setShift] = useState<ShiftType>('Manhã');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:30');
  const [daysOfWeek, setDaysOfWeek] = useState<WeekDay[]>(['Segunda', 'Quarta', 'Sexta']);
  const [court, setCourt] = useState('Quadra Central 1');
  const [instructorName, setInstructorName] = useState('Prof. Carlos Eduardo');
  const [maxCapacity, setMaxCapacity] = useState(18);
  const [category, setCategory] = useState<VolleyballCategory>('Sub-10');
  const [minAge, setMinAge] = useState(7);
  const [maxAge, setMaxAge] = useState(10);

  const handleCategoryChange = (newCat: VolleyballCategory) => {
    setCategory(newCat);
    if (newCat === 'Sub-10') {
      setMinAge(7);
      setMaxAge(10);
    } else if (newCat === 'Sub-13') {
      setMinAge(11);
      setMaxAge(13);
    } else if (newCat === 'Sub-17') {
      setMinAge(14);
      setMaxAge(17);
    }
  };

  const openNewModal = () => {
    setEditingClass(null);
    setName('');
    setShift('Manhã');
    setStartTime('08:00');
    setEndTime('09:30');
    setDaysOfWeek(['Segunda', 'Quarta', 'Sexta']);
    setCourt('Quadra Central 1');
    setInstructorName('Prof. Carlos Eduardo');
    setMaxCapacity(18);
    setCategory('Sub-10');
    setMinAge(7);
    setMaxAge(10);
    setIsModalOpen(true);
  };

  const openEditModal = (cls: VolleyballClass) => {
    setEditingClass(cls);
    setName(cls.name);
    setShift(cls.shift);
    setStartTime(cls.startTime);
    setEndTime(cls.endTime);
    setDaysOfWeek(cls.daysOfWeek);
    setCourt(cls.court);
    setInstructorName(cls.instructorName);
    setMaxCapacity(cls.maxCapacity);
    const cat = normalizeCategory(cls.category, cls.maxAge);
    setCategory(cat);
    setMinAge(cls.minAge || (cat === 'Sub-10' ? 7 : cat === 'Sub-13' ? 11 : 14));
    setMaxAge(cls.maxAge || (cat === 'Sub-10' ? 10 : cat === 'Sub-13' ? 13 : 17));
    setIsModalOpen(true);
  };

  const toggleDay = (day: WeekDay) => {
    if (daysOfWeek.includes(day)) {
      if (daysOfWeek.length > 1) {
        setDaysOfWeek(daysOfWeek.filter((d) => d !== day));
      }
    } else {
      setDaysOfWeek([...daysOfWeek, day]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !instructorName.trim()) return;

    const classData: VolleyballClass = {
      id: editingClass ? editingClass.id : `turma-${Date.now()}`,
      name: name.trim(),
      shift,
      startTime,
      endTime,
      daysOfWeek,
      court: court.trim(),
      instructorName: instructorName.trim(),
      maxCapacity: Number(maxCapacity) || 16,
      minAge: Number(minAge) || 7,
      maxAge: Number(maxAge) || 17,
      category,
      colorTag: 'bg-blue-50 text-blue-700 border-blue-200',
    };

    if (editingClass) {
      onUpdateClass(classData);
    } else {
      onAddClass(classData);
    }
    setIsModalOpen(false);
  };

  const shifts: ShiftType[] = ['Manhã', 'Tarde', 'Noite'];

  // Filter classes by selected Sub category, ordered alphabetically
  const filteredClasses = classes
    .filter((c) => {
      if (selectedCategoryTab === 'all') return true;
      return normalizeCategory(c.category, c.maxAge) === selectedCategoryTab;
    })
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' }));

  // Stats for the 3 official subs
  const sub10Classes = classes.filter((c) => normalizeCategory(c.category, c.maxAge) === 'Sub-10');
  const sub13Classes = classes.filter((c) => normalizeCategory(c.category, c.maxAge) === 'Sub-13');
  const sub17Classes = classes.filter((c) => normalizeCategory(c.category, c.maxAge) === 'Sub-17');

  const sub10Students = students.filter((s) => s.status === 'Ativo' && normalizeCategory(s.category, s.age) === 'Sub-10');
  const sub13Students = students.filter((s) => s.status === 'Ativo' && normalizeCategory(s.category, s.age) === 'Sub-13');
  const sub17Students = students.filter((s) => s.status === 'Ativo' && normalizeCategory(s.category, s.age) === 'Sub-17');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-blue-700" />
            <h2 className="text-lg font-bold text-slate-900">Grade de Turmas, Turnos e Categorias</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Divisão oficial dos subs: <strong>Sub-10 (07 a 10 anos)</strong>, <strong>Sub-13 (11 a 13 anos)</strong> e <strong>Sub-17 (14 a 17 anos)</strong>
          </p>
        </div>

        <button
          onClick={openNewModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs hover:shadow transition-all active:scale-95 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Nova Turma de Vôlei</span>
        </button>
      </div>

      {/* Official Subs Categorization Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Sub-10 */}
        <div
          onClick={() => setSelectedCategoryTab(selectedCategoryTab === 'Sub-10' ? 'all' : 'Sub-10')}
          className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
            selectedCategoryTab === 'Sub-10'
              ? 'bg-emerald-50 border-emerald-500 shadow-md ring-2 ring-emerald-400'
              : 'bg-white border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
              Sub-10
            </span>
            <span className="text-[11px] font-bold text-slate-500">07 a 10 anos</span>
          </div>
          <div className="mt-2.5">
            <h4 className="font-extrabold text-slate-900 text-sm">Iniciação & Fundamentos</h4>
            <div className="text-xs text-slate-600 mt-1 flex items-center gap-2">
              <span><strong>{sub10Classes.length}</strong> {sub10Classes.length === 1 ? 'turma' : 'turmas'}</span>
              <span>•</span>
              <span className="text-emerald-700 font-bold">{sub10Students.length} atletas inscritos</span>
            </div>
          </div>
        </div>

        {/* Sub-13 */}
        <div
          onClick={() => setSelectedCategoryTab(selectedCategoryTab === 'Sub-13' ? 'all' : 'Sub-13')}
          className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
            selectedCategoryTab === 'Sub-13'
              ? 'bg-blue-50 border-blue-600 shadow-md ring-2 ring-blue-400'
              : 'bg-white border-slate-200 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-800 border border-blue-300">
              Sub-13
            </span>
            <span className="text-[11px] font-bold text-slate-500">11 a 13 anos</span>
          </div>
          <div className="mt-2.5">
            <h4 className="font-extrabold text-slate-900 text-sm">Formação Esportiva</h4>
            <div className="text-xs text-slate-600 mt-1 flex items-center gap-2">
              <span><strong>{sub13Classes.length}</strong> {sub13Classes.length === 1 ? 'turma' : 'turmas'}</span>
              <span>•</span>
              <span className="text-blue-700 font-bold">{sub13Students.length} atletas inscritos</span>
            </div>
          </div>
        </div>

        {/* Sub-17 */}
        <div
          onClick={() => setSelectedCategoryTab(selectedCategoryTab === 'Sub-17' ? 'all' : 'Sub-17')}
          className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
            selectedCategoryTab === 'Sub-17'
              ? 'bg-indigo-50 border-indigo-600 shadow-md ring-2 ring-indigo-400'
              : 'bg-white border-slate-200 hover:border-indigo-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-100 text-indigo-800 border border-indigo-300">
              Sub-17
            </span>
            <span className="text-[11px] font-bold text-slate-500">14 a 17 anos</span>
          </div>
          <div className="mt-2.5">
            <h4 className="font-extrabold text-slate-900 text-sm">Juvenil & Competição</h4>
            <div className="text-xs text-slate-600 mt-1 flex items-center gap-2">
              <span><strong>{sub17Classes.length}</strong> {sub17Classes.length === 1 ? 'turma' : 'turmas'}</span>
              <span>•</span>
              <span className="text-indigo-700 font-bold">{sub17Students.length} atletas inscritos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold text-slate-600">Filtrar por Categoria:</span>
        <button
          type="button"
          onClick={() => setSelectedCategoryTab('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            selectedCategoryTab === 'all'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
          }`}
        >
          Todas as Turmas ({classes.length})
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategoryTab('Sub-10')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            selectedCategoryTab === 'Sub-10'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
          }`}
        >
          Sub-10 (07 a 10 anos)
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategoryTab('Sub-13')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            selectedCategoryTab === 'Sub-13'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
          }`}
        >
          Sub-13 (11 a 13 anos)
        </button>
        <button
          type="button"
          onClick={() => setSelectedCategoryTab('Sub-17')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            selectedCategoryTab === 'Sub-17'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200'
          }`}
        >
          Sub-17 (14 a 17 anos)
        </button>
      </div>

      {/* Shifts Breakdown */}
      <div className="space-y-8">
        {shifts.map((shiftName) => {
          const shiftClasses = filteredClasses.filter((c) => c.shift === shiftName);

          return (
            <div key={shiftName} className="space-y-3">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    shiftName === 'Manhã'
                      ? 'bg-blue-600'
                      : shiftName === 'Tarde'
                      ? 'bg-sky-500'
                      : 'bg-indigo-700'
                  }`}
                />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Turno da {shiftName} ({shiftClasses.length} {shiftClasses.length === 1 ? 'turma' : 'turmas'})
                </h3>
              </div>

              {shiftClasses.length === 0 ? (
                <div className="p-6 bg-white border border-slate-200 rounded-2xl text-xs text-slate-400 text-center shadow-xs">
                  Nenhuma turma {selectedCategoryTab !== 'all' ? `na categoria ${selectedCategoryTab}` : ''} cadastrada no turno da {shiftName.toLowerCase()}.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {shiftClasses.map((cls) => {
                    const enrolledStudents = students.filter(
                      (s) => s.classId === cls.id && s.status === 'Ativo'
                    );
                    const occupancy = Math.round((enrolledStudents.length / cls.maxCapacity) * 100);
                    const normalizedCat = normalizeCategory(cls.category, cls.maxAge);
                    const catBadgeStyle =
                      normalizedCat === 'Sub-10'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : normalizedCat === 'Sub-13'
                        ? 'bg-blue-50 text-blue-800 border-blue-300'
                        : 'bg-indigo-50 text-indigo-800 border-indigo-300';

                    return (
                      <div
                        key={cls.id}
                        className="bg-white border border-slate-200 hover:border-blue-300 rounded-2xl p-5 shadow-xs hover:shadow transition-all flex flex-col justify-between"
                      >
                        <div>
                          {/* Title & Category */}
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div>
                              <h4 className="font-extrabold text-slate-900 text-base leading-snug">
                                {cls.name}
                              </h4>
                              <span className="text-xs text-blue-700 font-semibold">
                                {cls.daysOfWeek.join(' • ')}
                              </span>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded text-[11px] font-extrabold border shrink-0 ${catBadgeStyle}`}>
                              {normalizedCat} ({cls.minAge}-{cls.maxAge} anos)
                            </span>
                          </div>

                          {/* Details */}
                          <div className="space-y-2 text-xs text-slate-600 py-3 border-y border-slate-100 my-3">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                              <span>
                                <strong>{cls.startTime}</strong> às <strong>{cls.endTime}</strong>
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                              <span>{cls.court}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <UserCheck className="w-4 h-4 text-slate-400 shrink-0" />
                              <span>
                                Instrutor: <strong className="text-slate-900">{cls.instructorName}</strong>
                              </span>
                            </div>
                          </div>

                          {/* Capacity / Occupancy Bar */}
                          <div className="bg-slate-50 rounded-xl p-3 mb-4 border border-slate-100">
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <span className="text-slate-500 font-medium">Ocupação da Turma</span>
                              <span className="font-bold text-slate-800 tabular-nums">
                                {enrolledStudents.length} / {cls.maxCapacity} alunos ({occupancy}%)
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  occupancy >= 90
                                    ? 'bg-rose-500'
                                    : occupancy >= 70
                                    ? 'bg-amber-500'
                                    : 'bg-blue-600'
                                }`}
                                style={{ width: `${Math.min(occupancy, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2">
                          {onSelectClassToCall && (
                            <button
                              onClick={() => onSelectClassToCall(cls.id)}
                              className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition-colors"
                            >
                              Fazer Chamada
                            </button>
                          )}

                          <div className="flex items-center gap-1.5 ml-auto">
                            <button
                              onClick={() => openEditModal(cls)}
                              className="p-2 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                              title="Editar Turma"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                              <button
                                onClick={() => setClassPendingDelete(cls)}
                                className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Excluir Turma"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal Nova / Editar Turma */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden my-4">
            <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {editingClass ? 'Editar Turma de Vôlei' : 'Criar Nova Turma'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nome da Turma *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Sub-13 Aperfeiçoamento A"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Turno *</label>
                  <select
                    value={shift}
                    onChange={(e) => setShift(e.target.value as ShiftType)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  >
                    <option value="Manhã">Manhã</option>
                    <option value="Tarde">Tarde</option>
                    <option value="Noite">Noite</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Categoria Principal do Sub *</label>
                  <select
                    value={category}
                    onChange={(e) => handleCategoryChange(e.target.value as VolleyballCategory)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  >
                    <option value="Sub-10">Sub-10 (07 a 10 anos) — Iniciação</option>
                    <option value="Sub-13">Sub-13 (11 a 13 anos) — Formação</option>
                    <option value="Sub-17">Sub-17 (14 a 17 anos) — Juvenil / Competição</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Horário de Início</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Horário de Término</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Dias da Semana de Treino *
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_WEEKDAYS.map((day) => {
                    const isSelected = daysOfWeek.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quadra / Local</label>
                  <input
                    type="text"
                    required
                    value={court}
                    onChange={(e) => setCourt(e.target.value)}
                    placeholder="Ex: Quadra Central 1"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Instrutor / Treinador</label>
                  <input
                    type="text"
                    required
                    value={instructorName}
                    onChange={(e) => setInstructorName(e.target.value)}
                    placeholder="Ex: Prof. Carlos Silva"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Capacidade Máxima</label>
                  <input
                    type="number"
                    min={4}
                    max={30}
                    value={maxCapacity}
                    onChange={(e) => setMaxCapacity(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Idade Mínima</label>
                  <input
                    type="number"
                    min={7}
                    max={17}
                    value={minAge}
                    onChange={(e) => setMinAge(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Idade Máxima</label>
                  <input
                    type="number"
                    min={7}
                    max={17}
                    value={maxAge}
                    onChange={(e) => setMaxAge(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-xs"
                >
                  {editingClass ? 'Salvar Alterações' : 'Criar Turma'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Class Confirmation Modal */}
      {classPendingDelete && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-rose-500 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600 border-b border-rose-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Excluir Turma de Vôlei</h3>
                <p className="text-xs text-slate-500">Ação irreversível</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-xs space-y-1">
              <div className="font-bold text-slate-900 text-sm">{classPendingDelete.name}</div>
              <div className="text-slate-600 font-medium">
                Turno: <strong className="text-blue-900">{classPendingDelete.shift}</strong> ({classPendingDelete.startTime} às {classPendingDelete.endTime})
              </div>
              <div className="text-slate-500">
                Instrutor: {classPendingDelete.instructorName} • {classPendingDelete.court}
              </div>
            </div>

            <p className="text-xs text-rose-800 bg-rose-50 p-3 rounded-xl border border-rose-200">
              ⚠️ Alunos vinculados a esta turma precisarão ser remanejados para outro horário de treino.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setClassPendingDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (classPendingDelete) {
                    onDeleteClass(classPendingDelete.id);
                    setClassPendingDelete(null);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-xs cursor-pointer"
              >
                Confirmar Exclusão da Turma
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
