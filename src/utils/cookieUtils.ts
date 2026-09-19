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
    // Abaikan cookie yang expired (Max-Age=0) dari Keycloak
    if (!cookieRaw.includes('Max-Age=0')) {
      const mainCookie = cookieRaw.split(';')[0].trim();
      const parts = mainCookie.split('=');
      const key = parts[0]?.trim();
      const val = parts.slice(1).join('=')?.trim();
      if (key && val) cookieMap[key] = val;
    }
  });

  return Object.entries(cookieMap).map(([k, v]) => `${k}=${v}`).join('; ');
}

/**
 * Mengekstrak array Set-Cookie dari response headers Native fetch.
 * React Native's fetch Headers tidak support getSetCookie() secara merata,
 * sehingga kita baca manual dari header 'set-cookie'.
 */
export function extractSetCookies(headers: Headers): string[] {
  if (typeof (headers as any).getSetCookie === 'function') {
    return (headers as any).getSetCookie() as string[];
  }
  const raw = headers.get('set-cookie');
  if (!raw) return [];
  // Split by ", " yang mendahului nama cookie baru (heuristik umum)
  return raw.split(/,(?=[^;]+=)/).map(s => s.trim());
}
