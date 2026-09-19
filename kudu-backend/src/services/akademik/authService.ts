import axios from 'axios';
import * as cheerio from 'cheerio';
import HTTP_CONFIG from '../../config/httpConfig.js';
import updateCookies from '../../utils/cookieUtils.js';

// ==========================================
// AUTHENTICATION PIPELINE (LOGIN & KARANTINA)
// ==========================================

async function authenticateAcademicSystem(username: string, password: string, clientUserAgent?: string | string[]) {
  const userAgent = (clientUserAgent as string) || HTTP_CONFIG.DEFAULT_HEADERS['User-Agent'];
  const baseHeaders = { ...HTTP_CONFIG.DEFAULT_HEADERS, 'User-Agent': userAgent };

  console.log('\n[AUTH PIPELINE] Memulai otentikasi untuk:', username);

  // TAHAP 1: Get Metadata Login
  const metaRes = await axios.get(process.env.AKADEMIK_ORIGIN_URL as string, { headers: baseHeaders });
  let currentCookies = updateCookies('', metaRes.headers['set-cookie'] as string[]);
  const $meta = cheerio.load(metaRes.data);
  const formAction = $meta('#kc-form-login').attr('action');
  
  if (!formAction) throw new Error('Form login SSO tidak ditemukan.');

  // TAHAP 2: Submit Kredensial (POST SSO)
  const payload = new URLSearchParams({ username, password, credentialId: '' });
  const loginRes = await axios.post(formAction, payload.toString(), {
    headers: {
      ...baseHeaders,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': currentCookies,
      'Origin': process.env.SSO_ORIGIN_URL,
      'Referer': formAction,
    },
    maxRedirects: 0, // Matikan auto-redirect
    validateStatus: (status) => status >= 200 && status < 400,
  });

  if (loginRes.status !== 302 || !loginRes.headers.location) {
    throw new Error('Login Gagal. Username/Password salah.');
  }

  // Update cookie dengan KEYCLOAK_SESSION dkk
  currentCookies = updateCookies(currentCookies, loginRes.headers['set-cookie'] as string[]);
  let redirectUrl = loginRes.headers.location;

  // TAHAP 3: THE QUARANTINE LOOP (MANUAL REDIRECT TRACING)
  // Menyelesaikan 3 tahap redirect: Callback -> Karantina -> Dashboard
  let loopCount = 0;
  const maxLoops = 5;

  while (loopCount < maxLoops) {
    loopCount++;
    console.log(`[QUARANTINE TRACE ${loopCount}] Menuju: ${redirectUrl.split('index.php')[1] || 'Dashboard'}`);

    const res = await axios.get(redirectUrl, {
      headers: { ...baseHeaders, 'Cookie': currentCookies, 'Referer': formAction },
      maxRedirects: 0, // Wajib 0 agar kita bisa tangkap cookie-nya!
      validateStatus: (status) => status >= 200 && status < 400,
    });

    // Tangkap Cookie PHPSESSID/Sesi baru dari server PHP
    currentCookies = updateCookies(currentCookies, res.headers['set-cookie'] as string[]);

    if (res.status === 302 || res.status === 301) {
      let nextLocation = res.headers.location;
      if (!nextLocation.startsWith('http')) {
        nextLocation = `${process.env.AKADEMIK_ORIGIN_URL}${nextLocation.startsWith('/') ? '' : '/'}${nextLocation}`;
      }
      redirectUrl = nextLocation;
      continue; // Lanjut redirect berikutnya
    }

    if (res.status === 200) {
      console.log('[QUARANTINE SUCCESS] Berhasil mendarat di Dashboard!');
      break;
    }
  }

  // Ekstrak hasil akhir PHPSESSID
  const finalPhpSessId = currentCookies.split(';').find(c => c.trim().startsWith('PHPSESSID='));
  if (!finalPhpSessId) throw new Error('PHPSESSID gagal didapatkan setelah karantina.');

  return finalPhpSessId.trim();
}

export default authenticateAcademicSystem;
