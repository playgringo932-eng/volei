'use client';

const AUTH_STORAGE_KEY = 'voleiaraca_admin_session_v1';
const PASSWORD_STORAGE_KEY = 'voleiaraca_admin_password_v1';
const REMEMBER_STORAGE_KEY = 'voleiaraca_admin_remember_v1';

export interface AdminUser {
  username: string;
  name: string;
  role: string;
  department: string;
  municipality: string;
  loggedInAt: string;
}

const DEFAULT_CREDENTIALS = {
  defaultUsernames: ['admin', 'coordenacao', 'esportes', 'coordenacao@aracariguama.sp.gov.br'],
  defaultPassword: 'admin',
};

export const authService = {
  /**
   * Retrieves the stored admin password or returns the default one
   */
  getStoredPassword(): string {
    if (typeof window === 'undefined') return DEFAULT_CREDENTIALS.defaultPassword;
    try {
      return localStorage.getItem(PASSWORD_STORAGE_KEY) || DEFAULT_CREDENTIALS.defaultPassword;
    } catch {
      return DEFAULT_CREDENTIALS.defaultPassword;
    }
  },

  /**
   * Validates if a user is currently authenticated
   */
  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const session = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!session) return false;
      const parsed = JSON.parse(session);
      return Boolean(parsed && parsed.username);
    } catch {
      return false;
    }
  },

  /**
   * Gets current logged in admin user info
   */
  getCurrentUser(): AdminUser | null {
    if (typeof window === 'undefined') return null;
    try {
      const session = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!session) return null;
      return JSON.parse(session);
    } catch {
      return null;
    }
  },

  /**
   * Logs in with username and password
   */
  login(
    userInput: string,
    passwordInput: string,
    rememberMe = true
  ): { success: boolean; message: string; user?: AdminUser } {
    const userClean = (userInput || '').trim().toLowerCase();
    const passClean = (passwordInput || '').trim();

    if (!userClean) {
      return { success: false, message: 'Por favor, informe o usuário de administrador.' };
    }
    if (!passClean) {
      return { success: false, message: 'Por favor, digite a sua senha de acesso.' };
    }

    const currentPassword = this.getStoredPassword();
    const isUserValid =
      DEFAULT_CREDENTIALS.defaultUsernames.includes(userClean) ||
      userClean.includes('admin') ||
      userClean.includes('coordenacao');

    const isPasswordValid = passClean === currentPassword;

    if (!isUserValid) {
      return {
        success: false,
        message: 'Usuário não reconhecido. Utilize o usuário de administrador cadastrado (ex: admin).',
      };
    }

    if (!isPasswordValid) {
      return {
        success: false,
        message: 'Senha incorreta. Verifique se o Caps Lock está ativo e tente novamente.',
      };
    }

    const user: AdminUser = {
      username: userClean,
      name: 'Coordenação Esportiva',
      role: 'Administrador Geral',
      department: 'Secretaria Municipal de Esportes, Lazer e Eventos',
      municipality: 'Araçariguama - SP',
      loggedInAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      if (rememberMe) {
        localStorage.setItem(REMEMBER_STORAGE_KEY, 'true');
      } else {
        localStorage.removeItem(REMEMBER_STORAGE_KEY);
      }
    } catch (err) {
      console.warn('Erro ao salvar sessão de login no localStorage:', err);
    }

    return { success: true, message: 'Login realizado com sucesso! Bem-vindo(a).', user };
  },

  /**
   * Logs out the current admin user and clears session
   */
  logout(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (err) {
      console.warn('Erro ao limpar sessão de login:', err);
    }
  },

  /**
   * Allows the administrator to change the system password
   */
  changePassword(
    currentPasswordInput: string,
    newPasswordInput: string
  ): { success: boolean; message: string } {
    const currentPass = this.getStoredPassword();
    if ((currentPasswordInput || '').trim() !== currentPass) {
      return { success: false, message: 'A senha atual informada está incorreta.' };
    }

    const cleanNew = (newPasswordInput || '').trim();
    if (cleanNew.length < 3) {
      return { success: false, message: 'A nova senha deve possuir no mínimo 3 caracteres.' };
    }

    try {
      localStorage.setItem(PASSWORD_STORAGE_KEY, cleanNew);
      return { success: true, message: 'Senha de administrador alterada com sucesso!' };
    } catch (err) {
      return { success: false, message: 'Falha ao gravar nova senha no dispositivo.' };
    }
  },

  /**
   * Master Recovery PIN: 3007
   */
  validateRecoveryPin(pin: string): boolean {
    return (pin || '').trim() === '3007';
  },

  /**
   * Resets password to a new custom password using Master Recovery PIN 3007
   */
  resetPasswordWithPin(
    pin: string,
    newPasswordInput: string
  ): { success: boolean; message: string } {
    if (!this.validateRecoveryPin(pin)) {
      return { success: false, message: 'PIN de segurança incorreto. Acesso não autorizado.' };
    }

    const cleanNew = (newPasswordInput || '').trim();
    if (cleanNew.length < 3) {
      return { success: false, message: 'A nova senha deve possuir no mínimo 3 caracteres.' };
    }

    try {
      localStorage.setItem(PASSWORD_STORAGE_KEY, cleanNew);
      return { success: true, message: 'Nova senha de administrador redefinida com sucesso!' };
    } catch {
      return { success: false, message: 'Falha ao salvar a nova senha no dispositivo.' };
    }
  },
};
