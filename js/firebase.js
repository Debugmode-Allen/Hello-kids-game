import { initializeApp } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";
import { getFirestore, doc, getDoc, getDocs, collection, setDoc, deleteDoc, runTransaction } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js";

const config = { apiKey: "AIzaSyDLPgb-YFTaKl1asAU2oiZxdD2_6M_wOE0", authDomain: "kids-learning-game-655c6.firebaseapp.com", projectId: "kids-learning-game-655c6", storageBucket: "kids-learning-game-655c6.firebasestorage.app", messagingSenderId: "583705940703", appId: "1:583705940703:web:4bb77d4040f88311a40f6a" };
const app = initializeApp(config);
export const auth = getAuth(app);
export const db = getFirestore(app);
export { onAuthStateChanged, signOut, doc, getDoc, getDocs, collection, setDoc, deleteDoc, runTransaction };

if (!location.pathname.endsWith("index.html") && location.pathname !== "/") {
  import("./account-bar.js").then(({ mountAccountBar }) => mountAccountBar());
}
