import { auth, db, onAuthStateChanged, doc, getDoc, runTransaction } from "./firebase.js";
import { loadUI, t } from "./i18n.js";
import { progressForDragon } from "./dragon-progression.js?v=curve-2";
import { effectiveStamina, loadCheckins } from "./checkin-client.js?v=20261118-stamina-breakdown";

import { PLAYER_SLOTS, DEFAULT_BATTLE_SLOT, normalizeBattleSlot, validBattleSlot } from "./formation.js";

import { SLOT_PROTECTION } from "./battle-engine.js?v=20261118-companions";

import { companionsForAccount, deployedCompanions } from "./companions.js";

import { mergeCompanionProfiles, pendingCompanionIntro } from "./companion-rewards.js";
const $ = (id) => document.getElementById(id);
function localAdventureProfile(userId) {
  try { return JSON.parse(localStorage.getItem(`dragon-adventure-profile:${userId}`)) || null; }
  catch { return null; }
}
let dragonName = "";
let dragonImage = "";
let selectedSlot = DEFAULT_BATTLE_SLOT;
let savedSlot = null;
let savingFormation = false;
let activeUserId = null;
let loadedDragonIdentity = null;
let availableCompanions = [];
let companionSlots = {};
let savedCompanionSlots = {};
let activeMember = "dragon";

const formationDirty = () => selectedSlot !== savedSlot || JSON.stringify(companionSlots) !== JSON.stringify(savedCompanionSlots);
const memberSlot = (id) => id === "dragon" ? selectedSlot : companionSlots[id];
const memberInfo = (id) => id === "dragon" ? { name: dragonName, image: dragonImage } : { ...availableCompanions.find((entry) => entry.id === id), name: t(availableCompanions.find((entry) => entry.id === id)?.nameKey || "") };

function selectTab(name, focus = false) {
  for (const button of document.querySelectorAll("[data-tab]")) {
    const selected = button.dataset.tab === name;
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
    $("panel-" + button.dataset.tab).hidden = !selected;
    if (selected && focus) button.focus();
  }
}

function renderRoster() {
  const roster = $("companionRoster");
  roster.replaceChildren();
  for (const id of ["dragon", ...availableCompanions.map((entry) => entry.id)]) {
    const info = memberInfo(id);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "roster-member";
    button.dataset.member = id;
    button.disabled = savingFormation;
    button.setAttribute("aria-pressed", String(activeMember === id));
    const image = document.createElement("img"); image.src = info.image; image.alt = "";
    const name = document.createElement("strong"); name.textContent = info.name;
    const detail = document.createElement("span");
    const slot = memberSlot(id);
    detail.textContent = t(slot ? "village.memberDeployed" : "village.memberReserve", { slot: slot?.slice(1) });
    button.append(image, name, detail);
    if (info.stats) {
      const stats = document.createElement("small");
      stats.textContent = t("village.companionStats", info.stats);
      button.append(stats);
    }
    button.addEventListener("click", () => {
      activeMember = id;
      $("formationSaveStatus").textContent = "";
      renderFormation();
    });
    roster.append(button);
  }
  $("companionCount").textContent = t("village.companionCount", { count: availableCompanions.length });
  $("emptyCompanions").hidden = availableCompanions.length > 0;
  $("removeCompanion").hidden = activeMember === "dragon";
  $("removeCompanion").disabled = savingFormation || !companionSlots[activeMember];
}

function placeMember(slot) {
  if (savingFormation) return;
  const previous = memberSlot(activeMember);
  const occupant = slot === selectedSlot ? "dragon" : Object.keys(companionSlots).find((id) => companionSlots[id] === slot);
  if (occupant && occupant !== activeMember && !previous) {
    $("formationSaveStatus").textContent = t("village.slotOccupied");
    return;
  }
  if (occupant && occupant !== activeMember) {
    if (occupant === "dragon") selectedSlot = previous;
    else companionSlots[occupant] = previous;
  }
  if (activeMember === "dragon") selectedSlot = slot;
  else companionSlots[activeMember] = slot;
  $("formationSaveStatus").textContent = "";
  renderFormation();
  $("formationBoard").querySelector('[data-slot="' + slot + '"]').focus();
}

