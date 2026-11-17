import { auth, db, onAuthStateChanged, doc, getDoc, getDocs, collection } from "./firebase.js?v=20261117-parent";
import { loadUI, t } from "./i18n.js";
import { checkinDay, checkinHistory, checkinStatus, submitCheckin } from "./checkin-client.js?v=20261117-spark";

const $ = (selector) => document.querySelector(selector);
function renderItems(uid, activities, existing) {
  const container = $("#items"); container.replaceChildren();
  if (!activities?.length) { const empty = document.createElement("p"); empty.textContent = t("activities.empty"); container.append(empty); return; }
  const existingByActivity = new Map(existing.map((item) => [item.activityId, item]));
  activities.forEach((activity, index) => {
    const card = document.createElement("article"); card.className = "item";
    const title = document.createElement("strong"); title.textContent = activity.title;
    const record = existingByActivity.get(activity.id); const button = document.createElement("button"); button.type = "button";
    if (record) {
      button.disabled = true;
      button.textContent = t(`activities.status.${checkinStatus(record)}`);
    } else {
      button.textContent = t("activities.submit");
      button.addEventListener("click", async () => {
        button.disabled = true;
        try {
          await submitCheckin(uid, activity, index);
          location.reload();
        } catch (error) {
          console.error("Check-in submission failed", error);
          button.disabled = false;
          $("#status").textContent = t("activities.submitError");
        }
      });
    }
    card.append(title, button); container.append(card);
  });
}

await loadUI(); document.title = t("activities.title"); $("#title").textContent = t("activities.title"); $("#back").textContent = t("activities.back");
onAuthStateChanged(auth, async (user) => {
  if (!user) { location.replace("index.html"); return; }
  try {
    const [profile, activities, checkins] = await Promise.all([
      getDoc(doc(db, "users", user.uid)),
      getDoc(doc(db, "users", user.uid, "parentActivities", "current")),
      getDocs(collection(db, "users", user.uid, "activityCheckins"))
    ]);
    if (profile.data()?.role !== "child") { location.replace("home.html"); return; }
    const link = await getDoc(doc(db, "parentLinks", user.uid))
      .catch((error) => { if (error.code !== "permission-denied") throw error; });
    const config = activities.data();
    const records = checkins.docs.map((item) => item.data());
    const date = checkinDay();
    renderItems(user.uid, link?.data()?.parentId === config?.parentId ? config?.items : [],
      records.filter((item) => item.date === date));
    $("#items").after(checkinHistory(records));
    const refreshDay = () => { if (checkinDay() !== date) location.reload(); };
    setInterval(refreshDay, 30_000);
    document.addEventListener("visibilitychange", refreshDay);
  }
  catch (error) { console.error(error); $("#status").textContent = t("activities.empty"); }
});
