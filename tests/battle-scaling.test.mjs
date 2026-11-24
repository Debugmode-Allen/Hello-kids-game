import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateDamage, createBattle, useSkill, validTargets } from "../js/battle-engine.js";

const json = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const balance = json("../data/battle-balance.json");
const skills = json("../data/skills.json").skills;

function createScalingBattle(stats = { attack: 10, defense: 10, speed: 10, stamina: 100 }, enemies = null) {
  return createBattle({
    dragon: { name: "Dragon", battleSlot: "L1", stats },
    dragonImage: "", balance, skills, initialEnergy: 10, enemyAssets: [],
    enemies: enemies || [{ id: "front", speciesId: "leaf-caterpillar", slot: "R4", skillId: "enemy-claw", stats: { attack: 4, defense: 3, speed: 4, stamina: 50 } }]
  });
}

test("攻击技能的基础威力取决于攻击，不取决于体力", () => {
  const light = createScalingBattle({ attack: 12, defense: 10, speed: 10, stamina: 40 });
  const sturdy = createScalingBattle({ attack: 12, defense: 10, speed: 10, stamina: 400 });
  const lightDamage = calculateDamage(light, light.units[0], light.units[1], "fire-breath", () => 0.5);
  const sturdyDamage = calculateDamage(sturdy, sturdy.units[0], sturdy.units[1], "fire-breath", () => 0.5);
  assert.equal(lightDamage, sturdyDamage);
});

test("潮汐疗愈同时受攻击和防御影响", () => {
  const state = createScalingBattle();
  state.units[0].hp = 1;
  state.activeUnitId = "dragon";
  const result = useSkill(state, "dragon", "dragon", "tidal-healing");
  assert.equal(result.applied[0].healed, 40);
  assert.equal(state.units[0].hp, 41);
});

test("藤蔓缠绕可直接选择被前排保护的后排敌人", () => {
  const state = createScalingBattle(
    { attack: 10, defense: 10, speed: 10, stamina: 100 },
    [
      { id: "rear", speciesId: "moon-moth", slot: "R1", skillId: "enemy-claw", stats: { attack: 4, defense: 3, speed: 5, stamina: 40 } },
      { id: "front", speciesId: "leaf-caterpillar", slot: "R4", skillId: "enemy-claw", stats: { attack: 4, defense: 3, speed: 4, stamina: 50 } }
    ]
  );
  assert.deepEqual(validTargets(state, "dragon", "entangling-vines").map((unit) => unit.id).sort(), ["front", "rear"]);
  state.activeUnitId = "dragon";
  const result = useSkill(state, "dragon", "rear", "entangling-vines", () => 0.5);
  assert.equal(result.target.id, "rear");
  assert.equal(result.delayedTurns, 2);
});
