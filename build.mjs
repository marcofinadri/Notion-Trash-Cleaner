import { build } from 'esbuild';
import { cpSync, mkdirSync, rmSync } from 'fs';

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist');
mkdirSync('dist/icons');

await Promise.all([
  build({ entryPoints: ['content.js'],    outfile: 'dist/content.js',    minify: true }),
  build({ entryPoints: ['popup.js'],      outfile: 'dist/popup.js',      minify: true }),
  build({ entryPoints: ['background.js'], outfile: 'dist/background.js', minify: true }),
]);

for (const file of ['manifest.json', 'popup.html']) cpSync(file, `dist/${file}`);
cpSync('icons',    'dist/icons',    { recursive: true });
cpSync('_locales', 'dist/_locales', { recursive: true });

console.log('dist/ ready');
