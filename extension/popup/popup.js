/**
 * LearnGate Extension Popup Controller
 * Manages study notes, triggers local Ollama AI question generation,
 * edits blocked sites list, and displays lock/unlock status.
 */

import { checkOllama, generateQuestions, MODEL } from "../ollama.js";

// DOM Elements
const statusIndicator = document.getElementById("statusIndicator");
const statusText = document.getElementById("statusText");

const lockStatusBar = document.getElementById("lockStatusBar");
const lockStateIcon = document.getElementById("lockStateIcon");
const lockStateTitle = document.getElementById("lockStateTitle");
const lockStateDesc = document.getElementById("lockStateDesc");

const notesInput = document.getElementById("notesInput");
const notesCharCount = document.getElementById("notesCharCount");
const btnSaveNotes = document.getElementById("btnSaveNotes");
const btnGenerate = document.getElementById("btnGenerate");
const notesAlert = document.getElementById("notesAlert");

const generationProgress = document.getElementById("generationProgress");
const progressBar = document.getElementById("progressBar");
const progressMessage = document.getElementById("progressMessage");

const bankCountBadge = document.getElementById("bankCountBadge");
const metaModel = document.getElementById("metaModel");
const metaTime = document.getElementById("metaTime");
const metaDuration = document.getElementById("metaDuration");
const metaAcceptRatio = document.getElementById("metaAcceptRatio");
const questionList = document.getElementById("questionList");

const newSiteInput = document.getElementById("newSiteInput");
const btnAddSite = document.getElementById("btnAddSite");
const siteList = document.getElementById("siteList");
const siteAlert = document.getElementById("siteAlert");

const statBlocks = document.getElementById("statBlocks");
const statPasses = document.getElementById("statPasses");
const statFailures = document.getElementById("statFailures");
const statEmergency = document.getElementById("statEmergency");

let unlockTimerInterval = null;

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", async () => {
  setupTabs();
  setupEventListeners();
  await loadStorageData();
  await refreshOllamaStatus();
});

/**
 * 1. TAB NAVIGATION
 */
function setupTabs() {
  const tabs = [
    { btn: document.getElementById("tabBtnNotes"), content: document.getElementById("tabNotes") },
    { btn: document.getElementById("tabBtnBank"), content: document.getElementById("tabBank") },
    { btn: document.getElementById("tabBtnSites"), content: document.getElementById("tabSites") },
    { btn: document.getElementById("tabBtnStats"), content: document.getElementById("tabStats") }
  ];

  tabs.forEach(({ btn, content }) => {
    btn.addEventListener("click", () => {
      tabs.forEach(t => {
        t.btn.classList.remove("active");
        t.content.classList.remove("active");
      });
      btn.classList.add("active");
      content.classList.add("active");
    });
  });
}

/**
 * 2. EVENT LISTENERS
 */
function setupEventListeners() {
  // Notes character count
  notesInput.addEventListener("input", () => {
    notesCharCount.textContent = `${notesInput.value.length} characters`;
  });

  // Save notes button
  btnSaveNotes.addEventListener("click", async () => {
    const text = notesInput.value.trim();
    await chrome.storage.local.set({ notes: text });
    showAlert(notesAlert, "Notes saved locally!", "alert-success");
  });

  // Generate questions button
  btnGenerate.addEventListener("click", handleGenerateQuestions);

  // Add blocked site
  btnAddSite.addEventListener("click", handleAddSite);
  newSiteInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleAddSite();
  });
}

/**
 * 3. STORAGE & STATUS REFRESH
 */
async function loadStorageData() {
  const data = await chrome.storage.local.get([
    "notes",
    "questionBank",
    "bankMeta",
    "blockedSites",
    "unlockUntil",
    "stats_blocks",
    "stats_passes",
    "stats_failures",
    "stats_emergencyUses"
  ]);

  // Populate Notes
  if (data.notes) {
    notesInput.value = data.notes;
    notesCharCount.textContent = `${data.notes.length} characters`;
  }

  // Populate Question Bank & Meta
  renderQuestionBank(data.questionBank || [], data.bankMeta);

  // Populate Blocked Sites
  const sites = data.blockedSites || ["instagram.com", "youtube.com/shorts"];
  renderBlockedSites(sites);

  // Populate Stats
  statBlocks.textContent = data.stats_blocks || 0;
  statPasses.textContent = data.stats_passes || 0;
  statFailures.textContent = data.stats_failures || 0;
  statEmergency.textContent = data.stats_emergencyUses || 0;

  // Check Unlock Status
  updateLockStatus(data.unlockUntil || 0);
}

