import { db, doc, collection, getDocs, runTransaction } from "./firebase.js";
import { eggPools } from "./hatching.js";

const levelFields = (levels) => ({
  chineseLevel: levels.chinese, englishLevel: levels.english, mathLevel: levels.math
});

export async function saveLevelAssessment(userId, { answers, levels }) {
  const attemptRef = doc(collection(db, "users", userId, "attempts"));
  const dragonRef = doc(db, "users", userId, "dragon", "current");
  const progressRef = doc(db, "users", userId, "progress", "summary");
  const score = answers.filter((answer) => answer.correct).length;

  await runTransaction(db, async (transaction) => {
    if (!(await transaction.get(dragonRef)).exists()) throw new Error("Missing dragon");
    transaction.set(progressRef, levelFields(levels), { merge: true });
    transaction.set(attemptRef, { type: "level-assessment", score, answers, levels, createdAt: new Date().toISOString() });
  });
}

export async function reserveDragonAndSaveAssessment(userId, eggId, dragons, answers, levels) {
  const candidates = dragons.filter((dragon) => (eggPools[eggId] ?? []).includes(dragon.id));
  const attemptRef = doc(collection(db, "users", userId, "attempts"));
  const history = await getDocs(collection(db, "users", userId, "attempts"));
  const practiceBonuses = { attack: 0, defense: 0, speed: 0 };
  for (const snapshot of history.docs) {
    const entry = snapshot.data();
    if (entry.type !== "subject-practice" || entry.rewardGranted !== true) continue;
    if (entry.subject === "math") practiceBonuses.attack++;
    if (entry.subject === "english") practiceBonuses.defense++;
    if (entry.subject === "chinese") practiceBonuses.speed++;
  }
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
    transaction.set(doc(db, "users", userId, "dragon", "current"), {
      eggId,
      speciesId: dragon.id,
      customName: dragon.name,
      profession: dragon.profession,
      level: 1,
      xp: 0,
      stage: 1,
      attack: 10 + practiceBonuses.attack,
      defense: 10 + practiceBonuses.defense,
      speed: 10 + practiceBonuses.speed,
      stamina: 100
    });
    transaction.set(doc(db, "users", userId, "progress", "summary"), { ...levelFields(levels), totalCorrect: score, totalAnswered: answers.length });
    transaction.set(attemptRef, { type: "initial-assessment", eggId, score, answers, levels, createdAt: new Date().toISOString() });
    return dragon;
  });
}
