export function renderQuestionOptions(container, question, onAnswer) {
  const buttons = question.options.map((choice) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quiz-option";
    button.textContent = choice;
    button.addEventListener("click", () => {
      for (const option of buttons) option.disabled = true;
      button.classList.add("chosen");
      onAnswer(choice);
    });
    return button;
  });
  container.replaceChildren(...buttons);
}
