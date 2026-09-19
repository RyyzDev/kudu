import * as cheerio from 'cheerio';
import { HTTP_CONFIG } from './httpConfig';
import { academicApi } from './academicApi';

// ==========================================
// ACADEMIC SCRAPING (KHS / NILAI MODULE)
// ==========================================

export interface SemesterOption {
  value: string;
  label: string;
}

export interface KhsItem {
  no: number;
  kode: string;
  matakuliah: string;
  kelas: string;
  sks: number;
  formatif: string;
  uts: string;
  uas: string;
  nilaiAkhir: string;
}

export interface KhsSummary {
  jumlahSks: string;
  jumlahMatkul: string;
  ipKumulatif: string;
  ipSemester: string;
}

export interface KhsResult {
  items: KhsItem[];
  summary: KhsSummary | null;
}

const KHS_URL = `${HTTP_CONFIG.AKADEMIK_ORIGIN_URL}/index.php?pModule=wsaVl5yfncmQqMqpoaal&pSub=wsaVl5yfncmQqMqpoaal&pAct=18yZqg==`;

export async function getKhsSemesters(phpSessId: string): Promise<SemesterOption[]> {
  const baseHeaders: any = { ...HTTP_CONFIG.DEFAULT_HEADERS };

  if (phpSessId && phpSessId !== 'NATIVE_MANAGED') {
    const cookieHeader = phpSessId.startsWith('PHPSESSID=') ? phpSessId : `PHPSESSID=${phpSessId}`;
    baseHeaders['Cookie'] = cookieHeader;
  }

  const res = await academicApi.get(KHS_URL, { headers: baseHeaders });
  
  if (typeof res.data === 'string' && (res.data.includes('kc-form-login') || res.data.includes('Anda tidak diijinkan'))) {
    throw new Error('SESSION_EXPIRED_AFTER_RETRY');
  }

  const $ = cheerio.load(res.data);
  const semesters: SemesterOption[] = [];

  $('select[name="lstSemester"] option').each((_, el) => {
    const value = $(el).attr('value');
    const label = $(el).text().trim();
    if (value && label) {
      semesters.push({ value, label });
    }
  });

  return semesters;
}

export async function getKhsData(semesterId: string, phpSessId: string): Promise<KhsResult> {
  const baseHeaders: any = { 
    ...HTTP_CONFIG.DEFAULT_HEADERS,
    'Content-Type': 'application/x-www-form-urlencoded',
    'Referer': KHS_URL
  };

  if (phpSessId && phpSessId !== 'NATIVE_MANAGED') {
    const cookieHeader = phpSessId.startsWith('PHPSESSID=') ? phpSessId : `PHPSESSID=${phpSessId}`;
    baseHeaders['Cookie'] = cookieHeader;
  }

  const payload = new URLSearchParams({
    lstSemester: semesterId,
    btnLihat: 'Lihat'
  });

  const res = await academicApi.post(KHS_URL, payload.toString(), { headers: baseHeaders });
  
  if (typeof res.data === 'string' && (res.data.includes('kc-form-login') || res.data.includes('Anda tidak diijinkan'))) {
    throw new Error('SESSION_EXPIRED_AFTER_RETRY');
  }

  const $ = cheerio.load(res.data);
  const items: KhsItem[] = [];

  $('table.table-stripped tbody tr').each((_, row) => {
    const cols = $(row).find('td');
    
    if (cols.length >= 10) {
      const noText = $(cols[0]).text().trim();
      const no = parseInt(noText, 10);
      if (isNaN(no)) return;

      items.push({
        no,
        kode: $(cols[1]).text().trim(),
        matakuliah: $(cols[2]).text().trim(),
        kelas: $(cols[3]).text().trim(),
        sks: parseInt($(cols[5]).text().trim(), 10) || 0,
        formatif: $(cols[6]).text().trim(),
        uts: $(cols[7]).text().trim(),
        uas: $(cols[8]).text().trim(),
        nilaiAkhir: $(cols[9]).text().trim(),
      });
    }
  });

  // Parse ringkasan IP dari tabel kedua (tabel biasa tanpa class table-stripped)
  // Strateginya: cari baris yang teksnya mengandung kata kunci
  let summary: KhsSummary | null = null;
  const summaryData: Record<string, string> = {};

  $('table.table tr').each((_, row) => {
    const th = $(row).find('td:first-child').text().trim();
    const td = $(row).find('td:last-child').text().trim().replace(/^:\s*/, '');
    if (th && td) {
      summaryData[th] = td;
    }
  });

  // Cari berdasarkan key yang paling mungkin
  const jumlahSks = Object.entries(summaryData).find(([k]) => k.includes('SKS diambil'))?.[1] || '';
  const jumlahMatkul = Object.entries(summaryData).find(([k]) => k.includes('mata kuliah diambil'))?.[1] || '';
  const ipKumulatif = Object.entries(summaryData).find(([k]) => k.includes('IP Kumulatif'))?.[1] || '';
  const ipSemester = Object.entries(summaryData).find(([k]) => k.includes('IP Semester'))?.[1] || '';

  if (ipKumulatif || ipSemester) {
    summary = { jumlahSks, jumlahMatkul, ipKumulatif, ipSemester };
  }

  return { items, summary };
}
