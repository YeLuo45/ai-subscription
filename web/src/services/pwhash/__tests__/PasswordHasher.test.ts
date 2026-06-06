/**
 * PasswordHasher.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { PasswordHasher } from '../PasswordHasher';

describe('PasswordHasher — hash', () => {
  it('hashes a password', async () => {
    const h = await PasswordHasher.hash('password123', 1000);
    expect(h.startsWith('pbkdf2_sha256$1000$')).toBe(true);
  });

  it('hashes are unique', async () => {
    const h1 = await PasswordHasher.hash('password', 1000);
    const h2 = await PasswordHasher.hash('password', 1000);
    expect(h1).not.toBe(h2); // different salts
  });
});

describe('PasswordHasher — verify', () => {
  it('verifies correct password', async () => {
    const h = await PasswordHasher.hash('mypassword', 1000);
    expect(await PasswordHasher.verify('mypassword', h)).toBe(true);
  });

  it('rejects wrong password', async () => {
    const h = await PasswordHasher.hash('mypassword', 1000);
    expect(await PasswordHasher.verify('wrongpassword', h)).toBe(false);
  });

  it('rejects malformed hash', async () => {
    expect(await PasswordHasher.verify('any', 'malformed')).toBe(false);
  });

  it('rejects unsupported algo', async () => {
    expect(await PasswordHasher.verify('any', 'bcrypt$x$y$z')).toBe(false);
  });
});

describe('PasswordHasher — needs rehash', () => {
  it('returns true for old iterations', () => {
    expect(PasswordHasher.needsRehash('pbkdf2_sha256$1000$aa$bb', 100000)).toBe(true);
  });

  it('returns false for current iterations', () => {
    expect(PasswordHasher.needsRehash('pbkdf2_sha256$100000$aa$bb', 100000)).toBe(false);
  });

  it('returns true for malformed', () => {
    expect(PasswordHasher.needsRehash('bad')).toBe(true);
  });
});
