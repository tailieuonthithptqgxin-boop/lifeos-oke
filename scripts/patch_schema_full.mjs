import fs from 'fs';

let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

// Backup schema
fs.writeFileSync('prisma/schema.prisma.bak', schema, 'utf8');

// 1. Add fields and relations to User model
const userFieldsInsertPoint = '  createdAt           DateTime   @default(now())';
const userFieldsToAdd = `  totalStudyMinutes   Int        @default(0) @map("total_study_minutes")
  weeklyStudyMinutes  Int        @default(0) @map("weekly_study_minutes")
  lastStudyDate       DateTime?  @map("last_study_date")
  championCount       Int        @default(0) @map("champion_count")
  bio                 String?    @db.Text
  coverImage          String?    @map("cover_image")
  interests           String[]   @default([])
  learningGoals       String[]   @default([]) @map("learning_goals")
  learningGoalsVisibility String @default("PUBLIC") @map("learning_goals_visibility")
  learningLanguages   String[]   @default([]) @map("learning_languages")
  location            String?
  locationVisibility  String     @default("PRIVATE") @map("location_visibility")
  messagePermission   String     @default("EVERYONE") @map("message_permission")
  personalIntro       String?    @db.Text @map("personal_intro")
  profileVisibility   String     @default("PUBLIC") @map("profile_visibility")
  isAffiliate         Boolean    @default(false) @map("is_affiliate")
  lastActiveAt        DateTime?  @map("last_active_at")
  adminNotes          String?    @db.Text @map("admin_notes")
  createdAt           DateTime   @default(now())`;

if (!schema.includes('totalStudyMinutes')) {
  schema = schema.replace(userFieldsInsertPoint, userFieldsToAdd);
}

const userRelationsInsertPoint = '  battleRecords       BattleRecord[]';
const userRelationsToAdd = `  battleRecords       BattleRecord[]
  posts               Post[]                 @relation("UserPosts")
  friendshipsA        Friendship[]           @relation("UserFriendshipsA")
  friendshipsB        Friendship[]           @relation("UserFriendshipsB")
  sentDirectMessages  DirectMessage[]        @relation("SentMessages")
  receivedDirectMessages DirectMessage[]     @relation("ReceivedMessages")
  postReactions       PostReaction[]
  postComments        PostComment[]
  communityMemberships CommunityMember[]
  ownedCommunities    Community[]            @relation("CommunityOwner")
  blockedUsers        UserBlock[]            @relation("BlockerUsers")
  blockedByUsers      UserBlock[]            @relation("BlockedUsers")
  submittedReports    Report[]               @relation("ReportSubmitter")
  hostedClasses       OnlineClass[]          @relation("HostedClasses")
  classParticipations OnlineClassParticipant[]
  statusNotes         UserStatusNote[]
  pet                 UserPet?
  calendarIntegration GoogleCalendarIntegration?`;

if (!schema.includes('hostedClasses')) {
  schema = schema.replace(userRelationsInsertPoint, userRelationsToAdd);
}

