// Presentation only: combat state, damage and duration remain in battle-engine.js.
export const NEW_SKILL_EFFECTS = new Set([
  "tidal-healing", "sunlight-encouragement", "crystal-freeze", "piercing-sand",
  "petal-regrowth", "stone-armor", "star-chain"
]);

export function createSkillEffects({ field, slots, textures, reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches }) {
  const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  function layer(parent, skillId, role) {
    const element = document.createElement("span");
    element.className = `skill-fx skill-fx--${role}`;
    element.dataset.skillId = skillId;
    element.setAttribute("aria-hidden", "true");
    const path = textures.get(skillId);
    element.style.setProperty("--skill-fx-texture", path ? `url("${path}")` : "none");
    parent.append(element);
    return element;
  }
  function center(unit) {
    const rect = slots.get(unit.slot)?.getBoundingClientRect();
    const bounds = field.getBoundingClientRect();
    return rect ? { x: rect.left + rect.width / 2 - bounds.left - field.clientLeft,
      y: rect.top + rect.height / 2 - bounds.top - field.clientTop } : null;
  }
  async function support(unit, skillId, duration = 780) {
    const slot = slots.get(unit.slot);
    if (!slot) return;
    const effect = layer(slot, skillId, "arrival");
    effect.style.animationDuration = `${duration}ms`;
    try { await pause(reducedMotion() ? 180 : duration); }
    finally { effect.remove(); }
  }
  async function hit(from, target, skillId, bounce = 0) {
    const start = center(from), end = center(target);
    if (!start || !end) return;
    let flight;
    try {
      if (!reducedMotion()) {
        flight = layer(field, skillId, skillId === "piercing-sand" ? "sand" : "star");
        flight.dataset.fromSlot = from.slot; flight.dataset.toSlot = target.slot;
        const dx = end.x - start.x, dy = end.y - start.y;
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        Object.assign(flight.style, { left: `${start.x}px`, top: `${start.y}px` });
        if (skillId === "piercing-sand") {
          flight.style.width = `${Math.hypot(dx, dy)}px`;
          flight.style.rotate = `${angle}deg`;
          await pause(430);
        } else {
          const scale = Math.max(.55, 1 - bounce * .18);
          const bend = Math.min(65, Math.hypot(dx, dy) * .22);
          const frame = (x, y, size) => ({ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${angle}deg) scale(${size})` });
          await flight.animate([
            { ...frame(0, 0, scale * .65), opacity: .4 },
            { ...frame(dx * .5, dy * .5 - bend, scale), opacity: 1, offset: .5 },
            { ...frame(dx, dy, scale * .8), opacity: 1 }
          ], { duration: bounce ? 310 : 430, easing: "ease-in-out", fill: "forwards" }).finished;
        }
      }
      await support(target, skillId, 260);
    } finally { flight?.remove(); }
  }
  function status(unit) {
    const effects = [];
    if (unit.controlTurns > 0) effects.push("crystal-freeze");
    if (unit.attackBuffTurns > 0) effects.push("sunlight-encouragement");
    if (unit.healOverTimeTurns > 0) effects.push("petal-regrowth");
    if (unit.shieldHp > 0 || unit.defenseBuffTurns > 0) effects.push("stone-armor");
    return effects.map((id) => layer(slots.get(unit.slot), id, "status"));
  }
  return { support, hit, status };
}
