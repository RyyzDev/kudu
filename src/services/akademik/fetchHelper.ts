import { updateCookies, extractSetCookies } from '../../utils/cookieUtils';

// ==========================================
// HELPER: HTTP GET dengan auto-redirect manual & cookie collector
// Mereplika perilaku Axios Node.js (follow-redirects) + cookie jar
// ==========================================
export async function fetchWithManualRedirects(
  initialUrl: string,
  baseHeaders: Record<string, string>,
  initialCookies: string = '',
  maxRedirects: number = 5
): Promise<{ res: Response; currentUrl: string; currentCookies: string }> {
  let currentUrl = initialUrl;
  let currentCookies = initialCookies;
  let loopCount = 0;
  let res!: Response;

  while (loopCount <= maxRedirects) {
    loopCount++;
    console.log(`\n[FETCH-TRACE ${loopCount}] GET ${currentUrl.split('?')[0]}...`);

    res = await fetch(currentUrl, {
      method: 'GET',
      headers: { ...baseHeaders, Cookie: currentCookies },
      redirect: 'manual', // Wajib manual untuk kumpulkan cookie
    });

    console.log(`[FETCH-TRACE ${loopCount}] Status: ${res.status}`);
    const newCookies = extractSetCookies(res.headers);
    currentCookies = updateCookies(currentCookies, newCookies);
    console.log(`[FETCH-TRACE ${loopCount}] Cookies:`, currentCookies || '(kosong)');

    const isRedirect = [301, 302, 303, 307, 308].includes(res.status);
    if (isRedirect) {
      let location = res.headers.get('location');
      if (!location) break;

      // Handle relative URL
      if (!location.startsWith('http')) {
        const urlObj = new URL(currentUrl);
        location = `${urlObj.origin}${location.startsWith('/') ? '' : '/'}${location}`;
      }

      // FIX NATIVE COOKIE JAR BYPASS:
      // Jika dialihkan ke halaman otorisasi Keycloak, paksa login ulang
      // agar tidak otomatis masuk pakai sesi lama yang nyangkut di sistem HP.
      if (location.includes('/protocol/openid-connect/auth') && !location.includes('prompt=login')) {
        location += '&prompt=login';
      }

      currentUrl = location;
      continue;
    }

    // Jika 200 atau status lain, berhenti dan kembalikan respon
    return { res, currentUrl, currentCookies };
  }

  throw new Error(`Terlalu banyak redirect (> ${maxRedirects})`);
}