// 2. Append new models to schema
const modelsToAdd = `
model OnlineClass {
  id              String   @id @default(uuid())
  hostId          String   @map("host_id")
  host            User     @relation("HostedClasses", fields: [hostId], references: [id], onDelete: Cascade)
  title           String
  description     String?  @db.Text
  startAt         DateTime @map("start_at")
  durationMinutes Int      @default(60) @map("duration_minutes")
  status          String   @default("SCHEDULED")
  meetUrl         String?  @map("meet_url")
  googleEventId   String?  @map("google_event_id")
  googleEventLink String?  @map("google_event_link")
  meetSource      String   @default("NONE") @map("meet_source")
  calendarEventId String?  @map("calendar_event_id")
  reminderSentAt  DateTime? @map("reminder_sent_at")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  participants    OnlineClassParticipant[]

  @@index([hostId])
  @@index([startAt])
  @@index([status])
  @@map("online_classes")
}

model OnlineClassParticipant {
  id          String      @id @default(uuid())
  classId     String      @map("class_id")
  onlineClass OnlineClass @relation(fields: [classId], references: [id], onDelete: Cascade)
  userId      String?     @map("user_id")
  user        User?       @relation(fields: [userId], references: [id], onDelete: SetNull)
  email       String
  createdAt   DateTime    @default(now()) @map("created_at")

  @@unique([classId, email])
  @@index([classId])
  @@index([userId])
  @@map("online_class_participants")
}

model GoogleCalendarIntegration {
  id           String    @id @default(uuid())
  userId       String    @unique @map("user_id")
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  googleEmail  String    @map("google_email")
  accessToken  String?   @map("access_token") @db.Text
  refreshToken String?   @map("refresh_token") @db.Text
  tokenExpiry  DateTime? @map("token_expiry")
  scopes       String    @default("")
  status       String    @default("ACTIVE")
  lastError    String?   @map("last_error") @db.Text
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  @@map("google_calendar_integrations")
}

model Post {
  id                String         @id @default(uuid())
  userId            String         @map("user_id")
  user              User           @relation("UserPosts", fields: [userId], references: [id], onDelete: Cascade)
  communityId       String?        @map("community_id")
  community         Community?     @relation(fields: [communityId], references: [id], onDelete: SetNull)
  content           String         @db.Text
  images            String[]       @default([])
  likes             Int            @default(0)
  commentsCount     Int            @default(0) @map("comments_count")
  sharesCount       Int            @default(0) @map("shares_count")
  tags              String[]       @default([])
  lifeOsShareType   String?        @map("lifeos_share_type")
  lifeOsShareData   Json?          @map("lifeos_share_data")
  visibility        String         @default("PUBLIC")
  isAnonymous       Boolean?       @default(false) @map("is_anonymous")
  anonymousNickname String?        @map("anonymous_nickname")
  category          String?        @default("HOT")
  isPinned          Boolean?       @default(false) @map("is_pinned")
  achievementCard   Json?          @map("achievement_card")
  createdAt         DateTime       @default(now()) @map("created_at")
  updatedAt         DateTime       @updatedAt @map("updated_at")

  reactions         PostReaction[]
  comments          PostComment[]

  @@index([userId])
  @@index([communityId])
  @@index([createdAt])
  @@map("posts")
}

model PostReaction {
  id        String   @id @default(uuid())
  postId    String   @map("post_id")
  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  userId    String   @map("user_id")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  type      String   @default("LIKE")
  createdAt DateTime @default(now()) @map("created_at")

  @@unique([postId, userId])
  @@index([postId])
  @@index([userId])
  @@map("post_reactions")
}

model PostComment {
  id        String        @id @default(uuid())
  postId    String        @map("post_id")
  post      Post          @relation(fields: [postId], references: [id], onDelete: Cascade)
  userId    String        @map("user_id")
  user      User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  parentId  String?       @map("parent_id")
  parent    PostComment?  @relation("CommentReplies", fields: [parentId], references: [id], onDelete: Cascade)
  replies   PostComment[] @relation("CommentReplies")
  content   String        @db.Text
  createdAt DateTime      @default(now()) @map("created_at")
  updatedAt DateTime      @updatedAt @map("updated_at")

  @@index([postId])
  @@index([userId])
  @@index([parentId])
  @@map("post_comments")
}

model Community {
  id          String            @id @default(uuid())
  name        String
  slug        String            @unique
  description String            @db.Text
  avatar      String?
  coverImage  String?           @map("cover_image")
  category    String            @default("GENERAL")
  privacy     String            @default("PUBLIC")
  ownerId     String            @map("owner_id")
  owner       User              @relation("CommunityOwner", fields: [ownerId], references: [id], onDelete: Cascade)
  memberCount Int               @default(1) @map("member_count")
  postCount   Int               @default(0) @map("post_count")
  createdAt   DateTime          @default(now()) @map("created_at")
  updatedAt   DateTime          @updatedAt @map("updated_at")

  posts       Post[]
  members     CommunityMember[]

  @@index([ownerId])
  @@index([category])
  @@map("communities")
}

model CommunityMember {
  id          String    @id @default(uuid())
  communityId String    @map("community_id")
  community   Community @relation(fields: [communityId], references: [id], onDelete: Cascade)
  userId      String    @map("user_id")
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  role        String    @default("MEMBER")
  status      String    @default("ACTIVE")
  joinedAt    DateTime  @default(now()) @map("joined_at")

  @@unique([communityId, userId])
  @@index([communityId])
  @@index([userId])
  @@map("community_members")
}

model Friendship {
  id          String   @id @default(uuid())
  userAId     String   @map("user_a_id")
  userBId     String   @map("user_b_id")
  userA       User     @relation("UserFriendshipsA", fields: [userAId], references: [id], onDelete: Cascade)
  userB       User     @relation("UserFriendshipsB", fields: [userBId], references: [id], onDelete: Cascade)
  status      String   @default("PENDING")
  initiatorId String   @map("initiator_id")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@unique([userAId, userBId])
  @@index([userAId, status])
  @@index([userBId, status])
  @@map("friendships")
}

model Conversation {
  id               String          @id @default(uuid())
  user1Id          String          @map("user_1_id")
  user2Id          String          @map("user_2_id")
  lastMessageText  String?         @db.Text @map("last_message_text")
  lastMessageAt    DateTime        @default(now()) @map("last_message_at")
  user1UnreadCount Int             @default(0) @map("user_1_unread_count")
  user2UnreadCount Int             @default(0) @map("user_2_unread_count")
  createdAt        DateTime        @default(now()) @map("created_at")
  updatedAt        DateTime        @updatedAt @map("updated_at")
  messages         DirectMessage[]

  @@unique([user1Id, user2Id])
  @@index([user1Id, lastMessageAt])
  @@index([user2Id, lastMessageAt])
  @@map("conversations")
}

model DirectMessage {
  id             String       @id @default(uuid())
  conversationId String       @map("conversation_id")
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  senderId       String       @map("sender_id")
  receiverId     String       @map("receiver_id")
  sender         User         @relation("SentMessages", fields: [senderId], references: [id], onDelete: Cascade)
  receiver       User         @relation("ReceivedMessages", fields: [receiverId], references: [id], onDelete: Cascade)
  content        String       @db.Text
  isRead         Boolean      @default(false) @map("is_read")
  readAt         DateTime?    @map("read_at")
  clientTempId   String?      @map("client_temp_id")
  createdAt      DateTime     @default(now()) @map("created_at")

  @@index([conversationId, createdAt])
  @@index([receiverId, isRead])
  @@map("direct_messages")
}

model UserBlock {
  id        String   @id @default(uuid())
  blockerId String   @map("blocker_id")
  blockedId String   @map("blocked_id")
  blocker   User     @relation("BlockerUsers", fields: [blockerId], references: [id], onDelete: Cascade)
  blocked   User     @relation("BlockedUsers", fields: [blockedId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now()) @map("created_at")

  @@unique([blockerId, blockedId])
  @@index([blockerId])
  @@index([blockedId])
  @@map("user_blocks")
}

model Report {
  id         String   @id @default(uuid())
  reporterId String   @map("reporter_id")
  reporter   User     @relation("ReportSubmitter", fields: [reporterId], references: [id], onDelete: Cascade)
  targetType String   @map("target_type")
  targetId   String   @map("target_id")
  reason     String
  details    String?  @db.Text
  status     String   @default("PENDING")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  @@index([targetType, targetId])
  @@index([status])
  @@map("reports")
}

model UserStatusNote {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  text      String
  createdAt DateTime @default(now()) @map("created_at")
  expiresAt DateTime @map("expires_at")

  @@index([expiresAt])
  @@index([userId])
  @@map("user_status_notes")
}

model UserPet {
  id                String   @id @default(uuid())
  userId            String   @unique @map("user_id")
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name              String   @default("Bé Capy")
  type              String   @default("CAPYBARA")
  level             Int      @default(1)
  exp               Int      @default(0)
  hunger            Int      @default(85)
  happiness         Int      @default(90)
  mood              String   @default("HAPPY")
  foodCount         Int      @default(5) @map("food_count")
  equippedSkin      String   @default("default") @map("equipped_skin")
  unlockedSkins     String   @default("[\"default\"]") @map("unlocked_skins")
  totalStudyMinutes Int      @default(0) @map("total_study_minutes")
  lastFedAt         DateTime @default(now()) @map("last_fed_at")
  lastPettedAt      DateTime @default(now()) @map("last_petted_at")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  @@index([userId])
  @@map("user_pets")
}

model FeatureAnalyticsSummary {
  featureKey           String   @id @map("feature_key")
  featureName          String   @map("feature_name")
  category             String   @default("Core")
  totalUniqueUsers     Int      @default(0) @map("total_unique_users")
  totalUses            Int      @default(0) @map("total_uses")
  totalDurationSeconds BigInt   @default(0) @map("total_duration_seconds")
  returningUsersCount  Int      @default(0) @map("returning_users_count")
  lastActivityAt       DateTime @default(now()) @map("last_activity_at")
  updatedAt            DateTime @default(now()) @updatedAt @map("updated_at")

  @@map("feature_analytics_summary")
}

model UserFeatureAnalytics {
  id              String   @id
  userId          String   @map("user_id")
  featureKey      String   @map("feature_key")
  featureName     String   @map("feature_name")
  useCount        Int      @default(1) @map("use_count")
  durationSeconds Int      @default(0) @map("duration_seconds")
  firstUsedAt     DateTime @default(now()) @map("first_used_at")
  lastUsedAt      DateTime @default(now()) @map("last_used_at")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @default(now()) @updatedAt @map("updated_at")

  @@unique([userId, featureKey])
  @@index([userId])
  @@index([featureKey])
  @@map("user_feature_analytics")
}
`;

if (!schema.includes('model OnlineClass')) {
  schema = schema + '\n' + modelsToAdd;
}

fs.writeFileSync('prisma/schema.prisma', schema, 'utf8');
console.log('✅ prisma/schema.prisma updated successfully!');