function renderFormation() {
  renderRoster();
  const board = $("formationBoard"); board.replaceChildren();
  const occupied = [selectedSlot, ...Object.values(companionSlots)];
  const protectedSlots = PLAYER_SLOTS.filter((slot) => SLOT_PROTECTION[slot]?.some((guardian) => occupied.includes(guardian)));
  $("formationProtectionStatus").textContent = t(protectedSlots.length ? "village.teamProtectionPreview" : "village.protectionPreviewHint");
  const info = memberInfo(activeMember);
  $("formationStatus").textContent = t("village.placingMember", { name: info.name });
  for (const rowSlots of [PLAYER_SLOTS.slice(0, 3), PLAYER_SLOTS.slice(3)]) {
    const rowElement = document.createElement("div"); rowElement.className = "formation-row";
    const rowLabel = document.createElement("strong"); rowLabel.textContent = t(rowSlots.length === 3 ? "village.backRow" : "village.frontRow");
    const rowGroup = document.createElement("div"); rowGroup.className = "formation-row-slots"; rowGroup.dataset.row = rowSlots.length === 3 ? "back" : "front";
    rowElement.append(rowLabel, rowGroup); board.append(rowElement);
    for (const slot of rowSlots) {
      const button = document.createElement("button");
      const row = t(["L4", "L5"].includes(slot) ? "village.frontRow" : "village.backRow");
      button.type = "button"; button.disabled = savingFormation; button.className = "formation-slot"; button.dataset.slot = slot;
      button.setAttribute("aria-label", t("village.slot", { row, slot: slot.slice(1) }));
      button.setAttribute("aria-pressed", String(slot === memberSlot(activeMember)));
      const occupant = slot === selectedSlot ? "dragon" : Object.keys(companionSlots).find((id) => companionSlots[id] === slot);
      if (occupant) {
        const member = memberInfo(occupant);
        const image = document.createElement("img"); image.src = member.image; image.alt = member.name; button.append(image);
      }
      if (protectedSlots.includes(slot)) {
        button.className += " formation-slot--protected";
        const shield = document.createElement("span"); shield.className = "formation-shield";
        shield.setAttribute("aria-hidden", "true");
        shield.innerHTML = '<svg viewBox="0 0 32 36" fill="none"><path d="M16 2 29 7v10c0 8-8 14-13 17C11 31 3 25 3 17V7L16 2Z" fill="currentColor" fill-opacity=".18" stroke="currentColor" stroke-width="2.5"/><path d="m10 17 4 4 8-9" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        const badge = document.createElement("span"); badge.className = "formation-protected-label"; badge.textContent = t("village.protectedBadge");
        button.append(shield, badge);
        button.setAttribute("aria-label", t("village.teamProtectedLabel", { slot: slot.slice(1) }));
      }
      const label = document.createElement("span"); label.textContent = slot.slice(1); button.append(label);
      button.addEventListener("click", () => placeMember(slot)); rowGroup.append(button);
    }
  }
  $("confirmFormation").disabled = savingFormation || !formationDirty();
  $("confirmFormation").textContent = t(savingFormation ? "village.formationSaving" : "village.confirmFormation");
  $("resetFormation").disabled = savingFormation;
  board.setAttribute("aria-busy", String(savingFormation));
  if (!savingFormation && !$("formationSaveStatus").textContent) $("formationSaveStatus").textContent = t(formationDirty() ? "village.teamFormationUnsaved" : "village.teamFormationCurrent");
}

