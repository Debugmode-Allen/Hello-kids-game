import { auth, db, onAuthStateChanged, doc, collection, getDoc, getDocs, runTransaction, serverTimestamp } from "./firebase.js?v=20261117-daily-practice";
import { loadUI, t } from "./i18n.js";
import { createSubjectPractice } from "./assessment.js?v=20261117-daily-practice";
import { checkinDay } from "./checkin-client.js?v=20261117-spark";
import { questionBank } from "../data/question-bank.js";

const $ = (id) => document.getElementById(id);
const subject = new URLSearchParams(location.search).get("subject");
const subjectConfig = {
  math: { label: "practice.math", attribute: "attack", attributeLabel: "home.attack", level: "mathLevel", minGrade: 3 },
  english: { label: "practice.english", attribute: "defense", attributeLabel: "home.defense", level: "englishLevel", minGrade: 3 },
  chinese: { label: "practice.chinese", attribute: "speed", attributeLabel: "home.speed", level: "chineseLevel", minGrade: 1 }
}[subject];

let currentUser = null;
let currentDragon = null;
let currentProgress = {};
let currentPracticeEntries = [];
let currentQuestions = [];
let currentAnswers = [];
let currentGrade = 1;
let questionIndex = 0;
let selectedAnswer = null;
let saving = false;

function practiceMetrics(entries) {
  const subjectEntries = entries.filter((entry) => entry.type === "subject-practice" && entry.subject === subject);
  const days = new Set(subjectEntries.map((entry) => entry.day).filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day)));
  const earned = subjectEntries.filter((entry) => entry.rewardGranted === true).length;
  const date = new Date(`${checkinDay()}T00:00:00Z`);
  const dateKey = () => date.toISOString().slice(0, 10);
  if (!days.has(dateKey())) date.setUTCDate(date.getUTCDate() - 1);
  let streak = 0;
  while (days.has(dateKey())) {
    streak++;
    date.setUTCDate(date.getUTCDate() - 1);
  }
  return { days: days.size, earned, streak };
}

async function loadPracticeMetrics() {
  const snapshot = await getDocs(collection(db, "users", currentUser.uid, "attempts"));
  currentPracticeEntries = snapshot.docs.map((entry) => entry.data());
  return practiceMetrics(currentPracticeEntries);
}

function renderPracticeMetrics(metrics) {
  const attribute = t(subjectConfig.attributeLabel);
  $("attributeInfo").textContent = t("training.totalEarned", { attribute, earned: metrics.earned });
  $("practiceHistory").textContent = t(metrics.streak ? "training.practiceStreak" : "training.practiceTotal", {
    streak: metrics.streak, days: metrics.days, earned: metrics.earned, attribute
  });
}

function renderDailyMessage(daily = null) {
  const attributeLabel = t(subjectConfig.attributeLabel);
  $("dailyStatus").textContent = daily?.rewardGranted
    ? t("training.dailyAwarded", { attribute: attributeLabel })
    : t("training.dailyAvailable", { attribute: attributeLabel });
}

async function loadToday() {
  const dailyRef = doc(db, "users", currentUser.uid, "trainingDays", `${checkinDay()}_${subject}`);
  const snapshot = await getDoc(dailyRef);
  renderDailyMessage(snapshot.exists() ? snapshot.data() : null);
  return snapshot.exists() ? snapshot.data() : null;
}

function showQuestion() {
  const question = currentQuestions[questionIndex];
  $("questionProgress").textContent = t("training.questionProgress", { current: questionIndex + 1 });
  $("questionText").textContent = question.question;
  $("selectPrompt").textContent = t("training.selectPrompt");
  const options = $("answerOptions"); options.replaceChildren();
  question.options.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `answer-option${selectedAnswer === option ? " selected" : ""}`;
    button.textContent = option;
    button.setAttribute("aria-pressed", selectedAnswer === option ? "true" : "false");
    button.addEventListener("click", () => {
      selectedAnswer = option;
      for (const choice of options.querySelectorAll(".answer-option")) {
        const chosen = choice === button;
        choice.classList.toggle("selected", chosen);
        choice.setAttribute("aria-pressed", String(chosen));
      }
      $("advanceButton").disabled = false;
      $("status").textContent = "";
    });
    options.append(button);
  });
  const advance = $("advanceButton");
  advance.textContent = t(questionIndex === 4 ? "training.submitSet" : "training.next");
  advance.disabled = selectedAnswer === null || saving;
}

