import fs from 'fs';

let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

// 1. Add fields and relations to User model
const userTarget = `  posts               Post[]         @relation("UserPosts")`;
const userAdditions = `  posts               Post[]         @relation("UserPosts")
  coverImage          String?        @map("cover_image")
  bio                 String?        @db.Text
  location            String?
  interests           String[]       @default([])
  learningLanguages   String[]       @default([]) @map("learning_languages")
  learningGoals       String[]       @default([]) @map("learning_goals")
  personalIntro       String?        @db.Text @map("personal_intro")
  profileVisibility   String         @default("PUBLIC") @map("profile_visibility")
  locationVisibility  String         @default("PRIVATE") @map("location_visibility")
  learningGoalsVisibility String     @default("PUBLIC") @map("learning_goals_visibility")
  messagePermission   String         @default("EVERYONE") @map("message_permission")
  friendshipsA        Friendship[]   @relation("UserFriendshipsA")
  friendshipsB        Friendship[]   @relation("UserFriendshipsB")
  sentDirectMessages  DirectMessage[] @relation("SentMessages")
  receivedDirectMessages DirectMessage[] @relation("ReceivedMessages")
  postReactions       PostReaction[]
  postComments        PostComment[]
  communityMemberships CommunityMember[]
  ownedCommunities    Community[]    @relation("CommunityOwner")
  blockedUsers        UserBlock[]    @relation("BlockerUsers")
  blockedByUsers      UserBlock[]    @relation("BlockedUsers")
  submittedReports    Report[]       @relation("ReportSubmitter")`;

if (!schema.includes('friendshipsA')) {
  schema = schema.replace(userTarget, userAdditions);
}

// 2. Replace existing Post model with enhanced Post and new models
const oldPostModelRegex = /model Post \{[\s\S]*?\n\}/;

const newModels = `model Post {
  id               String         @id @default(uuid())
  userId           String         @map("user_id")
  user             User           @relation("UserPosts", fields: [userId], references: [id], onDelete: Cascade)
  communityId      String?        @map("community_id")
  community        Community?     @relation(fields: [communityId], references: [id], onDelete: SetNull)
  content          String         @db.Text
  images           String[]       @default([])
  tags             String[]       @default([])
  lifeOsShareType  String?        @map("lifeos_share_type")
  lifeOsShareData  Json?          @map("lifeos_share_data")
  visibility       String         @default("PUBLIC")
  likes            Int            @default(0)
  commentsCount    Int            @default(0) @map("comments_count")
  sharesCount      Int            @default(0) @map("shares_count")
  createdAt        DateTime       @default(now()) @map("created_at")
  updatedAt        DateTime       @updatedAt @map("updated_at")
  reactions        PostReaction[]
  comments         PostComment[]

  @@index([userId])
  @@index([communityId])
  @@index([createdAt])
  @@map("posts")
}

model Friendship {
  id          String   @id @default(uuid())
  userAId     String   @map("user_a_id")
  userBId     String   @map("user_b_id")
  userA       User     @relation("UserFriendshipsA", fields: [userAId], references: [id], onDelete: Cascade)
  userB       User     @relation("UserFriendshipsB", fields: [userBId], references: [id], onDelete: Cascade)
  status      String   @default("PENDING") // PENDING, ACCEPTED, BLOCKED, DECLINED
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

model PostReaction {
  id        String   @id @default(uuid())
  postId    String   @map("post_id")
  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  userId    String   @map("user_id")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  type      String   @default("LIKE") // LIKE, LOVE, FIRE, CLAP, STUDY_CROWN
  createdAt DateTime @default(now()) @map("created_at")

  @@unique([postId, userId])
  @@index([postId])
  @@map("post_reactions")
}

model PostComment {
  id        String        @id @default(uuid())
  postId    String        @map("post_id")
  post      Post          @relation(fields: [postId], references: [id], onDelete: Cascade)
  userId    String        @map("user_id")
  user      User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  parentId  String?       @map("parent_id")
  parent    PostComment?  @relation("NestedReplies", fields: [parentId], references: [id], onDelete: Cascade)
  replies   PostComment[] @relation("NestedReplies")
  content   String        @db.Text
  createdAt DateTime      @default(now()) @map("created_at")
  updatedAt DateTime      @updatedAt @map("updated_at")

  @@index([postId, createdAt])
  @@map("post_comments")
}

model Community {
  id          String            @id @default(uuid())
  name        String
  slug        String            @unique
  description String            @db.Text
  avatar      String?
  coverImage  String?           @map("cover_image")
  category    String            @default("GENERAL") // ENGLISH, JAPANESE, PRODUCTIVITY, TECH, BOOK_CLUB, FOCUS, GENERAL
  privacy     String            @default("PUBLIC") // PUBLIC, PRIVATE, APPROVAL_REQUIRED
  ownerId     String            @map("owner_id")
  owner       User              @relation("CommunityOwner", fields: [ownerId], references: [id], onDelete: Cascade)
  memberCount Int               @default(1) @map("member_count")
  postCount   Int               @default(0) @map("post_count")
  createdAt   DateTime          @default(now()) @map("created_at")
  updatedAt   DateTime          @updatedAt @map("updated_at")
  members     CommunityMember[]
  posts       Post[]

  @@index([category])
  @@index([privacy])
  @@map("communities")
}

model CommunityMember {
  id          String    @id @default(uuid())
  communityId String    @map("community_id")
  community   Community @relation(fields: [communityId], references: [id], onDelete: Cascade)
  userId      String    @map("user_id")
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  role        String    @default("MEMBER") // OWNER, ADMIN, MODERATOR, MEMBER
  status      String    @default("ACTIVE") // ACTIVE, PENDING, BANNED
  joinedAt    DateTime  @default(now()) @map("joined_at")

  @@unique([communityId, userId])
  @@index([communityId, role])
  @@index([userId])
  @@map("community_members")
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
  targetType String   @map("target_type") // USER, POST, COMMENT, MESSAGE, COMMUNITY
  targetId   String   @map("target_id")
  reason     String
  details    String?  @db.Text
  status     String   @default("PENDING") // PENDING, RESOLVED, DISMISSED
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  @@index([targetType, targetId])
  @@index([status])
  @@map("reports")
}`;

schema = schema.replace(oldPostModelRegex, newModels);
fs.writeFileSync('prisma/schema.prisma', schema, 'utf8');
console.log('prisma/schema.prisma updated successfully for LifeOS Connect.');
