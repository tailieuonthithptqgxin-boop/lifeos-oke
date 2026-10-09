import { 
  S3Client, 
  PutObjectCommand, 
  DeleteObjectCommand, 
  ListObjectsV2Command,
  HeadBucketCommand,
  HeadObjectCommand,
  GetObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed'
  // SEC-008: Removed application/octet-stream — generic binary cannot be validated for malicious content
]);

const DANGEROUS_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'sh', 'php', 'phtml', 'php3', 'php4', 'php5',
  'js', 'mjs', 'cjs', 'html', 'htm', 'xhtml', 'jsp', 'asp', 'aspx',
  'cgi', 'pl', 'py', 'jar', 'vbs', 'scr', 'ps1'
]);

export class CloudflareR2Service {
  private client: S3Client | null = null;
  private accountId: string = '';
  private accessKeyId: string = '';
  private secretAccessKey: string = '';
  private bucketName: string = '';
  private publicUrl: string = '';

  constructor() {
    this.initFromEnv();
  }

  public initFromEnv() {
    this.accountId = process.env.R2_ACCOUNT_ID?.trim() || '';
    this.accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim() || '';
    this.secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim() || '';
    this.bucketName = process.env.R2_BUCKET_NAME?.trim() || '';
    this.publicUrl = (process.env.R2_PUBLIC_URL?.trim() || '').replace(/\/+$/, '');

    if (this.accountId && this.accessKeyId && this.secretAccessKey) {
      this.client = new S3Client({
        region: 'auto',
        endpoint: `https://${this.accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: this.accessKeyId,
          secretAccessKey: this.secretAccessKey,
        },
      });
    } else {
      this.client = null;
    }
  }

  public isConfigured(): boolean {
    this.initFromEnv();
    return Boolean(this.client && this.bucketName);
  }

  public getStatus() {
    this.initFromEnv();
    return {
      configured: this.isConfigured(),
      accountId: this.accountId ? `${this.accountId.substring(0, 6)}...` : 'Chưa cấu hình',
      bucketName: this.bucketName || 'Chưa cấu hình',
      hasAccessKey: Boolean(this.accessKeyId),
      hasSecretKey: Boolean(this.secretAccessKey),
      publicUrl: this.publicUrl || (this.accountId && this.bucketName ? `https://${this.accountId}.r2.cloudflarestorage.com/${this.bucketName}` : 'Chưa cấu hình')
    };
  }

  public async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.isConfigured() || !this.client) {
      return {
        success: false,
        message: 'Thiếu thông tin cấu hình Cloudflare R2 (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME).'
      };
    }

    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
      return {
        success: true,
        message: `Kết nối thành công tới R2 Bucket "${this.bucketName}"!`
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Không thể kết nối R2 Bucket "${this.bucketName}": ${err.message || 'Lỗi xác thực credentials'}`
      };
    }
  }

  /**
   * Sanitizes and builds a safe, isolated key within user namespace.
   * Path format: users/{userId}/{sanitizedSubfolder}/{timestamp}_{random}_{sanitizedFileName}
   */
  public buildSafeKey(userId: string, subfolder: string, fileName: string): string {
    // 1. Sanitize subfolder (prevent path traversal)
    const cleanSubfolder = subfolder
      .replace(/\\/g, '/')
      .split('/')
      .map(part => part.replace(/[^a-zA-Z0-9_-]/g, ''))
      .filter(part => Boolean(part) && part !== '.' && part !== '..')
      .join('/');

    const safeFolder = cleanSubfolder || 'general';

    // 2. Validate and sanitize filename & extension
    const ext = (fileName.split('.').pop() || '').toLowerCase();
    if (DANGEROUS_EXTENSIONS.has(ext)) {
      throw new Error(`Đuôi tập tin .${ext} bị chặn vì lý do an ninh.`);
    }

    const baseName = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
    const cleanBaseName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
    const sanitizedFileName = ext ? `${cleanBaseName}.${ext}` : cleanBaseName;

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);

    return `users/${userId}/${safeFolder}/${timestamp}_${randomStr}_${sanitizedFileName}`;
  }

  public async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    userId: string,
    subfolder: string = 'uploads'
  ): Promise<{ success: boolean; key: string; url: string; size: number }> {
    if (!this.isConfigured() || !this.client) {
      throw new Error('Cloudflare R2 chưa được cấu hình biến môi trường.');
    }

    // 1. File size limit: 25MB
    const MAX_SIZE = 25 * 1024 * 1024;
    if (fileBuffer.length > MAX_SIZE) {
      throw new Error('Kích thước tập tin vượt quá giới hạn tối đa (25MB).');
    }

    // 2. MIME type check
    const cleanMime = (mimeType || 'application/octet-stream').toLowerCase().trim();
    if (!ALLOWED_MIME_TYPES.has(cleanMime)) {
      throw new Error(`Loại nội dung '${cleanMime}' không được phép tải lên.`);
    }

    // 3. Build strictly scoped key
    const key = this.buildSafeKey(userId, subfolder, fileName);

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: fileBuffer,
      ContentType: cleanMime,
    });

    await this.client.send(command);

    const publicDomain = this.publicUrl || `https://${this.accountId}.r2.cloudflarestorage.com/${this.bucketName}`;
    const url = `${publicDomain}/${key}`;

    return {
      success: true,
      key,
      url,
      size: fileBuffer.length
    };
  }

  public async getPresignedUploadUrl(
    fileName: string,
    mimeType: string,
    userId: string,
    subfolder: string = 'uploads',
    expiresInSeconds: number = 900 // 15 mins max
  ): Promise<{ uploadUrl: string; key: string; publicUrl: string }> {
    if (!this.isConfigured() || !this.client) {
      throw new Error('Cloudflare R2 chưa được cấu hình biến môi trường.');
    }

    const cleanMime = (mimeType || 'application/octet-stream').toLowerCase().trim();
    if (!ALLOWED_MIME_TYPES.has(cleanMime)) {
      throw new Error(`Loại nội dung '${cleanMime}' không được phép.`);
    }

    const key = this.buildSafeKey(userId, subfolder, fileName);

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: cleanMime,
    });

