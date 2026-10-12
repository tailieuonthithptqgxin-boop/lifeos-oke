import fs from 'fs';

const schemaContent = fs.readFileSync('prisma/schema.prisma', 'utf8');

const modelRegex = /model\s+(\w+)\s+{([^}]+)}/g;
let match;
const modelsWithoutUserIdIndex = [];
const modelsWithUserId = [];

while ((match = modelRegex.exec(schemaContent)) !== null) {
  const modelName = match[1];
  const modelBody = match[2];

  if (modelBody.includes('userId') && !modelBody.includes('userId String @unique') && !modelBody.includes('userId String? @unique')) {
    modelsWithUserId.push(modelName);
    const hasIndex = modelBody.includes('@@index([userId') || modelBody.includes('@@index([userId,') || modelBody.includes('@@unique([userId,');
    if (!hasIndex) {
      modelsWithoutUserIdIndex.push(modelName);
    }
  }
}

console.log(`Total models with userId: ${modelsWithUserId.length}`);
console.log(`Models with userId missing @@index([userId]): ${modelsWithoutUserIdIndex.length}`);
modelsWithoutUserIdIndex.forEach(m => console.log(`  - ${m}`));
