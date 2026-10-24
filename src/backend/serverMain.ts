import 'dotenv/config';
import dns from 'dns';

// Force IPv4-first DNS lookup to prevent ENETUNREACH on cloud environments (Railway, Docker, VPS) without IPv6 routing
try {
  if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
  }
} catch (e) {
  // Ignore on older Node runtimes
}

import express from 'express';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import { createServer as createViteServer } from 'vite';

// Production Security Validation: Fail Fast if critical production credentials are missing or default
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  const missingVars: string[] = [];
  if (!process.env.DATABASE_URL) missingVars.push('DATABASE_URL');
  if (!process.env.JWT_SECRET) missingVars.push('JWT_SECRET');

  if (missingVars.length > 0) {
    console.error(`❌ [FATAL CONFIG ERROR] Thiếu các biến môi trường bắt buộc trong môi trường production: ${missingVars.join(', ')}`);
    process.exit(1);
  }

  // Reject insecure fallback secrets in production
  if (
    process.env.JWT_SECRET!.length < 32 ||
    process.env.JWT_SECRET!.includes('change_this') ||
    process.env.JWT_SECRET!.includes('lifeos_super_secure') ||
    process.env.JWT_SECRET!.includes('default')
  ) {
    console.error('❌ [FATAL SECURITY ERROR] JWT_SECRET trong môi trường production không đủ an toàn (yêu cầu tối thiểu 32 ký tự ngẫu nhiên, không dùng secret mặc định).');
    process.exit(1);
  }
} else {
  // Development default fallbacks
  process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://lifeos_user:secure_password_123@localhost:5432/lifeos_db?schema=public";
  process.env.JWT_SECRET = process.env.JWT_SECRET || "lifeos_super_secure_jwt_secret_key_2026_production";
  process.env.INITIAL_ADMIN_EMAIL = process.env.INITIAL_ADMIN_EMAIL || "admin@lifeos.com";
  process.env.INITIAL_ADMIN_PASSWORD = process.env.INITIAL_ADMIN_PASSWORD || "Admin@123456";
}

import { authRouter } from './routes/auth.js';
import { apiRouter } from './routes/api.js';
import { checkDbConnection, dbService, getPrisma } from './db.js';
import { workerService } from './services/worker.service.js';
import { notificationScheduler } from './services/notification/notificationScheduler.service.js';
import { csrfProtection } from './security/csrf.js';
import { emailQueueService } from './services/emailQueue.service.js';
import { SystemNotificationHelper } from './services/systemNotification.helper.js';
import { validateEnvOnStartup } from './config/env.config.js';
import { sanitizeInputMiddleware } from './security/sanitizer.js';

function ensurePostgresRunning() {
  try {
    const dbUrl = process.env.DATABASE_URL || '';
    if (dbUrl && !dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1')) {
      return;
    }

    const cwd = process.cwd();
    const scriptPath = path.join(cwd, 'scripts/start_postgres.sh');
    if (fs.existsSync(scriptPath)) {
      try {
        execSync(`bash "${scriptPath}" 2>&1 || true`);
      } catch (e: any) {
        console.warn('start_postgres warning:', e.message);
      }
    }
  } catch (err: any) {
    console.warn('ensurePostgresRunning warning:', err.message);
  }
}

