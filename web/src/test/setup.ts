/**
 * Vitest Test Setup
 * Configures jsdom environment and global test utilities
 */

import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock Web Crypto API for tests
const mockCrypto = {
  getRandomValues: <T extends Uint8Array>(array: T): T => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256) as any;
    }
    return array;
  },
  subtle: {
    importKey: async () => ({}),
    deriveKey: async () => ({}),
    encrypt: async () => new ArrayBuffer(0),
    decrypt: async () => new ArrayBuffer(0),
  },
};

Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true,
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Mock navigator.onLine
Object.defineProperty(global.navigator, 'onLine', {
  value: true,
  writable: true,
});

// Mock Notification
class MockNotification {
  static permission = 'default';
  static requestPermission = async () => 'default';
  constructor() {}
}

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: async () => {},
    readText: async () => '',
  },
  writable: true,
});

// Global afterEach for cleanup
afterEach(() => {
  cleanup();
});

// Mock fetch for API calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  } as Response)
) as any;