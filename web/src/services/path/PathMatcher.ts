/**
 * PathMatcher — file path matching utilities
 *
 * Inspired by: minimatch, micromatch
 *
 * - normalize: clean up ./ and // and trailing /
 * - dirname/basename/extname
 * - isAbsolute
 * - join/resolve
 * - glob match (uses GlobMatcher)
 * - relative
 */

import { GlobMatcher } from '../glob/GlobMatcher';

export class PathMatcher {
  static normalize(path: string): string {
    if (!path) return '.';
    const isAbs = path.startsWith('/');
    const parts = path.split('/').filter((p) => p !== '' && p !== '.');
    const stack: string[] = [];
    for (const p of parts) {
      if (p === '..') {
        if (stack.length > 0 && stack[stack.length - 1] !== '..') {
          stack.pop();
        } else if (!isAbs) {
          stack.push('..');
        }
      } else {
        stack.push(p);
      }
    }
    return (isAbs ? '/' : '') + stack.join('/') || (isAbs ? '/' : '.');
  }

  static join(...parts: string[]): string {
    return PathMatcher.normalize(parts.filter((p) => p).join('/'));
  }

  static dirname(path: string): string {
    const idx = path.lastIndexOf('/');
    if (idx < 0) return '.';
    if (idx === 0) return '/';
    return path.slice(0, idx);
  }

  static basename(path: string, ext?: string): string {
    const idx = path.lastIndexOf('/');
    const base = idx >= 0 ? path.slice(idx + 1) : path;
    if (ext && base.endsWith(ext)) return base.slice(0, -ext.length);
    return base;
  }

  static extname(path: string): string {
    const base = PathMatcher.basename(path);
    const idx = base.lastIndexOf('.');
    if (idx <= 0) return '';
    return base.slice(idx);
  }

  static isAbsolute(path: string): boolean {
    return path.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(path);
  }

  static relative(from: string, to: string): string {
    const a = PathMatcher.normalize(from).split('/').filter((p) => p);
    const b = PathMatcher.normalize(to).split('/').filter((p) => p);
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
    const up = a.length - i;
    const down = b.slice(i);
    return [...Array(up).fill('..'), ...down].join('/') || '.';
  }

  static match(path: string, pattern: string): boolean {
    return new GlobMatcher(pattern).match(path);
  }

  static filter(paths: string[], pattern: string): string[] {
    return paths.filter((p) => PathMatcher.match(p, pattern));
  }

  static resolve(...paths: string[]): string {
    let resolved = '';
    for (const p of paths) {
      if (PathMatcher.isAbsolute(p)) {
        resolved = p;
      } else if (resolved) {
        resolved = resolved + '/' + p;
      } else {
        resolved = p;
      }
    }
    return PathMatcher.normalize(resolved);
  }
}
