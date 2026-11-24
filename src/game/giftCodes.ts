export interface GiftRewardPayload {
  cash: number;
  keys: number;
  gems: number;
  hearts: number;
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 unambiguous chars
const SECRET_SALT = 'CANDY_AMIR_GIFT_2026_V1';

function encodeVarInt(value: number, out: number[]): void {
  let v = Math.max(0, Math.floor(value));
  while (v >= 0x80) {
    out.push((v & 0x7f) | 0x80);
    v = Math.floor(v / 128);
  }
  out.push(v & 0x7f);
}

function decodeVarInt(bytes: number[], offset: number): { value: number; nextOffset: number } | null {
  let result = 0;
  let multiplier = 1;
  let idx = offset;
  while (idx < bytes.length) {
    const b = bytes[idx++];
    result += (b & 0x7f) * multiplier;
    if ((b & 0x80) === 0) {
      return { value: result, nextOffset: idx };
    }
    multiplier *= 128;
    if (multiplier > 1e12) return null;
  }
  return null;
}

function computeChecksum24(data: number[]): number {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < SECRET_SALT.length; i++) {
    h1 ^= SECRET_SALT.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193) >>> 0;
  }
  for (const b of data) {
    h1 ^= b;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 = (Math.imul(h2 ^ (b + 17), 0x85ebca6b) >>> 0);
  }
  return (h1 ^ (h2 >>> 8)) & 0xffffff;
}

function keystreamByte(nonceHi: number, nonceLo: number, index: number): number {
  let h = (nonceHi << 8) | nonceLo;
  h = Math.imul(h ^ (index * 73 + 41), 0x45d9f3b) >>> 0;
  h ^= SECRET_SALT.charCodeAt(index % SECRET_SALT.length);
  h = Math.imul(h, 0x27d4eb2d) >>> 0;
  return (h >>> 16) & 0xff;
}

function bytesToBase32(bytes: number[]): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      output += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32ToBytes(str: string): number[] | null {
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of str) {
    const idx = ALPHABET.indexOf(ch);
    if (idx === -1) return null;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return out;
}

export function normalizeGiftCode(raw: string): string {
  const cleaned = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!cleaned.startsWith('AMIR')) return cleaned;
  const body = cleaned.slice(4);
  const groups = body.match(/.{1,4}/g) ?? [];
  return ['AMIR', ...groups].join('-');
}

export function generateGiftCode(payload: GiftRewardPayload, nonce?: number): string {
  const cash = Math.max(0, Math.floor(payload.cash || 0));
  const keys = Math.max(0, Math.floor(payload.keys || 0));
  const gems = Math.max(0, Math.floor(payload.gems || 0));
  const hearts = Math.max(0, Math.floor(payload.hearts || 0));

  if (cash + keys + gems + hearts <= 0) return '';

  const n = nonce !== undefined ? nonce & 0xffff : Math.floor(Math.random() * 65536);
  const nonceHi = (n >>> 8) & 0xff;
  const nonceLo = n & 0xff;

  let mask = 0;
  if (cash > 0) mask |= 1;
  if (keys > 0) mask |= 2;
  if (gems > 0) mask |= 4;
  if (hearts > 0) mask |= 8;

  const plainPayload: number[] = [mask];
  if (cash > 0) encodeVarInt(cash, plainPayload);
  if (keys > 0) encodeVarInt(keys, plainPayload);
  if (gems > 0) encodeVarInt(gems, plainPayload);
  if (hearts > 0) encodeVarInt(hearts, plainPayload);

  const chk = computeChecksum24([nonceHi, nonceLo, ...plainPayload]);
  const chkBytes = [(chk >>> 16) & 0xff, (chk >>> 8) & 0xff, chk & 0xff];

  const obfPayload = plainPayload.map((b, idx) => b ^ keystreamByte(nonceHi, nonceLo, idx));
  const allBytes = [nonceHi, nonceLo, ...obfPayload, ...chkBytes];
  const encoded = bytesToBase32(allBytes);
  const groups = encoded.match(/.{1,4}/g) ?? [];
  return ['AMIR', ...groups].join('-');
}

export function verifyAndDecodeGiftCode(
  rawCode: string
): { valid: true; normalizedCode: string; reward: GiftRewardPayload } | { valid: false; error: string } {
  const cleaned = rawCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!cleaned.startsWith('AMIR') || cleaned.length < 10) {
    return { valid: false, error: 'Invalid gift code format.' };
  }

  const body = cleaned.slice(4);
  const bytes = base32ToBytes(body);
  if (!bytes || bytes.length < 6) {
    return { valid: false, error: 'Invalid or corrupted gift code.' };
  }

  const nonceHi = bytes[0];
  const nonceLo = bytes[1];
  const obfPayload = bytes.slice(2, bytes.length - 3);
  const chkBytes = bytes.slice(bytes.length - 3);
  const plainPayload = obfPayload.map((b, idx) => b ^ keystreamByte(nonceHi, nonceLo, idx));

  const expectedChk = computeChecksum24([nonceHi, nonceLo, ...plainPayload]);
  const actualChk = (chkBytes[0] << 16) | (chkBytes[1] << 8) | chkBytes[2];

  if (expectedChk !== actualChk || plainPayload.length < 1) {
    return { valid: false, error: 'Invalid or tampered gift code.' };
  }

  const mask = plainPayload[0];
  if (mask === 0 || (mask & ~15) !== 0) {
    return { valid: false, error: 'Invalid reward data in code.' };
  }

  let offset = 1;
  let cash = 0;
  let keys = 0;
  let gems = 0;
  let hearts = 0;

  if (mask & 1) {
    const res = decodeVarInt(plainPayload, offset);
    if (!res) return { valid: false, error: 'Corrupted reward data.' };
    cash = res.value;
    offset = res.nextOffset;
  }
  if (mask & 2) {
    const res = decodeVarInt(plainPayload, offset);
    if (!res) return { valid: false, error: 'Corrupted reward data.' };
    keys = res.value;
    offset = res.nextOffset;
  }
  if (mask & 4) {
    const res = decodeVarInt(plainPayload, offset);
    if (!res) return { valid: false, error: 'Corrupted reward data.' };
    gems = res.value;
    offset = res.nextOffset;
  }
  if (mask & 8) {
    const res = decodeVarInt(plainPayload, offset);
    if (!res) return { valid: false, error: 'Corrupted reward data.' };
    hearts = res.value;
    offset = res.nextOffset;
  }

  if (offset !== plainPayload.length || cash + keys + gems + hearts <= 0) {
    return { valid: false, error: 'Invalid gift code payload.' };
  }

  return {
    valid: true,
    normalizedCode: normalizeGiftCode(rawCode),
    reward: { cash, keys, gems, hearts },
  };
}
