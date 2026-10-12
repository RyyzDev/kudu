/**
 * Menjaga dan memperbarui Cookie selama proses Redirect Karantina
 * Identik dengan kudu-backend/src/utils/cookieUtils.ts
 */
export function updateCookies(existingCookieStr: string = '', newSetCookieArray: string[] = []): string {
  if (!newSetCookieArray || newSetCookieArray.length === 0) return existingCookieStr;

  const cookieMap: Record<string, string> = {};

  // Parse existing cookies
  if (existingCookieStr) {
    existingCookieStr.split(';').forEach(c => {
      const parts = c.split('=');
      const key = parts[0]?.trim();
      const val = parts.slice(1).join('=')?.trim();
      if (key && val) cookieMap[key] = val;
    });
  }

  // Parse & timpa dengan cookies baru dari response header
  newSetCookieArray.forEach(cookieRaw => {
    const mainCookie = cookieRaw.split(';')[0].trim();
    const parts = mainCookie.split('=');
    const key = parts[0]?.trim();
    const val = parts.slice(1).join('=')?.trim();
    if (!key) return;

    if (cookieRaw.includes('Max-Age=0') || cookieRaw.includes('expires=Thu, 01 Jan 1970')) {
      delete cookieMap[key];
    } else if (val !== undefined) {
      cookieMap[key] = val;
    }
  });

  return Object.entries(cookieMap).map(([k, v]) => `${k}=${v}`).join('; ');
}

/**
 * Mengekstrak array Set-Cookie dari response headers Native fetch atau Axios.
 */
export function extractSetCookies(headers: any): string[] {
  if (!headers) return [];
  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie() as string[];
  }
  let raw: any;
  if (typeof headers.get === 'function') {
    raw = headers.get('set-cookie');
  } else {
    raw = headers['set-cookie'] || headers['Set-Cookie'];
  }
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  return String(raw).split(/,(?=[^;]+=)/).map((s: string) => s.trim());
}