async function startServer() {
  validateEnvOnStartup();
  ensurePostgresRunning();

  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  // Trust reverse proxy (Nginx / Cloudflare on VPS)
  app.set('trust proxy', 1);

  // Production Dynamic CORS Handler (Handles Subdomains, Custom Domains and Preflight OPTIONS)
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
    if (origin) {
      if (allowedOrigins.length === 0 || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token, X-Request-ID');
      }
    }
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // Security Headers (Configured for Safe Embedding & Media Playback)
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https://images.unsplash.com https://ui-avatars.com; connect-src 'self' ws: wss:; media-src 'self' data: blob:; worker-src 'self' blob:; frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com; frame-ancestors 'self' *;"
    );
    next();
  });

  app.use(express.json({ limit: '10mb' }));
  app.use(sanitizeInputMiddleware);
  app.use(cookieParser());
  app.use(csrfProtection);

  // Database Connection Verification
  let dbStatus = 'disconnected';
  try {
    await checkDbConnection();
    dbStatus = 'connected';
    console.log('✅ PostgreSQL database connected successfully via Prisma');
  } catch (err: any) {
    console.warn('Initial DB check issue, attempting connection retry...', err.message);
    try {
      await checkDbConnection();
      dbStatus = 'connected';
    } catch (e: any) {
      console.error('❌ PostgreSQL connection error:', e.message);
      dbStatus = 'error';
    }
  }

  // Start background worker scheduler (every 5 minutes to optimize cloud database compute/connections)
  workerService.start(300000);

  // Start dedicated real-time Notification Scheduler (every 60s)
  notificationScheduler.start(60000);

  // Health check endpoint (Liveness Probe)
  app.get('/health', async (req, res) => {
    let dbLive = false;
    try {
      await getPrisma().$queryRaw`SELECT 1`;
      dbLive = true;
    } catch (e) {
      dbLive = false;
    }

    const workerStatus = workerService.getStatus();

    const healthPayload = {
      status: dbLive ? 'ok' : 'degraded',
      database: dbLive ? 'connected' : 'disconnected',
      worker: workerStatus.running ? 'running' : 'stopped',
      timestamp: new Date().toISOString()
    };

    res.status(dbLive ? 200 : 503).json(healthPayload);
  });

  // Alias /api/health
  app.get('/api/health', async (req, res) => {
    let dbLive = false;
    try {
      await getPrisma().$queryRaw`SELECT 1`;
      dbLive = true;
    } catch (e) {
      dbLive = false;
    }
    const workerStatus = workerService.getStatus();
    res.status(dbLive ? 200 : 503).json({
      status: dbLive ? 'ok' : 'degraded',
      database: dbLive ? 'connected' : 'disconnected',
      worker: workerStatus.running ? 'running' : 'stopped',
      timestamp: new Date().toISOString()
    });
  });

  // Readiness check endpoint (Readiness Probe for Kubernetes / Docker / Nginx)
  app.get('/ready', async (req, res) => {
    try {
      await getPrisma().$queryRaw`SELECT 1`;
      res.status(200).json({ status: 'ready', database: 'ready' });
    } catch (e) {
      res.status(503).json({ status: 'not_ready', database: 'unavailable' });
    }
  });

  // Alias /api/ready
  app.get('/api/ready', async (req, res) => {
    try {
      await getPrisma().$queryRaw`SELECT 1`;
      res.status(200).json({ status: 'ready', database: 'ready' });
    } catch (e) {
      res.status(503).json({ status: 'not_ready', database: 'unavailable' });
    }
  });

  // Provision Initial SuperAdmin & Test User on boot if missing
  try {
    const prisma = getPrisma();
    const adminEmail = process.env.INITIAL_ADMIN_EMAIL ? process.env.INITIAL_ADMIN_EMAIL.toLowerCase().trim() : (isProduction ? '' : 'admin@lifeos.com');
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || (isProduction ? '' : 'Admin@123456');

    if (adminEmail && adminPassword) {
      const existingAdmin = await prisma.user.findFirst({
        where: { email: adminEmail }
      });

      if (!existingAdmin) {
        console.log(`Initial setup: Provisioning SuperAdmin account (${adminEmail})...`);
        const salt = await bcrypt.genSalt(12);
        const passwordHash = await bcrypt.hash(adminPassword, salt);

        await dbService.createUser({
          name: 'LifeOS SuperAdmin',
          email: adminEmail,
          username: adminEmail.split('@')[0],
          passwordHash,
          role: 'SUPERADMIN',
          plan: 'TEAM',
          status: 'ACTIVE',
          avatar: 'https://ui-avatars.com/api/?name=Super+Admin&background=0284c7&color=fff',
        });
        console.log(`✅ Initial SuperAdmin created: ${adminEmail}`);
      }
    } else if (isProduction) {
      const anyAdmin = await prisma.user.findFirst({
        where: { role: { in: ['ADMIN', 'SUPERADMIN'] } }
      });
      if (!anyAdmin) {
        console.warn('⚠️ [NOTICE]: Chưa có tài khoản SuperAdmin trong hệ thống. Hãy chạy "npm run admin:create" để khởi tạo tài khoản quản trị.');
      }
    }

    // Ensure Demo Test User exists for testing
    const demoUser = await prisma.user.findFirst({
      where: { email: 'user@lifeos.com' }
    });
    if (!demoUser) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('User@123456', salt);
      await dbService.createUser({
        name: 'Demo Member',
        email: 'user@lifeos.com',
        username: 'user_demo',
        passwordHash,
        role: 'USER',
        plan: 'PRO',
        status: 'ACTIVE',
        avatar: 'https://ui-avatars.com/api/?name=User+Demo&background=6366f1&color=fff'
      });
      console.log('✅ Demo test user created: user@lifeos.com');
    }



    // Seed default system templates if empty
    // Seed default system templates if empty or incomplete
    const templates = await dbService.getSystemTemplates();
    if (templates.length < 16) {
      await dbService.seedTemplates([
        {
          id: 'tpl_para_system',
          title: 'Hệ thống Quản lý P.A.R.A (Tiago Forte)',
          description: 'Khung tổ chức dự án, khu vực, tài nguyên và lưu trữ theo phương pháp Second Brain hiện đại',
          category: 'Productivity',
          tier: 'Free',
          tags: ['PARA', 'Productivity', 'Organization', 'SecondBrain'],
          price: 0,
          isFree: true
        },
        {
          id: 'tpl_finance_freedom',
          title: 'Lộ trình Tự do Tài chính 50/30/20 & 100M Đầu Tiên',
          description: 'Hệ thống quản lý chi tiêu, hạn mức ngân sách, hũ tích lũy và luật 72h chống mua sắm bốc đồng',
          category: 'Finance',
          tier: 'Free',
          tags: ['Finance', 'Budgeting', 'Savings', 'TàiChính'],
          price: 0,
          isFree: true
        },
        {
          id: 'tpl_atomic_habits',
          title: 'Ma trận Xây dựng Thói quen Bền vững (Atomic Habits)',
          description: 'Theo dõi chuỗi streak, đo lường tỷ lệ hoàn thành và thói quen 2 phút khởi động',
          category: 'Habits',
          tier: 'Free',
          tags: ['Habits', 'Health', 'Routines', 'KỷLuật'],
          price: 0,
          isFree: true
        },
        {
          id: 'tpl_solo_freelancer',
          title: 'Solo Freelancer & Digital Nomad OS',
          description: 'Quy trình nhận brief, cọc 50%, bàn giao, thu hồi công nợ và hũ tài chính thuế 30%',
          category: 'Management',
          tier: 'Free',
          tags: ['Freelancer', 'DựÁn', 'KháchHàng', 'Work'],
          price: 0,
          isFree: true
        },
        {
          id: 'tpl_student_scholarship',
          title: 'Sinh viên Học bá – JLPT/IELTS & GPA 3.6+',
          description: 'Quản lý tín chỉ, đếm ngược ngày thi, Spaced Repetition từ vựng và khung Deep Work 90 phút',
          category: 'Study',
          tier: 'Free',
          tags: ['HọcTập', 'GPA', 'IELTS', 'JLPT'],
          price: 0,
          isFree: true
        },
        {
          id: 'tpl_adhd_anti_overthinking',
          title: 'ADHD & Anti-Overthinking Engine',
          description: 'Khắc phục trì hoãn với Daily Trifecta 3 việc, Brain Dump xả stress và quy tắc 2 phút',
          category: 'Productivity',
          tier: 'Free',
          tags: ['ADHD', 'Focus', 'AntiProcrastination', 'TâmLý'],
          price: 0,
          isFree: true
        },
        {
          id: 'tpl_ecommerce_koc',
          title: 'Shop Online & KOC Affiliate Master',
          description: 'Lịch kịch bản video TikTok 7 ngày, quản lý hoa hồng đa sàn và checklist đóng gói niêm phong',
          category: 'Management',
          tier: 'Free',
          tags: ['Ecommerce', 'TikTokShop', 'Affiliate', 'KOC'],
          price: 0,
          isFree: true
        },
        {
          id: 'tpl_fitness_recomp',
          title: 'Fitness & Body Recomp (Push/Pull/Legs & Macro)',
          description: 'Lịch tập gym PPL 5 ngày, theo dõi lượng nước 2.5L, chỉ số đạm/calo và giấc ngủ phục hồi 8h',
          category: 'Health',
          tier: 'Free',
          tags: ['Gym', 'Fitness', 'DinhDưỡng', 'SứcKhỏe'],
          price: 0,
          isFree: true
        },
        {
          id: 'tpl_podcast_creator',
          title: 'Content Creator & Video Podcast Studio',
          description: 'Pipeline sản xuất từ ý tưởng tập, kịch bản khách mời, lịch ghi âm đến cắt ghép Shorts/Reels',
          category: 'Productivity',
          tier: 'Free',
          tags: ['Creator', 'Podcast', 'Media', 'SángTạo'],
          price: 0,
          isFree: true
        },
        {
          id: 'tpl_thesis_research',
          title: 'Nghiên cứu Khoa học & Luận văn Thạc sĩ',
          description: 'Theo dõi tài liệu trích dẫn, khung đề cương 5 chương, tiến độ viết và phản biện khoa học',
          category: 'Study',
          tier: 'Free',
          tags: ['LuậnVăn', 'NghiênCứu', 'HọcThuật', 'Paper'],
          price: 0,
          isFree: true
        },
        {
          id: 'tpl_mindfulness_zen',
          title: 'Thiền định, Thư giãn & Sức khỏe Tinh thần (Mindfulness)',
          description: 'Nhật ký 3 điều biết ơn mỗi tối, bài tập thở Box Breathing 5 phút và Digital Detox cuối tuần',
          category: 'Health',
          tier: 'Free',
          tags: ['Zen', 'ChữaLành', 'Thiền', 'MentalHealth'],
          price: 0,
          isFree: true
        },
        {
          id: 'tpl_startup_mvp',
          title: 'Startup Founder 30-Day MVP Sprint',
          description: 'Khung triển khai startup tinh gọn: Phỏng vấn 20 khách hàng, Vibe code MVP, Launch Product Hunt',
          category: 'Management',
          tier: 'Free',
          tags: ['Startup', 'Founder', 'MVP', 'KinhDoanh'],
          price: 0,
          isFree: true
        },
        {
          id: 'tpl_okr_master',
          title: 'Hệ Thống Quản Trị Mục Tiêu OKRs Quý',
          description: 'Khung Objective & Key Results (John Doerr) định hướng nỗ lực, theo dõi mục tiêu then chốt và sáng kiến hành động',
          category: 'Management',
          tier: 'Free',
          tags: ['OKR', 'MụcTiêu', 'ChiếnLược', 'Productivity'],
          price: 0,
          isFree: true
        },
        {
          id: 'tpl_eisenhower_matrix',
          title: 'Ma Trận Ưu Tiên Eisenhower 4 Cấp Độ',
          description: 'Phân loại công việc theo Ma trận Khẩn cấp vs Quan trọng, tập trung 60% năng lượng vào Q2 chiến lược dài hạn',
          category: 'Productivity',
          tier: 'Free',
          tags: ['Eisenhower', 'ƯuTiên', 'ThờiGian', 'KỷLuật'],
          price: 0,
          isFree: true
        },
        {
          id: 'tpl_6_jars_finance',
          title: 'Hệ Thống Quản Lý Tiền 6 Chiếc Hũ (6 JARS)',
          description: 'Phương pháp quản trị dòng tiền đỉnh cao của T. Harv Eker: Thiết yếu 55%, Tự do tài chính 10%, Tiết kiệm 10%, Giáo dục 10%, Hưởng thụ 10%, Cho đi 5%',
          category: 'Finance',
          tier: 'Free',
          tags: ['Finance', '6JARS', 'TiềnBạc', 'QuảnLýTàiChính'],
          price: 0,
          isFree: true
        },
        {
          id: 'tpl_circadian_health',
          title: 'Tối Ưu Nhịp Sinh Học & Giấc Ngủ Phục Hồi (Circadian Protocol)',
          description: 'Giao thức năng lượng sinh học khoa học: Tắm nắng sớm 15p, cắt caffeine sau 14h, giảm ánh sáng xanh 22h và ngủ sâu 8 tiếng',
          category: 'Health',
          tier: 'Free',
          tags: ['Health', 'Circadian', 'GiấcNgủ', 'NăngLượng'],
          price: 0,
          isFree: true
        }
      ]);
      console.log('✅ 16 System templates seeded successfully');
    }

    // Seed default promotional coupons if none exist
    const couponsCount = await prisma.coupon.count();
    if (couponsCount === 0) {
      await prisma.coupon.createMany({
        data: [
          {
            code: 'LIFEOS20',
            discountPercent: 20,
            status: 'Active',
            maxUses: 1000,
            usedCount: 0
          },
          {
            code: 'WELCOME50',
            discountPercent: 50,
            status: 'Active',
            maxUses: 500,
            usedCount: 0
          },
          {
            code: 'PRO2026',
            discountPercent: 30,
            status: 'Active',
            maxUses: 1000,
            usedCount: 0
          }
        ]
      });
      console.log('✅ Default promotional coupons seeded');
    }
  } catch (e: any) {
    console.error('Initial provisioning notice:', e.message);
  }

  // Google OAuth Direct & Fallback Aliases (Bypass path rewriting)
  app.get('/auth/google', (req, res) => res.redirect('/api/auth/google'));
  app.get('/auth/google/callback', (req, res) => {
    const qs = new URLSearchParams(req.query as any).toString();
    res.redirect(qs ? ('/api/auth/google/callback?' + qs) : '/api/auth/google/callback');
  });

  // API Routes
  app.use('/api/auth', authRouter);
  app.use('/api', apiRouter);

  // Return 404 JSON for unhandled /api/* routes instead of returning HTML SPA fallback
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Endpoint '${req.originalUrl}' không tồn tại trên hệ thống.`
      },
      message: `Endpoint '${req.originalUrl}' không tồn tại trên hệ thống.`
    });
  });

  // Global Express Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(`Unhandled error [${req.method} ${req.url}]:`, err);
    if (res.headersSent) {
      return next(err);
    }
    if (req.path.startsWith('/api/')) {
      // Alert Admin of critical 500 error via Outbox Queue
      SystemNotificationHelper.onSystemCriticalError({
        message: err.message || 'Lỗi không xác định',
        stack: err.stack,
        path: req.path,
        method: req.method,
        userEmail: (req as any).user?.email
      }).catch(() => {});

      return res.status(err.status || 500).json({
        success: false,
        error: {
          code: err.code || 'INTERNAL_SERVER_ERROR',
          message: err.message || 'Đã xảy ra lỗi máy chủ nội bộ.',
          requestId: req.headers['x-request-id'] || undefined
        },
        message: err.message || 'Đã xảy ra lỗi máy chủ nội bộ.'
      });
    }
    next(err);
  });

  // Vite middleware for development vs SPA static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        return next();
      }
      const ext = path.extname(req.path);
      if (ext && ext !== '.html') {
        return res.status(404).send('Resource not found');
      }

      const url = req.originalUrl || req.url;
      try {
        let template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        if (vite) vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
    }
    app.use('*', (req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        return next();
      }
      const ext = path.extname(req.path);
      if (ext && ext !== '.html') {
        return res.status(404).send('Resource not found');
      }
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.sendFile(path.resolve(process.cwd(), 'index.html'));
      }
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 LifeOS Server running on http://0.0.0.0:${PORT}`);
    // Start Outbox Email Queue Worker (Automatic Retry & Delivery Guarantee)
    emailQueueService.startQueueWorker();
    // Verify SMTP connection on startup & report status
    emailQueueService.verifySmtpConnection().catch(e => console.warn('Initial SMTP verify notice:', e));
  });

  const shutdown = (signal: string) => {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    try {
      workerService.stop();
      notificationScheduler.stop();
      emailQueueService.stopQueueWorker();
    } catch (e) {}

    // PROD-002 FIX: Force exit after 30s if connections don't close
    const forceExitTimer = setTimeout(() => {
      console.error('Graceful shutdown timed out after 30s. Forcing exit.');
      process.exit(1);
    }, 30000);
    forceExitTimer.unref(); // don't block event loop

    server.close(async () => {
      clearTimeout(forceExitTimer);
      try {
        await getPrisma().$disconnect();
      } catch (e) {}
      console.log('Server shut down cleanly.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Process-Level Fatal Error Handlers (Prevents Server Crash on Unhandled Errors)
process.on('uncaughtException', (err) => {
  console.error('💥 [CRITICAL PROCESS ERROR] Uncaught Exception:', err.stack || err.message);
  try {
    SystemNotificationHelper.onSystemCriticalError({
      message: `Uncaught Exception: ${err.message}`,
      stack: err.stack,
      path: 'process_level',
      method: 'UNCAUGHT_EXCEPTION'
    }).catch(() => {});
  } catch (e) {}
});

process.on('unhandledRejection', (reason) => {
  console.error('⚠️ [PROCESS WARNING] Unhandled Promise Rejection:', reason);
});

startServer();
