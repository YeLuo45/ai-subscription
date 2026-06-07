/**
 * PortCheck — TCP port validation and well-known port lookup
 */

interface PortInfo {
  port: number;
  protocol: 'tcp' | 'udp' | 'both';
  service: string;
  description: string;
}

const KNOWN_PORTS: PortInfo[] = [
  { port: 20, protocol: 'tcp', service: 'FTP-data', description: 'File Transfer Protocol (data)' },
  { port: 21, protocol: 'tcp', service: 'FTP', description: 'File Transfer Protocol (control)' },
  { port: 22, protocol: 'tcp', service: 'SSH', description: 'Secure Shell' },
  { port: 23, protocol: 'tcp', service: 'Telnet', description: 'Telnet' },
  { port: 25, protocol: 'tcp', service: 'SMTP', description: 'Simple Mail Transfer Protocol' },
  { port: 53, protocol: 'both', service: 'DNS', description: 'Domain Name System' },
  { port: 67, protocol: 'udp', service: 'DHCP', description: 'Dynamic Host Configuration Protocol (server)' },
  { port: 68, protocol: 'udp', service: 'DHCP', description: 'Dynamic Host Configuration Protocol (client)' },
  { port: 80, protocol: 'tcp', service: 'HTTP', description: 'Hypertext Transfer Protocol' },
  { port: 110, protocol: 'tcp', service: 'POP3', description: 'Post Office Protocol' },
  { port: 143, protocol: 'tcp', service: 'IMAP', description: 'Internet Message Access Protocol' },
  { port: 443, protocol: 'tcp', service: 'HTTPS', description: 'HTTP over TLS/SSL' },
  { port: 3306, protocol: 'tcp', service: 'MySQL', description: 'MySQL database' },
  { port: 5432, protocol: 'tcp', service: 'PostgreSQL', description: 'PostgreSQL database' },
  { port: 6379, protocol: 'tcp', service: 'Redis', description: 'Redis in-memory store' },
  { port: 8000, protocol: 'tcp', service: 'HTTP-Alt', description: 'HTTP alternate' },
  { port: 8080, protocol: 'tcp', service: 'HTTP-Proxy', description: 'HTTP proxy/alt' },
  { port: 8443, protocol: 'tcp', service: 'HTTPS-Alt', description: 'HTTPS alternate' },
  { port: 27017, protocol: 'tcp', service: 'MongoDB', description: 'MongoDB database' },
];

export class PortCheck {
  /**
   * Validate port number.
   */
  static isValid(port: number): boolean {
    return Number.isInteger(port) && port >= 0 && port <= 65535;
  }

  /**
   * Check if well-known (0-1023).
   */
  static isWellKnown(port: number): boolean {
    return port >= 0 && port <= 1023;
  }

  /**
   * Check if registered (1024-49151).
   */
  static isRegistered(port: number): boolean {
    return port >= 1024 && port <= 49151;
  }

  /**
   * Check if dynamic/private (49152-65535).
   */
  static isDynamic(port: number): boolean {
    return port >= 49152 && port <= 65535;
  }

  /**
   * Find port info.
   */
  static find(port: number): PortInfo | null {
    return KNOWN_PORTS.find((p) => p.port === port) ?? null;
  }

  /**
   * Find by service name.
   */
  static findByService(service: string): PortInfo | null {
    const lower = service.toLowerCase();
    return KNOWN_PORTS.find((p) => p.service.toLowerCase() === lower) ?? null;
  }

  /**
   * List all known ports.
   */
  static listKnown(): PortInfo[] {
    return [...KNOWN_PORTS];
  }

  /**
   * Check if port is in range.
   */
  static inRange(port: number, start: number, end: number): boolean {
    return PortCheck.isValid(port) && port >= start && port <= end;
  }

  /**
   * Check if port is free (not in known list).
   */
  static isLikelyFree(port: number): boolean {
    return PortCheck.isValid(port) && PortCheck.find(port) === null;
  }
}
