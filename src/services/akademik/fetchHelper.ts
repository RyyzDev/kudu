import * as cheerio from 'cheerio';
import { updateCookies, extractSetCookies } from '../../utils/cookieUtils';

// ==========================================
// HELPER: Ekstraksi tag <meta http-equiv="refresh">
// ==========================================
export function extractMetaRefresh(html: string, currentUrl: string): { url: string; delay: number } | null {
  if (!html || typeof html !== 'string') return null;
  const $ = cheerio.load(html);
  const metaContent = $('meta[http-equiv="refresh" i]').attr('content');
  if (!metaContent) return null;

  const match = metaContent.match(/^\s*(\d+)?\s*(?:;\s*url\s*=\s*(?:['"]?)(.*?)(?:['"]?))?\s*$/i);
  if (!match) return null;

  const delay = match[1] ? parseInt(match[1], 10) : 0;
  let targetUrl = match[2]?.trim();

  if (!targetUrl) {
    return { url: currentUrl, delay };
  }

  targetUrl = targetUrl.replace(/^['"]|['"]$/g, '');

  try {
    const resolvedUrl = new URL(targetUrl, currentUrl).toString();
    return { url: resolvedUrl, delay };
  } catch {
    return null;
  }
}

// ==========================================
// HELPER: HTTP GET dengan auto-redirect manual & cookie collector
// Mereplika perilaku Axios Node.js (follow-redirects) + cookie jar
// ==========================================
export async function fetchWithManualRedirects(
  initialUrl: string,
  baseHeaders: Record<string, string>,
  initialCookies: string = '',
  maxRedirects: number = 5,
  options: { forcePromptLogin?: boolean } = {}
): Promise<{ res: Response; currentUrl: string; currentCookies: string }> {
  let currentUrl = initialUrl;
  let currentCookies = initialCookies;
  let loopCount = 0;
  let res!: Response;

  while (loopCount <= maxRedirects) {
    loopCount++;
    console.log(`\n[FETCH-TRACE ${loopCount}] GET ${currentUrl.split('?')[0]}...`);

    const reqHeaders: Record<string, string> = { ...baseHeaders };
    if (currentCookies && currentCookies !== 'NATIVE_MANAGED') {
      reqHeaders['Cookie'] = currentCookies;
    } else {
      delete reqHeaders['Cookie'];
    }

    res = await fetch(currentUrl, {
      method: 'GET',
      headers: reqHeaders,
      redirect: 'manual', // Usahakan manual untuk kumpulkan cookie
    });

    console.log(`[FETCH-TRACE ${loopCount}] Status: ${res.status}`);
    const newCookies = extractSetCookies(res.headers);
    currentCookies = updateCookies(currentCookies, newCookies);
    console.log(`[FETCH-TRACE ${loopCount}] Cookies:`, currentCookies || '(managed by OS)');

    const isRedirect = [301, 302, 303, 307, 308].includes(res.status);
    if (isRedirect) {
      let location = res.headers.get('location');
      if (!location) break;

      // Handle relative URL
      if (!location.startsWith('http')) {
        const urlObj = new URL(currentUrl);
        location = `${urlObj.origin}${location.startsWith('/') ? '' : '/'}${location}`;
      }

      if (options.forcePromptLogin && location.includes('/protocol/openid-connect/auth') && !location.includes('prompt=login')) {
        location += '&prompt=login';
      }

      currentUrl = location;
      continue;
    }

    // Jika 200 atau status lain, berhenti dan kembalikan respon
    // Gunakan res.url jika native OkHttpClient melakukan auto-follow redirect
    const finalUrl = res.url || currentUrl;
    return { res, currentUrl: finalUrl, currentCookies };
  }

  throw new Error(`Terlalu banyak redirect (> ${maxRedirects})`);
}
