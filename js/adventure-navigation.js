import { tileId } from "./adventure-run.js";

const directions = { north: [-1, 0], east: [0, 1], south: [1, 0], west: [0, -1] };
export const isBlockingEncounter = (tile) => tile.state !== "cleared" && ["monster", "boss"].includes(tile.kind);

// Supplies are walkable; only uncleared encounters and unknown cells block routes.
export function exploredRoute(run, targetId) {
  const start = tileId(run.player.row, run.player.column);
  const known = new Set(run.mode === "pathfinding" ? run.tiles.map((tile) => tile.id) : run.revealed);
  const tiles = new Map(run.tiles.map((tile) => [tile.id, tile]));
  if (!known.has(targetId) || !tiles.has(start)) return null;
  const queue = [start];
  const previous = new Map([[start, null]]);
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const id = queue[cursor];
    if (id === targetId) {
      const route = [];
      for (let step = id; step !== start; step = previous.get(step)) route.unshift(step);
      return route;
    }
    const tile = tiles.get(id);
    if (id !== start && isBlockingEncounter(tile) && run.mode !== "pathfinding") continue;
    for (const [direction, [row, column]] of Object.entries(directions)) {
      const nextId = tileId(tile.row + row, tile.column + column);
      if (!tile.exits[direction] || !tiles.has(nextId) || !known.has(nextId) || previous.has(nextId)) continue;
      previous.set(nextId, id);
      queue.push(nextId);
    }
  }
  return null;
}

export function supplyNeeded(tile, run, energy) {
  if (tile.state === "cleared") return false;
  if (tile.kind === "rest") return Number.isFinite(run.playerMaxHp) && run.playerHp < run.playerMaxHp;
  if (tile.kind === "treasure") return energy < 10;
  return false;
}

export { createDoubleClick as encounterClicks } from "./double-click.js";
