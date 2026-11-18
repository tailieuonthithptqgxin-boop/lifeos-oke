import fs from 'fs';
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

// Replace the escaped \n with actual newlines
schema = schema.replace(
  'publishedAt     DateTime?\\n  imageUrl        String?\\n  isPinned        Boolean  @default(false)\\n  showLoginModal  Boolean  @default(true)\\n  autoSendGmail   Boolean  @default(false)\\n  clickCount      Int      @default(0)\\n  readBy          String?',
  `publishedAt     DateTime?
  imageUrl        String?
  isPinned        Boolean  @default(false)
  showLoginModal  Boolean  @default(true)
  autoSendGmail   Boolean  @default(false)
  clickCount      Int      @default(0)
  readBy          String?`
);

schema = schema.replace(
  'readAt          DateTime?\\n  clickedAt       DateTime?',
  `readAt          DateTime?
  clickedAt       DateTime?`
);

fs.writeFileSync('prisma/schema.prisma', schema, 'utf8');
console.log('Successfully formatted schema.prisma with actual newlines');
