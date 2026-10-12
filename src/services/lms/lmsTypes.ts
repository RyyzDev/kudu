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
    };
