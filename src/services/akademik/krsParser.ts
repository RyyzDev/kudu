import * as cheerio from 'cheerio';
import { HTTP_CONFIG } from './httpConfig';

// ==========================================
// TIPE DATA (KRS MODULE)
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

export interface KrsResult {
  studentProfile: StudentProfile;
  krsList: KrsItem[];
  totalSks: number;
}

// ==========================================
// PARSER: Ekstrak URL KRS dari HTML Dashboard
// ==========================================

export function extractKrsUrl(dashboardHtml: string): string {
  const $ = cheerio.load(dashboardHtml);
  let krsUrl = '';

  $('a').each((_, el) => {
    if ($(el).text().trim().includes('Kartu Rencana Studi')) {
      krsUrl = $(el).attr('href') as string; // Otomatis meng-unescape &amp; jadi &
    }
  });

  if (!krsUrl) throw new Error('Menu KRS tidak ditemukan di Dashboard.');
  if (!krsUrl.startsWith('http')) {
    krsUrl = `${HTTP_CONFIG.AKADEMIK_ORIGIN_URL}/${krsUrl.replace(/^\//, '')}`;
  }
  return krsUrl;
}

// ==========================================
// PARSER: Parsing halaman KRS ke JSON
// ==========================================

export function parseKrsHtml(html: string): KrsResult {
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
