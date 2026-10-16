import * as cheerio from 'cheerio';
import * as SecureStore from 'expo-secure-store';
import { HTTP_CONFIG } from './httpConfig';
import { updateCookies, extractSetCookies } from '../../utils/cookieUtils';
import { fetchWithManualRedirects, extractMetaRefresh } from './fetchHelper';

// State internal cookie aktif akademik & SSO di memori
let _activeAcademicCookies: string = '';

export function getActiveAcademicCookies(): string {
  return _activeAcademicCookies;
}

export function setActiveAcademicCookies(cookies: string): void {
  _activeAcademicCookies = cookies;
}

// ==========================================
// TOKEN EXCHANGE LOOP (3x META REFRESH)
// Menukar cookies dan URL parameter dengan PHPSESSID
// ==========================================
export async function executeTokenExchangeLoop(
  initialRedirectUrl: string,
  baseHeaders: Record<string, string>,
  initialCookies: string,
  referer: string = HTTP_CONFIG.SSO_ORIGIN_URL,
  maxExchangeLoops: number = 8
): Promise<{ finalCookies: string; phpSessId: string }> {
  let loopCount = 0;
  let currentCookies = initialCookies;
  let currentUrl = initialRedirectUrl;
  let previousUrl = referer;
  let discoveredPhpSessId: string | null = null;

  console.log('\n[TOKEN EXCHANGE] Memulai loop penukaran token (3x meta-refresh)...');

  while (loopCount < maxExchangeLoops) {
    loopCount++;
    console.log(`[TOKEN EXCHANGE ${loopCount}] Menuju: ${currentUrl.split('index.php')[1] || currentUrl.split('?')[0]}`);

    const res = await fetch(currentUrl, {
      method: 'GET',
      headers: { ...baseHeaders, Cookie: currentCookies, Referer: previousUrl },
      redirect: 'manual',
    });

    const newCookies = extractSetCookies(res.headers);
    currentCookies = updateCookies(currentCookies, newCookies);

    // Tangkap jika server menerbitkan PHPSESSID baru di respons ini
    const newPhpSess = newCookies.find(c => c.trim().startsWith('PHPSESSID='));
    if (newPhpSess) {
      discoveredPhpSessId = newPhpSess.split(';')[0].trim();
    }

    // 1. Cek HTTP Redirect (301, 302, 303, 307, 308)
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      let nextLocation = res.headers.get('location') || '';
      if (!nextLocation.startsWith('http')) {
        nextLocation = new URL(nextLocation, currentUrl).toString();
      }
      previousUrl = currentUrl;
      currentUrl = nextLocation;
      continue;
    }

    // 2. Cek HTTP 200 OK
    if (res.status === 200) {
      const html = await res.text();
      const metaRefresh = extractMetaRefresh(html, currentUrl);

      if (metaRefresh) {
        console.log(`[TOKEN EXCHANGE ${loopCount}] Ditemukan meta-refresh (delay: ${metaRefresh.delay}s) menuju: ${metaRefresh.url.split('?')[0]}`);
        if (metaRefresh.delay > 0) {
          await new Promise(resolve => setTimeout(resolve, metaRefresh.delay * 1000));
        }
        previousUrl = currentUrl;
        currentUrl = metaRefresh.url;
        continue;
      }

      // Jika 200 dan tidak ada lagi meta-refresh, berarti sudah mendarat di Dashboard
      console.log(`[TOKEN EXCHANGE SUCCESS] Berhasil mendarat di Dashboard setelah loop ke-${loopCount}!`);
      break;
    }

    console.warn(`[TOKEN EXCHANGE] Status tidak terduga: ${res.status}`);
    break;
  }

  const finalPhpSessId = currentCookies.split(';').find(c => c.trim().startsWith('PHPSESSID='));
  const resultPhpSessId = finalPhpSessId ? finalPhpSessId.trim() : (discoveredPhpSessId || 'NATIVE_MANAGED');

  console.log('[TOKEN EXCHANGE] ✅ Sesi berhasil diperoleh:', resultPhpSessId);
  setActiveAcademicCookies(currentCookies);
  return { finalCookies: currentCookies, phpSessId: resultPhpSessId };
}

