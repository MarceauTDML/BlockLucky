interface ApiErrorShape {
  status?: number | string;
  data?: {
    message?: string;
    errors?: { code?: string } | null;
  };
}

const asApiError = (error: unknown): ApiErrorShape =>
  error && typeof error === 'object' ? (error as ApiErrorShape) : {};

export const getApiErrorMessage = (error: unknown, fallback: string): string => {
  const message = asApiError(error).data?.message;
  return typeof message === 'string' && message.trim() ? message : fallback;
};

export const getApiErrorStatus = (error: unknown): number | undefined => {
  const status = asApiError(error).status;
  return typeof status === 'number' ? status : undefined;
};

export const isAgeVerificationError = (error: unknown): boolean => {
  const parsed = asApiError(error);
  return parsed.data?.errors?.code === 'AGE_VERIFICATION_REQUIRED';
};
