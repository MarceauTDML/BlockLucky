import { Response } from 'express';
import { ApiResponse, PaginationMeta } from '../types/api.types';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 400, details?: unknown, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const sendSuccess = <T>(
  res: Response,
  data?: T,
  message = 'Opération réussie',
  statusCode = 200,
  meta?: PaginationMeta
): Response<ApiResponse<T>> => {
  const payload: ApiResponse<T> = {
    success: true,
    message,
    ...(data !== undefined && { data }),
    ...(meta !== undefined && { meta }),
  };
  return res.status(statusCode).json(payload);
};

export const sendError = (
  res: Response,
  message = 'Une erreur est survenue',
  statusCode = 500,
  errors?: unknown
): Response<ApiResponse<null>> => {
  const payload: ApiResponse<null> = {
    success: false,
    message,
    ...(errors !== undefined && { errors }),
  };
  return res.status(statusCode).json(payload);
};
