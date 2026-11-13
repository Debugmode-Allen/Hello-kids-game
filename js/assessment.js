import { questionBank } from "../data/question-bank.js";

const choose = (items, count) => [...items].sort(() => Math.random() - 0.5).slice(0, count);

export function createAssessment() {
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
