"use strict";
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'../../..');
const source = p => fs.readFileSync(path.join(root,p),'utf8');
const history = source('app/history/page.tsx');
const detail = source('components/history/HistorySeasonLayout.tsx');
const division = source('components/DivisionPage.tsx');
const europe = source('components/GroupStagePage.tsx');
const cups = source('app/tournaments/division-cups/page.tsx');

test('History overview has 3 completed, 0 active, season 4 preparing',() => {
  assert.match(history,/title: "Сезон 3",\s*status: "Завершений"/);
  assert.match(history,/value: "03", label: "Завершені сезони"/);
  assert.match(history,/value: "00", label: "Активних сезонів"/);
  assert.match(history,/number: 4,\s*title: "Сезон 4",\s*status: "Підготовка"/);
  assert.doesNotMatch(history,/Поточний сезон|АКТУАЛЬНИЙ СЕЗОН|Поточний розіграш|Поточні турніри й нагороди/);
  assert.match(history,/const isArchive = season.number <= 3;/);
});
test('Season 3 archive view, winners and labels use completed semantics',()=>{
  assert.match(detail,/3:\s*{\s*status: "Завершений"/);
  assert.match(detail,/const isArchive = season <= 3;/);
  assert.doesNotMatch(detail,/Сезон триває|Поточний сезон|const isActive = season === 3/);
  assert.match(detail,/Підтверджені переможці та трофеї завершеного сезону/);
});
test('Division and European group-stage pages mark season 3 completed',()=>{
  for (const s of [division,europe,cups]) {
    assert.match(s,/season === 3\s*\? "Завершений"\s*:\s*"Підготовка"/);
    assert.match(s,/season === 2\s*\? "Архів"/);
    assert.doesNotMatch(s,/\? "Поточний сезон"/);
  }
});
test('No season data, database or account authorization touched',()=>{
  assert.match(history,/href: "\/history\/season-3"/);
  assert.match(detail,/<SeasonWinners season={season} \/>/);
  assert.match(division,/buildStandings/);
  assert.match(europe,/getCompetitionGroups/);
  assert.match(cups,/getStageOrder/);
});
