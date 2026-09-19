import * as cheerio from 'cheerio';
import { HTTP_CONFIG } from './httpConfig';
import { academicApi } from './academicApi';

// ==========================================
// ACADEMIC SCRAPING (TAGIHAN MODULE)
// ==========================================

export interface SemesterTagihanOption {
  value: string;
  label: string;
}

export interface TagihanItem {
  no: number;
  semester: string;
  noTagihan: string;
  jenisPembayaran: string;
  totalTagihan: string;
  potongan: string;
  sisaTagihan: string;
  tanggalAwal: string;
  tanggalAkhir: string;
  status: string;
  detailUrl: string | null;
}

const TAGIHAN_URL = `${HTTP_CONFIG.AKADEMIK_ORIGIN_URL}/index.php?pModule=1cSbnJ+TosWhm9Kbk62S1pqn&pSub=1cSbnJ+TosWhm9Kbk62S1pqn&pAct=18yZqg==`;

export async function getTagihanSemesters(phpSessId: string): Promise<SemesterTagihanOption[]> {
  const baseHeaders: any = { ...HTTP_CONFIG.DEFAULT_HEADERS };

  if (phpSessId && phpSessId !== 'NATIVE_MANAGED') {
    const cookieHeader = phpSessId.startsWith('PHPSESSID=') ? phpSessId : `PHPSESSID=${phpSessId}`;
    baseHeaders['Cookie'] = cookieHeader;
  }

  const res = await academicApi.get(TAGIHAN_URL, { headers: baseHeaders });

  if (typeof res.data === 'string' && (res.data.includes('kc-form-login') || res.data.includes('Anda tidak diijinkan'))) {
    throw new Error('SESSION_EXPIRED_AFTER_RETRY');
  }

  const $ = cheerio.load(res.data);
  const semesters: SemesterTagihanOption[] = [];

  $('select[name="lstSemester"] option').each((_, el) => {
    const value = $(el).attr('value');
    const label = $(el).text().trim();
    if (value && label) {
      semesters.push({ value, label });
    }
  });

  return semesters;
}

export async function getTagihanData(semesterId: string, phpSessId: string): Promise<TagihanItem[]> {
  const baseHeaders: any = {
    ...HTTP_CONFIG.DEFAULT_HEADERS,
    'Content-Type': 'application/x-www-form-urlencoded',
    'Referer': TAGIHAN_URL
  };

  if (phpSessId && phpSessId !== 'NATIVE_MANAGED') {
    const cookieHeader = phpSessId.startsWith('PHPSESSID=') ? phpSessId : `PHPSESSID=${phpSessId}`;
    baseHeaders['Cookie'] = cookieHeader;
  }

  const payload = new URLSearchParams({
    lstSemester: semesterId,
    btnLihat: 'Lihat'
  });

  const res = await academicApi.post(TAGIHAN_URL, payload.toString(), { headers: baseHeaders });

  if (typeof res.data === 'string' && (res.data.includes('kc-form-login') || res.data.includes('Anda tidak diijinkan'))) {
    throw new Error('SESSION_EXPIRED_AFTER_RETRY');
  }

  const $ = cheerio.load(res.data);
  const tagihanList: TagihanItem[] = [];

  $('table.table-stripped tbody tr').each((_, row) => {
    const cols = $(row).find('td');

    // Minimal 11 kolom: No, Semester, NoTagihan, Jenis, Total, Potongan, Sisa, TglAwal, TglAkhir, Status, Aksi
    if (cols.length >= 10) {
      const noText = $(cols[0]).text().trim();
      const no = parseInt(noText, 10);
      if (isNaN(no)) return;

      const detailHref = $(cols[10] ?? cols[cols.length - 1]).find('a').attr('href');

      tagihanList.push({
        no,
        semester: $(cols[1]).text().trim(),
        noTagihan: $(cols[2]).text().trim(),
        jenisPembayaran: $(cols[3]).text().trim(),
        totalTagihan: $(cols[4]).text().trim(),
        potongan: $(cols[5]).text().trim(),
        sisaTagihan: $(cols[6]).text().trim(),
        tanggalAwal: $(cols[7]).text().trim(),
        tanggalAkhir: $(cols[8]).text().trim(),
        status: $(cols[9]).text().trim(),
        detailUrl: detailHref ? detailHref.replace(/&amp;/g, '&') : null,
      });
    }
  });

  return tagihanList;
}