/**
 * Display live countdown if unlocked, or locked state if locked.
 */
function updateLockStatus(unlockUntil) {
  if (unlockTimerInterval) {
    clearInterval(unlockTimerInterval);
    unlockTimerInterval = null;
  }

  const checkState = () => {
    const now = Date.now();
    if (unlockUntil && unlockUntil > now) {
      const remainingSec = Math.max(0, Math.floor((unlockUntil - now) / 1000));
      const mins = Math.floor(remainingSec / 60);
      const secs = remainingSec % 60;
      
      lockStatusBar.className = "lock-banner is-unlocked";
      lockStateIcon.textContent = "🔓";
      lockStateTitle.textContent = "Sites Temporarily Unlocked";
      lockStateDesc.textContent = `Time remaining: ${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
    } else {
      lockStatusBar.className = "lock-banner is-locked";
      lockStateIcon.textContent = "🔒";
      lockStateTitle.textContent = "Distracting Sites Locked";
      lockStateDesc.textContent = "Pass a 3-question quiz to unlock for 10 minutes";
      if (unlockTimerInterval) {
        clearInterval(unlockTimerInterval);
        unlockTimerInterval = null;
      }
    }
  };

  checkState();
  if (unlockUntil && unlockUntil > Date.now()) {
    unlockTimerInterval = setInterval(checkState, 1000);
  }
}

/**
 * 4. OLLAMA STATUS CHECK
 */
async function refreshOllamaStatus() {
  statusIndicator.className = "status-badge status-checking";
  statusText.textContent = "Checking Ollama...";

  try {
    const res = await checkOllama();
    if (res.ok && res.modelInstalled) {
      statusIndicator.className = "status-badge status-ready";
      statusText.textContent = `Ollama (${MODEL})`;
    } else if (res.ok && !res.modelInstalled) {
      statusIndicator.className = "status-badge status-warning";
      statusText.textContent = `Model ${MODEL} missing`;
      showAlert(notesAlert, `Ollama is running, but ${MODEL} is missing. In terminal: "ollama pull ${MODEL}"`, "alert-warning");
    } else {
      statusIndicator.className = "status-badge status-error";
      statusText.textContent = "Ollama offline";
      showAlert(notesAlert, res.hint || "Ollama is not running. Start it with 'ollama serve'.", "alert-error");
    }
  } catch (err) {
    statusIndicator.className = "status-badge status-error";
    statusText.textContent = "Ollama error";
  }
}

/**
 * 5. QUESTION GENERATION PIPELINE
 */
async function handleGenerateQuestions() {
  const notes = notesInput.value.trim();
  if (!notes) {
    showAlert(notesAlert, "Please paste your study notes before generating questions.", "alert-error");
    return;
  }

  if (notes.length < 50) {
    showAlert(notesAlert, "Notes are very brief. Add at least a few sentences for better questions.", "alert-warning");
  }

  // Save notes first
  await chrome.storage.local.set({ notes });

  // Disable UI and show progress bar
  btnGenerate.disabled = true;
  btnSaveNotes.disabled = true;
  generationProgress.classList.remove("hidden");
  progressBar.style.width = "10%";
  progressMessage.textContent = "Connecting to local Ollama instance...";
  hideAlert(notesAlert);

  try {
    const result = await generateQuestions(notes, {
      count: 9,
      perCall: 3,
      onProgress: (status) => {
        const percent = Math.min(95, Math.round((status.accepted / 9) * 100) + 15);
        progressBar.style.width = `${percent}%`;
        progressMessage.textContent = `Generated ${status.accepted} of 9 questions (${status.rejected} retried)...`;
      }
    });

    progressBar.style.width = "100%";
    progressMessage.textContent = `Complete! Generated ${result.questions.length} questions in ${result.seconds}s.`;

    // Save strictly to contract keys
    const bankMeta = {
      generatedAt: Date.now(),
      model: MODEL,
      generationSeconds: result.seconds,
      requested: result.requested,
      accepted: result.accepted,
      rejected: result.rejected
    };

    await chrome.storage.local.set({
      questionBank: result.questions,
      bankMeta: bankMeta
    });

    // Refresh Question Bank tab UI
    renderQuestionBank(result.questions, bankMeta);
    showAlert(notesAlert, `Successfully generated ${result.questions.length} questions from your notes!`, "alert-success");

    setTimeout(() => {
      generationProgress.classList.add("hidden");
    }, 2500);

  } catch (err) {
    console.error("Question generation failed:", err);
    progressBar.style.width = "0%";
    const msg = err.userMessage || err.message || "Failed to generate questions. Verify Ollama is running.";
    showAlert(notesAlert, msg, "alert-error");
    generationProgress.classList.add("hidden");
  } finally {
    btnGenerate.disabled = false;
    btnSaveNotes.disabled = false;
  }
}

/**
 * 6. RENDER QUESTION BANK
 */
function renderQuestionBank(questions, meta) {
  bankCountBadge.textContent = `${questions.length} questions`;

  if (meta) {
    metaModel.textContent = meta.model || MODEL;
    metaTime.textContent = meta.generatedAt ? new Date(meta.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Never";
    metaDuration.textContent = meta.generationSeconds ? `${meta.generationSeconds}s` : "--";
    metaAcceptRatio.textContent = meta.accepted ? `${meta.accepted} accepted / ${meta.rejected || 0} rejected` : "--";
  }

  questionList.innerHTML = "";
  if (!questions || questions.length === 0) {
    questionList.innerHTML = `<p class="empty-state">No questions generated yet. Paste notes in the Study Notes tab and click Generate.</p>`;
    return;
  }

  questions.forEach((q, idx) => {
    const card = document.createElement("div");
    card.className = "question-card";
    card.innerHTML = `
      <span class="q-text">${idx + 1}. ${escapeHtml(q.question)}</span>
      <span class="q-source">Source: "${escapeHtml(q.sourceSentence)}"</span>
    `;
    questionList.appendChild(card);
  });
}

/**
 * 7. BLOCKED SITES MANAGEMENT
 */
async function handleAddSite() {
  let site = newSiteInput.value.trim().toLowerCase();
  if (!site) return;

  // Clean domain input (remove protocol or leading/trailing slashes)
  site = site.replace(/^https?:\/\//, "").replace(/\/+$/, "");

  if (!site) {
    showSiteAlert("Please enter a valid website domain or path.");
    return;
  }

  const data = await chrome.storage.local.get(["blockedSites"]);
  const currentSites = data.blockedSites || ["instagram.com", "youtube.com/shorts"];

  if (currentSites.includes(site)) {
    showSiteAlert("Site is already in the blocked list.");
    return;
  }

  currentSites.push(site);
  await chrome.storage.local.set({ blockedSites: currentSites });
  newSiteInput.value = "";
  hideSiteAlert();
  renderBlockedSites(currentSites);
}

async function handleDeleteSite(siteToRemove) {
  const data = await chrome.storage.local.get(["blockedSites"]);
  let currentSites = data.blockedSites || ["instagram.com", "youtube.com/shorts"];
  currentSites = currentSites.filter(s => s !== siteToRemove);

  await chrome.storage.local.set({ blockedSites: currentSites });
  renderBlockedSites(currentSites);
}

function renderBlockedSites(sites) {
  siteList.innerHTML = "";
  if (!sites || sites.length === 0) {
    siteList.innerHTML = `<li class="empty-state">No sites blocked. Add one above!</li>`;
    return;
  }

  sites.forEach(site => {
    const li = document.createElement("li");
    li.className = "site-item";
    li.innerHTML = `
      <span class="site-name">${escapeHtml(site)}</span>
      <button class="site-delete-btn" title="Remove site" type="button">&times;</button>
    `;
    li.querySelector(".site-delete-btn").addEventListener("click", () => handleDeleteSite(site));
    siteList.appendChild(li);
  });
}

function showSiteAlert(msg) {
  siteAlert.textContent = msg;
  siteAlert.classList.remove("hidden");
}

function hideSiteAlert() {
  siteAlert.classList.add("hidden");
}

/**
 * 8. UTILITIES
 */
function showAlert(el, msg, typeClass) {
  el.textContent = msg;
  el.className = `alert-box ${typeClass}`;
  el.classList.remove("hidden");
}

function hideAlert(el) {
  el.classList.add("hidden");
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}
