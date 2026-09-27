import * as cheerio from 'cheerio';

// ==========================================
// TIPE DATA (PRESENSI MODULE)
// ==========================================

export interface PresensiItem {
  no: number;
  matakuliah: string;
  kelas: string;
  sks: number;
  terlaksana: number;
  hadir: number;
  tidakHadir: number;
  inputPresensiUrl: string | null;
  canInputPresensi: boolean;
}

export interface PertemuanItem {
  no: number;
  tanggalRencana: string;
  tanggalTerlaksana: string;
  dosen: string;
  statusHadir: string;
  canInput: boolean;
  prsId: string | null;
}

// ==========================================
// PARSER: Parsing halaman daftar presensi
// ==========================================

export function parsePresensiHtml(html: string): PresensiItem[] {
  const $ = cheerio.load(html);
  const presensiList: PresensiItem[] = [];

  $('table.table-stripped tr').each((_, row) => {
    const cols = $(row).find('td');

    if (cols.length >= 8) {
      const no = parseInt($(cols[0]).text().trim(), 10);
      if (isNaN(no)) return;

      const aksiTd = $(cols[1]);
      const btnPresensi = aksiTd.find('button[title="input presensi mandiri"]');
      const canInputPresensi = btnPresensi.length > 0 && !btnPresensi.attr('disabled');
      const inputPresensiUrl = canInputPresensi ? btnPresensi.parent('a').attr('href') || null : null;

      presensiList.push({
        no,
        matakuliah: $(cols[2]).text().trim(),
        kelas: $(cols[3]).text().trim(),
        sks: parseInt($(cols[4]).text().trim(), 10) || 0,
        terlaksana: parseInt($(cols[5]).text().trim(), 10) || 0,
        hadir: parseInt($(cols[6]).text().trim(), 10) || 0,
        tidakHadir: parseInt($(cols[7]).text().trim(), 10) || 0,
        canInputPresensi,
        inputPresensiUrl: inputPresensiUrl ? inputPresensiUrl.replace(/&amp;/g, '&') : null,
      });
    }
  });

  return presensiList;
}

// ==========================================
// PARSER: Parsing halaman detail presensi (pertemuan)
// ==========================================

export function parseDetailPresensiHtml(html: string): PertemuanItem[] {
  const $ = cheerio.load(html);
  const pertemuanList: PertemuanItem[] = [];

  $('table.table-stripped tr').each((_, row) => {
    const cols = $(row).find('td');

    if (cols.length >= 6) {
      const no = parseInt($(cols[0]).text().trim(), 10);
      if (isNaN(no)) return;

      const btn = $(cols[1]).find('button.btn_input_pres_mhs');
      const isDisabled = btn.attr('disabled') !== undefined;
      const canInput = btn.length > 0 && !isDisabled;
      const prsId = btn.attr('data-prs_id') || null;

      pertemuanList.push({
        no,
        tanggalRencana: $(cols[2]).text().trim(),
        tanggalTerlaksana: $(cols[3]).text().trim(),
        dosen: $(cols[4]).text().trim(),
        statusHadir: $(cols[5]).text().trim(),
        canInput,
        prsId,
      });
    }
  });

  return pertemuanList;
}
