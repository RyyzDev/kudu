import * as cheerio from 'cheerio';
import { HTTP_CONFIG } from './httpConfig';
import { updateCookies, extractSetCookies } from '../../utils/cookieUtils';
import { fetchWithManualRedirects } from './fetchHelper';

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

  let traceResult = await fetchWithManualRedirects(HTTP_CONFIG.AKADEMIK_ORIGIN_URL, baseHeaders, '');
  let currentCookies = traceResult.currentCookies;
  let finalUrl = traceResult.currentUrl;

  let metaHtml = await traceResult.res.text();
  let $meta = cheerio.load(metaHtml);
  let formAction = $meta('#kc-form-login').attr('action');

  // Fallback A: "Access Denied Transition Window"
  // Portal menampilkan halaman "Anda tidak diijinkan" (200 OK) selama ~3 detik
  // saat sesi baru saja expired, sebelum server akhirnya redirect ke SSO.
  // Solusi: tunggu 4 detik lalu fetch ulang dari awal agar server sudah redirect ke SSO.
  if (!formAction && metaHtml.includes('Anda tidak diijinkan')) {
    console.log('[TAHAP 1] \u26a0\ufe0f Portal masih dalam masa transisi sesi (access denied window).');
    console.log('[TAHAP 1] Menunggu 4 detik sebelum mencoba ulang...');
    await new Promise(resolve => setTimeout(resolve, 4000));

    traceResult = await fetchWithManualRedirects(HTTP_CONFIG.AKADEMIK_ORIGIN_URL, baseHeaders, '');
    currentCookies = traceResult.currentCookies;
    finalUrl = traceResult.currentUrl;
    metaHtml = await traceResult.res.text();
    $meta = cheerio.load(metaHtml);
    formAction = $meta('#kc-form-login').attr('action');
    console.log('[TAHAP 1] Selesai menunggu. Mencoba ulang pencarian form SSO...');
  }

  // Fallback B: portal menggunakan meta-refresh ke SSO (jarang, tapi mungkin)
  if (!formAction) {
    const metaRefresh = $meta('meta[http-equiv="refresh"], meta[http-equiv="Refresh"]').attr('content');
    if (metaRefresh) {
      const match = metaRefresh.match(/url\s*=\s*['"]?([^'">\/\s]+)/i);
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
      Cookie: currentCookies,
      Origin: HTTP_CONFIG.SSO_ORIGIN_URL,
      Referer: formAction,
    },
    body: payload.toString(),
    redirect: 'manual',
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
      headers: { ...baseHeaders, Cookie: currentCookies, Referer: formAction },
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

  console.log('[AUTH PIPELINE] \u2705 Login berhasil, sesi dikelola:', result);
  return result;
}
