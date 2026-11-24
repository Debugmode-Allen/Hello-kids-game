import { auth, db, onAuthStateChanged, doc, getDoc, runTransaction, setDoc } from "./firebase.js";
import { loadUI, t } from "./i18n.js";
import { completeEncounter, generateRun, movePlayer, refreshVision, restorePlayerHealth, tileId, updatePlayerHealth } from "./adventure-run.js";
import { addDragonXp } from "./dragon-progression.js";
import { playCue } from "./audio-manager.js";

import { companionsForAccount } from "./companions.js";
import { mergeCompanionProfiles, grantCompanion } from "./companion-rewards.js";
import { exploredRoute, supplyNeeded, encounterClicks } from "./adventure-navigation.js";
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
let currentEnergy = 0;
let startingMaxHp = 100;
let battleLibrary;
let battleAssets;
let walkGeneration = 0;
let routePreview = [];
let walking = false;
let departing = false;
let movementTask = Promise.resolve();
const encounterInput = encounterClicks((id) => navigateTo(id), (id) => navigateTo(id, true));

function freshRun() { return updatePlayerHealth(generateRun(chapter), startingMaxHp, startingMaxHp); }
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
  const id = chapter.rewards?.companionId;
  if (!id) return;
  const library = await loadJson("data/companions.json");
  const granted = companionsForAccount(library, auth.currentUser).some((entry) => entry.id === id);
  const local = readLocal(localProfileKey(), {});
  const reward = (current) => {
    const next = grantCompanion(current, id, granted).profile;
    if (granted && !next.introducedCompanionIds.includes(id)) next.introducedCompanionIds.push(id);
    return next;
  };
  let profile;
  try {
    profile = await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(profileRef());
      const next = reward(mergeCompanionProfiles(snapshot.exists() ? snapshot.data() : {}, local));
      transaction.set(profileRef(), { ...next, updatedAt: Date.now() }, { merge: true });
      return next;
    });
  } catch (error) {
    if (!["permission-denied", "unavailable"].includes(error.code)) throw error;
    console.warn("Companion reward saved in this browser", error);
    profile = reward(local);
    localOnly = true;
  }
  writeLocal(localProfileKey(), profile);
  run.rewardsClaimed = true;
  await persist();
  if (profile.pendingCompanionIds.includes(id) && !profile.introducedCompanionIds.includes(id)) location.replace("village.html?tab=formation&reward=" + encodeURIComponent(id));
}
async function applyRestEnergy() {
  const dragonRef = doc(db, "users", userId, "dragon", "current");
  // Read inside the transaction so a concurrent skill use cannot be overwritten blindly.
  return runTransaction(db, async (transaction) => {
    const dragon = await transaction.get(dragonRef);
    if (!dragon.exists()) throw new Error("Missing dragon");
    const energy = Math.max(0, Math.min(10, Math.floor(Number(dragon.data().energy) || 0)));
    if (energy < 10) transaction.set(dragonRef, { energy: 10 }, { merge: true });
    return energy < 10;
  });
}
function battleUrl(tile) {
  const battleId = tile.kind === "boss" ? chapter.bossBattleId : tile.battleId;
  const hp = run.playerMaxHp ? `&hp=${encodeURIComponent(run.playerHp ?? run.playerMaxHp)}&maxHp=${encodeURIComponent(run.playerMaxHp)}` : "";
  const experience = tile.kind === "boss" ? Number(chapter.bossExperience || 0) : Number(tile.experience || 0);
  return `battle.html?battle=${encodeURIComponent(battleId)}&from=adventure&run=${encodeURIComponent(chapterId)}&node=${encodeURIComponent(tile.id)}&xp=${encodeURIComponent(experience)}${hp}`;
}
async function startEncounter(tile) {
  const player = run.tiles.find((entry) => entry.id === tileId(run.player.row, run.player.column));
  if (departing || !tile || tile.state === "cleared" || !isNeighbor(player, tile)) return;
  if (run.playerHp <= 0) { $("#status").textContent = t("chapter.noHealth"); return; }
  departing = true;
  $("#confirmEncounter").disabled = true;
  await persist();
  location.assign(battleUrl(tile));
}
function showEncounter(tile) {
  selectedEncounterId = tile.id;
  const config = battleLibrary.battles.find((battle) => battle.id === (tile.kind === "boss" ? chapter.bossBattleId : tile.battleId));
  $("#encounterTitle").textContent = t(tile.kind === "boss" ? "chapter.bossReady" : "chapter.monsterReady");
  $("#encounterHealth").textContent = t("chapter.health", { current: run.playerHp, max: run.playerMaxHp });
  $("#encounterHint").textContent = t(tile.kind === "boss" ? "chapter.bossConfirmHint" : "chapter.doubleHint");
  $("#encounterEnemies").replaceChildren();
  for (const enemy of config?.enemies || []) {
    const asset = battleAssets.enemies.find((entry) => entry.id === enemy.speciesId);
    const card = document.createElement("div");
    const image = document.createElement("img"); image.src = asset?.path || ""; image.alt = "";
    const label = document.createElement("span"); label.textContent = asset?.name || enemy.speciesId;
    const row = document.createElement("small"); row.textContent = t(["R4", "R5"].includes(enemy.slot) ? "village.frontRow" : "village.backRow");
    card.append(image, label, row); $("#encounterEnemies").append(card);
  }
  $("#confirmEncounter").textContent = t(tile.kind === "boss" ? "chapter.challengeBoss" : "chapter.challengeMonster");
  $("#confirmEncounter").disabled = run.playerHp <= 0;
  $("#confirmEncounter").onclick = () => startEncounter(tile);
  $("#encounterDialog").showModal();
}
function stopWalking() {
  walkGeneration += 1; walking = false; routePreview = []; encounterInput.clear();
}
function navigateTo(id, direct = false) {
  const generation = ++walkGeneration;
  movementTask = movementTask.catch(() => {}).then(() => walkTo(id, direct, generation)).catch((error) => {
    console.error(error); walking = false; routePreview = []; render(); $("#status").textContent = t("chapter.moveError");
  });
}
async function walkTo(id, direct, generation) {
  if (generation !== walkGeneration || departing) return;
  const route = exploredRoute(run, id);
  if (!route) { walking = false; routePreview = []; render(); $("#status").textContent = t("chapter.routeBlocked"); return; }

  walking = route.length > 0; routePreview = [...route]; selectedEncounterId = null;
  $("#status").textContent = ""; render();
  for (const step of route) {
    if (generation !== walkGeneration) return;
    const tile = run.tiles.find((entry) => entry.id === step);
    if (run.mode !== "pathfinding" && ["monster", "boss"].includes(tile.kind) && tile.state !== "cleared") {
      walking = false; routePreview = []; render();
      if (direct && tile.kind !== "boss") await startEncounter(tile); else showEncounter(tile);
      return;
    }
    const unusedSupply = ["rest", "treasure"].includes(tile.kind) && tile.state !== "cleared";
    let useSupply = unusedSupply && supplyNeeded(tile, run, currentEnergy);
    if (unusedSupply && tile.kind === "treasure") {
      // Refresh even at full energy; another tab may have spent it since page load.
      const current = await getDoc(doc(db, "users", userId, "dragon", "current"));
      if (generation !== walkGeneration) return;
      if (!current.exists()) throw new Error("Missing dragon");
      currentEnergy = Number(current.data().energy) || 0;
      useSupply = supplyNeeded(tile, run, currentEnergy);
      if (useSupply) { useSupply = await applyRestEnergy(); currentEnergy = 10; }
    }
    if (unusedSupply && !useSupply) {
      lastEvent = tile.kind === "rest" ? "healthFull" : "energyFull";
      break;
    }
    const result = movePlayer(run, step);
    if (!result.changed) break;
    run = result.run; lastEvent = result.message;
    if (result.message === "rest") {
      const restored = restorePlayerHealth(run, chapter.restHealRatio);
      run = restored.run; lastEvent = `rest:${restored.healed}`; playCue("answer-correct");
    } else if (result.message === "treasure") playCue("energy-gain");
    routePreview = routePreview.slice(1);
    await persist();
    if (generation !== walkGeneration) return;
    render();
    await new Promise((resolve) => setTimeout(resolve, matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 140));
  }
  if (generation === walkGeneration) { walking = false; routePreview = []; render(); }
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
    const movable = visible;
    button.dataset.tile = tile.id;
    if (routePreview.includes(tile.id)) button.classList.add("is-route");
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
    button.addEventListener("pointerdown", (event) => {
      if (walking && tile.id === tileId(run.player.row, run.player.column)) {
        event.preventDefault(); stopWalking(); render();
      }
    });
    button.addEventListener("click", () => {
      if (departing) return;
      if (tile.id === tileId(run.player.row, run.player.column)) { stopWalking(); render(); return; }
      if (isEncounter) { walkGeneration += 1; walking = false; encounterInput.click(tile.id, tile.kind === "boss"); return; }
      encounterInput.clear(); navigateTo(tile.id);
    });
    grid.append(button);
  }
  $("#experienceValue").textContent = t("chapter.experience", { value: run.loot.experience || 0 });
  $("#hpValue").textContent = run.playerMaxHp ? t("chapter.health", { current: run.playerHp ?? run.playerMaxHp, max: run.playerMaxHp }) : t("chapter.healthReady");
  $("#stopWalking").hidden = !walking;
  const action = $("#encounterAction"); const restart = $("#restartAction"); action.hidden = true; restart.hidden = true;
  restart.onclick = async () => {
    stopWalking();
    run = freshRun();
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
  $("#chapterMessage").textContent = walking ? t("chapter.walking")
    : lastEvent === "treasure" ? t("chapter.treasureEnergy")
      : String(lastEvent).startsWith("rest:") ? t("chapter.restoredHealth", { amount: String(lastEvent).split(":")[1] })
        : lastEvent === "healthFull" ? t("chapter.healthFull")
          : lastEvent === "energyFull" ? t("chapter.energyFull") : t("chapter.moveHint");
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
    if (run.status === "cleared") await applyBossRewards();
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
    stopWalking();
    run = freshRun();
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
  const [library, progressionData, battles, assets] = await Promise.all([loadJson("data/adventure-chapters.json"), loadJson("data/dragon-progression.json"), loadJson("data/battle-library.json"), loadJson("assets/battle/battle-assets.json")]);
  battleLibrary = battles; battleAssets = assets;
  $("#stopWalking").textContent = t("chapter.stopWalking");
  $("#stopWalking").onclick = () => { stopWalking(); render(); };
  $("#cancelEncounter").textContent = t("chapter.cancelEncounter");
  $("#cancelEncounter").onclick = () => $("#encounterDialog").close();
  $("#encounterDialog").addEventListener("click", (event) => { if (event.target === $("#encounterDialog")) $("#encounterDialog").close(); });
  $("#encounterDialog").addEventListener("close", () => { selectedEncounterId = null; });
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
        currentEnergy = Number(dragonSnapshot.data().energy) || 0;
        const { effectiveStamina, loadCheckins } = await import("./checkin-client.js");
        startingMaxHp = effectiveStamina(dragonSnapshot.data(), await loadCheckins(userId));
      }
      let snapshot = null;
      try { snapshot = await getDoc(runRef()); }
      catch (error) { console.warn("Adventure cloud save unavailable; using this browser", error); localOnly = true; }
      const savedRun = snapshot?.exists() ? snapshot.data() : readLocal(localRunKey(), null);
      const hasSavedRun = Boolean(savedRun);
      run = savedRun || freshRun();
      // Migrate an in-progress local/cloud run into the current temporary test mode.
      // This prevents an older fog-of-war save from continuing to block a monster tile.
      const versionChanged = run.version !== 3;
      if (versionChanged) run = freshRun();
      const modeChanged = run.mode !== (chapter.mode || "adventure");
      const needsFullReveal = Boolean(chapter.revealAll) && run.revealed.length !== run.tiles.length;
      run.mode = chapter.mode || "adventure";
      if (chapter.revealAll) run.revealed = run.tiles.map((tile) => tile.id);
      else run = refreshVision(run);
      if (!snapshot?.exists() || versionChanged || modeChanged || needsFullReveal) await persist();
      if (!run.playerMaxHp) run = updatePlayerHealth(run, startingMaxHp, startingMaxHp);
      const fromBattle = query.has("result") || query.has("battleStatus") || query.has("hp");
      await applyBattleReturn();
      let startedNewRun = false;
      if (run.status === "cleared" && !fromBattle) {
        await applyBossRewards();
        stopWalking();
    run = freshRun();
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
