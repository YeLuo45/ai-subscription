/**
 * UserAgent — User-Agent string parser
 *
 * Inspired by: ua-parser-js
 *
 * Extract browser, OS, device, version info.
 */

export interface UAParsed {
  browser: { name: string; version: string };
  os: { name: string; version: string };
  device: { type: 'mobile' | 'tablet' | 'desktop' | 'bot' };
}

const BOT_PATTERNS = /bot|crawler|spider|crawling/i;

export class UserAgent {
  readonly raw: string;

  constructor(ua: string) {
    this.raw = ua;
  }

  /**
   * Parse User-Agent string.
   */
  parse(): UAParsed {
    const ua = this.raw;
    return {
      browser: this.parseBrowser(ua),
      os: this.parseOS(ua),
      device: this.parseDevice(ua),
    };
  }

  private parseBrowser(ua: string): { name: string; version: string } {
    if (/Edg\//.test(ua)) return this.extract(ua, /Edg\/([\d.]+)/, 'Edge');
    if (/OPR\//.test(ua) || /Opera/.test(ua)) return this.extract(ua, /OPR\/([\d.]+)/, 'Opera');
    if (/Firefox\//.test(ua)) return this.extract(ua, /Firefox\/([\d.]+)/, 'Firefox');
    if (/Chrome\//.test(ua)) return this.extract(ua, /Chrome\/([\d.]+)/, 'Chrome');
    if (/Safari\//.test(ua)) return this.extract(ua, /Version\/([\d.]+).*Safari/, 'Safari');
    if (/MSIE/.test(ua) || /Trident\//.test(ua)) return this.extract(ua, /MSIE ([\d.]+)/, 'Internet Explorer');
    return { name: 'Unknown', version: '' };
  }

  private parseOS(ua: string): { name: string; version: string } {
    if (/Windows NT 10/.test(ua)) return { name: 'Windows', version: '10' };
    if (/Windows NT 11/.test(ua)) return { name: 'Windows', version: '11' };
    if (/Windows NT 6\.3/.test(ua)) return { name: 'Windows', version: '8.1' };
    if (/Windows NT 6\.2/.test(ua)) return { name: 'Windows', version: '8' };
    if (/Windows NT 6\.1/.test(ua)) return { name: 'Windows', version: '7' };
    if (/Mac OS X ([\d_]+)/.test(ua)) {
      const m = ua.match(/Mac OS X ([\d_]+)/);
      const v = m ? m[1].replace(/_/g, '.') : '';
      return { name: 'macOS', version: v };
    }
    if (/Android ([\d.]+)/.test(ua)) {
      const m = ua.match(/Android ([\d.]+)/);
      return { name: 'Android', version: m ? m[1] : '' };
    }
    if (/iPhone OS ([\d_]+)/.test(ua) || /iPad.*OS ([\d_]+)/.test(ua)) {
      const m = ua.match(/OS ([\d_]+)/);
      const v = m ? m[1].replace(/_/g, '.') : '';
      return { name: 'iOS', version: v };
    }
    if (/Linux/.test(ua)) return { name: 'Linux', version: '' };
    return { name: 'Unknown', version: '' };
  }

  private parseDevice(ua: string): { type: 'mobile' | 'tablet' | 'desktop' | 'bot' } {
    if (BOT_PATTERNS.test(ua)) return { type: 'bot' };
    if (/iPad/.test(ua) || /Tablet/.test(ua)) return { type: 'tablet' };
    if (/Mobile|Android|iPhone/.test(ua)) return { type: 'mobile' };
    return { type: 'desktop' };
  }

  private extract(ua: string, re: RegExp, name: string): { name: string; version: string } {
    const m = ua.match(re);
    return { name, version: m ? m[1] : '' };
  }

  /**
   * Is bot?
   */
  isBot(): boolean { return BOT_PATTERNS.test(this.raw); }

  /**
   * Is mobile?
   */
  isMobile(): boolean { return /Mobile|Android|iPhone/.test(this.raw); }

  /**
   * Is desktop?
   */
  isDesktop(): boolean { return !this.isMobile() && !this.isBot(); }

  /**
   * Get browser name only.
   */
  browserName(): string { return this.parse().browser.name; }

  /**
   * Get OS name only.
   */
  osName(): string { return this.parse().os.name; }
}
