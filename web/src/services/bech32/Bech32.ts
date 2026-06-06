/**
 * Bech32 — SegWit address encoding
 *
 * Inspired by: BIP 173 (bech32)
 *
 * Format: <hrp>1<data><6-char-checksum>
 * Used for Bitcoin SegWit addresses.
 */

const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const CHARSET_MAP: Record<string, number> = {};
for (let i = 0; i < CHARSET.length; i++) CHARSET_MAP[CHARSET[i]] = i;

function polymod(values: number[]): number {
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const v of values) {
    const b = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) {
      if ((b >> i) & 1) chk ^= GEN[i];
    }
  }
  return chk;
}

function hrpExpand(hrp: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < hrp.length; i++) out.push(hrp.charCodeAt(i) >> 5);
  out.push(0);
  for (let i = 0; i < hrp.length; i++) out.push(hrp.charCodeAt(i) & 31);
  return out;
}

function verifyChecksum(hrp: string, data: number[]): boolean {
  return polymod([...hrpExpand(hrp), ...data]) === 1;
}

function createChecksum(hrp: string, data: number[]): number[] {
  const values = [...hrpExpand(hrp), ...data, 0, 0, 0, 0, 0, 0];
  const mod = polymod(values) ^ 1;
  const out: number[] = [];
  for (let i = 0; i < 6; i++) out.push((mod >> (5 * (5 - i))) & 31);
  return out;
}

export class Bech32 {
  static decode(addr: string): { hrp: string; data: number[] } | null {
    addr = addr.toLowerCase();
    const pos = addr.lastIndexOf('1');
    if (pos < 1 || pos + 7 > addr.length || pos > 83) return null;
    const hrp = addr.slice(0, pos);
    const dataPart = addr.slice(pos + 1);
    const data: number[] = [];
    for (const c of dataPart) {
      if (!(c in CHARSET_MAP)) return null;
      data.push(CHARSET_MAP[c]);
    }
    if (!verifyChecksum(hrp, data)) return null;
    return { hrp, data: data.slice(0, data.length - 6) };
  }

  static encode(hrp: string, data: number[]): string {
    const combined = [...data, ...createChecksum(hrp, data)];
    let out = hrp + '1';
    for (const d of combined) out += CHARSET[d];
    return out;
  }
}
