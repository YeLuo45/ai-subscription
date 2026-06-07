/**
 * SemVerLite — simplified Semantic Versioning
 *
 * Inspired by: semver
 *
 * Format: MAJOR.MINOR.PATCH[-prerelease][+build]
 */

export interface SemVer {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  build?: string;
  raw: string;
}

export class SemVerLite {
  static REGEX = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-.]+))?(?:\+([0-9A-Za-z-.]+))?$/;

  /**
   * Parse version string.
   */
  static parse(input: string): SemVer {
    const m = SemVerLite.REGEX.exec(input.trim());
    if (!m) throw new Error(`Invalid version: ${input}`);
    return {
      major: parseInt(m[1], 10),
      minor: parseInt(m[2], 10),
      patch: parseInt(m[3], 10),
      prerelease: m[4],
      build: m[5],
      raw: input,
    };
  }

  /**
   * Compare two versions: -1, 0, 1.
   */
  static compare(a: string | SemVer, b: string | SemVer): number {
    const va = typeof a === 'string' ? SemVerLite.parse(a) : a;
    const vb = typeof b === 'string' ? SemVerLite.parse(b) : b;
    if (va.major !== vb.major) return va.major - vb.major;
    if (va.minor !== vb.minor) return va.minor - vb.minor;
    if (va.patch !== vb.patch) return va.patch - vb.patch;
    if (va.prerelease && !vb.prerelease) return -1;
    if (!va.prerelease && vb.prerelease) return 1;
    if (va.prerelease && vb.prerelease) {
      return va.prerelease < vb.prerelease ? -1 : va.prerelease > vb.prerelease ? 1 : 0;
    }
    return 0;
  }

  /**
   * Check if version satisfies range.
   * Range format: "1.2.3", "^1.2.0", "~1.2.0", ">=1.0.0", "<2.0.0", "*"
   */
  static satisfies(version: string, range: string): boolean {
    if (range === '*' || range === '') return true;
    const r = range.trim();
    if (r.startsWith('^')) {
      const base = SemVerLite.parse(r.slice(1));
      return SemVerLite.compare(version, `${base.major}.${base.minor}.${base.patch}`) >= 0
        && version.split('.')[0] === String(base.major);
    }
    if (r.startsWith('~')) {
      const base = SemVerLite.parse(r.slice(1));
      const v = SemVerLite.parse(version);
      return v.major === base.major && v.minor === base.minor;
    }
    if (r.startsWith('>=')) {
      return SemVerLite.compare(version, r.slice(2)) >= 0;
    }
    if (r.startsWith('<=')) {
      return SemVerLite.compare(version, r.slice(2)) <= 0;
    }
    if (r.startsWith('>')) {
      return SemVerLite.compare(version, r.slice(1)) > 0;
    }
    if (r.startsWith('<')) {
      return SemVerLite.compare(version, r.slice(1)) < 0;
    }
    return SemVerLite.compare(version, r) === 0;
  }

  /**
   * Increment version.
   */
  static increment(version: string, type: 'major' | 'minor' | 'patch'): string {
    const v = SemVerLite.parse(version);
    if (type === 'major') return `${v.major + 1}.0.0`;
    if (type === 'minor') return `${v.major}.${v.minor + 1}.0`;
    return `${v.major}.${v.minor}.${v.patch + 1}`;
  }

  /**
   * Check if version is valid.
   */
  static isValid(version: string): boolean {
    return SemVerLite.REGEX.test(version.trim());
  }

  /**
   * Get major version.
   */
  static major(version: string): number {
    return SemVerLite.parse(version).major;
  }

  /**
   * Get minor version.
   */
  static minor(version: string): number {
    return SemVerLite.parse(version).minor;
  }

  /**
   * Get patch version.
   */
  static patch(version: string): number {
    return SemVerLite.parse(version).patch;
  }
}
