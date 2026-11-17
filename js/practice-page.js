import { auth, db, onAuthStateChanged, doc, getDoc } from "./firebase.js";
import { loadUI, t } from "./i18n.js";

export async function mountPracticePage({ titleKey, optionsLabel, onDragonLoaded }) {
  const $ = (id) => document.getElementById(id);
  await loadUI();
  document.title = t(titleKey);
  document.querySelectorAll("[data-copy]").forEach((element) => {
    element.textContent = t(element.dataset.copy);
  });
  $("practiceOptions").setAttribute("aria-label", t(optionsLabel));
  $("status").textContent = t("home.loading");

  onAuthStateChanged(auth, async (user) => {
    if (!user) { location.replace("index.html"); return; }
    try {
      const snapshot = await getDoc(doc(db, "users", user.uid, "dragon", "current"));
      if (!snapshot.exists()) { location.replace("journey.html"); return; }
      const dragon = snapshot.data();
      const response = await fetch("assets/dragons/dragon-library.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`Dragon library: ${response.status}`);
      const library = await response.json();
      const species = library.find((entry) => entry.id === dragon.speciesId);
      if (!species) throw new Error("Missing dragon species");

      const name = dragon.customName || species.name;
      const level = dragon.level ?? 1;
      $("dragonName").textContent = name;
      $("dragonLevel").textContent = t("practice.level", { level });
      $("dragonImage").alt = name;
      $("dragonImage").src = species.image;
      onDragonLoaded?.(level);
      for (const id of ["dragonName", "dragonLevel", "dragonImage", "practiceOptions"]) {
        $(id).hidden = false;
      }
      $("status").textContent = "";
    } catch (error) {
      console.error("Unable to load practice", error);
      $("status").textContent = t("home.loadError");
    }
  });
}
