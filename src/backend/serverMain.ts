import 'dotenv/config';
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
import { csrfProtection } from './security/csrf.js';

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
  ensurePostgresRunning();

  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  // Trust reverse proxy (Nginx / Cloudflare on VPS)
  app.set('trust proxy', 1);

  // Security Headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  app.use(express.json({ limit: '10mb' }));
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

  // Start background worker scheduler
  workerService.start(60000);

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

    res.status(dbLive ? 200 : 503).json({
      status: dbLive ? 'ok' : 'degraded',
      database: dbLive ? 'connected' : 'disconnected',
      worker: workerStatus.running ? 'running' : 'stopped',
      timestamp: new Date().toISOString()
    });
  });

  // Readiness check endpoint (Readiness Probe for Kubernetes / Docker)
  app.get('/ready', async (req, res) => {
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
    const templates = await dbService.getSystemTemplates();
    if (templates.length === 0) {
      await dbService.seedTemplates([
        {
          id: 'tpl_para_system',
          title: 'Hệ thống Quản lý P.A.R.A',
          description: 'Khung tổ chức dự án, khu vực, tài nguyên và lưu trữ theo phương pháp Tiago Forte',
          category: 'Productivity',
          tier: 'Free',
          tags: ['PARA', 'Productivity', 'Organization'],
          price: 0,
          isFree: true
        },
        {
          id: 'tpl_finance_freedom',
          title: 'Lộ trình Tự do Tài chính 50/30/20',
          description: 'Hệ thống quản lý chi tiêu, hạn mức ngân sách và danh mục tiết kiệm thông minh',
          category: 'Finance',
          tier: 'Pro',
          tags: ['Finance', 'Budgeting', 'Savings'],
          price: 99000,
          isFree: false
        },
        {
          id: 'tpl_atomic_habits',
          title: 'Ma trận Xây dựng Thói quen Bền vững',
          description: 'Theo dõi chuỗi streak, đo lường tỷ lệ hoàn thành và phản hồi năng lượng mỗi ngày',
          category: 'Habits',
          tier: 'Free',
          tags: ['Habits', 'Health', 'Routines'],
          price: 0,
          isFree: true
        }
      ]);
      console.log('✅ Default system templates seeded');
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
  });

  const shutdown = (signal: string) => {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    try {
      workerService.stop();
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

startServer();
