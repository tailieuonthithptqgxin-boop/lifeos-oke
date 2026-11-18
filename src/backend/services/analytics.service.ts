// ==============================================================================
// PRODUCT ANALYTICS SERVICE (High-Performance / Free-Tier Optimized)
// ==============================================================================
import { getPrisma } from '../db.js';

export interface BatchTrackItem {
  featureKey: string;
  featureName: string;
  count: number;
  durationSeconds: number;
  lastActiveAt?: number;
}

export interface FeatureRankItem {
  featureKey: string;
  featureName: string;
  category: string;
  uniqueUsers: number;
  userPercentage: number;
  totalUses: number;
  repeatRatePercent: number;
  totalDurationMinutes: number;
  tag: 'HOT' | 'OPTIMIZE' | 'COLD' | 'STABLE';
  tagLabel: string;
  tagColor: string;
}

export interface UserActivityListItem {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  plan: string;
  status: string;
  isAffiliate: boolean;
  createdAt: string;
  lastActiveAt: string | null;
  activityStatus: 'ONLINE' | 'ACTIVE_3D' | 'AT_RISK' | 'INACTIVE';
  activityLabel: string;
  activityDotColor: string;
  topFeatureName: string;
  topFeatureUses: number;
  referrerName: string | null;
  referralCode: string | null;
}

class ProductAnalyticsService {
  /**
   * 1. Tiếp nhận và gom nhóm dữ liệu theo dõi ngầm từ Client (Batch Processing)
   */
  public async recordBatch(userId: string | null, events: BatchTrackItem[]): Promise<boolean> {
    if (!events || !Array.isArray(events) || events.length === 0) return true;

    try {
      // 1. Nếu có người dùng đăng nhập, cập nhật từng cá nhân vào user_feature_analytics
      if (userId) {
        await getPrisma().$executeRawUnsafe(
          `UPDATE "users" SET "last_active_at" = NOW() WHERE "id" = $1`,
          userId
        );

        for (const ev of events) {
          const rowId = `${userId}_${ev.featureKey}`;
          const cleanKey = String(ev.featureKey || '').slice(0, 64);
          const cleanName = String(ev.featureName || ev.featureKey || '').slice(0, 128);
          const count = Math.max(1, Math.min(1000, Number(ev.count) || 1));
          const duration = Math.max(0, Math.min(86400, Number(ev.durationSeconds) || 0));

          await getPrisma().$executeRawUnsafe(
            `
            INSERT INTO "user_feature_analytics" (
              "id", "user_id", "feature_key", "feature_name", "use_count", "duration_seconds", "last_used_at", "updated_at"
            )
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            ON CONFLICT ("user_id", "feature_key") DO UPDATE SET
              "use_count" = "user_feature_analytics"."use_count" + EXCLUDED."use_count",
              "duration_seconds" = "user_feature_analytics"."duration_seconds" + EXCLUDED."duration_seconds",
              "last_used_at" = NOW(),
              "updated_at" = NOW()
            `,
            rowId,
            userId,
            cleanKey,
            cleanName,
            count,
            duration
          );
        }
      }

      // 2. Cập nhật bộ đếm cộng dồn vào bảng tổng hợp feature_analytics_summary
      for (const ev of events) {
        const cleanKey = String(ev.featureKey || '').slice(0, 64);
        const cleanName = String(ev.featureName || ev.featureKey || '').slice(0, 128);
        const count = Math.max(1, Math.min(1000, Number(ev.count) || 1));
        const duration = Math.max(0, Math.min(86400, Number(ev.durationSeconds) || 0));

        await getPrisma().$executeRawUnsafe(
          `
          INSERT INTO "feature_analytics_summary" (
            "feature_key", "feature_name", "category", "total_unique_users", "total_uses", "total_duration_seconds", "last_activity_at", "updated_at"
          )
          VALUES ($1, $2, 'Core', 1, $3, $4, NOW(), NOW())
          ON CONFLICT ("feature_key") DO UPDATE SET
            "total_uses" = "feature_analytics_summary"."total_uses" + EXCLUDED."total_uses",
            "total_duration_seconds" = "feature_analytics_summary"."total_duration_seconds" + EXCLUDED."total_duration_seconds",
            "last_activity_at" = NOW(),
            "updated_at" = NOW()
          `,
          cleanKey,
          cleanName,
          count,
          duration
        );
      }

      return true;
    } catch (err) {
      console.warn('Analytics batch tracking error (non-fatal):', err);
      return false;
    }
  }

