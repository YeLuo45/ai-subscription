/**
 * URLParser — URL parser and builder
 *
 * Inspired by: url-parse / whatwg-url
 *
 * Pure TypeScript URL parser that doesn't depend on URL constructor.
 */

export interface ParsedURL {
  protocol: string;
  username: string;
  password: string;
  host: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
  origin: string;
  href: string;
}

export class URLParser {
  /**
   * Parse URL into components.
   */
  static parse(url: string, baseURL?: string): ParsedURL {
    let input = url.trim();
    if (baseURL) {
      const base = URLParser.parse(baseURL);
      if (!input.startsWith('//') && !input.match(/^[a-z]+:/i)) {
        // Resolve relative
        if (input.startsWith('/')) {
          input = base.protocol + ':' + '//' + base.host + input;
        } else if (input.startsWith('?')) {
          input = base.protocol + ':' + '//' + base.host + base.pathname + input;
        } else if (input.startsWith('#')) {
          input = base.protocol + ':' + '//' + base.host + base.pathname + base.search + input;
        } else {
          const dir = base.pathname.replace(/\/[^\/]*$/, '/');
          input = base.protocol + ':' + '//' + base.host + dir + input;
        }
      }
    }
    let protocol = '';
    let rest = input;
    const protoMatch = input.match(/^([a-z][a-z0-9+\-.]*):/i);
    if (protoMatch) {
      protocol = protoMatch[1].toLowerCase();
      rest = input.slice(protoMatch[0].length);
    }
    let username = '';
    let password = '';
    let host = '';
    let hostname = '';
    let port = '';
    let pathname = '/';
    let search = '';
    let hash = '';
    if (rest.startsWith('//')) {
      rest = rest.slice(2);
      const hashIdx = rest.indexOf('#');
      const queryIdx = rest.indexOf('?');
      const slashIdx = rest.indexOf('/');
      const stopIdx = [hashIdx, queryIdx, slashIdx].filter((i) => i >= 0).reduce((m, i) => Math.min(m, i), Infinity);
      const authority = rest.slice(0, stopIdx);
      const tail = rest.slice(stopIdx);
      const atIdx = authority.lastIndexOf('@');
      if (atIdx >= 0) {
        const userInfo = authority.slice(0, atIdx);
        host = authority.slice(atIdx + 1);
        const colonIdx = userInfo.indexOf(':');
        if (colonIdx >= 0) {
          username = userInfo.slice(0, colonIdx);
          password = userInfo.slice(colonIdx + 1);
        } else {
          username = userInfo;
        }
      } else {
        host = authority;
      }
      const portIdx = host.lastIndexOf(':');
      if (portIdx > host.lastIndexOf(']')) {
        port = host.slice(portIdx + 1);
        hostname = host.slice(0, portIdx);
      } else {
        hostname = host;
      }
      hostname = hostname.toLowerCase();
      const hashIdx2 = tail.indexOf('#');
      const queryIdx2 = tail.indexOf('?');
      if (queryIdx2 >= 0 && (hashIdx2 < 0 || queryIdx2 < hashIdx2)) {
        pathname = tail.slice(0, queryIdx2) || '/';
        if (hashIdx2 >= 0) {
          search = tail.slice(queryIdx2, hashIdx2);
          hash = tail.slice(hashIdx2);
        } else {
          search = tail.slice(queryIdx2);
        }
      } else if (hashIdx2 >= 0) {
        pathname = tail.slice(0, hashIdx2) || '/';
        hash = tail.slice(hashIdx2);
      } else {
        pathname = tail || '/';
      }
    } else {
      // No authority
      const hashIdx = rest.indexOf('#');
      const queryIdx = rest.indexOf('?');
      if (queryIdx >= 0 && (hashIdx < 0 || queryIdx < hashIdx)) {
        pathname = rest.slice(0, queryIdx) || '/';
        if (hashIdx >= 0) {
          search = rest.slice(queryIdx, hashIdx);
          hash = rest.slice(hashIdx);
        } else {
          search = rest.slice(queryIdx);
        }
      } else if (hashIdx >= 0) {
        pathname = rest.slice(0, hashIdx) || '/';
        hash = rest.slice(hashIdx);
      } else {
        pathname = rest || '/';
      }
    }
    const origin = protocol ? `${protocol}://${host}` : '';
    const href = URLParser.toString({ protocol, username, password, host, hostname, port, pathname, search, hash, origin, href: '' });
    return { protocol, username, password, host, hostname, port, pathname, search, hash, origin, href };
  }

  /**
   * Build URL from components.
   */
  static toString(parsed: Partial<ParsedURL>): string {
    let out = '';
    if (parsed.protocol) out += parsed.protocol + ':';
    if (parsed.host || parsed.hostname) {
      out += '//';
      if (parsed.username) {
        out += parsed.username;
        if (parsed.password) out += ':' + parsed.password;
        out += '@';
      }
      out += parsed.hostname ?? parsed.host;
      if (parsed.port) out += ':' + parsed.port;
    }
    out += parsed.pathname ?? '/';
    if (parsed.search) out += parsed.search;
    if (parsed.hash) out += parsed.hash;
    return out;
  }

  /**
   * Get query parameter.
   */
  static getParam(url: string, name: string): string | null {
    const parsed = URLParser.parse(url);
    if (!parsed.search) return null;
    const params = new URLSearchParams(parsed.search);
    return params.get(name);
  }

  /**
   * Set query parameter.
   */
  static setParam(url: string, name: string, value: string): string {
    const parsed = URLParser.parse(url);
    const params = new URLSearchParams(parsed.search);
    params.set(name, value);
    parsed.search = params.toString() ? '?' + params.toString() : '';
    return URLParser.toString(parsed);
  }

  /**
   * Resolve relative URL.
   */
  static resolve(base: string, relative: string): string {
    return URLParser.parse(relative, base).href;
  }
}
