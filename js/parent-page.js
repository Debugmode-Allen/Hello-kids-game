import { auth, db, onAuthStateChanged, doc, getDoc, getDocs, collection, setDoc, runTransaction, query, where, serverTimestamp } from "./firebase.js?v=20261117-parent";
import { loadUI, t } from "./i18n.js";
import { checkinDeadline, checkinHistory, checkinStatus, checkinTime, reviewCheckin } from "./checkin-client.js?v=20261117-spark";

const $ = (selector) => document.querySelector(selector);
let parent = null;
let children = [];
let requestByChild = new Map();
let parentDragons = [];
let storyContent = {};
let selectedParentDragon = null;

const defaultActivities = () => ["parent.defaultActivity1", "parent.defaultActivity2", "parent.defaultActivity3"].map((key, index) => ({ id: `default-${index + 1}`, title: t(key) }));

function story(key) { return storyContent[key] || key; }

function makeGuardianCard(dragon, assignment) {
  const card = document.createElement("article");
  card.className = "guardian-card";
  card.style.setProperty("--dragon-accent", dragon.accent);
  const isMine = selectedParentDragon?.dragonId === dragon.id || assignment?.parentId === parent.id;
  const isTaken = Boolean(assignment && assignment.parentId !== parent.id);
  if (isTaken) card.classList.add("taken");

  const image = document.createElement("img");
  image.className = "guardian-art";
  image.src = dragon.image;
  image.alt = story(`parentDragon.${dragon.storyKey}.name`);
  const copy = document.createElement("div"); copy.className = "guardian-copy";
  const name = document.createElement("h3"); name.className = "guardian-name"; name.textContent = story(`parentDragon.${dragon.storyKey}.name`);
  const title = document.createElement("p"); title.className = "guardian-title"; title.textContent = story(`parentDragon.${dragon.storyKey}.title`);
  const lore = document.createElement("p"); lore.className = "guardian-lore"; lore.textContent = story(`parentDragon.${dragon.storyKey}.intro`);
  const background = document.createElement("p"); background.className = "guardian-background"; background.textContent = story(`parentDragon.${dragon.storyKey}.background`);
  const state = document.createElement("p"); state.className = "guardian-state";
  const button = document.createElement("button"); button.type = "button";
  if (isMine) {
    state.textContent = t("parentDragon.stateMine"); button.textContent = t("parentDragon.selected"); button.disabled = true;
  } else if (isTaken) {
    state.textContent = t("parentDragon.stateTaken"); button.textContent = t("parentDragon.taken"); button.disabled = true;
  } else if (selectedParentDragon) {
    state.textContent = t("parentDragon.stateLocked"); button.textContent = t("parentDragon.choose"); button.disabled = true;
  } else {
    state.textContent = t("parentDragon.stateAvailable"); button.textContent = t("parentDragon.choose");
    button.addEventListener("click", () => chooseParentDragon(dragon, button));
  }
  copy.append(name, title, lore, background, state);
  card.append(image, copy, button);
  return card;
}

async function loadParentDragonSelection() {
  const [assignmentSnapshot, choiceSnapshot] = await Promise.all([
    getDocs(collection(db, "parentDragonAssignments")),
    getDoc(doc(db, "parentDragonChoices", parent.id))
  ]);
  const assignments = new Map(assignmentSnapshot.docs.map((item) => [item.id, item.data()]));
  selectedParentDragon = choiceSnapshot.exists() ? choiceSnapshot.data() : null;
  const container = $("#guardianChoices"); container.replaceChildren();
  parentDragons.forEach((dragon) => container.append(makeGuardianCard(dragon, assignments.get(dragon.id))));
  const full = parentDragons.length > 0 && parentDragons.every((dragon) => assignments.has(dragon.id));
  $("#guardianStatus").textContent = full ? t("parentDragon.allTaken") : (selectedParentDragon ? t("parentDragon.selectionLocked") : "");
}

async function chooseParentDragon(dragon, button) {
  button.disabled = true;
  $("#guardianStatus").textContent = t("parentDragon.saving");
  const choiceRef = doc(db, "parentDragonChoices", parent.id);
  const assignmentRef = doc(db, "parentDragonAssignments", dragon.id);
  try {
    await runTransaction(db, async (transaction) => {
      const [choice, assignment] = await Promise.all([transaction.get(choiceRef), transaction.get(assignmentRef)]);
      if (choice.exists()) throw new Error("parent-dragon-already-chosen");
      if (assignment.exists()) throw new Error("parent-dragon-taken");
      transaction.set(choiceRef, { parentId: parent.id, dragonId: dragon.id, selectedAt: serverTimestamp() });
      transaction.set(assignmentRef, { parentId: parent.id, dragonId: dragon.id, assignedAt: serverTimestamp() });
    });
    await loadParentDragonSelection();
  } catch (error) {
    console.error("Parent dragon selection failed", error);
    const key = error.code === "permission-denied" ? "parentDragon.permissionDenied"
      : error.message === "parent-dragon-taken" ? "parentDragon.takenError"
      : error.message === "parent-dragon-already-chosen" ? "parentDragon.alreadyChosen"
      : "parentDragon.saveError";
    $("#guardianStatus").textContent = t(key);
    button.disabled = false;
    try { await loadParentDragonSelection(); } catch (reloadError) { console.error(reloadError); }
  }
}

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
  $("#guardianTitle").textContent = t("parentDragon.sectionTitle"); $("#guardianHelp").textContent = t("parentDragon.sectionHelp");
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

await loadUI();
const [dragonResponse, storyResponse] = await Promise.all([
  fetch("data/parent-dragons.json", { cache: "no-store" }),
  fetch("content/story.zh-CN.json", { cache: "no-store" })
]);
if (!dragonResponse.ok || !storyResponse.ok) throw new Error("Unable to load parent dragon content");
parentDragons = await dragonResponse.json();
storyContent = await storyResponse.json();
configureText(); $("#status").textContent = t("admin.loading");
onAuthStateChanged(auth, async (user) => {
  if (!user) { location.replace("index.html"); return; }
  try {
    const profile = await getDoc(doc(db, "users", user.uid));
    if (!profile.exists() || profile.data().role !== "parent") { location.replace("home.html"); return; }
    parent = { id: user.uid, ...profile.data() };
    await Promise.all([loadParentDashboard(), loadParentDragonSelection()]);
    $("#status").textContent = "";
  }
  catch (error) { console.error(error); $("#status").textContent = t("parent.loadError"); }
});
