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
