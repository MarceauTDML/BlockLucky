export interface ApiErrorShape {
  status?: number | string;
  data?: { message?: string; errors?: Record<string, unknown> } | string;
}

export const getErrorStatus = (error: unknown): number | undefined => {
  const status = (error as ApiErrorShape | undefined)?.status;
  return typeof status === 'number' ? status : undefined;
};

export const getErrorMessage = (error: unknown, fallback: string): string => {
  const data = (error as ApiErrorShape | undefined)?.data;
  if (data && typeof data === 'object' && typeof data.message === 'string' && data.message.trim()) {
    return data.message;
  }
  return fallback;
};

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

export const passwordChecks = (password: string) => ({
  length: password.length >= PASSWORD_MIN_LENGTH && password.length <= PASSWORD_MAX_LENGTH,
  letter: /[A-Za-zÀ-ÿ]/.test(password),
  digit: /\d/.test(password),
});

export const isPasswordValid = (password: string): boolean => {
  const checks = passwordChecks(password);
  return checks.length && checks.letter && checks.digit;
};
