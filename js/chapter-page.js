import { auth, db, onAuthStateChanged, doc, getDoc, runTransaction, setDoc } from "./firebase.js";
import { loadUI, t } from "./i18n.js";
import { completeEncounter, generateRun, movePlayer, refreshVision, restorePlayerHealth, tileId, updatePlayerHealth } from "./adventure-run.js";
import { addDragonXp } from "./dragon-progression.js";
import { playCue } from "./audio-manager.js";

const $ = (selector) => document.querySelector(selector);
const query = new URLSearchParams(location.search);
const chapterId = query.get("chapter") || "meadow-1";
let chapter;
let run;
let userId;
let progression;
let playerAvatar = "";
let selectedEncounterId = null;
let localOnly = false;
let lastEvent = null;

async function loadJson(path) { const response = await fetch(path, { cache: "no-store" }); if (!response.ok) throw new Error(path); return response.json(); }
function runRef() { return doc(db, "users", userId, "adventureRuns", chapterId); }
function profileRef() { return doc(db, "users", userId, "adventure", "profile"); }
function localRunKey() { return `dragon-adventure-run:${userId}:${chapterId}`; }
function localProfileKey() { return `dragon-adventure-profile:${userId}`; }
function readLocal(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } }
function writeLocal(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
async function persist() {
  if (localOnly) { writeLocal(localRunKey(), run); return; }
  try { await setDoc(runRef(), run); }
  catch (error) { console.warn("Adventure cloud save unavailable; using this browser", error); localOnly = true; writeLocal(localRunKey(), run); }
}
async function awardDragonExperience(experience) {
  if (!experience) return;
  const dragonRef = doc(db, "users", userId, "dragon", "current");
  await runTransaction(db, async (transaction) => {
    const dragon = await transaction.get(dragonRef);
    if (!dragon.exists()) return;
    const current = dragon.data();
    const next = addDragonXp(current, experience, progression);
    const growth = Math.max(0, next.levelsGained);
    transaction.set(dragonRef, {
      xp: next.xp,
      level: next.level,
      attack: Number(current.attack ?? 10) + growth * 2,
      defense: Number(current.defense ?? 10) + growth * 2,
      speed: Number(current.speed ?? 10) + growth * 2,
      stamina: Number(current.stamina ?? 100) + growth * 20
    }, { merge: true });
  });
}
async function applyBossRewards() {
  if (!run.rewardsClaimed) {
    const companionId = chapter.rewards?.companionId;
    if (localOnly) {
      const profile = readLocal(localProfileKey(), { companionIds: [] });
      const companionIds = [...new Set([...(profile.companionIds || []), ...(companionId ? [companionId] : [])])];
      writeLocal(localProfileKey(), { ...profile, companionIds });
      run.rewardsClaimed = true; await persist(); return;
    }
    const current = await getDoc(profileRef());
    const profile = current.exists() ? current.data() : {};
    const companionIds = [...new Set([...(profile.companionIds || []), ...(companionId ? [companionId] : [])])];
    await setDoc(profileRef(), { companionIds, updatedAt: Date.now() }, { merge: true });
    run.rewardsClaimed = true;
    await persist();
  }
}
async function applyRestEnergy() {
  const dragonRef = doc(db, "users", userId, "dragon", "current");
  try {
    const dragon = await getDoc(dragonRef);
    if (!dragon.exists()) return;
    const energy = Math.max(0, Math.min(10, Math.floor(Number(dragon.data().energy) || 0)));
    if (energy < 10) await setDoc(dragonRef, { energy: 10 }, { merge: true });
  } catch (error) { console.warn("Rest energy could not be saved", error); }
}
function tileGlyph(tile) {
  if (tile.state === "cleared" && tile.kind !== "start") return "✓";
  return ({ start: "🏡", monster: "🐛", treasure: "🎁", rest: "💧", boss: "👑", empty: "" })[tile.kind] || "";
}
function isNeighbor(current, candidate) {
  return Math.abs(current.row - candidate.row) + Math.abs(current.column - candidate.column) === 1
    && current.exits[Object.entries({ north: [-1, 0], east: [0, 1], south: [1, 0], west: [0, -1] }).find(([, delta]) => current.row + delta[0] === candidate.row && current.column + delta[1] === candidate.column)?.[0]];
}
function render() {
  document.querySelector(".chapter-page").classList.toggle("is-pathfinding", run.mode === "pathfinding");
  const grid = $("#mazeGrid");
  grid.replaceChildren();
  const player = run.tiles.find((tile) => tile.id === tileId(run.player.row, run.player.column));
  for (const tile of run.tiles) {
    const visible = run.mode === "pathfinding" || run.revealed.includes(tile.id);
    const button = document.createElement("button");
    button.type = "button"; button.className = "maze-tile";
    const edges = { north: tile.exits.north ? "0" : "5px", east: tile.exits.east ? "0" : "5px", south: tile.exits.south ? "0" : "5px", west: tile.exits.west ? "0" : "5px" };
    for (const [edge, value] of Object.entries(edges)) button.style.setProperty(`--${edge}`, value);
    if (!visible) button.classList.add("is-hidden");
    const fogLandmark = !visible && ["boss", "treasure", "rest"].includes(tile.kind) && tile.state !== "cleared";
    if (fogLandmark) button.classList.add("is-fog-landmark");
    if (tile.id === player.id) button.classList.add("is-current");
    const isEncounter = run.mode !== "pathfinding" && ["monster", "boss"].includes(tile.kind) && tile.state !== "cleared";
    const movable = visible && isNeighbor(player, tile);
    if (movable) button.classList.add("is-movable");
    if (visible && ["monster", "boss"].includes(tile.kind) && tile.state !== "cleared") button.classList.add("is-encounter");
    button.disabled = !movable;
    button.setAttribute("aria-label", t("chapter.tile", { row: tile.row + 1, column: tile.column + 1 }));
    const marker = document.createElement("span");
    if (tile.id === player.id && playerAvatar) {
      const avatar = document.createElement("img");
      avatar.className = "player-token";
      avatar.src = playerAvatar;
      avatar.alt = "";
      marker.append(avatar);
    } else {
      marker.textContent = visible || fogLandmark ? tileGlyph(tile) : "";
    }
    button.append(marker);
    button.addEventListener("click", async () => {
      if (isEncounter) { selectedEncounterId = tile.id; render(); return; }
      const result = movePlayer(run, tile.id);
      if (!result.changed) return;
      selectedEncounterId = null;
      lastEvent = result.message;
      run = result.run;
      if (result.message === "rest") {
        const restored = restorePlayerHealth(run, chapter.restHealRatio);
        run = restored.run;
        lastEvent = restored.healed ? `rest:${restored.healed}` : "rest";
      }
      await persist();
      if (result.message === "treasure") { await applyRestEnergy(); playCue("energy-gain"); }
      if (result.message === "rest") playCue("answer-correct");
      render();
    });
    grid.append(button);
  }
  $("#experienceValue").textContent = t("chapter.experience", { value: run.loot.experience || 0 });
  $("#hpValue").textContent = run.playerMaxHp ? t("chapter.health", { current: run.playerHp ?? run.playerMaxHp, max: run.playerMaxHp }) : t("chapter.healthReady");
  const action = $("#encounterAction"); const restart = $("#restartAction"); action.hidden = true; restart.hidden = true;
  restart.onclick = async () => {
    run = generateRun(chapter);
    selectedEncounterId = null;
    lastEvent = null;
    await persist();
    render();
  };
  if (run.mode === "pathfinding") {
    $("#chapterMessage").textContent = lastEvent === "monster" ? t("chapter.monsterPassed")
      : lastEvent === "boss" ? t("chapter.bossPassed") : t("chapter.pathfindingHint");
    return;
  }
  if (run.status === "cleared") { $("#chapterMessage").textContent = t("chapter.cleared"); restart.hidden = false; restart.textContent = t("chapter.newRun"); return; }
  const selected = run.tiles.find((tile) => tile.id === selectedEncounterId);
  if (selected && ["monster", "boss"].includes(selected.kind) && selected.state !== "cleared") {
    $("#chapterMessage").textContent = t(selected.kind === "boss" ? "chapter.bossReady" : "chapter.monsterReady");
    action.hidden = false; action.textContent = t(selected.kind === "boss" ? "chapter.challengeBoss" : "chapter.challengeMonster");
    const battleId = selected.kind === "boss" ? chapter.bossBattleId : selected.battleId;
    const hp = run.playerMaxHp ? `&hp=${encodeURIComponent(run.playerHp ?? run.playerMaxHp)}&maxHp=${encodeURIComponent(run.playerMaxHp)}` : "";
    const experience = selected.kind === "boss" ? Number(chapter.bossExperience || 0) : Number(selected.experience || 0);
    action.onclick = () => location.assign(`battle.html?battle=${encodeURIComponent(battleId)}&from=adventure&run=${encodeURIComponent(chapterId)}&node=${encodeURIComponent(selected.id)}&xp=${encodeURIComponent(experience)}${hp}`);
  } else {
    $("#chapterMessage").textContent = lastEvent === "treasure" ? t("chapter.treasureEnergy")
      : String(lastEvent).startsWith("rest:") ? t("chapter.restoredHealth", { amount: String(lastEvent).split(":")[1] })
        : lastEvent === "rest" ? t("chapter.restNoNeed") : t("chapter.moveHint");
  }
}
async function applyBattleReturn() {
  if (run.mode === "pathfinding") {
    if (query.has("result") || query.has("node")) history.replaceState({}, "", `chapter.html?chapter=${encodeURIComponent(chapterId)}`);
    return;
  }
  const returnedHp = Number(query.get("hp"));
  const returnedMaxHp = Number(query.get("maxHp"));
  if (Number.isFinite(returnedHp) && Number.isFinite(returnedMaxHp)) {
    run = updatePlayerHealth(run, returnedHp, returnedMaxHp);
    await persist();
  }
  if (query.get("result") !== "victory" || !query.get("node")) {
    if (query.has("battleStatus") || query.has("hp")) history.replaceState({}, "", `chapter.html?chapter=${encodeURIComponent(chapterId)}`);
    return;
  }
  const completed = completeEncounter(run, query.get("node"), chapter);
  if (!completed.changed) {
    history.replaceState({}, "", `chapter.html?chapter=${encodeURIComponent(chapterId)}`);
    return;
  }
  run = completed.run;
  await persist();
  if (completed.experienceGained) await awardDragonExperience(completed.experienceGained);
  if (completed.bossCleared) await applyBossRewards();
  history.replaceState({}, "", `chapter.html?chapter=${encodeURIComponent(chapterId)}`);
}
function showResumeDialog() {
  const dialog = $("#resumeDialog");
  $("#resumeTitle").textContent = t("chapter.resumeTitle");
  $("#resumeMessage").textContent = t("chapter.resumeMessage");
  $("#resumeRun").textContent = t("chapter.resumeRun");
  $("#newRun").textContent = t("chapter.regenerate");
  $("#resumeRun").onclick = () => { dialog.hidden = true; };
  $("#newRun").onclick = async () => {
    run = generateRun(chapter);
    selectedEncounterId = null;
    lastEvent = null;
    await persist();
    dialog.hidden = true;
    render();
  };
  dialog.hidden = false;
}
async function init() {
  await loadUI();
  const [library, progressionData] = await Promise.all([loadJson("data/adventure-chapters.json"), loadJson("data/dragon-progression.json")]);
  chapter = library.chapters.find((entry) => entry.id === chapterId) || library.chapters[0];
  progression = progressionData;
  document.title = t(chapter.titleKey); $("#backLink").textContent = t("chapter.back"); $("#chapterEyebrow").textContent = t(chapter.subtitleKey); $("#chapterTitle").textContent = t(chapter.titleKey); $("#status").textContent = t("chapter.loading");
  onAuthStateChanged(auth, async (user) => {
    if (!user) { location.assign("index.html"); return; }
    userId = user.uid;
    try {
      const [dragonSnapshot, dragonLibrary] = await Promise.all([
        getDoc(doc(db, "users", userId, "dragon", "current")),
        loadJson("assets/dragons/dragon-library.json")
      ]);
      if (dragonSnapshot.exists()) {
        const species = dragonLibrary.find((entry) => entry.id === dragonSnapshot.data().speciesId);
        playerAvatar = species?.image || "";
      }
      let snapshot = null;
      try { snapshot = await getDoc(runRef()); }
      catch (error) { console.warn("Adventure cloud save unavailable; using this browser", error); localOnly = true; }
      const savedRun = snapshot?.exists() ? snapshot.data() : readLocal(localRunKey(), null);
      const hasSavedRun = Boolean(savedRun);
      run = savedRun || generateRun(chapter);
      // Migrate an in-progress local/cloud run into the current temporary test mode.
      // This prevents an older fog-of-war save from continuing to block a monster tile.
      const versionChanged = run.version !== 3;
      if (versionChanged) run = generateRun(chapter);
      const modeChanged = run.mode !== (chapter.mode || "adventure");
      const needsFullReveal = Boolean(chapter.revealAll) && run.revealed.length !== run.tiles.length;
      run.mode = chapter.mode || "adventure";
      if (chapter.revealAll) run.revealed = run.tiles.map((tile) => tile.id);
      else run = refreshVision(run);
      if (!snapshot?.exists() || versionChanged || modeChanged || needsFullReveal) await persist();
      const fromBattle = query.has("result") || query.has("battleStatus") || query.has("hp");
      await applyBattleReturn();
      let startedNewRun = false;
      if (run.status === "cleared" && !fromBattle) {
        run = generateRun(chapter);
        await persist();
        startedNewRun = true;
      }
      render();
      if (hasSavedRun && run.status === "active" && !fromBattle && !startedNewRun) showResumeDialog();
      $("#status").textContent = localOnly ? t("chapter.localOnly") : "";
    }
    catch (error) { console.error(error); $("#status").textContent = t("chapter.loadError"); }
  });
}
init();