function startSet() {
  try {
    const set = createSubjectPractice(subject, currentProgress);
    currentGrade = set.grade;
    currentQuestions = set.questions;
    currentAnswers = [];
    questionIndex = 0;
    selectedAnswer = null;
    saving = false;
    $("gradeInfo").textContent = t("training.grade", { grade: currentGrade });
    $("startPanel").hidden = true;
    $("resultPanel").hidden = true;
    $("questionPanel").hidden = false;
    $("questionProgress").hidden = false;
    $("status").textContent = "";
    showQuestion();
  } catch (error) {
    console.error("Unable to create subject practice", error);
    $("status").textContent = t("training.loadError");
  }
}

async function saveSet() {
  if (saving) return;
  saving = true;
  const advance = $("advanceButton");
  advance.disabled = true;
  advance.textContent = t("training.saving");
  $("status").textContent = t("training.saving");
  const score = currentAnswers.filter((answer) => answer.correct).length;
  const day = checkinDay();
  const dailyRef = doc(db, "users", currentUser.uid, "trainingDays", `${day}_${subject}`);
  const dragonRef = doc(db, "users", currentUser.uid, "dragon", "current");
  const sessionRef = doc(collection(db, "users", currentUser.uid, "attempts"));
  let result = null;
  let committed = false;

  try {
    result = await runTransaction(db, async (transaction) => {
      const [dailySnapshot, dragonSnapshot] = await Promise.all([
        transaction.get(dailyRef), transaction.get(dragonRef)
      ]);
      if (!dragonSnapshot.exists()) throw new Error("missing-dragon");
      const previous = dailySnapshot.exists() ? dailySnapshot.data() : {};
      const awardNow = score >= 4 && previous.rewardGranted !== true;
      const rewardGranted = previous.rewardGranted === true || awardNow;
      const config = subjectConfig;
      const oldAttribute = Number(dragonSnapshot.data()[config.attribute] ?? 10);
      const newAttribute = oldAttribute + (awardNow ? 1 : 0);
      const answers = currentAnswers.map(({ question, selected, correctAnswer, correct }) => ({
        question, selected, correctAnswer, correct
      }));

      transaction.set(dailyRef, {
        day,
        subject,
        attemptCount: (previous.attemptCount || 0) + 1,
        bestScore: Math.max(previous.bestScore || 0, score),
        lastScore: score,
        rewardGranted,
        lastSessionId: sessionRef.id,
        updatedAt: serverTimestamp()
      });
      transaction.set(sessionRef, {
        type: "subject-practice",
        day,
        subject,
        grade: currentGrade,
        score,
        total: 5,
        answers,
        rewardGranted: awardNow,
        completedAt: serverTimestamp()
      });
      if (awardNow) transaction.set(dragonRef, { [config.attribute]: newAttribute }, { merge: true });
      return { awardNow, rewardGranted, newAttribute, attempts: (previous.attemptCount || 0) + 1 };
    });
    committed = true;
    currentDragon[subjectConfig.attribute] = result.newAttribute;
    const metrics = await loadPracticeMetrics();
    renderPracticeMetrics(metrics);
    renderResult(score, result, metrics);
  } catch (error) {
    console.error("Unable to save subject practice", error);
    if (committed && result) {
      currentPracticeEntries = [...currentPracticeEntries, {
        type: "subject-practice", subject, day, rewardGranted: result.awardNow
      }];
      const metrics = practiceMetrics(currentPracticeEntries);
      renderPracticeMetrics(metrics);
      renderResult(score, result, metrics);
      return;
    }
    saving = false;
    advance.disabled = false;
    advance.textContent = t("training.submitSet");
    $("status").textContent = t("training.saveError");
  }
}

