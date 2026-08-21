import fs from 'node:fs';
import path from 'node:path';

const distRoot = path.resolve(process.cwd(), 'dist');
const files = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(target);
    else if (entry.isFile()) files.push(target);
  }
}

walk(distRoot);
const maps = files.filter((file) => file.endsWith('.js.map'));
if (maps.length === 0) throw new Error('Private build produced no JavaScript source maps');

for (const file of maps) {
  const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (payload.version !== 3 || !Array.isArray(payload.sources) || payload.sources.length === 0) {
    throw new Error(`Invalid Source Map v3 artifact: ${path.relative(distRoot, file)}`);
  }
}

for (const file of files.filter((entry) => entry.endsWith('.js'))) {
  if (/sourceMappingURL=.*\.map/.test(fs.readFileSync(file, 'utf8'))) {
    throw new Error(`Public sourceMappingURL found in ${path.relative(distRoot, file)}`);
  }
}

console.log(JSON.stringify({ status: 'ok', sourceMaps: maps.length, publicReferences: 0 }));
