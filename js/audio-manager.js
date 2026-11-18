const STORAGE_KEY = "dragon-adventure-audio-v1";
const DEFAULTS = Object.freeze({ enabled: true, bgm: 0.35, sfx: 0.7 });
let manifestPromise = null;
let preferences = loadPreferences();
let currentBgm = null;
const lastPlayed = new Map();

function clamp(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : fallback;
}

function loadPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return { enabled: saved.enabled !== false, bgm: clamp(saved.bgm, DEFAULTS.bgm), sfx: clamp(saved.sfx, DEFAULTS.sfx) };
  } catch { return { ...DEFAULTS }; }
}

function savePreferences() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences)); } catch { /* Private browsing can disable storage. */ }
}

async function manifest() {
  if (!manifestPromise) {
    manifestPromise = fetch("data/audio-cues.json", { cache: "no-store" }).then((response) => {
      if (!response.ok) throw new Error(`Unable to load audio manifest: ${response.status}`);
      return response.json();
    }).catch((error) => { console.warn("Audio is unavailable", error); return { assets: {}, scenes: {} }; });
  }
  return manifestPromise;
}

function fade(audio, target, duration = 350) {
  const start = audio.volume;
  const started = performance.now();
  const tick = (now) => {
    const progress = Math.min(1, (now - started) / duration);
    audio.volume = start + (target - start) * progress;
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export function getAudioPreferences() { return { ...preferences }; }

export function setAudioPreferences(next) {
  preferences = {
    enabled: typeof next.enabled === "boolean" ? next.enabled : preferences.enabled,
    bgm: clamp(next.bgm, preferences.bgm),
    sfx: clamp(next.sfx, preferences.sfx)
  };
  savePreferences();
  if (currentBgm) fade(currentBgm, preferences.enabled ? preferences.bgm * Number(currentBgm.dataset.baseVolume || 1) : 0, 160);
  document.dispatchEvent(new CustomEvent("audio-preferences-changed", { detail: getAudioPreferences() }));
}

export async function playCue(id) {
  if (!preferences.enabled) return false;
  const { assets = {} } = await manifest();
  const cue = assets[id];
  if (!cue || cue.group !== "sfx") return false;
  const now = performance.now();
  if (cue.cooldownMs && now - (lastPlayed.get(id) || -Infinity) < cue.cooldownMs) return false;
  lastPlayed.set(id, now);
  const audio = new Audio(cue.path);
  audio.volume = clamp(cue.volume, 1) * preferences.sfx;
  audio.preload = "auto";
  try { await audio.play(); return true; } catch { return false; }
}

async function startSceneMusic() {
  if (!preferences.enabled || currentBgm) return;
  const { assets = {}, scenes = {} } = await manifest();
  const page = location.pathname.split("/").pop() || "index.html";
  const id = scenes[page];
  const cue = assets[id];
  if (!cue) return;
  const audio = new Audio(cue.path);
  audio.loop = cue.loop === true;
  audio.preload = "auto";
  audio.dataset.baseVolume = String(clamp(cue.volume, 1));
  audio.volume = 0;
  currentBgm = audio;
  try { await audio.play(); fade(audio, preferences.bgm * clamp(cue.volume, 1), 650); }
  catch { currentBgm = null; }
}

function mountControls() {
  if (document.querySelector(".audio-settings")) return;
  const root = document.createElement("section");
  root.className = "audio-settings";
  root.innerHTML = `
    <button class="audio-settings__toggle" type="button" aria-expanded="false" data-audio-silent>🔊 <span>声音</span></button>
    <div class="audio-settings__panel" hidden>
      <label><input class="audio-enabled" type="checkbox"> <span>开启声音</span></label>
      <label>背景音乐 <input class="audio-bgm" type="range" min="0" max="100" step="1"></label>
      <label>音效 <input class="audio-sfx" type="range" min="0" max="100" step="1"></label>
    </div>`;
  document.body.append(root);
  const toggle = root.querySelector(".audio-settings__toggle");
  const panel = root.querySelector(".audio-settings__panel");
  const enabled = root.querySelector(".audio-enabled");
  const bgm = root.querySelector(".audio-bgm");
  const sfx = root.querySelector(".audio-sfx");
  const render = () => {
    const value = getAudioPreferences();
    enabled.checked = value.enabled; bgm.value = Math.round(value.bgm * 100); sfx.value = Math.round(value.sfx * 100);
    toggle.firstChild.textContent = value.enabled ? "🔊 " : "🔇 ";
    bgm.disabled = sfx.disabled = !value.enabled;
  };
  toggle.addEventListener("click", () => { panel.hidden = !panel.hidden; toggle.setAttribute("aria-expanded", String(!panel.hidden)); render(); });
  enabled.addEventListener("change", () => { setAudioPreferences({ enabled: enabled.checked }); if (enabled.checked) startSceneMusic(); });
  bgm.addEventListener("input", () => setAudioPreferences({ bgm: Number(bgm.value) / 100 }));
  sfx.addEventListener("input", () => setAudioPreferences({ sfx: Number(sfx.value) / 100 }));
  document.addEventListener("audio-preferences-changed", render);
  render();
}

function addGlobalListeners() {
  const unlock = () => { startSceneMusic(); document.removeEventListener("pointerdown", unlock); document.removeEventListener("keydown", unlock); };
  document.addEventListener("pointerdown", unlock, { once: true, passive: true });
  document.addEventListener("keydown", unlock, { once: true });
  document.addEventListener("click", (event) => {
    const button = event.target.closest("button:not([data-audio-silent]):not(:disabled)");
    if (button) playCue("ui-click");
  });
}

function install() {
  if (!document.querySelector('link[href="css/audio-settings.css"]')) {
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = "css/audio-settings.css";
    document.head.append(stylesheet);
  }
  mountControls();
  addGlobalListeners();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
else install();
