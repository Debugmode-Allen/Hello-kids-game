import { db, collection, getDocs, doc, getDoc, deleteDoc } from "./firebase.js";

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
