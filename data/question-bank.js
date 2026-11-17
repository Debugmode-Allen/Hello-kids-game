import chinese1 from "./questions/chinese-grade-1.js";
import chinese2 from "./questions/chinese-grade-2.js";
import chinese3 from "./questions/chinese-grade-3.js";
import english3 from "./questions/english-grade-3.js";
import english4 from "./questions/english-grade-4.js";
import english5 from "./questions/english-grade-5.js";
import math3 from "./questions/math-grade-3.js";
import math4 from "./questions/math-grade-4.js";
import math5 from "./questions/math-grade-5.js";

function makeSubject(subject, grades) {
  return Object.fromEntries(Object.entries(grades).map(([grade, questions]) => [
    grade,
    questions.map(([question, answer, ...distractors]) => ({
      subject, grade: Number(grade), question, answer, options: [answer, ...distractors]
    }))
  ]));
}

export const questionBank = {
  chinese: makeSubject("中文", { 1: chinese1, 2: chinese2, 3: chinese3 }),
  english: makeSubject("English", { 3: english3, 4: english4, 5: english5 }),
  math: makeSubject("数学", { 3: math3, 4: math4, 5: math5 })
};
