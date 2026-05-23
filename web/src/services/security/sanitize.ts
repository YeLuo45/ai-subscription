/**
 * Security Sanitization Module
 * 
 * Provides log sanitization and sensitive data masking functions
 * to prevent leakage of tokens, keys, and other secrets in logs.
 */

// Sensitive field patterns to mask
const SENSITIVE_PATTERNS = [
  'token',
  'key',
  'secret',
  'password',
  'passwd',
  'api_key',
  'apikey',
  'api-key',
  'auth',
  'credential',
  'private',
  'bearer',
  'authorization',
  'cookie',
  'session',
  'jwt',
  'access_token',
  'refresh_token',
];

// Regex patterns for detection (case-insensitive)
const SENSITIVE_REGEX = new RegExp(
  SENSITIVE_PATTERNS.map(p => `(${p})`).join('|'),
  'gi'
);

// Pattern to match potential token/key values
const VALUE_PATTERNS = [
  /[A-Za-z0-9]{20,}/g,  // Long alphanumeric strings
  /[A-Za-z0-9_\-]{32,}/g,  // API keys often have these chars
  /sk-[A-Za-z0-9]{20,}/g,  // OpenAI style keys
  /ghp_[A-Za-z0-9]{36}/g,  // GitHub PAT
  /glpat-[A-Za-z0-9_\-]{20}/g,  // GitLab PAT
];

// Mask character
const MASK_CHAR = '*';
const MASK_LENGTH = 8;

/**
 * Mask a sensitive value, showing only first 2 and last 2 chars
 */
function maskValue(value: string): string {
  if (value.length <= 4) return MASK_CHAR.repeat(MASK_LENGTH);
  if (value.length <= 8) return MASK_CHAR.repeat(4) + value.slice(-2);
  return value.slice(0, 2) + MASK_CHAR.repeat(MASK_LENGTH) + value.slice(-2);
}

/**
 * Check if a string looks like a sensitive value
 */
function looksLikeSensitiveValue(value: string): boolean {
  // Check for common token/key patterns
  for (const pattern of VALUE_PATTERNS) {
    if (pattern.test(value)) {
      return true;
    }
  }
  return false;
}

/**
 * Mask sensitive information in an object
 */
export function maskSensitive(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    // If string looks like a sensitive value, mask it
    if (looksLikeSensitiveValue(obj)) {
      return maskValue(obj);
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => maskSensitive(item));
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();
      
      // Check if key matches sensitive patterns
      const isSensitiveKey = SENSITIVE_PATTERNS.some(pattern => 
        lowerKey.includes(pattern.toLowerCase())
      );
      
      if (isSensitiveKey && value !== undefined && value !== null) {
        // Mask sensitive fields
        if (typeof value === 'string') {
          result[key] = maskValue(value);
        } else if (typeof value === 'object') {
          result[key] = '[REDACTED]';
        } else {
          result[key] = value;
        }
      } else if (typeof value === 'object') {
        // Recursively mask nested objects
        result[key] = maskSensitive(value);
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }

  return obj;
}

/**
 * Sanitize a log message by masking sensitive data
 */
export function sanitizeLog(message: unknown, ...args: unknown[]): unknown[] {
  const sanitizedArgs = args.map(arg => maskSensitive(arg));
  
  if (typeof message === 'string') {
    // For strings, do a find-and-replace of potential sensitive values
    let sanitized = message;
    
    for (const pattern of VALUE_PATTERNS) {
      sanitized = sanitized.replace(pattern, (match) => maskValue(match));
    }
    
    return [sanitized, ...sanitizedArgs];
  }
  
  return [maskSensitive(message), ...sanitizedArgs];
}

/**
 * Create a sanitized console logger
 * Overrides console methods to automatically sanitize output
 */
export function createSanitizedLogger() {
  const createSanitizedMethod = (method: 'log' | 'debug' | 'info' | 'warn' | 'error') => {
    return (...args: unknown[]) => {
      const sanitized = sanitizeLog(...args);
      console[method](...sanitized);
    };
  };

  return {
    log: createSanitizedMethod('log'),
    debug: createSanitizedMethod('debug'),
    info: createSanitizedMethod('info'),
    warn: createSanitizedMethod('warn'),
    error: createSanitizedMethod('error'),
  };
}

/**
 * Mask headers object (commonly used in HTTP requests)
 */
export function maskHeaders(headers: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    
    if (lowerKey.includes('authorization') || 
        lowerKey.includes('cookie') ||
        lowerKey.includes('x-api-key')) {
      // Mask auth headers
      result[key] = maskValue(value);
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * Mask env variables for logging
 */
export function maskEnvVariables(env: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(env)) {
    const lowerKey = key.toLowerCase();
    
    if (SENSITIVE_PATTERNS.some(p => lowerKey.includes(p.toLowerCase()))) {
      result[key] = maskValue(value);
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * Clear clipboard after specified timeout
 */
export function secureCopy(text: string, timeoutMs: number = 30000): void {
  navigator.clipboard.writeText(text).then(() => {
    // Clear clipboard after timeout to prevent sensitive data leakage
    setTimeout(() => {
      navigator.clipboard.writeText('').catch(() => {
        // Ignore clipboard clear errors
      });
    }, timeoutMs);
  }).catch(err => {
    console.error('Failed to copy to clipboard:', sanitizeLog(err));
  });
}

/**
 * Sanitize error message for user display (without internal details)
 */
export function sanitizeError(error: unknown): string {
  if (error instanceof Error) {
    // Return user-safe message without internal paths or implementation details
    const safeMessages = [
      'Authentication failed',
      'Connection timeout',
      'Invalid credentials',
      'Service unavailable',
      'Request failed',
      'Network error',
    ];
    
    // Check if error message contains any sensitive keywords
    const lowerMessage = error.message.toLowerCase();
    for (const pattern of SENSITIVE_PATTERNS) {
      if (lowerMessage.includes(pattern)) {
        return 'An error occurred. Please try again.';
      }
    }
    
    // Return sanitized message
    return error.message
      .replace(/\/.*?\/.*?\.ts:\d+:\d+/g, '[location]')
      .replace(/at .*? \((.*?)\)/g, 'at [function] ($1)')
      .replace(/\n/g, ' ')
      .slice(0, 200);
  }
  
  return 'An unexpected error occurred.';
}

/**
 * Validate that an object doesn't contain obviously malformed data
 */
export function validateStoredData<T>(data: unknown, expectedType: string): data is T {
  if (data === null || data === undefined) {
    return true;
  }
  
  if (typeof data !== 'object') {
    console.warn(`[Security] Unexpected type for stored data: ${typeof data}`);
    return false;
  }
  
  // Check for prototype pollution attempts (direct properties only)
  const obj = data as Record<string, unknown>;
  if (obj.__proto__ !== Object.prototype || 'constructor' in obj && obj.constructor !== Object) {
    console.warn('[Security] Potential prototype pollution detected');
    return false;
  }
  
  return true;
}