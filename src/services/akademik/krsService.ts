import * as cheerio from 'cheerio';
import { HTTP_CONFIG } from './httpConfig';
import { academicApi } from './academicApi';

// ==========================================
// ACADEMIC SCRAPING (KRS MODULE)
// ==========================================

export interface StudentProfile {
  nama?: string;
  nim?: string;
  programStudi?: string;
  semester?: string;
  maksimumSks?: string | number;
  dosenPembimbing?: string;
}

export interface KrsItem {
  no: number;
  kodeMk: string;
  kelas: string;
  matakuliah: string;
  jadwalWaktu: string;
  jadwalRuang: string;
  sks: number;
}

export async function getDataKRS(phpSessId: string) {
  const baseHeaders: any = { ...HTTP_CONFIG.DEFAULT_HEADERS };
  
  if (phpSessId && phpSessId !== 'NATIVE_MANAGED') {
    const cookieHeader = phpSessId.startsWith('PHPSESSID=') ? phpSessId : `PHPSESSID=${phpSessId}`;
    baseHeaders['Cookie'] = cookieHeader;
  }

  // LANGKAH 1: Buka Dashboard untuk ekstrak URL KRS Dinamis
  console.log('\n[KRS PIPELINE] Mengakses Dashboard...');
  // GUNAKAN academicApi BUKAN axios AGAR INTERCEPTOR (SILENT LOGIN) BERJALAN!
  const dashRes = await academicApi.get(
    `${HTTP_CONFIG.AKADEMIK_ORIGIN_URL}/index.php?pModule=ydKhmA==&pSub=ydKhmA==&pAct=18yZqg==`,
    { headers: baseHeaders }
  );

  if (typeof dashRes.data === 'string' && dashRes.data.includes('kc-form-login')) {
    // Interceptor seharusnya menangani ini duluan. Jika sampai sini, berarti gagal total.
    throw new Error('SESSION_EXPIRED_AFTER_RETRY');
  }

  const $dash = cheerio.load(dashRes.data);
  let krsUrl = '';

  $dash('a').each((_, el) => {
    if ($dash(el).text().trim().includes('Kartu Rencana Studi')) {
      krsUrl = $dash(el).attr('href') as string; // Otomatis meng-unescape &amp; jadi &
    }
  });

  if (!krsUrl) throw new Error('Menu KRS tidak ditemukan di Dashboard.');
  if (!krsUrl.startsWith('http')) krsUrl = `${HTTP_CONFIG.AKADEMIK_ORIGIN_URL}/${krsUrl.replace(/^\//, '')}`;

  console.log('[KRS PIPELINE] URL Dinamis Ditemukan:', krsUrl);

  // LANGKAH 2: Tembak URL KRS dengan Referer Valid
  const krsRes = await academicApi.get(krsUrl, {
    headers: {
      ...baseHeaders,
      'Referer': `${HTTP_CONFIG.AKADEMIK_ORIGIN_URL}/index.php?pModule=ydKhmA==&pSub=ydKhmA==&pAct=18yZqg==`,
    },
    maxRedirects: 5, // Di sini aman pakai auto-redirect karena sesi sudah wangi
  });

  const html = krsRes.data;
  if (typeof html === 'string' && (html.includes('Anda tidak diijinkan') || html.includes('kc-form-login'))) {
    throw new Error('SESSION_EXPIRED_AFTER_RETRY');
  }

  // LANGKAH 3: Parsing Data HTML ke JSON
  const $ = cheerio.load(html);
  const studentProfile: StudentProfile = {};
  const krsList: KrsItem[] = [];
  let totalSks = 0;

  $('table tr').each((_, row) => {
    const key = $(row).find('th').text().trim();
    const val = $(row).find('td').text().trim();
    if (key && val) {
      if (key.includes('Nama')) studentProfile.nama = val;
      else if (key.includes('NIM')) studentProfile.nim = val;
      else if (key.includes('Program Studi')) studentProfile.programStudi = val;
      else if (key.includes('Semester')) studentProfile.semester = val;
      else if (key.includes('Maksimum SKS')) studentProfile.maksimumSks = parseInt(val, 10) || val;
      else if (key.includes('Dosen Pembimbing')) studentProfile.dosenPembimbing = val;
    }
  });

  $('table tr').each((_, row) => {
    const cols = $(row).find('td');
    if (cols.length >= 6) {
      const no = parseInt($(cols[0]).text().trim(), 10);
      if (!isNaN(no)) {
        const jadwalHtml = $(cols[4]).html() || '';
        const jadwalParts = jadwalHtml
          .split(/<br\s*\/?>/i)
          .map(i => $(`<span>${i}</span>`).text().trim())
          .filter(Boolean);
        krsList.push({
          no,
          kodeMk: $(cols[1]).text().trim(),
          kelas: $(cols[2]).text().trim(),
          matakuliah: $(cols[3]).text().trim(),
          jadwalWaktu: jadwalParts[0] || $(cols[4]).text().trim(),
          jadwalRuang: (jadwalParts[1] || '').replace(/[()]/g, '').trim(),
          sks: parseInt($(cols[5]).text().trim(), 10) || 0,
        });
      }
    }
    if ($(row).text().includes('Total SKS diambil')) {
      totalSks = parseInt($(cols).last().text().trim(), 10) || 0;
    }
  });

  return { studentProfile, krsList, totalSks };
}
