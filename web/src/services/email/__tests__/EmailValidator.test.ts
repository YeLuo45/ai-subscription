/**
 * EmailValidator.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { EmailValidator } from '../EmailValidator';

describe('EmailValidator — basic', () => {
  it('validates simple email', () => {
    expect(EmailValidator.isValid('user@example.com')).toBe(true);
  });

  it('validates with subdomain', () => {
    expect(EmailValidator.isValid('user@mail.example.com')).toBe(true);
  });

  it('validates with plus addressing', () => {
    expect(EmailValidator.isValid('user+tag@example.com')).toBe(true);
  });

  it('validates with dots', () => {
    expect(EmailValidator.isValid('first.last@example.com')).toBe(true);
  });

  it('rejects no @', () => {
    expect(EmailValidator.isValid('userexample.com')).toBe(false);
  });

  it('rejects empty local', () => {
    expect(EmailValidator.isValid('@example.com')).toBe(false);
  });

  it('rejects empty domain', () => {
    expect(EmailValidator.isValid('user@')).toBe(false);
  });

  it('rejects no TLD', () => {
    expect(EmailValidator.isValid('user@example')).toBe(false);
  });

  it('rejects TLD too short', () => {
    expect(EmailValidator.isValid('user@example.c')).toBe(false);
  });

  it('rejects consecutive dots', () => {
    expect(EmailValidator.isValid('user..name@example.com')).toBe(false);
  });

  it('rejects leading dot', () => {
    expect(EmailValidator.isValid('.user@example.com')).toBe(false);
  });

  it('accepts IP domain', () => {
    expect(EmailValidator.isValid('user@[192.168.1.1]')).toBe(true);
  });
});

describe('EmailValidator — getLocal/getDomain', () => {
  it('gets local', () => {
    expect(EmailValidator.getLocal('user@example.com')).toBe('user');
  });

  it('gets domain lowercase', () => {
    expect(EmailValidator.getDomain('user@EXAMPLE.COM')).toBe('example.com');
  });
});

describe('EmailValidator — classification', () => {
  it('detects free provider', () => {
    expect(EmailValidator.isFree('user@gmail.com')).toBe(true);
    expect(EmailValidator.isFree('user@example.com')).toBe(false);
  });

  it('detects disposable', () => {
    expect(EmailValidator.isDisposable('user@mailinator.com')).toBe(true);
    expect(EmailValidator.isDisposable('user@gmail.com')).toBe(false);
  });
});

describe('EmailValidator — normalize', () => {
  it('lowercases domain', () => {
    expect(EmailValidator.normalize('User@EXAMPLE.COM')).toBe('User@example.com');
  });
});
