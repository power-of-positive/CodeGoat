/**
 * Query Parser Middleware
 *
 * Parses query parameters for filtering, sorting, and field selection
 * Follows JSON:API specification patterns
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Sort direction
 */
export type SortOrder = 'asc' | 'desc';

/**
 * Sort specification
 */
export interface SortSpec {
  field: string;
  order: SortOrder;
}

/**
 * Query options extracted from request
 */
export interface QueryOptions {
  filter: Record<string, string | string[]>;
  sort: SortSpec[];
  fields: string[];
  include: string[];
}

/**
 * Extend Express Request type to include query options
 */
declare global {
  namespace Express {
    interface Request {
      queryOptions: QueryOptions;
    }
  }
}

/**
 * Parse query parameters for filtering, sorting, and field selection
 *
 * Supports:
 * - Filtering: `?filter[status]=running&filter[priority]=high`
 * - Sorting: `?sort=-createdAt,+priority` (- prefix for desc, + or none for asc)
 * - Field selection: `?fields=id,title,status`
 * - Include relations: `?include=scenarios,attempts`
 *
 * @example
 * ```typescript
 * // In route definition
 * router.get('/tasks', parseQueryOptions, async (req, res) => {
 *   const { filter, sort, fields, include } = req.queryOptions;
 *
 *   // Use in Prisma query
 *   const tasks = await db.task.findMany({
 *     where: buildWhereClause(filter),
 *     orderBy: buildOrderByClause(sort),
 *     select: buildSelectClause(fields),
 *     include: buildIncludeClause(include),
 *   });
 * });
 *
 * // GET /api/tasks?filter[status]=completed&sort=-createdAt&fields=id,title
 * // req.queryOptions = {
 * //   filter: { status: 'completed' },
 * //   sort: [{ field: 'createdAt', order: 'desc' }],
 * //   fields: ['id', 'title'],
 * //   include: []
 * // }
 * ```
 */
export function parseQueryOptions(req: Request, res: Response, next: NextFunction): void {
  req.queryOptions = {
    filter: parseFilters(req.query),
    sort: parseSorting(req.query.sort as string | undefined),
    fields: parseFields(req.query.fields as string | undefined),
    include: parseInclude(req.query.include as string | undefined),
  };

  next();
}

/**
 * Parse filter parameters
 *
 * Supports syntax: `filter[fieldName]=value` or `filter[fieldName][]=value1&filter[fieldName][]=value2`
 *
 * @param query - Express query object
 * @returns Parsed filters
 *
 * @example
 * ```typescript
 * // ?filter[status]=completed&filter[priority]=high
 * parseFilters(req.query)
 * // { status: 'completed', priority: 'high' }
 *
 * // ?filter[status][]=pending&filter[status][]=in_progress
 * parseFilters(req.query)
 * // { status: ['pending', 'in_progress'] }
 * ```
 */
function parseFilters(query: Record<string, unknown>): Record<string, string | string[]> {
  const filters: Record<string, string | string[]> = {};

  Object.keys(query).forEach(key => {
    // Match filter[fieldName] or filter[fieldName][]
    const match = key.match(/^filter\[([^\]]+)\](\[\])?$/);

    if (match) {
      const field = match[1];
      const isArray = match[2] === '[]';
      const value = query[key];

      if (isArray && Array.isArray(value)) {
        // Multiple values for same filter
        filters[field] = value.map(String);
      } else if (Array.isArray(value)) {
        // Single filter with multiple values
        filters[field] = value.map(String);
      } else {
        // Single value
        filters[field] = String(value);
      }
    }
  });

  return filters;
}

/**
 * Parse sort parameters
 *
 * Supports syntax: `sort=field1,-field2,+field3`
 * - No prefix or `+` prefix = ascending
 * - `-` prefix = descending
 *
 * @param sortParam - Sort query parameter
 * @returns Array of sort specifications
 *
 * @example
 * ```typescript
 * // ?sort=-createdAt,priority,+title
 * parseSorting('sort=-createdAt,priority,+title')
 * // [
 * //   { field: 'createdAt', order: 'desc' },
 * //   { field: 'priority', order: 'asc' },
 * //   { field: 'title', order: 'asc' }
 * // ]
 * ```
 */
function parseSorting(sortParam: string | undefined): SortSpec[] {
  if (!sortParam) {
    return [];
  }

  return sortParam
    .split(',')
    .map(field => field.trim())
    .filter(field => field.length > 0)
    .map(field => {
      const isDescending = field.startsWith('-');
      const isAscending = field.startsWith('+');

      return {
        field: field.replace(/^[+-]/, ''),
        order: isDescending ? ('desc' as const) : ('asc' as const),
      };
    });
}

