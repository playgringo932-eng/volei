'use client';

import React from 'react';
import { Trash2, AlertTriangle, X, ShieldAlert } from 'lucide-react';
import { Student, VolleyballClass } from '@/types/volleyball';
import { getAthletePhoto } from '@/lib/avatarHelpers';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  student: Student | null;
  classes?: VolleyballClass[];
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmDeleteModal({
  isOpen,
  student,
  classes = [],
  onClose,
  onConfirm,
}: ConfirmDeleteModalProps) {
  if (!isOpen || !student) return null;

  const currentClass = classes.find((c) => c.id === student.classId);
  const photo = student.photoUrl || getAthletePhoto(student.fullName, student.gender, student.jerseyNumber);

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white border-2 border-rose-500 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
      >
        {/* Header with Warning Banner */}
        <div className="bg-rose-600 text-white p-5 flex items-center justify-between border-b border-rose-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 id="delete-dialog-title" className="text-base font-extrabold tracking-tight">
                Excluir Matrícula de Atleta
              </h3>
              <p className="text-xs text-rose-100">Ação irreversível no sistema</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-rose-100 hover:text-white hover:bg-rose-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3.5 bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
            <div className="w-14 h-16 rounded-xl border-2 border-rose-300 overflow-hidden bg-white shrink-0 shadow-2xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt={student.fullName} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
                Atleta Selecionado
              </span>
              <h4 className="font-extrabold text-slate-900 text-sm truncate">{student.fullName}</h4>
              <p className="text-xs font-mono font-bold text-blue-900 mt-0.5">
                Matrícula: {student.registrationNumber}
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {student.category} • {currentClass?.name || 'Vôlei Geral'} ({currentClass?.shift || 'Turno'})
              </p>
            </div>
          </div>

          <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-3.5 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-950 space-y-1">
              <p className="font-bold">Confirma a exclusão definitiva desta matrícula?</p>
              <p className="text-[11px] text-rose-800 leading-relaxed">
                Ao excluir, a <strong>carteirinha oficial</strong> e o <strong>QR Code</strong> deste atleta serão invalidados, cancelando o acesso às chamadas e desvinculando o histórico de treinos.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors"
          >
            Cancelar (Manter Aluno)
          </button>
          <button
            onClick={onConfirm}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Excluir Matrícula Definitivamente</span>
          </button>
        </div>
      </div>
    </div>
  );
}
