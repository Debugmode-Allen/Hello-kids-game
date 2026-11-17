import { auth, db, onAuthStateChanged, doc, getDoc, getDocs, collection, setDoc, runTransaction, query, where } from "./firebase.js?v=20261117-parent";
import { loadUI, t } from "./i18n.js";
import { checkinDeadline, checkinHistory, checkinStatus, checkinTime, reviewCheckin } from "./checkin-client.js?v=20261117-spark";

const $ = (selector) => document.querySelector(selector);
let parent = null;
let children = [];
let requestByChild = new Map();

const defaultActivities = () => ["parent.defaultActivity1", "parent.defaultActivity2", "parent.defaultActivity3"].map((key, index) => ({ id: `default-${index + 1}`, title: t(key) }));

function activityRow(item = { id: `activity-${Date.now()}-${Math.random().toString(16).slice(2)}`, title: "" }) {
  const row = document.createElement("div"); row.className = "activity-row";
  const input = document.createElement("input"); input.name = "activity"; input.value = item.title; input.dataset.id = item.id; input.placeholder = t("parent.activityPlaceholder"); input.required = true;
  row.append(input); return row;
}

function activityForm(child, activities) {
  const form = document.createElement("form");
  const title = document.createElement("h3"); title.textContent = t("parent.activityTitle");
  const help = document.createElement("p"); help.className = "help"; help.textContent = t("parent.activityHelp");
  const list = document.createElement("div"); list.className = "activity-list";
  (activities?.length ? activities : defaultActivities()).forEach((item) => list.append(activityRow(item)));
  const add = document.createElement("button"); add.type = "button"; add.textContent = t("parent.addActivity"); add.addEventListener("click", () => list.append(activityRow()));
  const save = document.createElement("button"); save.type = "submit"; save.textContent = t("parent.saveActivities");
  const notice = document.createElement("p"); notice.className = "form-notice";
  form.append(title, help, list, add, save, notice);
  form.addEventListener("submit", async (event) => {
    event.preventDefault(); save.disabled = true;
    const items = [...list.querySelectorAll("input[name=activity]")].map((input) => ({ id: input.dataset.id, title: input.value.trim() })).filter((item) => item.title);
    try {
      await setDoc(doc(db, "users", child.id, "parentActivities", "current"), { parentId: parent.id, items, updatedAt: Date.now() });
      notice.textContent = t("parent.activitiesSaved");
    } catch (error) { console.error(error); notice.textContent = t("parent.loadError"); } finally { save.disabled = false; }
  });
  return form;
}

async function resolveCheckin(childId, checkinId, decision, controls, notice) {
  controls.forEach((button) => { button.disabled = true; });
  try {
    await reviewCheckin(childId, checkinId, decision);
  } catch (error) {
    console.error("Check-in review failed", error);
    notice.textContent = t("parent.reviewError");
    controls.forEach((button) => { button.disabled = false; });
    return;
  }
  location.reload();
}

async function renderLinkedChild(link) {
  const [profileSnapshot, dragonSnapshot, progressSnapshot, attemptsSnapshot, activitiesSnapshot, checkinsSnapshot] = await Promise.all([
    getDoc(doc(db, "users", link.childId)), getDoc(doc(db, "users", link.childId, "dragon", "current")), getDoc(doc(db, "users", link.childId, "progress", "summary")),
    getDocs(collection(db, "users", link.childId, "attempts")), getDoc(doc(db, "users", link.childId, "parentActivities", "current")), getDocs(collection(db, "users", link.childId, "activityCheckins"))
  ]);
  const child = { id: link.childId, name: profileSnapshot.data()?.name || link.childName || "", dragon: dragonSnapshot.data(), progress: progressSnapshot.data() };
  const card = document.createElement("article"); card.className = "child";
  const heading = document.createElement("h3"); heading.textContent = child.name;
  const details = document.createElement("p"); details.textContent = t("admin.learningLevels", { chinese: child.progress?.chineseLevel ?? "-", english: child.progress?.englishLevel ?? "-", math: child.progress?.mathLevel ?? "-" });
  const history = document.createElement("p"); history.textContent = t("admin.attemptCount", { count: attemptsSnapshot.size });
  const config = activitiesSnapshot.data();
  card.append(heading, details, history, activityForm(child, config?.parentId === parent.id ? config.items : undefined));
  const pending = checkinsSnapshot.docs.filter((item) =>
    item.data().rewardVersion === 2 && checkinStatus(item.data()) === "pending");
  const pendingBox = document.createElement("section"); pendingBox.className = "pending";
  const pendingTitle = document.createElement("h3"); pendingTitle.textContent = t("parent.pendingTitle"); pendingBox.append(pendingTitle);
  if (!pending.length) { const empty = document.createElement("p"); empty.className = "empty"; empty.textContent = t("parent.noPending"); pendingBox.append(empty); }
  pending.forEach((snapshot) => {
    const item = snapshot.data();
    const text = document.createElement("p");
    text.textContent = t("parent.reviewEntry", {
      title: item.title, submitted: checkinTime(item.submittedAt),
      deadline: checkinTime(checkinDeadline(item))
    });
    const notice = document.createElement("p");
    const controls = ["approved", "rejected"].map((decision) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = t(decision === "approved" ? "parent.approveCheckin" : "parent.rejectCheckin");
      button.addEventListener("click", () => resolveCheckin(child.id, snapshot.id, decision, controls, notice));
      return button;
    });
    pendingBox.append(text, ...controls, notice);
  });
  card.append(pendingBox, checkinHistory(checkinsSnapshot.docs.map((snapshot) => snapshot.data())));
  return card;
}

