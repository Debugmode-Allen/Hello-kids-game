export const eggImages = { fire: "assets/eggs/fire-egg.png", forest: "assets/eggs/forest-egg.png", star: "assets/eggs/star-tide-egg.png" };
export const eggPools = { fire: ["red-fire", "gold-sun", "orange-desert"], forest: ["green-forest", "pink-garden", "gray-rock"], star: ["blue-water", "purple-moon", "white-frost", "indigo-star"] };
export function pickDragon(egg, dragons) {
  const allowedIds = eggPools[egg] ?? [];
  const candidates = dragons.filter((dragon) => allowedIds.includes(dragon.id));
  if (candidates.length > 0) {
    return candidates[Math.floor(Math.random() * candidates.length)];
  }
  if (dragons.length > 0) return dragons[0];
  throw new Error(`No dragon assets are available for egg: ${egg}`);
}
export function lock(button) {
  if (button.dataset.locked) return false;
  button.dataset.locked = "true";
  button.disabled = true;
  button.textContent = "正在孵化…";
  button.classList.add("hidden");
  return true;
}
