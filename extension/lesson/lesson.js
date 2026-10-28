/**
 * LearnGate Lesson Gate Controller
 * Intercepts distracted browsing, delivers a 3-question recall quiz from notes,
 * verifies answers against source sentences, and manages 10-min or emergency unlocks.
 */

// DOM Elements
const targetUrlDisplay = document.getElementById("targetUrlDisplay");
const emptyBankView = document.getElementById("emptyBankView");
const quizView = document.getElementById("quizView");
const quizForm = document.getElementById("quizForm");
const quizResults = document.getElementById("quizResults");
const resultsBanner = document.getElementById("resultsBanner");
const resultsIcon = document.getElementById("resultsIcon");
const resultsTitle = document.getElementById("resultsTitle");
const resultsDesc = document.getElementById("resultsDesc");
const btnSubmitQuiz = document.getElementById("btnSubmitQuiz");
const btnContinue = document.getElementById("btnContinue");
const btnRetryQuiz = document.getElementById("btnRetryQuiz");
const btnRefreshLesson = document.getElementById("btnRefreshLesson");
const btnEmergencyPass = document.getElementById("btnEmergencyPass");
const emergencyAlert = document.getElementById("emergencyAlert");

// Quiz State
let rawTargetUrl = "";
let resolvedContinueUrl = "https://instagram.com";
let currentQuestions = [];
let passMark = 2;
let questionsPerLesson = 3;

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Notify background that a lesson page was opened (increments stats_blocks)
  try {
    await chrome.runtime.sendMessage({ type: "LESSON_OPENED" });
  } catch (err) {
    console.warn("Could not notify background of LESSON_OPENED:", err);
  }

  // 2. Resolve Target URL per Contract
  resolveTargetUrl();

  // 3. Setup event listeners
  setupEventListeners();

  // 4. Load quiz settings and questions
  await loadQuizData();
});

/**
 * 1. RESOLVE TARGET URL PER CONTRACT
 * Contract: "reads 'target' as everything after the first 'target='
 * (do NOT use URLSearchParams, because the original URL may contain & or ?).
 * If target is missing or invalid, 'Continue' goes to https:// plus the first blockedSites entry."
 */
function resolveTargetUrl() {
  const fullHref = window.location.href;
  const targetIndex = fullHref.indexOf("target=");

  if (targetIndex !== -1) {
    // Extract everything after the first 'target='
    rawTargetUrl = fullHref.substring(targetIndex + 7);
  }

  if (rawTargetUrl && (rawTargetUrl.startsWith("http://") || rawTargetUrl.startsWith("https://"))) {
    resolvedContinueUrl = rawTargetUrl;
    targetUrlDisplay.textContent = rawTargetUrl;
    targetUrlDisplay.title = rawTargetUrl;
  } else {
    targetUrlDisplay.textContent = "Default Blocked Site";
    resolvedContinueUrl = ""; // Will fallback to first blocked site
  }
}

/**
 * 2. SETUP LISTENERS
 */
function setupEventListeners() {
  btnSubmitQuiz.addEventListener("click", handleSubmitQuiz);
  
  btnContinue.addEventListener("click", () => {
    window.location.href = resolvedContinueUrl;
  });

  btnRetryQuiz.addEventListener("click", () => {
    window.location.reload();
  });

  if (btnRefreshLesson) {
    btnRefreshLesson.addEventListener("click", () => {
      window.location.reload();
    });
  }

  btnEmergencyPass.addEventListener("click", handleEmergencyPass);
}

/**
 * 3. LOAD QUIZ DATA & STORAGE
 */
async function loadQuizData() {
  const data = await chrome.storage.local.get([
    "questionBank",
    "settings",
    "blockedSites"
  ]);

  // Fallback for continue URL if target is missing
  const sites = data.blockedSites || ["instagram.com", "youtube.com/shorts"];
  if (!resolvedContinueUrl) {
    resolvedContinueUrl = "https://" + sites[0];
    targetUrlDisplay.textContent = resolvedContinueUrl;
  }

  // Settings
  const settings = data.settings || { unlockMinutes: 10, questionsPerLesson: 3, passMark: 2 };
  passMark = settings.passMark || 2;
  questionsPerLesson = settings.questionsPerLesson || 3;

  const bank = data.questionBank || [];

  // Contract check: if question bank has fewer than 3 questions, prompt user
  if (bank.length < questionsPerLesson) {
    emptyBankView.classList.remove("hidden");
    quizView.classList.add("hidden");
    return;
  }

  // Pick random subset of questions
  currentQuestions = selectRandomQuestions(bank, questionsPerLesson);
  renderQuiz(currentQuestions);
}

/**
 * Randomly pick N items from array without replacement
 */
