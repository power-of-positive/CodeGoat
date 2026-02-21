/**
 * Pagination Middleware
 *
 * Standardized pagination for list endpoints
 * Parses and validates pagination query parameters
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Pagination configuration constants
 */
const PAGINATION_DEFAULTS = {
  PAGE: 1,
  PER_PAGE: 20,
  MAX_PER_PAGE: 100,
  MIN_PER_PAGE: 1,
} as const;

/**
 * Pagination parameters extracted from request
 */
export interface PaginationParams {
  page: number;
  perPage: number;
  offset: number;
}

/**
 * Extend Express Request type to include pagination
 */
declare global {
  namespace Express {
    interface Request {
      pagination: PaginationParams;
    }
  }
}

/**
 * Parse and validate pagination query parameters
 *
 * Extracts `page` and `perPage` from query string and calculates offset.
 * Enforces min/max limits and provides sensible defaults.
 *
 * Query Parameters:
 * - `page` (number, optional): Page number (1-indexed), defaults to 1
 * - `perPage` (number, optional): Items per page, defaults to 20, max 100
 *
 * @example
 * ```typescript
 * // In route definition
 * router.get('/workers', parsePagination, async (req, res) => {
 *   const { page, perPage, offset } = req.pagination;
 *
 *   const [workers, total] = await Promise.all([
 *     db.worker.findMany({ skip: offset, take: perPage }),
 *     db.worker.count(),
 *   ]);
 *
 *   res.json(createCollectionResponse(workers, total, page, perPage, req.baseUrl));
 * });
 *
 * // GET /api/workers?page=2&perPage=50
 * // req.pagination = { page: 2, perPage: 50, offset: 50 }
 * ```
 */
export function parsePagination(req: Request, res: Response, next: NextFunction): void {
  // Parse page number (1-indexed)
  const pageRaw = req.query.page;
  const page = Math.max(
    PAGINATION_DEFAULTS.PAGE,
    parseInt(typeof pageRaw === 'string' ? pageRaw : String(pageRaw || PAGINATION_DEFAULTS.PAGE))
  );

  // Parse items per page with min/max limits
  const perPageRaw = req.query.perPage || req.query.limit; // Support both perPage and limit
  const perPage = Math.min(
    PAGINATION_DEFAULTS.MAX_PER_PAGE,
    Math.max(
      PAGINATION_DEFAULTS.MIN_PER_PAGE,
      parseInt(
        typeof perPageRaw === 'string' ? perPageRaw : String(perPageRaw || PAGINATION_DEFAULTS.PER_PAGE)
      )
    )
  );

  // Calculate offset for database query
  const offset = (page - 1) * perPage;

  // Attach to request object
  req.pagination = {
    page,
    perPage,
    offset,
  };

  next();
}

/**
 * Get default pagination params without middleware
 *
 * Useful for service layer or utility functions that need pagination
 *
 * @param page - Page number (1-indexed)
 * @param perPage - Items per page
 * @returns Pagination parameters
 *
 * @example
 * ```typescript
 * const params = getDefaultPagination(2, 30);
 * // { page: 2, perPage: 30, offset: 30 }
 * ```
 */
export function getDefaultPagination(
  page: number = PAGINATION_DEFAULTS.PAGE,
  perPage: number = PAGINATION_DEFAULTS.PER_PAGE
): PaginationParams {
  const validPage = Math.max(PAGINATION_DEFAULTS.PAGE, page);
  const validPerPage = Math.min(
    PAGINATION_DEFAULTS.MAX_PER_PAGE,
    Math.max(PAGINATION_DEFAULTS.MIN_PER_PAGE, perPage)
  );

  return {
    page: validPage,
    perPage: validPerPage,
    offset: (validPage - 1) * validPerPage,
  };
}

/**
 * Calculate pagination metadata
 *
 * Helper to calculate pagination metadata from total count
 *
 * @param total - Total number of items
 * @param page - Current page
 * @param perPage - Items per page
 * @returns Pagination metadata
 *
 * @example
 * ```typescript
 * const meta = calculatePaginationMeta(100, 2, 20);
 * // {
 * //   total: 100,
 * //   page: 2,
 * //   perPage: 20,
 * //   totalPages: 5,
 * //   hasNext: true,
 * //   hasPrev: true
 * // }
 * ```
 */
export function calculatePaginationMeta(
  total: number,
  page: number,
  perPage: number
): {
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
} {
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return {
    total,
    page,
    perPage,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Build pagination links
 *
 * Generate HATEOAS links for pagination navigation
 *
 * @param baseUrl - Base URL for the resource
 * @param page - Current page
 * @param perPage - Items per page
 * @param totalPages - Total number of pages
 * @param additionalParams - Additional query params to include
 * @returns Pagination links object
 *
 * @example
 * ```typescript
 * const links = buildPaginationLinks('/api/workers', 2, 20, 5, { status: 'running' });
 * // {
 * //   self: '/api/workers?page=2&perPage=20&status=running',
 * //   first: '/api/workers?page=1&perPage=20&status=running',
 * //   last: '/api/workers?page=5&perPage=20&status=running',
 * //   next: '/api/workers?page=3&perPage=20&status=running',
 * //   prev: '/api/workers?page=1&perPage=20&status=running'
 * // }
 * ```
 */
export function buildPaginationLinks(
  baseUrl: string,
  page: number,
  perPage: number,
  totalPages: number,
  additionalParams: Record<string, string> = {}
): {
  self: string;
  first: string;
  last: string;
  next: string | null;
  prev: string | null;
} {
  const buildUrl = (pageNum: number) => {
    const params = new URLSearchParams({
      page: String(pageNum),
      perPage: String(perPage),
      ...additionalParams,
    });
    return `${baseUrl}?${params.toString()}`;
  };

  return {
    self: buildUrl(page),
    first: buildUrl(1),
    last: buildUrl(totalPages),
    next: page < totalPages ? buildUrl(page + 1) : null,
    prev: page > 1 ? buildUrl(page - 1) : null,
  };
}
