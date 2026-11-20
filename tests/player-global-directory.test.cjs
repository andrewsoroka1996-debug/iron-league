/* Pure offline tests. No Supabase/Vercel requests, no filesystem writes. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const ROOT = path.resolve(__dirname, '..');
let passed = 0;
function test(name, fn) { fn(); passed++; console.log(`PASS ${passed}: ${name}`); }
function loadTs(relPath) {
  const filename = path.join(ROOT, relPath);
  const source = fs.readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(source, {
    fileName: filename,
    reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  });
  const errs = (compiled.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
  assert.equal(errs.length, 0, `TypeScript transpilation failed: ${relPath}`);
  const m = new Module(filename, module);
  m.filename = filename;
  m.paths = Module._nodeModulePaths(path.dirname(filename));
  m._compile(compiled.outputText, filename);
  return m.exports;
}
const { players } = loadTs('data/players.ts');
const { mergePlayerDirectory, searchPlayerDirectory } = loadTs('lib/player-directory.ts');
const page = fs.readFileSync(path.join(ROOT, 'app/players/page.tsx'), 'utf8');
const dynamic = fs.readFileSync(path.join(ROOT, 'lib/dynamic-player-profiles-server.ts'), 'utf8');
const historicalSnapshot = JSON.stringify(players);
const directory = mergePlayerDirectory(players);
const fakeNew = [
  { id: 'il-new-demo1', nickname: 'Новачок', account: null, source: 'dynamic' },
  { id: 'il-new-demo2', nickname: 'AnotherNew', account: null, source: 'dynamic' },
];

test('105 original historical player profiles', () => assert.equal(players.length, 105));
test('global catalog includes all legacy IDs exactly once', () => {
  assert.equal(directory.length, 105);
  assert.equal(new Set(directory.map(p => p.id)).size, 105);
  for (const p of players) assert.ok(directory.some(d => d.id === p.id));
});
test('catalog is sorted and uses each original stable player ID', () => {
  const names = directory.map(p => p.nickname);
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b, 'uk', {sensitivity:'base'})));
  assert.ok(directory.find(p => p.id === 'andrew-sm'));
});
test('approved dynamic profiles are appended without changing legacy', () => {
  const all = mergePlayerDirectory(players, fakeNew);
  assert.equal(all.length, 107);
  assert.equal(all.find(p => p.id === 'il-new-demo1').source, 'dynamic');
  assert.equal(all.find(p => p.id === 'andrew-sm').source, 'legacy');
});
test('duplicate dynamic id, nickname, and repeated records are discarded', () => {
  const all = mergePlayerDirectory(players, [
    ...fakeNew, fakeNew[0],
    { id: 'andrew-sm', nickname: 'IntruderName', source: 'dynamic' },
    { id: 'il-other', nickname: 'aNdReW_sM', source: 'dynamic' },
    { id: 'il-invalid-provenance', nickname: 'NotApproved', source: 'legacy' },
  ]);
  assert.equal(all.length, 107);
  assert.equal(all.find(p => p.id === 'andrew-sm').nickname, 'Andrew_SM');
});
test('nickname search is case-insensitive and Unicode-aware', () => {
  assert.ok(searchPlayerDirectory(directory, '  ANDREW_sm  ').some(p => p.id === 'andrew-sm'));
  assert.ok(searchPlayerDirectory(directory, 'павук').some(p => p.id === 'pavuk'));
});
test('account and id search work', () => {
  assert.ok(searchPlayerDirectory(directory, 'andrew_sm_').some(p => p.id === 'andrew-sm'));
  assert.ok(searchPlayerDirectory(directory, 'd-odessaua').some(p => p.id === 'd-odessaua'));
});
test('empty and absent search never hide entries or mutate records', () => {
  assert.equal(searchPlayerDirectory(directory, '').length, 105);
  assert.equal(searchPlayerDirectory(directory, 'zz__unmatched__zz').length, 0);
  assert.equal(JSON.stringify(players), historicalSnapshot);
});
test('page has global default and backward-compatible season URLs', () => {
  assert.match(page, /params\.view !== "all" && \(params\.season !== undefined \|\| params\.division !== undefined\)/);
  assert.match(page, /href="\/players" aria-current=\{!seasonMode/);
  assert.match(page, /mergePlayerDirectory\(players, newRegisteredPlayers\)/);
  assert.match(page, /seasonMode\s*\? await getSeasonPlayers\(season\)/);
  assert.match(page, /getSeasonStatus[\s\S]*"Завершений сезон"/);
});
test('DB loading stays feature-gated and existing season rosters remain separate', () => {
  assert.match(dynamic, /process\.env\.IRON_LEAGUE_DYNAMIC_PLAYER_PROFILES_ENABLED === "true"/);
  assert.match(page, /dynamicProfilesEnabled\(\) && \(!seasonMode \|\| season >= 3\)/);
  assert.match(page, /seasonMode && showDynamicProfiles/);
  assert.match(page, /href=\{`\/players\?season=\$\{seasonNumber\}`\}/);
});
console.log(`ALL PASS: ${passed} checks`);
