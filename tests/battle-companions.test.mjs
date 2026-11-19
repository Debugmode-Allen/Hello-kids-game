import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { companionsForAccount, deployedCompanions } from "../js/companions.js";
import { createBattle, beginNextTurn, upcomingTurns, isProtected, validTargets, useDamageSkill } from "../js/battle-engine.js";
const json = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const library = json("../data/companions.json");
const testUser = { email: library.accountGrants[0].email };
function setup() {
  const dragon = { name: "Dragon", battleSlot: "L2", battleCompanions: { "training-dummy": "L4" }, stats: { attack: 10, defense: 10, speed: 10, stamina: 100 } };
  return createBattle({ dragon, dragonImage: "", companions: deployedCompanions(library, testUser, dragon).map((entry) => ({ ...entry, name: "木桩" })), enemies: [{ id: "enemy", speciesId: "enemy", slot: "R4", stats: { attack: 10, defense: 10, speed: 12, stamina: 100 }, skillId: "enemy-claw" }], enemyAssets: [], balance: json("../data/battle-balance.json"), skills: json("../data/skills.json").skills });
}
test("dummy is granted only to test and overlapping deployment is rejected", () => {
  assert.equal(companionsForAccount(library, testUser).length, 1);
  assert.equal(companionsForAccount(library, { email: "other@example.com" }).length, 0);
  assert.equal(deployedCompanions(library, testUser, { battleSlot: "L4", battleCompanions: { "training-dummy": "L4" } }).length, 0);
  assert.equal(deployedCompanions(library, testUser, { battleSlot: "L2", battleCompanions: { "training-dummy": "R4" } }).length, 0);
});
test("dummy has fixed stats and never gets an action", () => {
  const state = setup(); const dummy = state.units.find((unit) => unit.id === "companion:training-dummy");
  assert.deepEqual([dummy.attack, dummy.defense, dummy.speed, dummy.maxHp], [0, 10, 0, 50]);
  assert.equal(dummy.nextActionAt, Infinity);
  assert(!upcomingTurns(state, 100).includes(dummy.id));
  state.units.find((unit) => unit.id === "dragon").alive = false;
  assert.equal(beginNextTurn(state).id, "enemy");
});
test("frontline dummy takes damage first; defeat removes protection", () => {
  const state = setup(); const dragon = state.units[0]; const dummy = state.units.find((unit) => unit.id === "companion:training-dummy");
  assert(isProtected(state, dragon));
  assert.deepEqual(validTargets(state, "enemy", "enemy-claw").map((unit) => unit.id), [dummy.id]);
  const enemy = beginNextTurn(state);
  useDamageSkill(state, enemy.id, dummy.id, "enemy-claw", () => .5);
  assert(dummy.hp < 50); assert.equal(dragon.hp, 100);
  dummy.alive = false; dummy.hp = 0;
  assert(!isProtected(state, dragon));
  assert.deepEqual(validTargets(state, "enemy", "enemy-claw").map((unit) => unit.id), [dragon.id]);
});
