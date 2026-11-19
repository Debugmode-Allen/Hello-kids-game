import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createBattle, selectEnemyTarget } from "../js/battle-engine.js";
const json = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const balance = json("../data/battle-balance.json");
const skills = json("../data/skills.json").skills;
const enemyBehaviors = json("../data/enemy-behaviors.json");
function battle(preference) {
  const state = createBattle({
    dragon: { name: "Dragon", battleSlot: "L1", stats: { attack: 20, defense: 20, speed: 10, stamina: 100 } },
    dragonImage: "", balance, skills,
    companions: [{ id: "dummy", name: "Dummy", slot: "L5", image: "", stats: { attack: 0, defense: 10, speed: 0, stamina: 50 } }],
    enemies: [{ id: "enemy", speciesId: "unconfigured", slot: "R4", skillId: "enemy-claw", stats: { attack: 10, defense: 10, speed: 10, stamina: 50 } }],
    enemyAssets: []
  });
  if (preference !== undefined) state.units.find((unit) => unit.id === "enemy").targetPreference = preference;
  return state;
}
const pick = (state, roll) => selectEnemyTarget(state, "enemy", "enemy-claw", () => roll)?.id;

test("missing and invalid preferences choose randomly instead of always choosing dragon", () => {
  for (const preference of [undefined, "random", "invalid", "toString", null]) {
    const state = battle(preference);
    assert.equal(pick(state, 0), "dragon");
    assert.equal(pick(state, .99), "companion:dummy");
  }
});
test("lowest-defense prefers dummy, ties choose randomly", () => {
  const state = battle("lowest-defense");
  assert.equal(pick(state, 0), "companion:dummy");
  state.units[0].defense = 10;
  assert.equal(pick(state, 0), "dragon");
  assert.equal(pick(state, .99), "companion:dummy");
});
test("lowest-hp-ratio compares percentages, not absolute HP", () => {
  const state = battle("lowest-hp-ratio");
  state.units[0].hp = 40; // 40/100, more injured than the 30/50 dummy.
  state.units[1].hp = 30;
  assert.equal(pick(state, .99), "dragon");
  state.units[1].hp = 5;
  assert.equal(pick(state, 0), "companion:dummy");
});
test("highest-attack selects strongest legal attacker", () => {
  assert.equal(pick(battle("highest-attack"), .99), "dragon");
});
test("all preferences obey frontline protection and exclude defeated targets", () => {
  for (const preference of ["random", "lowest-defense", "lowest-hp-ratio", "highest-attack"]) {
    const state = battle(preference);
    state.units[0].slot = "L2"; // Dummy on L5 protects Dragon on L2.
    assert.equal(pick(state, 0), "companion:dummy");
    assert.equal(pick(state, .99), "companion:dummy");
    state.units[1].alive = false;
    state.units[1].hp = 0;
    assert.equal(pick(state, .99), "dragon");
    state.units[0].alive = false;
    assert.equal(pick(state, 0), undefined);
  }
});
test("skill protection flags remain effective; invalid actors return null", () => {
  const state = battle("lowest-defense"); state.units[0].slot = "L2"; state.units[0].defense = 0;
  assert.equal(selectEnemyTarget(state, "enemy", "dark-magic", () => 0).id, "dragon");
  assert.equal(selectEnemyTarget(state, "missing", "enemy-claw"), null);
  assert.equal(selectEnemyTarget(state, "dragon", "claw"), null);
  assert.equal(selectEnemyTarget(state, "enemy", "missing"), null);
});
test("monster-type config is attached at battle creation", () => {
  const enemies = ["leaf-caterpillar", "moon-moth", "new-species"].map((speciesId, i) => ({ id: speciesId, speciesId, slot: "R" + (i + 1), stats: { speed: 1, stamina: 10 }, skillId: "enemy-claw" }));
  const state = createBattle({ dragon: { name: "D", stats: { speed: 1, stamina: 100 } }, dragonImage: "", enemies, enemyAssets: [], balance, skills, enemyBehaviors });
  assert.equal(state.units.find((unit) => unit.id === "leaf-caterpillar").targetPreference, "lowest-defense");
  assert.equal(state.units.find((unit) => unit.id === "moon-moth").targetPreference, "lowest-hp-ratio");
  assert.equal(state.units.find((unit) => unit.id === "new-species").targetPreference, "random");
});
