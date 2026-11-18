import crypto from 'crypto';
import { getPrisma } from '../db.js';
import { getJwtSecret } from '../auth.middleware.js';

/**
 * Online Classroom service.
 *
 * Google Meet links are created through the official Google Calendar API:
 *   POST https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1
 *   body.conferenceData.createRequest = { requestId, conferenceSolutionKey: { type: 'hangoutsMeet' } }
 * The resulting Meet URL is returned in `hangoutLink` / `conferenceData.entryPoints[type=video]`.
 *
 * Required OAuth scope (minimum): https://www.googleapis.com/auth/calendar.events
 * Plus openid/email to identify which Google account was connected.
 *
 * Tokens are only stored in the database and never returned to the frontend.
 * If Google fails, NO fake meeting link is generated; the error is surfaced.
 */

const GOOGLE_SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/calendar.events'
];

const STATE_TTL_MS = 10 * 60 * 1000;
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const REMINDER_LEAD_MINUTES = 15;
const GOOGLE_TIMEOUT_MS = 15000;

export class ClassroomError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function getAppUrl(): string {
  return (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}

export function getClassroomRedirectUri(origin?: string): string {
  // 1. Explicit override if set
  if (process.env.GOOGLE_CLASSROOM_REDIRECT_URI && process.env.GOOGLE_CLASSROOM_REDIRECT_URI.trim()) {
    return process.env.GOOGLE_CLASSROOM_REDIRECT_URI.trim();
  }

  // 2. Extract pathname from configured callback
  const configuredCallback = (process.env.GOOGLE_CALLBACK_URL || '').trim();
  let callbackPath = '/api/auth/google/callback';
  if (configuredCallback) {
    if (configuredCallback.startsWith('/')) {
      callbackPath = configuredCallback;
    } else {
      try {
        callbackPath = new URL(configuredCallback).pathname;
      } catch {
        callbackPath = '/api/auth/google/callback';
      }
    }
  }

  // 3. Adapt dynamically based on client origin (supports both Localhost and Cloudflare Tunnel)
  if (origin) {
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return `http://localhost:3000${callbackPath}`;
    }
    return `${origin}${callbackPath}`;
  }

  if (configuredCallback && !configuredCallback.startsWith('/')) {
    return configuredCallback;
  }

  const base = getAppUrl();
  return `${base}${callbackPath}`;
}

function getGoogleCreds(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

/** HMAC-signed, expiring OAuth state so a callback cannot be forged for another user. */
function signState(userId: string, redirectUri?: string): string {
  const payload = Buffer.from(JSON.stringify({
    u: userId,
    t: Date.now(),
    n: crypto.randomBytes(8).toString('hex'),
    r: redirectUri || ''
  })).toString('base64url');
  const sig = crypto.createHmac('sha256', getJwtSecret()).update(payload).digest('base64url');
  return `cls_${payload}.${sig}`;
}

function verifyState(state: string): { userId: string; redirectUri?: string } {
  let cleanState = String(state || '');
  if (cleanState.startsWith('cls_')) {
    cleanState = cleanState.slice(4);
  }
  const [payload, sig] = cleanState.split('.');
  if (!payload || !sig) throw new ClassroomError(400, 'INVALID_STATE', 'Yêu cầu kết nối không hợp lệ.');
  const expected = crypto.createHmac('sha256', getJwtSecret()).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new ClassroomError(400, 'INVALID_STATE', 'Chữ ký yêu cầu kết nối không hợp lệ.');
  }
  const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
  if (!decoded.u || Date.now() - Number(decoded.t) > STATE_TTL_MS) {
    throw new ClassroomError(400, 'STATE_EXPIRED', 'Yêu cầu kết nối đã hết hạn. Vui lòng thử lại.');
  }
  return { userId: decoded.u as string, redirectUri: decoded.r || undefined };
}

async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GOOGLE_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new ClassroomError(504, 'GOOGLE_TIMEOUT', 'Google không phản hồi kịp. Vui lòng thử lại.');
    }
    throw new ClassroomError(502, 'GOOGLE_NETWORK', `Không thể kết nối tới Google: ${err?.message || err}`);
  } finally {
    clearTimeout(timer);
  }
}