async function loadParentDashboard() {
  const [childSnapshots, linksSnapshot, requestsSnapshot] = await Promise.all([
    getDocs(query(collection(db, "users"), where("role", "==", "child"))),
    getDocs(query(collection(db, "parentLinks"), where("parentId", "==", parent.id))),
    getDocs(query(collection(db, "parentRequests"), where("parentId", "==", parent.id)))
  ]);
  const links = linksSnapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  requestByChild = new Map(requestsSnapshot.docs
    .filter((item) => item.data().status === "pending")
    .map((item) => [item.data().childId, item.data()]));
  const linkedIds = new Set(links.filter((link) => link.status === "approved").map((link) => link.childId));
  children = childSnapshots.docs.map((item) => ({ id: item.id, ...item.data() }));
  const select = $("#requestChild"); select.replaceChildren();
  // parentLinks uses childId as its document id. Check every candidate so a child
  // already linked to another parent never appears in this first-link list.
  const candidateStates = await Promise.all(children.map(async (child) => ({
    child,
    link: await getDoc(doc(db, "parentLinks", child.id))
  })));
  const candidates = candidateStates
    .filter(({ child, link }) => !linkedIds.has(child.id) && !requestByChild.has(child.id) && !link.exists())
    .map(({ child }) => child);
  if (!candidates.length) { const option = new Option(t("parent.requestNone"), ""); select.append(option); $("#requestSubmit").disabled = true; }
  else { candidates.forEach((child) => select.append(new Option(child.name, child.id))); $("#requestSubmit").disabled = false; }
  const linkedContainer = $("#linkedChildren"); linkedContainer.replaceChildren();
  const approved = links.filter((link) => link.status === "approved");
  if (!approved.length) {
    const empty = document.createElement("p"); empty.className = "empty";
    empty.textContent = requestByChild.size ? t("parent.requestPending") : t("parent.noLinkedChild");
    linkedContainer.append(empty);
  }
  else { for (const link of approved) linkedContainer.append(await renderLinkedChild(link)); }
}

function configureText() {
  document.title = t("parent.title");
  $("#title").textContent = t("parent.title"); $("#intro").textContent = t("parent.intro");
  $("#requestTitle").textContent = t("parent.requestTitle"); $("#requestHelp").textContent = t("parent.requestHelp");
  $("#requestChildLabel").textContent = t("parent.requestChild"); $("#requestSubmit").textContent = t("parent.requestSubmit"); $("#linkedTitle").textContent = t("parent.linkedTitle");
  $("#requestForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const childId = $("#requestChild").value;
    const child = children.find((item) => item.id === childId);
    const button = $("#requestSubmit");
    const notice = $("#requestStatus");
    if (!child || button.disabled) return;
    button.disabled = true;
    const requestRef = doc(collection(db, "parentRequests"));
    try {
      await runTransaction(db, async (transaction) => {
        const linkRef = doc(db, "parentLinks", childId);
        const link = await transaction.get(linkRef);
        if (link.exists()) throw new Error("child-already-reserved");
        transaction.set(linkRef, { parentId: parent.id, parentName: parent.name, childId, childName: child.name, status: "pending", requestedAt: Date.now() });
        transaction.set(requestRef, { parentId: parent.id, parentName: parent.name, childId, childName: child.name, status: "pending", createdAt: Date.now() });
      });
    }
    catch (error) {
      console.error("Parent request failed", error);
      const key = error.code === "permission-denied" ? "parent.requestPermissionDenied"
        : error.message === "child-already-reserved" ? "parent.childAlreadyReserved"
        : "parent.requestFailed";
      notice.textContent = t(key);
      button.disabled = false;
      return;
    }
    notice.textContent = t("parent.requestPending");
    try {
      await loadParentDashboard();
    } catch (error) {
      console.error("Parent dashboard refresh failed after submission", error);
      $("#status").textContent = t("parent.loadError");
    }
  });
}

await loadUI(); configureText(); $("#status").textContent = t("admin.loading");
onAuthStateChanged(auth, async (user) => {
  if (!user) { location.replace("index.html"); return; }
  try { const profile = await getDoc(doc(db, "users", user.uid)); if (!profile.exists() || profile.data().role !== "parent") { location.replace("home.html"); return; } parent = { id: user.uid, ...profile.data() }; await loadParentDashboard(); $("#status").textContent = ""; }
  catch (error) { console.error(error); $("#status").textContent = t("parent.loadError"); }
});
