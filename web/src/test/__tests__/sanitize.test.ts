/**
 * Sanitize Unit Tests
 * Tests for log sanitization and sensitive data masking
 */

import { describe, it, expect } from 'vitest';
import {
  maskSensitive,
  sanitizeLog,
  createSanitizedLogger,
  maskHeaders,
  maskEnvVariables,
  secureCopy,
  sanitizeError,
  validateStoredData,
} from '../../services/security/sanitize';

describe('Sanitize', () => {
  describe('maskSensitive', () => {
    it('should return null/undefined as-is', () => {
      expect(maskSensitive(null)).toBeNull();
      expect(maskSensitive(undefined)).toBeUndefined();
    });

    it('should mask sensitive string values', () => {
      const result = maskSensitive('sk-test-1234567890abcdef') as string;
      expect(result).toContain('****');
    });

    it('should mask objects with sensitive keys', () => {
      const obj = {
        id: '123',
        apiKey: 'sk-secret-key-12345',
        token: 'my-auth-token',
      };
      const result = maskSensitive(obj) as Record<string, unknown>;
      expect(result.id).toBe('123');
      expect(result.apiKey).not.toBe('sk-secret-key-12345');
      expect(result.token).not.toBe('my-auth-token');
    });

    it('should recursively mask nested objects', () => {
      const obj = {
        outer: {
          inner: {
            password: 'secret123',
          },
        },
      };
      const result = maskSensitive(obj) as { outer: { inner: { password: string } } };
      expect(result.outer.inner.password).toContain('*');
    });

    it('should mask arrays by processing each element', () => {
      const arr = [
        { name: 'test', apiKey: 'key123' },
        { name: 'test2', apiKey: 'key456' },
      ];
      const result = maskSensitive(arr) as Array<{ name: string; apiKey: string }>;
      expect(result[0].name).toBe('test');
      expect(result[0].apiKey).not.toBe('key123');
    });

    it('should handle long alphanumeric strings', () => {
      const longString = 'abcdefghijklmnopqrstuvwxyz123456';
      const result = maskSensitive(longString) as string;
      expect(result).toContain('*');
    });

    it('should preserve non-sensitive values', () => {
      const obj = {
        name: 'Test User',
        age: 25,
        status: 'active',
      };
      const result = maskSensitive(obj) as Record<string, unknown>;
      expect(result.name).toBe('Test User');
      expect(result.age).toBe(25);
      expect(result.status).toBe('active');
    });

    it('should mask sensitive key patterns', () => {
      const sensitiveKeys = ['token', 'key', 'secret', 'password', 'auth', 'credential'];
      sensitiveKeys.forEach(key => {
        const obj = { [key]: 'value123' };
        const result = maskSensitive(obj) as Record<string, unknown>;
        expect(result[key]).toContain('*');
      });
    });
  });

  describe('sanitizeLog', () => {
    it('should sanitize a simple message', () => {
      const [result] = sanitizeLog('Test message');
      expect(result).toBe('Test message');
    });

    it('should sanitize sensitive values in message', () => {
      const [result] = sanitizeLog('API key: sk-test-1234567890abcdef');
      expect(result).not.toContain('sk-test-1234567890abcdef');
      expect(result).toContain('*');
    });

    it('should sanitize arguments', () => {
      const [, arg1] = sanitizeLog('Message', { token: 'secret-token' });
      expect((arg1 as Record<string, unknown>).token).toContain('*');
    });

    it('should handle multiple arguments', () => {
      const result = sanitizeLog('User', { name: 'test', apiKey: 'key123' });
      expect(result.length).toBe(3);
    });
  });

  describe('createSanitizedLogger', () => {
    it('should create logger with sanitized methods', () => {
      const logger = createSanitizedLogger();
      expect(logger.log).toBeDefined();
      expect(logger.debug).toBeDefined();
      expect(logger.info).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.error).toBeDefined();
    });

    it('should return sanitized output from log method', () => {
      const logger = createSanitizedLogger();
      // Just verify methods are callable
      expect(() => logger.log('test')).not.toThrow();
      expect(() => logger.warn('warning', { token: 'abc' })).not.toThrow();
    });
  });

  describe('maskHeaders', () => {
    it('should mask authorization headers', () => {
      const headers = {
        'Authorization': 'Bearer token123',
        'Content-Type': 'application/json',
      };
      const result = maskHeaders(headers);
      expect(result['Authorization']).toContain('*');
      expect(result['Content-Type']).toBe('application/json');
    });

    it('should mask cookie headers', () => {
      const headers = {
        'Cookie': 'session=abc123',
      };
      const result = maskHeaders(headers);
      expect(result['Cookie']).toContain('*');
    });

    it('should mask x-api-key headers', () => {
      const headers = {
        'X-Api-Key': 'my-secret-key',
      };
      const result = maskHeaders(headers);
      expect(result['X-Api-Key']).toContain('*');
    });

    it('should preserve non-sensitive headers', () => {
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'text/html',
      };
      const result = maskHeaders(headers);
      expect(result['Content-Type']).toBe('application/json');
      expect(result['Accept']).toBe('text/html');
    });
  });

  describe('maskEnvVariables', () => {
    it('should mask variables with sensitive names', () => {
      const env = {
        'API_KEY': 'secret123',
        'DATABASE_URL': 'postgres://localhost/db',
        'NODE_ENV': 'production',
      };
      const result = maskEnvVariables(env);
      expect(result['API_KEY']).toContain('*');
      expect(result['DATABASE_URL']).toBe('postgres://localhost/db');
      expect(result['NODE_ENV']).toBe('production');
    });

    it('should mask token-related variables', () => {
      const env = {
        'AUTH_TOKEN': 'token123',
        'REFRESH_TOKEN': 'refresh456',
        'PORT': '3000',
      };
      const result = maskEnvVariables(env);
      expect(result['AUTH_TOKEN']).toContain('*');
      expect(result['REFRESH_TOKEN']).toContain('*');
      expect(result['PORT']).toBe('3000');
    });
  });

  describe('secureCopy', () => {
    it('should be callable without throwing', () => {
      // secureCopy uses clipboard API which is mocked
      expect(() => secureCopy('test text')).not.toThrow();
    });
  });

  describe('sanitizeError', () => {
    it('should return user-safe message for Error objects', () => {
      const error = new Error('Connection timeout');
      const result = sanitizeError(error);
      expect(result).toBe('Connection timeout');
    });

    it('should sanitize error messages with sensitive data', () => {
      const error = new Error('Invalid API key: sk-secret-key');
      const result = sanitizeError(error);
      expect(result).toBe('An error occurred. Please try again.');
    });

    it('should handle non-Error inputs', () => {
      expect(sanitizeError('string error')).toBe('An unexpected error occurred.');
      expect(sanitizeError(null)).toBe('An unexpected error occurred.');
      expect(sanitizeError(123)).toBe('An unexpected error occurred.');
    });

    it('should remove file paths from error messages', () => {
      const error = new Error('Error at /path/to/file.ts:50:10');
      const result = sanitizeError(error);
      expect(result).not.toContain('/path/to/file.ts');
    });
  });

  describe('validateStoredData', () => {
    it('should return true for null/undefined', () => {
      expect(validateStoredData(null, 'object')).toBe(true);
      expect(validateStoredData(undefined, 'object')).toBe(true);
    });

    it('should return false for non-objects', () => {
      expect(validateStoredData('string', 'object')).toBe(false);
      expect(validateStoredData(123, 'object')).toBe(false);
      expect(validateStoredData(true, 'object')).toBe(false);
    });

    it('should detect prototype pollution attempts', () => {
      const malicious = { __proto__: { admin: true } };
      expect(validateStoredData(malicious, 'object')).toBe(false);
    });

    it('should allow valid objects', () => {
      const valid = { name: 'test', value: 123 };
      expect(validateStoredData(valid, 'object')).toBe(true);
    });
  });
});