import { academicApi } from './academicApi';
import { HTTP_CONFIG } from './httpConfig';
import { parseKhsSemesters, parseKhsHtml } from './khsParser';

// Re-exportir tipe data untuk backward-compatibility dengan importers
export type { SemesterOption, KhsItem, KhsSummary, KhsResult } from './khsParser';

const KHS_URL = `${HTTP_CONFIG.AKADEMIK_ORIGIN_URL}/index.php?pModule=wsaVl5yfncmQqMqpoaal&pSub=wsaVl5yfncmQqMqpoaal&pAct=18yZqg==`;

// ==========================================
// ACADEMIC SCRAPING (KHS / NILAI MODULE)
// ==========================================

export async function getKhsSemesters() {
  const res = await academicApi.get(KHS_URL);

  if (typeof res.data === 'string' && (res.data.includes('kc-form-login') || res.data.includes('Anda tidak diijinkan'))) {
    throw new Error('SESSION_EXPIRED_AFTER_RETRY');
  }

  return parseKhsSemesters(res.data);
}

export async function getKhsData(semesterId: string) {
  const payload = new URLSearchParams({ lstSemester: semesterId, btnLihat: 'Lihat' });

  const res = await academicApi.post(KHS_URL, payload.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: KHS_URL,
    },
  });

  if (typeof res.data === 'string' && (res.data.includes('kc-form-login') || res.data.includes('Anda tidak diijinkan'))) {
    throw new Error('SESSION_EXPIRED_AFTER_RETRY');
  }

  return parseKhsHtml(res.data);
}
