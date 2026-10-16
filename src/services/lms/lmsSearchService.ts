import { LMS_USER_AGENT } from './lmsService';
import { parseSearchCoursesFromHtml } from './lmsParser';
import { LmsSearchCourseItem } from './lmsTypes';

/**
 * Mengambil daftar kursus LMS berdasarkan kata kunci pencarian atau kategori
 */
export async function fetchLmsCourses(
  query?: string,
  categoryId?: number,
  webViewFetcher?: (url: string) => Promise<string>
): Promise<LmsSearchCourseItem[]> {
  let targetUrl = 'https://lms.uinjakarta.id/course/index.php';

  if (query && query.trim().length > 0) {
    targetUrl = `https://lms.uinjakarta.id/course/search.php?search=${encodeURIComponent(query.trim())}`;
  } else if (categoryId && categoryId > 0) {
    targetUrl = `https://lms.uinjakarta.id/course/index.php?categoryid=${categoryId}`;
  }

  console.log(`[LMS-SEARCH] Mengambil kursus dari: ${targetUrl}`);

  let html = '';

  // 1. Coba request via direct native fetch
  try {
    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': LMS_USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    const text = await res.text();

    const isLoginRedirect =
      text.includes('/login/index.php') ||
      text.includes('This page should automatically redirect') ||
      text.includes('kc-form-login');

    if (!isLoginRedirect) {
      html = text;
    } else {
      console.log('[LMS-SEARCH] Direct fetch dialihkan ke halaman login. Mencoba fallback WebView fetcher...');
    }
  } catch (err) {
    console.warn('[LMS-SEARCH] Direct fetch error:', err);
  }

  // 2. Fallback via WebView Fetcher jika direct fetch dialihkan ke login
  if (!html && webViewFetcher) {
    try {
      console.log('[LMS-SEARCH] Mengeksekusi fetch di dalam konteks sesi WebView...');
      html = await webViewFetcher(targetUrl);
    } catch (wvErr) {
      console.warn('[LMS-SEARCH] WebView fetcher gagal:', wvErr);
    }
  }

  if (!html) {
    throw new Error('Sesi LMS belum terhubung. Silakan hubungkan akun Google LMS terlebih dahulu.');
  }

  // 3. Parsing HTML menggunakan Cheerio
  const courses = parseSearchCoursesFromHtml(html);
  console.log(`[LMS-SEARCH] Berhasil menemukan ${courses.length} kursus.`);

  return courses;
}
