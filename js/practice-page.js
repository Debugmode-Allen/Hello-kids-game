import { auth, db, onAuthStateChanged, doc, getDoc } from "./firebase.js";
import { loadUI, t } from "./i18n.js";
import { checkinDay, effectiveStamina, loadCheckins } from "./checkin-client.js?v=20261117-spark";

async function renderCheckinProgress(element, uid, dragon) {
  try {
    const history = await loadCheckins(uid);
    document.querySelector('[data-attribute="stamina"]').textContent = t("practice.attributeValue", {
      label: t("home.stamina"), value: effectiveStamina(dragon, history)
    });
    const submissions = history
      .filter((entry) => /^\d{4}-\d{2}-\d{2}$/.test(entry.date));
    const days = new Set(submissions.map((entry) => entry.date));
    const confirmedCount = submissions.filter((entry) => entry.status === "approved").length;
    const familyDay = checkinDay();
    const date = new Date(`${familyDay}T00:00:00Z`);
    const dayKey = () => date.toISOString().slice(0, 10);
    if (!days.has(dayKey())) date.setUTCDate(date.getUTCDate() - 1);
    let streak = 0;
    while (days.has(dayKey())) {
      streak++;
      date.setUTCDate(date.getUTCDate() - 1);
    }
    element.textContent = t(streak ? "practice.checkinStreak" : "practice.checkinTotal", {
      streak, days: days.size, points: confirmedCount * 5
    });
  } catch (error) {
    console.warn("Unable to load check-in progress", error);
    element.textContent = t("practice.progressUnavailable");
  }
}

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
      const xp = $("dragonXp");
      if (xp) {
        xp.textContent = t("practice.xpValue", { value: dragon.xp ?? 0 });
        xp.hidden = false;
      }
      for (const element of document.querySelectorAll("[data-attribute]")) {
        const key = element.dataset.attribute;
        element.textContent = t("practice.attributeValue", {
          label: t(`home.${key}`),
          value: dragon[key] ?? (key === "stamina" ? 100 : 10)
        });
      }
      const progress = $("checkinProgress");
      if (progress) void renderCheckinProgress(progress, user.uid, dragon);
      $("dragonImage").alt = name;
      $("dragonImage").src = species.image;
      onDragonLoaded?.(level);
      for (const id of ["dragonName", "dragonLevel", "dragonImage", "practiceOptions"]) {
        $(id).hidden = false;
      }
      $("status").textContent = "";
      const motherDragon = $("motherDragon");
      if (motherDragon) {
        motherDragon.hidden = true;
        try {
          const link = (await getDoc(doc(db, "parentLinks", user.uid))).data();
          if (link?.status === "approved" && link.parentName) {
            motherDragon.textContent = t("practice.motherDragon", { name: link.parentName });
            motherDragon.hidden = false;
          }
        } catch (error) {
          console.warn("Unable to load parent link", error);
        }
      }
    } catch (error) {
      console.error("Unable to load practice", error);
      $("status").textContent = t("home.loadError");
    }
  });
}
