import { copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const rootDir = process.cwd();
const source = join(rootDir, 'web-static', 'index.html');
const destination = join(rootDir, 'dist', 'index.html');

if (!existsSync(source)) {
  throw new Error(`Static landing page source not found: ${source}`);
}

if (!existsSync(join(rootDir, 'dist'))) {
  throw new Error('dist folder not found. Run `npx expo export --platform web` first.');
}

copyFileSync(source, destination);
console.log(`Copied ${source} -> ${destination}`);
