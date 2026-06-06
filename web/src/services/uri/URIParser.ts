/**
 * URIParser — RFC 3986 URI parser
 *
 * Inspired by: uri-js
 *
 * General URI: scheme:[//[user[:password]@]host[:port]]path[?query][#fragment]
 */

export interface ParsedURI {
  scheme: string;
  authority: string;
  userinfo: string;
  host: string;
  port: string;
  path: string;
  query: string;
  fragment: string;
}

export class URIParser {
  /**
   * Parse URI string.
   */
  static parse(uri: string): ParsedURI {
    let scheme = '';
    let rest = uri;
    const schemeMatch = uri.match(/^([a-zA-Z][a-zA-Z0-9+\-.]*):/);
    if (schemeMatch) {
      scheme = schemeMatch[1];
      rest = uri.slice(schemeMatch[0].length);
    }
    let authority = '';
    let userinfo = '';
    let host = '';
    let port = '';
    let path = '';
    let query = '';
    let fragment = '';
    if (rest.startsWith('//')) {
      rest = rest.slice(2);
      const hashIdx = rest.indexOf('#');
      const queryIdx = rest.indexOf('?');
      const slashIdx = rest.indexOf('/');
      const stopIdx = [hashIdx, queryIdx, slashIdx].filter((i) => i >= 0).reduce((m, i) => Math.min(m, i), rest.length);
      authority = rest.slice(0, stopIdx);
      rest = rest.slice(stopIdx);
      const atIdx = authority.lastIndexOf('@');
      if (atIdx >= 0) {
        userinfo = authority.slice(0, atIdx);
        host = authority.slice(atIdx + 1);
      } else {
        host = authority;
      }
      const portIdx = host.lastIndexOf(':');
      if (portIdx > host.lastIndexOf(']')) {
        port = host.slice(portIdx + 1);
        host = host.slice(0, portIdx);
      }
    }
    // path query fragment
    const hashIdx = rest.indexOf('#');
    const queryIdx = rest.indexOf('?');
    if (queryIdx >= 0 && (hashIdx < 0 || queryIdx < hashIdx)) {
      path = rest.slice(0, queryIdx);
      if (hashIdx >= 0) {
        query = rest.slice(queryIdx + 1, hashIdx);
        fragment = rest.slice(hashIdx + 1);
      } else {
        query = rest.slice(queryIdx + 1);
      }
    } else if (hashIdx >= 0) {
      path = rest.slice(0, hashIdx);
      fragment = rest.slice(hashIdx + 1);
    } else {
      path = rest;
    }
    return { scheme, authority, userinfo, host, port, path, query, fragment };
  }

  /**
   * Stringify URI from parts.
   */
  static stringify(p: Partial<ParsedURI>): string {
    let out = '';
    if (p.scheme) out += p.scheme + ':';
    if (p.authority || p.host) {
      out += '//';
      if (p.userinfo) out += p.userinfo + '@';
      out += p.host ?? '';
      if (p.port) out += ':' + p.port;
    }
    out += p.path ?? '';
    if (p.query) out += '?' + p.query;
    if (p.fragment) out += '#' + p.fragment;
    return out;
  }

  /**
   * Check if URI is absolute (has scheme).
   */
  static isAbsolute(uri: string): boolean {
    return /^[a-zA-Z][a-zA-Z0-9+\-.]*:/.test(uri);
  }

  /**
   * Check if URI is relative.
   */
  static isRelative(uri: string): boolean {
    return !URIParser.isAbsolute(uri);
  }

  /**
   * Normalize scheme to lowercase.
   */
  static normalize(uri: string): string {
    const p = URIParser.parse(uri);
    p.scheme = p.scheme.toLowerCase();
    p.host = p.host.toLowerCase();
    if (p.port === '80' && p.scheme === 'http') p.port = '';
    if (p.port === '443' && p.scheme === 'https') p.port = '';
    // Remove . and .. in path
    p.path = p.path.replace(/\/\.\//g, '/').replace(/\/\.$/, '/');
    p.path = p.path.replace(/\/[^/]+\/\.\./g, '');
    return URIParser.stringify(p);
  }

  /**
   * Get scheme.
   */
  static getScheme(uri: string): string {
    return URIParser.parse(uri).scheme;
  }

  /**
   * Get path.
   */
  static getPath(uri: string): string {
    return URIParser.parse(uri).path;
  }
}
