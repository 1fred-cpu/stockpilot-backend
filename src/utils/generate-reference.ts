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
