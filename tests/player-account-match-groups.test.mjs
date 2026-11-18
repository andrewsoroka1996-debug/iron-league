import test from "node:test";
import assert from "node:assert/strict";
import { groupDirectPlayerMatches, countDirectPlayerMatches } from "../lib/player-account-match-groups.ts";

const base = {
  season: 4, competition: "division", division: 1,
  stage: null, group_name: null, leg: null, participant_type: "player",
  home_goals: null, away_goals: null, status: "scheduled", played_at: null,
};
const match = (props) => ({ ...base, ...props });

test("two fixtures vs same opponent become one group but keep independent match IDs", () => {
  const input = [
    match({ id: "r16", round: 16, home_id: "op", away_id: "andrew-sm" }),
    match({ id: "r01", round: 1, home_id: "andrew-sm", away_id: "op" }),
  ];
  const groups = groupDirectPlayerMatches(input, "andrew-sm");
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].matches.map((row) => row.id), ["r01", "r16"]);
});

test("different competition, division, season and participant type are never mixed", () => {
  const rows = [
    match({ id: "a", round: 1, home_id: "andrew-sm", away_id: "op" }),
    match({ id: "b", round: 2, home_id: "andrew-sm", away_id: "op", competition: "division-1-cup" }),
    match({ id: "c", round: 3, home_id: "andrew-sm", away_id: "op", division: 2 }),
    match({ id: "d", round: 4, home_id: "andrew-sm", away_id: "op", participant_type: "association" }),
    match({ id: "e", round: 5, home_id: "andrew-sm", away_id: "op", season: 3 }),
  ];
  const groups = groupDirectPlayerMatches(rows, "andrew-sm", 4);
  assert.equal(groups.length, 4);
  assert.equal(groups.flatMap((g) => g.matches).length, 4);
});

test("statuses and results remain independent, including closed_unplayed", () => {
  const rows = [
    match({ id: "a", round: 1, home_id: "andrew-sm", away_id: "op" }),
    match({ id: "b", round: 16, home_id: "op", away_id: "andrew-sm", status: "finished", home_goals: 1, away_goals: 2 }),
    match({ id: "c", round: 17, home_id: "andrew-sm", away_id: "another", status: "closed_unplayed" }),
  ];
  const groups = groupDirectPlayerMatches(rows, "andrew-sm");
  assert.deepEqual(countDirectPlayerMatches(groups), {
    scheduled: 1, finished: 1, closedUnplayed: 1, other: 0,
  });
  assert.equal(groups.find((g) => g.opponentId === "op")?.matches.length, 2);
});

test("only player's direct fixtures are included and duplicates ignored", () => {
  const rows = [
    match({ id: "a", round: 1, home_id: "andrew-sm", away_id: "op" }),
    match({ id: "a", round: 1, home_id: "andrew-sm", away_id: "op" }),
    match({ id: "z", round: 2, home_id: "other", away_id: "op" }),
    match({ id: "invalid", round: 3, home_id: "andrew-sm", away_id: "andrew-sm" }),
  ];
  const groups = groupDirectPlayerMatches(rows, "andrew-sm");
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].matches.map((row) => row.id), ["a"]);
});
