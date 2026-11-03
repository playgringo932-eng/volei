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

// In-memory cache
let inMemoryPassword = DEFAULT_CREDENTIALS.defaultPassword;

export const authService = {
  /**
   * Retrieves the stored admin password from memory/localStorage
   */
  getStoredPassword(): string {
    if (typeof window === 'undefined') return inMemoryPassword;
    try {
      const stored = localStorage.getItem(PASSWORD_STORAGE_KEY);
      if (stored) {
        inMemoryPassword = stored;
        return stored;
      }
    } catch {
      // fallback
    }
    return inMemoryPassword || DEFAULT_CREDENTIALS.defaultPassword;
  },

  /**
   * Sincroniza a senha do administrador com o servidor compartilhado
   * para que qualquer alteração feita no PC apareça imediatamente no Celular e vice-versa
   */
  async syncWithServer(): Promise<string> {
    if (typeof window === 'undefined') return inMemoryPassword;
    try {
      const res = await fetch('/api/sync');
      if (res.ok) {
        const json = await res.json();
        if (json.adminAuth?.password) {
          const srvPass = String(json.adminAuth.password).trim();
          inMemoryPassword = srvPass;
          try {
            localStorage.setItem(PASSWORD_STORAGE_KEY, srvPass);
          } catch {
            // ignore
          }
          return srvPass;
        }
      }
    } catch (err) {
      console.warn('Aviso: Falha ao sincronizar senha com servidor:', err);
    }
    return this.getStoredPassword();
  },

  /**
   * Envia a nova senha para o servidor para que todos os dispositivos sincronizem
   */
  async pushPasswordToServer(newPassword: string): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminAuth: {
            password: newPassword,
          },
        }),
      });
    } catch (err) {
      console.warn('Aviso: Falha ao persistir senha no servidor compartilhado:', err);
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
   * Logs in with username and password, with automatic server verification
   */
  async login(
    userInput: string,
    passwordInput: string,
    rememberMe = true
  ): Promise<{ success: boolean; message: string; user?: AdminUser }> {
    const userClean = (userInput || '').trim().toLowerCase();
    const passClean = (passwordInput || '').trim();

    if (!userClean) {
      return { success: false, message: 'Por favor, informe o usuário de administrador.' };
    }
    if (!passClean) {
      return { success: false, message: 'Por favor, digite a sua senha de acesso.' };
    }

    const isUserValid =
      DEFAULT_CREDENTIALS.defaultUsernames.includes(userClean) ||
      userClean.includes('admin') ||
      userClean.includes('coordenacao');

    if (!isUserValid) {
      return {
        success: false,
        message: 'Usuário não reconhecido. Utilize o usuário de administrador (ex: admin).',
      };
    }

    // 1. Testa com a senha local atual
    let currentPassword = this.getStoredPassword();
    let isPasswordValid = passClean === currentPassword;

    // 2. Se a senha local falhar, busca no servidor (caso tenha sido alterada em outro aparelho)
    if (!isPasswordValid) {
      currentPassword = await this.syncWithServer();
      isPasswordValid = passClean === currentPassword;
    }

    if (!isPasswordValid) {
      return {
        success: false,
        message: 'Senha incorreta. Verifique se o Caps Lock está ativo ou utilize "Esqueci a senha?".',
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
  async changePassword(
    currentPasswordInput: string,
    newPasswordInput: string
  ): Promise<{ success: boolean; message: string }> {
    let currentPass = this.getStoredPassword();
    if ((currentPasswordInput || '').trim() !== currentPass) {
      currentPass = await this.syncWithServer();
    }

    if ((currentPasswordInput || '').trim() !== currentPass) {
      return { success: false, message: 'A senha atual informada está incorreta.' };
    }

    const cleanNew = (newPasswordInput || '').trim();
    if (cleanNew.length < 3) {
      return { success: false, message: 'A nova senha deve possuir no mínimo 3 caracteres.' };
    }

    inMemoryPassword = cleanNew;
    try {
      localStorage.setItem(PASSWORD_STORAGE_KEY, cleanNew);
    } catch {
      // ignore
    }

    // Persiste no servidor para sincronizar todos os dispositivos
    await this.pushPasswordToServer(cleanNew);

    return { success: true, message: 'Senha de administrador alterada com sucesso em todos os dispositivos!' };
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
  async resetPasswordWithPin(
    pin: string,
    newPasswordInput: string
  ): Promise<{ success: boolean; message: string }> {
    if (!this.validateRecoveryPin(pin)) {
      return { success: false, message: 'PIN de segurança incorreto. Acesso não autorizado.' };
    }

    const cleanNew = (newPasswordInput || '').trim();
    if (cleanNew.length < 3) {
      return { success: false, message: 'A nova senha deve possuir no mínimo 3 caracteres.' };
    }

    inMemoryPassword = cleanNew;
    try {
      localStorage.setItem(PASSWORD_STORAGE_KEY, cleanNew);
    } catch {
      // ignore
    }

    // Persiste no servidor para sincronizar todos os dispositivos
    await this.pushPasswordToServer(cleanNew);

    return { success: true, message: 'Nova senha de administrador redefinida e sincronizada com sucesso!' };
  },
};