async function confirmFormation() {
  if (savingFormation || !formationDirty() || !validBattleSlot(selectedSlot)) return;
  const userId = activeUserId;
  const identity = loadedDragonIdentity;
  const slot = selectedSlot;
  const placements = { ...companionSlots };
  if (!userId || auth.currentUser?.uid !== userId) { location.replace("index.html"); return; }
  savingFormation = true;
  $("formationSaveStatus").textContent = t("village.formationSaving");
  renderFormation();
  try {
    const ref = doc(db, "users", userId, "dragon", "current");
    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(ref);
      const current = snapshot.exists() ? snapshot.data() : null;
      if (!current || current.speciesId !== identity.speciesId
          || (current.energyAssessmentId ?? null) !== identity.energyAssessmentId) {
        throw new Error("Dragon changed");
      }
      // Update this field only; concurrent energy/stat changes are preserved.
      transaction.update(ref, { battleSlot: slot, battleCompanions: placements });
    });
    if (activeUserId !== userId) return;
    savedSlot = slot;
    savedCompanionSlots = { ...placements };
    $("formationSaveStatus").textContent = t("village.teamFormationSaved");
  } catch (error) {
    console.error("Unable to save formation", error);
    if (activeUserId !== userId) return;
    $("formationSaveStatus").textContent = t(error.message === "Dragon changed" ? "village.formationDragonChanged" : "village.formationSaveError");
  } finally {
    if (activeUserId === userId) {
      savingFormation = false;
      renderFormation();
    }
  }
}

function skillCard(name, description, badge, locked = false, iconPath = "", iconGlyph = "") {
  const card = document.createElement("article");
  card.className = "skill-card" + (locked ? " skill-card--locked" : "");
  const heading = document.createElement("h3");
  if (iconPath) {
    const image = document.createElement("img");
    const fallback = document.createElement("span");
    image.src = iconPath;
    image.alt = "";
    fallback.className = "skill-glyph";
    fallback.textContent = iconGlyph || "✦";
    fallback.hidden = true;
    image.onerror = () => { image.remove(); fallback.hidden = false; };
    heading.append(image, fallback);
  } else if (iconGlyph) {
    const fallback = document.createElement("span");
    fallback.className = "skill-glyph";
    fallback.textContent = iconGlyph;
    heading.append(fallback);
  }
  heading.append(document.createTextNode(name));
  card.append(heading);
  for (const [tag, value, className] of [["p", badge, "skill-badge"], ["p", description, ""]]) {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = value;
    card.append(element);
  }
  $("skillList").append(card);
}

