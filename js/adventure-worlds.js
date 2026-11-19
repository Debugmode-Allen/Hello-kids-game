import { t } from "./i18n.js";

// Landmark and animation placement are kept in data rather than map markup.
export async function mountWorldLandmarks(host) {
  const response = await fetch("data/adventure-library.json", { cache: "no-store" });
  if (!response.ok) throw new Error("World landmarks unavailable");
  const library = await response.json();
  host.replaceChildren();
  for (const world of library.worlds) {
    const scene = document.createElement("figure");
    scene.className = "world-landmark";
    scene.dataset.world = world.id;
    scene.style.left = world.position.left + "%";
    scene.style.top = world.position.top + "%";
    scene.style.width = world.position.width + "%";
    scene.style.aspectRatio = String(world.position.aspectRatio);
    scene.style.scale = String(world.position.scale ?? 1);
    const art = document.createElement("img");
    art.className = "world-landmark-art";
    art.src = world.image;
    art.alt = t(world.nameKey);
    art.draggable = false;
    scene.append(art);
    for (const group of world.creatures) {
      const sheet = library.creatureSheets[group.type];
      if (!sheet) continue;
      const layer = document.createElement("span");
      layer.className = "meadow-creatures meadow-creatures--" + group.type;
      layer.setAttribute("aria-hidden", "true");
      layer.style.left = group.left + "%";
      layer.style.top = group.top + "%";
      layer.style.width = group.width + "%";
      layer.style.backgroundImage = 'url("' + sheet + '")';
      for (const [property, value] of Object.entries({ "--frame-duration": group.frameSeconds, "--drift-duration": group.driftSeconds, "--frame-delay": group.frameDelay, "--drift-delay": group.driftDelay })) layer.style.setProperty(property, value + "s");
      scene.append(layer);
    }
    const caption = document.createElement("figcaption");
    const ordinal = document.createElement("small"); ordinal.textContent = t(world.ordinalKey);
    const title = document.createElement("strong"); title.textContent = t(world.nameKey);
    caption.className = "world-entry-label";
    caption.id = "world-label-" + world.id;
    caption.append(ordinal, title);
    const entry = document.createElement("button");
    entry.type = "button";
    entry.className = "world-entry";
    entry.setAttribute("aria-label", t("adventure.enterWorld", { world: t(world.nameKey) }));
    entry.setAttribute("aria-describedby", caption.id);
    entry.setAttribute("aria-haspopup", "dialog");
    entry.addEventListener("click", () => {
      const dialog = document.getElementById("worldPreview");
      document.getElementById("worldPreviewTitle").textContent = t(world.nameKey);
      document.getElementById("worldPreviewOrdinal").textContent = t(world.ordinalKey);
      document.getElementById("worldPreviewDescription").textContent = t("adventure.previewNotice", { region: t(world.nameKey) });
      document.getElementById("worldPreviewClose").textContent = t("adventure.closePreview");
      dialog.showModal();
    });
    scene.append(entry, caption); host.append(scene);
  }
}
