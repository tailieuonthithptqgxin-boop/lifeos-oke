import { apiCall } from './apiClient';

export interface OnlineClassItem {
  id: string;
  title: string;
  description?: string | null;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  status: 'SCHEDULED' | 'CANCELLED';
  meetUrl?: string | null;
  meetSource: 'GOOGLE_CALENDAR' | 'MANUAL_LINK' | 'NONE';
  googleEventLink?: string | null;
  isHost: boolean;
  hostName?: string;
  participants: Array<{ email: string; registered: boolean }>;
}

export interface GoogleIntegrationStatus {
  success: boolean;
  configuredOnServer: boolean;
  connected: boolean;
  googleEmail: string | null;
  status: 'ACTIVE' | 'REVOKED' | 'DISCONNECTED' | 'ERROR';
  lastError: string | null;
  redirectUri: string;
  scopes: string[];
}

export const classroomApi = {
  // Google integration
  getGoogleStatus: () =>
    apiCall<GoogleIntegrationStatus>('/api/classroom/google/status'),

  getAuthUrl: () =>
    apiCall<{ success: boolean; url: string }>('/api/classroom/google/auth-url'),

  disconnectGoogle: () =>
    apiCall<{ success: boolean; message: string; revoked: boolean }>('/api/classroom/google', 'DELETE'),

  // Classes
  listClasses: (scope: 'upcoming' | 'history' = 'upcoming') =>
    apiCall<{ success: boolean; classes: OnlineClassItem[] }>(`/api/classroom/classes?scope=${scope}`),

  createClass: (data: {
    title: string;
    description?: string;
    startAt: string;
    durationMinutes: number;
    meetMode: 'GOOGLE_CALENDAR' | 'MANUAL_LINK' | 'NONE';
    meetUrl?: string;
    participantEmails?: string[];
  }) =>
    apiCall<{ success: boolean; message: string; class: OnlineClassItem }>('/api/classroom/classes', 'POST', data),

  updateClass: (id: string, data: {
    title?: string;
    description?: string;
    startAt?: string;
    durationMinutes?: number;
    participantEmails?: string[];
  }) =>
    apiCall<{ success: boolean; message: string; class: OnlineClassItem }>(`/api/classroom/classes/${id}`, 'PATCH', data),

  cancelClass: (id: string) =>
    apiCall<{ success: boolean; message: string; class: OnlineClassItem }>(`/api/classroom/classes/${id}`, 'DELETE'),

  createPrepTask: (id: string) =>
    apiCall<{ success: boolean; message: string; task: { id: string; title: string } }>(`/api/classroom/classes/${id}/prep-task`, 'POST'),

  recordStudySession: (id: string, data: { durationMinutes: number; notes?: string }) =>
    apiCall<{
      success: boolean;
      message: string;
      recordedMinutes: number;
      totalStudyMinutes: number;
      weeklyStudyMinutes: number;
      xpEarned: number;
    }>(`/api/classroom/classes/${id}/record-session`, 'POST', data)
};
