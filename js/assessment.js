import { questionBank } from "../data/question-bank.js";

const subjects = Object.keys(questionBank);
const gradesFor = (subject) => Object.keys(questionBank[subject]).map(Number);
const hatchSchedule = Array.from({ length: 3 }, () => subjects).flat().concat("math");
const levelSchedule = Array.from({ length: 4 }, () => subjects).flat();

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
  return createAssessment(hatchSchedule, random);
}

export function createLevelAssessment(random = Math.random) {
  return createAssessment(levelSchedule, random);
}

function createAssessment(schedule, random) {
  const total = schedule.length;
  const answers = [];
  const levels = {};
  const tracks = Object.fromEntries(subjects.map((subject) => {
    const pools = Object.fromEntries(gradesFor(subject).map((grade) => [
      grade, shuffle(questionBank[subject][grade], random)
    ]));
    const lastIndex = schedule.lastIndexOf(subject);
    return [subject, { pools, lastIndex, levelIndex: 0 }];
  }));
  let current;

  function next() {
    if (answers.length === total) return null;
    if (current) return current;
    const subject = schedule[answers.length];
    const track = tracks[subject];
    const grade = gradesFor(subject)[track.levelIndex];
    current = prepareQuestion(track.pools[grade].pop(), random);
    return current;
  }

  function answer(choice) {
    if (!current || !current.options.includes(choice)) throw new Error("Invalid answer");
    const questionIndex = answers.length;
    const subject = schedule[questionIndex];
    const track = tracks[subject];
    const grades = gradesFor(subject);
    const correct = choice === current.answer;
    answers.push({ subject: current.subject, grade: current.grade, correct });
    current = null;
    const nextIndex = Math.max(0, Math.min(grades.length - 1, track.levelIndex + (correct ? 1 : -1)));
    if (questionIndex === track.lastIndex) {
      // Never recommend an untested grade.
      levels[subject] = grades[Math.min(nextIndex, track.levelIndex)];
    } else {
      track.levelIndex = nextIndex;
    }
    return correct;
  }

  return { total, answers, levels, next, answer };
}
