const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'apps', 'web', 'src', 'app', 'public-pages.component.ts');
let content = fs.readFileSync(filePath, 'utf8');
const dir = path.dirname(filePath);

const pattern = /selector:\s*'([^']+)'[\s\S]*?\r?\n\s*template:\s*`([\s\S]*?)`/g;

let match;
const replacements = [];

while ((match = pattern.exec(content)) !== null) {
  const selector = match[1];
  const html = match[2];
  const name = selector.replace(/^app-/, '');
  const htmlName = `${name}.component.html`;
  const htmlPath = path.join(dir, htmlName);
  fs.writeFileSync(htmlPath, html, 'utf8');
  replacements.push({ index: match.index, length: match[0].length, htmlName, full: match[0] });
}

// Process from end to start so indices stay valid
for (let i = replacements.length - 1; i >= 0; i--) {
  const { index, length, htmlName, full } = replacements[i];
  const newBlock = full.replace(/template:\s*`[\s\S]*?`/, `templateUrl: './${htmlName}'`);
  content = content.slice(0, index) + newBlock + content.slice(index + length);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log(`Extracted ${replacements.length} templates`);
