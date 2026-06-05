/**
 * Router — HTTP route matcher
 *
 * Inspired by: Express / Fastify / Hono
 *
 * Register routes with patterns and methods, then dispatch requests.
 * Supports:
 *   - path params: /users/:id
 *   - wildcard: /files/*
 *   - multiple methods per route
 *   - middleware chain
 *   - route groups (prefix)
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | '*';

export type Handler = (ctx: Record<string, unknown>) => unknown | Promise<unknown>;
export type Middleware = (ctx: Record<string, unknown>, next: () => Promise<void>) => Promise<void> | void;

export interface RouteMatch {
  params: Record<string, string>;
  query: Record<string, string>;
  path: string;
  method: HttpMethod;
  pattern: string;
  handler: Handler;
}

export interface RequestContext {
  method: HttpMethod;
  path: string;
  query: Record<string, string>;
  params: Record<string, string>;
  headers: Record<string, string>;
  body: unknown;
  state: Record<string, unknown>;
}

export interface RouteEntry {
  method: HttpMethod;
  pattern: string;
  regex: RegExp;
  paramNames: string[];
  handler: Handler;
  middleware: Middleware[];
}

export class Router {
  private routes: RouteEntry[] = [];
  private middleware: Middleware[] = [];
  private prefix: string = '';

  /**
   * Add a prefix to all subsequently added routes.
   */
  group(prefix: string): Router {
    const r = new Router();
    r.prefix = this.normalizePath(this.prefix + prefix);
    return r;
  }

  /**
   * Register a route.
   */
  add(method: HttpMethod, pattern: string, handler: Handler, middleware: Middleware[] = []): void {
    const fullPattern = this.normalizePath(this.prefix + pattern);
    const { regex, paramNames } = this.compile(fullPattern);
    this.routes.push({
      method,
      pattern: fullPattern,
      regex,
      paramNames,
      handler,
      middleware,
    });
  }

  /** Register a route for multiple methods. */
  all(methods: HttpMethod[], pattern: string, handler: Handler): void {
    for (const m of methods) this.add(m, pattern, handler);
  }

  get(pattern: string, handler: Handler, middleware?: Middleware[]): void { this.add('GET', pattern, handler, middleware); }
  post(pattern: string, handler: Handler, middleware?: Middleware[]): void { this.add('POST', pattern, handler, middleware); }
  put(pattern: string, handler: Handler, middleware?: Middleware[]): void { this.add('PUT', pattern, handler, middleware); }
  delete(pattern: string, handler: Handler, middleware?: Middleware[]): void { this.add('DELETE', pattern, handler, middleware); }
  patch(pattern: string, handler: Handler, middleware?: Middleware[]): void { this.add('PATCH', pattern, handler, middleware); }

  /** Use middleware on all routes. */
  use(middleware: Middleware): void {
    this.middleware.push(middleware);
  }

  /**
   * Find a matching route.
   */
  find(method: HttpMethod, path: string): RouteMatch | undefined {
    // Split off query string before normalizing/matching
    const queryIdx = path.indexOf('?');
    const pathOnly = queryIdx >= 0 ? path.slice(0, queryIdx) : path;
    const normalized = this.normalizePath(pathOnly);
    for (const route of this.routes) {
      if (route.method !== '*' && route.method !== method) continue;
      const m = route.regex.exec(normalized);
      if (m) {
        const params: Record<string, string> = {};
        for (let i = 0; i < route.paramNames.length; i++) {
          params[route.paramNames[i]] = decodeURIComponent(m[i + 1]);
        }
        return {
          params,
          query: this.parseQuery(path),
          path: normalized,
          method,
          pattern: route.pattern,
          handler: route.handler,
        };
      }
    }
    return undefined;
  }

  /**
   * Dispatch a request through the middleware chain and route handler.
   */
  async dispatch(ctx: RequestContext): Promise<unknown> {
    const match = this.find(ctx.method, ctx.path);
    if (!match) {
      throw new Error(`no route for ${ctx.method} ${ctx.path}`);
    }
    ctx.params = match.params;
    const allMiddleware: Middleware[] = [...this.middleware];
    for (const r of this.routes) {
      if (r.regex.test(match.path) && (r.method === ctx.method || r.method === '*')) {
        allMiddleware.push(...r.middleware);
        break;
      }
    }
    let idx = -1;
    const next = async (): Promise<void> => {
      idx += 1;
      if (idx < allMiddleware.length) {
        await allMiddleware[idx](ctx as unknown as Record<string, unknown>, next);
      }
    };
    await next();
    return await match.handler(ctx as unknown as Record<string, unknown>);
  }

  /** Get all registered routes. */
  list(): Array<{ method: HttpMethod; pattern: string }> {
    return this.routes.map((r) => ({ method: r.method, pattern: r.pattern }));
  }

  /** Total route count. */
  count(): number {
    return this.routes.length;
  }

  private compile(pattern: string): { regex: RegExp; paramNames: string[] } {
    const paramNames: string[] = [];
    const segments = pattern.split('/').filter(Boolean);
    const regexParts = segments.map((seg) => {
      if (seg.startsWith(':')) {
        paramNames.push(seg.slice(1));
        return '([^/]+)';
      }
      if (seg === '*') {
        return '.*';
      }
      return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    });
    const regex = new RegExp('^' + (regexParts.length > 0 ? '/' + regexParts.join('/') : '/') + '/?$');
    return { regex, paramNames };
  }

  private normalizePath(path: string): string {
    if (!path.startsWith('/')) path = '/' + path;
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
    return path;
  }

  private parseQuery(path: string): Record<string, string> {
    const idx = path.indexOf('?');
    if (idx < 0) return {};
    const result: Record<string, string> = {};
    const search = path.slice(idx + 1);
    for (const part of search.split('&')) {
      if (!part) continue;
      const [k, v] = part.split('=');
      result[decodeURIComponent(k)] = decodeURIComponent(v ?? '');
    }
    return result;
  }
}
