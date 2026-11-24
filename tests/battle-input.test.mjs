import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createBattle, skipTurn } from "../js/battle-engine.js";
import { canQuickClaw } from "../js/battle-input.js";
const json = path => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
function setup() {
  const state = createBattle({ dragon: { name: "Dragon", stats: {attack:10,defense:10,speed:10,stamina:100} }, dragonImage: "", enemies: [
    {id:"front",speciesId:"enemy",slot:"R4",stats:{attack:10,defense:10,speed:10,stamina:100}},
    {id:"rear",speciesId:"enemy",slot:"R1",stats:{attack:10,defense:10,speed:10,stamina:100}}
  ], enemyAssets: [], balance:json("../data/battle-balance.json"), skills:json("../data/skills.json").skills });
  state.activeUnitId = "dragon"; return state;
}
test("quick claw allows an exposed enemy and rejects protected rear, allies, missing and defeated targets", () => {
  const state = setup();
  assert.equal(canQuickClaw(state,"front"),true);
  for (const id of ["rear","dragon","missing"]) assert.equal(Boolean(canQuickClaw(state,id)),false);
  state.units.find(u=>u.id==="front").alive=false;
  assert.equal(Boolean(canQuickClaw(state,"front")),false);
  assert.equal(canQuickClaw(state,"rear"),true);
});
test("quick claw rejects busy animations, enemy turns and ended battles", () => {
  const state=setup(); assert.equal(canQuickClaw(state,"front",true),false);
  state.activeUnitId="front"; assert.equal(canQuickClaw(state,"rear"),false);
  state.activeUnitId="dragon"; state.status="victory"; assert.equal(canQuickClaw(state,"front"),false);
});

test("skipping reports the existing regeneration tick so its animation can be shown", () => {
  const state=setup();const dragon=state.units.find(unit=>unit.id==="dragon");
  dragon.hp=50;dragon.healOverTimeAmount=12;dragon.healOverTimeTurns=1;
  const result=skipTurn(state,dragon.id);
  assert.equal(result.turnEffects.healed,12);assert.equal(dragon.hp,62);assert.equal(dragon.healOverTimeTurns,0);
});
