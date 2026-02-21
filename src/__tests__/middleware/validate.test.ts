import { z } from 'zod';
import { validateRequest, validateParams, validateQuery } from '../../middleware/validate';

const mockResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as any;
  return res;
};

describe('middleware/validate', () => {
  describe('validateRequest', () => {
    it('passes through valid payloads', async () => {
      const schema = z.object({ name: z.string() });
      const req: any = { body: { name: 'Test' } };
      const res = mockResponse();
      const next = jest.fn();

      const middleware = validateRequest(schema);
      await middleware(req, res, next);

      expect(req.body).toEqual({ name: 'Test' });
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('returns 400 on validation error', async () => {
      const schema = z.object({ required: z.string() });
      const req: any = { body: {} };
      const res = mockResponse();
      const next = jest.fn();

      const middleware = validateRequest(schema);
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: expect.any(String) })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validateParams', () => {
    it('merges validated params back onto request', async () => {
      const schema = z.object({ id: z.string() });
      const req: any = { params: { id: '123', extra: 'keep' } };
      const res = mockResponse();
      const next = jest.fn();

      const middleware = validateParams(schema);
      await middleware(req, res, next);

      expect(req.params).toEqual({ id: '123', extra: 'keep' });
      expect(next).toHaveBeenCalled();
    });

    it('responds with 400 on invalid params', async () => {
      const schema = z.object({ id: z.string().uuid() });
      const req: any = { params: { id: 'not-a-uuid' } };
      const res = mockResponse();
      const next = jest.fn();

      const middleware = validateParams(schema);
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validateQuery', () => {
    it('validates querystring fields', async () => {
      const schema = z.object({ page: z.coerce.number().min(1) });
      const req: any = { query: { page: '2', other: 'keep' } };
      const res = mockResponse();
      const next = jest.fn();

      const middleware = validateQuery(schema);
      await middleware(req, res, next);

      expect(req.query.page).toBe(2);
      expect(req.query.other).toBe('keep');
      expect(next).toHaveBeenCalled();
    });

    it('handles invalid query parameters', async () => {
      const schema = z.object({ page: z.number().int().min(1) });
      const req: any = { query: { page: 0 } };
      const res = mockResponse();
      const next = jest.fn();

      const middleware = validateQuery(schema);
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: expect.any(String) })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });
});
