import * as cheerio from 'cheerio';
import { LmsCourse, LmsAssignment, LmsSearchCourseItem } from './lmsTypes';

/**
 * Membersihkan HTML entity dan tag HTML dari teks nama matakuliah / tugas
 */
export function cleanHtmlText(text: string): string {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

export type UrgencyLevel = 'overdue' | 'critical' | 'warning' | 'normal';

export interface UrgencyInfo {
  level: UrgencyLevel;
  label: string;
  badgeBg: string;
  textColor: string;
}

/**
 * Menghitung tingkat urgensi dan teks label untuk deadline tugas
 */
export function getUrgencyInfo(timesort: number): UrgencyInfo {
  const now = Math.floor(Date.now() / 1000);
  const diff = timesort - now;

  if (diff < 0) {
    const overdueHours = Math.floor(Math.abs(diff) / 3600);
    const overdueDays = Math.floor(overdueHours / 24);
    const label = overdueDays > 0 ? `Terlambat ${overdueDays} hari` : `Terlambat ${overdueHours} jam`;
    return {
      level: 'overdue',
      label,
      badgeBg: '#000000',
      textColor: '#ffffff',
    };
  }

  const hours = Math.floor(diff / 3600);
  const days = Math.floor(hours / 24);

  if (hours < 24) {
    const label = hours === 0 ? 'Tersisa < 1 jam' : `Tersisa ${hours} jam`;
    return {
      level: 'critical',
      label,
      badgeBg: '#ff4d4d',
      textColor: '#ffffff',
    };
  }

  if (days <= 3) {
    const label = days === 1 ? 'Besok' : `${days} hari lagi`;
    return {
      level: 'warning',
      label,
      badgeBg: '#ff914d',
      textColor: '#000000',
    };
  }

  return {
    level: 'normal',
    label: `${days} hari lagi`,
    badgeBg: '#ffde59',
    textColor: '#000000',
  };
}

/**
 * Format timestamp Unix ke format tanggal lokal Indonesia
 */
export function formatLmsDate(timesort: number): string {
  if (!timesort) return '-';
  const date = new Date(timesort * 1000);
  const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  const dayName = days[date.getDay()];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${dayName}, ${day} ${month} • ${hours}:${minutes}`;
}

/**
 * Mendapatkan nama icon Feather berdasarkan modul Moodle
 */
export function getModuleIconName(modulename: string): any {
  switch (modulename?.toLowerCase()) {
    case 'assign':
      return 'file-text';
    case 'quiz':
      return 'help-circle';
    case 'forum':
      return 'message-square';
    case 'feedback':
    case 'survey':
      return 'check-square';
    case 'resource':
    case 'folder':
      return 'folder';
    default:
      return 'bookmark';
  }
}

/**
 * Fallback parser untuk halaman HTML /my/courses.php jika diperlukan
 */
export function parseCoursesFromHtml(html: string): LmsCourse[] {
  const $ = cheerio.load(html);
  const courses: LmsCourse[] = [];

  $('.coursebox, .dashboard-card, [data-region="course-content"]').each((_, el) => {
    const $el = $(el);
    const linkEl = $el.find('a.coursename, .coursename a, a[href*="course/view.php"]').first();
    const href = linkEl.attr('href') || '';
    const idMatch = href.match(/id=(\d+)/);
    const id = idMatch ? parseInt(idMatch[1], 10) : 0;
    const fullname = cleanHtmlText(linkEl.text() || $el.find('.coursename').text());

    if (id && fullname) {
      const progressText = $el.find('.progress-bar, [data-region="progress"]').text().trim();
      const progressMatch = progressText.match(/(\d+)%/);
      const progress = progressMatch ? parseInt(progressMatch[1], 10) : null;

      courses.push({
        id,
        fullname,
        shortname: '',
        progress,
        hasprogress: progress !== null,
        completed: progress === 100,
        viewurl: href,
      });
    }
  });

  return courses;
}

/**
 * Parser khusus untuk halaman pencarian matakuliah LMS Moodle:
 * https://lms.uinjakarta.id/course/search.php
 * https://lms.uinjakarta.id/course/index.php
 */
export function parseSearchCoursesFromHtml(html: string): LmsSearchCourseItem[] {
  if (!html || typeof html !== 'string') return [];
  const $ = cheerio.load(html);
  const results: LmsSearchCourseItem[] = [];

  $('.coursebox').each((_, el) => {
    const $el = $(el);
    const dataId = $el.attr('data-courseid');
    const linkEl = $el.find('.coursename a, h3 a, a.aalink').first();
    const href = linkEl.attr('href') || '';
    const name = cleanHtmlText(linkEl.text());

    let id = dataId ? parseInt(dataId, 10) : 0;
    if (!id && href) {
      const match = href.match(/id=(\d+)/);
      if (match) id = parseInt(match[1], 10);
    }

    if (!name && !id) return;

    const infoHref = $el.find('.moreinfo a').first().attr('href') || '';
    const isSelfEnrol =
      $el.find('.enrolmenticons .fa-key').length > 0 ||
      $el.find('.enrolmenticons [title*="Self enrolment" i]').length > 0;

    const summary = cleanHtmlText($el.find('.content .summary, .summary').text());

    results.push({
      id,
      name,
      url: href.startsWith('http')
        ? href
        : `https://lms.uinjakarta.id${href.startsWith('/') ? '' : '/'}${href}`,
      infoUrl: infoHref
        ? (infoHref.startsWith('http')
            ? infoHref
            : `https://lms.uinjakarta.id${infoHref.startsWith('/') ? '' : '/'}${infoHref}`)
        : undefined,
      isSelfEnrol,
      summary: summary || undefined,
    });
  });

  return results;
}

