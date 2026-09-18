/**
 * Menjaga dan memperbarui Cookie selama proses Redirect Karantina
 */
function updateCookies(existingCookieStr = '', newSetCookieArray = []) {
  if (!newSetCookieArray || newSetCookieArray.length === 0) return existingCookieStr;
  
  const cookieMap = {};
  
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

export default updateCookies;