async function showDragon(user) {
  $("villageContent").hidden = true;
  $("status").textContent = t("village.loading");
  const [snapshot, adventureProfileSnapshot, libraryResponse, skillResponse, companionResponse, assetsResponse, progressionResponse] = await Promise.all([
    getDoc(doc(db, "users", user.uid, "dragon", "current")),
    getDoc(doc(db, "users", user.uid, "adventure", "profile")).catch(() => null),
    fetch("assets/dragons/dragon-library.json", { cache: "no-store" }),
    fetch("data/skills.json", { cache: "no-store" }),
    fetch("data/companions.json", { cache: "no-store" }),
    fetch("assets/battle/battle-assets.json", { cache: "no-store" }),
    fetch("data/dragon-progression.json", { cache: "no-store" })
  ]);
  if (!snapshot.exists()) { location.replace("journey.html"); return; }
  if (!libraryResponse.ok || !skillResponse.ok || !companionResponse.ok || !assetsResponse.ok || !progressionResponse.ok) throw new Error("Village data unavailable");
  const [library, skills, companionLibrary, battleAssets] = await Promise.all([libraryResponse.json(), skillResponse.json(), companionResponse.json(), assetsResponse.json()]);
  const dragon = snapshot.data();
  const progress = progressForDragon(dragon, await progressionResponse.json());
  const adventureProfile = mergeCompanionProfiles(adventureProfileSnapshot?.exists() ? adventureProfileSnapshot.data() : null, localAdventureProfile(user.uid));
  availableCompanions = companionsForAccount(companionLibrary, user, adventureProfile);
  companionSlots = Object.fromEntries(deployedCompanions(companionLibrary, user, dragon, adventureProfile).map((entry) => [entry.id, entry.slot]));
  savedCompanionSlots = { ...companionSlots };
  activeMember = "dragon";
  activeUserId = user.uid;
  loadedDragonIdentity = { speciesId: dragon.speciesId, energyAssessmentId: dragon.energyAssessmentId ?? null };
  savedSlot = validBattleSlot(dragon.battleSlot) ? dragon.battleSlot : null;
  selectedSlot = normalizeBattleSlot(dragon.battleSlot);
  $("formationSaveStatus").textContent = "";
  const species = library.find((entry) => entry.id === dragon.speciesId);
  if (!species) throw new Error("Unknown dragon species");
  dragonName = dragon.customName || species.name;
  dragonImage = species.image;
  $("dragonName").textContent = dragonName;
  $("dragonImage").src = dragonImage;
  $("dragonImage").alt = dragonName;
  $("dragonIdentity").textContent = species.element + " · " + species.profession;
  $("dragonLevel").textContent = t("village.level", { level: progress.level, xp: progress.xpIntoLevel });
  $("dragonEnergy").textContent = t("village.energy", { energy: dragon.energy ?? 0 });
  $("staminaNotice").hidden = true;
  let stamina;
  try { stamina = effectiveStamina(dragon, await loadCheckins(user.uid)); }
  catch (error) {
    console.warn("Unable to load check-in stamina", error);
    $("staminaNotice").textContent = t("village.staminaUnavailable");
    $("staminaNotice").hidden = false;
  }
  $("dragonStats").replaceChildren();
  for (const key of ["attack", "defense", "speed", "stamina"]) {
    const item = document.createElement("div");
    const label = document.createElement("dt");
    const value = document.createElement("dd");
    label.textContent = t("home." + key);
    value.textContent = key === "stamina" ? (stamina ?? t("village.statUnavailable")) : (dragon[key] ?? 10);
    item.append(label, value);
    $("dragonStats").append(item);
  }
  $("skillList").replaceChildren();
  skillCard(t("battle.claw"), t("village.clawHint"), t("village.basic"));
  const skill = skills.skills.find((entry) => entry.id === skills.skillOneBySpecies[dragon.speciesId]);
  if (skill) {
    const iconPath = battleAssets.actions.find((entry) => entry.id === skill.id)?.path || "";
    skillCard(t(skill.nameKey), t(skill.descriptionKey || "village.noSkill", { turns: skill.durationTurns, delay: skill.delayTurns }), t("village.energyCost", { cost: skill.energyCost ?? 0 }), false, iconPath, skill.iconGlyph);
  }
  skillCard(t("village.skillLocked"), t(skill ? "village.skillLockedHint" : "village.noSkill"), t("village.pending"), true);
  renderFormation();
  $("villageContent").hidden = false;
  $("status").textContent = "";
  if (new URLSearchParams(location.search).get("tab") === "formation") selectTab("formation");
  const pending = pendingCompanionIntro(adventureProfile, availableCompanions);
  if (pending) showCompanionReward(pending, adventureProfile, user.uid);
}

