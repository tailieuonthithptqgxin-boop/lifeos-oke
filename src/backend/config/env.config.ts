import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL là bắt buộc để kết nối PostgreSQL'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET phải có độ dài tối thiểu 16 ký tự để bảo mật an toàn'),
  APP_URL: z.string().url('APP_URL phải là một URL hợp lệ').default('http://localhost:3000'),
  
  // Gmail SMTP
  GMAIL_USER: z.string().email('GMAIL_USER phải là địa chỉ email hợp lệ').optional().or(z.literal('')),
  GMAIL_APP_PASSWORD: z.string().optional().or(z.literal('')),
  
  // Resend Fallback
  RESEND_API_KEY: z.string().optional().or(z.literal('')),
  
  // Cloudflare R2 Storage (Optional in Dev, Recommended in Prod)
  R2_ACCOUNT_ID: z.string().optional().or(z.literal('')),
  R2_ACCESS_KEY_ID: z.string().optional().or(z.literal('')),
  R2_SECRET_ACCESS_KEY: z.string().optional().or(z.literal('')),
  R2_BUCKET_NAME: z.string().optional().or(z.literal('')),
  R2_PUBLIC_URL: z.string().optional().or(z.literal('')),

  // SuperAdmin Seed
  INITIAL_ADMIN_EMAIL: z.string().email().optional().or(z.literal('')),
  INITIAL_ADMIN_PASSWORD: z.string().min(8).optional().or(z.literal('')),

  // Google OAuth 2.0 / OpenID Connect
  GOOGLE_CLIENT_ID: z.string().optional().or(z.literal('')),
  GOOGLE_CLIENT_SECRET: z.string().optional().or(z.literal('')),
  GOOGLE_CALLBACK_URL: z.string().optional().or(z.literal(''))
});

export type EnvConfig = z.infer<typeof envSchema>;

let validatedEnv: EnvConfig | null = null;

export function validateEnvOnStartup(): EnvConfig {
  const parseResult = envSchema.safeParse(process.env);

  if (!parseResult.success) {
    console.error('❌ [CONFIG ERROR] Xác thực biến môi trường (.env) thất bại:');
    parseResult.error.issues.forEach(issue => {
      console.error(`  - Biến [${issue.path.join('.')}]: ${issue.message}`);
    });

    if (process.env.NODE_ENV === 'production') {
      console.error('🚨 MÔI TRƯỜNG PRODUCTION YÊU CẦU ĐẦY ĐỦ CÁC BIẾN MÔI TRƯỜNG HỢP LỆ. DỪNG TIẾN TRÌNH.');
      process.exit(1);
    } else {
      console.warn('⚠️ [DEV WARNING] Đang chạy trong môi trường phát triển với cấu hình mặc định an toàn.');
    }
  }

  validatedEnv = parseResult.success ? parseResult.data : (process.env as unknown as EnvConfig);
  console.log('✅ Biến môi trường (.env) đã được kiểm tra và nạp thành công.');
  return validatedEnv;
}

export function getEnv(): EnvConfig {
  if (!validatedEnv) {
    return validateEnvOnStartup();
  }
  return validatedEnv;
}
