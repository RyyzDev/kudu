import * as cheerio from 'cheerio';
import { HTTP_CONFIG } from './httpConfig';
import { updateCookies, extractSetCookies } from '../../utils/cookieUtils';

// Helper: log semua headers dari response fetch
function logHeaders(label: string, headers: Headers) {
  const entries: Record<string, string> = {};
  headers.forEach((val, key) => { entries[key] = val; });
  console.log(`[HEADERS] ${label}:`, JSON.stringify(entries, null, 2));
}

// Helper: HTTP GET dengan auto-redirect manual & cookie collector
// Mereplika persis perilaku Axios Node.js (follow-redirects) + cookie jar
async function fetchWithManualRedirects(
  initialUrl: string,
  baseHeaders: Record<string, string>,
  initialCookies: string = '',
  maxRedirects: number = 5
) {
  let currentUrl = initialUrl;
  let currentCookies = initialCookies;
  let loopCount = 0;
  let res: Response;

  while (loopCount <= maxRedirects) {
    loopCount++;
    console.log(`\n[FETCH-TRACE ${loopCount}] GET ${currentUrl.split('?')[0]}...`);
    
    res = await fetch(currentUrl, {
      method: 'GET',
      headers: { ...baseHeaders, 'Cookie': currentCookies },
      redirect: 'manual' // Wajib manual untuk kumpulkan cookie
    });

    console.log(`[FETCH-TRACE ${loopCount}] Status: ${res.status}`);
    const newCookies = extractSetCookies(res.headers);
    currentCookies = updateCookies(currentCookies, newCookies);
    console.log(`[FETCH-TRACE ${loopCount}] Cookies:`, currentCookies || '(kosong)');

    if (res.status === 301 || res.status === 302 || res.status === 303 || res.status === 307 || res.status === 308) {
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

// ==========================================
// AUTHENTICATION PIPELINE (LOGIN & KARANTINA)
// ==========================================
export async function authenticateAcademicSystem(username: string, password: string): Promise<string> {
  const baseHeaders: Record<string, string> = { ...HTTP_CONFIG.DEFAULT_HEADERS };

  console.log('\n========================================');
  console.log('[AUTH PIPELINE] Memulai otentikasi untuk:', username);
  console.log('========================================\n');

  // ─────────────────────────────────────────
  // TAHAP 1: Get Metadata Login (Manual Redirect Follower)
  // ─────────────────────────────────────────
  console.log('[TAHAP 1] Mencari form SSO...');
  
  // Lakukan request ke Akademik, ikuti semua redirect sampai dapat 200 OK (SSO form)
  const traceResult = await fetchWithManualRedirects(HTTP_CONFIG.AKADEMIK_ORIGIN_URL, baseHeaders, '');
  let currentCookies = traceResult.currentCookies;
  let finalUrl = traceResult.currentUrl;
  let metaRes = traceResult.res;

  const metaHtml = await metaRes.text();
  const $meta = cheerio.load(metaHtml);
  let formAction = $meta('#kc-form-login').attr('action');

  // Fallback jika portal menggunakan meta-refresh ke SSO (jarang, tapi mungkin)
  if (!formAction) {
    const metaRefresh = $meta('meta[http-equiv="refresh"], meta[http-equiv="Refresh"]').attr('content');
    if (metaRefresh) {
      const match = metaRefresh.match(/url\s*=\s*['"]?([^'">\s]+)/i);
      if (match && match[1]) {
        console.log('[TAHAP 1] Ditemukan meta-refresh, mengikuti ke:', match[1]);
        const ssoTrace = await fetchWithManualRedirects(match[1], baseHeaders, currentCookies);
        currentCookies = ssoTrace.currentCookies;
        finalUrl = ssoTrace.currentUrl;
        const ssoHtml = await ssoTrace.res.text();
        const $sso = cheerio.load(ssoHtml);
        formAction = $sso('#kc-form-login').attr('action');
      }
    }
  }

  if (!formAction) {
    console.error('[TAHAP 1] GAGAL: #kc-form-login tidak ditemukan!');
    console.log('[TAHAP 1] Final URL:', finalUrl);
    console.log('[TAHAP 1] HTML snippet:', metaHtml.slice(0, 500));
    throw new Error('Form login SSO tidak ditemukan.');
  }

  console.log('[TAHAP 1] Sukses menemukan formAction:', formAction.split('?')[0]);

  // ─────────────────────────────────────────
  // TAHAP 2: Submit Kredensial (POST SSO)
  // ─────────────────────────────────────────
  console.log('\n[TAHAP 2] POST Kredensial ke SSO...');
  const payload = new URLSearchParams({ username, password, credentialId: '' });
  
  const loginRes = await fetch(formAction, {
    method: 'POST',
    headers: {
      ...baseHeaders,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': currentCookies,
      'Origin': HTTP_CONFIG.SSO_ORIGIN_URL,
      'Referer': formAction,
    },
    body: payload.toString(),
    redirect: 'manual', // Matikan auto-redirect
  });

  console.log(`[TAHAP 2] Status: ${loginRes.status}`);
  const loginLocation = loginRes.headers.get('location');

  if (loginRes.status !== 302 || !loginLocation) {
    if (loginRes.status === 200) {
      console.error('[TAHAP 2] Server membalas 200 (Bukan redirect). Kemungkinan password salah.');
    }
    throw new Error('Login Gagal. Username/Password salah.');
  }

  currentCookies = updateCookies(currentCookies, extractSetCookies(loginRes.headers));
  let redirectUrl = loginLocation;
  console.log('[TAHAP 2] Sukses submit kredensial. Menuju karantina...');

  // ─────────────────────────────────────────
  // TAHAP 3: THE QUARANTINE LOOP
  // ─────────────────────────────────────────
  console.log('\n[TAHAP 3] Memulai Quarantine Loop...');
  let loopCount = 0;
  const maxLoops = 5;

  while (loopCount < maxLoops) {
    loopCount++;
    console.log(`[QUARANTINE ${loopCount}] Menuju: ${redirectUrl.split('index.php')[1] || 'Dashboard'}`);

    const res = await fetch(redirectUrl, {
      method: 'GET',
      headers: { ...baseHeaders, 'Cookie': currentCookies, 'Referer': formAction },
      redirect: 'manual',
    });

    currentCookies = updateCookies(currentCookies, extractSetCookies(res.headers));

    if (res.status === 302 || res.status === 301) {
      let nextLocation = res.headers.get('location') || '';
      if (!nextLocation.startsWith('http')) {
        const urlObj = new URL(redirectUrl);
        nextLocation = `${urlObj.origin}${nextLocation.startsWith('/') ? '' : '/'}${nextLocation}`;
      }
      redirectUrl = nextLocation;
      continue;
    }

    if (res.status === 200) {
      console.log('[QUARANTINE SUCCESS] Berhasil mendarat di Dashboard!');
      break;
    }

    console.warn(`[QUARANTINE] Status tidak terduga: ${res.status}`);
    break;
  }

  // ─────────────────────────────────────────
  // HASIL AKHIR
  // ─────────────────────────────────────────
  const finalPhpSessId = currentCookies.split(';').find(c => c.trim().startsWith('PHPSESSID='));
  
  // Jika PHPSESSID tidak ada di JS manual tracker, berarti ia disembunyikan dan 
  // dikelola dengan sempurna oleh Native Cookie Jar (OS HP).
  const result = finalPhpSessId ? finalPhpSessId.trim() : 'NATIVE_MANAGED';
  
  console.log('[AUTH PIPELINE] ✅ Login berhasil, sesi dikelola:', result);
  return result;
}
