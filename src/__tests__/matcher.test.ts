import { RouteMatcher } from '../matcher';
import { Route, ProxyRequest } from '../types';

describe('RouteMatcher', () => {
  let matcher: RouteMatcher;

  beforeEach(() => {
    matcher = new RouteMatcher();
  });

  const createRoute = (path: string, method: string | string[]): Route => ({
    name: 'Test Route',
    match: { path, method },
    target: {
      url: 'http://example.com',
      headers: { forward: ['*'] },
    },
    streaming: false,
  });

  const createRequest = (path: string, method: string): ProxyRequest => ({
    path,
    method,
    headers: {},
    query: {},
  });

  describe('matchRoute()', () => {
    it('should match exact paths', () => {
      const routes = [createRoute('/api/test', 'GET')];
      const request = createRequest('/api/test', 'GET');

      const match = matcher.matchRoute(routes, request);
      expect(match).toBeTruthy();
      expect(match?.name).toBe('Test Route');
    });

    it('should match wildcard paths', () => {
      const routes = [createRoute('/api/*', 'GET')];
      const request = createRequest('/api/users/123', 'GET');

      const match = matcher.matchRoute(routes, request);
      expect(match).toBeTruthy();
    });

    it('should match multiple HTTP methods', () => {
      const routes = [createRoute('/api/test', ['GET', 'POST'])];
      const getRequest = createRequest('/api/test', 'GET');
      const postRequest = createRequest('/api/test', 'POST');
      const putRequest = createRequest('/api/test', 'PUT');

      expect(matcher.matchRoute(routes, getRequest)).toBeTruthy();
      expect(matcher.matchRoute(routes, postRequest)).toBeTruthy();
      expect(matcher.matchRoute(routes, putRequest)).toBeNull();
    });

    it('should be case insensitive for HTTP methods', () => {
      const routes = [createRoute('/api/test', 'GET')];
      const request = createRequest('/api/test', 'get');

      const match = matcher.matchRoute(routes, request);
      expect(match).toBeTruthy();
    });

    it('should return null for no matches', () => {
      const routes = [createRoute('/api/test', 'GET')];
      const request = createRequest('/api/other', 'GET');

      const match = matcher.matchRoute(routes, request);
      expect(match).toBeNull();
    });

    it('should return first matching route', () => {
      const routes = [
        { ...createRoute('/api/*', 'GET'), name: 'Wildcard Route' },
        { ...createRoute('/api/specific', 'GET'), name: 'Specific Route' },
      ];
      const request = createRequest('/api/specific', 'GET');

      const match = matcher.matchRoute(routes, request);
      expect(match?.name).toBe('Wildcard Route');
    });
  });

  describe('rewritePath()', () => {
    it('should return original path when rewritePath is false', () => {
      const route: Route = {
        ...createRoute('/api/*', 'GET'),
        target: {
          url: 'http://example.com',
          headers: { forward: ['*'] },
          rewritePath: false,
        },
      };

      const rewritten = matcher.rewritePath(route, '/api/users/123');
      expect(rewritten).toBe('/api/users/123');
    });

    it('should rewrite path when rewritePath is true', () => {
      const route: Route = {
        ...createRoute('/api/*', 'GET'),
        target: {
          url: 'http://example.com',
          headers: { forward: ['*'] },
          rewritePath: true,
        },
      };

      const rewritten = matcher.rewritePath(route, '/api/users/123');
      expect(rewritten).toBe('/users/123');
    });

    it('should handle paths without wildcard', () => {
      const route: Route = {
        ...createRoute('/api/test', 'GET'),
        target: {
          url: 'http://example.com',
          headers: { forward: ['*'] },
          rewritePath: true,
        },
      };

      const rewritten = matcher.rewritePath(route, '/api/test');
      expect(rewritten).toBe('/api/test');
    });
  });
});
