import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";
import { getFirestore, doc, getDoc, getDocs, collection, setDoc, deleteDoc, runTransaction, query, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js";
import "./audio-manager.js";

const config = { apiKey: "AIzaSyDLPgb-YFTaKl1asAU2oiZxdD2_6M_wOE0", authDomain: "kids-learning-game-655c6.firebaseapp.com", projectId: "kids-learning-game-655c6", storageBucket: "kids-learning-game-655c6.firebasestorage.app", messagingSenderId: "583705940703", appId: "1:583705940703:web:4bb77d4040f88311a40f6a" };
// Multiple cache-busted page modules can load this helper. Reuse the existing
// Firebase app so the account bar and the page always share one session.
const app = getApps().length ? getApp() : initializeApp(config);
export const auth = getAuth(app);
export const db = getFirestore(app);
export { onAuthStateChanged, signOut, signInWithEmailAndPassword, doc, getDoc, getDocs, collection, setDoc, deleteDoc, runTransaction, query, where, serverTimestamp };

if (!location.pathname.endsWith("index.html") && location.pathname !== "/") {
  import("./account-bar.js?v=20261117-parent").then(({ mountAccountBar }) => mountAccountBar());
}
