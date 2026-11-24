export const tileId = (row, column) => `${row}-${column}`;

const directions = [
  { key: "north", row: -1, column: 0, opposite: "south" },
  { key: "east", row: 0, column: 1, opposite: "west" },
  { key: "south", row: 1, column: 0, opposite: "north" },
  { key: "west", row: 0, column: -1, opposite: "east" }
];

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function shuffled(items, random) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const next = Math.floor(random() * (index + 1));
    [copy[index], copy[next]] = [copy[next], copy[index]];
  }
  return copy;
}

function neighbors(tile, rows, columns) {
  return directions.map((direction) => ({ ...direction, row: tile.row + direction.row, column: tile.column + direction.column }))
    .filter((entry) => entry.row >= 0 && entry.row < rows && entry.column >= 0 && entry.column < columns);
}

export function generateRun(chapter, seed = Math.floor(Math.random() * 2 ** 31)) {
  const random = seededRandom(seed);
  const tiles = Array.from({ length: chapter.rows * chapter.columns }, (_, index) => {
    const row = Math.floor(index / chapter.columns);
    const column = index % chapter.columns;
    return { id: tileId(row, column), row, column, exits: {}, kind: "empty", state: "idle" };
  });
  const byId = Object.fromEntries(tiles.map((tile) => [tile.id, tile]));
  const start = byId[tileId(chapter.rows - 1, Math.floor(chapter.columns / 2))];
  const visited = new Set([start.id]);
  const stack = [start];
  while (stack.length) {
    const current = stack.at(-1);
    const options = shuffled(neighbors(current, chapter.rows, chapter.columns), random)
      .filter((entry) => !visited.has(tileId(entry.row, entry.column)));
    if (!options.length) { stack.pop(); continue; }
    const next = options[0];
    const nextTile = byId[tileId(next.row, next.column)];
    current.exits[next.key] = true;
    nextTile.exits[next.opposite] = true;
    visited.add(nextTile.id);
    stack.push(nextTile);
  }
  const distance = { [start.id]: 0 };
  const queue = [start];
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    for (const direction of directions) {
      if (!current.exits[direction.key]) continue;
      const next = byId[tileId(current.row + direction.row, current.column + direction.column)];
      if (distance[next.id] !== undefined) continue;
      distance[next.id] = distance[current.id] + 1;
      queue.push(next);
    }
  }
  const boss = tiles.filter((tile) => tile.row === 0).sort((a, b) => distance[b.id] - distance[a.id])[0];
  const route = [];
  let routeCursor = boss;
  while (routeCursor.id !== start.id) {
    route.push(routeCursor);
    routeCursor = neighbors(routeCursor, chapter.rows, chapter.columns)
      .filter((entry) => routeCursor.exits[entry.key])
      .map((entry) => byId[tileId(entry.row, entry.column)])
      .find((entry) => distance[entry.id] === distance[routeCursor.id] - 1);
  }
  route.push(start);
  route.reverse();
  start.kind = "start";
  start.state = "cleared";
  boss.kind = "boss";
  const groupCount = Math.max(0, Math.min(Number(chapter.monsterGroupCount) || 0, route.length - 2));
  const groupOptions = Array.isArray(chapter.encounterGroups) ? chapter.encounterGroups : [];
  if (groupCount && !groupOptions.length) throw new Error("Adventure chapter is missing encounter groups");
  shuffled(route.slice(1, -1), random).slice(0, groupCount).forEach((tile, index) => {
    const group = groupOptions[Math.floor(random() * groupOptions.length)];
    tile.kind = "monster";
    tile.battleId = group.battleId;
    tile.experience = Math.max(0, Math.floor(Number(group.experience) || 0));
  });
  const available = shuffled(tiles.filter((tile) => tile.kind === "empty" && distance[tile.id] > 2), random);
  if (available[0]) available[0].kind = "treasure";
  if (available[1]) available[1].kind = "rest";
  const revealed = chapter.revealAll ? tiles.map((tile) => tile.id) : visibleWithinSight(start, tiles, chapter.visionRange);
  return {
    version: 3,
    chapterId: chapter.id,
    mode: chapter.mode || "adventure",
    seed,
    status: "active",
    visionRange: Math.max(0, Math.floor(Number(chapter.visionRange) || 3)),
    player: { row: start.row, column: start.column },
    playerHp: null,
    playerMaxHp: null,
    tiles,
    revealed,
    loot: { gold: 0, skillPoints: 0, items: {} },
    rewardsClaimed: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

function blocksSight(tile) {
  return ["monster", "boss", "treasure", "rest"].includes(tile.kind) && tile.state !== "cleared";
}

export function visibleWithinSight(origin, tiles, range = 3) {
  const byId = Object.fromEntries(tiles.map((tile) => [tile.id, tile]));
  const maxDistance = Math.max(0, Math.floor(Number(range) || 0));
  const revealed = new Set([origin.id]);
  const queue = [{ tile: origin, distance: 0 }];
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const { tile, distance } = queue[cursor];
    if (distance >= maxDistance || blocksSight(tile)) continue;
    for (const direction of directions) {
      if (!tile.exits[direction.key]) continue;
      const next = byId[tileId(tile.row + direction.row, tile.column + direction.column)];
      if (!next || revealed.has(next.id)) continue;
      revealed.add(next.id);
      queue.push({ tile: next, distance: distance + 1 });
    }
  }
  return [...revealed];
}

