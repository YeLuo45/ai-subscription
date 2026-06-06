/**
 * GlobMatcher — file path glob pattern matching
 *
 * Inspired by: shell glob patterns, minimatch
 *
 * Supports:
 *   - * matches any chars except /
 *   - ** matches any chars including /
 *   - ? matches single char except /
 *   - [abc] character class
 *   - [!abc] negated class
 *   - {a,b,c} brace expansion
 */

export class GlobMatcher {
  private regex: RegExp;

  constructor(pattern: string) {
    this.regex = this.compile(pattern);
  }

  match(path: string): boolean {
    return this.regex.test(path);
  }

  test = this.match;

  private compile(pattern: string): RegExp {
    let re = '';
    let i = 0;
    while (i < pattern.length) {
      const c = pattern[i];
      if (c === '*') {
        if (pattern[i + 1] === '*') {
          re += '.*';
          i += 2;
          // skip trailing / after **
          if (pattern[i] === '/') i += 1;
        } else {
          re += '[^/]*';
          i += 1;
        }
      } else if (c === '?') {
        re += '[^/]';
        i += 1;
      } else if (c === '[') {
        // character class
        let j = i + 1;
        let negated = false;
        if (pattern[j] === '!' || pattern[j] === '^') { negated = true; j += 1; }
        re += negated ? '[^' : '[';
        while (j < pattern.length && pattern[j] !== ']') {
          re += pattern[j];
          j += 1;
        }
        re += ']';
        i = j + 1;
      } else if (c === '{') {
        // brace expansion: convert to alternation
        let j = i + 1;
        let depth = 1;
        let alternatives = '';
        while (j < pattern.length && depth > 0) {
          if (pattern[j] === '{') depth += 1;
          else if (pattern[j] === '}') { depth -= 1; if (depth === 0) break; }
          else if (pattern[j] === ',') alternatives += '|';
          else alternatives += pattern[j];
          j += 1;
        }
        re += '(' + alternatives + ')';
        i = j + 1;
      } else {
        re += c.replace(/[\\.+^$|()]/g, '\\$&');
        i += 1;
      }
    }
    return new RegExp('^' + re + '$');
  }
}
