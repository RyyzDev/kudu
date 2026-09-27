import { academicApi } from './academicApi';
import { HTTP_CONFIG } from './httpConfig';
import { extractKrsUrl, parseKrsHtml } from './krsParser';

// Re-exportir tipe data untuk backward-compatibility dengan importers
export type { StudentProfile, KrsItem, KrsResult } from './krsParser';

const DASHBOARD_URL = `${HTTP_CONFIG.AKADEMIK_ORIGIN_URL}/index.php?pModule=ydKhmA==&pSub=ydKhmA==&pAct=18yZqg==`;

// ==========================================
// ACADEMIC SCRAPING (KRS MODULE)
// ==========================================

export async function getDataKRS() {
  // LANGKAH 1: Buka Dashboard untuk ekstrak URL KRS Dinamis
  console.log('\n[KRS PIPELINE] Mengakses Dashboard...');
  // GUNAKAN academicApi BUKAN axios AGAR INTERCEPTOR (SILENT LOGIN) BERJALAN!
  const dashRes = await academicApi.get(DASHBOARD_URL);

  if (typeof dashRes.data === 'string' && dashRes.data.includes('kc-form-login')) {
    // Interceptor seharusnya menangani ini duluan. Jika sampai sini, berarti gagal total.
    throw new Error('SESSION_EXPIRED_AFTER_RETRY');
  }

  const krsUrl = extractKrsUrl(dashRes.data);
  console.log('[KRS PIPELINE] URL Dinamis Ditemukan:', krsUrl);

  // LANGKAH 2: Tembak URL KRS dengan Referer Valid
  const krsRes = await academicApi.get(krsUrl, {
    headers: { Referer: DASHBOARD_URL },
    maxRedirects: 5, // Di sini aman pakai auto-redirect karena sesi sudah wangi
  });

  if (typeof krsRes.data === 'string' && (krsRes.data.includes('Anda tidak diijinkan') || krsRes.data.includes('kc-form-login'))) {
    throw new Error('SESSION_EXPIRED_AFTER_RETRY');
  }

  // LANGKAH 3: Parsing Data HTML ke JSON (delegasi ke krsParser)
  return parseKrsHtml(krsRes.data);
}
