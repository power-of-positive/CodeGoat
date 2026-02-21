import { Request, Response } from 'express';
import { ZodError, z } from 'zod';
import {
  AppError,
  asyncHandler,
  createErrorHandler,
  throwBadRequest,
  throwConflict,
  throwForbidden,
  throwNotFound,
  throwUnauthorized,
  throwValidationError,
} from '../../middleware/error-handler';
import { ErrorCode } from '../../utils/api-response';

const createMockLogger = () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
});

const createMockResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.end = jest.fn();
  return res as Response;
};

const createMockRequest = (overrides: Partial<Request> = {}): Request =>
  ({
    path: '/test',
    method: 'GET',
    body: {},
    query: {},
    params: {},
    ...overrides,
  }) as Request;

describe('error-handler middleware', () => {
  const logger = createMockLogger();
  const handler = createErrorHandler(logger);
  let originalNodeEnv: string | undefined;

  beforeAll(() => {
    originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const invokeHandler = (err: Error, reqOverrides: Partial<Request> = {}) => {
    const req = createMockRequest(reqOverrides);
    const res = createMockResponse();
    handler(err, req, res, jest.fn());
    return { req, res };
  };

  it('handles Zod validation errors', () => {
    const schema = z.object({ email: z.string().email() });
    const result = schema.safeParse({ email: 'not-an-email' });
    if (result.success) {
      throw new Error('Expected schema validation to fail');
    }
    const zodError = result.error;

    const { res } = invokeHandler(zodError);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: ErrorCode.VALIDATION_ERROR,
          details: { email: expect.any(String) },
        }),
      })
    );
  });

  it('handles AppError instances', () => {
    const appError = new AppError(409, ErrorCode.CONFLICT, 'Already exists');
    const { res } = invokeHandler(appError);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: ErrorCode.CONFLICT,
          message: 'Already exists',
        }),
      })
    );
  });

  it.each([
    ['not found', 404, ErrorCode.NOT_FOUND],
    ['already exists', 409, ErrorCode.CONFLICT],
    ['unauthorized', 401, ErrorCode.UNAUTHORIZED],
    ['forbidden', 403, ErrorCode.FORBIDDEN],
  ])('maps message "%s" to %s response', (message, status, code) => {
    const { res } = invokeHandler(new Error(message));
    expect(res.status).toHaveBeenCalledWith(status);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code }) })
    );
  });

  it('handles generic errors with stack details in non-production', () => {
    const error = new Error('Unexpected');
    const { res } = invokeHandler(error);

    expect(logger.error).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Unexpected',
          details: expect.objectContaining({ stack: expect.any(String) }),
        }),
      })
    );
  });

  it('hides internal details in production', () => {
    process.env.NODE_ENV = 'production';
    const error = new Error('Internal detail');
    const { res } = invokeHandler(error);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'An unexpected error occurred',
          details: undefined,
        }),
      })
    );
    process.env.NODE_ENV = 'test';
  });

  it('asyncHandler forwards errors to next middleware', async () => {
    const next = jest.fn();
    const wrapped = asyncHandler(async () => {
      throw new Error('async failure');
    });
    await wrapped(createMockRequest(), createMockResponse(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('helper functions throw AppError with expected codes', () => {
    expect(() => throwNotFound('missing')).toThrow(
      expect.objectContaining({ code: ErrorCode.NOT_FOUND })
    );
    expect(() => throwBadRequest('bad')).toThrow(
      expect.objectContaining({ code: ErrorCode.BAD_REQUEST })
    );
    expect(() => throwConflict('conflict')).toThrow(
      expect.objectContaining({ code: ErrorCode.CONFLICT })
    );
    expect(() => throwUnauthorized('unauthorized')).toThrow(
      expect.objectContaining({ code: ErrorCode.UNAUTHORIZED })
    );
    expect(() => throwForbidden('forbidden')).toThrow(
      expect.objectContaining({ code: ErrorCode.FORBIDDEN })
    );
    expect(() => throwValidationError('invalid')).toThrow(
      expect.objectContaining({ code: ErrorCode.VALIDATION_ERROR })
    );
  });
});
