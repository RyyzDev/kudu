import { academicApi } from './academicApi';
import { HTTP_CONFIG } from './httpConfig';
import { parsePresensiHtml, parseDetailPresensiHtml } from './presensiParser';

// Re-exportir tipe data untuk backward-compatibility dengan importers
export type { PresensiItem, PertemuanItem } from './presensiParser';

const PRESENSI_URL = `${HTTP_CONFIG.AKADEMIK_ORIGIN_URL}/index.php?pModule=xsKkpZylmdSknw==&pSub=zcynp5afn8WhqMqsl6KkzQ==&pAct=18yZqg==`;
const POST_PRESENSI_URL = `${HTTP_CONFIG.AKADEMIK_ORIGIN_URL}/index.php?pModule=xsKkpZylmdSknw==&pSub=0dWZppygl8uQo82s&pAct=0dWjlpylpw==`;

// ==========================================
// ACADEMIC SCRAPING (PRESENSI MODULE)
// ==========================================

export async function getDataPresensi() {
  console.log('\n[PRESENSI PIPELINE] Mengambil data presensi...');
  const res = await academicApi.get(PRESENSI_URL);

  if (typeof res.data === 'string' && (res.data.includes('kc-form-login') || res.data.includes('Anda tidak diijinkan'))) {
    throw new Error('SESSION_EXPIRED_AFTER_RETRY');
  }

  return parsePresensiHtml(res.data);
}

// ==========================================
// KELAS PRESENSI (DETAIL PERTEMUAN)
// ==========================================

export async function getDetailPresensi(detailUrl: string) {
  const res = await academicApi.get(detailUrl);

  if (typeof res.data === 'string' && (res.data.includes('kc-form-login') || res.data.includes('Anda tidak diijinkan'))) {
    throw new Error('SESSION_EXPIRED_AFTER_RETRY');
  }

  return parseDetailPresensiHtml(res.data);
}

// ==========================================
// POST SUBMIT PRESENSI MANDIRI
// ==========================================

export async function submitPresensi(
  detailUrl: string,
  prsId: string,
  status: '2' | '1' | '3' | '4' = '2' // Default: 2 (Hadir)
): Promise<boolean> {
  // Ekstrak parameter 'sia' dan 'kelas' dari detailUrl
  const urlParams = new URLSearchParams(detailUrl.split('?')[1] || '');
  const sia = urlParams.get('sia') || '';
  const kls = urlParams.get('kelas') || '';

  if (!sia || !kls) {
    throw new Error('Gagal mengekstrak token sia/kelas dari URL.');
  }

  const payload = new URLSearchParams({
    status_hadir_mhs: status,
    prs: prsId,
    sia,
    kls,
    ipaddress_user: '',
    btnPresensiMhs: 'Simpan',
  });

  const res = await academicApi.post(POST_PRESENSI_URL, payload.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: detailUrl,
    },
    maxRedirects: 5,
  });

  if (typeof res.data === 'string' && (res.data.includes('kc-form-login') || res.data.includes('Anda tidak diijinkan'))) {
    throw new Error('SESSION_EXPIRED_AFTER_RETRY');
  }

  // Cek apakah ada indikator gagal. Normalnya ia akan di-redirect (302) kembali ke halaman detail
  // Axios akan mengikuti redirect dan mengembalikan HTML halaman detail dengan tombol sudah disabled
  return true;
}
