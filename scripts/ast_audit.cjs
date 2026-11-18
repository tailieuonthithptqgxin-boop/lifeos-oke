const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') walk(filePath, fileList);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const files = walk('./src');

const report = {
  missingDepArrays: [],
  uncleanedIntervals: [],
  uncleanedListeners: [],
  buttonsWithoutType: [],
  loadingWithoutFinally: []
};

for (const filePath of files) {
  const content = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );

  function visit(node) {
    // Check useEffect / useLayoutEffect calls
    if (ts.isCallExpression(node)) {
      const text = node.expression.getText(sourceFile);
      if (text === 'useEffect' || text === 'React.useEffect' || text === 'useLayoutEffect' || text === 'React.useLayoutEffect') {
        const args = node.arguments;
        if (args.length < 2) {
          const lineAndChar = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
          report.missingDepArrays.push({
            file: filePath,
            line: lineAndChar.line + 1,
            call: text
          });
        } else if (args.length >= 1) {
          const callback = args[0];
          const effectBodyText = callback.getText(sourceFile);
          
          // Check if effect sets interval without returning cleanup
          if (effectBodyText.includes('setInterval(')) {
            let hasCleanup = effectBodyText.includes('clearInterval(') || effectBodyText.includes('return ()');
            if (!hasCleanup) {
              const lineAndChar = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
              report.uncleanedIntervals.push({
                file: filePath,
                line: lineAndChar.line + 1
              });
            }
          }

          // Check if effect sets addEventListener without removeEventListener
          if (effectBodyText.includes('addEventListener(')) {
            let hasCleanup = effectBodyText.includes('removeEventListener(') || effectBodyText.includes('return ()');
            if (!hasCleanup) {
              const lineAndChar = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
              report.uncleanedListeners.push({
                file: filePath,
                line: lineAndChar.line + 1
              });
            }
          }
        }
      }
    }

    // Check JSX button element
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tagName = node.tagName.getText(sourceFile);
      if (tagName === 'button') {
        let hasType = false;
        for (const prop of node.attributes.properties) {
          if (ts.isJsxAttribute(prop) && prop.name.getText(sourceFile) === 'type') {
            hasType = true;
            break;
          }
        }
        if (!hasType) {
          const lineAndChar = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
          report.buttonsWithoutType.push({
            file: filePath,
            line: lineAndChar.line + 1
          });
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

console.log('=== AST AUDIT REPORT ===');
console.log('1. Missing Dependency Arrays in useEffect:', report.missingDepArrays.length);
if (report.missingDepArrays.length) console.log(report.missingDepArrays);

console.log('2. Uncleaned Intervals in useEffect:', report.uncleanedIntervals.length);
if (report.uncleanedIntervals.length) console.log(report.uncleanedIntervals);

console.log('3. Uncleaned Event Listeners in useEffect:', report.uncleanedListeners.length);
if (report.uncleanedListeners.length) console.log(report.uncleanedListeners);

console.log('4. Buttons without type attribute:', report.buttonsWithoutType.length);
console.log('Top files with buttons without type:');
const byFile = {};
report.buttonsWithoutType.forEach(b => {
  byFile[b.file] = (byFile[b.file] || 0) + 1;
});
console.log(Object.entries(byFile).sort((a,b)=>b[1]-a[1]).slice(0, 15));