export function refreshVision(run) {
  const next = clone(run);
  if (next.mode === "pathfinding") return next;
  const player = next.tiles.find((tile) => tile.id === tileId(next.player.row, next.player.column));
  if (!player) return next;
  const visible = visibleWithinSight(player, next.tiles, next.visionRange || 3);
  next.revealed = [...new Set([...(next.revealed || []), ...visible])];
  return next;
}

function clone(value) { return JSON.parse(JSON.stringify(value)); }

export function movePlayer(run, targetId) {
  const next = clone(run);
  const byId = Object.fromEntries(next.tiles.map((tile) => [tile.id, tile]));
  const current = byId[tileId(next.player.row, next.player.column)];
  const target = byId[targetId];
  if (!current || !target) return { run, changed: false, reason: "missing" };
  const direction = directions.find((entry) => current.row + entry.row === target.row && current.column + entry.column === target.column);
  const isEncounter = target.kind === "monster" || target.kind === "boss";
  if (!direction || !current.exits[direction.key] || (run.mode !== "pathfinding" && isEncounter && target.state !== "cleared")) {
    return { run, changed: false, reason: "blocked" };
  }
  next.player = { row: target.row, column: target.column };
  let message = null;
  if (run.mode === "pathfinding" && isEncounter && target.state !== "cleared") {
    target.state = "cleared";
    message = target.kind === "boss" ? "boss" : "monster";
  }
  if (target.kind === "treasure" && target.state !== "cleared") {
    target.state = "cleared";
    message = "treasure";
  }
  if (target.kind === "rest" && target.state !== "cleared") {
    target.state = "cleared";
    message = "rest";
  }
  const refreshed = refreshVision(next);
  next.revealed = refreshed.revealed;
  next.updatedAt = Date.now();
  return { run: next, changed: true, message };
}

export function completeEncounter(run, encounterId, chapter) {
  const next = clone(run);
  const tile = next.tiles.find((entry) => entry.id === encounterId);
  if (!tile || !["monster", "boss"].includes(tile.kind) || tile.state === "cleared") return { run, changed: false };
  tile.state = "cleared";
  next.player = { row: tile.row, column: tile.column };
  const experienceGained = tile.kind === "boss" ? Number(chapter.bossExperience) || 0 : Number(tile.experience) || 0;
  if (tile.kind === "boss") {
    next.status = "cleared";
    if (chapter.rewards?.itemId) next.loot.items[chapter.rewards.itemId] = (next.loot.items[chapter.rewards.itemId] || 0) + Number(chapter.rewards.itemCount || 0);
  }
  next.loot.experience = (Number(next.loot.experience) || 0) + experienceGained;
  const refreshed = refreshVision(next);
  next.revealed = refreshed.revealed;
  next.updatedAt = Date.now();
  return { run: next, changed: true, bossCleared: tile.kind === "boss", experienceGained };
}

export function updatePlayerHealth(run, hp, maxHp) {
  const next = clone(run);
  const rawMax = Math.floor(Number(maxHp));
  if (!Number.isFinite(rawMax) || rawMax <= 0) return run;
  const safeMax = rawMax;
  next.playerMaxHp = safeMax;
  next.playerHp = Math.max(0, Math.min(safeMax, Math.floor(Number(hp) || 0)));
  next.updatedAt = Date.now();
  return next;
}

export function restorePlayerHealth(run, ratio) {
  if (!Number.isFinite(Number(run.playerMaxHp)) || run.playerMaxHp <= 0) return { run, healed: 0 };
  const next = clone(run);
  const before = Math.max(0, Math.min(next.playerMaxHp, Number(next.playerHp) || 0));
  const healed = Math.max(0, Math.min(next.playerMaxHp - before, Math.ceil(next.playerMaxHp * Math.max(0, Number(ratio) || 0))));
  next.playerHp = before + healed;
  next.updatedAt = Date.now();
  return { run: next, healed };
}

export function encounterAtPlayer(run) {
  return run.tiles.find((tile) => tile.row === run.player.row && tile.column === run.player.column) ?? null;
}
