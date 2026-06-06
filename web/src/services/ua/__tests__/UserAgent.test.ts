/**
 * UserAgent.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { UserAgent } from '../UserAgent';

describe('UserAgent — Chrome', () => {
  const ua = new UserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  it('browser', () => {
    const p = ua.parse();
    expect(p.browser.name).toBe('Chrome');
    expect(p.browser.version).toBe('120.0.0.0');
  });
  it('os', () => {
    expect(ua.osName()).toBe('Windows');
  });
  it('device', () => {
    expect(ua.parse().device.type).toBe('desktop');
  });
});

describe('UserAgent — Firefox', () => {
  const ua = new UserAgent('Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0');
  it('browser', () => {
    expect(ua.browserName()).toBe('Firefox');
  });
  it('os', () => {
    expect(ua.osName()).toBe('Linux');
  });
});

describe('UserAgent — Safari', () => {
  const ua = new UserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15');
  it('browser', () => {
    expect(ua.browserName()).toBe('Safari');
  });
  it('os', () => {
    expect(ua.osName()).toBe('macOS');
  });
});

describe('UserAgent — Edge', () => {
  const ua = new UserAgent('Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0');
  it('browser', () => {
    expect(ua.browserName()).toBe('Edge');
  });
});

describe('UserAgent — Mobile', () => {
  const ua = new UserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');
  it('iOS', () => {
    expect(ua.osName()).toBe('iOS');
  });
  it('mobile device', () => {
    expect(ua.parse().device.type).toBe('mobile');
  });
});

describe('UserAgent — Tablet', () => {
  const ua = new UserAgent('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');
  it('tablet', () => {
    expect(ua.parse().device.type).toBe('tablet');
  });
});

describe('UserAgent — Bot', () => {
  const ua = new UserAgent('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)');
  it('isBot', () => {
    expect(ua.isBot()).toBe(true);
  });
  it('device bot', () => {
    expect(ua.parse().device.type).toBe('bot');
  });
});

describe('UserAgent — Android', () => {
  const ua = new UserAgent('Mozilla/5.0 (Linux; Android 13; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36');
  it('os', () => {
    expect(ua.osName()).toBe('Android');
  });
});

describe('UserAgent — Unknown', () => {
  it('unknown', () => {
    const ua = new UserAgent('garbage');
    expect(ua.browserName()).toBe('Unknown');
  });
});

describe('UserAgent — helpers', () => {
  it('isMobile', () => {
    expect(new UserAgent('iPhone').isMobile()).toBe(true);
  });

  it('isDesktop', () => {
    expect(new UserAgent('Mozilla Firefox').isDesktop()).toBe(true);
  });
});
