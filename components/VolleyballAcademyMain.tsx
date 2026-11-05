'use client';

import React, { useState, useEffect } from 'react';
import {
  Student,
  VolleyballClass,
  DailyAttendanceSession,
  NotificationLog,
  EnrollmentStatus,
} from '@/types/volleyball';
import { storageService } from '@/lib/storage';
import { Navbar } from '@/components/Navbar';
import { StudentsManagement } from '@/components/StudentsManagement';
import { AttendanceInstructorView } from '@/components/AttendanceInstructorView';
import { AttendanceReportsView } from '@/components/AttendanceReportsView';
import { ClassesManagement } from '@/components/ClassesManagement';
import { NotificationsCenter } from '@/components/NotificationsCenter';
import { StudentRegistrationModal } from '@/components/StudentRegistrationModal';
import { StudentDetailsModal } from '@/components/StudentDetailsModal';
import { StudentIdCardModal } from '@/components/StudentIdCardModal';
import { DatabaseBackupModal } from '@/components/DatabaseBackupModal';
import { QrCodeScannerModal } from '@/components/QrCodeScannerModal';
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal';
import { SupabaseConnectionModal } from '@/components/SupabaseConnectionModal';
import { AdminLoginScreen } from '@/components/AdminLoginScreen';
import { ChangePasswordModal } from '@/components/ChangePasswordModal';
import { EnrollmentLinkModal } from '@/components/EnrollmentLinkModal';
import { authService, AdminUser } from '@/lib/authService';
import {
  isSupabaseConfigured,
  saveAllToSupabase,
  loadAllFromSupabase,
  syncServerAndDevices,
} from '@/lib/supabase';
import { CheckCircle2, Trash2 } from 'lucide-react';

