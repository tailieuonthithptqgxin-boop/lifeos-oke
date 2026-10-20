import { getPrisma } from '../db.js';
import { gmailService, resolveHostToIPv4, GmailSmtpConfig } from './gmailNotification.service.js';
import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';

export type EmailQueueStatus = 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED';

export interface EmailQueueItem {
  id: string;
  recipient: string;
  subject: string;
  htmlBody: string;
  eventType: string;
  status: EmailQueueStatus;
  retryCount: number;
  lastError: string | null;
  nextRetryAt: Date | null;
  metadata: string | null;
  createdAt: Date;
  sentAt: Date | null;
}

export interface EnqueueEmailOptions {
  recipient: string;
  subject: string;
  htmlBody: string;
  eventType: string;
  metadata?: Record<string, any>;
  priority?: 'NORMAL' | 'HIGH' | 'CRITICAL';
  isTestData?: boolean;
}

const RETRY_BACKOFF_SECONDS = [15, 60, 300, 900, 1800]; // 15s, 1m, 5m, 15m, 30m
const MAX_RETRIES = 5;

class EmailQueueService {
  private isProcessing = false;
  private workerInterval: NodeJS.Timeout | null = null;
  private tableInitialized = false;

  /**
   * Auto-heals / ensures the email_queue table exists in PostgreSQL
   */
  async initEmailQueueTable(): Promise<void> {
    if (this.tableInitialized) return;

    try {
      const prisma = getPrisma();
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS email_queue (
          id VARCHAR(64) PRIMARY KEY,
          recipient VARCHAR(255) NOT NULL,
          subject VARCHAR(500) NOT NULL,
          html_body TEXT NOT NULL,
          event_type VARCHAR(100) NOT NULL,
          status VARCHAR(50) DEFAULT 'PENDING' NOT NULL,
          retry_count INT DEFAULT 0 NOT NULL,
          last_error TEXT,
          next_retry_at TIMESTAMPTZ,
          metadata TEXT,
          is_test_data BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
          sent_at TIMESTAMPTZ
        );
      `);

      await prisma.$executeRawUnsafe(`
        ALTER TABLE email_queue ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN DEFAULT FALSE;
      `).catch(() => {});

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_email_queue_status_retry ON email_queue(status, next_retry_at);
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_email_queue_created_at ON email_queue(created_at DESC);
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_email_queue_recipient ON email_queue(recipient);
      `);

      this.tableInitialized = true;
    } catch (err: any) {
      console.warn('[EmailQueueService] Table initialization note:', err.message);
    }
  }

  /**
   * Enqueues an email into the PostgreSQL Outbox queue and triggers immediate background processing.
   * Completely Non-blocking for the caller.
   */
  async enqueue(options: EnqueueEmailOptions): Promise<string> {
    await this.initEmailQueueTable();

    const id = 'emq_' + uuidv4().replace(/-/g, '').slice(0, 20);
    const cleanRecipient = options.recipient.trim();
    const metadataStr = options.metadata ? JSON.stringify(options.metadata) : null;
    const isTestData = Boolean(options.isTestData);
    const now = new Date();

    try {
      const prisma = getPrisma();
      await prisma.$executeRawUnsafe(`
        INSERT INTO email_queue (id, recipient, subject, html_body, event_type, status, retry_count, next_retry_at, metadata, is_test_data, created_at)
        VALUES ($1, $2, $3, $4, $5, 'PENDING', 0, $6, $7, $8, $9)
      `, id, cleanRecipient, options.subject, options.htmlBody, options.eventType, now, metadataStr, isTestData, now);

      // Trigger worker asynchronously without awaiting
      setImmediate(() => {
        this.processNextBatch().catch(err => {
          console.error('[EmailQueueService] Error in immediate batch processing:', err);
        });
      });

      return id;
    } catch (err: any) {
      console.error('[EmailQueueService] Failed to enqueue email:', err);
      throw err;
    }
  }

  /**
   * Processes the next batch of pending or ready-to-retry emails
   */
  async processNextBatch(limit = 10): Promise<{ processed: number; sent: number; failed: number }> {
    if (this.isProcessing) {
      return { processed: 0, sent: 0, failed: 0 };
    }

    this.isProcessing = true;
    let processed = 0;
    let sent = 0;
    let failed = 0;

    try {
      await this.initEmailQueueTable();
      const prisma = getPrisma();
      const now = new Date();

      // Atomically select and lock eligible rows
      const items: any[] = await prisma.$queryRawUnsafe(`
        UPDATE email_queue
        SET status = 'PROCESSING'
        WHERE id IN (
          SELECT id FROM email_queue
          WHERE (status = 'PENDING' AND (next_retry_at IS NULL OR next_retry_at <= $1))
             OR (status = 'FAILED' AND retry_count < ${MAX_RETRIES} AND next_retry_at <= $1)
          ORDER BY created_at ASC
          LIMIT ${limit}
          FOR UPDATE SKIP LOCKED
        )
        RETURNING id, recipient, subject, html_body, event_type, status, retry_count, last_error, next_retry_at, metadata, created_at, sent_at
      `, now);

      if (!items || items.length === 0) {
        this.isProcessing = false;
        return { processed: 0, sent: 0, failed: 0 };
      }

      processed = items.length;

      for (const item of items) {
        try {
          const sendResult = await this.dispatchSingleEmail({
            id: item.id,
            recipient: item.recipient,
            subject: item.subject,
            htmlBody: item.html_body,
            eventType: item.event_type
          });

          if (sendResult.success) {
            sent++;
            const sentAt = new Date();
            await prisma.$executeRawUnsafe(`
              UPDATE email_queue
              SET status = 'SENT', sent_at = $1, last_error = NULL
              WHERE id = $2
            `, sentAt, item.id);

            // Sync with announcementDelivery if linked
            if (item.metadata) {
              try {
                const meta = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata;
                if (meta?.announcementDeliveryId) {
                  await prisma.announcementDelivery.update({
                    where: { id: meta.announcementDeliveryId },
                    data: { status: 'SENT', sentAt, errorMessage: null }
                  }).catch(() => {});
                }
              } catch {}
            }
          } else {
            failed++;
            await this.handleItemFailure(item, sendResult.error || 'Gửi thất bại không rõ nguyên nhân');
          }
        } catch (itemErr: any) {
          failed++;
          await this.handleItemFailure(item, itemErr.message || String(itemErr));
        }

        // Polite rate limiting: 500ms delay between sending individual emails to avoid SMTP throttle
        await new Promise(r => setTimeout(r, 500));
      }
    } catch (err: any) {
      console.error('[EmailQueueService] Error processing email batch:', err);
    } finally {
      this.isProcessing = false;
    }

    return { processed, sent, failed };
  }

  /**
   * Handles failure with Exponential Backoff retry schedule
   */
  private async handleItemFailure(item: any, errorMessage: string): Promise<void> {
    const prisma = getPrisma();
    const currentRetries = (item.retry_count || 0) + 1;
    const isExhausted = currentRetries >= MAX_RETRIES;

    const backoffSec = RETRY_BACKOFF_SECONDS[Math.min(currentRetries - 1, RETRY_BACKOFF_SECONDS.length - 1)];
    const nextRetryDate = isExhausted ? null : new Date(Date.now() + backoffSec * 1000);
    const newStatus = isExhausted ? 'FAILED' : 'PENDING';

    await prisma.$executeRawUnsafe(`
      UPDATE email_queue
      SET status = $1,
          retry_count = $2,
          last_error = $3,
          next_retry_at = $4
      WHERE id = $5
    `, newStatus, currentRetries, errorMessage.slice(0, 2000), nextRetryDate, item.id);

    // Sync with announcementDelivery if linked
    if (item.metadata) {
      try {
        const meta = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata;
        if (meta?.announcementDeliveryId) {
          await prisma.announcementDelivery.update({
            where: { id: meta.announcementDeliveryId },
            data: {
              status: isExhausted ? 'FAILED' : 'RETRYING',
              errorMessage: `[Lần thử ${currentRetries}/${MAX_RETRIES}] ${errorMessage.slice(0, 500)}`
            }
          }).catch(() => {});
        }
      } catch {}
    }

    console.warn(`[EmailQueueService] Email ${item.id} to ${item.recipient} failed (Attempt ${currentRetries}/${MAX_RETRIES}): ${errorMessage}. ${isExhausted ? 'Marked as FAILED.' : `Scheduled retry in ${backoffSec}s.`}`);
  }

  /**
   * Dispatches a single email through Nodemailer SMTP or Resend API
   */
  private async dispatchSingleEmail(item: {
    id: string;
    recipient: string;
    subject: string;
    htmlBody: string;
    eventType: string;
  }): Promise<{ success: boolean; error?: string }> {
    const config: GmailSmtpConfig = await gmailService.getConfig();

    if (!config.enabled) {
      return {
        success: false,
        error: 'Dịch vụ Email chưa được bật trong cấu hình Quản trị.'
      };
    }

    // Branch 1: Resend HTTP API (Port 443 HTTPS)
    if (config.serviceType === 'resend') {
      const res = await gmailService.sendViaResend(config, item.recipient, item.subject, item.htmlBody);
      return { success: res.sent, error: res.sent ? undefined : res.message };
    }

    // Branch 2: Gmail SMTP / Custom SMTP
    if (!config.user || !config.appPassword) {
      return {
        success: false,
        error: 'Thiếu thông tin tài khoản SMTP hoặc Mật khẩu ứng dụng.'
      };
    }

    const cleanPassword = (config.appPassword || '').replace(/\s+/g, '');
    const isGmail = config.serviceType === 'gmail' || !config.smtpHost || config.smtpHost.includes('gmail');
    const originalHost = isGmail ? 'smtp.gmail.com' : (config.smtpHost || 'smtp.gmail.com');
    const port = Number(config.smtpPort) || (isGmail ? 465 : 587);
    const isSecure = config.smtpSecure !== undefined ? Boolean(config.smtpSecure) : (port === 465);

    // Resolve domain to IPv4 to prevent ENETUNREACH
    const ipv4Host = await resolveHostToIPv4(originalHost);

    const transporter = nodemailer.createTransport({
      host: ipv4Host,
      port,
      secure: isSecure,
      auth: {
        user: config.user.trim(),
        pass: cleanPassword
      },
      family: 4,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      tls: {
        servername: originalHost,
        rejectUnauthorized: false
      }
    } as any);

    try {
      const fromHeader = config.fromName
        ? `"${config.fromName}" <${config.fromEmail || config.user}>`
        : (config.fromEmail || config.user);

      await transporter.sendMail({
        from: fromHeader,
        to: item.recipient,
        replyTo: config.replyTo || undefined,
        subject: item.subject,
        html: item.htmlBody
      });

      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Lỗi gửi mail qua SMTP'
      };
    }
  }

  /**
   * Starts the background recurring sweep (every 30 seconds)
   */
  startQueueWorker(intervalMs = 30000): void {
    if (this.workerInterval) return;

    // Run first check after 3 seconds
    setTimeout(() => {
      this.processNextBatch().catch(err => {
        console.error('[EmailQueueService] Error in initial queue sweep:', err);
      });
    }, 3000);

    this.workerInterval = setInterval(() => {
      this.processNextBatch().catch(err => {
        console.error('[EmailQueueService] Error in periodic queue sweep:', err);
      });
    }, intervalMs);

    console.log(`✅ [EmailQueueService] Outbox Queue Worker đã kích hoạt (quét tự động mỗi ${intervalMs / 1000}s).`);
  }

  /**
   * Stops the background worker on graceful shutdown
   */
  stopQueueWorker(): void {
    if (this.workerInterval) {
      clearInterval(this.workerInterval);
      this.workerInterval = null;
    }
  }

  /**
   * Verifies SMTP connection on startup and outputs health status
   */
  async verifySmtpConnection(): Promise<{ ok: boolean; message: string }> {
    try {
      const config = await gmailService.getConfig();
      if (!config.enabled) {
        return { ok: false, message: 'SMTP chưa bật trong cài đặt.' };
      }
      if (config.serviceType === 'resend') {
        const hasKey = Boolean(config.apiKey || config.appPassword);
        return {
          ok: hasKey,
          message: hasKey ? 'Resend API Key đã cấu hình.' : 'Chưa nhập Resend API Key.'
        };
      }

      if (!config.user || !config.appPassword) {
        return { ok: false, message: 'Thiếu tài khoản hoặc mật khẩu ứng dụng SMTP.' };
      }

      const cleanPassword = (config.appPassword || '').replace(/\s+/g, '');
      const isGmail = config.serviceType === 'gmail' || !config.smtpHost || config.smtpHost.includes('gmail');
      const originalHost = isGmail ? 'smtp.gmail.com' : (config.smtpHost || 'smtp.gmail.com');
      const port = Number(config.smtpPort) || (isGmail ? 465 : 587);
      const isSecure = config.smtpSecure !== undefined ? Boolean(config.smtpSecure) : (port === 465);
      const ipv4Host = await resolveHostToIPv4(originalHost);

      const transporter = nodemailer.createTransport({
        host: ipv4Host,
        port,
        secure: isSecure,
        auth: {
          user: config.user.trim(),
          pass: cleanPassword
        },
        family: 4,
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 10000,
        tls: {
          servername: originalHost,
          rejectUnauthorized: false
        }
      } as any);

      await transporter.verify();
      console.log(`✅ [GMAIL SMTP] Kết nối máy chủ ${originalHost}:${port} thành công! Hàng đợi Email sẵn sàng.`);
      return { ok: true, message: `Kết nối SMTP ${originalHost}:${port} thành công.` };
    } catch (err: any) {
      console.warn(`⚠️ [GMAIL SMTP] Kiểm tra kết nối ban đầu chưa hoàn tất: ${err.message}`);
      return { ok: false, message: err.message };
    }
  }

  /**
   * Queries paginated queue items for Admin view
   */
  async getQueueItems(params: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: EmailQueueItem[]; total: number; page: number; limit: number }> {
    await this.initEmailQueueTable();
    const prisma = getPrisma();

    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 20));
    const offset = (page - 1) * limit;

    const whereClauses: string[] = ['1=1'];
    const queryParams: any[] = [];

    if (params.status && params.status !== 'ALL') {
      queryParams.push(params.status.toUpperCase());
      whereClauses.push(`status = $${queryParams.length}`);
    }

    if (params.search && params.search.trim()) {
      queryParams.push(`%${params.search.trim().toLowerCase()}%`);
      whereClauses.push(`(LOWER(recipient) LIKE $${queryParams.length} OR LOWER(subject) LIKE $${queryParams.length} OR LOWER(event_type) LIKE $${queryParams.length})`);
    }

    const whereSql = whereClauses.join(' AND ');

    const countResult: any[] = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*)::int as count FROM email_queue WHERE ${whereSql}
    `, ...queryParams);
    const total = countResult[0]?.count || 0;

    const rows: any[] = await prisma.$queryRawUnsafe(`
      SELECT id, recipient, subject, html_body as "htmlBody", event_type as "eventType",
             status, retry_count as "retryCount", last_error as "lastError",
             next_retry_at as "nextRetryAt", metadata, created_at as "createdAt", sent_at as "sentAt"
      FROM email_queue
      WHERE ${whereSql}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `, ...queryParams);

    return {
      items: rows,
      total,
      page,
      limit
    };
  }

  /**
   * Aggregates statistics of the email queue
   */
  async getQueueStats(): Promise<{ total: number; pending: number; processing: number; sent: number; failed: number }> {
    await this.initEmailQueueTable();
    const prisma = getPrisma();

    const rows: any[] = await prisma.$queryRawUnsafe(`
      SELECT status, COUNT(*)::int as count FROM email_queue GROUP BY status
    `);

    const stats = { total: 0, pending: 0, processing: 0, sent: 0, failed: 0 };
    for (const r of rows) {
      stats.total += r.count;
      if (r.status === 'PENDING') stats.pending = r.count;
      else if (r.status === 'PROCESSING') stats.processing = r.count;
      else if (r.status === 'SENT') stats.sent = r.count;
      else if (r.status === 'FAILED') stats.failed = r.count;
    }

    return stats;
  }

  /**
   * Manually retries a queued or failed email immediately
   */
  async retryItem(id: string): Promise<boolean> {
    await this.initEmailQueueTable();
    const prisma = getPrisma();
    const now = new Date();

    const result: any[] = await prisma.$queryRawUnsafe(`
      UPDATE email_queue
      SET status = 'PENDING', retry_count = 0, next_retry_at = $1, last_error = NULL
      WHERE id = $2
      RETURNING id
    `, now, id);

    if (result && result.length > 0) {
      setImmediate(() => {
        this.processNextBatch().catch(err => {
          console.error('[EmailQueueService] Error processing retried item:', err);
        });
      });
      return true;
    }
    return false;
  }

  /**
   * Deletes a queue item by ID
   */
  async deleteItem(id: string): Promise<boolean> {
    await this.initEmailQueueTable();
    const prisma = getPrisma();
    const result: any[] = await prisma.$queryRawUnsafe(`
      DELETE FROM email_queue WHERE id = $1 RETURNING id
    `, id);
    return Boolean(result && result.length > 0);
  }
}

export const emailQueueService = new EmailQueueService();
