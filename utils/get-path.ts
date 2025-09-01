export function getPathFromUrl(url: string): string {
  // Remove domain and the fixed prefix up to "products/"
  return url.replace(
    /^https?:\/\/[^/]+\/storage\/v1\/object\/public\/products\//,
    '',
  );
}
