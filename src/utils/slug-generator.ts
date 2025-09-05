export function generateSlug(text) {
  return text
    .toString() // Ensure it's a string
    .normalize('NFD') // Normalize accents
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .toLowerCase() // Lowercase
    .trim() // Remove leading/trailing spaces
    .replace(/[^a-z0-9\s-]/g, '') // Remove invalid chars
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/-+/g, '-'); // Remove consecutive -
}
