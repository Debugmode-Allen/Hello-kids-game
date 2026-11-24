import { normalizeBattleSlot } from "./formation.js";

// 纯战斗规则模块：不操作 DOM、不读取 Firebase，便于未来迁移到服务端验证。

export const SLOT_PROTECTION = {
  L1: ["L4"], L2: ["L4", "L5"], L3: ["L5"], L4: [], L5: [],
  R1: ["R4"], R2: ["R4", "R5"], R3: ["R5"], R4: [], R5: []
};

export function effectiveSpeed(rawSpeed, speedConfig) {
  const speed = Math.max(0, Number(rawSpeed) || 0);
  const linearUntil = speedConfig.linearUntil;
  if (speed <= linearUntil) return speed;
  return linearUntil + (speedConfig.maximumEffectiveSpeed - linearUntil)
    * (speed - linearUntil) / (speed + speedConfig.curveOffset);
}

export function createCombatant({ id, side, slot, name, image, stats, skillId, powerRatio, scaling = null, facing = null, targetPreference = "random" }) {
  const stamina = Math.max(1, Number(stats.stamina) || 1);
  return {
    id, side, slot, name, image, skillId, facing, targetPreference,
    powerRatio, scaling,
    attack: Math.max(0, Number(stats.attack) || 0),
    defense: Math.max(0, Number(stats.defense) || 0),
    speed: Math.max(0, Number(stats.speed) || 0),
    maxHp: stamina,
    hp: stamina,
    shieldHp: 0,
    attackBuffRatio: 0,
    attackBuffTurns: 0,
    defenseBuffRatio: 0,
    defenseBuffTurns: 0,
    shieldTurns: 0,
    healOverTimeRatio: 0,
    healOverTimeAmount: 0,
    healOverTimeTurns: 0,
    controlTurns: 0,
    nextActionAt: 0,
    alive: true
  };
}

function actionInterval(unit, config) {
  return unit.speed > 0 ? config.timelineUnit / effectiveSpeed(unit.speed, config) : Infinity;
}

function tieBreak(a, b) {
  if (a.nextActionAt !== b.nextActionAt) return a.nextActionAt - b.nextActionAt;
  // 相同时间下孩子一方优先；同一方按阵位稳定排序，避免顺序看似随机。
  if (a.side !== b.side) return a.side === "player" ? -1 : 1;
  return a.slot.localeCompare(b.slot);
}