  /**
   * 2. Tab 1: Lấy Bảng Phân Tích Chức Năng & Dịch Vụ
   * Chỉ tốn 1 lượt truy vấn tối ưu cho gói Free
   */
  public async getFeatureAnalyticsOverview(): Promise<{
    summary: {
      totalUsers: number;
      online15m: number;
      active7d: number;
      retentionRatePercent: number;
    };
    features: FeatureRankItem[];
  }> {
    // 1. KPI tổng quan
    const kpiRaw = await getPrisma().$queryRawUnsafe<any[]>(`
      SELECT 
        COUNT(*)::int AS "totalUsers",
        COUNT(CASE WHEN "last_active_at" >= NOW() - INTERVAL '15 minutes' THEN 1 END)::int AS "online15m",
        COUNT(CASE WHEN "last_active_at" >= NOW() - INTERVAL '7 days' THEN 1 END)::int AS "active7d"
      FROM "users"
    `);

    const totalUsers = Math.max(1, kpiRaw[0]?.totalUsers || 1);
    const online15m = kpiRaw[0]?.online15m || 0;
    const active7d = kpiRaw[0]?.active7d || 0;
    const retentionRatePercent = Math.min(100, Math.round((active7d / totalUsers) * 100));

    // 2. Bảng xếp hạng chức năng với bộ đếm cộng dồn
    const rows = await getPrisma().$queryRawUnsafe<any[]>(`
      SELECT 
        fas."feature_key",
        fas."feature_name",
        COALESCE(fas."category", 'Khác') AS "category",
        COALESCE(sub.real_unique_users, fas."total_unique_users", 0)::int AS "unique_users",
        fas."total_uses"::int AS "total_uses",
        fas."total_duration_seconds"::bigint AS "total_duration_seconds",
        COALESCE(sub.returning_users, fas."returning_users_count", 0)::int AS "returning_users"
      FROM "feature_analytics_summary" fas
      LEFT JOIN (
        SELECT 
          "feature_key",
          COUNT(DISTINCT "user_id") AS real_unique_users,
          COUNT(DISTINCT CASE WHEN "use_count" >= 2 THEN "user_id" END) AS returning_users
        FROM "user_feature_analytics"
        GROUP BY "feature_key"
      ) sub ON sub."feature_key" = fas."feature_key"
      ORDER BY "unique_users" DESC, "total_uses" DESC
    `);

    const features: FeatureRankItem[] = rows.map((r) => {
      const uCount = r.unique_users;
      const userPct = Math.min(100, Math.round((uCount / totalUsers) * 100));
      const repeatRate = uCount > 0 ? Math.min(100, Math.round((r.returning_users / uCount) * 100)) : 0;
      const totalDurMin = Math.round(Number(r.total_duration_seconds || 0) / 60);

      // Phân loại nhãn thông minh:
      // - "🔥 Mỏ vàng - Nên nâng cấp": Nhiều người dùng và tỷ lệ quay lại cao
      // - "⚠️ Cần tối ưu lại": Nhiều người bấm thử lần đầu nhưng ít người quay lại
      // - "❄️ Ít người quan tâm": Lượng người dùng quá thấp
      let tag: 'HOT' | 'OPTIMIZE' | 'COLD' | 'STABLE' = 'STABLE';
      let tagLabel = '⚡ Ổn định';
      let tagColor = 'emerald';

      if (userPct >= 35 && repeatRate >= 45) {
        tag = 'HOT';
        tagLabel = '🔥 Mỏ vàng - Nên nâng cấp';
        tagColor = 'amber';
      } else if (userPct >= 20 && repeatRate < 35) {
        tag = 'OPTIMIZE';
        tagLabel = '⚠️ Cần tối ưu lại';
        tagColor = 'rose';
      } else if (userPct < 15) {
        tag = 'COLD';
        tagLabel = '❄️ Ít người quan tâm';
        tagColor = 'slate';
      } else {
        tag = 'STABLE';
        tagLabel = '⚡ Tăng trưởng tốt';
        tagColor = 'indigo';
      }

      return {
        featureKey: r.feature_key,
        featureName: r.feature_name,
        category: r.category,
        uniqueUsers: uCount,
        userPercentage: userPct,
        totalUses: r.total_uses,
        repeatRatePercent: repeatRate,
        totalDurationMinutes: totalDurMin,
        tag,
        tagLabel,
        tagColor
      };
    });

    return {
      summary: {
        totalUsers,
        online15m,
        active7d,
        retentionRatePercent
      },
      features
    };
  }

