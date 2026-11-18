const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      results.push(fullPath);
    }
  });
  return results;
}

const allFiles = walk('src');
let totalErrors = 0;

for (const filePath of allFiles) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('Sparkles')) continue;

  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );

  let usesSparkles = false;
  let definesSparkles = false;
  let useLocations = [];

  function visit(node) {
    if (ts.isIdentifier(node) && node.text === 'Sparkles') {
      let p = node.parent;
      let isDecl = false;
      while (p) {
        if (
          ts.isImportSpecifier(p) ||
          ts.isImportClause(p) ||
          ts.isVariableDeclaration(p) ||
          ts.isFunctionDeclaration(p) ||
          ts.isClassDeclaration(p) ||
          ts.isInterfaceDeclaration(p) ||
          ts.isTypeAliasDeclaration(p)
        ) {
          isDecl = true;
          break;
        }
        p = p.parent;
      }
      if (isDecl) {
        definesSparkles = true;
      } else {
        usesSparkles = true;
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        useLocations.push(`line ${line.line + 1}`);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  if (usesSparkles && !definesSparkles) {
    console.error(`🚨🚨🚨 MISSING SPARKLES in: ${filePath} at ${useLocations.join(', ')}`);
    totalErrors++;
  }
}
console.log('Total files missing Sparkles import/decl:', totalErrors);
