export function showDragonHome(container) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "看看我的小龙";
  button.addEventListener("click", () => window.location.assign("home.html"));
  container.append(button);
}
