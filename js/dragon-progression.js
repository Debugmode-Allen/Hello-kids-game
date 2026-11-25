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
  const previous = progressForDragon(dragon, progression);
  const progress = progressForXp(previous.xp + integer(amount), progression);
  return {
    ...progress,
    gainedXp: progress.xp - previous.xp,
    levelsGained: progress.level - previous.level
  };
}

// 未标记的存档使用原曲线；保留原本级经验，按新曲线换算累计值。
export function progressForDragon(dragon, progression) {
  if (dragon?.xpCurveVersion === 2) return progressForXp(dragon.xp, progression);
  const levels = validateProgression(progression);
  const level = Math.max(1, Math.min(Number(dragon?.level) || 1, progression.maxLevel || levels.length));
  const oldThresholds = [0, 30, 70, 122, 190, 276, 384, 516, 676, 866, 1090, 1350, 1650, 1992, 2380, 2816, 3304, 3846, 4446, 5106, 5830, 6620, 7480, 8412, 9420, 10506, 11674, 12926, 14266, 15696];
  const oldThreshold = oldThresholds[level - 1];
  const oldProgress = Math.max(0, integer(dragon?.xp) - oldThreshold);
  return progressForXp(levels[level - 1].totalXp + oldProgress, progression);
}
