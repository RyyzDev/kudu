import * as cheerio from 'cheerio';
import { HTTP_CONFIG } from './httpConfig';
import { academicApi } from './academicApi';

// ==========================================
// ACADEMIC SCRAPING (PRESENSI MODULE)
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

export async function getDataPresensi(phpSessId: string): Promise<PresensiItem[]> {
  const baseHeaders: any = { ...HTTP_CONFIG.DEFAULT_HEADERS };

  if (phpSessId && phpSessId !== 'NATIVE_MANAGED') {
    const cookieHeader = phpSessId.startsWith('PHPSESSID=') ? phpSessId : `PHPSESSID=${phpSessId}`;
    baseHeaders['Cookie'] = cookieHeader;
  }

  console.log('\n[PRESENSI PIPELINE] Mengambil data presensi...');
  
  // URL didapat dari instruksi pengguna
  const presensiUrl = `${HTTP_CONFIG.AKADEMIK_ORIGIN_URL}/index.php?pModule=xsKkpZylmdSknw==&pSub=zcynp5afn8WhqMqsl6KkzQ==&pAct=18yZqg==`;
  
  const res = await academicApi.get(presensiUrl, { headers: baseHeaders });
  
  if (typeof res.data === 'string' && (res.data.includes('kc-form-login') || res.data.includes('Anda tidak diijinkan'))) {
    throw new Error('SESSION_EXPIRED_AFTER_RETRY');
  }

  const $ = cheerio.load(res.data);
  const presensiList: PresensiItem[] = [];

  // Cari tabel yang punya header "Hadir" dan "Terlaksana"
  $('table.table-stripped tr').each((_, row) => {
    const cols = $(row).find('td');
    
    // Pastikan ini adalah baris data, bukan header (harus ada minimal 8 kolom)
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
// KELAS PRESENSI (DETAIL PERTEMUAN)
// ==========================================

export interface PertemuanItem {
  no: number;
  tanggalRencana: string;
  tanggalTerlaksana: string;
  dosen: string;
  statusHadir: string;
  canInput: boolean;
  prsId: string | null;
}

export async function getDetailPresensi(detailUrl: string, phpSessId: string): Promise<PertemuanItem[]> {
  const baseHeaders: any = { ...HTTP_CONFIG.DEFAULT_HEADERS };

  if (phpSessId && phpSessId !== 'NATIVE_MANAGED') {
    const cookieHeader = phpSessId.startsWith('PHPSESSID=') ? phpSessId : `PHPSESSID=${phpSessId}`;
    baseHeaders['Cookie'] = cookieHeader;
  }

  const res = await academicApi.get(detailUrl, { headers: baseHeaders });
  
  if (typeof res.data === 'string' && (res.data.includes('kc-form-login') || res.data.includes('Anda tidak diijinkan'))) {
    throw new Error('SESSION_EXPIRED_AFTER_RETRY');
  }

  const $ = cheerio.load(res.data);
  const pertemuanList: PertemuanItem[] = [];

  $('table.table-stripped tr').each((_, row) => {
    const cols = $(row).find('td');
    
    // Pastikan ini adalah baris data (bukan header), memiliki minimal 6 kolom
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

// ==========================================
// POST SUBMIT PRESENSI MANDIRI
// ==========================================

export async function submitPresensi(
  detailUrl: string, 
  prsId: string, 
  phpSessId: string,
  status: '2' | '1' | '3' | '4' = '2' // Default: 2 (Hadir)
): Promise<boolean> {
  const baseHeaders: any = { 
    ...HTTP_CONFIG.DEFAULT_HEADERS,
    'Content-Type': 'application/x-www-form-urlencoded',
    'Referer': detailUrl
  };

  if (phpSessId && phpSessId !== 'NATIVE_MANAGED') {
    const cookieHeader = phpSessId.startsWith('PHPSESSID=') ? phpSessId : `PHPSESSID=${phpSessId}`;
    baseHeaders['Cookie'] = cookieHeader;
  }

  // Ekstrak parameter 'sia' dan 'kelas' dari detailUrl
  const urlParams = new URLSearchParams(detailUrl.split('?')[1] || '');
  const sia = urlParams.get('sia') || '';
  const kls = urlParams.get('kelas') || '';

  if (!sia || !kls) {
    throw new Error('Gagal mengekstrak token sia/kelas dari URL.');
  }

  const postUrl = `${HTTP_CONFIG.AKADEMIK_ORIGIN_URL}/index.php?pModule=xsKkpZylmdSknw==&pSub=0dWZppygl8uQo82s&pAct=0dWjlpylpw==`;
  
  const payload = new URLSearchParams({
    status_hadir_mhs: status,
    prs: prsId,
    sia: sia,
    kls: kls,
    ipaddress_user: '',
    btnPresensiMhs: 'Simpan'
  });

  const res = await academicApi.post(postUrl, payload.toString(), { 
    headers: baseHeaders,
    maxRedirects: 5
  });

  if (typeof res.data === 'string' && (res.data.includes('kc-form-login') || res.data.includes('Anda tidak diijinkan'))) {
    throw new Error('SESSION_EXPIRED_AFTER_RETRY');
  }

  // Cek apakah ada indikator gagal. Normalnya ia akan di-redirect (302) kembali ke halaman detail
  // Axios akan mengikuti redirect dan mengembalikan HTML halaman detail dengan tombol sudah disabled
  return true;
}
