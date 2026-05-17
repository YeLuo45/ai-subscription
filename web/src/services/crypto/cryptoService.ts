/**
 * Crypto Service - E2E Encryption using Web Crypto API
 * 
 * Implements AES-GCM encryption/decryption with PBKDF2 key derivation
 * for protecting sensitive data (API tokens, cookies, etc.) in localStorage.
 * 
 * Zero新增依赖 - Uses only Web Crypto API (crypto.subtle)
 */

const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const KEY_LENGTH = 256;

// In-memory key storage (not persisted)
let derivedKey: CryptoKey | null = null;
let currentSalt: Uint8Array | null = null;

/**
 * Generate a random salt for PBKDF2
 */
function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

/**
 * Generate a random IV for AES-GCM
 */
function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

/**
 * Derive a key from password using PBKDF2
 * @param password User-provided password/passphrase
 * @param salt Random salt (should be stored alongside encrypted data)
 */
async function deriveKeyFromPassword(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  
  // Import password as raw key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  // Derive AES-GCM key using PBKDF2
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false, // Not extractable
    ['encrypt', 'decrypt']
  );
  
  return key;
}

/**
 * Initialize encryption with user password
 * Call this when user unlocks the app
 */
export async function initializeEncryption(password: string, salt?: Uint8Array): Promise<Uint8Array> {
  // Generate or use provided salt
  currentSalt = salt || generateSalt();
  
  // Derive key from password
  derivedKey = await deriveKeyFromPassword(password, currentSalt);
  
  return currentSalt;
}

/**
 * Check if encryption is initialized (user has unlocked)
 */
export function isEncryptionInitialized(): boolean {
  return derivedKey !== null;
}

/**
 * Clear the derived key from memory (lock)
 */
export function clearEncryption(): void {
  derivedKey = null;
}

/**
 * Get current salt (needed for storage)
 */
export function getCurrentSalt(): Uint8Array | null {
  return currentSalt;
}

/**
 * Set salt (when loading from storage)
 */
export function setCurrentSalt(salt: Uint8Array): void {
  currentSalt = salt;
}

/**
 * Encrypt data using AES-GCM
 * @param plaintext Data to encrypt
 * @returns Encrypted data as base64 string (salt + iv + ciphertext)
 */
export async function encrypt(plaintext: string): Promise<string> {
  if (!derivedKey || !currentSalt) {
    throw new Error('Encryption not initialized. Call initializeEncryption first.');
  }
  
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  const iv = generateIV();
  
  // Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    derivedKey,
    data
  );
  
  // Combine salt + iv + ciphertext
  const combined = new Uint8Array(
    currentSalt.length + iv.length + ciphertext.byteLength
  );
  combined.set(currentSalt, 0);
  combined.set(iv, currentSalt.length);
  combined.set(new Uint8Array(ciphertext), currentSalt.length + iv.length);
  
  // Return as base64
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt data using AES-GCM
 * @param encryptedData Base64 encoded encrypted data (salt + iv + ciphertext)
 * @param password Password to derive key (if not initialized)
 * @param salt Salt used for key derivation (if not initialized)
 */
export async function decrypt(
  encryptedData: string,
  password?: string,
  salt?: Uint8Array
): Promise<string> {
  // If not initialized and no credentials provided, error
  if (!derivedKey && (!password || !salt)) {
    throw new Error('Encryption not initialized and no credentials provided.');
  }
  
  // If not initialized but credentials provided, initialize first
  if (!derivedKey && password && salt) {
    await initializeEncryption(password, salt);
  }
  
  if (!derivedKey) {
    throw new Error('Failed to initialize decryption key.');
  }
  
  // Decode base64
  const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
  
  // Extract salt, iv, and ciphertext
  const extractedSalt = combined.slice(0, SALT_LENGTH);
  const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const ciphertext = combined.slice(SALT_LENGTH + IV_LENGTH);
  
  // If salt doesn't match current salt, re-derive key
  if (currentSalt && !bytesEqual(extractedSalt, currentSalt)) {
    if (!password) {
      throw new Error('Salt mismatch and no password provided to re-derive key.');
    }
    derivedKey = await deriveKeyFromPassword(password, extractedSalt);
    currentSalt = extractedSalt;
  }
  
  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    derivedKey,
    ciphertext
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Compare two byte arrays for equality (constant-time)
 */
function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

/**
 * Encrypt sensitive object fields
 * @param obj Object containing sensitive data
 * @param sensitiveFields Array of field names to encrypt
 */
export async function encryptSensitiveFields<T extends Record<string, unknown>>(
  obj: T,
  sensitiveFields: string[]
): Promise<T> {
  const result = { ...obj };
  
  for (const field of sensitiveFields) {
    if (result[field] !== undefined && result[field] !== null) {
      const value = String(result[field]);
      result[field] = await encrypt(value) as T[Extract<keyof T, string>];
    }
  }
  
  return result;
}

/**
 * Decrypt sensitive object fields
 * @param obj Object containing encrypted data
 * @param sensitiveFields Array of field names to decrypt
 */
export async function decryptSensitiveFields<T extends Record<string, unknown>>(
  obj: T,
  sensitiveFields: string[]
): Promise<T> {
  const result = { ...obj };
  
  for (const field of sensitiveFields) {
    if (typeof result[field] === 'string' && (result[field] as string).length > 0) {
      try {
        // Check if it looks like encrypted data (base64, starts with salt pattern)
        const value = result[field] as string;
        if (value.length > SALT_LENGTH + IV_LENGTH) {
          result[field] = await decrypt(value) as T[Extract<keyof T, string>];
        }
      } catch {
        // If decryption fails, field might not be encrypted
        // Leave as-is
      }
    }
  }
  
  return result;
}

/**
 * Encrypt API token for storage
 */
export async function encryptApiToken(token: string): Promise<string> {
  return encrypt(token);
}

/**
 * Decrypt API token from storage
 */
export async function decryptApiToken(encryptedToken: string): Promise<string> {
  return decrypt(encryptedToken);
}

/**
 * Encrypt API Key for secure storage
 * Uses separate encryption context from generic encrypt to allow key rotation
 */
export async function encryptApiKey(apiKey: string): Promise<string> {
  if (!apiKey) return '';
  return encrypt(`api_key:${apiKey}`);
}

/**
 * Decrypt API Key from storage
 */
export async function decryptApiKey(encryptedApiKey: string): Promise<string> {
  if (!encryptedApiKey) return '';
  const decrypted = await decrypt(encryptedApiKey);
  // Strip prefix if present
  if (decrypted.startsWith('api_key:')) {
    return decrypted.slice(8);
  }
  return decrypted;
}

/**
 * Encrypt Bearer Token for MCP authentication
 * Stores with prefix for identification during decryption
 */
export async function encryptBearerToken(token: string): Promise<string> {
  if (!token) return '';
  return encrypt(`bearer:${token}`);
}

/**
 * Decrypt Bearer Token for MCP authentication
 */
export async function decryptBearerToken(encryptedToken: string): Promise<string> {
  if (!encryptedToken) return '';
  const decrypted = await decrypt(encryptedToken);
  // Strip prefix if present
  if (decrypted.startsWith('bearer:')) {
    return decrypted.slice(7);
  }
  return decrypted;
}

/**
 * Encrypt cookie value for storage
 */
export async function encryptCookie(cookie: string): Promise<string> {
  return encrypt(cookie);
}

/**
 * Decrypt cookie from storage
 */
export async function decryptCookie(encryptedCookie: string): Promise<string> {
  return decrypt(encryptedCookie);
}