export function createBattle({ dragon, dragonImage, enemies, enemyAssets, balance, skills, skillOneId = null, initialEnergy = 0, companions = [], enemyBehaviors = {}, startingHp = null }) {
  const dragonUnit = createCombatant({
    id: "dragon", side: "player", slot: normalizeBattleSlot(dragon.battleSlot), name: dragon.name, image: dragonImage,
    stats: dragon.stats, skillId: "claw"
  });
  const usedSlots = new Set([dragonUnit.slot]);
  if (startingHp !== null && startingHp !== undefined && Number.isFinite(Number(startingHp))) {
    dragonUnit.hp = Math.max(1, Math.min(dragonUnit.maxHp, Math.floor(Number(startingHp))));
  }
  const companionUnits = companions.flatMap((companion) => {
    if (!/^L[1-5]$/.test(companion.slot) || usedSlots.has(companion.slot)) return [];
    usedSlots.add(companion.slot);
    return [createCombatant({ id: "companion:" + companion.id, side: "player", slot: companion.slot, name: companion.name, image: companion.image, stats: companion.stats, skillId: "claw", facing: "right" })];
  });
  const enemyUnits = enemies.map((enemy) => {
    const asset = enemyAssets.find((item) => item.id === enemy.speciesId);
    return createCombatant({
      id: enemy.id, side: "enemy", slot: enemy.slot, name: asset?.name || enemy.speciesId,
      image: asset?.path || "", stats: enemy.stats, skillId: enemy.skillId,
      targetPreference: enemyBehaviors.bySpecies?.[enemy.speciesId]?.targetPreference ?? "random",
      powerRatio: enemy.powerRatio, scaling: enemy.scaling
    });
  });
  const state = {
    status: "playing",
    units: [dragonUnit, ...companionUnits, ...enemyUnits],
    balance,
    skills: Object.fromEntries(skills.map((skill) => [skill.id, skill])),
    skillOneId,
    skillCharges: { earned: Math.max(0, Math.min(10, Math.floor(Number(initialEnergy) || 0))), spent: 0 },
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
  const cost = Math.max(1, Math.floor(Number(state.skills[skillId]?.energyCost) || 1));
  if (!state.skills[skillId] || remainingSkillCharges(state) < cost) {
    throw new Error("Not enough energy for skill");
  }
  state.skillCharges.spent += cost;
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
  const targetSide = skill.target === "singleAlly" || skill.target === "allAllies" || skill.target === "self"
    ? attacker.side
    : attacker.side === "player" ? "enemy" : "player";
  return livingUnits(state, targetSide)
    .filter((target) => skill.target !== "self" || target.id === attacker.id)
    .filter((target) => !(skill.type === "heal" && target.hp >= target.maxHp))
    .filter((target) => targetSide === attacker.side || !skill.obeysFrontlineProtection || !isProtected(state, target));
}

// Preferences only rank legal, living targets; protection is always applied first.
export function selectEnemyTarget(state, attackerId, skillId, random = Math.random) {
  const attacker = unitById(state, attackerId);
  if (!attacker?.alive || attacker.side !== "enemy") return null;
  let candidates = validTargets(state, attackerId, skillId);
  if (!candidates.length) return null;
  const scores = {
    "lowest-defense": (target) => target.defense,
    "lowest-hp-ratio": (target) => target.hp / target.maxHp,
    "highest-attack": (target) => -target.attack
  };
  const score = Object.hasOwn(scores, attacker.targetPreference) ? scores[attacker.targetPreference] : null;
  if (typeof score === "function") {
    const best = Math.min(...candidates.map(score));
    candidates = candidates.filter((target) => score(target) === best);
  }
  // Missing/unknown preference and ties are uniformly random, never array-first.
  const roll = Number(random());
  const index = Math.min(candidates.length - 1, Math.max(0, Math.floor((Number.isFinite(roll) ? roll : 0) * candidates.length)));
  return candidates[index];
}

export function upcomingTurns(state, count = 10) {
  const preview = livingUnits(state).filter((unit) => Number.isFinite(unit.nextActionAt)).map((unit) => ({ ...unit }));
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
  const attack = attacker.attack * (1 + (attacker.attackBuffRatio || 0));
  const defense = defender.defense * (1 + (defender.defenseBuffRatio || 0));
  const attackScore = attack / (attack + cap);
  const defenseScore = defense / (defense + cap);
  const raw = 1 + damageConfig.advantageScale * (attackScore - defenseScore);
  return Math.min(damageConfig.maximumMultiplier, Math.max(damageConfig.minimumMultiplier, raw));
}

function scaledStatValue(unit, scaling, fallback = 0) {
  if (scaling && typeof scaling === "object") {
    return Object.entries(scaling).reduce((total, [stat, coefficient]) => total + (Number(unit[stat]) || 0) * (Number(coefficient) || 0), 0);
  }
  return fallback;
}

function scaledTurns(unit, scaling, base = 0, divisor = 1, minimum = 0, maximum = Infinity) {
  const value = base + Math.ceil(scaledStatValue(unit, scaling) / Math.max(1, Number(divisor) || 1));
  return Math.max(minimum, Math.min(maximum, value));
}

export function calculateDamage(state, attacker, defender, skillId, random = Math.random, scalingOverride = null) {
  const skill = state.skills[skillId];
  if (!skill) throw new Error(`Unknown skill: ${skillId}`);
  if (attacker.darknessTurns > 0) return 0;
  const scaling = scalingOverride ?? attacker.scaling ?? skill.scaling;
  const legacyRatio = typeof scaling === "number" ? scaling : attacker.powerRatio ?? skill.powerRatio;
  const basePower = skill.fixedPower ?? scaledStatValue(attacker, scaling, attacker.maxHp * (Number(legacyRatio) || 0));
  const config = state.balance.damage;
  const variance = config.randomMin + (config.randomMax - config.randomMin) * random();
  return Math.max(config.minimumDamage, Math.round(basePower * damageMultiplier(attacker, defender, config) * variance));
}

function tickTurnStatus(unit) {
  const effects = { healed: 0 };
  if (unit.darknessTurns > 0) unit.darknessTurns -= 1;
  if (unit.attackBuffTurns > 0 && --unit.attackBuffTurns === 0) unit.attackBuffRatio = 0;
  if (unit.defenseBuffTurns > 0 && --unit.defenseBuffTurns === 0) unit.defenseBuffRatio = 0;
  if (unit.shieldTurns > 0 && --unit.shieldTurns === 0) unit.shieldHp = 0;
  if (unit.healOverTimeTurns > 0) {
    effects.healed = Math.min(unit.maxHp - unit.hp, Math.max(1, unit.healOverTimeAmount || Math.round(unit.maxHp * unit.healOverTimeRatio)));
    unit.hp += effects.healed;
    if (--unit.healOverTimeTurns === 0) { unit.healOverTimeRatio = 0; unit.healOverTimeAmount = 0; }
  }
  return effects;
}

function finishTurn(state, unit) {
  const effects = tickTurnStatus(unit);
  state.clock = unit.nextActionAt;
  unit.nextActionAt += actionInterval(unit, state.balance.speed);
  state.activeUnitId = null;
  return effects;
}

function updateOutcome(state) {
  if (!livingUnits(state, "enemy").length) state.status = "victory";
  if (!livingUnits(state, "player").length) state.status = "defeat";
  return state.status;
}

export function beginNextTurn(state) {
  if (state.status !== "playing") return null;
  const next = livingUnits(state).filter((unit) => Number.isFinite(unit.nextActionAt)).sort(tieBreak)[0];
  if (!next) return null;
  state.activeUnitId = next.id;
  return next;
}

function applyIncomingDamage(target, damage) {
  const absorbed = Math.min(target.shieldHp || 0, damage);
  target.shieldHp = Math.max(0, (target.shieldHp || 0) - absorbed);
  const hpDamage = Math.min(target.hp, Math.max(0, damage - absorbed));
  target.hp = Math.max(0, target.hp - hpDamage);
  target.alive = target.hp > 0;
  return { hpDamage, absorbed };
}

function applySkillTargets(state, attacker, skill, targetId) {
  if (skill.target === "singleEnemy" || skill.target === "singleAlly") {
    const target = unitById(state, targetId);
    return target && validTargets(state, attacker.id, skill.id).some((entry) => entry.id === target.id) ? [target] : [];
  }
  return validTargets(state, attacker.id, skill.id);
}

function updateBuff(unit, field, turnsField, value, turns) {
  unit[field] = Math.max(unit[field] || 0, value);
  unit[turnsField] = Math.max(unit[turnsField] || 0, turns);
}

export function useSkill(state, attackerId, targetId = null, skillId = null, random = Math.random) {
  const attacker = unitById(state, attackerId);
  const selectedSkillId = skillId || attacker?.skillId;
  const skill = state.skills[selectedSkillId];
  if (state.status !== "playing" || state.activeUnitId !== attackerId || !attacker?.alive || !skill) {
    throw new Error("Invalid action");
  }
  const targets = applySkillTargets(state, attacker, skill, targetId);
  if (!targets.length) throw new Error("Invalid target");
  const missed = attacker.darknessTurns > 0;
  spendSkillCharge(state, attacker, selectedSkillId);

  if (skill.type === "damage") {
    const hitTargets = [targets[0]];
    if (skill.target !== "singleEnemy") hitTargets.splice(0, hitTargets.length, ...targets);
    if (skill.chainCount > 0) {
      const others = validTargets(state, attacker.id, selectedSkillId)
        .filter((target) => target.id !== targets[0].id)
        .sort((a, b) => a.slot.localeCompare(b.slot));
      hitTargets.push(...others.slice(0, skill.chainCount));
    }
    const hits = hitTargets.map((target, index) => {
      const scaling = index === 0 ? null : skill.chainScaling?.[index - 1] ?? skill.chainPowerRatios?.[index - 1] ?? skill.scaling;
      const damage = missed ? 0 : calculateDamage(state, attacker, target, selectedSkillId, random, scaling);
      const applied = applyIncomingDamage(target, damage);
      return { target, damage, hpDamage: applied.hpDamage, shieldDamage: applied.absorbed };
    });
    const turnEffects = finishTurn(state, attacker);
    const delayedTurns = !missed && targets[0].alive
      ? scaledTurns(attacker, skill.delayScaling, skill.delayBase ?? skill.delayTurns ?? 0, skill.delayDivisor ?? 1, 0, skill.delayMax ?? Infinity) : 0;
    if (delayedTurns) targets[0].nextActionAt += delayedTurns * actionInterval(targets[0], state.balance.speed);
    const outcome = updateOutcome(state);
    return {
      attacker, target: targets[0], skill, targets: hitTargets, hits,
      damage: hits[0]?.hpDamage || 0,
      shieldDamage: hits[0]?.shieldDamage || 0,
      missed, delayedTurns, turnEffects, outcome
    };
  }

  const turnEffects = finishTurn(state, attacker);
  const applied = [];
  for (const target of targets) {
    if (skill.type === "heal") {
      const amount = Math.max(1, Math.round(scaledStatValue(attacker, skill.healScaling, target.maxHp * skill.healRatio)));
      const healed = Math.min(target.maxHp - target.hp, amount);
      target.hp += healed;
      applied.push({ target, healed });
    } else if (skill.type === "buff") {
      const ratio = Math.min(skill.attackBuffMax ?? Infinity, (skill.attackBuffBase ?? skill.attackBuffRatio ?? 0) + scaledStatValue(attacker, skill.attackBuffScaling));
      updateBuff(target, "attackBuffRatio", "attackBuffTurns", ratio, skill.durationTurns);
      applied.push({ target, buff: "attack", turns: skill.durationTurns });
    } else if (skill.type === "status" && skill.statusEffect === "blind") {
      const turns = scaledTurns(attacker, skill.durationScaling, skill.durationBase ?? 0, skill.durationDivisor ?? 1, 1, skill.durationMax ?? Infinity);
      target.darknessTurns = Math.max(target.darknessTurns || 0, turns);
      applied.push({ target, status: "blind", turns });
    } else if (skill.type === "control") {
      const turns = scaledTurns(attacker, skill.controlScaling, skill.controlBase ?? 0, skill.controlDivisor ?? 1, 1, skill.controlMax ?? Infinity);
      target.controlTurns = Math.max(target.controlTurns || 0, turns);
      applied.push({ target, status: "control", turns });
    } else if (skill.type === "healOverTime") {
      const amount = Math.max(1, Math.round(scaledStatValue(attacker, skill.healOverTimeScaling, target.maxHp * skill.healRatio)));
      target.healOverTimeAmount = Math.max(target.healOverTimeAmount || 0, amount);
      target.healOverTimeTurns = Math.max(target.healOverTimeTurns || 0, skill.durationTurns);
      applied.push({ target, status: "regeneration", turns: skill.durationTurns });
    } else if (skill.type === "guard") {
      target.shieldHp = Math.max(target.shieldHp || 0, Math.round(scaledStatValue(attacker, skill.shieldScaling, target.maxHp * skill.shieldRatio)));
      target.shieldTurns = Math.max(target.shieldTurns || 0, skill.durationTurns);
      const ratio = Math.min(skill.defenseBuffMax ?? Infinity, (skill.defenseBuffBase ?? skill.defenseBuffRatio ?? 0) + scaledStatValue(attacker, skill.defenseBuffScaling));
      updateBuff(target, "defenseBuffRatio", "defenseBuffTurns", ratio, skill.durationTurns);
      applied.push({ target, status: "guard", shieldHp: target.shieldHp, turns: skill.durationTurns });
    } else {
      throw new Error(`Unsupported skill type: ${skill.type}`);
    }
  }
  return { attacker, target: targets[0], targets, skill, applied, turnEffects, outcome: updateOutcome(state) };
}

export function useDamageSkill(state, attackerId, targetId, skillId = "claw", random = Math.random) {
  return useSkill(state, attackerId, targetId, skillId, random);
}

export function useDarkMagic(state, attackerId) {
  const skill = state.skills["dark-magic"];
  if (!skill) throw new Error("Unknown skill: dark-magic");
  const result = useSkill(state, attackerId, null, "dark-magic");
  return { targets: result.targets, skill: result.skill };
}

export function consumeControlledTurn(state, unitId) {
  const unit = unitById(state, unitId);
  if (state.status !== "playing" || state.activeUnitId !== unitId || !unit?.alive || unit.controlTurns <= 0) {
    throw new Error("Unit is not controlled");
  }
  unit.controlTurns -= 1;
  const turnEffects = finishTurn(state, unit);
  return { unit, turnEffects, outcome: updateOutcome(state) };
}

export function skipTurn(state, unitId) {
  const unit = unitById(state, unitId);
  if (state.status !== "playing" || state.activeUnitId !== unitId || !unit?.alive) throw new Error("Invalid skip");
  const turnEffects = finishTurn(state, unit);
  return { unit, turnEffects, outcome: state.status };
}

export function fleeBattle(state) {
  if (state.status === "playing") state.status = "fled";
  state.activeUnitId = null;
  return state.status;
}