function selectRandomQuestions(bank, count) {
  const shuffled = [...bank].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * 4. RENDER QUIZ
 */
function renderQuiz(questions) {
  quizForm.innerHTML = "";

  questions.forEach((q, qIdx) => {
    const block = document.createElement("div");
    block.className = "question-block";
    block.id = `qblock_${qIdx}`;

    const promptEl = document.createElement("div");
    promptEl.className = "question-prompt";
    promptEl.innerHTML = `<span class="question-number">Question ${qIdx + 1}:</span> ${escapeHtml(q.question)}`;
    block.appendChild(promptEl);

    const optionsGrid = document.createElement("div");
    optionsGrid.className = "options-grid";

    q.options.forEach((optText, optIdx) => {
      const label = document.createElement("label");
      label.className = "option-label";
      label.id = `q_${qIdx}_opt_${optIdx}`;

      label.innerHTML = `
        <input type="radio" name="q_${qIdx}" value="${optIdx}" class="option-radio">
        <span class="option-text">${escapeHtml(optText)}</span>
      `;
      optionsGrid.appendChild(label);
    });

    block.appendChild(optionsGrid);
    quizForm.appendChild(block);
  });
}

/**
 * 5. SUBMIT QUIZ & SCORE
 */
async function handleSubmitQuiz() {
  hideEmergencyAlert();

  // Validate that all questions were answered
  let answeredAll = true;
  for (let i = 0; i < currentQuestions.length; i++) {
    const selected = quizForm.querySelector(`input[name="q_${i}"]:checked`);
    if (!selected) {
      answeredAll = false;
      const block = document.getElementById(`qblock_${i}`);
      block.style.borderColor = "var(--danger)";
      setTimeout(() => { block.style.borderColor = "var(--border-card)"; }, 2000);
    }
  }

  if (!answeredAll) {
    alert("Please answer all questions before submitting.");
    return;
  }

  // Disable radio inputs
  const allRadios = quizForm.querySelectorAll("input[type='radio']");
  allRadios.forEach(r => r.disabled = true);
  btnSubmitQuiz.disabled = true;

  // Calculate score & highlight answers
  let score = 0;

  currentQuestions.forEach((q, qIdx) => {
    const selectedRadio = quizForm.querySelector(`input[name="q_${qIdx}"]:checked`);
    const selectedIdx = parseInt(selectedRadio.value, 10);
    const correctIdx = q.answerIndex;

    const block = document.getElementById(`qblock_${qIdx}`);
    const correctLabel = document.getElementById(`q_${qIdx}_opt_${correctIdx}`);
    const selectedLabel = document.getElementById(`q_${qIdx}_opt_${selectedIdx}`);

    if (selectedIdx === correctIdx) {
      score++;
      correctLabel.classList.add("is-correct");
    } else {
      if (selectedLabel) selectedLabel.classList.add("is-wrong");
      if (correctLabel) correctLabel.classList.add("is-correct");
    }

    // Append sourceSentence verbatim from notes
    const sourceBox = document.createElement("div");
    sourceBox.className = "source-sentence-box";
    sourceBox.innerHTML = `
      <span class="source-label">Source from your notes:</span>
      <span class="source-content">"${escapeHtml(q.sourceSentence)}"</span>
    `;
    block.appendChild(sourceBox);
  });

  // Check Pass / Fail
  const passed = score >= passMark;
  const storageData = await chrome.storage.local.get(["stats_passes", "stats_failures"]);

  if (passed) {
    // 1. Update stats_passes
    const currentPasses = (storageData.stats_passes || 0) + 1;
    await chrome.storage.local.set({ stats_passes: currentPasses });

    // 2. Send LESSON_PASSED to background per contract
    try {
      const resp = await chrome.runtime.sendMessage({ type: "LESSON_PASSED" });
      console.log("LESSON_PASSED acknowledged:", resp);
    } catch (err) {
      console.error("Failed to notify background:", err);
    }

    // 3. Show Success Results
    resultsBanner.className = "results-banner pass";
    resultsIcon.textContent = "🎉";
    resultsTitle.textContent = `Lesson Passed! (${score} / ${currentQuestions.length} Correct)`;
    resultsDesc.textContent = "Awesome recall! The site is now unlocked for 10 minutes. Click Continue to proceed.";
    quizResults.classList.remove("hidden");

    btnSubmitQuiz.classList.add("hidden");
    btnContinue.classList.remove("hidden");
  } else {
    // 1. Update stats_failures
    const currentFailures = (storageData.stats_failures || 0) + 1;
    await chrome.storage.local.set({ stats_failures: currentFailures });

    // 2. Show Failure Results
    resultsBanner.className = "results-banner fail";
    resultsIcon.textContent = "⚠️";
    resultsTitle.textContent = `Keep Going! (${score} / ${currentQuestions.length} Correct)`;
    resultsDesc.textContent = `You need at least ${passMark} correct answers to earn access. Review the source sentences above and try another quiz.`;
    quizResults.classList.remove("hidden");

    btnSubmitQuiz.classList.add("hidden");
    btnRetryQuiz.classList.remove("hidden");
  }
}

/**
 * 6. EMERGENCY PASS (P1)
 * Sends { type: "EMERGENCY_PASS" } to background.
 * Reply: { ok: true, unlockUntil } or { ok: false, reason: "already used today" }
 */
async function handleEmergencyPass() {
  btnEmergencyPass.disabled = true;
  hideEmergencyAlert();

  try {
    const response = await chrome.runtime.sendMessage({ type: "EMERGENCY_PASS" });

    if (response && response.ok) {
      // Emergency unlock granted for 5 minutes
      resultsBanner.className = "results-banner pass";
      resultsIcon.textContent = "⏱️";
      resultsTitle.textContent = "Emergency Pass Granted!";
      resultsDesc.textContent = "Sites are unlocked for 5 minutes. Remember: you can only use this once per day.";
      quizResults.classList.remove("hidden");

      btnSubmitQuiz.classList.add("hidden");
      btnRetryQuiz.classList.add("hidden");
      btnContinue.classList.remove("hidden");
      btnEmergencyPass.textContent = "Emergency Pass Active";
    } else {
      const reason = (response && response.reason) ? response.reason : "already used today";
      showEmergencyAlert(`Emergency Pass unavailable: ${reason}.`);
      btnEmergencyPass.disabled = false;
    }
  } catch (err) {
    console.error("Emergency pass failed:", err);
    showEmergencyAlert("Could not activate emergency pass. Please verify background worker.");
    btnEmergencyPass.disabled = false;
  }
}

function showEmergencyAlert(msg) {
  emergencyAlert.textContent = msg;
  emergencyAlert.classList.remove("hidden");
}

function hideEmergencyAlert() {
  emergencyAlert.classList.add("hidden");
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}