// ==========================================
// SILENT LOGIN PIPELINE (REGENERASI SESI)
// Diaktifkan ketika token/sesi kedaluwarsa
// ==========================================
export async function performSilentLogin(
  expiredHtml?: string,
  expiredUrl?: string
): Promise<string> {
  const baseHeaders: Record<string, string> = { ...HTTP_CONFIG.DEFAULT_HEADERS };

  console.log('\n========================================');
  console.log('[SILENT LOGIN] Memulai siklus pemulihan sesi...');
  console.log('========================================\n');

  const username =
    (await SecureStore.getItemAsync('akademik_nim')) || (await SecureStore.getItemAsync('nim'));
  const password =
    (await SecureStore.getItemAsync('akademik_password')) || (await SecureStore.getItemAsync('password'));
  const savedPhpSessId =
    (await SecureStore.getItemAsync('akademik_phpSessId')) || (await SecureStore.getItemAsync('phpSessId'));

  let currentCookies = getActiveAcademicCookies() || (savedPhpSessId && savedPhpSessId !== 'NATIVE_MANAGED' ? savedPhpSessId : '');
  // Bersihkan PHPSESSID yang sudah mati agar server PHP menerbitkan sesi baru
  currentCookies = currentCookies
    .split(';')
    .map(c => c.trim())
    .filter(c => c && !c.startsWith('PHPSESSID='))
    .join('; ');

  // ─────────────────────────────────────────────────────────────
  // LANGKAH 1: Mulai dari Halaman Notifikasi atau Root Akademik
  // ─────────────────────────────────────────────────────────────
  let nextUrl = HTTP_CONFIG.AKADEMIK_ORIGIN_URL;
  const fullExpiredUrl = expiredUrl?.startsWith('http')
    ? expiredUrl
    : `${HTTP_CONFIG.AKADEMIK_ORIGIN_URL}${expiredUrl || ''}`;

  if (expiredHtml) {
    const initialMeta = extractMetaRefresh(expiredHtml, fullExpiredUrl);
    if (initialMeta) {
      console.log(`[SILENT LOGIN] Mengikuti meta-refresh awal dari halaman pemberitahuan (delay: ${initialMeta.delay}s)...`);
      if (initialMeta.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, initialMeta.delay * 1000));
      }
      nextUrl = initialMeta.url;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // LANGKAH 2: Ikuti Redirect & Meta-Refresh Menuju Domain SSO
  // Catatan user: "tunggu sampai kita dibawa ke domain sso.uinjkt.ac.id"
  // ─────────────────────────────────────────────────────────────
  console.log('[SILENT LOGIN] Menelusuri estafet menuju domain sso.uinjkt.ac.id...');
  let currentUrl = nextUrl;
  let loopStep = 0;
  const maxPreSsoSteps = 8;
  let ssoLandingUrl: string | null = null;
  let lastHtml = '';
  let lastReferer = fullExpiredUrl;

  while (loopStep < maxPreSsoSteps) {
    loopStep++;
    console.log(`[SILENT-SSO TRACE ${loopStep}] Navigasi: ${currentUrl.split('?')[0]}`);

    if (new URL(currentUrl).hostname.includes('sso.uinjkt.ac.id')) {
      ssoLandingUrl = currentUrl;
      break;
    }

    const res = await fetch(currentUrl, {
      method: 'GET',
      headers: { ...baseHeaders, Cookie: currentCookies, Referer: lastReferer },
      redirect: 'manual',
    });

    currentCookies = updateCookies(currentCookies, extractSetCookies(res.headers));

    if ([301, 302, 303, 307, 308].includes(res.status)) {
      let location = res.headers.get('location') || '';
      if (!location.startsWith('http')) {
        location = new URL(location, currentUrl).toString();
      }
      // Jika diarahkan ke portal induk e-semesta, arahkan kembali ke akademik origin
      if (location.includes('e-semesta.uinjkt.ac.id')) {
        location = HTTP_CONFIG.AKADEMIK_ORIGIN_URL;
      }
      lastReferer = currentUrl;
      currentUrl = location;
      if (new URL(currentUrl).hostname.includes('sso.uinjkt.ac.id')) {
        ssoLandingUrl = currentUrl;
        break;
      }
      continue;
    }

    if (res.status === 200) {
      lastHtml = await res.text();
      const meta = extractMetaRefresh(lastHtml, currentUrl);
      if (meta) {
        console.log(`[SILENT-SSO TRACE ${loopStep}] Menemukan meta-refresh (delay: ${meta.delay}s) ke: ${meta.url.split('?')[0]}`);
        if (meta.delay > 0) {
          await new Promise(resolve => setTimeout(resolve, meta.delay * 1000));
        }
        let nextTarget = meta.url;
        if (nextTarget.includes('e-semesta.uinjkt.ac.id')) {
          nextTarget = HTTP_CONFIG.AKADEMIK_ORIGIN_URL;
        }
        lastReferer = currentUrl;
        currentUrl = nextTarget;
        if (new URL(currentUrl).hostname.includes('sso.uinjkt.ac.id')) {
          ssoLandingUrl = currentUrl;
          break;
        }
        continue;
      }

      const $page = cheerio.load(lastHtml);
      if ($page('#kc-form-login').length > 0) {
        ssoLandingUrl = currentUrl;
        break;
      }
    }

    break;
  }

  if (!ssoLandingUrl) {
    console.warn('[SILENT LOGIN] Menggunakan URL navigasi terakhir sebagai target SSO:', currentUrl);
    ssoLandingUrl = currentUrl;
  }

  // ─────────────────────────────────────────────────────────────
  // LANGKAH 3: Proses di Domain sso.uinjkt.ac.id
  // Membawa parameter URL sesi baru & cookies baru
  // ─────────────────────────────────────────────────────────────
  console.log('[SILENT LOGIN] Mendarat di SSO:', ssoLandingUrl.split('?')[0]);

  let academicCallbackUrl: string | null = null;

  const ssoRes = await fetch(ssoLandingUrl, {
    method: 'GET',
    headers: { ...baseHeaders, Cookie: currentCookies, Referer: lastReferer },
    redirect: 'manual',
  });

  currentCookies = updateCookies(currentCookies, extractSetCookies(ssoRes.headers));

  // Skenario A: SSO langsung me-redirect kembali ke Akademik (sesi SSO masih aktif)
  if ([301, 302, 303, 307, 308].includes(ssoRes.status)) {
    academicCallbackUrl = ssoRes.headers.get('location');
    if (academicCallbackUrl && !academicCallbackUrl.startsWith('http')) {
      academicCallbackUrl = new URL(academicCallbackUrl, ssoLandingUrl).toString();
    }
    console.log('[SILENT LOGIN] SSO mengenali sesi aktif! Redirect kembali ke Akademik:', academicCallbackUrl?.split('?')[0]);
  } else if (ssoRes.status === 200) {
    // Skenario B: SSO menampilkan form #kc-form-login
    const ssoHtml = await ssoRes.text();
    const $sso = cheerio.load(ssoHtml);
    const formAction = $sso('#kc-form-login').attr('action');

    if (formAction) {
      if (!username || !password) {
        throw new Error('Kredensial tersimpan tidak ditemukan untuk otentikasi SSO.');
      }
      console.log('[SILENT LOGIN] Form login SSO terdeteksi. Melakukan auto-submit kredensial...');
      const payload = new URLSearchParams({ username, password, credentialId: '' });

      const postRes = await fetch(formAction, {
        method: 'POST',
        headers: {
          ...baseHeaders,
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: currentCookies,
          Origin: HTTP_CONFIG.SSO_ORIGIN_URL,
          Referer: ssoLandingUrl,
        },
        body: payload.toString(),
        redirect: 'manual',
      });

      currentCookies = updateCookies(currentCookies, extractSetCookies(postRes.headers));
      if (postRes.status === 302 || postRes.status === 301) {
        academicCallbackUrl = postRes.headers.get('location');
        if (academicCallbackUrl && !academicCallbackUrl.startsWith('http')) {
          academicCallbackUrl = new URL(academicCallbackUrl, formAction).toString();
        }
      } else {
        throw new Error('Gagal submit kredensial ke SSO saat silent login.');
      }
    } else {
      const meta = extractMetaRefresh(ssoHtml, ssoLandingUrl);
      if (meta) {
        academicCallbackUrl = meta.url;
      }
    }
  }

  if (!academicCallbackUrl) {
    throw new Error('Gagal mendapatkan redirect callback dari SSO menuju Akademik.');
  }

  console.log('[SILENT LOGIN] Menerima URL callback Akademik dengan session param baru.');

  // ─────────────────────────────────────────────────────────────
  // LANGKAH 4: Penukaran Token di Server Akademik (3x Meta-Refresh)
  // Menukar cookies & param url hingga mendapatkan phpSessId
  // ─────────────────────────────────────────────────────────────
  const exchangeResult = await executeTokenExchangeLoop(
    academicCallbackUrl,
    baseHeaders,
    currentCookies,
    ssoLandingUrl
  );

  return exchangeResult.phpSessId;
}

