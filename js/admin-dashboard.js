import { db, collection, getDocs, doc, deleteDoc } from "./firebase.js";

export async function resetDragon(userId) {
  await deleteDoc(doc(db, "users", userId, "dragon", "current"));
}

export async function resetLearningHistory(userId) {
  const attempts = await getDocs(collection(db, "users", userId, "attempts"));
  await Promise.all(attempts.docs.map((attempt) => deleteDoc(attempt.ref)));
  await deleteDoc(doc(db, "users", userId, "progress", "summary"));
}
