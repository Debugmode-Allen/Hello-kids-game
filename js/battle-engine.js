// 纯战斗规则模块：不操作 DOM、不读取 Firebase，便于未来迁移到服务端验证。

export const SLOT_PROTECTION = {
  L1: ["L4"], L2: ["L4", "L5"], L3: ["L5"], L4: [], L5: [],
  R1: ["R4"], R2: ["R4", "R5"], R3: ["R5"], R4: [], R5: []
};

export function effectiveSpeed(rawSpeed, speedConfig) {
  const speed = Math.max(1, Number(rawSpeed) || 1);
  const linearUntil = speedConfig.linearUntil;
  if (speed <= linearUntil) return speed;
  return linearUntil + (speedConfig.maximumEffectiveSpeed - linearUntil)
    * (speed - linearUntil) / (speed + speedConfig.curveOffset);
}

export function createCombatant({ id, side, slot, name, image, stats, skillId, powerRatio }) {
  const stamina = Math.max(1, Number(stats.stamina) || 1);
  return {
    id, side, slot, name, image, skillId,
    powerRatio,
    attack: Math.max(0, Number(stats.attack) || 0),
    defense: Math.max(0, Number(stats.defense) || 0),
    speed: Math.max(1, Number(stats.speed) || 1),
    maxHp: stamina,
    hp: stamina,
    nextActionAt: 0,
    alive: true
  };
}

function actionInterval(unit, config) {
  return config.timelineUnit / effectiveSpeed(unit.speed, config);
}

function tieBreak(a, b) {
  if (a.nextActionAt !== b.nextActionAt) return a.nextActionAt - b.nextActionAt;
  // 相同时间下孩子一方优先；同一方按阵位稳定排序，避免顺序看似随机。
  if (a.side !== b.side) return a.side === "player" ? -1 : 1;
  return a.slot.localeCompare(b.slot);
}

export function createBattle({ dragon, dragonImage, enemies, enemyAssets, balance, skills, skillOneId = null }) {
  const dragonUnit = createCombatant({
    id: "dragon", side: "player", slot: "L4", name: dragon.name, image: dragonImage,
    stats: dragon.stats, skillId: "claw"
  });
  const enemyUnits = enemies.map((enemy) => {
    const asset = enemyAssets.find((item) => item.id === enemy.speciesId);
    return createCombatant({
      id: enemy.id, side: "enemy", slot: enemy.slot, name: asset?.name || enemy.speciesId,
      image: asset?.path || "", stats: enemy.stats, skillId: enemy.skillId,
      powerRatio: enemy.powerRatio
    });
  });
  const state = {
    status: "playing",
    units: [dragonUnit, ...enemyUnits],
    balance,
    skills: Object.fromEntries(skills.map((skill) => [skill.id, skill])),
    skillOneId,
    skillCharges: { earned: 0, spent: 0 },
    activeUnitId: null,
    clock: 0
  };
  state.units.forEach((unit) => { unit.nextActionAt = actionInterval(unit, balance.speed); });
  return state;
}

export function remainingSkillCharges(state) {
  return state.skillCharges.earned - state.skillCharges.spent;
}

function spendSkillCharge(state, attacker, skillId) {
  if (attacker.side !== "player" || skillId === attacker.skillId) return;
  if (skillId !== state.skillOneId || remainingSkillCharges(state) <= 0) {
    throw new Error("Skill one has no charge");
  }
  state.skillCharges.spent += 1;
}

export function livingUnits(state, side) {
  return state.units.filter((unit) => unit.alive && (!side || unit.side === side));
}

export function unitById(state, id) {
  return state.units.find((unit) => unit.id === id);
}

export function isProtected(state, target) {
  return (SLOT_PROTECTION[target.slot] || []).some((guardianSlot) =>
    state.units.some((unit) => unit.alive && unit.side === target.side && unit.slot === guardianSlot)
  );
}

export function validTargets(state, attackerId, skillId) {
  const attacker = unitById(state, attackerId);
  const skill = state.skills[skillId];
  if (!attacker || !skill) return [];
  return livingUnits(state, attacker.side === "player" ? "enemy" : "player")
    .filter((target) => !skill.obeysFrontlineProtection || !isProtected(state, target));
}

