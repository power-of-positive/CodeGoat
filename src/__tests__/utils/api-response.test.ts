import {
  createErrorResponse,
  createDataResponse,
  createCollectionResponse,
  ErrorCode,
  getErrorCodeFromStatus,
} from '../../utils/api-response';

describe('api-response utilities', () => {
  const fixedDate = new Date('2025-01-01T00:00:00.000Z');

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(fixedDate);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('creates standardized error responses', () => {
    const response = createErrorResponse(
      ErrorCode.BAD_REQUEST,
      'Invalid input',
      { email: 'Invalid email format' },
      '/api/test'
    );

    expect(response).toEqual({
      error: {
        code: ErrorCode.BAD_REQUEST,
        message: 'Invalid input',
        details: { email: 'Invalid email format' },
        timestamp: fixedDate.toISOString(),
        path: '/api/test',
      },
    });
  });

  it('creates data responses with optional metadata and links', () => {
    const meta = { message: 'Created' };
    const links = { self: '/api/resource/1' };

    const response = createDataResponse({ id: 1 }, meta, links);

    expect(response.data).toEqual({ id: 1 });
    expect(response.meta).toMatchObject({
      message: 'Created',
      timestamp: fixedDate.toISOString(),
    });
    expect(response.links).toEqual(links);
  });

  it('creates collection responses with pagination metadata', () => {
    const response = createCollectionResponse([1, 2, 3], 10, 2, 3, '/api/items');

    expect(response.data).toEqual([1, 2, 3]);
    expect(response.meta).toEqual({
      total: 10,
      page: 2,
      perPage: 3,
      totalPages: 4,
      hasNext: true,
      hasPrev: true,
    });
    expect(response.links).toEqual({
      self: '/api/items?page=2&perPage=3',
      first: '/api/items?page=1&perPage=3',
      last: '/api/items?page=4&perPage=3',
      next: '/api/items?page=3&perPage=3',
      prev: '/api/items?page=1&perPage=3',
    });
  });

  it('uses safe defaults when pagination exceeds bounds', () => {
    const response = createCollectionResponse([], 0, 1, 10, '/api/items');

    expect(response.meta.totalPages).toBe(1);
    expect(response.meta.hasNext).toBe(false);
    expect(response.links?.next).toBeNull();
    expect(response.links?.prev).toBeNull();
  });

  it.each([
    [400, ErrorCode.BAD_REQUEST],
    [401, ErrorCode.UNAUTHORIZED],
    [403, ErrorCode.FORBIDDEN],
    [404, ErrorCode.NOT_FOUND],
    [409, ErrorCode.CONFLICT],
    [422, ErrorCode.VALIDATION_ERROR],
    [429, ErrorCode.RATE_LIMITED],
    [500, ErrorCode.INTERNAL_ERROR],
    [503, ErrorCode.SERVICE_UNAVAILABLE],
    [999, ErrorCode.INTERNAL_ERROR],
  ])('maps HTTP status %s to error code %s', (status, expected) => {
    expect(getErrorCodeFromStatus(status)).toBe(expected);
  });
});