    const uploadUrl = await getSignedUrl(this.client, command, { 
      expiresIn: Math.min(expiresInSeconds, 900) 
    });
    
    const publicDomain = this.publicUrl || `https://${this.accountId}.r2.cloudflarestorage.com/${this.bucketName}`;
    const publicUrl = `${publicDomain}/${key}`;

    return { uploadUrl, key, publicUrl };
  }

  public async deleteFile(key: string, requesterUserId: string, isAdmin: boolean = false): Promise<boolean> {
    if (!this.isConfigured() || !this.client) {
      throw new Error('Cloudflare R2 chưa được cấu hình.');
    }

    // Strict namespace verification: Non-admins can only delete files inside their own namespace
    const userPrefix = `users/${requesterUserId}/`;
    if (!isAdmin && !key.startsWith(userPrefix)) {
      throw new Error('Bạn không có quyền xóa tập tin của người dùng khác.');
    }

    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    await this.client.send(command);
    return true;
  }

  public async listFiles(requesterUserId: string, isAdmin: boolean = false, userPrefix: string = '', maxKeys: number = 50) {
    if (!this.isConfigured() || !this.client) {
      throw new Error('Cloudflare R2 chưa được cấu hình.');
    }

    // For non-admins, strictly enforce prefix: users/{requesterUserId}/...
    let effectivePrefix = `users/${requesterUserId}/`;
    if (isAdmin) {
      effectivePrefix = userPrefix || '';
    } else if (userPrefix) {
      const cleanSub = userPrefix.replace(/[^a-zA-Z0-9_-]/g, '');
      effectivePrefix = `users/${requesterUserId}/${cleanSub}`;
    }

    const command = new ListObjectsV2Command({
      Bucket: this.bucketName,
      Prefix: effectivePrefix,
      MaxKeys: Math.min(maxKeys, 100),
    });

    const response = await this.client.send(command);
    const publicDomain = this.publicUrl || `https://${this.accountId}.r2.cloudflarestorage.com/${this.bucketName}`;

    return (response.Contents || []).map(item => ({
      key: item.Key || '',
      size: item.Size || 0,
      lastModified: item.LastModified,
      url: `${publicDomain}/${item.Key}`
    }));
  }

  public async getObjectMetadata(key: string, requesterUserId: string, isAdmin: boolean = false) {
    if (!this.isConfigured() || !this.client) {
      throw new Error('Cloudflare R2 chưa được cấu hình.');
    }

    const userPrefix = `users/${requesterUserId}/`;
    if (!isAdmin && !key.startsWith(userPrefix)) {
      throw new Error('Bạn không có quyền xem thông tin tập tin của người dùng khác.');
    }

    const command = new HeadObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    const metadata = await this.client.send(command);
    return {
      key,
      size: metadata.ContentLength || 0,
      contentType: metadata.ContentType || 'application/octet-stream',
      lastModified: metadata.LastModified,
      etag: metadata.ETag,
    };
  }

  public async getPresignedDownloadUrl(
    key: string,
    requesterUserId: string,
    isAdmin: boolean = false,
    expiresInSeconds: number = 3600
  ): Promise<{ downloadUrl: string; key: string }> {
    if (!this.isConfigured() || !this.client) {
      throw new Error('Cloudflare R2 chưa được cấu hình.');
    }

    const userPrefix = `users/${requesterUserId}/`;
    if (!isAdmin && !key.startsWith(userPrefix)) {
      throw new Error('Bạn không có quyền tải tập tin của người dùng khác.');
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    const downloadUrl = await getSignedUrl(this.client, command, {
      expiresIn: Math.min(expiresInSeconds, 3600),
    });

    return { downloadUrl, key };
  }
}

export const r2Service = new CloudflareR2Service();
