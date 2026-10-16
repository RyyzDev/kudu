export interface LmsUser {
  id: number;
  name: string;
  avatar?: string;
}

export interface LmsCourse {
  id: number;
  fullname: string;
  shortname: string;
  progress: number | null;
  hasprogress: boolean;
  completed: boolean;
  courseimage?: string;
  viewurl: string;
  coursecategory?: string;
}

export interface LmsAssignment {
  id: number;
  name: string;
  activityname: string;
  modulename: string; // 'assign' | 'quiz' | 'workshop' | etc.
  course?: {
    id: number;
    fullname: string;
    shortname: string;
  } | null;
  timesort: number; // Unix timestamp in seconds
  formattedtime?: string;
  action?: {
    name: string;
    url: string;
  } | null;
  overdue: boolean;
  isactionevent?: boolean;
}

export interface LmsDataState {
  user: LmsUser | null;
  courses: LmsCourse[];
  assignments: LmsAssignment[];
  sesskey?: string;
  lastSyncedAt: number | null;
  isConnected: boolean;
}

export interface LmsSearchCourseItem {
  id: number;
  name: string;
  url: string;
  infoUrl?: string;
  isSelfEnrol: boolean;
  summary?: string;
  categoryId?: number;
  categoryName?: string;
}

export interface LmsCourseCategory {
  id: number;
  name: string;
  path: string;
}

export const LMS_CATEGORIES: LmsCourseCategory[] = [
  { id: 0, name: 'Semua', path: '/course/index.php' },
  { id: 2, name: 'Wajib', path: '/course/index.php?categoryid=2' },
  { id: 3, name: 'Pilihan', path: '/course/index.php?categoryid=3' },
  { id: 4, name: 'MOOCs', path: '/course/index.php?categoryid=4' },
  { id: 5, name: 'Magang / PKL', path: '/course/index.php?categoryid=5' },
  { id: 6, name: 'Tugas Akhir', path: '/course/index.php?categoryid=6' },
  { id: 7, name: 'Praktikum', path: '/course/index.php?categoryid=7' },
  { id: 8, name: 'KKN / PkM', path: '/course/index.php?categoryid=8' },
];

export type LmsSyncMessage =
  | {
      type: 'LMS_SYNC_SUCCESS';
      payload: {
        user: LmsUser;
        courses: LmsCourse[];
        assignments: LmsAssignment[];
        sesskey?: string;
        syncedAt: number;
      };
    }
  | {
      type: 'LMS_SESSION_EXPIRED';
    }
  | {
      type: 'LMS_SYNC_ERROR';
      error: string;
    }
  | {
      type: 'LMS_FETCH_URL_RESULT';
      requestId: string;
      html?: string;
      error?: string;
    };
