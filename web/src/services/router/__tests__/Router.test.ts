/**
 * Router.test.ts — Pure unit tests for HTTP router
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Router, type RequestContext } from '../Router';

describe('Router — basic route matching', () => {
  let r: Router;
  beforeEach(() => {
    r = new Router();
  });

  it('matches exact path', () => {
    r.get('/users', () => 'list');
    const m = r.find('GET', '/users');
    expect(m).toBeDefined();
  });

  it('returns undefined for no match', () => {
    r.get('/users', () => 'list');
    expect(r.find('GET', '/nope')).toBeUndefined();
  });

  it('method filtering', () => {
    r.get('/users', () => 'list');
    expect(r.find('POST', '/users')).toBeUndefined();
  });

  it('wildcard method matches all', () => {
    r.add('*', '/any', () => 'any');
    expect(r.find('GET', '/any')).toBeDefined();
    expect(r.find('POST', '/any')).toBeDefined();
  });

  it('extracts path params', () => {
    r.get('/users/:id', () => 'show');
    const m = r.find('GET', '/users/42');
    expect(m?.params.id).toBe('42');
  });

  it('extracts multiple path params', () => {
    r.get('/users/:uid/posts/:pid', () => 'show');
    const m = r.find('GET', '/users/1/posts/2');
    expect(m?.params.uid).toBe('1');
    expect(m?.params.pid).toBe('2');
  });

  it('parses query string', () => {
    r.get('/search', () => 'search');
    const m = r.find('GET', '/search?q=hello&n=5');
    expect(m?.query.q).toBe('hello');
    expect(m?.query.n).toBe('5');
  });

  it('wildcard segment matches anything', () => {
    r.get('/files/*', () => 'files');
    const m = r.find('GET', '/files/a/b/c.txt');
    expect(m).toBeDefined();
  });
});

describe('Router — HTTP method shortcuts', () => {
  it('get/post/put/delete/patch work', () => {
    const r = new Router();
    r.get('/g', () => 'g');
    r.post('/p', () => 'p');
    r.put('/u', () => 'u');
    r.delete('/d', () => 'd');
    r.patch('/pa', () => 'pa');
    expect(r.find('GET', '/g')).toBeDefined();
    expect(r.find('POST', '/p')).toBeDefined();
    expect(r.find('PUT', '/u')).toBeDefined();
    expect(r.find('DELETE', '/d')).toBeDefined();
    expect(r.find('PATCH', '/pa')).toBeDefined();
  });

  it('all registers multiple methods', () => {
    const r = new Router();
    r.all(['GET', 'POST'], '/multi', () => 'x');
    expect(r.find('GET', '/multi')).toBeDefined();
    expect(r.find('POST', '/multi')).toBeDefined();
  });
});

describe('Router — middleware chain', () => {
  it('runs middleware in order', async () => {
    const r = new Router();
    const order: string[] = [];
    r.use((_ctx, next) => { order.push('m1'); return next(); });
    r.use((_ctx, next) => { order.push('m2'); return next(); });
    r.get('/x', () => { order.push('h'); return 'ok'; });
    await r.dispatch({ method: 'GET', path: '/x', query: {}, params: {}, headers: {}, body: null, state: {} });
    expect(order).toEqual(['m1', 'm2', 'h']);
  });

  it('route-level middleware', async () => {
    const r = new Router();
    const order: string[] = [];
    r.get('/x', () => { order.push('h'); return 'ok'; }, [
      (_ctx, next) => { order.push('rm'); return next(); },
    ]);
    await r.dispatch({ method: 'GET', path: '/x', query: {}, params: {}, headers: {}, body: null, state: {} });
    expect(order).toEqual(['rm', 'h']);
  });
});

describe('Router — dispatch', () => {
  it('dispatches to handler and returns result', async () => {
    const r = new Router();
    r.get('/hello', () => 'world');
    const ctx: RequestContext = { method: 'GET', path: '/hello', query: {}, params: {}, headers: {}, body: null, state: {} };
    const result = await r.dispatch(ctx);
    expect(result).toBe('world');
  });

  it('populates params on context', async () => {
    const r = new Router();
    r.get('/u/:id', (ctx) => (ctx.params as any).id);
    const ctx: RequestContext = { method: 'GET', path: '/u/42', query: {}, params: {}, headers: {}, body: null, state: {} };
    await r.dispatch(ctx);
    expect(ctx.params.id).toBe('42');
  });

  it('throws for unknown route', async () => {
    const r = new Router();
    await expect(r.dispatch({ method: 'GET', path: '/x', query: {}, params: {}, headers: {}, body: null, state: {} }))
      .rejects.toThrow('no route');
  });

  it('supports async handler', async () => {
    const r = new Router();
    r.get('/x', async () => {
      await new Promise((res) => setTimeout(res, 10));
      return 'async-ok';
    });
    const ctx: RequestContext = { method: 'GET', path: '/x', query: {}, params: {}, headers: {}, body: null, state: {} };
    expect(await r.dispatch(ctx)).toBe('async-ok');
  });
});

describe('Router — list and count', () => {
  it('list returns all routes', () => {
    const r = new Router();
    r.get('/a', () => 'a');
    r.post('/b', () => 'b');
    expect(r.list().length).toBe(2);
  });

  it('count returns total', () => {
    const r = new Router();
    r.get('/a', () => 'a');
    r.get('/b', () => 'b');
    r.get('/c', () => 'c');
    expect(r.count()).toBe(3);
  });
});
