import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { addDragonXp, progressForDragon, progressForXp, validateProgression } from "../js/dragon-progression.js";

const progression = JSON.parse(readFileSync(new URL("../data/dragon-progression.json", import.meta.url), "utf8"));

test("the stored progression matrix has consecutive, consistent thresholds", () => {
  const levels = validateProgression(progression);
  assert.equal(levels.length, 30);
  assert.equal(levels.at(-1).totalXp, 31392);
  assert.equal(progression.maxLevel, 10);
});

test("total XP carries across a smooth level transition", () => {
  const before = progressForXp(59, progression);
  const after = addDragonXp({ xp: 59, xpCurveVersion: 2 }, 25, progression);
  assert.deepEqual(before, { xp: 59, level: 1, isMaxLevel: false, xpIntoLevel: 59, xpForNextLevel: 60, totalXpForNextLevel: 60 });
  assert.equal(after.xp, 84);
  assert.equal(after.level, 2);
  assert.equal(after.xpIntoLevel, 24);
  assert.equal(after.levelsGained, 1);
});

test("experience at the configured level cap cannot inflate further", () => {
  const progress = addDragonXp({ xp: 1726, xpCurveVersion: 2 }, 99, progression);
  assert.equal(progress.level, 10);
  assert.equal(progress.isMaxLevel, true);
  assert.equal(progress.xp, 1732);
  assert.equal(progress.gainedXp, 6);
});

test("old saves preserve level and in-level experience once", () => {
  const old = { level: 3, xp: 100 };
  const before = progressForDragon(old, progression);
  assert.equal(before.level, 3);
  assert.equal(before.xpIntoLevel, 30);
  assert.equal(before.xp, 170);
  const after = addDragonXp(old, 5, progression);
  assert.equal(after.xp, 175);
  assert.equal(progressForDragon({ level: after.level, xp: after.xp, xpCurveVersion: 2 }, progression).xpIntoLevel, 35);
});
