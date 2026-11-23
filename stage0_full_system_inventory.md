# BẢN ĐỒ KIỂM KÊ TOÀN DIỆN 100% HỆ THỐNG (STAGE 0: FULL SYSTEM INVENTORY)
> **Hội Đồng Kiểm Toán Toàn Diện (System Architect, Security Auditor, DevOps/Cloudflare Engineer, QA Automation Lead)**  
> **Nguyên tắc tối thượng:** Zero-Skip Policy — Đọc code thật từ ổ đĩa, kiểm kê 100% không tóm tắt, không lược bỏ.

---

## MỤC LỤC KIỂM KÊ
1. [Phần 1: 100% Bảng Dữ Liệu & Quan Hệ (103 Prisma Models, 4 Enums)](#phan-1)
2. [Phần 2: 100% Backend REST API Endpoints (404 Endpoints)](#phan-2)
3. [Phần 3: 100% Socket.io Events (24 Real-time Events)](#phan-3)
4. [Phần 4: 100% Frontend Pages, Views, Modals & Components](#phan-4)
5. [Phần 5: 100% Tiến Trình Nền & Dịch Vụ Ngoài (Background Services & Cloud)](#phan-5)

---

<a name="phan-1"></a>
## PHẦN 1: 100% BẢNG DỮ LIỆU & QUAN HỆ TRONG DATABASE (`prisma/schema.prisma`)
*Tổng số lượng: **103 Models** và **4 Enums**.*

### I. CÁC ENUM ĐỊNH DANH (4 ENUMS)
1. **`Role`**: `USER`, `ADMIN`, `SUPERADMIN`
2. **`Plan`**: `FREE`, `PRO`, `TEAM`
3. **`UserStatus`**: `ACTIVE`, `SUSPENDED`, `DISABLED`
4. **`PasswordResetRequestStatus`**: `PENDING`, `APPROVED`, `REJECTED`, `COMPLETED`, `EXPIRED`

### II. 103 BẢNG DỮ LIỆU (MODELS) THEO PHÂN HỆ VÀ LIÊN KẾT NGOẠI KHÓA

#### 1. Xác thực & Quản trị Tài khoản người dùng (Core User & Security)
- **`User`** (118 fields):
  - *Quan hệ ngoại khóa:* `passwordResetRequests` -> `PasswordResetRequest[]`, `approvedResetRequests` -> `PasswordResetRequest[]`, `ownedTeams` -> `Team[]`, `teamMemberships` -> `TeamMember[]`, `referredUsers` -> `ReferralRelationship[]`, `referredBy` -> `ReferralRelationship?`, `referralCommissions` -> `ReferralCommission[]`, `posts` -> `Post[]`, `friendshipsA` -> `Friendship[]`, `friendshipsB` -> `Friendship[]`, `sentDirectMessages` -> `DirectMessage[]`, `receivedDirectMessages` -> `DirectMessage[]`, `ownedCommunities` -> `Community[]`, `blockedUsers` -> `UserBlock[]`, `blockedByUsers` -> `UserBlock[]`, `submittedReports` -> `Report[]`, `hostedClasses` -> `OnlineClass[]`, `communityChatMessages` -> `CommunityChatMessage[]`, `hostedMeets` -> `CommunityMeet[]`
- **`Session`** (6 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`
- **`PasswordResetToken`** (7 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`
- **`PasswordResetRequest`** (15 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`, `approvedByUser` -> `User?`
- **`LoginAttempt`** (8 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User?`
- **`SecurityEvent`** (7 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User?`

#### 2. Năng suất cá nhân, Công việc & Dự án (Productivity & Task Management)
- **`Task`** (24 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`, `project` -> `Project?`, `goal` -> `Goal?`
- **`TaskComment`** (7 fields):
  - *Quan hệ ngoại khóa:* `task` -> `Task`
- **`TaskAttachment`** (7 fields):
  - *Quan hệ ngoại khóa:* `task` -> `Task`
- **`TaskHistory`** (6 fields):
  - *Quan hệ ngoại khóa:* `task` -> `Task`
- **`CalendarEvent`** (14 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`
- **`ScheduleBlock`** (9 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`
- **`Reminder`** (8 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`
- **`Project`** (17 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`
- **`ProjectMember`** (7 fields):
  - *Quan hệ ngoại khóa:* `project` -> `Project`, `user` -> `User`
- **`ProjectMilestone`** (7 fields):
  - *Quan hệ ngoại khóa:* `project` -> `Project`

#### 3. Tập trung & Pomodoro (Focus & High-Scale Pomodoro)
- **`FocusSession`** (15 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`
- **`FocusGoal`** (8 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`

#### 4. Quản lý Tài chính cá nhân (Personal Finance Engine)
- **`FinanceAccount`** (12 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`
- **`Transaction`** (15 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`, `account` -> `FinanceAccount`
- **`Category`** (6 fields):
  - *Quan hệ ngoại khóa:* Không có foreign relation trực tiếp (Standalone / Log table)
- **`Budget`** (9 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`
- **`SavingGoal`** (9 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`
- **`Debt`** (11 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`
- **`RecurringTransaction`** (11 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`

#### 5. Học tập & Quản lý môn học (Study & Academic Tracking)
- **`Subject`** (13 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`
- **`StudyAssignment`** (13 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`, `subject` -> `Subject?`
- **`StudyExam`** (11 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`, `subject` -> `Subject`
- **`StudySession`** (9 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`, `subject` -> `Subject`

#### 6. Thói quen & Mục tiêu dài hạn (Habits & Long-term Goals)
- **`Habit`** (18 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`
- **`HabitLog`** (7 fields):
  - *Quan hệ ngoại khóa:* `habit` -> `Habit`
- **`Goal`** (20 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`
- **`GoalMilestone`** (7 fields):
  - *Quan hệ ngoại khóa:* `goal` -> `Goal`
- **`GoalAction`** (7 fields):
  - *Quan hệ ngoại khóa:* `goal` -> `Goal`

#### 7. Ghi chú & Quản lý tri thức (Notes & Knowledge Base)
- **`Note`** (13 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`
- **`NoteTag`** (6 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`

#### 8. Động cơ Ra quyết định & Tự động hóa (Decision Engine & Automations)
- **`Decision`** (20 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`
- **`AutomationRule`** (17 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`
- **`AutomationExecution`** (10 fields):
  - *Quan hệ ngoại khóa:* `rule` -> `AutomationRule`, `user` -> `User`

#### 9. Thanh toán, Gói dịch vụ & Thương mại (Billing, Subscription & Commerce)
- **`Subscription`** (19 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`
- **`Team`** (10 fields):
  - *Quan hệ ngoại khóa:* `owner` -> `User`, `subscription` -> `Subscription?`
- **`TeamMember`** (7 fields):
  - *Quan hệ ngoại khóa:* `team` -> `Team`, `user` -> `User`
- **`Payment`** (18 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`
- **`Coupon`** (9 fields):
  - *Quan hệ ngoại khóa:* Không có foreign relation trực tiếp (Standalone / Log table)
- **`CartItem`** (7 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`
- **`Order`** (12 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`
- **`PaymentQR`** (17 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`

#### 10. Mẫu hệ thống & Tái sử dụng (System Templates)
- **`SystemTemplate`** (19 fields):
  - *Quan hệ ngoại khóa:* Không có foreign relation trực tiếp (Standalone / Log table)
- **`TemplateUsage`** (6 fields):
  - *Quan hệ ngoại khóa:* `template` -> `SystemTemplate`, `user` -> `User`

#### 11. Động cơ Thông báo & Hòm thư Outbox (Notification & Email Engine)
- **`Notification`** (19 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User?`, `announcement` -> `Announcement?`
- **`UserNotificationPreference`** (14 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`
- **`UserNotificationRule`** (10 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`
- **`UserEmailIntegration`** (13 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`
- **`NotificationDelivery`** (24 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`
- **`Announcement`** (26 fields):
  - *Quan hệ ngoại khóa:* Không có foreign relation trực tiếp (Standalone / Log table)
- **`AnnouncementDelivery`** (12 fields):
  - *Quan hệ ngoại khóa:* `announcement` -> `Announcement`
- **`EmailQueue`** (13 fields):
  - *Quan hệ ngoại khóa:* Không có foreign relation trực tiếp (Standalone / Log table)

#### 12. Hệ thống, Hỗ trợ & Khóa tránh trùng lặp (System, Support & Idempotency)
- **`SupportTicket`** (10 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`
- **`AuditLog`** (10 fields):
  - *Quan hệ ngoại khóa:* Không có foreign relation trực tiếp (Standalone / Log table)
- **`SystemSetting`** (4 fields):
  - *Quan hệ ngoại khóa:* Không có foreign relation trực tiếp (Standalone / Log table)
- **`IdempotencyKey`** (9 fields):
  - *Quan hệ ngoại khóa:* Không có foreign relation trực tiếp (Standalone / Log table)

#### 13. Phân hệ Tùy biến mở rộng (Custom Extensible Modules)
- **`CustomModule`** (9 fields):
  - *Quan hệ ngoại khóa:* Không có foreign relation trực tiếp (Standalone / Log table)
- **`CustomModuleField`** (10 fields):
  - *Quan hệ ngoại khóa:* `module` -> `CustomModule`
- **`CustomModuleRecord`** (8 fields):
  - *Quan hệ ngoại khóa:* `module` -> `CustomModule`, `user` -> `User`
- **`CustomModulePermission`** (10 fields):
  - *Quan hệ ngoại khóa:* `module` -> `CustomModule`

#### 14. Tiếp thị liên kết & Giới thiệu (Affiliate & Referral System)
- **`ReferralProfile`** (13 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`
- **`ReferralRelationship`** (7 fields):
  - *Quan hệ ngoại khóa:* `referrer` -> `User`, `referredUser` -> `User`
- **`ReferralCommission`** (15 fields):
  - *Quan hệ ngoại khóa:* `referrer` -> `User`
- **`WithdrawalRequest`** (20 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`
- **`ReferralTransaction`** (12 fields):
  - *Quan hệ ngoại khóa:* `commission` -> `ReferralCommission?`, `withdrawal` -> `WithdrawalRequest?`

#### 15. Ý kiến đóng góp cộng đồng (Feedback & Feature Voting)
- **`Feedback`** (16 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`
- **`FeedbackVote`** (5 fields):
  - *Quan hệ ngoại khóa:* `feedback` -> `Feedback`

#### 16. Học từ vựng thông minh (Vocab Master Active Recall)
- **`VocabWordProgress`** (22 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`
- **`VocabReviewLog`** (15 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`, `progress` -> `VocabWordProgress`

#### 17. Game hóa RPG & Đấu trường Quái vật (Gamification & RPG System)
- **`JourneyMilestone`** (14 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`
- **`UserProgression`** (29 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`
- **`XPTransaction`** (9 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`
- **`CoinTransaction`** (9 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`
- **`UserReward`** (10 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`
- **`UserEquipment`** (16 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`
- **`UserSkill`** (8 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`
- **`MonsterProgress`** (10 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`
- **`BattleRecord`** (15 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`

#### 18. Lớp học Online & Tích hợp Lịch Google (Classroom & Google Calendar)
- **`OnlineClass`** (17 fields):
  - *Quan hệ ngoại khóa:* `host` -> `User`
- **`OnlineClassParticipant`** (7 fields):
  - *Quan hệ ngoại khóa:* `onlineClass` -> `OnlineClass`, `user` -> `User?`
- **`GoogleCalendarIntegration`** (12 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`

#### 19. Mạng xã hội nội bộ & Kết nối (Social Network, Posts & Direct Chat)
- **`Post`** (26 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`, `community` -> `Community?`
- **`PostReaction`** (7 fields):
  - *Quan hệ ngoại khóa:* `post` -> `Post`, `user` -> `User`
- **`PostComment`** (11 fields):
  - *Quan hệ ngoại khóa:* `post` -> `Post`, `user` -> `User`, `parent` -> `PostComment?`, `replies` -> `PostComment[]`
- **`Community`** (21 fields):
  - *Quan hệ ngoại khóa:* `owner` -> `User`
- **`CommunityMember`** (11 fields):
  - *Quan hệ ngoại khóa:* `community` -> `Community`, `user` -> `User`
- **`CommunityChannel`** (9 fields):
  - *Quan hệ ngoại khóa:* `community` -> `Community`
- **`CommunityChatMessage`** (14 fields):
  - *Quan hệ ngoại khóa:* `community` -> `Community`, `channel` -> `CommunityChannel`, `sender` -> `User`
- **`CommunityMeet`** (20 fields):
  - *Quan hệ ngoại khóa:* `community` -> `Community`, `host` -> `User`
- **`Friendship`** (9 fields):
  - *Quan hệ ngoại khóa:* `userA` -> `User`, `userB` -> `User`
- **`Conversation`** (10 fields):
  - *Quan hệ ngoại khóa:* Không có foreign relation trực tiếp (Standalone / Log table)
- **`DirectMessage`** (12 fields):
  - *Quan hệ ngoại khóa:* `conversation` -> `Conversation`, `sender` -> `User`, `receiver` -> `User`

#### 20. Kiểm duyệt nội dung & Thú cưng ảo (Moderation, Safety & Virtual Pet)
- **`UserBlock`** (6 fields):
  - *Quan hệ ngoại khóa:* `blocker` -> `User`, `blocked` -> `User`
- **`Report`** (10 fields):
  - *Quan hệ ngoại khóa:* `reporter` -> `User`
- **`UserStatusNote`** (6 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`
- **`UserPet`** (18 fields):
  - *Quan hệ ngoại khóa:* `user` -> `User`

#### 21. Thống kê & Phân tích tính năng (Analytics Engine)
- **`FeatureAnalyticsSummary`** (9 fields):
  - *Quan hệ ngoại khóa:* Không có foreign relation trực tiếp (Standalone / Log table)
- **`UserFeatureAnalytics`** (10 fields):
  - *Quan hệ ngoại khóa:* Không có foreign relation trực tiếp (Standalone / Log table)

---

<a name="phan-2"></a>
## PHẦN 2: 100% BACKEND REST API ENDPOINTS (404 ENDPOINTS)
*Toàn bộ 404 endpoints được quét trực tiếp từ 16 route files và `serverMain.ts`.*

| STT | Phương Thức | Đường Dẫn Đầy Đủ (Full Route) | Middleware Xác Thực & Quyền Hạn | File Mã Nguồn | Dòng |
|---|---|---|---|---|---|
| 1 | `GET` | `/health` | Public (Public / CORS) | `src/backend/serverMain.ts` | L187 |
| 2 | `GET` | `/api/health` | Public (Public / CORS) | `src/backend/serverMain.ts` | L209 |
| 3 | `GET` | `/ready` | Public (Public / CORS) | `src/backend/serverMain.ts` | L227 |
| 4 | `GET` | `/api/ready` | Public (Public / CORS) | `src/backend/serverMain.ts` | L237 |
| 5 | `GET` | `/auth/google` | Public / OAuth Redirect (Public / CORS) | `src/backend/serverMain.ts` | L524 |
| 6 | `ALL` | `/api/*` | Public (Public / CORS) | `src/backend/serverMain.ts` | L545 |
| 7 | `POST` | `/api/ai/gemini` | Public (None) | `src/backend/routes/ai.routes.ts` | L59 |
| 8 | `GET` | `/api/ai/telemetry` | Public (None) | `src/backend/routes/ai.routes.ts` | L393 |
| 9 | `POST` | `/api/analytics/track-batch` | Public (None) | `src/backend/routes/analytics.routes.ts` | L16 |
| 10 | `GET` | `/api/analytics/admin/features` | Superadmin / Admin (requireAdmin) (requireAuth, requireAdmin) | `src/backend/routes/analytics.routes.ts` | L52 |
| 11 | `GET` | `/api/analytics/admin/users` | Superadmin / Admin (requireAdmin) (requireAuth, requireAdmin) | `src/backend/routes/analytics.routes.ts` | L70 |
| 12 | `GET` | `/api/analytics/admin/users/:id/xray` | Superadmin / Admin (requireAdmin) (requireAuth, requireAdmin) | `src/backend/routes/analytics.routes.ts` | L95 |
| 13 | `PUT` | `/api/analytics/admin/users/:id/notes` | Superadmin / Admin (requireAdmin) (requireAuth, requireAdmin) | `src/backend/routes/analytics.routes.ts` | L114 |
| 14 | `PUT` | `/api/analytics/admin/users/:id/plan` | Superadmin / Admin (requireAdmin) (requireAuth, requireAdmin) | `src/backend/routes/analytics.routes.ts` | L134 |
| 15 | `PUT` | `/api/analytics/admin/users/:id/status` | Superadmin / Admin (requireAdmin) (requireAuth, requireAdmin) | `src/backend/routes/analytics.routes.ts` | L154 |
| 16 | `GET` | `/api/analytics/admin/study-rooms` | Superadmin / Admin (requireAdmin) (requireAuth, requireAdmin) | `src/backend/routes/analytics.routes.ts` | L174 |
| 17 | `GET` | `/api/languages` | Public (None) | `src/backend/routes/api.ts` | L84 |
| 18 | `GET` | `/api/payments/plans` | Public (None) | `src/backend/routes/api.ts` | L101 |
| 19 | `GET` | `/api/feedback/public` | Public (None) | `src/backend/routes/api.ts` | L140 |
| 20 | `GET` | `/api/posts` | Public (None) | `src/backend/routes/api.ts` | L163 |
| 21 | `GET` | `/api/notifications/gmail/callback` | Public (None) | `src/backend/routes/api.ts` | L174 |
| 22 | `GET` | `/api/health` | Public (None) | `src/backend/routes/api.ts` | L234 |
| 23 | `GET` | `/api/ready` | Public (None) | `src/backend/routes/api.ts` | L249 |
| 24 | `GET` | `/api/settings/global-free-mode` | Public (None) | `src/backend/routes/api.ts` | L259 |
| 25 | `GET` | `/api/auth/google` | Public (None) | `src/backend/routes/api.ts` | L269 |
| 26 | `GET` | `/api/auth/google/callback` | Public (None) | `src/backend/routes/api.ts` | L270 |
| 27 | `GET` | `/api/version` | Public (None) | `src/backend/routes/api.ts` | L276 |
| 28 | `GET` | `/api/global-chat/messages` | Public (None) | `src/backend/routes/api.ts` | L286 |
| 29 | `POST` | `/api/global-chat/messages` | Public (None) | `src/backend/routes/api.ts` | L292 |
| 30 | `GET` | `/api/global-chat/stream` | Public (None) | `src/backend/routes/api.ts` | L306 |
| 31 | `POST` | `/api/posts` | Public (None) | `src/backend/routes/api.ts` | L390 |
| 32 | `POST` | `/api/posts/:id/like` | Public (None) | `src/backend/routes/api.ts` | L399 |
| 33 | `DELETE` | `/api/posts/:id` | Public (None) | `src/backend/routes/api.ts` | L408 |
| 34 | `POST` | `/api/data-batch` | Public (None) | `src/backend/routes/api.ts` | L462 |
| 35 | `GET` | `/api/data/:collection` | Public (None) | `src/backend/routes/api.ts` | L528 |
| 36 | `POST` | `/api/templates/:id/apply` | Public (None) | `src/backend/routes/api.ts` | L562 |
| 37 | `GET` | `/api/journey` | Public (None) | `src/backend/routes/api.ts` | L1191 |
| 38 | `POST` | `/api/journey/milestone` | Public (None) | `src/backend/routes/api.ts` | L1205 |
| 39 | `DELETE` | `/api/journey/milestone/:id` | Public (None) | `src/backend/routes/api.ts` | L1239 |
| 40 | `GET` | `/api/leaderboard` | Public (None) | `src/backend/routes/api.ts` | L1258 |
| 41 | `GET` | `/api/progression` | Public (None) | `src/backend/routes/api.ts` | L1275 |
| 42 | `POST` | `/api/progression/quest/claim` | Public (None) | `src/backend/routes/api.ts` | L1289 |
| 43 | `POST` | `/api/progression/challenge/claim` | Public (None) | `src/backend/routes/api.ts` | L1309 |
| 44 | `POST` | `/api/progression/reward/unlock` | Public (None) | `src/backend/routes/api.ts` | L1329 |
| 45 | `POST` | `/api/progression/reward/equip` | Public (None) | `src/backend/routes/api.ts` | L1349 |
| 46 | `POST` | `/api/progression/chest/open` | Public (None) | `src/backend/routes/api.ts` | L1370 |
| 47 | `GET` | `/api/rpg/character` | Public (None) | `src/backend/routes/api.ts` | L1389 |
| 48 | `GET` | `/api/rpg/monsters` | Public (None) | `src/backend/routes/api.ts` | L1405 |
| 49 | `POST` | `/api/rpg/battle` | Public (None) | `src/backend/routes/api.ts` | L1420 |
| 50 | `GET` | `/api/rpg/equipment` | Public (None) | `src/backend/routes/api.ts` | L1440 |
| 51 | `POST` | `/api/rpg/equipment/equip` | Public (None) | `src/backend/routes/api.ts` | L1456 |
| 52 | `POST` | `/api/rpg/equipment/upgrade` | Public (None) | `src/backend/routes/api.ts` | L1477 |
| 53 | `GET` | `/api/rpg/skills` | Public (None) | `src/backend/routes/api.ts` | L1498 |
| 54 | `POST` | `/api/rpg/skills/unlock` | Public (None) | `src/backend/routes/api.ts` | L1513 |
| 55 | `GET` | `/api/rpg/battles/history` | Public (None) | `src/backend/routes/api.ts` | L1534 |
| 56 | `POST` | `/api/habits/:id/toggle` | Public (None) | `src/backend/routes/api.ts` | L1558 |
| 57 | `POST` | `/api/data/:collection` | Public (None) | `src/backend/routes/api.ts` | L1647 |
| 58 | `PUT` | `/api/data/:collection/:id` | Public (None) | `src/backend/routes/api.ts` | L1804 |
| 59 | `DELETE` | `/api/data/:collection/:id` | Public (None) | `src/backend/routes/api.ts` | L1999 |
| 60 | `DELETE` | `/api/notifications/all` | Public (None) | `src/backend/routes/api.ts` | L2070 |
| 61 | `PUT` | `/api/notifications/:id/read` | Public (None) | `src/backend/routes/api.ts` | L2087 |
| 62 | `PUT` | `/api/notifications/read-all` | Public (None) | `src/backend/routes/api.ts` | L2123 |
| 63 | `DELETE` | `/api/notifications/:id` | Public (None) | `src/backend/routes/api.ts` | L2149 |
| 64 | `GET` | `/api/notifications/settings` | Public (None) | `src/backend/routes/api.ts` | L2164 |
| 65 | `PUT` | `/api/notifications/settings` | Public (None) | `src/backend/routes/api.ts` | L2201 |
| 66 | `PUT` | `/api/notifications/rules` | Public (None) | `src/backend/routes/api.ts` | L2251 |
| 67 | `GET` | `/api/notifications/gmail/auth-url` | Public (None) | `src/backend/routes/api.ts` | L2289 |
| 68 | `POST` | `/api/notifications/gmail/disconnect` | Public (None) | `src/backend/routes/api.ts` | L2307 |
| 69 | `POST` | `/api/notifications/test-email` | Public (None) | `src/backend/routes/api.ts` | L2318 |
| 70 | `GET` | `/api/notifications/deliveries` | Public (None) | `src/backend/routes/api.ts` | L2330 |
| 71 | `POST` | `/api/coupons/validate` | Public (None) | `src/backend/routes/api.ts` | L2349 |
| 72 | `POST` | `/api/cart/checkout` | Public (None) | `src/backend/routes/api.ts` | L2410 |
| 73 | `GET` | `/api/payments/bank-config` | Public (None) | `src/backend/routes/api.ts` | L2770 |
| 74 | `GET` | `/api/payments/plans` | Public (None) | `src/backend/routes/api.ts` | L2780 |
| 75 | `PUT` | `/api/admin/payments/bank-config` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L2813 |
| 76 | `GET` | `/api/admin/plans` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L2845 |
| 77 | `PUT` | `/api/admin/plans/:id` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L2859 |
| 78 | `GET` | `/api/admin/plans/audit-history` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L2957 |
| 79 | `POST` | `/api/admin/plans/reset-defaults` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L2975 |
| 80 | `GET` | `/api/admin/languages` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L3006 |
| 81 | `PUT` | `/api/admin/languages` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L3019 |
| 82 | `DELETE` | `/api/admin/languages/:code` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L3069 |
| 83 | `POST` | `/api/payments/checkout-session` | Public (None) | `src/backend/routes/api.ts` | L3110 |
| 84 | `POST` | `/api/payments/submit-request` | Public (None) | `src/backend/routes/api.ts` | L3280 |
| 85 | `GET` | `/api/payments/my-requests` | Public (None) | `src/backend/routes/api.ts` | L3386 |
| 86 | `GET` | `/api/payments/active-pending-request` | Public (None) | `src/backend/routes/api.ts` | L3406 |
| 87 | `POST` | `/api/payments/cancel-request` | Public (None) | `src/backend/routes/api.ts` | L3429 |
| 88 | `GET` | `/api/admin/payments/requests` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L3475 |
| 89 | `POST` | `/api/admin/payments/:id/approve` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L3549 |
| 90 | `POST` | `/api/admin/payments/:id/reject` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L3703 |
| 91 | `POST` | `/api/admin/payments/:id/refund` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L3807 |
| 92 | `GET` | `/api/admin/subscriptions` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L3838 |
| 93 | `GET` | `/api/payments/subscription` | Public (None) | `src/backend/routes/api.ts` | L3860 |
| 94 | `GET` | `/api/team/my-team` | Public (None) | `src/backend/routes/api.ts` | L3913 |
| 95 | `PUT` | `/api/team/name` | Public (None) | `src/backend/routes/api.ts` | L3925 |
| 96 | `POST` | `/api/team/members` | Public (None) | `src/backend/routes/api.ts` | L3942 |
| 97 | `DELETE` | `/api/team/members/:userId` | Public (None) | `src/backend/routes/api.ts` | L3959 |
| 98 | `GET` | `/api/team/invite-code` | Public (None) | `src/backend/routes/api.ts` | L3973 |
| 99 | `POST` | `/api/team/join` | Public (None) | `src/backend/routes/api.ts` | L3982 |
| 100 | `POST` | `/api/payments/subscription/cancel-auto-renew` | Public (None) | `src/backend/routes/api.ts` | L4000 |
| 101 | `POST` | `/api/payments/subscription/resume-auto-renew` | Public (None) | `src/backend/routes/api.ts` | L4036 |
| 102 | `POST` | `/api/auth/upgrade-plan` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L4063 |
| 103 | `GET` | `/api/admin/saas-metrics` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L4112 |
| 104 | `POST` | `/api/admin/users/:id/grant-subscription` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L4125 |
| 105 | `POST` | `/api/admin/users/:id/revoke-subscription` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L4161 |
| 106 | `GET` | `/api/admin/users/:id/detail` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L4194 |
| 107 | `PUT` | `/api/admin/users/:id/admin-notes` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L4251 |
| 108 | `GET` | `/api/admin/reset-requests` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L4277 |
| 109 | `POST` | `/api/admin/reset-requests/:id/action` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L4368 |
| 110 | `GET` | `/api/life-harmony` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/api.ts` | L4518 |
| 111 | `GET` | `/api/today` | Public (None) | `src/backend/routes/api.ts` | L4538 |
| 112 | `POST` | `/api/finance/transaction` | Public (None) | `src/backend/routes/api.ts` | L4642 |
| 113 | `POST` | `/api/focus/complete` | Public (None) | `src/backend/routes/api.ts` | L4659 |
| 114 | `POST` | `/api/decisions/:id/select-option` | Public (None) | `src/backend/routes/api.ts` | L4727 |
| 115 | `POST` | `/api/decisions/evaluate` | Public (None) | `src/backend/routes/api.ts` | L4761 |
| 116 | `POST` | `/api/decisions/:id/convert-execution` | Public (None) | `src/backend/routes/api.ts` | L4776 |
| 117 | `POST` | `/api/automations/evaluate` | Public (None) | `src/backend/routes/api.ts` | L4829 |
| 118 | `GET` | `/api/settings` | Public (None) | `src/backend/routes/api.ts` | L4844 |
| 119 | `PUT` | `/api/settings` | Public (None) | `src/backend/routes/api.ts` | L4854 |
| 120 | `POST` | `/api/clear-workspace` | Public (None) | `src/backend/routes/api.ts` | L4864 |
| 121 | `GET` | `/api/admin/settings/global-free-mode` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L4877 |
| 122 | `GET` | `/api/admin/free-mode` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L4887 |
| 123 | `POST` | `/api/admin/settings/global-free-mode` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L4896 |
| 124 | `POST` | `/api/admin/free-mode/toggle` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L4921 |
| 125 | `GET` | `/api/admin/metrics` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L4952 |
| 126 | `GET` | `/api/admin/users` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L4997 |
| 127 | `POST` | `/api/admin/users` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L5014 |
| 128 | `PUT` | `/api/admin/users/:id/status` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L5068 |
| 129 | `PUT` | `/api/admin/users/:id/affiliate` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L5102 |
| 130 | `PUT` | `/api/admin/users/:id/plan` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L5146 |
| 131 | `PUT` | `/api/admin/users/:id/reset-password` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L5186 |
| 132 | `GET` | `/api/admin/audit-logs` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L5218 |
| 133 | `GET` | `/api/admin/export/:collection` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L5242 |
| 134 | `GET` | `/api/tasks/:taskId/attachments` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/api.ts` | L5264 |
| 135 | `POST` | `/api/tasks/:taskId/attachments` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/api.ts` | L5290 |
| 136 | `DELETE` | `/api/tasks/:taskId/attachments/:attachmentId` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/api.ts` | L5340 |
| 137 | `GET` | `/api/workspace/backup/export` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/api.ts` | L5365 |
| 138 | `POST` | `/api/workspace/backup/import` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/api.ts` | L5468 |
| 139 | `GET` | `/api/admin/gmail/config` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L5670 |
| 140 | `PUT` | `/api/admin/gmail/config` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L5690 |
| 141 | `POST` | `/api/admin/gmail/test` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L5720 |
| 142 | `GET` | `/api/admin/gmail/logs` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L5734 |
| 143 | `GET` | `/api/admin/email-queue` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L5752 |
| 144 | `GET` | `/api/admin/email-queue/stats` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L5774 |
| 145 | `POST` | `/api/admin/email-queue/:id/retry` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L5785 |
| 146 | `DELETE` | `/api/admin/email-queue/:id` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L5800 |
| 147 | `POST` | `/api/admin/email-queue/test` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L5815 |
| 148 | `GET` | `/api/referrals/top` | Public (None) | `src/backend/routes/api.ts` | L5866 |
| 149 | `GET` | `/api/referrals/dashboard` | Public (None) | `src/backend/routes/api.ts` | L5892 |
| 150 | `POST` | `/api/referrals/apply` | Public (None) | `src/backend/routes/api.ts` | L5907 |
| 151 | `POST` | `/api/referrals/withdraw` | Public (None) | `src/backend/routes/api.ts` | L5942 |
| 152 | `GET` | `/api/referrals/withdrawals` | Public (None) | `src/backend/routes/api.ts` | L5977 |
| 153 | `GET` | `/api/admin/referrals/overview` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L5991 |
| 154 | `GET` | `/api/admin/referrals/withdrawals` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L6005 |
| 155 | `POST` | `/api/admin/referrals/withdrawals/:id/approve` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L6020 |
| 156 | `POST` | `/api/admin/referrals/withdrawals/:id/reject` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L6037 |
| 157 | `GET` | `/api/admin/referrals/settings` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L6058 |
| 158 | `POST` | `/api/admin/referrals/settings` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L6072 |
| 159 | `POST` | `/api/admin/referrals/orders/confirm` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L6092 |
| 160 | `GET` | `/api/referrals/payment-qr` | Public (None) | `src/backend/routes/api.ts` | L6116 |
| 161 | `POST` | `/api/referrals/payment-qr` | Public (None) | `src/backend/routes/api.ts` | L6130 |
| 162 | `DELETE` | `/api/referrals/payment-qr` | Public (None) | `src/backend/routes/api.ts` | L6159 |
| 163 | `GET` | `/api/admin/referrals/payment-qrs` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L6173 |
| 164 | `POST` | `/api/admin/referrals/payment-qr/:id/verify` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L6191 |
| 165 | `POST` | `/api/admin/referrals/payment-qr/:id/reject` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L6207 |
| 166 | `POST` | `/api/feedback` | Public (None) | `src/backend/routes/api.ts` | L6232 |
| 167 | `GET` | `/api/feedback/my` | Public (None) | `src/backend/routes/api.ts` | L6268 |
| 168 | `POST` | `/api/feedback/:id/vote` | Public (None) | `src/backend/routes/api.ts` | L6282 |
| 169 | `GET` | `/api/admin/feedback` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L6296 |
| 170 | `PATCH` | `/api/admin/feedback/:id` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L6316 |
| 171 | `GET` | `/api/admin/announcements/audience-preview` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L6345 |
| 172 | `GET` | `/api/admin/announcements` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L6369 |
| 173 | `GET` | `/api/admin/announcements/:id` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L6385 |
| 174 | `POST` | `/api/admin/announcements` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L6399 |
| 175 | `PUT` | `/api/admin/announcements/:id` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L6418 |
| 176 | `POST` | `/api/admin/announcements/:id/publish` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L6437 |
| 177 | `POST` | `/api/admin/announcements/:id/cancel` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L6456 |
| 178 | `POST` | `/api/admin/announcements/:id/archive` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L6475 |
| 179 | `DELETE` | `/api/admin/announcements/:id` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L6494 |
| 180 | `POST` | `/api/admin/announcements/broadcast-now` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L6512 |
| 181 | `POST` | `/api/admin/announcements/:id/deliveries/:deliveryId/retry` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L6531 |
| 182 | `POST` | `/api/admin/announcements/:id/retry-failed` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L6546 |
| 183 | `GET` | `/api/announcements/active` | Public (None) | `src/backend/routes/api.ts` | L6564 |
| 184 | `POST` | `/api/announcements/:id/acknowledge` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/api.ts` | L6575 |
| 185 | `POST` | `/api/announcements/:id/click` | Public (None) | `src/backend/routes/api.ts` | L6586 |
| 186 | `POST` | `/api/admin/announcements/:id/toggle-pin` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L6597 |
| 187 | `POST` | `/api/admin/announcements/:id/remind-unread` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L6612 |
| 188 | `GET` | `/api/admin/announcements/:id/receipts` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L6627 |
| 189 | `POST` | `/api/admin/announcements/preview-email` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L6638 |
| 190 | `GET` | `/api/admin/wordpress/config` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L6660 |
| 191 | `POST` | `/api/admin/wordpress/config` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L6671 |
| 192 | `POST` | `/api/admin/wordpress/test` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/api.ts` | L6682 |
| 193 | `POST` | `/api/auth/register` | Public (None) | `src/backend/routes/auth.ts` | L58 |
| 194 | `POST` | `/api/user/register` | Public (None) | `src/backend/routes/auth.ts` | L58 |
| 195 | `POST` | `/api/auth/login` | Public (None) | `src/backend/routes/auth.ts` | L262 |
| 196 | `POST` | `/api/user/login` | Public (None) | `src/backend/routes/auth.ts` | L262 |
| 197 | `POST` | `/api/auth/logout` | Public (None) | `src/backend/routes/auth.ts` | L469 |
| 198 | `POST` | `/api/user/logout` | Public (None) | `src/backend/routes/auth.ts` | L469 |
| 199 | `POST` | `/api/auth/logout-all` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/auth.ts` | L481 |
| 200 | `POST` | `/api/user/logout-all` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/auth.ts` | L481 |
| 201 | `GET` | `/api/auth/me` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/auth.ts` | L501 |
| 202 | `GET` | `/api/user/me` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/auth.ts` | L501 |
| 203 | `GET` | `/api/auth/unified-stats` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/auth.ts` | L622 |
| 204 | `GET` | `/api/user/unified-stats` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/auth.ts` | L622 |
| 205 | `PUT` | `/api/auth/profile` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/auth.ts` | L637 |
| 206 | `PUT` | `/api/user/profile` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/auth.ts` | L637 |
| 207 | `POST` | `/api/auth/change-password` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/auth.ts` | L674 |
| 208 | `POST` | `/api/user/change-password` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/auth.ts` | L674 |
| 209 | `DELETE` | `/api/auth/account` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/auth.ts` | L727 |
| 210 | `DELETE` | `/api/user/account` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/auth.ts` | L727 |
| 211 | `GET` | `/api/auth/export-data` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/auth.ts` | L834 |
| 212 | `GET` | `/api/user/export-data` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/auth.ts` | L834 |
| 213 | `GET` | `/api/auth/verify-reset-token` | Public (None) | `src/backend/routes/auth.ts` | L900 |
| 214 | `GET` | `/api/user/verify-reset-token` | Public (None) | `src/backend/routes/auth.ts` | L900 |
| 215 | `POST` | `/api/auth/forgot-password` | Public (None) | `src/backend/routes/auth.ts` | L955 |
| 216 | `POST` | `/api/user/forgot-password` | Public (None) | `src/backend/routes/auth.ts` | L955 |
| 217 | `POST` | `/api/auth/reset-password` | Public (None) | `src/backend/routes/auth.ts` | L1032 |
| 218 | `POST` | `/api/user/reset-password` | Public (None) | `src/backend/routes/auth.ts` | L1032 |
| 219 | `GET` | `/api/auth/google/config` | Public (None) | `src/backend/routes/auth.ts` | L1153 |
| 220 | `GET` | `/api/user/google/config` | Public (None) | `src/backend/routes/auth.ts` | L1153 |
| 221 | `GET` | `/api/auth/google` | Public (None) | `src/backend/routes/auth.ts` | L1213 |
| 222 | `GET` | `/api/user/google` | Public (None) | `src/backend/routes/auth.ts` | L1213 |
| 223 | `GET` | `/api/auth/google/callback` | Public (None) | `src/backend/routes/auth.ts` | L1469 |
| 224 | `GET` | `/api/user/google/callback` | Public (None) | `src/backend/routes/auth.ts` | L1469 |
| 225 | `GET` | `/api/auth/callback/google` | Public (None) | `src/backend/routes/auth.ts` | L1470 |
| 226 | `GET` | `/api/user/callback/google` | Public (None) | `src/backend/routes/auth.ts` | L1470 |
| 227 | `POST` | `/api/auth/google/credential` | Public (None) | `src/backend/routes/auth.ts` | L1473 |
| 228 | `POST` | `/api/user/google/credential` | Public (None) | `src/backend/routes/auth.ts` | L1473 |
| 229 | `POST` | `/api/auth/onboarding-setup` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/auth.ts` | L1612 |
| 230 | `POST` | `/api/user/onboarding-setup` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/auth.ts` | L1612 |
| 231 | `GET` | `/api/auth/sessions` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/auth.ts` | L1658 |
| 232 | `GET` | `/api/user/sessions` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/auth.ts` | L1658 |
| 233 | `POST` | `/api/auth/sessions/revoke-others` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/auth.ts` | L1690 |
| 234 | `POST` | `/api/user/sessions/revoke-others` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/auth.ts` | L1690 |
| 235 | `POST` | `/api/auth/reset-request` | Public (None) | `src/backend/routes/auth.ts` | L1741 |
| 236 | `POST` | `/api/user/reset-request` | Public (None) | `src/backend/routes/auth.ts` | L1741 |
| 237 | `POST` | `/api/auth/reset-status` | Public (None) | `src/backend/routes/auth.ts` | L1869 |
| 238 | `POST` | `/api/user/reset-status` | Public (None) | `src/backend/routes/auth.ts` | L1869 |
| 239 | `POST` | `/api/auth/reset-cancel` | Public (None) | `src/backend/routes/auth.ts` | L1958 |
| 240 | `POST` | `/api/user/reset-cancel` | Public (None) | `src/backend/routes/auth.ts` | L1958 |
| 241 | `POST` | `/api/auth/reset-confirm` | Public (None) | `src/backend/routes/auth.ts` | L2002 |
| 242 | `POST` | `/api/user/reset-confirm` | Public (None) | `src/backend/routes/auth.ts` | L2002 |
| 243 | `GET` | `/api/classroom/google/status` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/classroom.routes.ts` | L37 |
| 244 | `GET` | `/api/classroom/google/auth-url` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/classroom.routes.ts` | L48 |
| 245 | `GET` | `/api/classroom/google/callback` | Public (None) | `src/backend/routes/classroom.routes.ts` | L60 |
| 246 | `DELETE` | `/api/classroom/google` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/classroom.routes.ts` | L85 |
| 247 | `GET` | `/api/classroom/classes` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/classroom.routes.ts` | L99 |
| 248 | `POST` | `/api/classroom/classes` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/classroom.routes.ts` | L110 |
| 249 | `PATCH` | `/api/classroom/classes/:id` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/classroom.routes.ts` | L124 |
| 250 | `DELETE` | `/api/classroom/classes/:id` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/classroom.routes.ts` | L138 |
| 251 | `POST` | `/api/classroom/classes/:id/prep-task` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/classroom.routes.ts` | L152 |
| 252 | `POST` | `/api/classroom/classes/:id/record-session` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/classroom.routes.ts` | L166 |
| 253 | `GET` | `/api/connect/profile/me` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L15 |
| 254 | `PUT` | `/api/connect/profile/me` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L29 |
| 255 | `GET` | `/api/connect/profile/:userId` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L39 |
| 256 | `GET` | `/api/connect/explore` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L54 |
| 257 | `GET` | `/api/connect/friends` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L75 |
| 258 | `GET` | `/api/connect/friends/requests` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L86 |
| 259 | `POST` | `/api/connect/friends/request/:targetUserId` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L96 |
| 260 | `POST` | `/api/connect/friends/accept/:targetUserId` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L106 |
| 261 | `DELETE` | `/api/connect/friends/request/:targetUserId` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L116 |
| 262 | `DELETE` | `/api/connect/friends/:friendId` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L126 |
| 263 | `GET` | `/api/connect/friends/mutual/:targetUserId` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L136 |
| 264 | `GET` | `/api/connect/messages/stream` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L150 |
| 265 | `GET` | `/api/connect/messages/conversations` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L179 |
| 266 | `POST` | `/api/connect/messages/conversations` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L189 |
| 267 | `GET` | `/api/connect/messages/conversations/:conversationId` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L204 |
| 268 | `POST` | `/api/connect/messages/conversations/:conversationId` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L220 |
| 269 | `POST` | `/api/connect/messages/conversations/:conversationId/read` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L236 |
| 270 | `GET` | `/api/connect/posts` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L253 |
| 271 | `POST` | `/api/connect/posts` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L269 |
| 272 | `DELETE` | `/api/connect/posts/:postId` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L279 |
| 273 | `POST` | `/api/connect/posts/:postId/react` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L289 |
| 274 | `GET` | `/api/connect/posts/:postId/comments` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L300 |
| 275 | `POST` | `/api/connect/posts/:postId/comments` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L310 |
| 276 | `DELETE` | `/api/connect/posts/comments/:commentId` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L321 |
| 277 | `GET` | `/api/connect/communities` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L335 |
| 278 | `POST` | `/api/connect/communities` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L350 |
| 279 | `POST` | `/api/connect/communities/:communityId/join` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L360 |
| 280 | `POST` | `/api/connect/communities/:communityId/leave` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L370 |
| 281 | `GET` | `/api/connect/communities/:communityId/members` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L380 |
| 282 | `POST` | `/api/connect/block/:targetUserId` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L394 |
| 283 | `DELETE` | `/api/connect/block/:targetUserId` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L404 |
| 284 | `GET` | `/api/connect/blocks` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L414 |
| 285 | `POST` | `/api/connect/report` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L424 |
| 286 | `POST` | `/api/connect/posts/:postId/poll/vote` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L438 |
| 287 | `POST` | `/api/connect/posts/:postId/pin` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L453 |
| 288 | `PUT` | `/api/connect/posts/:postId` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L463 |
| 289 | `GET` | `/api/connect/communities/:communityId/details` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L482 |
| 290 | `PUT` | `/api/connect/communities/:communityId/settings` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L492 |
| 291 | `GET` | `/api/connect/communities/:communityId/pending-members` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L502 |
| 292 | `POST` | `/api/connect/communities/:communityId/pending-members/:targetUserId/approve` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L512 |
| 293 | `POST` | `/api/connect/communities/:communityId/pending-members/:targetUserId/reject` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L522 |
| 294 | `GET` | `/api/connect/communities/:communityId/pending-posts` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L532 |
| 295 | `POST` | `/api/connect/communities/:communityId/pending-posts/:postId/approve` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L542 |
| 296 | `POST` | `/api/connect/communities/:communityId/pending-posts/:postId/reject` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L552 |
| 297 | `GET` | `/api/connect/communities/:communityId/all-members` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L562 |
| 298 | `PUT` | `/api/connect/communities/:communityId/members/:targetUserId/role` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L572 |
| 299 | `PUT` | `/api/connect/communities/:communityId/members/:targetUserId/mute` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L583 |
| 300 | `DELETE` | `/api/connect/communities/:communityId/members/:targetUserId/kick` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L594 |
| 301 | `GET` | `/api/connect/communities/:communityId/channels` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L609 |
| 302 | `POST` | `/api/connect/communities/:communityId/channels` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L619 |
| 303 | `GET` | `/api/connect/communities/:communityId/channels/:channelId/messages` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L629 |
| 304 | `POST` | `/api/connect/communities/:communityId/channels/:channelId/messages` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L646 |
| 305 | `POST` | `/api/connect/communities/:communityId/messages/:messageId/pin` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L661 |
| 306 | `POST` | `/api/connect/communities/:communityId/messages/:messageId/react` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L671 |
| 307 | `DELETE` | `/api/connect/communities/:communityId/messages/:messageId` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L682 |
| 308 | `POST` | `/api/connect/communities/:communityId/meets` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L696 |
| 309 | `GET` | `/api/connect/communities/:communityId/meets` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L706 |
| 310 | `GET` | `/api/connect/meets/:roomCode` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L716 |
| 311 | `POST` | `/api/connect/meets/:roomCode/join` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L726 |
| 312 | `POST` | `/api/connect/meets/:roomCode/waiting/:targetUserId/approve` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L736 |
| 313 | `POST` | `/api/connect/meets/:roomCode/waiting/:targetUserId/reject` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L746 |
| 314 | `POST` | `/api/connect/meets/:roomCode/waiting/approve-all` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L756 |
| 315 | `POST` | `/api/connect/meets/:roomCode/controls` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L766 |
| 316 | `POST` | `/api/connect/meets/:roomCode/reminder` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L776 |
| 317 | `POST` | `/api/connect/meets/:roomCode/heartbeat` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L786 |
| 318 | `GET` | `/api/connect/admin/stats` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L800 |
| 319 | `DELETE` | `/api/connect/admin/communities/:communityId` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/connect.routes.ts` | L809 |
| 320 | `GET` | `/api/cron/status` | Public (None) | `src/backend/routes/cron.routes.ts` | L29 |
| 321 | `POST` | `/api/cron/trigger` | Public (None) | `src/backend/routes/cron.routes.ts` | L49 |
| 322 | `GET` | `/api/cron/cloudflare-preflight` | Public (None) | `src/backend/routes/cron.routes.ts` | L85 |
| 323 | `GET` | `/api/custom-modules` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/customModules.routes.ts` | L16 |
| 324 | `POST` | `/api/custom-modules` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/customModules.routes.ts` | L43 |
| 325 | `PUT` | `/api/custom-modules/:id` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/customModules.routes.ts` | L120 |
| 326 | `DELETE` | `/api/custom-modules/:id` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/customModules.routes.ts` | L199 |
| 327 | `GET` | `/api/custom-modules/:slug/records` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/customModules.routes.ts` | L239 |
| 328 | `POST` | `/api/custom-modules/:slug/records` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/customModules.routes.ts` | L281 |
| 329 | `PUT` | `/api/custom-modules/:slug/records/:id` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/customModules.routes.ts` | L330 |
| 330 | `DELETE` | `/api/custom-modules/:slug/records/:id` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/customModules.routes.ts` | L376 |
| 331 | `POST` | `/api/notifications/dispatch` | Public (None) | `src/backend/routes/notifications.routes.ts` | L14 |
| 332 | `GET` | `/api/notifications/email-config` | Public (None) | `src/backend/routes/notifications.routes.ts` | L79 |
| 333 | `POST` | `/api/notifications/email-config` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/notifications.routes.ts` | L106 |
| 334 | `POST` | `/api/notifications/preview` | Public (None) | `src/backend/routes/notifications.routes.ts` | L170 |
| 335 | `POST` | `/api/notifications/test-email` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/notifications.routes.ts` | L196 |
| 336 | `GET` | `/api/pet` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/pet.routes.ts` | L8 |
| 337 | `POST` | `/api/pet/feed` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/pet.routes.ts` | L18 |
| 338 | `POST` | `/api/pet/pet` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/pet.routes.ts` | L28 |
| 339 | `POST` | `/api/pet/rename` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/pet.routes.ts` | L38 |
| 340 | `POST` | `/api/pet/customize` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/pet.routes.ts` | L49 |
| 341 | `GET` | `/api/r2/status` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/r2.routes.ts` | L17 |
| 342 | `POST` | `/api/r2/presigned-url` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/r2.routes.ts` | L35 |
| 343 | `POST` | `/api/r2/upload-base64` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/r2.routes.ts` | L65 |
| 344 | `GET` | `/api/r2/files` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/r2.routes.ts` | L112 |
| 345 | `GET` | `/api/r2/metadata` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/r2.routes.ts` | L134 |
| 346 | `GET` | `/api/r2/download` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/r2.routes.ts` | L161 |
| 347 | `DELETE` | `/api/r2/file` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/r2.routes.ts` | L188 |
| 348 | `GET` | `(Unmounted in serverMain.ts)/overview` | Superadmin / Admin (requireAdmin) (requireAuth, requireAdmin) | `src/backend/routes/storageAudit.routes.ts` | L20 |
| 349 | `GET` | `(Unmounted in serverMain.ts)/orphans` | Superadmin / Admin (requireAdmin) (requireAuth, requireAdmin) | `src/backend/routes/storageAudit.routes.ts` | L33 |
| 350 | `GET` | `(Unmounted in serverMain.ts)/r2-orphans` | Superadmin / Admin (requireAdmin) (requireAuth, requireAdmin) | `src/backend/routes/storageAudit.routes.ts` | L46 |
| 351 | `GET` | `(Unmounted in serverMain.ts)/cleanup-history` | Superadmin / Admin (requireAdmin) (requireAuth, requireAdmin) | `src/backend/routes/storageAudit.routes.ts` | L59 |
| 352 | `POST` | `(Unmounted in serverMain.ts)/backup/trigger` | Superadmin / Admin (requireAdmin) (requireAuth, requireAdmin) | `src/backend/routes/storageAudit.routes.ts` | L72 |
| 353 | `POST` | `(Unmounted in serverMain.ts)/cleanup` | Superadmin / Admin (requireAdmin) (requireAuth, requireAdmin) | `src/backend/routes/storageAudit.routes.ts` | L88 |
| 354 | `GET` | `(Unmounted in serverMain.ts)/breakdown` | Superadmin / Admin (requireAdmin) (requireAuth, requireAdmin) | `src/backend/routes/storageAudit.routes.ts` | L130 |
| 355 | `POST` | `(Unmounted in serverMain.ts)/smart-clean` | Superadmin / Admin (requireAdmin) (requireAuth, requireAdmin) | `src/backend/routes/storageAudit.routes.ts` | L140 |
| 356 | `GET` | `(Unmounted in serverMain.ts)/export-csv` | Superadmin / Admin (requireAdmin) (requireAuth, requireAdmin) | `src/backend/routes/storageAudit.routes.ts` | L150 |
| 357 | `GET` | `(Unmounted in serverMain.ts)/backup-json` | Superadmin / Admin (requireAdmin) (requireAuth, requireAdmin) | `src/backend/routes/storageAudit.routes.ts` | L163 |
| 358 | `POST` | `(Unmounted in serverMain.ts)/restore-json` | Superadmin / Admin (requireAdmin) (requireAuth, requireAdmin) | `src/backend/routes/storageAudit.routes.ts` | L176 |
| 359 | `GET` | `(Unmounted in serverMain.ts)/auto-protection` | Superadmin / Admin (requireAdmin) (requireAuth, requireAdmin) | `src/backend/routes/storageAudit.routes.ts` | L186 |
| 360 | `POST` | `(Unmounted in serverMain.ts)/auto-protection` | Superadmin / Admin (requireAdmin) (requireAuth, requireAdmin) | `src/backend/routes/storageAudit.routes.ts` | L195 |
| 361 | `POST` | `(Unmounted in serverMain.ts)/clean-category` | Superadmin / Admin (requireAdmin) (requireAuth, requireAdmin) | `src/backend/routes/storageAudit.routes.ts` | L205 |
| 362 | `GET` | `/api/study-space/rooms` | Public (None) | `src/backend/routes/studySpace.routes.ts` | L8 |
| 363 | `GET` | `/api/study/rooms` | Public (None) | `src/backend/routes/studySpace.routes.ts` | L8 |
| 364 | `GET` | `/api/study-space/lobby/stream` | Public (None) | `src/backend/routes/studySpace.routes.ts` | L18 |
| 365 | `GET` | `/api/study/lobby/stream` | Public (None) | `src/backend/routes/studySpace.routes.ts` | L18 |
| 366 | `GET` | `/api/study-space/champion` | Public (None) | `src/backend/routes/studySpace.routes.ts` | L58 |
| 367 | `GET` | `/api/study/champion` | Public (None) | `src/backend/routes/studySpace.routes.ts` | L58 |
| 368 | `GET` | `/api/study-space/rooms/:roomId` | Public (None) | `src/backend/routes/studySpace.routes.ts` | L68 |
| 369 | `GET` | `/api/study/rooms/:roomId` | Public (None) | `src/backend/routes/studySpace.routes.ts` | L68 |
| 370 | `GET` | `/api/study-space/rooms/:roomId/stream` | Public (None) | `src/backend/routes/studySpace.routes.ts` | L81 |
| 371 | `GET` | `/api/study/rooms/:roomId/stream` | Public (None) | `src/backend/routes/studySpace.routes.ts` | L81 |
| 372 | `POST` | `/api/study-space/rooms` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/studySpace.routes.ts` | L111 |
| 373 | `POST` | `/api/study/rooms` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/studySpace.routes.ts` | L111 |
| 374 | `POST` | `/api/study-space/rooms/:roomId/checkin` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/studySpace.routes.ts` | L138 |
| 375 | `POST` | `/api/study/rooms/:roomId/checkin` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/studySpace.routes.ts` | L138 |
| 376 | `POST` | `/api/study-space/rooms/:roomId/leave` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/studySpace.routes.ts` | L163 |
| 377 | `POST` | `/api/study/rooms/:roomId/leave` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/studySpace.routes.ts` | L163 |
| 378 | `POST` | `/api/study-space/rooms/:roomId/ping` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/studySpace.routes.ts` | L173 |
| 379 | `POST` | `/api/study/rooms/:roomId/ping` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/studySpace.routes.ts` | L173 |
| 380 | `POST` | `/api/study-space/rooms/:roomId/meet-status` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/studySpace.routes.ts` | L183 |
| 381 | `POST` | `/api/study/rooms/:roomId/meet-status` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/studySpace.routes.ts` | L183 |
| 382 | `POST` | `/api/study-space/rooms/:roomId/goal` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/studySpace.routes.ts` | L194 |
| 383 | `POST` | `/api/study/rooms/:roomId/goal` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/studySpace.routes.ts` | L194 |
| 384 | `POST` | `/api/study-space/rooms/:roomId/pomodoro` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/studySpace.routes.ts` | L205 |
| 385 | `POST` | `/api/study/rooms/:roomId/pomodoro` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/studySpace.routes.ts` | L205 |
| 386 | `POST` | `/api/study-space/rooms/:roomId/signal` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/studySpace.routes.ts` | L240 |
| 387 | `POST` | `/api/study/rooms/:roomId/signal` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/studySpace.routes.ts` | L240 |
| 388 | `POST` | `/api/study-space/rooms/:roomId/cheer` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/studySpace.routes.ts` | L256 |
| 389 | `POST` | `/api/study/rooms/:roomId/cheer` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/studySpace.routes.ts` | L256 |
| 390 | `POST` | `/api/study-space/rooms/:roomId/complete-goal` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/studySpace.routes.ts` | L277 |
| 391 | `POST` | `/api/study/rooms/:roomId/complete-goal` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/studySpace.routes.ts` | L277 |
| 392 | `GET` | `/api/study-space/admin/analytics` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/studySpace.routes.ts` | L287 |
| 393 | `GET` | `/api/study/admin/analytics` | Authenticated User (requireAuth) (requireAuth) | `src/backend/routes/studySpace.routes.ts` | L287 |
| 394 | `GET` | `/api/admin/test-lab/health-check` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/testLab.routes.ts` | L15 |
| 395 | `POST` | `/api/admin/test-lab/trigger-notification-test` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/testLab.routes.ts` | L90 |
| 396 | `GET` | `/api/admin/test-lab/free-mode-simulation` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/testLab.routes.ts` | L164 |
| 397 | `POST` | `/api/admin/test-lab/seed-sandbox-data` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/testLab.routes.ts` | L224 |
| 398 | `POST` | `/api/admin/test-lab/clean-sandbox-data` | Superadmin / Admin (requireAdmin) (requireAdmin) | `src/backend/routes/testLab.routes.ts` | L380 |
| 399 | `GET` | `/api/vocab/analytics` | Public (None) | `src/backend/routes/vocab.routes.ts` | L16 |
| 400 | `POST` | `/api/vocab/review` | Public (None) | `src/backend/routes/vocab.routes.ts` | L35 |
| 401 | `GET` | `/api/vocab/history` | Public (None) | `src/backend/routes/vocab.routes.ts` | L95 |
| 402 | `POST` | `/api/vocab/sync` | Public (None) | `src/backend/routes/vocab.routes.ts` | L114 |
| 403 | `GET` | `(Unmounted in serverMain.ts)/summary` | Public (None) | `src/backend/routes/widget.routes.ts` | L54 |
| 404 | `POST` | `(Unmounted in serverMain.ts)/complete-top-task` | Public (None) | `src/backend/routes/widget.routes.ts` | L212 |

---

<a name="phan-3"></a>
## PHẦN 3: 100% SỰ KIỆN REAL-TIME SOCKET.IO (24 EVENTS)
*Quét từ `src/backend/realtime/studyRoomSocket.ts` & `src/features/study/`.*

### I. SỰ KIỆN TỪ CLIENT GỬI LÊN SERVER (CLIENT -> SERVER: 11 EVENTS)
| STT | Tên Sự Kiện (Event) | Cấu Trúc Dữ Liệu (Payload) | Mục Đích & Kiểm Soát Nghiệp Vụ |
|---|---|---|---|
| 1 | `room:join` | `{ roomId: string, user: { id: string, name: string, avatar?: string, isHost?: boolean }, initialStatus?: string }` | User tham gia phòng học, nhận snapshot phòng và phát thông báo người mới |
| 2 | `room:leave` | `{ roomId: string }` | User chủ động thoát khỏi phòng học |
| 3 | `room:meet_status` | `{ roomId: string, isMicOn: boolean, isCamOn: boolean, isHandRaised: boolean, currentTask?: string }` | Cập nhật trạng thái Micro, Camera, Giơ tay hoặc Nhiệm vụ trọng tâm của cá nhân |
| 4 | `room:update_goal` | `{ roomId: string, goal: { title: string, targetMinutes: number, completedMinutes: number } }` | Cập nhật mục tiêu học tập cá nhân trong phòng |
| 5 | `room:pomodoro_action` | `{ roomId: string, action: "START" | "PAUSE" | "RESUME" | "RESET" | "SKIP" }` | Chủ phòng (Host) điều khiển chu kỳ đồng hồ Pomodoro |
| 6 | `room:kudos` | `{ roomId: string, toUserId: string, reactionType: string }` | Gửi tương tác động viên / tiếp lửa / thả tim (Được server throttle gom nhóm 1.5s/lần) |
| 7 | `room:chat_message` | `{ roomId: string, message: { text: string, senderName: string, senderAvatar?: string } }` | Gửi tin nhắn trò chuyện (Tự động drop nếu phòng đang ở phase FOCUS; slow-mode 5s trong phase BREAK) |
| 8 | `room:webrtc_signal` | `{ roomId: string, targetUserId: string, signalData: any, type: "offer"|"answer"|"ice-candidate" }` | Chuyển tiếp gói tin tín hiệu WebRTC P2P Mesh kết nối Camera / Audio |
| 9 | `room:kick_user` | `{ roomId: string, targetUserId: string, reason?: string }` | Chủ phòng (Host) kích thành viên vi phạm ra khỏi phòng |
| 10 | `room:update_settings` | `{ roomId: string, settings: { isPrivate?: boolean, maxMembers?: number, allowChatInFocus?: boolean, defaultPomodoroConfig?: any } }` | Chủ phòng cập nhật cấu hình phòng học |
| 11 | `disconnect` | `None` | Sự kiện Socket ngắt kết nối do rớt mạng hoặc đóng tab (Hệ thống tự dọn Participant sau grace period) |

### II. SỰ KIỆN TỪ SERVER PHÁT XUỐNG CLIENT (SERVER -> CLIENT: 13 EVENTS)
| STT | Tên Sự Kiện (Event) | Cấu Trúc Dữ Liệu (Payload) | Cơ Chế Phát (Broadcast Scope) & Ý Nghĩa |
|---|---|---|---|
| 1 | `room:snapshot` | `{ roomId: string, roomInfo: any, participants: Participant[], timerState: PomodoroState, energyCounter: number, hostId: string }` | Gửi toàn bộ snapshot trạng thái phòng khi người dùng mới kết nối thành công |
| 2 | `room:user_joined` | `{ user: Participant }` | Delta broadcast cho cả phòng khi có một thành viên mới tham gia |
| 3 | `room:user_left` | `{ userId: string, reason?: string }` | Delta broadcast khi có một thành viên rời khỏi phòng |
| 4 | `room:user_meet_status` | `{ userId: string, isMicOn: boolean, isCamOn: boolean, isHandRaised: boolean, currentTask?: string }` | Delta broadcast trạng thái Mic/Cam/Giơ tay/Nhiệm vụ của một thành viên |
| 5 | `room:user_goal_updated` | `{ userId: string, goal: any }` | Delta broadcast mục tiêu học tập mới của một thành viên |
| 6 | `room:pomodoro_state` | `{ phase: "FOCUS"|"BREAK"|"PAUSED", serverTimeNow: number, endTimeUTC: number, cycleCount: number, isPaused: boolean }` | Đồng bộ đồng hồ Pomodoro theo Timestamp (Không bắn mỗi giây) |
| 7 | `room:kudos_batched` | `{ batchReactions: Array<{ fromUserId: string, toUserId: string, type: string, count: number }>, roomEnergyTotal: number }` | Broadcast danh sách tương tác tiếp lửa đã gom nhóm sau chu kỳ 1.5s |
| 8 | `room:chat_message` | `{ id: string, userId: string, userName: string, userAvatar?: string, text: string, timestamp: number }` | Broadcast tin nhắn chat đến tất cả thành viên trong phòng |
| 9 | `room:webrtc_signal` | `{ fromUserId: string, signalData: any, type: string }` | Chuyển tiếp gói tin WebRTC từ người gửi đến người nhận đích danh |
| 10 | `room:kicked` | `{ reason: string }` | Gửi riêng cho người bị kích để thông báo và điều hướng ra khỏi phòng |
| 11 | `room:user_kicked` | `{ kickedUserId: string, reason?: string }` | Broadcast cho cả phòng biết thành viên nào vừa bị mời ra |
| 12 | `room:settings_updated` | `{ settings: any }` | Broadcast cấu hình phòng mới cập nhật cho tất cả thành viên |
| 13 | `room:error` | `{ code: string, message: string }` | Báo lỗi socket (Không có quyền host, phòng đầy, vi phạm slow-mode...) |

---

<a name="phan-4"></a>
## PHẦN 4: 100% GIAO DIỆN FRONTEND (PAGES, VIEWS & MODALS)

### I. CÁC MÀN HÌNH / GIAO DIỆN CHÍNH (31 CORE VIEWS & PAGES)
| STT | Tên View / Routing Tab | Component Tương Ứng | Phân Loại & Quyền Truy Cập |
|---|---|---|---|
| 1 | `home` / Landing Page | `PublicLandingView.tsx` | Khách / Chưa đăng nhập |
| 2 | `login` / Auth Modal | `LoginView.tsx` | Khách / Đăng nhập & Đăng ký |
| 3 | `onboarding` | `OnboardingView.tsx` | Người dùng mới hoàn thiện thông tin |
| 4 | `dashboard` | `DashboardView.tsx` | Authenticated - Tổng quan cuộc sống |
| 5 | `schedule` | `ScheduleAndTasksView.tsx (initialTab="today")` | Authenticated - Lịch trình hôm nay |
| 6 | `tasks` | `ScheduleAndTasksView.tsx (initialTab="tasks")` | Authenticated - Quản lý việc cần làm |
| 7 | `calendar` | `ScheduleAndTasksView.tsx (initialTab="calendar")` | Authenticated - Lịch biểu tích hợp |
| 8 | `finance` | `FinanceView.tsx` | Authenticated - Quản lý tài chính cá nhân |
| 9 | `focus` | `FocusView.tsx` | Authenticated - Phòng tập trung cá nhân |
| 10 | `projects` | `ProjectsView.tsx` | Authenticated - Quản lý dự án |
| 11 | `study` / `vocab` | `StudyView.tsx` | Authenticated - Trung tâm học tập & Từ vựng |
| 12 | `study-space` | `StudySpaceView.tsx (initialTab="rooms")` | Authenticated - Phòng học chung 100+ người |
| 13 | `classroom` | `StudySpaceView.tsx (initialTab="classroom")` | Authenticated - Lớp học trực tuyến |
| 14 | `community` / `connect` | `LifeOsConnectView.tsx` | Authenticated - Mạng xã hội & Cộng đồng |
| 15 | `goals` | `GoalsView.tsx` | Authenticated - Mục tiêu cuộc đời |
| 16 | `notes` | `NotesView.tsx` | Authenticated - Sổ tay & Tri thức |
| 17 | `habits` | `HabitsView.tsx` | Authenticated - Theo dõi thói quen |
| 18 | `journey` | `JourneyView.tsx` | Authenticated - RPG Game hóa & Đấu trùm |
| 19 | `affiliate` / `referral` | `ReferralView.tsx` | Authenticated - Tiếp thị liên kết & Thu nhập |
| 20 | `decision_engine` | `DecisionEngineView.tsx` | Authenticated - Ma trận hỗ trợ ra quyết định |
| 21 | `automation_engine` | `AutomationEngineView.tsx` | Authenticated - Tự động hóa tác vụ |
| 22 | `marketplace` | `MarketplaceView.tsx` | Authenticated - Chợ Template & Tài nguyên |
| 23 | `cart` | `CartView.tsx` | Authenticated - Giỏ hàng thanh toán |
| 24 | `my_account` | `MyAccountView.tsx` | Authenticated - Hồ sơ & Bảo mật cá nhân |
| 25 | `subscription` | `SubscriptionManagementView.tsx` | Authenticated - Nâng cấp gói PRO / TEAM |
| 26 | `checkout` | `CheckoutView.tsx` | Authenticated - Cổng thanh toán QR MoMo/Bank |
| 27 | `admin` | `AdminView.tsx` | **Chỉ Admin / Superadmin** |
| 28 | `custom_module_:slug` | `CustomModuleView.tsx` | Dynamic - Module tùy biến mở rộng |
| 29 | `spatial` / Island | `CyberCozyIslandSpace.tsx` | Không gian 3D tương tác đảo nổi |
| 30 | `spatial-universe` | `Spatial3DUniverseView.tsx` | Vũ trụ 3D CyberCozy |
| 31 | Legal (`privacy`, `terms`, `cookies`, `refund`) | `PrivacyPolicyView`, `TermsOfServiceView`, etc. | Public - Chính sách pháp lý |

### II. 100% CÁC MODAL, DRAWER & POPUP CHÍNH (69 MODALS)
| STT | Tên Component Modal | Đường Dẫn File | Vai Trò & Nghiệp Vụ |
|---|---|---|---|
| 1 | `AdminConfirmModal.tsx` | `src/components/admin/AdminConfirmModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 2 | `AdminGmailPreviewModal.tsx` | `src/components/admin/AdminGmailPreviewModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 3 | `AdminReadReceiptsModal.tsx` | `src/components/admin/AdminReadReceiptsModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 4 | `CloudflarePreFlightModal.tsx` | `src/components/admin/CloudflarePreFlightModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 5 | `CreateUserModal.tsx` | `src/components/admin/CreateUserModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 6 | `GrantSubscriptionModal.tsx` | `src/components/admin/GrantSubscriptionModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 7 | `ResetPasswordModal.tsx` | `src/components/admin/ResetPasswordModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 8 | `UserDetailModal.tsx` | `src/components/admin/UserDetailModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 9 | `UserXRayModal.tsx` | `src/components/admin/UserXRayModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 10 | `CelebrationModal.tsx` | `src/components/CelebrationModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 11 | `AiLifeBuddyCopilotModal.tsx` | `src/components/companion/AiLifeBuddyCopilotModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 12 | `CompanionSettingsModal.tsx` | `src/components/companion/CompanionSettingsModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 13 | `InteractiveCompanionChatModal.tsx` | `src/components/companion/InteractiveCompanionChatModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 14 | `EditProfileModal.tsx` | `src/components/connect/EditProfileModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 15 | `UserProfileModal.tsx` | `src/components/connect/UserProfileModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 16 | `FocusEconomyShopModal.tsx` | `src/components/dashboard/FocusEconomyShopModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 17 | `LifeHarmonyDetailModal.tsx` | `src/components/dashboard/LifeHarmonyDetailModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 18 | `LifeOsWrappedModal.tsx` | `src/components/dashboard/LifeOsWrappedModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 19 | `LumiQuestsModal.tsx` | `src/components/dashboard/LumiQuestsModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 20 | `StreakResurrectionModal.tsx` | `src/components/dashboard/StreakResurrectionModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 21 | `SundayWeeklyResetModal.tsx` | `src/components/dashboard/SundayWeeklyResetModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 22 | `TodayFinanceModal.tsx` | `src/components/dashboard/TodayFinanceModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 23 | `TodayHabitsModal.tsx` | `src/components/dashboard/TodayHabitsModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 24 | `TodayTasksModal.tsx` | `src/components/dashboard/TodayTasksModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 25 | `TrifectaDetailModal.tsx` | `src/components/dashboard/TrifectaDetailModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 26 | `WeeklyLeaderboardModal.tsx` | `src/components/dashboard/WeeklyLeaderboardModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 27 | `AccountModal.tsx` | `src/components/finance/AccountModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 28 | `BudgetModal.tsx` | `src/components/finance/BudgetModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 29 | `DebtModal.tsx` | `src/components/finance/DebtModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 30 | `SavingGoalModal.tsx` | `src/components/finance/SavingGoalModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 31 | `TransactionModal.tsx` | `src/components/finance/TransactionModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 32 | `AchievementShareModal.tsx` | `src/components/journey/AchievementShareModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 33 | `DailyMysteryChestModal.tsx` | `src/components/journey/DailyMysteryChestModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 34 | `HeroAvatarModal.tsx` | `src/components/journey/HeroAvatarModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 35 | `MonsterCombatModal.tsx` | `src/components/journey/MonsterCombatModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 36 | `RPGSkillTreeModal.tsx` | `src/components/journey/RPGSkillTreeModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 37 | `StageBattleModal.tsx` | `src/components/journey/StageBattleModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 38 | `GmailPreviewModal.tsx` | `src/components/notifications/GmailPreviewModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 39 | `LoginAnnouncementModal.tsx` | `src/components/notifications/LoginAnnouncementModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 40 | `NotificationCenterModal.tsx` | `src/components/notifications/NotificationCenterModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 41 | `NotificationSettingsModal.tsx` | `src/components/notifications/NotificationSettingsModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 42 | `QuickPersonaQuizModal.tsx` | `src/components/onboarding/QuickPersonaQuizModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 43 | `ShareStoryModal.tsx` | `src/components/ShareStoryModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 44 | `StoryShareModal.tsx` | `src/components/sharing/StoryShareModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 45 | `SidebarCustomizerModal.tsx` | `src/components/SidebarCustomizerModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 46 | `StationBentoModal.tsx` | `src/components/spatial/island/StationBentoModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 47 | `AssignmentModal.tsx` | `src/components/study/AssignmentModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 48 | `ExamModal.tsx` | `src/components/study/ExamModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 49 | `ProfileSettingsModal.tsx` | `src/components/study/ProfileSettingsModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 50 | `SemesterModal.tsx` | `src/components/study/SemesterModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 51 | `SubjectGradeDetailModal.tsx` | `src/components/study/SubjectGradeDetailModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 52 | `SubjectModal.tsx` | `src/components/study/SubjectModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 53 | `LayoutSettingsModal.tsx` | `src/components/study-space/LayoutSettingsModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 54 | `RoomCheckInModal.tsx` | `src/components/study-space/RoomCheckInModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 55 | `RoomSettingsModal.tsx` | `src/components/study-space/RoomSettingsModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 56 | `StudyCreateRoomModal.tsx` | `src/components/study-space/StudyCreateRoomModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 57 | `StudyOnboardingModal.tsx` | `src/components/study-space/StudyOnboardingModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 58 | `VibeThemeModal.tsx` | `src/components/VibeThemeModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 59 | `AddToCollectionModal.tsx` | `src/components/vocab/AddToCollectionModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 60 | `ChineseActiveRecallModal.tsx` | `src/components/vocab/chinese/ChineseActiveRecallModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 61 | `GenZVocabStudyModal.tsx` | `src/components/vocab/GenZVocabStudyModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 62 | `ImportExportModal.tsx` | `src/components/vocab/ImportExportModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 63 | `LanguageOnboardingModal.tsx` | `src/components/vocab/LanguageOnboardingModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 64 | `NewCollectionModal.tsx` | `src/components/vocab/NewCollectionModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 65 | `SpeedMatchGameModal.tsx` | `src/components/vocab/SpeedMatchGameModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 66 | `UniversalSearchModal.tsx` | `src/components/vocab/UniversalSearchModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 67 | `WordDetailModal.tsx` | `src/components/vocab/WordDetailModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 68 | `WordModal.tsx` | `src/components/vocab/WordModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |
| 69 | `ZeroEffortIngestionModal.tsx` | `src/components/vocab/ZeroEffortIngestionModal.tsx` | Popup tương tác nghiệp vụ chuyên biệt |

---

<a name="phan-5"></a>
## PHẦN 5: 100% TIẾN TRÌNH NỀN & DỊCH VỤ NGOÀI (BACKGROUND SERVICES & CLOUD)

| STT | Tên Dịch Vụ / Tiến Trình | File Triển Khai | Cơ Chế Kích Hoạt (Trigger) | Chức Năng Cốt Lõi |
|---|---|---|---|---|
| 1 | **Backend Cron Engine Service** | `src/backend/services/cronEngineService.ts` | 24/7 background interval loop (quét mỗi phút) | Tự động kiểm tra và thực thi các Automation Rules: nhắc việc tự động, tổng kết tài chính cuối ngày, hạ hạng streak nếu không học, tạo recurring transactions, dọn dẹp tokens hết hạn. |
| 2 | **Email Outbox Queue Worker** | `src/backend/services/emailQueueService.ts` | Background loop (quét outbox mỗi 30 giây) | Gửi email bất đồng bộ qua SMTP / Gmail OAuth: xác minh email, khôi phục mật khẩu, thông báo lớp học, thông báo nạp/rút tiền affiliate, hóa đơn đăng ký gói PRO/TEAM. |
| 3 | **Classroom Reminder Loop** | `src/backend/services/classroomReminderService.ts (hoặc serverMain init)` | Interval loop (quét mỗi 60 giây) | Gửi thông báo và email trước 15 phút khi lớp học Online (Classroom) sắp diễn ra, đồng bộ lịch qua Google Calendar API. |
| 4 | **General Background Worker Service** | `src/backend/services/workerService.ts` | Interval loop (quét mỗi 300 giây / 5 phút) | Xử lý các tác vụ nền định kỳ: dọn dẹp phiên đăng nhập rác (expired sessions), tổng hợp phân tích tính năng (FeatureAnalyticsSummary), kiểm tra trạng thái thanh toán webhook quá hạn. |
| 5 | **Schedule & In-App Notification Schedulers** | `src/backend/services/notificationService.ts / clientScheduler` | Background intervals (30s - 60s) | Kiểm tra ScheduleBlock, Reminder, Task dueDate để phát thông báo đẩy In-App và Notification Bell cho người dùng. |
| 6 | **High-Scale Study Room RAM State Manager & WAL Batcher** | `src/backend/realtime/highScaleRoomManager.ts` | In-Memory State + Focus Cycle End DB Sync | Quản lý 100-500+ participants trên RAM (Map), đồng bộ Pomodoro timestamp, batch broadcast tim/tiếp lửa mỗi 1.5s, chỉ ghi DB SQLite (WAL) khi kết thúc phiên Focus. |
| 7 | **Cloudflare R2 Cloud Storage Presigner** | `src/backend/services/r2StorageService.ts` | Theo yêu cầu upload file / avatar / tài liệu đính kèm | Tạo S3 presigned URL bảo mật để trình duyệt upload trực tiếp lên Cloudflare R2 bucket, bypass server Node.js để không tốn băng thông. |
| 8 | **Google OAuth 2.0 & Google Calendar API** | `src/backend/services/googleCalendarService.ts & authRouter` | OAuth Flow & Lịch học | Đăng nhập Google Sign-In một chạm và tự động tạo sự kiện học trên Google Calendar của sinh viên. |
| 9 | **Cloudflare Edge Worker & Reverse Proxy** | `src/cloudflare/worker.ts & nginx.conf` | Mọi request từ Internet tới tên miền public | Cloudflare SSL/TLS, DDoS protection, CDN cache tài sản tĩnh (Vite build assets), và proxy WebSocket / REST API tới Node.js backend. |

---

## KẾT LUẬN GIAI ĐOẠN 0 & BƯỚC TIẾP THEO

Bản Đồ Kiểm Kê Toàn Hệ Thống (Stage 0: Full System Inventory) đã hoàn tất với **100% độ phủ**:
- ✅ **103 Bảng dữ liệu** (Models) & **4 Enums** trong `prisma/schema.prisma`.
- ✅ **404 Backend REST API Endpoints** (đầy đủ Method, Full Path, Middleware, File, Line).
- ✅ **24 Sự kiện Socket.io** (11 Client Emits + 13 Server Broadcasts) đồng bộ phòng học 100+ người.
- ✅ **31 Màn hình chính & 69 Modals** toàn bộ Frontend.
- ✅ **9 Tiến trình nền & Dịch vụ Cloud** (Cron Engine, Email Queue, Classroom Loop, Worker, WAL State Manager, R2 Presigner, Google OAuth, Cloudflare Worker).

> [!IMPORTANT]
> **ĐIỂM DỪNG BẮT BUỘC (CHECKPOINT):**  
> Theo quy tắc và nguyên tắc kiểm toán tối thượng, Hội đồng kiểm toán **dừng lại tại đây** để Người dùng duyệt đối chiếu Bản Đồ Kiểm Kê Giai Đoạn 0.  
> Sau khi nhận được xác nhận duyệt từ bạn, Hội đồng sẽ chính thức bước vào **GIAI ĐOẠN 1: KIỂM TOÁN CHI TIẾT TỪNG PHÂN HỆ, CHECKLIST ZERO-MOCK & LIÊN KẾT DỮ LIỆU THỰC**.
