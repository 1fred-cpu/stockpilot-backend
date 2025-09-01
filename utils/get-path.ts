// const urlStr =
//   'https://iqtoaznivtnfgsudkvzg.supabase.co/storage/v1/object/public/products/stores/Luxeline/1756495058282_classic-polo-shirt-navy-683.webp';
// const path = urlStr.replace(/^https?:\/\/[^/]+/, '');
// console.log(path); // => "/storage/v1/object/public/products/stores/Luxeline/1756495058282_classic-polo-shirt-navy-683.webp"

export function getPathFromUrl(url: string): string {
  return url.replace(/^https?:\/\/[^/]+/, '');
}
