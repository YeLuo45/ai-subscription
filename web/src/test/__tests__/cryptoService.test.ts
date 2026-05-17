/**
 * CryptoService Unit Tests
 * Tests for E2E encryption using Web Crypto API
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  initializeEncryption,
  isEncryptionInitialized,
  clearEncryption,
  getCurrentSalt,
  setCurrentSalt,
  encrypt,
  decrypt,
  encryptApiToken,
  decryptApiToken,
  encryptCookie,
  decryptCookie,
  encryptSensitiveFields,
  decryptSensitiveFields,
} from '../../services/crypto/cryptoService';

describe('CryptoService', () => {
  beforeEach(() => {
    clearEncryption();
  });

  afterEach(() => {
    clearEncryption();
  });

  describe('initializeEncryption', () => {
    it('should initialize encryption with a password', async () => {
      const salt = await initializeEncryption('test-password');
      expect(salt).toBeInstanceOf(Uint8Array);
      expect(salt.length).toBe(16);
    });

    it('should return existing salt if provided', async () => {
      const existingSalt = crypto.getRandomValues(new Uint8Array(16));
      const salt = await initializeEncryption('test-password', existingSalt);
      expect(salt).toEqual(existingSalt);
    });

    it('should set encryption as initialized', async () => {
      await initializeEncryption('test-password');
      expect(isEncryptionInitialized()).toBe(true);
    });
  });

  describe('isEncryptionInitialized', () => {
    it('should return false before initialization', () => {
      expect(isEncryptionInitialized()).toBe(false);
    });

    it('should return true after initialization', async () => {
      await initializeEncryption('test-password');
      expect(isEncryptionInitialized()).toBe(true);
    });

    it('should return false after clearEncryption', async () => {
      await initializeEncryption('test-password');
      clearEncryption();
      expect(isEncryptionInitialized()).toBe(false);
    });
  });

  describe('clearEncryption', () => {
    it('should clear the derived key', async () => {
      await initializeEncryption('test-password');
      clearEncryption();
      expect(isEncryptionInitialized()).toBe(false);
    });
  });

  describe('getCurrentSalt / setCurrentSalt', () => {
    it('should return null before initialization', () => {
      expect(getCurrentSalt()).toBeNull();
    });

    it('should return salt after initialization', async () => {
      const salt = await initializeEncryption('test-password');
      expect(getCurrentSalt()).toEqual(salt);
    });

    it('should allow setting a custom salt', () => {
      const customSalt = crypto.getRandomValues(new Uint8Array(16));
      setCurrentSalt(customSalt);
      expect(getCurrentSalt()).toEqual(customSalt);
    });
  });

  describe('encrypt / decrypt', () => {
    it('should encrypt and decrypt a string', async () => {
      await initializeEncryption('test-password');
      const plaintext = 'Hello, World!';
      const encrypted = await encrypt(plaintext);
      const decrypted = await decrypt(encrypted, 'test-password');
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext (random IV)', async () => {
      await initializeEncryption('test-password');
      const plaintext = 'Test data';
      const encrypted1 = await encrypt(plaintext);
      const encrypted2 = await encrypt(plaintext);
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should throw if encryption not initialized', async () => {
      await expect(encrypt('test')).rejects.toThrow('Encryption not initialized');
    });

    it('should decrypt with password and salt when not initialized', async () => {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      await initializeEncryption('test-password', salt);
      const encrypted = await encrypt('secret data');
      
      clearEncryption();
      
      const decrypted = await decrypt(encrypted, 'test-password', salt);
      expect(decrypted).toBe('secret data');
    });
  });

  describe('encryptApiToken / decryptApiToken', () => {
    it('should encrypt and decrypt an API token', async () => {
      await initializeEncryption('test-password');
      const token = 'sk-test-1234567890abcdefghij';
      const encrypted = await encryptApiToken(token);
      const decrypted = await decryptApiToken(encrypted);
      expect(decrypted).toBe(token);
    });
  });

  describe('encryptCookie / decryptCookie', () => {
    it('should encrypt and decrypt a cookie value', async () => {
      await initializeEncryption('test-password');
      const cookie = 'session_id=abc123; theme=dark';
      const encrypted = await encryptCookie(cookie);
      const decrypted = await decryptCookie(encrypted);
      expect(decrypted).toBe(cookie);
    });
  });

  describe('encryptSensitiveFields / decryptSensitiveFields', () => {
    it('should encrypt specified fields in an object', async () => {
      await initializeEncryption('test-password');
      const obj = {
        id: '123',
        name: 'Test User',
        apiKey: 'sk-secret-key-12345',
        token: 'my-auth-token',
      };
      
      const encrypted = await encryptSensitiveFields(obj, ['apiKey', 'token']);
      
      expect(encrypted.id).toBe('123');
      expect(encrypted.name).toBe('Test User');
      expect(encrypted.apiKey).not.toBe(obj.apiKey);
      expect(encrypted.token).not.toBe(obj.token);
    });

    it('should decrypt specified fields in an object', async () => {
      await initializeEncryption('test-password');
      const original = {
        id: '123',
        secret: 'my-secret-value',
      };
      
      const encrypted = await encryptSensitiveFields(original, ['secret']);
      const decrypted = await decryptSensitiveFields(encrypted, ['secret']);
      
      expect(decrypted.id).toBe('123');
      expect(decrypted.secret).toBe('my-secret-value');
    });

    it('should handle empty sensitive fields array', async () => {
      await initializeEncryption('test-password');
      const obj = { id: '1', data: 'test' };
      const result = await encryptSensitiveFields(obj, []);
      expect(result).toEqual(obj);
    });

    it('should skip undefined or null fields', async () => {
      await initializeEncryption('test-password');
      const obj: Record<string, unknown> = { id: '1', token: undefined };
      const result = await encryptSensitiveFields(obj, ['token']);
      expect(result.token).toBeUndefined();
    });
  });
});