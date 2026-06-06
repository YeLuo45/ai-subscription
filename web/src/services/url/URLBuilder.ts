/**
 * URLBuilder — build and parse URLs
 *
 * Inspired by: WHATWG URL / url module
 *
 * Wrapper around URL with builder pattern.
 */

export interface URLParts {
  protocol: string;
  username: string;
  password: string;
  host: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
  searchParams: Record<string, string>;
}

export class URLBuilder {
  static parse(url: string): URLParts {
    const u = new URL(url);
    const params: Record<string, string> = {};
    u.searchParams.forEach((v, k) => {
      params[k] = v;
    });
    return {
      protocol: u.protocol,
      username: u.username,
      password: u.password,
      host: u.host,
      port: u.port,
      pathname: u.pathname,
      search: u.search,
      hash: u.hash,
      searchParams: params,
    };
  }

  static build(parts: Partial<URLParts>): string {
    const protocol = parts.protocol ?? 'https:';
    const userInfo = parts.username
      ? parts.username + (parts.password ? ':' + parts.password : '') + '@'
      : '';
    const port = parts.port ? ':' + parts.port : '';
    const pathname = parts.pathname ?? '/';
    let search = parts.search ?? '';
    if (!search && parts.searchParams && Object.keys(parts.searchParams).length > 0) {
      const sp = new URLSearchParams();
      for (const [k, v] of Object.entries(parts.searchParams)) {
        sp.set(k, v);
      }
      search = '?' + sp.toString();
    }
    const hash = parts.hash ?? '';
    return `${protocol}//${userInfo}${parts.host ?? ''}${port}${pathname}${search}${hash}`;
  }

  static setParam(url: string, key: string, value: string): string {
    const u = new URL(url);
    u.searchParams.set(key, value);
    return u.toString();
  }

  static removeParam(url: string, key: string): string {
    const u = new URL(url);
    u.searchParams.delete(key);
    return u.toString();
  }

  static getParam(url: string, key: string): string | null {
    const u = new URL(url);
    return u.searchParams.get(key);
  }

  static resolvePath(base: string, relative: string): string {
    return new URL(relative, base).toString();
  }

  static isAbsolute(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}
