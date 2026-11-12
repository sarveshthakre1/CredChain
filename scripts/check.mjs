import { readFile, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
for (const directory of ['src', 'scripts', 'public', 'test']) {
  for (const name of await readdir(new URL(directory + '/', root))) {
    if (!/\.(mjs|js)$/.test(name)) continue;
    const path = fileURLToPath(new URL(directory + '/' + name, root));
    const result = spawnSync(process.execPath, ['--check', path], { encoding: 'utf8' });
    if (result.status !== 0) throw new Error(result.stderr);
  }
}
const html = await readFile(new URL('public/index.html', root), 'utf8');
const js = await readFile(new URL('public/app.js', root), 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
if (new Set(ids).size !== ids.length) throw new Error('Duplicate HTML ID');
for (const match of js.matchAll(/\$\('([^']+)'\)/g)) if (!ids.includes(match[1])) throw new Error('Missing HTML ID: ' + match[1]);
for (const name of ['overview', 'issuer', 'student', 'verifier', 'activity']) if (!ids.includes(name)) throw new Error('Missing page: ' + name);
console.log('JavaScript syntax and HTML/JavaScript reference checks passed.');
