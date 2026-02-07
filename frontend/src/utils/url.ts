/**
 * URL utility functions for generating absolute URLs
 */

/**
 * 获取当前应用的完整基础 URL（包含协议和域名）
 * @returns 完整的基础 URL，例如 "https://example.com"
 */
export function getCurrentBaseUrl(): string {
  return `${window.location.protocol}//${window.location.host}`;
}

/**
 * 将相对路径转换为完整 URL
 * @param path 相对路径，可以以 / 开头或不以 / 开头
 * @returns 完整的绝对 URL
 */
export function toAbsoluteUrl(path: string): string {
  const baseUrl = getCurrentBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}
