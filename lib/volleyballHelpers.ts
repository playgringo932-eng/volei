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
 * Determines official volleyball category based on age:
 * - 7 a 10 anos: Sub-10
 * - 11 a 13 anos: Sub-13
 * - 14 a 17 anos: Sub-17
 */
export function getCategoryByAge(age: number): VolleyballCategory {
  if (age <= 10) return 'Sub-10';
  if (age <= 13) return 'Sub-13';
  return 'Sub-17';
}

/**
 * Normalizes any category string (including legacy values) to the 3 official categories
 */
export function normalizeCategory(category?: string, age?: number): VolleyballCategory {
  if (age != null && age >= 7) {
    return getCategoryByAge(age);
  }
  if (category === 'Sub-9' || category === 'Sub-10') return 'Sub-10';
  if (category === 'Sub-11' || category === 'Sub-13') return 'Sub-13';
  if (category === 'Sub-15' || category === 'Sub-17') return 'Sub-17';
  return 'Sub-13';
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

export const formatBrazilianPhone = formatBRPhone;

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
  const num = String(Math.max(1, index)).padStart(3, '0');
  return `VOL-${year}-${num}`;
}

/**
 * Calculates the next unique sequential registration code by inspecting existing student numbers
 */
export function generateNextRegistrationCode(
  existingStudentsOrCount: { registrationNumber?: string }[] | number = 0
): string {
  const year = new Date().getFullYear();
  if (typeof existingStudentsOrCount === 'number') {
    return `VOL-${year}-${String(Math.max(1, existingStudentsOrCount)).padStart(3, '0')}`;
  }
  let maxSeq = 0;
  existingStudentsOrCount.forEach((st) => {
    const match = (st.registrationNumber || '').match(/(\d+)$/);
    if (match) {
      const val = parseInt(match[1], 10);
      if (!isNaN(val) && val > maxSeq) {
        maxSeq = val;
      }
    }
  });
  return `VOL-${year}-${String(maxSeq + 1).padStart(3, '0')}`;
}

let notifCounter = 0;
export function generateNotificationId(): string {
  notifCounter += 1;
  return `notif-${Date.now()}-${notifCounter}`;
}

