import * as cheerio from 'cheerio';

export interface ProfileItem {
  label: string;
  value: string;
}

export interface ProfileSection {
  title: string;
  items: ProfileItem[];
}

export interface StudentProfileData {
  nama: string;
  nim: string;
  status: string;
  emailUniversitas: string;
  noHandphone: string;
  rawFields: Record<string, string>;
  sections: ProfileSection[];
}

/**
 * Parser untuk tabel HTML profil mahasiswa akademik
 */
export function parseProfileHtml(rawHtml: string): StudentProfileData {
  if (!rawHtml || typeof rawHtml !== 'string') {
    throw new Error('HTML profil kosong atau tidak valid.');
  }

  // Bungkus dalam tag table jika berupa potongan tbody
  const html = rawHtml.includes('<table') ? rawHtml : `<table>${rawHtml}</table>`;
  const $ = cheerio.load(html);

  const rawFields: Record<string, string> = {};
  const sections: ProfileSection[] = [];
  let currentSection: ProfileSection = {
    title: 'INFORMASI MAHASISWA',
    items: [],
  };

  $('tr').each((_, el) => {
    const $row = $(el);

    // Cek apakah ini baris judul seksi (misal: "NAMA ORANG TUA", "PEKERJAAN ORANG TUA")
    const $sectionHeader = $row.find('th[colspan]');
    if ($sectionHeader.length > 0) {
      if (currentSection.items.length > 0) {
        sections.push(currentSection);
      }
      currentSection = {
        title: $sectionHeader.text().trim(),
        items: [],
      };
      return;
    }

    const thText = $row.find('th').text().trim();
    // Bersihkan spasi non-breaking dan spasi ganda
    const tdText = $row.find('td').text().replace(/\u00a0/g, ' ').trim();

    if (thText) {
      const cleanVal = tdText || '-';
      currentSection.items.push({ label: thText, value: cleanVal });
      rawFields[thText] = cleanVal;
    }
  });

  if (currentSection.items.length > 0) {
    sections.push(currentSection);
  }

  return {
    nama: rawFields['Nama'] || rawFields['NAMA'] || '-',
    nim: rawFields['NIM'] || '-',
    status: rawFields['Status'] || rawFields['STATUS'] || 'AKTIF',
    emailUniversitas: rawFields['Email Universitas'] || '-',
    noHandphone: rawFields['No Handphone'] || rawFields['No Telepon'] || '-',
    rawFields,
    sections,
  };
}
