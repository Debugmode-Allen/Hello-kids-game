export function renderQuestionOptions(container, question, onSelect) {
  const buttons = question.options.map((choice) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quiz-option";
    button.textContent = choice;
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => {
      for (const option of buttons) {
        option.classList.toggle("chosen", option === button);
        option.setAttribute("aria-pressed", String(option === button));
      }
      onSelect(choice);
    });
    return button;
  });
  container.replaceChildren(...buttons);
  return buttons;
}
