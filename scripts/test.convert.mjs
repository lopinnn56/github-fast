import { normalizeInput, isGitHubUrl, detectType, buildAccelUrl, parseBatch, MAX_BATCH } from '../js/convert.js';

const cases = [
    ['https://github.com/u/r', 'repo'],
    ['github.com/u/r', 'repo'],
    ['www.github.com/u/r', 'repo'],
    ['u/r', 'repo'],
    ['raw.githubusercontent.com/u/r/main/f.js', 'raw'],
    ['gist.github.com/x/abc', 'gist'],
    ['https://github.com/u/r/blob/main/a.zip', 'file'],
    ['https://github.com/u/r/releases/download/v1/a.zip', 'release'],
    ['https://github.com/u/r/archive/refs/heads/main.zip', 'release'],
    ['https://github.com/u/r/releases/download/v1/a.tar.gz', 'release'],
    ['https://github.com/u/r/tags/v1', 'release'],
    ['https://github.com/u/r/wiki', 'repo'],
];
let fail = 0;
for (const [inp, want] of cases) {
    const n = normalizeInput(inp);
    const got = isGitHubUrl(n) ? detectType(n) : 'INVALID';
    if (got !== want) { console.log('FAIL', inp, '=>', got, 'want', want); fail++; }
}
for (const bad of ['https://evil.com/github.com/x', 'javascript:alert(1)', 'github.com.evil.com/x/y']) {
    if (isGitHubUrl(normalizeInput(bad))) { console.log('SEC FAIL:', bad); fail++; }
}
const p = buildAccelUrl('https://github.com/u/r', { prefix: 'https://m.example/', mode: 'prefix' });
if (p !== 'https://m.example/github.com/u/r') { console.log('FAIL prefix:', p); fail++; }
const r = buildAccelUrl('https://github.com/u/r?x=1#h', { prefix: 'https://m.example/', mode: 'replace' });
if (r !== 'https://m.example/u/r?x=1#h') { console.log('FAIL replace:', r); fail++; }
const bad = buildAccelUrl('https://github.com/u/r', null);
if (bad !== 'https://github.com/u/r') { console.log('FAIL broken node'); fail++; }
const pb = parseBatch('github.com/a/b\nhttps://github.com/a/b\nu/r\n\n');
if (pb.join('|') !== 'https://github.com/a/b|https://github.com/u/r') { console.log('FAIL batch:', pb); fail++; }
console.log('MAX_BATCH =', MAX_BATCH);
console.log(fail ? `❌ ${fail} failed` : '✅ all smoke tests passed');
process.exit(fail ? 1 : 0);
