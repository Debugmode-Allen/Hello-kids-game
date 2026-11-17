import { questionBank } from "../data/question-bank.js";

const subjects = Object.keys(questionBank);
const gradesFor = (subject) => Object.keys(questionBank[subject]).map(Number);
const questionsPerSubject = 6;
const questionsPerBlock = 2;

function shuffle(items, random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

function prepareQuestion(question, random) {
  return { ...question, options: shuffle(question.options, random) };
}

export function createChargeQuestions(progress = {}, random = Math.random) {
  return shuffle(subjects, random).map((subject) => {
    const grades = gradesFor(subject);
    const saved = Number(progress?.[subject + "Level"]);
    const grade = grades.includes(saved) ? saved : grades[0];
    const pool = questionBank[subject][grade];
    return prepareQuestion(pool[Math.floor(random() * pool.length)], random);
  });
}

export function createAdaptiveAssessment(random = Math.random) {
  const total = subjects.length * questionsPerSubject;
  const answers = [];
  const levels = {};
  const tracks = Object.fromEntries(subjects.map((subject) => {
    const pools = Object.fromEntries(gradesFor(subject).map((grade) => [
      grade, shuffle(questionBank[subject][grade], random)
    ]));
    return [subject, { pools, levelIndex: 0, correctInBlock: 0 }];
  }));
  let current;

  function next() {
    if (answers.length === total) return null;
    if (current) return current;
    const subject = subjects[answers.length % subjects.length];
    const track = tracks[subject];
    const grade = gradesFor(subject)[track.levelIndex];
    current = prepareQuestion(track.pools[grade].pop(), random);
    return current;
  }

  function answer(choice) {
    if (!current || !current.options.includes(choice)) throw new Error("Invalid answer");
    const subject = subjects[answers.length % subjects.length];
    const track = tracks[subject];
    const grades = gradesFor(subject);
    const correct = choice === current.answer;
    answers.push({ subject: current.subject, grade: current.grade, correct });
    track.correctInBlock += Number(correct);
    current = null;

    const subjectCount = Math.floor((answers.length - 1) / subjects.length) + 1;
    if (subjectCount % questionsPerBlock === 0) {
      const step = track.correctInBlock === questionsPerBlock ? 1 : track.correctInBlock === 0 ? -1 : 0;
      const nextIndex = Math.max(0, Math.min(grades.length - 1, track.levelIndex + step));
      if (subjectCount === questionsPerSubject) {
        // Never recommend an untested grade.
        levels[subject] = grades[Math.min(nextIndex, track.levelIndex)];
      } else {
        track.levelIndex = nextIndex;
      }
      track.correctInBlock = 0;
    }
    return correct;
  }

  return { total, answers, levels, next, answer };
}
