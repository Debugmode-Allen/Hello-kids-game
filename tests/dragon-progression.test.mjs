import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { addDragonXp, progressForXp, validateProgression } from "../js/dragon-progression.js";

const progression = JSON.parse(readFileSync(new URL("../data/dragon-progression.json", import.meta.url), "utf8"));

test("the stored progression matrix has consecutive, consistent thresholds", () => {
  const levels = validateProgression(progression);
  assert.equal(levels.length, 30);
  assert.equal(levels.at(-1).totalXp, 15696);
  assert.equal(progression.maxLevel, 10);
});

test("total XP carries across a smooth level transition", () => {
  const before = progressForXp(29, progression);
  const after = addDragonXp({ xp: 29 }, 25, progression);
  assert.deepEqual(before, { xp: 29, level: 1, isMaxLevel: false, xpIntoLevel: 29, xpForNextLevel: 30, totalXpForNextLevel: 30 });
  assert.equal(after.xp, 54);
  assert.equal(after.level, 2);
  assert.equal(after.xpIntoLevel, 24);
  assert.equal(after.levelsGained, 1);
});

test("experience at the configured level cap cannot inflate further", () => {
  const progress = addDragonXp({ xp: 860 }, 99, progression);
  assert.equal(progress.level, 10);
  assert.equal(progress.isMaxLevel, true);
  assert.equal(progress.xp, 866);
  assert.equal(progress.gainedXp, 6);
});
