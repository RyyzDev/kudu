import * as cheerio from 'cheerio';
import { eletterApi } from './eletterApi';

export interface ELetterSurat {
  no: string;
  tanggal: string;
  jenisSurat: string;
  tipe: string;
  statusText: string;
  isSigned: boolean;
  printUrl: string | null;
}

export interface ELetterDashboard {
  suratList: ELetterSurat[];
  csrfToken: string;
}

export interface ELetterDropdownOption {
  value: string;
  label: string;
}

export interface ELetterFormAdd {
  options: ELetterDropdownOption[];
  csrfToken: string;
  nim: string;
  nama: string;
}

export async function getELetterDashboard(): Promise<ELetterDashboard> {
  const getRes = await eletterApi.get('/persuratan');
  const html = getRes.data;
  const $ = cheerio.load(html);
  
  let token = $('meta[name="csrf-token"]').attr('content') || $('input[name="_token"]').val() as string;

  const suratList: ELetterSurat[] = [];
  $('table#example23 tbody tr').each((_, row) => {
    const cols = $(row).find('td');
    if (cols.length >= 5) {
      const statusHtml = $(cols[4]);
      
      const statusText = statusHtml.find('.label').text().trim() || statusHtml.text().trim() || 'Diproses';
      const isSigned = statusText.toLowerCase().includes('telah di tanda tangani');
      
      let printUrl = null;
      statusHtml.find('a').each((_, a) => {
        const href = $(a).attr('href');
        if (href && href.includes('/cetak/')) {
          printUrl = href;
        }
      });

      suratList.push({
        no: $(cols[0]).text().trim(),
        tanggal: $(cols[1]).text().trim(),
        jenisSurat: $(cols[2]).text().trim(),
        tipe: $(cols[3]).text().trim(),
        statusText,
        isSigned,
        printUrl
      });
    }
  });

  return { suratList, csrfToken: token };
}

export async function getELetterFormAdd(): Promise<ELetterFormAdd> {
  const getRes = await eletterApi.get('/persuratan/add');
  const html = getRes.data;
  const $ = cheerio.load(html);
  
  let token = $('meta[name="csrf-token"]').attr('content') || $('input[name="_token"]').val() as string;

  const options: ELetterDropdownOption[] = [];
  $('select[name="id_surat"] option').each((_, opt) => {
    const val = $(opt).attr('value');
    const label = $(opt).text().trim();
    if (val && label && val !== '') {
      options.push({ value: val, label });
    }
  });

  let nim = '';
  let nama = '';
  $('table.table-striped tbody tr').each((_, row) => {
    const label = $(row).find('td').eq(0).text().trim().toLowerCase();
    const value = $(row).find('td').eq(2).text().trim();
    if (label.includes('nim')) nim = value;
    if (label.includes('nama')) nama = value;
  });

  return { options, csrfToken: token, nim, nama };
}
