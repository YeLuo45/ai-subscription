/**
 * Vitest Test Setup
 * Configures jsdom environment and global test utilities
 */

// IMPORTANT: Set up React.act polyfill BEFORE any imports
// This must happen before 'react' or '@testing-library/react' is imported
import { act as reactAct } from 'react-dom/test-utils';

// Set up globals that @testing-library/react expects
(global as any).React = (global as any).React || {};
(global as any).React.act = reactAct;

// Now safe to import testing libraries
import { cleanup, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock Web Crypto API for tests
let randomCallCount = 0;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

// Generate varied random data based on call count
function generateRandomValues<T extends Uint8Array>(array: T): T {
  randomCallCount++;
  for (let i = 0; i < array.length; i++) {
    // Use call count to create variation
    array[i] = ((i * 7 + randomCallCount * 13) % 256);
  }
  return array;
}

let currentSalt: Uint8Array | null = null;

const mockCrypto = {
  getRandomValues: generateRandomValues,
  subtle: {
    importKey: async (
      _format: string,
      keyData: ArrayBuffer,
      _algorithm: any,
      _extractable: boolean,
      _usages: string[]
    ) => ({
      type: 'secret',
      algorithm: { name: 'AES-GCM' },
      extractable: true,
      usages: [],
      exportedKeyData: keyData
    }),
    deriveKey: async () => ({ type: 'secret', algorithm: { name: 'AES-GCM' } }),
    encrypt: async (algorithm: any, key: any, data: ArrayBuffer) => {
      // Real AES-GCM would produce: IV (12 bytes) + ciphertext + auth tag (16 bytes)
      // Mock: prepend "MOCK" header and return data as-is for decrypt to extract
      const encoded = textEncoder.encode(textDecoder.decode(data));
      const result = new Uint8Array(encoded.length + 4);
      result[0] = 0x4D; result[1] = 0x4F; result[2] = 0x43; result[3] = 0x4B; // "MOCK"
      result.set(encoded, 4);
      return result.buffer;
    },
    decrypt: async (algorithm: any, key: any, data: ArrayBuffer) => {
      const arr = new Uint8Array(data);
      // Check for mock header
      if (arr[0] === 0x4D && arr[1] === 0x4F && arr[2] === 0x43 && arr[3] === 0x4B) {
        return arr.slice(4).buffer;
      }
      // Real AES-GCM decryption fallback
      return data;
    },
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
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  } as Response)
) as any;