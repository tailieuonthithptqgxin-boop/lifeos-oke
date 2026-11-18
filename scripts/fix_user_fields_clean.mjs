import fs from 'fs';

let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
// Normalize all line endings to \n
schema = schema.replace(/\r\n/g, '\n');

const target = '  updatedAt           DateTime   @updatedAt\n';
const addition = `  updatedAt           DateTime   @updatedAt

  totalStudyMinutes   Int        @default(0) @map("total_study_minutes")
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
`;

if (!schema.includes('totalStudyMinutes   Int')) {
  if (!schema.includes(target)) {
    console.error('Target not found!');
    process.exit(1);
  }
  schema = schema.replace(target, addition);
  fs.writeFileSync('prisma/schema.prisma', schema, 'utf8');
  console.log('✅ Success: User scalar fields inserted!');
} else {
  console.log('Already has totalStudyMinutes Int');
}
