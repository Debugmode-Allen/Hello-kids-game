import test from "node:test";
import assert from "node:assert/strict";
import { exploredRoute, supplyNeeded, encounterClicks } from "../js/adventure-navigation.js";
function corridor(kinds = ["start", "empty", "empty", "treasure"]) {
  const tiles = kinds.map((kind, column) => ({ id: `0-${column}`, row: 0, column, kind, state: kind === "start" ? "cleared" : "idle", exits: { west: column > 0, east: column < kinds.length - 1 } }));
  return { tiles, revealed: tiles.map(t => t.id), player: { row: 0, column: 0 }, playerHp: 40, playerMaxHp: 100 };
}
test("remote explored reward follows the connected route without teleporting", () => {
  assert.deepEqual(exploredRoute(corridor(), "0-3"), ["0-1", "0-2", "0-3"]);
});
test("fog and walls block navigation, including fog landmarks", () => {
  const run = corridor(); run.revealed = ["0-0", "0-1", "0-3"];
  assert.equal(exploredRoute(run, "0-3"), null);
  assert.equal(exploredRoute(run, "0-2"), null);
  run.revealed.push("0-2"); run.tiles[1].exits.east = false;
  assert.equal(exploredRoute(run, "0-3"), null);
});
test("uncleared monsters and bosses cannot be intermediate steps", () => {
  for (const kind of ["monster", "boss"]) {
    const run = corridor(["start", kind, "empty", "treasure"]);
    assert.equal(exploredRoute(run, "0-3"), null);
    assert.deepEqual(exploredRoute(run, "0-1"), ["0-1"]);
    run.tiles[1].state = "cleared";
    assert.deepEqual(exploredRoute(run, "0-3"), ["0-1", "0-2", "0-3"]);
  }
});
test("full health or energy preserves supplies; zero HP can still be healed", () => {
  const run = corridor(); const rest = { kind: "rest", state: "idle" }; const chest = run.tiles[3];
  assert.equal(supplyNeeded(rest, run, 10), true);
  run.playerHp = 100; assert.equal(supplyNeeded(rest, run, 0), false);
  run.playerHp = 0; assert.equal(supplyNeeded(rest, run, 10), true);
  assert.equal(supplyNeeded(chest, run, 10), false);
  assert.equal(supplyNeeded(chest, run, 9), true);
});
function taps() {
  let next = 0; const pending = new Map(); const events = [];
  const input = encounterClicks(id => events.push(["confirm", id]), id => events.push(["battle", id]), fn => { pending.set(++next, fn); return next; }, id => pending.delete(id));
  return { input, events, flush() { const callbacks = [...pending.values()]; pending.clear(); callbacks.forEach(fn => fn()); } };
}
test("single tap confirms and double tap starts only one battle with no late dialog", () => {
  const first = taps(); first.input.click("monster"); assert.deepEqual(first.events, []); first.flush(); assert.deepEqual(first.events, [["confirm", "monster"]]);
  const second = taps(); second.input.click("monster"); second.input.click("monster"); second.flush(); assert.deepEqual(second.events, [["battle", "monster"]]);
});
test("Boss double taps still confirm; another target or stopping cancels stale taps", () => {
  const boss = taps(); boss.input.click("boss", true); boss.input.click("boss", true); boss.flush(); assert.deepEqual(boss.events, [["confirm", "boss"]]);
  const other = taps(); other.input.click("a"); other.input.click("b"); other.flush(); assert.deepEqual(other.events, [["confirm", "b"]]);
  const stopped = taps(); stopped.input.click("a"); stopped.input.clear(); stopped.flush(); assert.deepEqual(stopped.events, []);
});

test("unclaimed supplies are safe intermediate steps, even at full HP and energy", () => {
  for (const kind of ["rest", "treasure"]) {
    const run=corridor(["start",kind,"empty","empty"]); run.playerHp=run.playerMaxHp;
    assert.equal(supplyNeeded(run.tiles[1],run,10),false);
    assert.deepEqual(exploredRoute(run,"0-3"),["0-1","0-2","0-3"]);
  }
});
