import { validTargets, unitById } from "./battle-engine.js";

export function canQuickClaw(state, targetId, busy = false) {
  if (busy || state?.status !== "playing") return false;
  const actor = unitById(state, state.activeUnitId);
  const target = unitById(state, targetId);
  return Boolean(actor?.side === "player" && actor.alive && target?.side === "enemy" && target.alive
    && validTargets(state, actor.id, "claw").some((entry) => entry.id === targetId));
}
