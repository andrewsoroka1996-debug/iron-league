import assert from "node:assert/strict";
import test from "node:test";
import { isDivisionCalendarMatchComplete } from "../lib/division-calendar-completion.ts";

const match = (status, home_goals, away_goals) => ({
  status, home_goals, away_goals,
});

test("finished with both goals is calendar complete", () => {
  assert.equal(isDivisionCalendarMatchComplete(match("finished", 0, 0)), true);
  assert.equal(isDivisionCalendarMatchComplete(match("finished", 3, 1)), true);
});

test("closed_unplayed with both NULL goals is calendar complete", () => {
  assert.equal(isDivisionCalendarMatchComplete(match("closed_unplayed", null, null)), true);
});

test("finished with an absent goal is NOT complete", () => {
  assert.equal(isDivisionCalendarMatchComplete(match("finished", null, 0)), false);
  assert.equal(isDivisionCalendarMatchComplete(match("finished", 2, null)), false);
  assert.equal(isDivisionCalendarMatchComplete(match("finished", null, null)), false);
});

test("closed_unplayed with a score is NOT complete", () => {
  assert.equal(isDivisionCalendarMatchComplete(match("closed_unplayed", 0, 0)), false);
  assert.equal(isDivisionCalendarMatchComplete(match("closed_unplayed", null, 1)), false);
});

test("pending or unknown statuses do not complete calendar", () => {
  for (const status of ["scheduled", "pending", "cancelled", "in_progress", null]) {
    assert.equal(isDivisionCalendarMatchComplete(match(status, null, null)), false);
  }
});

test("season 3 division results: 234+6, 230+10, 240+0, 238+2 all complete", () => {
  for (const [finished, closed] of [[234, 6], [230, 10], [240, 0], [238, 2]]) {
    const fixtures = [
      ...Array.from({ length: finished }, () => match("finished", 1, 0)),
      ...Array.from({ length: closed }, () => match("closed_unplayed", null, null)),
    ];
    assert.equal(fixtures.length, 240);
    assert.equal(fixtures.every(isDivisionCalendarMatchComplete), true);
  }
});

test("one unfinished match blocks administrative season completion", () => {
  const fixtures = [
    ...Array.from({ length: 239 }, () => match("finished", 1, 0)),
    match("scheduled", null, null),
  ];
  assert.equal(fixtures.every(isDivisionCalendarMatchComplete), false);
});
