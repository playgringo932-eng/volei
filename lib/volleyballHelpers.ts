import { VolleyballCategory } from '@/types/volleyball';

export const MIN_STUDENT_AGE = 7;
export const MAX_STUDENT_AGE = 17;

/**
 * Calculates current age from YYYY-MM-DD birthdate.
 */
export function calculateAge(birthDateString: string): number {
  if (!birthDateString) return 0;
  const today = new Date();
  const birthDate = new Date(birthDateString);
  if (isNaN(birthDate.getTime())) return 0;

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/**
 * Determines volleyball category based on age
 */
export function getCategoryByAge(age: number): VolleyballCategory {
  if (age <= 9) return 'Sub-9';
  if (age <= 11) return 'Sub-11';
  if (age <= 13) return 'Sub-13';
  if (age <= 15) return 'Sub-15';
  return 'Sub-17';
}

/**
 * Validates if student age meets the [7, 17] bounds
 */
export function validateStudentAge(birthDateString: string): {
  isValid: boolean;
  age: number;
  errorMessage?: string;
  category?: VolleyballCategory;
} {
  if (!birthDateString) {
    return { isValid: false, age: 0, errorMessage: 'Data de nascimento é obrigatória.' };
  }
  const age = calculateAge(birthDateString);
  if (age < MIN_STUDENT_AGE) {
    return {
      isValid: false,
      age,
      errorMessage: `Idade não permitida (${age} anos). A idade mínima para matrícula no vôlei é de ${MIN_STUDENT_AGE} anos.`,
    };
  }
  if (age > MAX_STUDENT_AGE) {
    return {
      isValid: false,
      age,
      errorMessage: `Idade não permitida (${age} anos). A idade máxima para a modalidade juvenil é de ${MAX_STUDENT_AGE} anos.`,
    };
  }
  return {
    isValid: true,
    age,
    category: getCategoryByAge(age),
  };
}

/**
 * Format Brazilian phone number: (XX) 9XXXX-XXXX
 */
export function formatBRPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/**
 * Clean phone to pure international number for WhatsApp link
 */
export function getCleanWhatsAppNumber(phone: string): string {
  let clean = phone.replace(/\D/g, '');
  if (!clean.startsWith('55') && clean.length >= 10) {
    clean = '55' + clean;
  }
  return clean;
}

/**
 * Builds direct WhatsApp URL with URL-encoded message
 */
export function createWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = getCleanWhatsAppNumber(phone);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Generate formatted registration number: VOL-YEAR-XXX
 */
export function generateRegistrationCode(index: number): string {
  const year = new Date().getFullYear();
  const num = String(index).padStart(3, '0');
  return `VOL-${year}-${num}`;
}

let notifCounter = 0;
export function generateNotificationId(): string {
  notifCounter += 1;
  return `notif-${Date.now()}-${notifCounter}`;
}

