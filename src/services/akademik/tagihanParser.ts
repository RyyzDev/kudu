import * as cheerio from 'cheerio';

// ==========================================
// TIPE DATA (TAGIHAN MODULE)
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

// ==========================================
// PARSER: Ekstrak daftar semester dari dropdown
// ==========================================

export function parseTagihanSemesters(html: string): SemesterTagihanOption[] {
  const $ = cheerio.load(html);
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

// ==========================================
// PARSER: Parsing data tagihan per semester
// ==========================================

export function parseTagihanHtml(html: string): TagihanItem[] {
  const $ = cheerio.load(html);
  const tagihanList: TagihanItem[] = [];

  $('table.table-stripped tbody tr').each((_, row) => {
    const cols = $(row).find('td');

    // Minimal 11 kolom: No, Semester, NoTagihan, Jenis, Total, Potongan, Sisa, TglAwal, TglAkhir, Status, Aksi
    if (cols.length >= 10) {
      const no = parseInt($(cols[0]).text().trim(), 10);
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
