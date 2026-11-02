import { PaginationMeta } from '../types/api.types';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export const getPaginationParams = (
  query: { page?: string | number; limit?: string | number },
  defaultLimit = 20,
  maxLimit = 100
): PaginationParams => {
  const page = Math.max(1, Number(query.page) || 1);
  const rawLimit = Number(query.limit) || defaultLimit;
  const limit = Math.min(Math.max(1, rawLimit), maxLimit);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

export const buildPaginationMeta = (
  total: number,
  page: number,
  limit: number
): PaginationMeta => {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
};
