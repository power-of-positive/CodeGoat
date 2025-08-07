import { Route, ProxyRequest } from './types';

export class RouteMatcher {
  matchRoute(routes: Route[], request: ProxyRequest): Route | null {
    for (const route of routes) {
      if (this.matchesPath(route.match.path, request.path) && 
          this.matchesMethod(route.match.method, request.method)) {
        return route;
      }
    }
    return null;
  }

  private matchesPath(pattern: string, path: string): boolean {
    if (pattern === path) {
      return true;
    }

    if (pattern.includes('*')) {
      const regexPattern = pattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*');
      const regex = new RegExp(`^${regexPattern}$`);
      return regex.test(path);
    }

    return false;
  }

  private matchesMethod(routeMethod: string | string[], requestMethod: string): boolean {
    if (Array.isArray(routeMethod)) {
      return routeMethod.includes(requestMethod.toUpperCase());
    }
    return routeMethod.toUpperCase() === requestMethod.toUpperCase();
  }

  rewritePath(route: Route, originalPath: string): string {
    if (!route.target.rewritePath) {
      return originalPath;
    }

    const matchPattern = route.match.path;
    if (matchPattern.includes('*')) {
      const prefix = matchPattern.substring(0, matchPattern.indexOf('*'));
      if (originalPath.startsWith(prefix)) {
        return originalPath.substring(prefix.length - 1);
      }
    }

    return originalPath;
  }
}