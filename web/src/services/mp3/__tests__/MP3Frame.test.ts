/**
 * MP3Frame.test.ts — Pure unit tests
 *
 * Test data constructed to match MP3 spec.
 * byte layout: 0xFF 0xFB 0x90 0x44
 * 0xFF = sync
 * 0xFB = 1111 1011 -> sync continuation, version=11 (MPEG-1), layer=01 (L3), protection=1 (no CRC)
 * 0x90 = 1001 0000 -> bitrate=1001 (128k for V1 L3), samplerate=00 (44100), padding=0, private=0
 * 0x44 = 0100 0100 -> channel=01 (Joint Stereo), mode_ext=00, copyright=0, original=1, emphasis=00
 */

import { describe, it, expect } from 'vitest';
import { MP3Frame } from '../MP3Frame';

describe('MP3Frame — parse header', () => {
  it('parses MPEG-1 Layer III 128kbps', () => {
    const data = new Uint8Array([0xff, 0xfb, 0x90, 0x44]);
    const h = MP3Frame.parseHeader(data);
    expect(h.version).toBe('MPEG-1');
    expect(h.layer).toBe('III');
    expect(h.bitrate).toBe(128);
    expect(h.sampleRate).toBe(44100);
  });

  it('parses MPEG-2 Layer III', () => {
    // 0xF2 = 0b11110010: sync=111, version=10 (MPEG-2), layer=01 (L3), prot=0
    const data = new Uint8Array([0xff, 0xf2, 0x90, 0x44]);
    const h = MP3Frame.parseHeader(data);
    expect(h.version).toBe('MPEG-2');
    expect(h.layer).toBe('III');
  });

  it('parses MPEG-2.5', () => {
    // 0xE2 = 0b11100010: sync=111, version=00 (MPEG-2.5), layer=01, prot=0
    const data = new Uint8Array([0xff, 0xe2, 0x90, 0x44]);
    const h = MP3Frame.parseHeader(data);
    expect(h.version).toBe('MPEG-2.5');
  });

  it('parses stereo', () => {
    // channel=00 (Stereo): byte3 bits 7,6 = 00 -> 0x04
    const data = new Uint8Array([0xff, 0xfb, 0x90, 0x04]);
    const h = MP3Frame.parseHeader(data);
    expect(h.channelMode).toBe('Stereo');
  });

  it('parses mono', () => {
    // channel=11 (Mono): byte3 bits 7,6 = 11 -> 0xC4
    const data = new Uint8Array([0xff, 0xfb, 0x90, 0xc4]);
    const h = MP3Frame.parseHeader(data);
    expect(h.channelMode).toBe('Mono');
  });
});

describe('MP3Frame — sync', () => {
  it('findSync', () => {
    const data = new Uint8Array([0, 0, 0xff, 0xfb, 0x90, 0x44]);
    expect(MP3Frame.findSync(data)).toBe(2);
  });

  it('no sync', () => {
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    expect(MP3Frame.findSync(data)).toBe(-1);
  });

  it('isValid', () => {
    const data = new Uint8Array([0xff, 0xfb, 0x90, 0x44]);
    expect(MP3Frame.isValid(data)).toBe(true);
  });
});

describe('MP3Frame — errors', () => {
  it('too short', () => {
    expect(() => MP3Frame.parseHeader(new Uint8Array([0xff, 0xfb]))).toThrow();
  });

  it('no sync word', () => {
    expect(() => MP3Frame.parseHeader(new Uint8Array([1, 2, 3, 4]))).toThrow();
  });
});

describe('MP3Frame — frame length', () => {
  it('Layer III 128kbps 44100Hz = 417 bytes', () => {
    const data = new Uint8Array([0xff, 0xfb, 0x90, 0x44]);
    const h = MP3Frame.parseHeader(data);
    expect(h.frameLength).toBe(417);  // 144*128000/44100
  });
});
