const CAPACITY = 10;
const RESERVOIR_SRC = new URL("../assets/battle/actions/energy-reservoir-v2.png", import.meta.url).href;
const POINT_SRC = new URL("../assets/battle/actions/energy-pip.png", import.meta.url).href;

// Slot centers are calibrated to the ten gold sockets in energy-reservoir-v2.png.
// Order: top, then clockwise. Percentages keep the mapping stable at every size.
export const ENERGY_METER_POSITIONS = Object.freeze([
  { x: 50.0, y: 16.0 },
  { x: 69.8, y: 24.2 },
  { x: 80.2, y: 40.8 },
  { x: 80.2, y: 58.5 },
  { x: 70.2, y: 74.6 },
  { x: 50.0, y: 80.5 },
  { x: 29.8, y: 74.6 },
  { x: 19.8, y: 58.5 },
  { x: 19.8, y: 40.8 },
  { x: 30.0, y: 24.2 }
]);

function boundedEnergy(value, maximum = CAPACITY) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(maximum, Math.floor(parsed))) : 0;
}

function boundedCapacity(value) {
  return Math.max(1, boundedEnergy(value ?? CAPACITY));
}

function createFrame() {
  const frame = document.createElement("img");
  frame.className = "energy-meter__frame";
  frame.src = RESERVOIR_SRC;
  frame.alt = "";
  frame.draggable = false;
  return frame;
}

function createPoint(position, index, charging, animateFromElement) {
  const point = document.createElement("img");
  point.className = "energy-meter__point";
  point.src = POINT_SRC;
  point.alt = "";
  point.draggable = false;
  point.dataset.energyIndex = String(index);
  point.style.left = `${position.x}%`;
  point.style.top = `${position.y}%`;
  if (charging && !animateFromElement) {
    point.classList.add("energy-meter__point--charging");
    point.style.left = "50%";
    point.style.top = "50%";
  }
  return point;
}

function animatePoint(point, container, position, direction, delay, sourceElement = null) {
  const enters = direction === "in";
  let from;
  let to;
  if (enters && sourceElement) {
    const sourceRect = sourceElement.getBoundingClientRect();
    const meterRect = container.getBoundingClientRect();
    const targetX = meterRect.left + meterRect.width * position.x / 100;
    const targetY = meterRect.top + meterRect.height * position.y / 100;
    const dx = sourceRect.left + sourceRect.width / 2 - targetX;
    const dy = sourceRect.top + sourceRect.height / 2 - targetY;
    from = {
      transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(.18)`,
      opacity: 0.2
    };
    to = { transform: "translate(-50%, -50%) scale(1)", opacity: 1 };
  } else {
    from = enters
      ? { left: "50%", top: "50%", transform: "translate(-50%, -50%) scale(.18)", opacity: 0 }
      : { left: `${position.x}%`, top: `${position.y}%`, transform: "translate(-50%, -50%) scale(1)", opacity: 1 };
    to = enters
      ? { left: `${position.x}%`, top: `${position.y}%`, transform: "translate(-50%, -50%) scale(1)", opacity: 1 }
      : { left: "50%", top: "50%", transform: "translate(-50%, -50%) scale(.18)", opacity: 0 };
  }
  const animation = point.animate([from, to], {
    duration: enters ? 920 : 420,
    delay,
    easing: enters ? "cubic-bezier(.2,.72,.28,1)" : "ease-in",
    fill: "both"
  });
  if (!enters) animation.finished.then(() => point.remove()).catch(() => {});
}

function animateCenterCharge(pointLayer, index) {
  const center = createPoint({ x: 50, y: 50 }, index, false, null);
  center.classList.add("energy-meter__point--pulse");
  center.style.left = "50%";
  center.style.top = "50%";
  pointLayer.append(center);
  center.animate([
    { transform: "translate(-50%, -50%) scale(.45)", opacity: 0 },
    { transform: "translate(-50%, -50%) scale(1.2)", opacity: 1, offset: .48 },
    { transform: "translate(-50%, -50%) scale(.55)", opacity: 0 }
  ], { duration: 420, easing: "ease-out", fill: "forwards" })
    .finished.then(() => center.remove()).catch(() => {});
}

/** Move the same ring between its battlefield slot and the pre-battle quiz header. */
export async function moveEnergyMeter(container, toQuiz) {
  if (!(container instanceof Element) || container.hidden) return;
  const start = container.getBoundingClientRect();
  container.classList.add("is-moving");
  container.classList.toggle("is-charging", Boolean(toQuiz));
  const end = container.getBoundingClientRect();
  if (!start.width || !end.width) {
    container.classList.remove("is-moving");
    return;
  }
  const scale = start.width / end.width;
  const animation = container.animate([
    { transform: `translate(${start.left - end.left}px, ${start.top - end.top}px) scale(${scale})` },
    { transform: "translate(0, 0) scale(1)" }
  ], {
    duration: 760,
    easing: "cubic-bezier(.2,.72,.28,1)",
    fill: "both"
  });
  await animation.finished.catch(() => {});
  animation.cancel();
  container.classList.remove("is-moving");
}

/**
 * Draw the persistent energy count in the ten ring sockets.
 * Pass previousEnergy after a state update to animate only changed points.
 * `animateFromElement` makes newly charged points fly from a submit button or other control.
 */
export function renderEnergyMeter(container, {
  currentEnergy = 0,
  previousEnergy = null,
  capacity = CAPACITY,
  label,
  animateFromElement = null,
  chargeFromCenter = false
} = {}) {
  if (!(container instanceof Element)) throw new TypeError("Energy meter container must be an Element");
  const maxEnergy = boundedCapacity(capacity);
  const current = boundedEnergy(currentEnergy, maxEnergy);
  const previous = previousEnergy == null ? current : boundedEnergy(previousEnergy, maxEnergy);

  container.classList.add("energy-meter");
  container.replaceChildren(createFrame());
  const pointLayer = document.createElement("div");
  pointLayer.className = "energy-meter__points";
  pointLayer.setAttribute("aria-hidden", "true");
  container.append(pointLayer);
  container.setAttribute("role", "img");
  container.setAttribute("aria-label", typeof label === "function" ? label(current, maxEnergy) : `${current}/${maxEnergy}`);
  container.dataset.energy = String(current);
  container.dataset.capacity = String(maxEnergy);

  const visibleCount = Math.max(current, previous);
  for (let index = 0; index < visibleCount; index += 1) {
    const position = ENERGY_METER_POSITIONS[index];
    const entering = index >= previous && index < current;
    const point = createPoint(position, index, false, null);
    pointLayer.append(point);
    if (entering) {
      if (chargeFromCenter && index === previous) animateCenterCharge(pointLayer, index);
      if (chargeFromCenter) {
        point.animate([
          { transform: "translate(-50%, -50%) scale(.22)", opacity: 0 },
          { transform: "translate(-50%, -50%) scale(1.12)", opacity: 1, offset: .72 },
          { transform: "translate(-50%, -50%) scale(1)", opacity: 1 }
        ], { duration: 360, delay: index === previous ? 230 : (index - previous) * 70, easing: "ease-out", fill: "both" });
      } else {
        animatePoint(point, container, position, "in", (index - previous) * 70,
          index === previous ? animateFromElement : null);
      }
    } else if (index >= current && index < previous) {
      animatePoint(point, container, position, "out", (previous - index - 1) * 45);
    }
  }
  return { currentEnergy: current, capacity: maxEnergy };
}
