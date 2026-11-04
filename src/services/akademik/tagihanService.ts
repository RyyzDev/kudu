import { academicApi } from './academicApi';
import { HTTP_CONFIG } from './httpConfig';
import { parseTagihanSemesters, parseTagihanHtml } from './tagihanParser';
import { fetchWithAcademicCache } from './academicCache';

// Re-exportir tipe data untuk backward-compatibility dengan importers
export type { SemesterTagihanOption, TagihanItem } from './tagihanParser';

const TAGIHAN_URL = `${HTTP_CONFIG.AKADEMIK_ORIGIN_URL}/index.php?pModule=1cSbnJ+TosWhm9Kbk62S1pqn&pSub=1cSbnJ+TosWhm9Kbk62S1pqn&pAct=18yZqg==`;

// ==========================================
// ACADEMIC SCRAPING (TAGIHAN MODULE)
// ==========================================

export async function getTagihanSemesters(forceRefresh: boolean = false) {
  return fetchWithAcademicCache(
    'akademik_tagihan_semesters',
    async () => {
      const res = await academicApi.get(TAGIHAN_URL);

      if (typeof res.data === 'string' && (res.data.includes('kc-form-login') || res.data.includes('Anda tidak diijinkan'))) {
        throw new Error('SESSION_EXPIRED_AFTER_RETRY');
      }

      return parseTagihanSemesters(res.data);
    },
    { forceRefresh }
  );
}

export async function getTagihanData(semesterId: string, forceRefresh: boolean = false) {
  return fetchWithAcademicCache(
    `akademik_tagihan_${semesterId}`,
    async () => {
      const payload = new URLSearchParams({ lstSemester: semesterId, btnLihat: 'Lihat' });

      const res = await academicApi.post(TAGIHAN_URL, payload.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Referer: TAGIHAN_URL,
        },
      });

      if (typeof res.data === 'string' && (res.data.includes('kc-form-login') || res.data.includes('Anda tidak diijinkan'))) {
        throw new Error('SESSION_EXPIRED_AFTER_RETRY');
      }

      return parseTagihanHtml(res.data);
    },
    { forceRefresh }
  );
}