/** Convert a Date into VN-local date "YYYY-MM-DD" and time "HH:mm" (matches CalendarEvent format). */
function toVnDateParts(d: Date): { date: string; time: string } {
  const vn = new Date(d.getTime() + VN_OFFSET_MS);
  const iso = vn.toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

function normalizeEmails(input: unknown): string[] {
  const raw = Array.isArray(input) ? input : String(input || '').split(/[,;\s]+/);
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const set = new Set<string>();
  for (const item of raw) {
    const e = String(item || '').trim().toLowerCase();
    if (e && re.test(e)) set.add(e);
  }
  return Array.from(set).slice(0, 50);
}

function isValidMeetUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && (u.hostname === 'meet.google.com');
  } catch {
    return false;
  }
}

export class ClassroomService {
  // ---------------------------------------------------------------
  // Google connection
  // ---------------------------------------------------------------
  getClassroomRedirectUri(origin?: string): string {
    return getClassroomRedirectUri(origin);
  }

  async getGoogleStatus(userId: string, origin?: string) {
    const prisma = getPrisma();
    const integ = await prisma.googleCalendarIntegration.findUnique({ where: { userId } });
    return {
      configuredOnServer: !!getGoogleCreds(),
      connected: !!integ && integ.status === 'ACTIVE' && !!integ.refreshToken,
      googleEmail: integ?.googleEmail || null,
      status: integ?.status || 'DISCONNECTED',
      lastError: integ?.lastError || null,
      redirectUri: getClassroomRedirectUri(origin),
      scopes: GOOGLE_SCOPES
    };
  }

  buildAuthUrl(userId: string, origin?: string): string {
    const creds = getGoogleCreds();
    if (!creds) {
      throw new ClassroomError(503, 'GOOGLE_NOT_CONFIGURED', 'Máy chủ chưa cấu hình GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.');
    }
    const redirectUri = getClassroomRedirectUri(origin);
    const params = new URLSearchParams({
      client_id: creds.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: GOOGLE_SCOPES.join(' '),
      access_type: 'offline',
      include_granted_scopes: 'true',
      prompt: 'consent',
      state: signState(userId, redirectUri)
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async handleCallback(code: string, state: string, fallbackRedirectUri?: string): Promise<{ email: string }> {
    const { userId, redirectUri: stateRedirectUri } = verifyState(state);
    const creds = getGoogleCreds();
    if (!creds) throw new ClassroomError(503, 'GOOGLE_NOT_CONFIGURED', 'Máy chủ chưa cấu hình Google OAuth.');

    const finalRedirectUri = stateRedirectUri || fallbackRedirectUri || getClassroomRedirectUri();

    const tokenRes = await fetchWithTimeout('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        redirect_uri: finalRedirectUri,
        grant_type: 'authorization_code'
      }).toString()
    });
    const tokenData: any = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new ClassroomError(400, 'TOKEN_EXCHANGE_FAILED', tokenData.error_description || tokenData.error || 'Không thể trao đổi mã xác thực với Google.');
    }

    const grantedScopes = String(tokenData.scope || '');
    if (!grantedScopes.includes('calendar.events')) {
      throw new ClassroomError(403, 'SCOPE_DENIED', 'Bạn chưa cấp quyền quản lý sự kiện Google Calendar, nên LifeOS không thể tạo Google Meet.');
    }

    const infoRes = await fetchWithTimeout('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const info: any = await infoRes.json().catch(() => ({}));
    const email = String(info.email || '').toLowerCase();
    if (!email) throw new ClassroomError(400, 'NO_EMAIL', 'Không đọc được email tài khoản Google.');

    const prisma = getPrisma();
    const expiry = tokenData.expires_in ? new Date(Date.now() + Number(tokenData.expires_in) * 1000) : null;
    await prisma.googleCalendarIntegration.upsert({
      where: { userId },
      update: {
        googleEmail: email,
        accessToken: tokenData.access_token,
        ...(tokenData.refresh_token ? { refreshToken: tokenData.refresh_token } : {}),
        tokenExpiry: expiry,
        scopes: grantedScopes,
        status: 'ACTIVE',
        lastError: null
      },
      create: {
        userId,
        googleEmail: email,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        tokenExpiry: expiry,
        scopes: grantedScopes,
        status: 'ACTIVE'
      }
    });
    return { email };
  }

