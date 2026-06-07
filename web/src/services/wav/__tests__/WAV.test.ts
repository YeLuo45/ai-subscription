/**
 * WAV.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { WAV } from '../WAV';

describe('WAV — write', () => {
  it('write and validate', () => {
    const samples = new Int16Array([0, 1000, -1000, 32767, -32768]);
    const buf = WAV.write(samples, 44100, 1);
    expect(WAV.isValid(buf)).toBe(true);
  });

  it('header size', () => {
    const samples = new Int16Array(10);
    const buf = WAV.write(samples, 8000, 1);
    const h = WAV.readHeader(buf);
    expect(h.sampleRate).toBe(8000);
    expect(h.numChannels).toBe(1);
    expect(h.bitsPerSample).toBe(16);
  });
});

describe('WAV — read', () => {
  it('roundtrip samples', () => {
    const orig = new Int16Array([100, 200, -300, 400]);
    const buf = WAV.write(orig);
    const read = WAV.readSamples(buf);
    expect(Array.from(read)).toEqual(Array.from(orig));
  });

  it('samples at different rates', () => {
    const orig = new Int16Array([1000, 2000, 3000]);
    const buf = WAV.write(orig, 22050, 2);
    const read = WAV.readSamples(buf);
    expect(read.length).toBe(3);
  });
});

describe('WAV — validate', () => {
  it('valid', () => {
    const buf = WAV.write(new Int16Array(0));
    expect(WAV.isValid(buf)).toBe(true);
  });

  it('invalid', () => {
    expect(WAV.isValid(new Uint8Array([0, 1, 2, 3]))).toBe(false);
  });
});

describe('WAV — duration', () => {
  it('duration 1 second', () => {
    const samples = new Int16Array(44100);
    const buf = WAV.write(samples, 44100, 1);
    expect(WAV.duration(buf)).toBeCloseTo(1.0, 1);
  });

  it('duration 0.5 second', () => {
    const samples = new Int16Array(22050);
    const buf = WAV.write(samples, 44100, 1);
    expect(WAV.duration(buf)).toBeCloseTo(0.5, 1);
  });
});

describe('WAV — errors', () => {
  it('too short', () => {
    expect(() => WAV.readHeader(new Uint8Array(10))).toThrow();
  });
});
