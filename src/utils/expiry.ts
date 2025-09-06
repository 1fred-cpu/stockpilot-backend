/**
 *
 * @param hours
 * @returns Returns a date as a string value in ISO format
 */
export function generateExpiry(hours: number): string {
  const now = new Date();
  now.setHours(now.getHours() + hours);
  return now.toISOString(); // store as ISO string in DB
}
/**
 *
 * @param days
 * @returns Returns a date as a string value in ISO format
 */
export function generateExpiryDays(days: number): string {
  const now = new Date();
  now.setDate(now.getDate() + days);
  return now.toISOString();
}
/**
 *
 * @param minutes
 * @returns a number
 */
export function generateExpiryUnix(minutes: number): number {
  const now = Math.floor(Date.now() / 1000); // current timestamp in seconds
  return now + minutes * 60;
}

// Example: expires in 30 minutes
// const exp = generateExpiryUnix(30);
// console.log(exp); // e.g., 1756837200

// // Example: expires in 7 days
// const expiresAt = generateExpiryDays(7);
// console.log(expiresAt);

// Example: expires in 24 hours
// const expiresAt = generateExpiry(24);
// console.log(expiresAt);