/**
 * Parse field selection parameters
 *
 * Supports syntax: `fields=field1,field2,field3`
 * Returns empty array if no fields specified (select all fields)
 *
 * @param fieldsParam - Fields query parameter
 * @returns Array of field names
 *
 * @example
 * ```typescript
 * // ?fields=id,title,status
 * parseFields('id,title,status')
 * // ['id', 'title', 'status']
 * ```
 */
function parseFields(fieldsParam: string | undefined): string[] {
  if (!fieldsParam) {
    return [];
  }

  return fieldsParam
    .split(',')
    .map(field => field.trim())
    .filter(field => field.length > 0);
}

/**
 * Parse include parameters
 *
 * Supports syntax: `include=relation1,relation2,relation3`
 * For including related resources in response
 *
 * @param includeParam - Include query parameter
 * @returns Array of relation names
 *
 * @example
 * ```typescript
 * // ?include=scenarios,attempts
 * parseInclude('scenarios,attempts')
 * // ['scenarios', 'attempts']
 * ```
 */
function parseInclude(includeParam: string | undefined): string[] {
  if (!includeParam) {
    return [];
  }

  return includeParam
    .split(',')
    .map(relation => relation.trim())
    .filter(relation => relation.length > 0);
}

/**
 * Helper: Build Prisma where clause from filters
 *
 * Converts filter object to Prisma where clause
 *
 * @param filters - Parsed filters
 * @returns Prisma where clause
 *
 * @example
 * ```typescript
 * const filters = { status: 'completed', priority: ['high', 'urgent'] };
 * const where = buildWhereClause(filters);
 * // { status: 'completed', priority: { in: ['high', 'urgent'] } }
 * ```
 */
export function buildWhereClause(
  filters: Record<string, string | string[]>
): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  Object.entries(filters).forEach(([field, value]) => {
    if (Array.isArray(value)) {
      // Multiple values - use IN clause
      where[field] = { in: value };
    } else {
      // Single value - direct equality
      where[field] = value;
    }
  });

  return where;
}

/**
 * Helper: Build Prisma orderBy clause from sort specs
 *
 * Converts sort specifications to Prisma orderBy clause
 *
 * @param sort - Sort specifications
 * @returns Prisma orderBy clause
 *
 * @example
 * ```typescript
 * const sort = [
 *   { field: 'priority', order: 'desc' },
 *   { field: 'createdAt', order: 'asc' }
 * ];
 * const orderBy = buildOrderByClause(sort);
 * // [{ priority: 'desc' }, { createdAt: 'asc' }]
 * ```
 */
export function buildOrderByClause(sort: SortSpec[]): Array<Record<string, SortOrder>> {
  return sort.map(s => ({ [s.field]: s.order }));
}

/**
 * Helper: Build Prisma select clause from fields
 *
 * Converts field list to Prisma select clause
 * Returns undefined if no fields specified (select all)
 *
 * @param fields - Field names
 * @returns Prisma select clause or undefined
 *
 * @example
 * ```typescript
 * const fields = ['id', 'title', 'status'];
 * const select = buildSelectClause(fields);
 * // { id: true, title: true, status: true }
 *
 * const noFields = [];
 * const select2 = buildSelectClause(noFields);
 * // undefined (select all fields)
 * ```
 */
export function buildSelectClause(fields: string[]): Record<string, boolean> | undefined {
  if (fields.length === 0) {
    return undefined;
  }

  return fields.reduce(
    (acc, field) => {
      acc[field] = true;
      return acc;
    },
    {} as Record<string, boolean>
  );
}

/**
 * Helper: Build Prisma include clause from relations
 *
 * Converts relation list to Prisma include clause
 * Returns empty object if no relations specified
 *
 * @param include - Relation names
 * @returns Prisma include clause
 *
 * @example
 * ```typescript
 * const include = ['scenarios', 'attempts'];
 * const includeClause = buildIncludeClause(include);
 * // { scenarios: true, attempts: true }
 * ```
 */
export function buildIncludeClause(include: string[]): Record<string, boolean> {
  return include.reduce(
    (acc, relation) => {
      acc[relation] = true;
      return acc;
    },
    {} as Record<string, boolean>
  );
}

/**
 * Create full query options manually (for service layer)
 *
 * @param options - Partial query options
 * @returns Complete query options
 *
 * @example
 * ```typescript
 * const options = createQueryOptions({
 *   filter: { status: 'completed' },
 *   sort: [{ field: 'createdAt', order: 'desc' }]
 * });
 * ```
 */
export function createQueryOptions(options: Partial<QueryOptions> = {}): QueryOptions {
  return {
    filter: options.filter || {},
    sort: options.sort || [],
    fields: options.fields || [],
    include: options.include || [],
  };
}