export function upcomingTurns(state, count = 10) {
  const preview = livingUnits(state).map((unit) => ({ ...unit }));
  const result = [];
  while (preview.length && result.length < count) {
    preview.sort(tieBreak);
    const next = preview[0];
    result.push(next.id);
    next.nextActionAt += actionInterval(next, state.balance.speed);
  }
  return result;
}

function damageMultiplier(attacker, defender, damageConfig) {
  const cap = damageConfig.statSoftCap;
  const attackScore = attacker.attack / (attacker.attack + cap);
  const defenseScore = defender.defense / (defender.defense + cap);
  const raw = 1 + damageConfig.advantageScale * (attackScore - defenseScore);
  return Math.min(damageConfig.maximumMultiplier, Math.max(damageConfig.minimumMultiplier, raw));
}

export function calculateDamage(state, attacker, defender, skillId, random = Math.random) {
  const skill = state.skills[skillId];
  if (!skill) throw new Error(`Unknown skill: ${skillId}`);
  if (attacker.darknessTurns > 0) return 0;
  const ratio = attacker.powerRatio ?? skill.powerRatio;
  const basePower = skill.fixedPower ?? attacker.maxHp * ratio;
  const config = state.balance.damage;
  const variance = config.randomMin + (config.randomMax - config.randomMin) * random();
  return Math.max(config.minimumDamage, Math.round(basePower * damageMultiplier(attacker, defender, config) * variance));
}

function finishTurn(state, unit) {
  if (unit.darknessTurns > 0) unit.darknessTurns -= 1;
  state.clock = unit.nextActionAt;
  unit.nextActionAt += actionInterval(unit, state.balance.speed);
  state.activeUnitId = null;
}

function updateOutcome(state) {
  if (!livingUnits(state, "enemy").length) state.status = "victory";
  if (!livingUnits(state, "player").length) state.status = "defeat";
  return state.status;
}

export function beginNextTurn(state) {
  if (state.status !== "playing") return null;
  const next = livingUnits(state).sort(tieBreak)[0];
  if (!next) return null;
  state.activeUnitId = next.id;
  return next;
}

export function useDamageSkill(state, attackerId, targetId, skillId = "claw", random = Math.random) {
  const attacker = unitById(state, attackerId);
  const target = unitById(state, targetId);
  if (state.status !== "playing" || state.activeUnitId !== attackerId || !attacker?.alive || !target?.alive) {
    throw new Error("Invalid action");
  }
  if (state.skills[skillId]?.type !== "damage" || !validTargets(state, attackerId, skillId).some((candidate) => candidate.id === targetId)) {
    throw new Error("Protected target");
  }
  const missed = attacker.darknessTurns > 0;
  const damage = calculateDamage(state, attacker, target, skillId, random);
  spendSkillCharge(state, attacker, skillId);
  target.hp = Math.max(0, target.hp - damage);
  target.alive = target.hp > 0;
  finishTurn(state, attacker);
  updateOutcome(state);
  return { attacker, target, skill: state.skills[skillId], damage, missed, outcome: state.status };
}

export function useDarkMagic(state, attackerId) {
  const attacker = unitById(state, attackerId);
  const skill = state.skills["dark-magic"];
  const targets = validTargets(state, attackerId, "dark-magic");
  if (state.status !== "playing" || state.activeUnitId !== attackerId || !attacker?.alive || !targets.length) {
    throw new Error("Invalid dark magic action");
  }
  spendSkillCharge(state, attacker, "dark-magic");
  for (const target of targets) target.darknessTurns = skill.durationTurns;
  finishTurn(state, attacker);
  return { targets, skill };
}

export function skipTurn(state, unitId) {
  const unit = unitById(state, unitId);
  if (state.status !== "playing" || state.activeUnitId !== unitId || !unit?.alive) throw new Error("Invalid skip");
  finishTurn(state, unit);
  return { unit, outcome: state.status };
}

export function fleeBattle(state) {
  if (state.status === "playing") state.status = "fled";
  state.activeUnitId = null;
  return state.status;
}