  async disconnectGoogle(userId: string) {
    const prisma = getPrisma();
    const integ = await prisma.googleCalendarIntegration.findUnique({ where: { userId } });
    if (!integ) return { revoked: false };
    const token = integ.refreshToken || integ.accessToken;
    if (token) {
      await fetchWithTimeout(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }).catch(() => undefined);
    }
    await prisma.googleCalendarIntegration.delete({ where: { userId } });
    return { revoked: true };
  }

  /** Returns a valid access token, refreshing it when expired. Marks integration REVOKED if Google rejects the refresh token. */
  private async getAccessToken(userId: string): Promise<string> {
    const prisma = getPrisma();
    const integ = await prisma.googleCalendarIntegration.findUnique({ where: { userId } });
    if (!integ || integ.status !== 'ACTIVE' || !integ.refreshToken) {
      throw new ClassroomError(412, 'GOOGLE_NOT_CONNECTED', 'Bạn cần kết nối Google Calendar để tạo Google Meet.');
    }
    const stillValid = integ.accessToken && integ.tokenExpiry && integ.tokenExpiry.getTime() - Date.now() > 60_000;
    if (stillValid) return integ.accessToken as string;

    const creds = getGoogleCreds();
    if (!creds) throw new ClassroomError(503, 'GOOGLE_NOT_CONFIGURED', 'Máy chủ chưa cấu hình Google OAuth.');
    const res = await fetchWithTimeout('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        refresh_token: integ.refreshToken,
        grant_type: 'refresh_token'
      }).toString()
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || !data.access_token) {
      const revoked = data.error === 'invalid_grant';
      await prisma.googleCalendarIntegration.update({
        where: { userId },
        data: { status: revoked ? 'REVOKED' : 'ERROR', lastError: data.error_description || data.error || 'refresh_failed' }
      });
      throw new ClassroomError(412, revoked ? 'GOOGLE_REVOKED' : 'GOOGLE_REFRESH_FAILED',
        revoked ? 'Quyền truy cập Google đã bị thu hồi. Vui lòng kết nối lại.' : 'Không thể làm mới phiên Google. Vui lòng thử lại.');
    }
    await prisma.googleCalendarIntegration.update({
      where: { userId },
      data: {
        accessToken: data.access_token,
        tokenExpiry: new Date(Date.now() + Number(data.expires_in || 3600) * 1000),
        status: 'ACTIVE',
        lastError: null
      }
    });
    return data.access_token;
  }

  private async googleCalendarRequest(userId: string, method: string, path: string, body?: any): Promise<any> {
    const token = await this.getAccessToken(userId);
    const res = await fetchWithTimeout(`https://www.googleapis.com/calendar/v3${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });
    if (res.status === 204) return null;
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.error?.message || `Google Calendar API lỗi ${res.status}`;
      if (res.status === 401 || res.status === 403) {
        await getPrisma().googleCalendarIntegration.update({ where: { userId }, data: { lastError: msg } }).catch(() => undefined);
      }
      if (res.status === 429) throw new ClassroomError(429, 'GOOGLE_RATE_LIMIT', 'Google đang giới hạn tần suất yêu cầu. Vui lòng thử lại sau ít phút.');
      throw new ClassroomError(res.status === 404 ? 404 : 502, 'GOOGLE_API_ERROR', msg);
    }
    return data;
  }

  // ---------------------------------------------------------------
  // Classes
  // ---------------------------------------------------------------
  private validateInput(input: any, partial = false) {
    const title = String(input.title ?? '').trim();
    if (!partial || input.title !== undefined) {
      if (title.length < 3 || title.length > 150) throw new ClassroomError(400, 'INVALID_TITLE', 'Tên lớp học cần từ 3 đến 150 ký tự.');
    }
    let startAt: Date | undefined;
    if (!partial || input.startAt !== undefined) {
      startAt = new Date(input.startAt);
      if (isNaN(startAt.getTime())) throw new ClassroomError(400, 'INVALID_TIME', 'Thời gian bắt đầu không hợp lệ.');
      if (!partial && startAt.getTime() < Date.now() - 5 * 60_000) throw new ClassroomError(400, 'PAST_TIME', 'Không thể tạo lớp học trong quá khứ.');
    }
    let duration: number | undefined;
    if (!partial || input.durationMinutes !== undefined) {
      duration = Number(input.durationMinutes ?? 60);
      if (!Number.isInteger(duration) || duration < 15 || duration > 480) throw new ClassroomError(400, 'INVALID_DURATION', 'Thời lượng cần từ 15 đến 480 phút.');
    }
    const description = input.description !== undefined ? String(input.description || '').slice(0, 2000) : undefined;
    return { title, startAt, duration, description };
  }

  private buildGoogleEventBody(c: { title: string; description?: string | null; startAt: Date; durationMinutes: number }, emails: string[]) {
    const end = new Date(c.startAt.getTime() + c.durationMinutes * 60_000);
    return {
      summary: c.title,
      description: `${c.description || ''}\n\nTạo từ LifeOS Online Classroom.`.trim(),
      start: { dateTime: c.startAt.toISOString(), timeZone: 'Asia/Ho_Chi_Minh' },
      end: { dateTime: end.toISOString(), timeZone: 'Asia/Ho_Chi_Minh' },
      attendees: emails.map(email => ({ email }))
    };
  }

  async createClass(hostId: string, input: any) {
    const prisma = getPrisma();
    const v = this.validateInput(input);
    const emails = normalizeEmails(input.participantEmails);
    const mode = input.meetMode === 'MANUAL_LINK' ? 'MANUAL_LINK' : input.meetMode === 'NONE' ? 'NONE' : 'GOOGLE_CALENDAR';

    let meetUrl: string | null = null;
    let googleEventId: string | null = null;
    let googleEventLink: string | null = null;

    if (mode === 'GOOGLE_CALENDAR') {
      // Real Meet creation via Calendar API. Errors propagate: no class is saved with a fake link.
      const body: any = this.buildGoogleEventBody({ title: v.title, description: v.description, startAt: v.startAt!, durationMinutes: v.duration! }, emails);
      body.conferenceData = {
        createRequest: { requestId: crypto.randomUUID(), conferenceSolutionKey: { type: 'hangoutsMeet' } }
      };
      const event = await this.googleCalendarRequest(hostId, 'POST', '/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all', body);
      const videoEntry = (event?.conferenceData?.entryPoints || []).find((e: any) => e.entryPointType === 'video');
      meetUrl = event?.hangoutLink || videoEntry?.uri || null;
      googleEventId = event?.id || null;
      googleEventLink = event?.htmlLink || null;
      if (!meetUrl) {
        // Conference may still be pending; fetch once more before giving up.
        if (googleEventId) {
          const again = await this.googleCalendarRequest(hostId, 'GET', `/calendars/primary/events/${encodeURIComponent(googleEventId)}`);
          meetUrl = again?.hangoutLink || null;
        }
        if (!meetUrl) {
          throw new ClassroomError(502, 'MEET_NOT_CREATED', 'Google đã tạo sự kiện nhưng chưa trả về link Meet (tài khoản có thể không hỗ trợ Google Meet). Sự kiện vẫn nằm trong Google Calendar của bạn.');
        }
      }
    } else if (mode === 'MANUAL_LINK') {
      const link = String(input.meetUrl || '').trim();
      if (!isValidMeetUrl(link)) throw new ClassroomError(400, 'INVALID_MEET_URL', 'Link phải là địa chỉ https://meet.google.com/... hợp lệ.');
      meetUrl = link;
    }

    const { date, time } = toVnDateParts(v.startAt!);
    const endParts = toVnDateParts(new Date(v.startAt!.getTime() + v.duration! * 60_000));

    const created = await prisma.$transaction(async tx => {
      const calendarEvent = await tx.calendarEvent.create({
        data: {
          userId: hostId,
          title: `🎓 ${v.title}`,
          description: [v.description, meetUrl ? `Google Meet: ${meetUrl}` : null].filter(Boolean).join('\n'),
          date,
          startTime: time,
          endTime: endParts.time,
          type: 'Lớp học',
          color: '#10b981',
          reminder: String(REMINDER_LEAD_MINUTES)
        }
      });

      const registered = emails.length
        ? await tx.user.findMany({ where: { email: { in: emails } }, select: { id: true, email: true } })
        : [];
      const userByEmail = new Map(registered.map(u => [u.email.toLowerCase(), u.id]));

      const cls = await tx.onlineClass.create({
        data: {
          hostId,
          title: v.title,
          description: v.description || null,
          startAt: v.startAt!,
          durationMinutes: v.duration!,
          meetUrl,
          meetSource: mode,
          googleEventId,
          googleEventLink,
          calendarEventId: calendarEvent.id,
          participants: {
            create: emails.map(email => ({ email, userId: userByEmail.get(email) || null }))
          }
        },
        include: { participants: true }
      });

      const invitees = cls.participants.filter(p => p.userId && p.userId !== hostId);
      if (invitees.length) {
        await tx.notification.createMany({
          data: invitees.map(p => ({
            userId: p.userId!,
            title: 'Bạn được mời tham gia lớp học',
            message: `${v.title} — ${date} lúc ${time}`,
            type: 'info',
            category: 'CALENDAR',
            actionUrl: '/?view=classroom',
            actionLabel: 'Xem lớp học'
          }))
        });
      }
      return cls;
    });

    return this.serialize(created, hostId);
  }

  async listClasses(userId: string, scope: 'upcoming' | 'history') {
    const prisma = getPrisma();
    const me = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    const email = (me?.email || '').toLowerCase();
    const now = new Date();
    // A class counts as "upcoming" until it has ended (start + duration). Use a 8h window
    // in SQL (max duration), then filter precisely in memory.
    const windowStart = new Date(now.getTime() - 480 * 60_000);
    const where: any = {
      OR: [{ hostId: userId }, { participants: { some: { OR: [{ userId }, { email }] } } }]
    };
    if (scope === 'upcoming') {
      where.status = 'SCHEDULED';
      where.startAt = { gte: windowStart };
    } else {
      where.OR = where.OR;
      where.AND = [{ OR: [{ startAt: { lt: now } }, { status: 'CANCELLED' }] }];
    }
    const rows = await prisma.onlineClass.findMany({
      where,
      include: { participants: true },
      orderBy: { startAt: scope === 'upcoming' ? 'asc' : 'desc' },
      take: 100
    });
    const hostIds = Array.from(new Set(rows.map(r => r.hostId)));
    const hosts = hostIds.length
      ? await prisma.user.findMany({ where: { id: { in: hostIds } }, select: { id: true, name: true } })
      : [];
    const hostName = new Map(hosts.map(h => [h.id, h.name]));

    return rows
      .filter(r => {
        const end = r.startAt.getTime() + r.durationMinutes * 60_000;
        if (scope === 'upcoming') return end >= now.getTime();
        return r.status === 'CANCELLED' || end < now.getTime();
      })
      .map(r => ({ ...this.serialize(r, userId), hostName: hostName.get(r.hostId) || 'Giáo viên' }));
  }

  private async getOwnedClass(userId: string, classId: string) {
    const prisma = getPrisma();
    const cls = await prisma.onlineClass.findUnique({ where: { id: classId }, include: { participants: true } });
    if (!cls) throw new ClassroomError(404, 'NOT_FOUND', 'Không tìm thấy lớp học.');
    if (cls.hostId !== userId) throw new ClassroomError(403, 'FORBIDDEN', 'Chỉ người tạo lớp mới có quyền thực hiện thao tác này.');
    return cls;
  }

  async updateClass(userId: string, classId: string, input: any) {
    const prisma = getPrisma();
    const cls = await this.getOwnedClass(userId, classId);
    if (cls.status === 'CANCELLED') throw new ClassroomError(409, 'CANCELLED', 'Lớp học đã bị hủy.');
    const v = this.validateInput(input, true);
    const next = {
      title: input.title !== undefined ? v.title : cls.title,
      description: v.description !== undefined ? v.description : cls.description,
      startAt: v.startAt || cls.startAt,
      durationMinutes: v.duration ?? cls.durationMinutes
    };
    const emails = input.participantEmails !== undefined ? normalizeEmails(input.participantEmails) : cls.participants.map(p => p.email);

    if (cls.googleEventId) {
      await this.googleCalendarRequest(userId, 'PATCH',
        `/calendars/primary/events/${encodeURIComponent(cls.googleEventId)}?sendUpdates=all`,
        this.buildGoogleEventBody(next, emails));
    }

    const { date, time } = toVnDateParts(next.startAt);
    const endParts = toVnDateParts(new Date(next.startAt.getTime() + next.durationMinutes * 60_000));

    const updated = await prisma.$transaction(async tx => {
      if (cls.calendarEventId) {
        await tx.calendarEvent.updateMany({
          where: { id: cls.calendarEventId, userId },
          data: { title: `🎓 ${next.title}`, date, startTime: time, endTime: endParts.time }
        });
      }
      if (input.participantEmails !== undefined) {
        const registered = emails.length ? await tx.user.findMany({ where: { email: { in: emails } }, select: { id: true, email: true } }) : [];
        const map = new Map(registered.map(u => [u.email.toLowerCase(), u.id]));
        await tx.onlineClassParticipant.deleteMany({ where: { classId, email: { notIn: emails } } });
        for (const email of emails) {
          await tx.onlineClassParticipant.upsert({
            where: { classId_email: { classId, email } },
            update: { userId: map.get(email) || null },
            create: { classId, email, userId: map.get(email) || null }
          });
        }
      }
      return tx.onlineClass.update({
        where: { id: classId },
        data: {
          title: next.title,
          description: next.description,
          startAt: next.startAt,
          durationMinutes: next.durationMinutes,
          ...(v.startAt ? { reminderSentAt: null } : {})
        },
        include: { participants: true }
      });
    });
    return this.serialize(updated, userId);
  }

  async cancelClass(userId: string, classId: string) {
    const prisma = getPrisma();
    const cls = await this.getOwnedClass(userId, classId);
    if (cls.status === 'CANCELLED') return this.serialize(cls, userId);
    if (cls.googleEventId) {
      try {
        await this.googleCalendarRequest(userId, 'DELETE', `/calendars/primary/events/${encodeURIComponent(cls.googleEventId)}?sendUpdates=all`);
      } catch (err: any) {
        // Event already deleted in Google (404/410) is fine; anything else must be surfaced.
        if (!(err instanceof ClassroomError) || err.status !== 404) throw err;
      }
    }
    const updated = await prisma.$transaction(async tx => {
      if (cls.calendarEventId) {
        await tx.calendarEvent.updateMany({ where: { id: cls.calendarEventId, userId }, data: { status: 'Đã hủy' } });
      }
      const invitees = cls.participants.filter(p => p.userId && p.userId !== userId);
      if (invitees.length) {
        await tx.notification.createMany({
          data: invitees.map(p => ({
            userId: p.userId!,
            title: 'Lớp học đã bị hủy',
            message: cls.title,
            type: 'warning',
            category: 'CALENDAR',
            actionUrl: '/?view=classroom'
          }))
        });
      }
      return tx.onlineClass.update({ where: { id: classId }, data: { status: 'CANCELLED' }, include: { participants: true } });
    });
    return this.serialize(updated, userId);
  }

  /** Creates a "prepare for class" task for the requesting user only (never for other participants). */
  async createPrepTask(userId: string, classId: string) {
    const prisma = getPrisma();
    const me = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    const cls = await prisma.onlineClass.findUnique({ where: { id: classId }, include: { participants: true } });
    if (!cls) throw new ClassroomError(404, 'NOT_FOUND', 'Không tìm thấy lớp học.');
    const isMember = cls.hostId === userId || cls.participants.some(p => p.userId === userId || p.email === (me?.email || '').toLowerCase());
    if (!isMember) throw new ClassroomError(403, 'FORBIDDEN', 'Bạn không thuộc lớp học này.');
    const { date } = toVnDateParts(cls.startAt);
    const task = await prisma.task.create({
      data: {
        userId,
        title: `Chuẩn bị bài: ${cls.title}`,
        description: cls.description || undefined,
        dueDate: date
      } as any
    });
    return { id: task.id, title: task.title };
  }

  private serialize(c: any, viewerId: string) {
    return {
      id: c.id,
      title: c.title,
      description: c.description,
      startAt: c.startAt.toISOString(),
      endAt: new Date(c.startAt.getTime() + c.durationMinutes * 60_000).toISOString(),
      durationMinutes: c.durationMinutes,
      status: c.status,
      meetUrl: c.meetUrl,
      meetSource: c.meetSource,
      googleEventLink: c.hostId === viewerId ? c.googleEventLink : null,
      isHost: c.hostId === viewerId,
      participants: (c.participants || []).map((p: any) => ({ email: p.email, registered: !!p.userId }))
    };
  }

  // ---------------------------------------------------------------
  // Reminders (in-app notifications REMINDER_LEAD_MINUTES before start)
  // ---------------------------------------------------------------
  async sendDueReminders(): Promise<number> {
    const prisma = getPrisma();
    const now = new Date();
    const horizon = new Date(now.getTime() + REMINDER_LEAD_MINUTES * 60_000);
    const due = await prisma.onlineClass.findMany({
      where: { status: 'SCHEDULED', reminderSentAt: null, startAt: { gt: now, lte: horizon } },
      include: { participants: true },
      take: 200
    });
    let sent = 0;
    for (const cls of due) {
      // Claim atomically so multiple workers never double-send.
      const claim = await prisma.onlineClass.updateMany({ where: { id: cls.id, reminderSentAt: null }, data: { reminderSentAt: now } });
      if (claim.count === 0) continue;
      const userIds = new Set<string>([cls.hostId]);
      cls.participants.forEach(p => { if (p.userId) userIds.add(p.userId); });
      const mins = Math.max(1, Math.round((cls.startAt.getTime() - now.getTime()) / 60_000));
      await prisma.notification.createMany({
        data: Array.from(userIds).map(uid => ({
          userId: uid,
          title: `Lớp học bắt đầu sau ${mins} phút`,
          message: cls.title,
          type: 'info',
          priority: 'IMPORTANT',
          category: 'CALENDAR',
          actionUrl: cls.meetUrl || '/?view=classroom',
          actionLabel: cls.meetUrl ? 'Vào Google Meet' : 'Xem lớp học'
        }))
      });
      sent += userIds.size;
    }
    return sent;
  }

  // ---------------------------------------------------------------
  // Record Study Session (updates study metrics & history)
  // ---------------------------------------------------------------
  async recordStudySession(userId: string, classId: string, durationMinutes: number, notes?: string) {
    if (durationMinutes < 1) {
      return { success: true, recordedMinutes: 0, totalStudyMinutes: 0, weeklyStudyMinutes: 0, xpEarned: 0 };
    }
    const prisma = getPrisma();
    const clampedMinutes = Math.min(Math.max(1, Math.round(durationMinutes)), 480);
    const today = new Date().toISOString().split('T')[0];

    // Atomically increment user study minutes
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        totalStudyMinutes: { increment: clampedMinutes },
        weeklyStudyMinutes: { increment: clampedMinutes },
        lastStudyDate: new Date(),
      },
      select: {
        id: true,
        totalStudyMinutes: true,
        weeklyStudyMinutes: true,
      }
    });

    // Check if class exists to get title
    const onlineClass = await prisma.onlineClass.findUnique({
      where: { id: classId },
      select: { title: true }
    });

    // Find or link default subject for study session
    const defaultSubject = await prisma.subject.findFirst({
      where: { userId },
      select: { id: true }
    });

    if (defaultSubject) {
      await prisma.studySession.create({
        data: {
          userId,
          subjectId: defaultSubject.id,
          durationMinutes: clampedMinutes,
          date: today,
          notes: notes || `Lớp học trực tuyến: ${onlineClass?.title || 'Phòng học Google Meet'} (${clampedMinutes} phút)`
        }
      });
    }

    // Award XP in UserProgression
    let xpEarned = Math.round(clampedMinutes * 2);
    try {
      const prog = await prisma.userProgression.findUnique({ where: { userId } });
      if (prog) {
        await prisma.userProgression.update({
          where: { userId },
          data: { totalXp: { increment: xpEarned } }
        });
      }
    } catch (e) {}

    // Award Study Pet EXP & Food
    try {
      const { petService } = await import('./pet.service.js');
      await petService.awardStudySession(userId, clampedMinutes);
    } catch (e) {}

    return {
      success: true,
      recordedMinutes: clampedMinutes,
      totalStudyMinutes: updatedUser.totalStudyMinutes,
      weeklyStudyMinutes: updatedUser.weeklyStudyMinutes,
      xpEarned
    };
  }
}

export const classroomService = new ClassroomService();

let reminderTimer: NodeJS.Timeout | null = null;
export function startClassroomReminderLoop(intervalMs = 60_000) {
  if (reminderTimer) return;
  reminderTimer = setInterval(() => {
    classroomService.sendDueReminders().catch(err => console.warn('[Classroom] reminder loop error:', err?.message || err));
  }, intervalMs);
  reminderTimer.unref?.();
}
