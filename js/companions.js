import { validBattleSlot, normalizeBattleSlot } from "./formation.js";
export function companionsForAccount(library, user) {
  const email = (user?.email || "").toLowerCase();
  const ids = new Set((library.accountGrants || []).filter((grant) => grant.email.toLowerCase() === email).flatMap((grant) => grant.companionIds));
  return (library.companions || []).filter((entry) => ids.has(entry.id));
}
export function deployedCompanions(library, user, dragon) {
  const used = new Set([normalizeBattleSlot(dragon.battleSlot)]);
  return companionsForAccount(library, user).flatMap((entry) => {
    const slot = dragon.battleCompanions?.[entry.id];
    if (!validBattleSlot(slot) || used.has(slot)) return [];
    used.add(slot);
    return [{ ...entry, slot }];
  });
}
