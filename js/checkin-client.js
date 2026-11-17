import { db, doc, collection, getDocs, runTransaction, serverTimestamp } from "./firebase.js?v=20261117-spark";
import { t } from "./i18n.js";

const zone = "America/Los_Angeles";
const day = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" });
const time = new Intl.DateTimeFormat("zh-CN", { timeZone: zone, dateStyle: "short", timeStyle: "short" });
export const checkinDay = () => day.format(new Date());
const weekMs = 7 * 24 * 60 * 60 * 1000;
const millis = (value) => typeof value === "number" ? value : value?.toMillis?.();
export const checkinDeadline = (record) => millis(record.submittedAt) + weekMs;
export const checkinStatus = (record, now = Date.now()) =>
  record.status === "pending" && now >= checkinDeadline(record) ? "expired" : record.status;

export async function loadCheckins(uid) {
  const result = await getDocs(collection(db, "users", uid, "activityCheckins"));
  return result.docs.map((snapshot) => ({ ...snapshot.data(), id: snapshot.id }));
}

export function effectiveStamina(dragon, records) {
  const now = Date.now();
  const rewards = records.filter((record) => record.rewardVersion === 2
    && ["approved", "pending"].includes(checkinStatus(record, now)));
  return (dragon.stamina ?? 100) + rewards.length * 5;
}

export function submitCheckin(uid, activity, activityIndex) {
  const date = checkinDay();
  const ref = doc(db, "users", uid, "activityCheckins", `${date}_${activity.id}`);
  return runTransaction(db, async (tx) => {
    if ((await tx.get(ref)).exists()) return;
    tx.set(ref, { activityId: activity.id, activityIndex, title: activity.title,
      date, status: "pending", rewardVersion: 2, submittedAt: serverTimestamp() });
  });
}

export function reviewCheckin(childId, checkinId, decision) {
  const ref = doc(db, "users", childId, "activityCheckins", checkinId);
  return runTransaction(db, async (tx) => {
    const record = (await tx.get(ref)).data();
    if (!record || checkinStatus(record) !== "pending") return;
    tx.update(ref, { status: decision, resolvedAt: serverTimestamp() });
  });
}

export function checkinTime(value) {
  const millis = typeof value === "number" ? value : value?.toMillis?.();
  return Number.isFinite(millis) ? time.format(new Date(millis)) : "—";
}

export function checkinHistory(records) {
  const section = document.createElement("section");
  const heading = document.createElement("h3");
  heading.textContent = t("activities.history");
  section.append(heading);
  const list = document.createElement("ul");
  [...records].sort((a, b) => (b.submittedAt?.toMillis?.() ?? b.submittedAt ?? 0)
    - (a.submittedAt?.toMillis?.() ?? a.submittedAt ?? 0)).forEach((record) => {
    const row = document.createElement("li");
    row.textContent = t("activities.historyEntry", {
      title: record.title, time: checkinTime(record.submittedAt),
      status: t(`activities.status.${checkinStatus(record)}`)
    });
    list.append(row);
  });
  section.append(list);
  return section;
}
