import { db, collection, getDocs, doc, getDoc, deleteDoc, setDoc } from "./firebase.js";

export async function resetDragon(userId) {
  const dragonRef = doc(db, "users", userId, "dragon", "current");
  const dragon = await getDoc(dragonRef);
  if (dragon.exists()) await deleteDoc(doc(db, "dragonAssignments", dragon.data().speciesId));
  await deleteDoc(dragonRef);
}

export async function resetLearningHistory(userId) {
  const attempts = await getDocs(collection(db, "users", userId, "attempts"));
  await Promise.all(attempts.docs.map((attempt) => deleteDoc(attempt.ref)));
  await deleteDoc(doc(db, "users", userId, "progress", "summary"));
}

export async function updateAssessmentResult(userId, result) {
  const { chineseLevel, englishLevel, mathLevel, totalCorrect, totalAnswered } = result;
  const levels = { chineseLevel, englishLevel, mathLevel };
  const valid = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max;
  if (!valid(chineseLevel, 1, 3) || !valid(englishLevel, 3, 5) || !valid(mathLevel, 3, 5)) {
    throw new RangeError("Invalid assessment levels");
  }
  if (totalCorrect !== null || totalAnswered !== null) {
    if (!valid(totalAnswered, 0, Number.MAX_SAFE_INTEGER) || !valid(totalCorrect, 0, totalAnswered)) {
      throw new RangeError("Invalid assessment totals");
    }
    Object.assign(levels, { totalCorrect, totalAnswered });
  }
  await setDoc(doc(db, "users", userId, "progress", "summary"), levels, { merge: true });
}

function wholeNumber(value, fallback, minimum) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum ? parsed : fallback;
}

export async function updateDragonAttributes(userId, attributes) {
  await setDoc(doc(db, "users", userId, "dragon", "current"), {
    stage: wholeNumber(attributes.stage, 1, 1),
    attack: wholeNumber(attributes.attack, 10, 0),
    defense: wholeNumber(attributes.defense, 10, 0),
    speed: wholeNumber(attributes.speed, 10, 0),
    stamina: wholeNumber(attributes.stamina, 100, 1)
  }, { merge: true });
}
