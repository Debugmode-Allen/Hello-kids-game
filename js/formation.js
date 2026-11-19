// Shared by village setup and the battle engine. Keep old accounts at L4.
export const PLAYER_SLOTS = Object.freeze(["L1", "L2", "L3", "L4", "L5"]);
export const DEFAULT_BATTLE_SLOT = "L4";
export function validBattleSlot(slot) { return PLAYER_SLOTS.includes(slot); }
export function normalizeBattleSlot(slot) { return validBattleSlot(slot) ? slot : DEFAULT_BATTLE_SLOT; }
