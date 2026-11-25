import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { completeEncounter, generateRun, movePlayer, refreshVision, restorePlayerHealth, tileId, updatePlayerHealth, visibleWithinSight } from "../js/adventure-run.js";

const chapter = JSON.parse(readFileSync(new URL("../data/adventure-chapters.json", import.meta.url), "utf8")).chapters[0];

function reachable(run) {
  const byId = Object.fromEntries(run.tiles.map((tile) => [tile.id, tile]));
  const start = byId[tileId(run.player.row, run.player.column)];
  const seen = new Set([start.id]);
  const queue = [start];
  const deltas = { north: [-1, 0], east: [0, 1], south: [1, 0], west: [0, -1] };
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    for (const [direction, [row, column]] of Object.entries(deltas)) {
      if (!current.exits[direction]) continue;
      const next = byId[tileId(current.row + row, current.column + column)];
      if (next && !seen.has(next.id)) { seen.add(next.id); queue.push(next); }
    }
  }
  return seen;
}

test("meadow run is a connected 6x8 maze with a reachable boss and required events", () => {
  const run = generateRun(chapter, 17);
  const kinds = run.tiles.reduce((result, tile) => ({ ...result, [tile.kind]: (result[tile.kind] || 0) + 1 }), {});
  assert.equal(run.tiles.length, 48);
  assert.equal(kinds.start, 1); assert.equal(kinds.boss, 1);
  assert.equal(kinds.monster, 5); assert.equal(kinds.treasure, 1); assert.equal(kinds.rest, 1);
  const groups = run.tiles.filter((tile) => tile.kind === "monster");
  assert.equal(groups.every((tile) => chapter.encounterGroups.some((group) => group.battleId === tile.battleId && group.experience === tile.experience)), true);
  assert.equal(reachable(run).size, 48);
});

test("adventure fog reveals only three connected tiles and an uncleared encounter blocks sight", () => {
  const run = generateRun(chapter, 18);
  assert.equal(run.revealed.length < run.tiles.length, true);
  const sightTiles = [
    { id: "0-0", row: 0, column: 0, exits: { east: true }, kind: "start", state: "cleared" },
    { id: "0-1", row: 0, column: 1, exits: { west: true, east: true }, kind: "empty", state: "idle" },
    { id: "0-2", row: 0, column: 2, exits: { west: true, east: true }, kind: "monster", state: "idle" },
    { id: "0-3", row: 0, column: 3, exits: { west: true }, kind: "empty", state: "idle" }
  ];
  assert.deepEqual(visibleWithinSight(sightTiles[0], sightTiles, 3), ["0-0", "0-1", "0-2"]);
  sightTiles[2].state = "cleared";
  assert.deepEqual(visibleWithinSight(sightTiles[0], sightTiles, 3), ["0-0", "0-1", "0-2", "0-3"]);
  const runAfterReward = refreshVision({ mode: "adventure", player: { row: 0, column: 0 }, visionRange: 3, revealed: ["0-0", "0-1", "0-2"], tiles: sightTiles });
  assert.equal(runAfterReward.revealed.includes("0-3"), true);
});

test("adventure mode blocks an encounter until its battle is reported victorious", () => {
  const testRun = {
    ...generateRun(chapter, 18),
    player: { row: 1, column: 0 },
    tiles: [
      { id: "1-0", row: 1, column: 0, exits: { north: true }, kind: "start", state: "cleared" },
      { id: "0-0", row: 0, column: 0, exits: { south: true }, kind: "monster", state: "idle" }
    ],
    revealed: ["1-0", "0-0"],
    mode: "adventure"
  };
  const crossed = movePlayer(testRun, "0-0");
  assert.equal(crossed.changed, false);
  const completed = completeEncounter(testRun, "0-0", chapter);
  assert.equal(completed.changed, true);
  assert.equal(completed.experienceGained, 0);
  assert.deepEqual(completed.run.player, { row: 0, column: 0 });
});

test("clearing encounter groups and the boss awards the configured experience once", () => {
  const run = generateRun(chapter, 19);
  const monster = run.tiles.find((tile) => tile.kind === "monster");
  const monsterCompleted = completeEncounter(run, monster.id, chapter);
  assert.equal(monsterCompleted.experienceGained, monster.experience);
  const boss = run.tiles.find((tile) => tile.kind === "boss");
  const completed = completeEncounter(monsterCompleted.run, boss.id, chapter);
  assert.equal(completed.changed, true); assert.equal(completed.bossCleared, true);
  assert.equal(completed.run.status, "cleared");
  assert.equal(completed.experienceGained, chapter.bossExperience);
  assert.equal(completed.run.loot.experience, monster.experience + chapter.bossExperience);
  assert.equal(completeEncounter(completed.run, boss.id, chapter).changed, false);
});

test("a healing crystal restores half the dragon's maximum HP without exceeding it", () => {
  const run = updatePlayerHealth(generateRun(chapter, 20), 20, 100);
  const restored = restorePlayerHealth(run, chapter.restHealRatio);
  assert.equal(restored.healed, 50);
  assert.equal(restored.run.playerHp, 70);
  assert.equal(restorePlayerHealth(restored.run, chapter.restHealRatio).run.playerHp, 100);
});

test("a newly generated exploration run resets cleared state, adventure HP, and chapter XP", () => {
  const fresh = generateRun(chapter, 21);
  assert.equal(fresh.status, "active");
  assert.equal(fresh.rewardsClaimed, false);
  assert.equal(fresh.playerHp, null);
  assert.equal(fresh.playerMaxHp, null);
  assert.equal(fresh.loot.experience, undefined);
  assert.equal(fresh.tiles.filter((tile) => tile.kind === "boss")[0].state, "idle");
});

test("preserved supplies allow movement and reveal the path behind them in existing saves", () => {
  for (const kind of ["treasure","rest"]) {
    const run={mode:"adventure",visionRange:3,player:{row:0,column:0},revealed:["0-0","0-1"],tiles:[
      {id:"0-0",row:0,column:0,kind:"start",state:"cleared",exits:{east:true}},
      {id:"0-1",row:0,column:1,kind,state:"idle",exits:{west:true,east:true}},
      {id:"0-2",row:0,column:2,kind:"empty",state:"idle",exits:{west:true,east:true}},
      {id:"0-3",row:0,column:3,kind:"monster",state:"idle",exits:{west:true,east:true}},
      {id:"0-4",row:0,column:4,kind:"empty",state:"idle",exits:{west:true}}
    ]};
    const moved=movePlayer(run,"0-1",{collectSupplies:false});
    assert.equal(moved.changed,true);assert.equal(moved.run.tiles[1].state,"idle");
    assert(moved.run.revealed.includes("0-2"));assert(!moved.run.revealed.includes("0-4"));
    assert.equal(movePlayer(moved.run,"0-2",{collectSupplies:false}).changed,true);
    const saved=JSON.parse(JSON.stringify(moved.run));
    const claimed=movePlayer(saved,"0-1",{collectSupplies:true});
    assert.equal(claimed.changed,true);assert.equal(claimed.message,kind);assert.equal(claimed.run.tiles[1].state,"cleared");
    assert.equal(movePlayer(claimed.run,"0-1").message,null);
    assert.equal(run.tiles[1].state,"idle");
  }
});
