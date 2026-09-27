import * as cheerio from 'cheerio';
import { updateCookies, extractSetCookies } from '../../utils/cookieUtils';

export const ELETTER_URL = 'http://e-letter.fst.uinjkt.ac.id';

export const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Mobile Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
};

// ─────────────────────────────────────────────────────────────────────────────
// STATE INTERNAL: cookies aktif E-Letter (laravel_session + XSRF-TOKEN)
// Dikelola manual di JS agar konsisten antara fetch() dan axios,
// karena native cookie jar tidak di-share antar keduanya di React Native.
// ─────────────────────────────────────────────────────────────────────────────
let _eletterCookies: string = '';

export function getEletterCookies(): string {
  return _eletterCookies;
}

// ─────────────────────────────────────────────────────────────────────────────
// CEK SESI: validasi apakah laravel_session yang tersimpan masih berlaku
// ─────────────────────────────────────────────────────────────────────────────
export async function checkELetterSession(): Promise<boolean> {
  if (!_eletterCookies) return false; // Belum pernah login di sesi ini

  try {
    const res = await fetch(ELETTER_URL + '/home', {
      headers: { ...DEFAULT_HEADERS, Cookie: _eletterCookies },
      redirect: 'manual', // 302 → sesi mati; 200 → sesi aktif
    });

    if (res.status === 200) {
      const html = await res.text();
      return html.includes('logout') || html.includes('Logout');
    }

    return false; // 302 = redirect ke /login = sesi mati
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN PIPELINE
// STEP 1: GET / → kumpulkan XSRF-TOKEN + laravel_session awal
// STEP 2: POST /login (manual redirect) → kumpulkan laravel_session baru
// ─────────────────────────────────────────────────────────────────────────────
export async function loginELetter(username: string, password: string): Promise<boolean> {
  console.log('\n[ELETTER-AUTH] Memulai login untuk:', username);

  // ── STEP 1: GET login page ──
  const getRes = await fetch(ELETTER_URL + '/', {
    headers: { ...DEFAULT_HEADERS, Cookie: _eletterCookies },
    redirect: 'follow', // Ikuti redirect ke halaman login jika ada
  });

  if (!getRes.ok) {
    throw new Error(`Gagal membuka E-Letter (Status: ${getRes.status})`);
  }

  // Kumpulkan cookies awal (XSRF-TOKEN + laravel_session)
  const step1Cookies = extractSetCookies(getRes.headers);
  _eletterCookies = updateCookies(_eletterCookies, step1Cookies);
  console.log('[ELETTER-AUTH] Step 1 cookies:', _eletterCookies.split(';').map(c => c.trim().split('=')[0]).join(', '));

  const html = await getRes.text();
  const $ = cheerio.load(html);

  let token = $('meta[name="csrf-token"]').attr('content') as string;
  if (!token) token = $('input[name="_token"]').val() as string;
  if (!token) throw new Error('Gagal mendapatkan Security Token (CSRF) dari E-Letter.');

  // Laravel: XSRF-TOKEN cookie harus di-decode lalu kirim sebagai X-XSRF-TOKEN header
  const xsrfMatch = _eletterCookies.match(/XSRF-TOKEN=([^;]+)/);
  const xsrfHeaderValue = xsrfMatch ? decodeURIComponent(xsrfMatch[1]) : '';

  // ── STEP 2: POST credentials ──
  // Gunakan redirect: 'manual' agar bisa menangkap Set-Cookie dari response 302
  // (ketika redirect: 'follow', cookies dari 302 bisa hilang di React Native)
  const payload = new URLSearchParams({ _token: token, username, password });

  const postRes = await fetch(ELETTER_URL + '/login', {
    method: 'POST',
    headers: {
      ...DEFAULT_HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: _eletterCookies,
      Referer: ELETTER_URL + '/',
      ...(xsrfHeaderValue ? { 'X-XSRF-TOKEN': xsrfHeaderValue } : {}),
    },
    body: payload.toString(),
    redirect: 'manual',
  });

  // Kumpulkan cookies baru (laravel_session yang fresh dari server)
  const step2Cookies = extractSetCookies(postRes.headers);
  _eletterCookies = updateCookies(_eletterCookies, step2Cookies);
  console.log('[ELETTER-AUTH] Step 2 cookies:', _eletterCookies.split(';').map(c => c.trim().split('=')[0]).join(', '));

  // Laravel kirim 302 ke /home = login berhasil
  if (postRes.status === 302 || postRes.status === 301) {
    console.log('[ELETTER-AUTH] ✅ Login berhasil.');
    return true;
  }

  if (postRes.status === 200) {
    const errHtml = await postRes.text();
    if (errHtml.includes('Silahkan login menggunakan Username dan Password') || errHtml.includes('These credentials do not match our records.')) {
      throw new Error('Username atau Password salah!');
    }
    throw new Error('Login gagal: server tidak mengirim redirect setelah login.');
  }

  throw new Error(`Terjadi kesalahan saat login E-Letter (Status: ${postRes.status}).`);
}
