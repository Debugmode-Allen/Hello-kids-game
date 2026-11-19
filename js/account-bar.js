import { auth, db, onAuthStateChanged, signOut, doc, getDoc } from "./firebase.js";
import { loadUI, t } from "./i18n.js";

export async function mountAccountBar() {
  if (document.querySelector("#accountBar") || window.__accountBarSubscribed) return;
  window.__accountBarSubscribed = true;
  await loadUI();
  onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    if (document.querySelector("#accountBar") || window.__accountBarMounting) return;
    window.__accountBarMounting = true;
    const profile = await getDoc(doc(db, "users", user.uid));
    if (!profile.exists() || document.querySelector("#accountBar")) {
      window.__accountBarMounting = false;
      return;
    }
    const bar = document.createElement("div");
    bar.id = "accountBar";
    bar.innerHTML = `<span>${profile.data().name}</span><button type="button">${t("account.logout")}</button>`;
    Object.assign(bar.style, { position: "fixed", top: "14px", right: "14px", zIndex: "99", display: "flex", gap: "8px", alignItems: "center", padding: "7px 9px", borderRadius: "12px", background: "#f1f4fa", color: "#52617a", fontSize: "12px" });
    Object.assign(bar.querySelector("button").style, { border: "0", background: "transparent", color: "#52617a", cursor: "pointer", font: "inherit" });
    bar.querySelector("button").addEventListener("click", () => signOut(auth));
    document.querySelectorAll("#logout, .logout").forEach((element) => element.remove());
    document.body.append(bar);
    window.__accountBarMounting = false;
  });
}