export function VolleyballAcademyMain() {
  const [currentTab, setCurrentTab] = useState<
    'admin' | 'instructor' | 'reports' | 'notifications' | 'classes'
  >('admin');

  // Application Data States initialized directly from storage
  const [students, setStudents] = useState<Student[]>(() => storageService.getStudents());
  const [classes, setClasses] = useState<VolleyballClass[]>(() => storageService.getClasses());
  const [sessions, setSessions] = useState<DailyAttendanceSession[]>(() => storageService.getAttendanceSessions());
  const [notifications, setNotifications] = useState<NotificationLog[]>(() => storageService.getNotifications());

  // Modal States
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState<Student | null>(null);

  const [isIdCardOpen, setIsIdCardOpen] = useState(false);
  const [selectedStudentForIdCard, setSelectedStudentForIdCard] = useState<Student | null>(null);

  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [isEnrollmentLinkOpen, setIsEnrollmentLinkOpen] = useState(false);
  const [scannerInitialClassId, setScannerInitialClassId] = useState<string | undefined>();
  const [scannerInitialDate, setScannerInitialDate] = useState<string | undefined>();
  const [scannerInitialCode, setScannerInitialCode] = useState<string | undefined>();
  const [studentForDirectNotify, setStudentForDirectNotify] = useState<Student | null>(null);

  // Estado do Botão Único de Salvamento & Supabase
  const [isSavingData, setIsSavingData] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isCloudConnected, setIsCloudConnected] = useState(() => isSupabaseConfigured());

  // Estado de Autenticação e Segurança do Administrador
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => authService.isAuthenticated());
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(() => authService.getCurrentUser());
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setCurrentUser(null);
    showToast('Sessão administrativa encerrada com sucesso.', 'success');
  };

  // Custom Deletion Confirmation State
  const [studentPendingDelete, setStudentPendingDelete] = useState<Student | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'delete' } | null>(null);

  const showToast = (text: string, type: 'success' | 'delete' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const reloadData = () => {
    try {
      const freshStudents = storageService.getStudents();
      setStudents(freshStudents);
      setClasses(storageService.getClasses());
      setSessions(storageService.getAttendanceSessions());
      setNotifications(storageService.getNotifications());

      // Synchronize open modals with refreshed data
      setSelectedStudentForDetails((prev) => (prev ? freshStudents.find((s) => s.id === prev.id) || null : null));
      setSelectedStudentForIdCard((prev) => (prev ? freshStudents.find((s) => s.id === prev.id) || null : null));
    } catch (err) {
      console.error('Erro ao recarregar dados:', err);
    }
  };

  useEffect(() => {
    const unsubscribe = storageService.subscribe(() => {
      try {
        setStudents(storageService.getStudents());
        setClasses(storageService.getClasses());
        setSessions(storageService.getAttendanceSessions());
        setNotifications(storageService.getNotifications());
      } catch (err) {
        console.error('Erro na atualização de storage:', err);
      }
    });
    return () => unsubscribe();
  }, []);

  // Sincronização bidirecional em tempo real entre PC e Celular
  useEffect(() => {
    async function initCrossDeviceSync() {
      try {
        // 1. Puxa os dados mais recentes do servidor (que consulta o Supabase na nuvem)
        await storageService.pullFromSharedSync(true);
        reloadData();

        // 2. Se o Supabase estiver configurado, também carrega diretamente da nuvem
        if (isSupabaseConfigured()) {
          setIsCloudConnected(true);
          const res = await loadAllFromSupabase();
          if (res.success && res.hasData) {
            reloadData();
          }
        }
      } catch (err) {
        console.error('Erro na sincronização de dados:', err);
      }
    }
    initCrossDeviceSync();
  }, []);

  // Atualização em tempo real ao focar ou reabrir o app no celular
  useEffect(() => {
    const handleDeviceFocus = async () => {
      try {
        const pulled = await storageService.pullFromSharedSync(true);
        if (pulled) {
          reloadData();
        }
        if (isSupabaseConfigured()) {
          const res = await loadAllFromSupabase();
          if (res.success && res.hasData) {
            reloadData();
          }
        }
      } catch (err) {
        console.error('Erro ao focar na janela:', err);
      }
    };
    window.addEventListener('focus', handleDeviceFocus);
    document.addEventListener('visibilitychange', handleDeviceFocus);
    return () => {
      window.removeEventListener('focus', handleDeviceFocus);
      document.removeEventListener('visibilitychange', handleDeviceFocus);
    };
  }, []);

  // Intervalo de verificação inteligente em segundo plano (apenas com aba visível para poupar limite do Supabase)
  useEffect(() => {
    const interval = setInterval(async () => {
      if (document.visibilityState === 'visible') {
        const pulled = await storageService.pullFromSharedSync();
        if (pulled) {
          reloadData();
        }
      }
    }, 25000);
    return () => clearInterval(interval);
  }, []);

  // O Único Botão de Salvamento: Salva no Supabase e em todos os aparelhos
  const handleSaveData = async () => {
    if (!isSupabaseConfigured()) {
      setIsSupabaseModalOpen(true);
      showToast('Conecte suas chaves do Supabase para salvar e sincronizar.', 'delete');
      return;
    }

    setIsSavingData(true);
    // Salva localmente primeiro
    storageService.saveStudents(students);
    storageService.saveClasses(classes);
    storageService.saveAttendanceSessions(sessions);
    storageService.saveNotifications(notifications);
    storageService.pushAllToSharedSync();

    try {
      const res = await saveAllToSupabase();
      if (res.success) {
        setIsCloudConnected(true);
        showToast(
          `✓ Salvo com sucesso no Supabase! (${students.length} alunos e ${classes.length} turmas). Sincronizado para todos os aparelhos!`,
          'success'
        );
      } else {
        showToast(`Erro ao salvar no Supabase: ${res.message}`, 'delete');
        setIsSupabaseModalOpen(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na conexão';
      showToast(`Erro ao salvar no Supabase: ${msg}`, 'delete');
      setIsSupabaseModalOpen(true);
    } finally {
      setIsSavingData(false);
    }
  };

  // CRUD Handlers
  const handleSaveStudent = (savedStudent: Student) => {
    if (studentToEdit) {
      storageService.updateStudent(savedStudent);
      showToast(`Matrícula de ${savedStudent.fullName} atualizada com sucesso!`, 'success');
    } else {
      storageService.addStudent(savedStudent);
      const welcomeLog: NotificationLog = {
        id: `notif-${Date.now()}`,
        studentId: savedStudent.id,
        studentName: savedStudent.fullName,
        guardianName: savedStudent.guardian.name,
        guardianPhone: savedStudent.guardian.phone,
        guardianEmail: savedStudent.guardian.email,
        type: 'Boas-Vindas Matrícula',
        message: `Bem-vindo(a) à Academia VoleiAraça! Matrícula ${savedStudent.registrationNumber} confirmada para ${savedStudent.fullName} (Categoria ${savedStudent.category}). Estamos ansiosos pelos treinos!`,
        channel: 'WhatsApp',
        sentAt: new Date().toISOString(),
        status: 'Enviado',
      };
      storageService.addNotification(welcomeLog);
      showToast(`Nova matrícula de ${savedStudent.fullName} cadastrada com sucesso!`, 'success');
    }
    reloadData();
  };

  const handleDeleteStudent = (id: string) => {
    const studentToDelete = students.find((s) => s.id === id);
    storageService.deleteStudent(id);
    reloadData();
    if (selectedStudentForDetails?.id === id) {
      setIsDetailsOpen(false);
      setSelectedStudentForDetails(null);
    }
    if (selectedStudentForIdCard?.id === id) {
      setIsIdCardOpen(false);
      setSelectedStudentForIdCard(null);
    }
    setStudentPendingDelete(null);
    showToast(
      `Matrícula de ${studentToDelete ? studentToDelete.fullName : 'atleta'} excluída com sucesso!`,
      'delete'
    );
  };

  const handleOpenEdit = (student: Student) => {
    setStudentToEdit(student);
    setIsRegistrationOpen(true);
  };

  const handleOpenNewStudent = () => {
    setStudentToEdit(null);
    setIsRegistrationOpen(true);
  };

  const handleViewStudent = (student: Student) => {
    setSelectedStudentForDetails(student);
    setIsDetailsOpen(true);
  };

  const handleViewIdCard = (student: Student) => {
    setSelectedStudentForIdCard(student);
    setIsIdCardOpen(true);
  };

  const handleBatchPrintIdCards = () => {
    if (students.length > 0) {
      setSelectedStudentForIdCard(students[0]);
      setIsIdCardOpen(true);
    }
  };

  const handleUpdateStudentPhoto = (studentId: string, photoUrl: string) => {
    const target = students.find((s) => s.id === studentId);
    if (target) {
      const updated: Student = { ...target, photoUrl };
      storageService.updateStudent(updated);
      reloadData();
      if (selectedStudentForIdCard?.id === studentId) {
        setSelectedStudentForIdCard(updated);
      }
    }
  };

  const handleQuickUpdateStatus = (studentId: string, status: EnrollmentStatus) => {
    const target = students.find((s) => s.id === studentId);
    if (target) {
      const updated: Student = { ...target, status };
      storageService.updateStudent(updated);
      reloadData();
    }
  };

  const handleOpenNotifyFromStudent = (student: Student) => {
    setStudentForDirectNotify(student);
    setCurrentTab('notifications');
  };

  const handleAddClass = (newCls: VolleyballClass) => {
    storageService.addClass(newCls);
    reloadData();
  };

  const handleUpdateClass = (updatedCls: VolleyballClass) => {
    storageService.updateClass(updatedCls);
    reloadData();
  };

  const handleDeleteClass = (id: string) => {
    storageService.deleteClass(id);
    reloadData();
  };

  const handleSelectClassToCall = (classId: string) => {
    setCurrentTab('instructor');
  };

  const handleOpenQrScanner = (classId?: string, date?: string, studentCode?: string) => {
    setScannerInitialClassId(classId);
    setScannerInitialDate(date || '2026-10-29');
    setScannerInitialCode(studentCode);
    setIsQrScannerOpen(true);
  };

  const activeStudentsCount = students.filter((s) => s.status === 'Ativo').length;

  // Se não estiver autenticado, exibe a Tela Oficial de Login Administrativo
  if (!isAuthenticated) {
    return (
      <AdminLoginScreen
        onLoginSuccess={(user) => {
          setIsAuthenticated(true);
          setCurrentUser(user);
          showToast(`✓ Acesso autorizado! Bem-vindo(a) à Coordenação.`, 'success');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans" suppressHydrationWarning>
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenNewStudent={handleOpenNewStudent}
        onOpenBackupModal={() => setIsBackupOpen(true)}
        onOpenQrScanner={() => handleOpenQrScanner()}
        onSaveData={handleSaveData}
        isSaving={isSavingData}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        isCloudConnected={isCloudConnected}
        totalStudents={students.length}
        activeStudents={activeStudentsCount}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenChangePassword={() => setIsChangePasswordOpen(true)}
        onOpenEnrollmentLink={() => setIsEnrollmentLinkOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-[1720px] mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-6">
        {/* Tab 1: Alunos & Matrículas */}
        {currentTab === 'admin' && (
          <StudentsManagement
            students={students}
            classes={classes}
            onOpenNewStudent={handleOpenNewStudent}
            onViewStudent={handleViewStudent}
            onEditStudent={handleOpenEdit}
            onDeleteStudent={handleDeleteStudent}
            onOpenNotifyModal={handleOpenNotifyFromStudent}
            onViewIdCard={handleViewIdCard}
            onBatchPrintIdCards={handleBatchPrintIdCards}
            onQuickUpdateStatus={handleQuickUpdateStatus}
            onOpenQrScanner={(reg) => handleOpenQrScanner(undefined, undefined, reg)}
            onOpenEnrollmentLink={() => setIsEnrollmentLinkOpen(true)}
          />
        )}

        {/* Tab 2: Chamada Mobile do Instrutor */}
        {currentTab === 'instructor' && (
          <AttendanceInstructorView
            students={students}
            classes={classes}
            sessions={sessions}
            onTriggerNotification={() => reloadData()}
            onOpenQrScanner={handleOpenQrScanner}
          />
        )}

        {/* Tab 3: Relatórios Mensais de Assiduidade */}
        {currentTab === 'reports' && (
          <AttendanceReportsView
            students={students}
            classes={classes}
            sessions={sessions}
          />
        )}

        {/* Tab 4: Turmas, Turnos e Horários */}
        {currentTab === 'classes' && (
          <ClassesManagement
            classes={classes}
            students={students}
            onAddClass={handleAddClass}
            onUpdateClass={handleUpdateClass}
            onDeleteClass={handleDeleteClass}
            onSelectClassToCall={handleSelectClassToCall}
          />
        )}

        {/* Tab 5: Notificações aos Responsáveis */}
        {currentTab === 'notifications' && (
          <NotificationsCenter
            students={students}
            classes={classes}
            sessions={sessions}
            notifications={notifications}
            onAddNotification={() => reloadData()}
            preSelectedStudent={studentForDirectNotify}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t-2 border-blue-200/80 bg-white py-4 text-center text-xs text-slate-500">
        <div className="w-full max-w-[1720px] mx-auto px-3 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-left">
            <strong className="text-blue-900 font-bold">VoleiAraça</strong> — Sistema Oficial desenvolvido por <strong className="text-slate-900 font-bold">Hian Salles</strong>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Matrículas & Frequência (07 a 17 anos) • Carteirinhas com QR Code • Exportação Excel
            </div>
          </div>

          <div className="flex items-center gap-4 text-slate-600 font-medium text-[11px]">
            <span>Matrículas & Frequência</span>
            <span>•</span>
            <span>Carteirinhas de Atleta</span>
            <span>•</span>
            <span>Exportação Excel (.xlsx)</span>
          </div>
        </div>
      </footer>

      {/* Modal: Carteirinha do Aluno (Frente, Verso, Foto, Impressão, QR Code) */}
      <StudentIdCardModal
        isOpen={isIdCardOpen}
        student={selectedStudentForIdCard}
        allStudents={students}
        classes={classes}
        onClose={() => setIsIdCardOpen(false)}
        onUpdateStudentPhoto={handleUpdateStudentPhoto}
        onOpenEditStudent={(st) => {
          setIsIdCardOpen(false);
          handleOpenEdit(st);
        }}
        onOpenQrScanner={(reg) => {
          handleOpenQrScanner(undefined, undefined, reg || selectedStudentForIdCard?.registrationNumber);
        }}
        onDeleteStudent={(st) => setStudentPendingDelete(st)}
      />

      {/* Modal: Cadastro / Edição de Aluno (Validação Estrita 07-17 anos + Foto) */}
      <StudentRegistrationModal
        isOpen={isRegistrationOpen}
        onClose={() => setIsRegistrationOpen(false)}
        onSaveStudent={handleSaveStudent}
        classes={classes}
        studentToEdit={studentToEdit}
        existingStudentsCount={students.reduce((acc, s) => {
          const m = (s.registrationNumber || '').match(/(\d+)$/);
          const n = m ? parseInt(m[1], 10) : 0;
          return Math.max(acc, isNaN(n) ? 0 : n);
        }, students.length)}
      />

      {/* Modal: Detalhes do Aluno */}
      <StudentDetailsModal
        isOpen={isDetailsOpen}
        student={selectedStudentForDetails}
        classes={classes}
        sessions={sessions}
        onClose={() => setIsDetailsOpen(false)}
        onEdit={(st) => {
          setIsDetailsOpen(false);
          handleOpenEdit(st);
        }}
        onOpenNotifyModal={handleOpenNotifyFromStudent}
        onViewIdCard={handleViewIdCard}
        onDelete={(st) => setStudentPendingDelete(st)}
      />

      {/* Modal: Backup & Restauração do Banco */}
      <DatabaseBackupModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        onDataResetOrRestored={reloadData}
      />

      {/* Modal: Leitor de QR Code para Chamada Automática */}
      <QrCodeScannerModal
        isOpen={isQrScannerOpen}
        onClose={() => {
          setIsQrScannerOpen(false);
          setScannerInitialCode(undefined);
        }}
        students={students}
        classes={classes}
        selectedClassId={scannerInitialClassId}
        selectedDate={scannerInitialDate}
        initialCode={scannerInitialCode}
        onCheckInSuccess={() => reloadData()}
      />

      {/* Global Confirm Delete Student Modal (Accessible from any view or modal) */}
      <ConfirmDeleteModal
        isOpen={!!studentPendingDelete}
        student={studentPendingDelete}
        classes={classes}
        onClose={() => setStudentPendingDelete(null)}
        onConfirm={() => {
          if (studentPendingDelete) {
            handleDeleteStudent(studentPendingDelete.id);
          }
        }}
      />

      {/* Modal de Conexão e Sincronização com Supabase */}
      <SupabaseConnectionModal
        isOpen={isSupabaseModalOpen}
        onClose={() => {
          setIsSupabaseModalOpen(false);
          setIsCloudConnected(isSupabaseConfigured());
        }}
        onSyncSuccess={() => {
          setIsCloudConnected(true);
          reloadData();
          showToast('✓ Dados sincronizados com o Supabase com sucesso!', 'success');
        }}
      />

      {/* Modal: Alterar Senha do Administrador */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        onPasswordChanged={() => {
          showToast('✓ Senha do administrador alterada com sucesso!', 'success');
        }}
      />

      {/* Modal: Link de Inscrição Oficial para Pais & Atletas */}
      <EnrollmentLinkModal
        isOpen={isEnrollmentLinkOpen}
        onClose={() => setIsEnrollmentLinkOpen(false)}
      />

      {/* Floating System Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-70 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold ${
              toastMessage.type === 'delete'
                ? 'bg-rose-600 text-white border-rose-700'
                : 'bg-blue-600 text-white border-blue-700'
            }`}
          >
            {toastMessage.type === 'delete' ? (
              <Trash2 className="w-4 h-4 text-rose-200 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}
