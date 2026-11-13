import { questionBank } from "../data/question-bank.js";

const choose = (items, count) => [...items].sort(() => Math.random() - 0.5).slice(0, count);

export function createAssessment() {
  if (!document.querySelector("#assessment-option-style")) {
    const style = document.createElement("style");
    style.id = "assessment-option-style";
    style.textContent = "button.option{background:#bfdbfe!important;color:#0f172a!important;border:2px solid #2563eb!important;font-weight:800!important;opacity:1!important;text-shadow:none!important}button.option.selected{background:#1d4ed8!important;color:#ffffff!important;border-color:#172554!important}";
    document.head.append(style);
    const paintOptions = () => document.querySelectorAll("button.option").forEach((button) => {
      const selected = button.classList.contains("selected");
      button.style.setProperty("color", selected ? "#ffffff" : "#0f172a", "important");
      button.style.setProperty("background-color", selected ? "#1d4ed8" : "#bfdbfe", "important");
      button.style.setProperty("border", "2px solid #2563eb", "important");
    });
    new MutationObserver(paintOptions).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  }
  return ["chinese", "english", "math"].flatMap((subject, index) =>
    choose(Object.values(questionBank[subject]).flat(), [3, 3, 4][index])
  ).sort(() => Math.random() - 0.5);
}

export function calculateLevels(answers) {
  const correct = (subject) => answers.filter((answer) => answer.subject === subject && answer.correct).length;
  return {
    chinese: Math.min(3, 1 + Math.floor(correct("中文") / 2)),
    english: Math.min(5, 3 + Math.floor(correct("English") / 2)),
    math: Math.min(5, 3 + Math.floor(correct("数学") / 2))
  };
}