// ==========================================
// AUTHENTICATION PIPELINE (LOGIN DARI FORM)
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

  let traceResult = await fetchWithManualRedirects(HTTP_CONFIG.AKADEMIK_ORIGIN_URL, baseHeaders, '', 5, { forcePromptLogin: true });
  let currentCookies = traceResult.currentCookies;
  let finalUrl = traceResult.currentUrl;

  let metaHtml = await traceResult.res.text();
  let $meta = cheerio.load(metaHtml);
  let formAction = $meta('#kc-form-login').attr('action');

  // Fallback A: Jika portal menampilkan halaman notifikasi / transisi sesi
  if (!formAction && metaHtml.includes('Anda tidak diijinkan')) {
    const metaRefresh = extractMetaRefresh(metaHtml, finalUrl);
    if (metaRefresh) {
      if (metaRefresh.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, metaRefresh.delay * 1000));
      }
      traceResult = await fetchWithManualRedirects(metaRefresh.url, baseHeaders, currentCookies, 5, { forcePromptLogin: true });
    } else {
      await new Promise(resolve => setTimeout(resolve, 3000));
      traceResult = await fetchWithManualRedirects(HTTP_CONFIG.AKADEMIK_ORIGIN_URL, baseHeaders, '', 5, { forcePromptLogin: true });
    }
    currentCookies = traceResult.currentCookies;
    finalUrl = traceResult.currentUrl;
    metaHtml = await traceResult.res.text();
    $meta = cheerio.load(metaHtml);
    formAction = $meta('#kc-form-login').attr('action');
  }

  // Fallback B: Portal menggunakan meta-refresh ke SSO
  if (!formAction) {
    const metaRefresh = extractMetaRefresh(metaHtml, finalUrl);
    if (metaRefresh) {
      console.log('[TAHAP 1] Ditemukan meta-refresh, mengikuti ke:', metaRefresh.url);
      const ssoTrace = await fetchWithManualRedirects(metaRefresh.url, baseHeaders, currentCookies, 5, { forcePromptLogin: true });
      currentCookies = ssoTrace.currentCookies;
      finalUrl = ssoTrace.currentUrl;
      const ssoHtml = await ssoTrace.res.text();
      const $sso = cheerio.load(ssoHtml);
      formAction = $sso('#kc-form-login').attr('action');
    }
  }

  if (!formAction) {
    console.error('[TAHAP 1] GAGAL: #kc-form-login tidak ditemukan!');
    console.log('[TAHAP 1] Final URL:', finalUrl);
    throw new Error('Form login SSO tidak ditemukan.');
  }

  console.log('[TAHAP 1] Sukses menemukan formAction:', formAction.split('?')[0]);

  // ─────────────────────────────────────────
  // TAHAP 2: Submit Kredensial (POST SSO)
  // ─────────────────────────────────────────
  console.log('\n[TAHAP 2] POST Kredensial ke SSO...');
  const payload = new URLSearchParams({ username, password, credentialId: '' });

  const postHeaders: Record<string, string> = {
    ...baseHeaders,
    'Content-Type': 'application/x-www-form-urlencoded',
    Origin: HTTP_CONFIG.SSO_ORIGIN_URL,
    Referer: formAction,
  };
  if (currentCookies && currentCookies !== 'NATIVE_MANAGED') {
    postHeaders['Cookie'] = currentCookies;
  }

  const loginRes = await fetch(formAction, {
    method: 'POST',
    headers: postHeaders,
    body: payload.toString(),
    redirect: 'manual',
  });

  console.log(`[TAHAP 2] Status: ${loginRes.status}, URL: ${loginRes.url || 'N/A'}`);
  let loginLocation = loginRes.headers.get('location');

  if ((loginRes.status === 302 || loginRes.status === 301) && loginLocation) {
    if (!loginLocation.startsWith('http')) {
      loginLocation = new URL(loginLocation, formAction).toString();
    }
  } else if (loginRes.status === 200) {
    // Skenario: React Native OkHttpClient auto-follow 302 ke URL tujuan
    const loginHtml = await loginRes.text();
    const $loginRes = cheerio.load(loginHtml);
    const hasLoginForm = $loginRes('#kc-form-login').length > 0;
    const hasErrorAlert = $loginRes('.alert-error, #input-error, .kc-feedback-text').length > 0;

    if (
      hasLoginForm &&
      (hasErrorAlert ||
        loginHtml.includes('Invalid username or password') ||
        loginHtml.includes('Username atau password salah'))
    ) {
      console.error('[TAHAP 2] Server membalas form login dengan pesan kesalahan kredensial.');
      throw new Error('Login Gagal. Username/Password salah.');
    }

    const metaRefresh = extractMetaRefresh(loginHtml, loginRes.url || formAction);
    if (metaRefresh) {
      loginLocation = metaRefresh.url;
    } else if (loginRes.url && loginRes.url.includes('akademik.uinjkt.ac.id')) {
      console.log('[TAHAP 2] Auto-follow mendarat di portal akademik:', loginRes.url);
      loginLocation = loginRes.url;
    } else {
      loginLocation = loginRes.url || HTTP_CONFIG.AKADEMIK_ORIGIN_URL;
    }
  } else {
    throw new Error('Login Gagal. Username/Password salah.');
  }

  currentCookies = updateCookies(currentCookies, extractSetCookies(loginRes.headers));
  console.log('[TAHAP 2] Sukses submit kredensial. Menuju penukaran token...');

  // ─────────────────────────────────────────
  // TAHAP 3: THE TOKEN EXCHANGE LOOP (3x META REFRESH)
  // ─────────────────────────────────────────
  const exchangeResult = await executeTokenExchangeLoop(
    loginLocation,
    baseHeaders,
    currentCookies,
    formAction
  );

  return exchangeResult.phpSessId;
}