function showCompanionReward(companion, profile, userId) {
  const screen = $("companionReward");
  const image = $("rewardImage"); image.src = companion.image; image.alt = t(companion.nameKey);
  $("rewardName").textContent = t(companion.nameKey);
  $("rewardDescription").textContent = t(companion.descriptionKey);
  $("rewardStats").replaceChildren();
  for (const [key, value] of Object.entries(companion.stats)) {
    const cell = document.createElement("div");
    const label = document.createElement("dt"); label.textContent = t("home." + key);
    const number = document.createElement("dd"); number.textContent = value;
    cell.append(label, number); $("rewardStats").append(cell);
  }
  screen.hidden = false;
  document.body.classList.add("reward-open");
  document.querySelector("main").inert = true;
  $("rewardContinue").focus({ preventScroll: true });
  screen.scrollTop = 0;
  screen.onkeydown = (event) => { if (event.key === "Tab") { event.preventDefault(); $("rewardContinue").focus({ preventScroll: true }); } };
  $("rewardContinue").onclick = async () => {
    $("rewardContinue").disabled = true;
    image.scrollIntoView({ block: "center", behavior: "instant" });
    const source = image.getBoundingClientRect();
    const flying = image.cloneNode(); flying.removeAttribute("id"); flying.className = "companion-flight";
    Object.assign(flying.style, { left: source.left + "px", top: source.top + "px", width: source.width + "px", height: source.height + "px" });
    screen.hidden = true; document.body.classList.remove("reward-open"); document.querySelector("main").inert = false;
    selectTab("formation"); activeMember = companion.id; renderFormation();
    const target = [...$("companionRoster").children].find((entry) => entry.dataset.member === companion.id);
    target.scrollIntoView({ block: "center", behavior: "instant" });
    document.body.append(flying);
    const destination = target.querySelector("img").getBoundingClientRect();
    try {
      await flying.animate([
        { transform: "translate(0, 0) scale(1)" },
        { transform: `translate(${destination.left - source.left}px, ${destination.top - source.top}px) scale(${destination.width / source.width})` }
      ], { duration: matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 850, easing: "cubic-bezier(.2,.7,.2,1)", fill: "forwards" }).finished;
    } finally { flying.remove(); }
    target.classList.add("roster-member--arrived"); target.focus();
    $("formationSaveStatus").textContent = t("companionReward.arrived");
    profile.introducedCompanionIds = [...new Set([...profile.introducedCompanionIds, companion.id])];
    localStorage.setItem(`dragon-adventure-profile:${userId}`, JSON.stringify(profile));
    try {
      const ref = doc(db, "users", userId, "adventure", "profile");
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(ref);
        const next = mergeCompanionProfiles(snapshot.exists() ? snapshot.data() : {}, profile);
        transaction.set(ref, { ...next, updatedAt: Date.now() }, { merge: true });
      });
    } catch (error) { console.warn("Companion introduction remembered in this browser", error); }
    history.replaceState({}, "", "village.html?tab=formation");
  };
}

async function init() {
  await loadUI();
  document.title = t("village.title");
  for (const element of document.querySelectorAll("[data-copy]")) element.textContent = t(element.dataset.copy);
  $("villageTabs").setAttribute("aria-label", t("village.title"));
  $("formationBoard").setAttribute("aria-label", t("village.formationBoard"));
  const tabs = [...document.querySelectorAll("[data-tab]")];
  tabs.forEach((button, index) => {
    button.addEventListener("click", () => selectTab(button.dataset.tab));
    button.addEventListener("keydown", (event) => {
      let next;
      if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
      if (event.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); selectTab(tabs[next].dataset.tab, true); }
    });
  });
  $("resetFormation").addEventListener("click", () => { if (savingFormation) return; selectedSlot = DEFAULT_BATTLE_SLOT; companionSlots = {}; activeMember = "dragon"; $("formationSaveStatus").textContent = ""; renderFormation(); });
  $("removeCompanion").addEventListener("click", () => { if (savingFormation || activeMember === "dragon") return; delete companionSlots[activeMember]; $("formationSaveStatus").textContent = ""; renderFormation(); });
  $("confirmFormation").addEventListener("click", confirmFormation);
  onAuthStateChanged(auth, async (user) => {
    if (!user) { location.replace("index.html"); return; }
    try { await showDragon(user); }
    catch (error) { console.error(error); $("villageContent").hidden = true; $("status").textContent = t("village.error"); }
  });
}

init().catch((error) => { console.error(error); $("status").textContent = t("village.error"); });