function renderResult(score, result, metrics) {
  const attribute = t(subjectConfig.attributeLabel);
  $("questionPanel").hidden = true;
  $("questionProgress").hidden = true;
  $("resultPanel").hidden = false;
  $("resultTitle").textContent = t("training.resultTitle");
  $("scoreText").textContent = t("training.score", { score });
  const resultKey = result.awardNow ? "training.awarded"
    : result.rewardGranted ? "training.alreadyAwarded" : "training.underThreshold";
  $("resultMessage").textContent = t(resultKey, { attribute });
  $("resultAttribute").textContent = t("training.totalEarned", { attribute, earned: metrics.earned });
  $("practiceHistory").textContent = t(metrics.streak ? "training.practiceStreak" : "training.practiceTotal", {
    streak: metrics.streak, days: metrics.days, earned: metrics.earned, attribute
  });
  $("resultDailyStatus").textContent = result.rewardGranted
    ? t("training.dailyAwarded", { attribute })
    : t("training.dailyAvailable", { attribute });
  $("status").textContent = "";
}

async function advanceQuestion() {
  if (currentAnswers.length === 5) {
    await saveSet();
    return;
  }
  if (selectedAnswer === null) {
    $("status").textContent = t("training.selectFirst");
    return;
  }
  const question = currentQuestions[questionIndex];
  currentAnswers.push({
    question: question.question,
    selected: selectedAnswer,
    correctAnswer: question.answer,
    correct: selectedAnswer === question.answer
  });
  if (questionIndex < 4) {
    questionIndex++;
    selectedAnswer = null;
    showQuestion();
    return;
  }
  await saveSet();
}

function configurePage() {
  const subjectName = t(subjectConfig.label);
  document.title = t("training.pageTitle", { subject: subjectName });
  $("pageTitle").textContent = t("training.pageTitle", { subject: subjectName });
  $("instructions").textContent = t("training.instructions");
  $("startButton").addEventListener("click", startSet);
  $("againButton").addEventListener("click", async () => {
    $("resultPanel").hidden = true;
    $("startPanel").hidden = false;
    $("status").textContent = "";
    try { await loadToday(); } catch (error) { console.warn("Unable to refresh daily practice status", error); }
  });
  $("advanceButton").addEventListener("click", advanceQuestion);
}

await loadUI();
document.querySelectorAll("[data-copy]").forEach((element) => {
  element.textContent = t(element.dataset.copy);
});
if (!subjectConfig) {
  location.replace("practice.html");
} else {
  configurePage();
  onAuthStateChanged(auth, async (user) => {
    if (!user) { location.replace("index.html"); return; }
    try {
      const [profileSnapshot, dragonSnapshot, progressSnapshot] = await Promise.all([
        getDoc(doc(db, "users", user.uid)),
        getDoc(doc(db, "users", user.uid, "dragon", "current")),
        getDoc(doc(db, "users", user.uid, "progress", "summary"))
      ]);
      if (profileSnapshot.data()?.role !== "child") { location.replace("home.html"); return; }
      if (!dragonSnapshot.exists()) { location.replace("journey.html"); return; }
      currentUser = user;
      currentDragon = dragonSnapshot.data();
      currentProgress = progressSnapshot.data() || {};
      const metrics = await loadPracticeMetrics();
      renderPracticeMetrics(metrics);
      const grades = Object.keys(questionBank[subject]).map(Number);
      const storedGrade = Number(currentProgress[subjectConfig.level]);
      const grade = grades.includes(storedGrade) ? storedGrade : grades[0];
      $("gradeInfo").textContent = t("training.grade", { grade });
      await loadToday();
      $("startButton").disabled = false;
    } catch (error) {
      console.error("Unable to initialize subject practice", error);
      $("status").textContent = t("training.loadError");
    }
  });
}
