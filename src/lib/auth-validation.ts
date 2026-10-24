export type FormErrors = Record<string, string>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isAdultBirthDate(input: string, now = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return false;
  const parsed = new Date(input + 'T00:00:00.000Z');
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== input) return false;
  const years = now.getUTCFullYear() - parsed.getUTCFullYear();
  const months = now.getUTCMonth() - parsed.getUTCMonth();
  const days = now.getUTCDate() - parsed.getUTCDate();
  const age = years - (months < 0 || (months === 0 && days < 0) ? 1 : 0);
  return age >= 18 && age <= 115;
}

export function validateLogin(email: string, password: string): FormErrors {
  const errors: FormErrors = {};
  if (!EMAIL.test(email.trim()) || email.trim().length > 254) {
    errors.email = 'Enter a valid email address.';
  }
  if (!password) errors.password = 'Enter your password.';
  return errors;
}

export type RegistrationInput = {
  displayName: string;
  birthDate: string;
  email: string;
  password: string;
  confirmPassword: string;
  adultConfirmed: boolean;
};

export function validateRegistration(input: RegistrationInput): FormErrors {
  const errors: FormErrors = {};
  const name = input.displayName.trim();
  if (name.length < 2 || name.length > 60) {
    errors.displayName = 'Use between 2 and 60 characters.';
  }
  if (!isAdultBirthDate(input.birthDate)) {
    errors.birthDate = 'Enter a valid birth date. LoveBind is for adults 18+.';
  }
  if (!EMAIL.test(input.email.trim()) || input.email.trim().length > 254) {
    errors.email = 'Enter a valid email address.';
  }
  if (input.password.length < 12 || input.password.length > 128) {
    errors.password = 'Use a password between 12 and 128 characters.';
  }
  if (input.confirmPassword !== input.password) {
    errors.confirmPassword = 'Passwords do not match.';
  }
  if (!input.adultConfirmed) errors.adultConfirmed = 'You must confirm that you are at least 18.';
  return errors;
}

export function passwordStrength(password: string): { level: number; label: string } {
  if (!password) return { level: 0, label: 'Use 12 or more characters.' };
  let level = 0;
  if (password.length >= 12) level++;
  if (password.length >= 16) level++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) level++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) level++;
  return { level, label: ['Too short', 'Getting started', 'Fair', 'Good', 'Strong'][level] };
}
