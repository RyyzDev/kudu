import { academicApi } from './academicApi';
import { HTTP_CONFIG } from './httpConfig';
import { parseProfileHtml, StudentProfileData } from './profileParser';

export type { StudentProfileData, ProfileSection, ProfileItem } from './profileParser';

export const PROFILE_URL = `${HTTP_CONFIG.AKADEMIK_ORIGIN_URL}/index.php?pModule=1taZpQ==&pSub=0dWjmaCemQ==&pAct=18yZqg==`;

/**
 * Mengambil data profil mahasiswa dari portal akademik
 */
export async function getProfileData(): Promise<StudentProfileData> {
  console.log('\n[PROFILE SERVICE] Mengakses URL Profil Mahasiswa...');

  const response = await academicApi.get(PROFILE_URL, {
    headers: {
      Referer: `${HTTP_CONFIG.AKADEMIK_ORIGIN_URL}/index.php?pModule=ydKhmA==&pSub=ydKhmA==&pAct=18yZqg==`,
    },
  });

  if (typeof response.data === 'string' && response.data.includes('kc-form-login')) {
    throw new Error('Sesi telah kedaluwarsa. Silakan muat ulang.');
  }

  return parseProfileHtml(response.data);
}
