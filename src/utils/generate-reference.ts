import { randomBytes } from 'crypto';

/**
 * Generates a random reference string.
 * Example output: "SALE-20250907-AB12CD34"
 *
 * @param prefix optional prefix (e.g., "SALE", "PAY", "REF")
 */
export function generateReference(prefix = 'REF'): string {
  // current date (YYYYMMDD)
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');

  // random 4-byte hex string
  const randomPart = randomBytes(4).toString('hex').toUpperCase();

  return `${prefix}-${date}-${randomPart}`;
}

import { v4 as uuidv4 } from 'uuid';

const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/**
 * Convert UUID → Base62 string
 */
function uuidToBase62(uuid: string): string {
  const hex = uuid.replace(/-/g, '');
  const bigInt = BigInt('0x' + hex);

  let encoded = '';
  let num = bigInt;
  while (num > 0n) {
    const remainder = num % 62n;
    encoded = CHARS[Number(remainder)] + encoded;
    num = num / 62n;
  }
  return encoded;
}

/**
 * Convert Base62 string → UUID
 */
function base62ToUuid(base62: string): string {
  let bigInt = 0n;
  for (const c of base62) {
    bigInt = bigInt * 62n + BigInt(CHARS.indexOf(c));
  }

  let hex = bigInt.toString(16).padStart(32, '0');

  return (
    hex.substring(0, 8) +
    '-' +
    hex.substring(8, 12) +
    '-' +
    hex.substring(12, 16) +
    '-' +
    hex.substring(16, 20) +
    '-' +
    hex.substring(20)
  );
}

/**
 * Generate a human-readable ID with prefix
 */
export function uuidToReadable(uuid: string, prefix: string): string {
  return `${prefix}-${uuidToBase62(uuid)}`;
}

/**
 * Convert a prefixed readable ID back to UUID
 */
export function readableToUuid(readable: string): string {
  const [, encoded] = readable.split('-');
  return base62ToUuid(encoded);
}

// // Example usage
// const uuid = uuidv4();
// console.log('UUID:', uuid);

// const saleId = uuidToReadable(uuid, 'SALE');
// console.log('Readable (SALE):', saleId);

// const rtnId = uuidToReadable(uuid, 'RTN');
// console.log('Readable (RTN):', rtnId);

// const back = readableToUuid(saleId);
// console.log('Back to UUID:', back);
