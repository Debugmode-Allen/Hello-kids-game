function integer(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : fallback;
}

export function validateProgression(progression) {
  if (!Array.isArray(progression?.levels) || !progression.levels.length) throw new Error("Missing progression levels");
  const levels = progression.levels.map((entry) => ({
    level: integer(entry.level), totalXp: integer(entry.totalXp), xpToNext: entry.xpToNext == null ? null : integer(entry.xpToNext)
  }));
  for (let index = 0; index < levels.length; index += 1) {
    const entry = levels[index];
    if (entry.level !== index + 1 || (index === 0 && entry.totalXp !== 0)) throw new Error("Levels must start at 1 with 0 total XP");
    if (index === levels.length - 1) {
      if (entry.xpToNext !== null) throw new Error("The maximum level cannot require more XP");
      continue;
    }
    const next = levels[index + 1];
    if (!entry.xpToNext || next.totalXp !== entry.totalXp + entry.xpToNext) throw new Error("Progression XP thresholds are inconsistent");
  }
  return levels;
}

export function progressForXp(totalXp, progression) {
  const levels = validateProgression(progression);
  const maxLevel = Math.max(1, Math.min(levels.length, integer(progression?.maxLevel, levels.length)));
  const unlockedLevels = levels.slice(0, maxLevel);
  const capXp = unlockedLevels.at(-1).totalXp;
  const xp = Math.min(integer(totalXp), capXp);
  let current = unlockedLevels[0];
  for (const entry of unlockedLevels) {
    if (entry.totalXp > xp) break;
    current = entry;
  }
  const next = current.level < maxLevel ? unlockedLevels[current.level] : null;
  return {
    xp,
    level: current.level,
    isMaxLevel: next === null,
    xpIntoLevel: xp - current.totalXp,
    xpForNextLevel: current.xpToNext,
    totalXpForNextLevel: next?.totalXp ?? null
  };
}

export function addDragonXp(dragon, amount, progression) {
  const previous = progressForXp(dragon?.xp, progression);
  const progress = progressForXp(previous.xp + integer(amount), progression);
  return {
    ...progress,
    gainedXp: progress.xp - previous.xp,
    levelsGained: progress.level - previous.level
  };
}
