const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = 'project_export.txt';

// Folders to skip
const SKIP_DIRS = [
  'node_modules', '.git', '.angular', 'dist', 'build',
  '.cache', 'coverage', '.nyc_output', 'tmp', '.tmp'
];

// File types to skip
const SKIP_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.zip', '.pdf', '.map', '.lock'
];

// Key Angular & Express file types to prioritize
const IMPORTANT_EXTENSIONS = [
  '.ts', '.js', '.html', '.css', '.scss',
  '.json', '.env', '.yaml', '.yml', '.md'
];

let output = '';
let fileCount = 0;

function scanDir(dirPath, depth = 0) {
  let items;
  try {
    items = fs.readdirSync(dirPath);
  } catch (e) {
    output += `[Cannot read directory: ${dirPath}]\n`;
    return;
  }

  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    let stat;
    try {
      stat = fs.statSync(fullPath);
    } catch (e) {
      continue;
    }

    if (stat.isDirectory()) {
      if (SKIP_DIRS.includes(item)) continue;
      output += `\n${'='.repeat(70)}\n`;
      output += `📁 FOLDER: ${fullPath}\n`;
      output += `${'='.repeat(70)}\n`;
      scanDir(fullPath, depth + 1);
    } else {
      const ext = path.extname(item).toLowerCase();
      if (SKIP_EXTENSIONS.includes(ext)) continue;
      if (!IMPORTANT_EXTENSIONS.includes(ext)) continue;

      fileCount++;
      output += `\n${'-'.repeat(70)}\n`;
      output += `📄 FILE #${fileCount}: ${fullPath}\n`;
      output += `${'-'.repeat(70)}\n`;

      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, i) => {
          output += `${String(i + 1).padStart(5)} | ${line}\n`;
        });
      } catch (e) {
        output += `[Could not read file: ${e.message}]\n`;
      }
    }
  }
}

// Header
output += `${'#'.repeat(70)}\n`;
output += `   FULL PROJECT EXPORT — ANGULAR + EXPRESS\n`;
output += `${'#'.repeat(70)}\n`;
output += `Generated : ${new Date().toISOString()}\n`;
output += `Root Path : ${process.cwd()}\n`;
output += `${'#'.repeat(70)}\n\n`;

// Scan project
scanDir('.');

// Footer
output += `\n${'#'.repeat(70)}\n`;
output += `   EXPORT COMPLETE — Total Files: ${fileCount}\n`;
output += `${'#'.repeat(70)}\n`;

fs.writeFileSync(OUTPUT_FILE, output, 'utf8');
console.log(`✅ Done! Exported ${fileCount} files to: ${OUTPUT_FILE}`);