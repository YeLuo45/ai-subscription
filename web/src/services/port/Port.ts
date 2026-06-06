/**
 * Port — port number utilities
 *
 * Inspired by: IANA service-name/port-number registry
 *
 * Well-known (0-1023), registered (1024-49151), dynamic (49152-65535).
 */

const WELL_KNOWN: Record<number, string> = {
  20: 'ftp-data',
  21: 'ftp',
  22: 'ssh',
  23: 'telnet',
  25: 'smtp',
  53: 'dns',
  80: 'http',
  110: 'pop3',
  143: 'imap',
  443: 'https',
  587: 'smtp-submission',
  993: 'imaps',
  995: 'pop3s',
};

const SERVICE_NAME: Record<string, number> = Object.fromEntries(
  Object.entries(WELL_KNOWN).map(([p, n]) => [n, parseInt(p, 10)]),
);

export class Port {
  readonly number: number;

  constructor(n: number) {
    if (!Number.isInteger(n) || n < 0 || n > 65535) throw new Error('Port must be 0-65535');
    this.number = n;
  }

  /**
   * Parse string.
   */
  static parse(input: string | number): Port {
    if (typeof input === 'number') return new Port(input);
    const n = parseInt(input, 10);
    if (isNaN(n)) throw new Error('Invalid port');
    return new Port(n);
  }

  /**
   * To string.
   */
  toString(): string { return this.number.toString(); }

  /**
   * Well-known (0-1023)?
   */
  isWellKnown(): boolean { return this.number >= 0 && this.number <= 1023; }

  /**
   * Registered (1024-49151)?
   */
  isRegistered(): boolean { return this.number >= 1024 && this.number <= 49151; }

  /**
   * Dynamic/private (49152-65535)?
   */
  isDynamic(): boolean { return this.number >= 49152 && this.number <= 65535; }

  /**
   * Get service name (if well-known).
   */
  serviceName(): string | null {
    return WELL_KNOWN[this.number] ?? null;
  }

  /**
   * Get port for service name.
   */
  static forService(name: string): Port | null {
    const n = SERVICE_NAME[name];
    return n === undefined ? null : new Port(n);
  }

  /**
   * Is privileged (0-1023, requires root on Unix)?
   */
  isPrivileged(): boolean { return this.number < 1024; }

  /**
   * Equals.
   */
  equals(other: Port): boolean { return this.number === other.number; }

  /**
   * Common ports.
   */
  static HTTP = new Port(80);
  static HTTPS = new Port(443);
  static SSH = new Port(22);
  static DNS = new Port(53);
  static FTP = new Port(21);
}
