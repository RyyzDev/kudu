import * as cheerio from 'cheerio';

// ==========================================
// TIPE DATA (KHS / NILAI MODULE)
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

// ==========================================
// PARSER: Ekstrak daftar semester dari dropdown
// ==========================================

export function parseKhsSemesters(html: string): SemesterOption[] {
  const $ = cheerio.load(html);
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

// ==========================================
// PARSER: Parsing halaman data KHS per semester
// ==========================================

export function parseKhsHtml(html: string): KhsResult {
  const $ = cheerio.load(html);
  const items: KhsItem[] = [];

  $('table.table-stripped tbody tr').each((_, row) => {
    const cols = $(row).find('td');

    if (cols.length >= 10) {
      const no = parseInt($(cols[0]).text().trim(), 10);
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
  let summary: KhsSummary | null = null;
  const summaryData: Record<string, string> = {};

  $('table.table tr').each((_, row) => {
    const th = $(row).find('td:first-child').text().trim();
    const td = $(row).find('td:last-child').text().trim().replace(/^:\s*/, '');
    if (th && td) {
      summaryData[th] = td;
    }
  });

  const jumlahSks = Object.entries(summaryData).find(([k]) => k.includes('SKS diambil'))?.[1] || '';
  const jumlahMatkul = Object.entries(summaryData).find(([k]) => k.includes('mata kuliah diambil'))?.[1] || '';
  const ipKumulatif = Object.entries(summaryData).find(([k]) => k.includes('IP Kumulatif'))?.[1] || '';
  const ipSemester = Object.entries(summaryData).find(([k]) => k.includes('IP Semester'))?.[1] || '';

  if (ipKumulatif || ipSemester) {
    summary = { jumlahSks, jumlahMatkul, ipKumulatif, ipSemester };
  }

  return { items, summary };
}
