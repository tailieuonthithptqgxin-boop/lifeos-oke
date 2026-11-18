const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') walk(filePath, fileList);
    } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const files = walk('./src');
let fixedTotal = 0;

for (const filePath of files) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Regex to match <button with any attributes that DO NOT contain type=
  // We want to insert type="button" right after <button
  const updatedContent = content.replace(/<button\b(?![^>]*\btype=)([^>]*)>/g, (match, rest) => {
    fixedTotal++;
    modified = true;
    return `<button type="button"${rest}>`;
  });

  if (modified) {
    fs.writeFileSync(filePath, updatedContent, 'utf8');
    console.log('Fixed buttons in:', filePath);
  }
}

console.log('Finished! Total buttons updated with type="button":', fixedTotal);
