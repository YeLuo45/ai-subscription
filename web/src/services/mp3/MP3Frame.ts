/**
 * MP3Frame — simplified MP3 frame header parser
 *
 * Inspired by: mp3-parser
 *
 * Reads the first MPEG audio frame header to extract bitrate, sample rate, etc.
 */

export interface MP3FrameHeader {
  version: 'MPEG-1' | 'MPEG-2' | 'MPEG-2.5' | 'Reserved';
  layer: 'I' | 'II' | 'III' | 'Reserved';
  protection: boolean;  // false = CRC
  bitrate: number;      // kbps
  sampleRate: number;   // Hz
  padding: boolean;
  channelMode: 'Stereo' | 'Joint Stereo' | 'Dual Channel' | 'Mono';
  frameLength: number;  // bytes
}

const BITRATE_V1_L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
const SAMPLE_RATES_V1 = [44100, 48000, 32000, 0];

export class MP3Frame {
  /**
   * Parse MP3 frame header from 4 bytes.
   */
  static parseHeader(data: Uint8Array): MP3FrameHeader {
    if (data.length < 4) throw new Error('Data too short');
    if (data[0] !== 0xff || (data[1] & 0xe0) !== 0xe0) {
      throw new Error('No MP3 sync word');
    }
    const b1 = data[1];
    const b2 = data[2];
    const b3 = data[3];
    const versionBits = (b1 >> 3) & 0x03;
    const layerBits = (b1 >> 1) & 0x03;
    const protection = (b1 & 0x01) === 0;
    const bitrateIdx = (b2 >> 4) & 0x0f;
    const sampleIdx = (b2 >> 2) & 0x03;
    const padding = ((b2 >> 1) & 0x01) === 1;
    const chanModeIdx = (b3 >> 6) & 0x03;

    const versions: MP3FrameHeader['version'][] = ['MPEG-2.5', 'Reserved', 'MPEG-2', 'MPEG-1'];
    const layers: MP3FrameHeader['layer'][] = ['Reserved', 'III', 'II', 'I'];
    const chanModes: MP3FrameHeader['channelMode'][] = ['Stereo', 'Joint Stereo', 'Dual Channel', 'Mono'];

    const version = versions[versionBits] ?? 'Reserved';
    const layer = layers[layerBits] ?? 'Reserved';
    const bitrate = BITRATE_V1_L3[bitrateIdx] ?? 0;
    const sampleRate = SAMPLE_RATES_V1[sampleIdx] ?? 0;
    const channelMode = chanModes[chanModeIdx] ?? 'Stereo';
    const frameLength = MP3Frame._frameLength(bitrate, sampleRate, padding, layer);

    return {
      version,
      layer,
      protection,
      bitrate,
      sampleRate,
      padding,
      channelMode,
      frameLength,
    };
  }

  private static _frameLength(bitrate: number, sampleRate: number, padding: boolean, layer: MP3FrameHeader['layer']): number {
    if (bitrate === 0 || sampleRate === 0) return 0;
    if (layer === 'III' || layer === 'II') {
      return Math.floor((144 * bitrate * 1000) / sampleRate) + (padding ? 1 : 0);
    } else if (layer === 'I') {
      return Math.floor((48 * bitrate * 1000) / sampleRate) / 8 + (padding ? 4 : 0);
    }
    return 0;
  }

  /**
   * Find first MP3 sync word.
   */
  static findSync(data: Uint8Array): number {
    for (let i = 0; i < data.length - 1; i++) {
      if (data[i] === 0xff && (data[i + 1] & 0xe0) === 0xe0) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Validate MP3 frame.
   */
  static isValid(data: Uint8Array): boolean {
    return MP3Frame.findSync(data) >= 0;
  }
}