  /**
   * 3. Tab 2: Danh sách Quản lý Người dùng & Trạng thái Hoạt động (Pagination 20-30 người/trang)
   */
  public async getUserActivityList(params: {
    search?: string;
    filter?: string; // 'ALL' | 'ONLINE' | 'ACTIVE_3D' | 'AT_RISK' | 'INACTIVE'
    page?: number;
    limit?: number;
  }): Promise<{
    users: UserActivityListItem[];
    pagination: {
      page: number;
      limit: number;
      totalPages: number;
      totalCount: number;
    };
  }> {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(10, Math.min(100, Number(params.limit) || 25));
    const offset = (page - 1) * limit;

    const search = (params.search || '').trim().toLowerCase();
    const filter = (params.filter || 'ALL').toUpperCase();

    // Điều kiện lọc theo thời gian
    let timeFilterClause = '';
    if (filter === 'ONLINE') {
      timeFilterClause = `AND u."last_active_at" >= NOW() - INTERVAL '15 minutes'`;
    } else if (filter === 'ACTIVE_3D') {
      timeFilterClause = `AND u."last_active_at" >= NOW() - INTERVAL '3 days'`;
    } else if (filter === 'AT_RISK') {
      timeFilterClause = `AND u."last_active_at" < NOW() - INTERVAL '7 days' AND u."last_active_at" >= NOW() - INTERVAL '14 days'`;
    } else if (filter === 'INACTIVE') {
      timeFilterClause = `AND (u."last_active_at" < NOW() - INTERVAL '15 days' OR u."last_active_at" IS NULL)`;
    }

    let searchClause = '';
    const queryParams: any[] = [];
    if (search) {
      queryParams.push(`%${search}%`);
      searchClause = `
        AND (
          LOWER(u."name") LIKE $${queryParams.length}
          OR LOWER(u."email") LIKE $${queryParams.length}
          OR LOWER(COALESCE(u."username", '')) LIKE $${queryParams.length}
          OR LOWER(COALESCE(rr."referralCode", '')) LIKE $${queryParams.length}
        )
      `;
    }

    // Đếm tổng số lượng bản ghi thỏa mãn điều kiện
    const countSql = `
      SELECT COUNT(DISTINCT u."id")::int AS "total"
      FROM "users" u
      LEFT JOIN "referral_relationships" rr ON rr."referredUserId" = u."id"
      WHERE 1=1
      ${timeFilterClause}
      ${searchClause}
    `;

    const countRes = await getPrisma().$queryRawUnsafe<any[]>(countSql, ...queryParams);
    const totalCount = countRes[0]?.total || 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));

    // Truy vấn danh sách người dùng kèm chức năng ưa thích nhất và CTV mời
    const dataSql = `
      SELECT 
        u."id",
        u."name",
        u."email",
        u."avatar",
        u."plan"::text AS "plan",
        u."status"::text AS "status",
        COALESCE(u."is_affiliate", false) AS "is_affiliate",
        u."createdAt",
        u."last_active_at",
        topf."feature_name" AS "top_feature_name",
        COALESCE(topf."use_count", 0)::int AS "top_feature_uses",
        ref_user."name" AS "referrer_name",
        rr."referralCode" AS "referral_code"
      FROM "users" u
      LEFT JOIN "referral_relationships" rr ON rr."referredUserId" = u."id"
      LEFT JOIN "users" ref_user ON ref_user."id" = rr."referrerId"
      LEFT JOIN LATERAL (
        SELECT "feature_name", "use_count"
        FROM "user_feature_analytics"
        WHERE "user_id" = u."id"
        ORDER BY "use_count" DESC
        LIMIT 1
      ) topf ON true
      WHERE 1=1
      ${timeFilterClause}
      ${searchClause}
      ORDER BY COALESCE(u."last_active_at", u."createdAt") DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;

    const usersRaw = await getPrisma().$queryRawUnsafe<any[]>(dataSql, ...queryParams, limit, offset);

    const now = Date.now();
    const users: UserActivityListItem[] = usersRaw.map((u) => {
      const lastActiveTime = u.last_active_at ? new Date(u.last_active_at).getTime() : 0;
      const diffMinutes = Math.floor((now - lastActiveTime) / (60 * 1000));
      const diffDays = Math.floor(diffMinutes / (60 * 24));

      let activityStatus: 'ONLINE' | 'ACTIVE_3D' | 'AT_RISK' | 'INACTIVE' = 'INACTIVE';
      let activityLabel = '⚫ Không hoạt động (>15 ngày)';
      let activityDotColor = 'bg-slate-400';

      if (lastActiveTime > 0 && diffMinutes <= 15) {
        activityStatus = 'ONLINE';
        activityLabel = '🟢 Đang Online';
        activityDotColor = 'bg-emerald-500 animate-pulse';
      } else if (diffDays <= 3) {
        activityStatus = 'ACTIVE_3D';
        activityLabel = diffDays === 0 ? '🔵 Hôm nay' : `🔵 ${diffDays} ngày trước`;
        activityDotColor = 'bg-blue-500';
      } else if (diffDays >= 7 && diffDays <= 14) {
        activityStatus = 'AT_RISK';
        activityLabel = `🟡 Nguy cơ bỏ (${diffDays} ngày)`;
        activityDotColor = 'bg-amber-500';
      } else {
        activityStatus = 'INACTIVE';
        activityLabel = diffDays > 14 ? `⚫ ${diffDays} ngày trước` : '⚫ Chưa hoạt động';
        activityDotColor = 'bg-slate-400';
      }

      return {
        id: u.id,
        name: u.name || 'Người dùng',
        email: u.email,
        avatar: u.avatar,
        plan: u.plan,
        status: u.status,
        isAffiliate: Boolean(u.is_affiliate),
        createdAt: new Date(u.createdAt).toISOString(),
        lastActiveAt: u.last_active_at ? new Date(u.last_active_at).toISOString() : null,
        activityStatus,
        activityLabel,
        activityDotColor,
        topFeatureName: u.top_feature_name || 'Bảng Điều Khiển (Dashboard)',
        topFeatureUses: u.top_feature_uses || 1,
        referrerName: u.referrer_name || null,
        referralCode: u.referral_code || null
      };
    });

    return {
      users,
      pagination: {
        page,
        limit,
        totalPages,
        totalCount
      }
    };
  }

  /**
   * 4. Tính năng "Hồ Sơ X-Quang Người Dùng" (User X-Ray Profile)
   */
  public async getUserXRayProfile(userId: string): Promise<any> {
    const userRaw = await getPrisma().$queryRawUnsafe<any[]>(
      `
      SELECT 
        u."id",
        u."name",
        u."email",
        u."username",
        u."avatar",
        u."role"::text AS "role",
        u."plan"::text AS "plan",
        u."status"::text AS "status",
        COALESCE(u."is_affiliate", false) AS "is_affiliate",
        u."admin_notes",
        u."createdAt",
        u."last_active_at",
        ref_user."name" AS "referrer_name",
        ref_user."email" AS "referrer_email",
        rr."referralCode" AS "referral_code",
        rr."createdAt" AS "referred_at"
      FROM "users" u
      LEFT JOIN "referral_relationships" rr ON rr."referredUserId" = u."id"
      LEFT JOIN "users" ref_user ON ref_user."id" = rr."referrerId"
      WHERE u."id" = $1
      LIMIT 1
      `,
      userId
    );

    if (!userRaw || userRaw.length === 0) {
      throw new Error('Không tìm thấy người dùng.');
    }

    const user = userRaw[0];

    // Chi tiết mức độ sử dụng từng chức năng của người này
    const featuresRaw = await getPrisma().$queryRawUnsafe<any[]>(
      `
      SELECT 
        "feature_key",
        "feature_name",
        "use_count"::int AS "use_count",
        "duration_seconds"::int AS "duration_seconds",
        "first_used_at",
        "last_used_at"
      FROM "user_feature_analytics"
      WHERE "user_id" = $1
      ORDER BY "use_count" DESC, "duration_seconds" DESC
      `,
      userId
    );

    // Tính tổng số ngày đã hoạt động (active days)
    const activeDaysRaw = await getPrisma().$queryRawUnsafe<any[]>(
      `
      SELECT COUNT(DISTINCT DATE("last_used_at"))::int AS "active_days"
      FROM "user_feature_analytics"
      WHERE "user_id" = $1
      `,
      userId
    );

    const activeDays = Math.max(1, activeDaysRaw[0]?.active_days || 1);
    const totalFeatureUses = featuresRaw.reduce((sum, f) => sum + (f.use_count || 0), 0);
    const totalTimeMinutes = Math.round(featuresRaw.reduce((sum, f) => sum + (f.duration_seconds || 0), 0) / 60);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        role: user.role,
        plan: user.plan,
        status: user.status,
        isAffiliate: user.is_affiliate,
        adminNotes: user.admin_notes || '',
        createdAt: user.createdAt,
        lastActiveAt: user.last_active_at,
        activeDays,
        totalFeatureUses,
        totalTimeMinutes
      },
      referrer: user.referrer_name
        ? {
            name: user.referrer_name,
            email: user.referrer_email,
            referralCode: user.referral_code,
            referredAt: user.referred_at
          }
        : null,
      features: featuresRaw.map((f) => ({
        featureKey: f.feature_key,
        featureName: f.feature_name,
        useCount: f.use_count,
        durationMinutes: Math.round(f.duration_seconds / 60),
        firstUsedAt: f.first_used_at,
        lastUsedAt: f.last_used_at
      }))
    };
  }

  /**
   * Cập nhật ghi chú riêng của Admin về khách này
   */
  public async updateAdminNotes(userId: string, notes: string): Promise<boolean> {
    await getPrisma().$executeRawUnsafe(
      `UPDATE "users" SET "admin_notes" = $1, "updatedAt" = NOW() WHERE "id" = $2`,
      notes,
      userId
    );
    return true;
  }

  /**
   * Nâng cấp / Hạ cấp gói dịch vụ nhanh
   */
  public async updateUserPlan(userId: string, plan: string): Promise<boolean> {
    const validPlans = ['FREE', 'STARTER', 'PRO', 'PREMIUM', 'LIFETIME'];
    const cleanPlan = plan.toUpperCase();
    if (!validPlans.includes(cleanPlan)) {
      throw new Error('Gói dịch vụ không hợp lệ.');
    }

    await getPrisma().$executeRawUnsafe(
      `UPDATE "users" SET "plan" = $1::"Plan", "updatedAt" = NOW() WHERE "id" = $2`,
      cleanPlan,
      userId
    );
    return true;
  }

  /**
   * Khóa / Mở khóa tài khoản nhanh
   */
  public async toggleUserStatus(userId: string, status: string): Promise<boolean> {
    const cleanStatus = status.toUpperCase() === 'BANNED' ? 'BANNED' : 'ACTIVE';
    await getPrisma().$executeRawUnsafe(
      `UPDATE "users" SET "status" = $1::"UserStatus", "updatedAt" = NOW() WHERE "id" = $2`,
      cleanStatus,
      userId
    );
    return true;
  }
}

export const productAnalyticsService = new ProductAnalyticsService();
