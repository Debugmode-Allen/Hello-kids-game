import { auth, db, onAuthStateChanged, doc, getDoc, collection, getDocs } from "./firebase.js";
import { loadUI, t } from "./i18n.js";
import { checkinDay, staminaBreakdown, loadCheckins } from "./checkin-client.js?v=20261118-stamina-breakdown";

async function renderCheckinProgress(element, uid, dragon) {
  try {
    const history = await loadCheckins(uid);
    const { base: staminaBase, bonus: staminaBonus } = staminaBreakdown(dragon, history);
    document.querySelector('[data-attribute="stamina"]').textContent = t("practice.attributeBreakdown", {
      label: t("home.stamina"), base: staminaBase, bonus: staminaBonus
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

async function renderSubjectProgress(uid, dragon) {
  const subjects = ["math", "english", "chinese"];
  const attributeFor = { math: "attack", english: "defense", chinese: "speed" };
  try {
    const snapshot = await getDocs(collection(db, "users", uid, "attempts"));
    const entries = snapshot.docs.map((item) => item.data())
      .filter((entry) => entry.type === "subject-practice");
    const today = checkinDay();
    for (const subject of subjects) {
      const subjectEntries = entries.filter((entry) => entry.subject === subject);
      const days = new Set(subjectEntries.map((entry) => entry.day)
        .filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day)));
      const earned = subjectEntries.filter((entry) => entry.rewardGranted === true).length;
      const attribute = attributeFor[subject];
      const total = Number(dragon[attribute] ?? 10);
      const base = total - earned;
      const attributeLine = document.querySelector(`[data-attribute="${attribute}"]`);
      if (attributeLine) {
        attributeLine.textContent = t("practice.attributeBreakdown", {
          label: t(`home.${attribute}`), base, bonus: earned
        });
      }
      const date = new Date(`${today}T00:00:00Z`);
      const dateKey = () => date.toISOString().slice(0, 10);
      if (!days.has(dateKey())) date.setUTCDate(date.getUTCDate() - 1);
      let streak = 0;
      while (days.has(dateKey())) {
        streak++;
        date.setUTCDate(date.getUTCDate() - 1);
      }
      const progress = document.querySelector(`[data-practice-progress="${subject}"]`);
      if (!progress) continue;
      progress.textContent = t(streak ? "practice.subjectStreak" : "practice.subjectTotal", {
        streak, days: days.size
      });
    }
  } catch (error) {
    console.warn("Unable to load subject practice progress", error);
    for (const progress of document.querySelectorAll("[data-practice-progress]")) {
      progress.textContent = t("practice.subjectProgressUnavailable");
    }
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
      const progressTasks = [renderSubjectProgress(user.uid, dragon)];
      if (progress) progressTasks.push(renderCheckinProgress(progress, user.uid, dragon));
      $("dragonImage").alt = name;
      $("dragonImage").src = species.image;
      onDragonLoaded?.(level);
      await Promise.all(progressTasks);
      for (const id of ["dragonName", "dragonLevel", "dragonImage", "practiceOptions"]) {
        $(id).hidden = false;
      }
      $("status").textContent = "";
      const motherDragon = $("motherDragon");
      const motherDragonPanel = $("motherDragonPanel");
      if (motherDragon && motherDragonPanel) {
        motherDragonPanel.hidden = true;
        try {
          const linkSnapshot = await getDoc(doc(db, "parentLinks", user.uid));
          const link = linkSnapshot.data();
          if (link?.status === "approved" && link.parentId) {
            motherDragon.textContent = t("practice.motherDragon", { name: link.parentName });
            motherDragonPanel.hidden = false;
            const choiceSnapshot = await getDoc(doc(db, "parentDragonChoices", link.parentId));
            const choice = choiceSnapshot.data();
            if (choice?.dragonId) {
              const [registryResponse, storyResponse] = await Promise.all([
                fetch("data/parent-dragons.json", { cache: "no-store" }),
                fetch("content/story.zh-CN.json", { cache: "no-store" })
              ]);
              if (!registryResponse.ok || !storyResponse.ok) throw new Error("Unable to load parent dragon profile");
              const registry = await registryResponse.json();
              const story = await storyResponse.json();
              const profile = registry.find((item) => item.id === choice.dragonId);
              if (profile) {
                const key = `parentDragon.${profile.storyKey}`;
                const image = $("parentDragonImage");
                image.src = profile.image;
                image.alt = t("practice.parentDragonAlt", { name: story[`${key}.name`] || "" });
                image.hidden = false;
                const title = $("parentDragonTitle");
                title.textContent = t("practice.parentDragonTitle", { name: story[`${key}.name`] || "", title: story[`${key}.title`] || "" });
                title.hidden = false;
                const lore = $("parentDragonLore");
                lore.textContent = story[`${key}.background`] || story[`${key}.intro`] || "";
                lore.hidden = false;
              }
            }
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
