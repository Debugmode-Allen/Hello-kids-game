import { db, doc, collection, runTransaction } from "./firebase.js";
import { eggPools } from "./hatching.js";

export async function reserveDragonAndSaveAssessment(userId, eggId, dragons, answers, levels) {
  const candidates = dragons.filter((dragon) => (eggPools[eggId] ?? []).includes(dragon.id));
  const attemptRef = doc(collection(db, "users", userId, "attempts"));
  return runTransaction(db, async (transaction) => {
    const available = [];
    for (const dragon of candidates) {
      const assignmentRef = doc(db, "dragonAssignments", dragon.id);
      if (!(await transaction.get(assignmentRef)).exists()) available.push(dragon);
    }
    if (!available.length) throw new Error("no-available-dragon");
    const dragon = available[Math.floor(Math.random() * available.length)];
    const score = answers.filter((answer) => answer.correct).length;
    transaction.set(doc(db, "dragonAssignments", dragon.id), { ownerId: userId, assignedAt: new Date().toISOString() });
    transaction.set(doc(db, "users", userId, "dragon", "current"), { eggId, speciesId: dragon.id, customName: dragon.name, profession: dragon.profession, level: 1, xp: 0, stage: "hatchling", strength: 1, wisdom: 1, kindness: 1 });
    transaction.set(doc(db, "users", userId, "progress", "summary"), { chineseLevel: levels.chinese, englishLevel: levels.english, mathLevel: levels.math, totalCorrect: score, totalAnswered: answers.length });
    transaction.set(attemptRef, { type: "initial-assessment", eggId, score, answers, levels, createdAt: new Date().toISOString() });
    return dragon;
  });
}
