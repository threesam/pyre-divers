// tsc cannot read inline HTML scripts — extract the page script for checking.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');
const match = html.match(/<script>([\s\S]*)<\/script>/);
if (!match) {
  throw new Error('no <script> block found in index.html');
}
mkdirSync('.tscheck', { recursive: true });
writeFileSync('.tscheck/page.js', match[1]);
