import { auth, db, onAuthStateChanged, doc, getDoc } from "./firebase.js";
import { loadUI, t } from "./i18n.js";

import { mountWorldLandmarks } from "./adventure-worlds.js?v=20261118-meadow-entry";

const $ = (selector) => document.querySelector(selector);

const regions = [
  { id: "meadow", icon: "🌿", position: [46, 66], state: "open" },
  { id: "forest", icon: "🌳", position: [28, 52], state: "future" },
  { id: "waterfall", icon: "💧", position: [47, 47], state: "future" },
  { id: "moon", icon: "🌙", position: [25, 35], state: "future" },
  { id: "desert", icon: "🏜️", position: [70, 62], state: "future" },
  { id: "volcano", icon: "🌋", position: [48, 22], state: "future" },
  { id: "frost", icon: "❄️", position: [75, 18], state: "future" }
];

function setRegion(regionId) {
  const region = regions.find((item) => item.id === regionId) ?? regions[0];
  document.querySelectorAll(".map-node").forEach((node) => node.classList.toggle("is-selected", node.dataset.region === region.id));
  $("#regionName").textContent = t(`adventure.region.${region.id}.name`);
  $("#regionDescription").textContent = t(`adventure.region.${region.id}.description`);
  $("#regionStatus").textContent = t(region.state === "open" ? "adventure.status.open" : "adventure.status.locked");
  $("#regionHint").textContent = t(region.state === "open" ? "adventure.hint.ready" : "adventure.hint.future");
  $("#regionAction").textContent = t(region.state === "open" ? "adventure.action.explore" : "adventure.action.preview");
  $("#regionAction").dataset.region = region.id;
}

function renderNodes() {
  const container = $("#mapNodes");
  container.setAttribute("aria-label", t("adventure.mapNodes"));
  regions.forEach((region) => {
    const button = document.createElement("button");
    button.className = `map-node map-node--${region.state}`;
    button.type = "button";
    button.dataset.region = region.id;
    button.style.left = `${region.position[0]}%`;
    button.style.top = `${region.position[1]}%`;
    button.setAttribute("aria-label", t(`adventure.region.${region.id}.name`));
    button.innerHTML = `<span class="map-node__icon" aria-hidden="true">${region.icon}</span><span class="map-node__label">${t(`adventure.region.${region.id}.name`)}</span>`;
    button.addEventListener("click", () => setRegion(region.id));
    container.append(button);
  });
}

async function showDragon(user) {
  const [dragonSnapshot, libraryResponse] = await Promise.all([
    getDoc(doc(db, "users", user.uid, "dragon", "current")),
    fetch("assets/dragons/dragon-library.json", { cache: "no-store" })
  ]);
  if (!dragonSnapshot.exists() || !libraryResponse.ok) {
    location.assign("journey.html");
    return;
  }
  const dragon = dragonSnapshot.data();
  const library = await libraryResponse.json();
  const species = library.find((item) => item.id === dragon.speciesId) ?? {};
  $("#dragonName").textContent = dragon.customName || species.name || t("adventure.defaultDragonName");
  $("#dragonLevel").textContent = t("adventure.dragonLevel", { level: dragon.level ?? 1 });
  $("#dragonXp").textContent = t("adventure.dragonXp", { xp: dragon.xp ?? 0 });
  if (species.image) {
    $("#dragonAvatar").src = species.image;
    $("#dragonAvatar").hidden = false;
  }
}

async function init() {
  const viewport = $("#mapScroll");
  const showSouth = () => {
    viewport.scrollTop = viewport.scrollHeight;
    viewport.scrollLeft = (viewport.scrollWidth - viewport.clientWidth) * .16;
  };
  requestAnimationFrame(showSouth);
  window.addEventListener("pageshow", showSouth, { once: true });
  await loadUI();
  mountWorldLandmarks($("#worldLandmarks")).catch((error) => console.error("Unable to show world landmarks", error));
  document.title = t("adventure.title");
  $("#villageEntry").setAttribute("aria-label", t("village.enter"));
  $("#villageEntryLabel").textContent = t("village.enter");
  $("#backLink").textContent = t("adventure.back");
  $("#mapEyebrow").textContent = t("adventure.eyebrow");
  $("#pageTitle").textContent = t("adventure.title");
  renderNodes();
  setRegion("meadow");
  $("#regionAction").addEventListener("click", () => {
    $("#status").textContent = t("adventure.previewNotice", { region: $("#regionName").textContent });
  });
  $("#status").textContent = t("adventure.loading");
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      location.assign("index.html");
      return;
    }
    try {
      await showDragon(user);
      $("#status").textContent = "";
    } catch (error) {
      console.error(error);
      $("#status").textContent = t("adventure.loadError");
    }
  });
}

init();
