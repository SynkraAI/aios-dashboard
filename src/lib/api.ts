/**
 * API utility — handles basePath for all fetch calls.
 *
 * Next.js basePath is NOT automatically prepended to fetch() calls,
 * so we need to do it manually for all API requests.
 */

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '/aiox-dashboard';

/**
 * Prepend the basePath to an API route path.
 * @example apiUrl('/api/stories') => '/aiox-dashboard/api/stories'
 */
export function apiUrl(path: string): string {
  return `${BASE_PATH}${path}`;
}
