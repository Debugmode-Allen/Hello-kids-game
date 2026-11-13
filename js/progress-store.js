import { db, doc, setDoc } from "./firebase.js";

export async function saveAssessment(userId, eggId, dragon, answers, levels) {
  const score = answers.filter((answer) => answer.correct).length;
  await setDoc(doc(db, "users", userId, "dragon", "current"), {
    eggId, speciesId: dragon.id, customName: dragon.name, profession: dragon.profession,
    level: 1, xp: 0, stage: "hatchling", strength: 1, wisdom: 1, kindness: 1
  });
  await setDoc(doc(db, "users", userId, "progress", "summary"), {
    chineseLevel: levels.chinese, englishLevel: levels.english, mathLevel: levels.math,
    totalCorrect: score, totalAnswered: answers.length
  });
  await setDoc(doc(db, "users", userId, "attempts", `initial-${Date.now()}`), {
    type: "initial-assessment", eggId, score, answers, levels, createdAt: new Date().toISOString()
  });
}
