# LearnGate Manual Test Plan

## 1. Overview
LearnGate is a Manifest V3 Chrome Extension operating in conjunction with a local Ollama instance running `qwen3:4b`. Because browser extensions with background service workers and declarativeNetRequest rules require runtime browser execution, manual testing in Google Chrome on Windows is required. This document provides clear, reproducible step-by-step procedures.

---

## 2. Test Environment Setup
1. **Ollama Verification:**
   - Open PowerShell and run: `ollama list`
   - Verify that `qwen3:4b` is listed.
   - Run: `curl http://localhost:11434/api/tags`
   - Ensure the server responds with HTTP 200.
2. **Chrome Extension Loading:**
   - Open Chrome and navigate to `chrome://extensions/`.
   - Enable **Developer mode** (toggle in the top-right corner).
   - Click **Load unpacked** and select the extension directory (`hack 1/extension` or workspace root depending on structure).
   - Confirm LearnGate appears without errors. Note the generated Extension ID.

---

## 3. Test Matrix

### Test Case TC-01: Extension Installation & Default Storage
* **Objective:** Ensure defaults are populated in `chrome.storage.local` upon initial install.
* **Steps:**
  1. Inspect the background service worker from `chrome://extensions/`.
  2. In the DevTools console, run:
     `chrome.storage.local.get(null, console.log)`
* **Expected Result:**
  - `blockedSites` is `["instagram.com", "youtube.com/shorts"]`.
  - `settings` is `{ unlockMinutes: 10, questionsPerLesson: 3, passMark: 2 }`.
  - `unlockUntil` is `0`.
  - `stats_blocks` is `0`.

---

### Test Case TC-02: Popup Ollama Connection & Note Saving
* **Objective:** Verify popup correctly checks Ollama and stores user notes.
* **Steps:**
  1. Click the LearnGate icon in the Chrome toolbar.
  2. Confirm Ollama status indicator displays green ("Ollama ready, qwen3:4b found").
  3. Copy text from `samples/biology-mitosis.txt` and paste into the Notes textarea.
  4. Click "Save Notes".
  5. Close and reopen the popup.
* **Expected Result:**
  - Notes remain populated in the textarea.
  - `chrome.storage.local.get("notes")` contains the saved string.

---

### Test Case TC-03: Question Generation & Bank Storage
* **Objective:** Verify local AI generates questions conforming strictly to the contract.
* **Steps:**
  1. With notes saved in the popup, click "Generate Questions".
  2. Observe progress indicator / status messages.
  3. Inspect storage: `chrome.storage.local.get(["questionBank", "bankMeta"], console.log)`.
* **Expected Result:**
  - `questionBank` is an array of question objects.
  - Each question object matches the contract:
    - `id`: string (e.g. `q-...`)
    - `question`: non-empty string
    - `options`: array of exactly 4 distinct strings
    - `answerIndex`: integer (0, 1, 2, or 3)
    - `sourceSentence`: exact verbatim sentence found within the notes
  - `bankMeta` records `generatedAt`, `model` ("qwen3:4b"), `generationSeconds`, `requested`, `accepted`, `rejected`.

---

### Test Case TC-04: Distracting Site Interception & Redirection
* **Objective:** Verify opening a blocked site redirects to the lesson page with the raw target URL preserved.
* **Steps:**
  1. Ensure extension is locked (`unlockUntil` = 0).
  2. In a new tab, navigate to `https://www.instagram.com/explore/`.
* **Expected Result:**
  - Navigation is intercepted.
  - Browser redirects to:
    `chrome-extension://<id>/lesson/lesson.html?target=https://www.instagram.com/explore/`
  - Target URL parameter preserves any query strings (`?` or `&`) without truncation.
  - Background receives `LESSON_OPENED` and increments `stats_blocks`.

---

### Test Case TC-05: Lesson Page Quiz - Passing Scenario
* **Objective:** Verify answering at least 2 of 3 questions correctly unlocks access for 10 minutes.
* **Steps:**
  1. On the redirected lesson page, observe 3 questions loaded from `questionBank`.
  2. Answer at least 2 questions correctly and submit.
  3. Observe feedback showing correct/incorrect status and verbatim `sourceSentence`.
  4. Click the "Continue" button.
* **Expected Result:**
  - `LESSON_PASSED` message sent to background.
  - Background sets `unlockUntil` = Current Time + 10 minutes (`10 * 60 * 1000` ms).
  - Background temporarily disables blocking rules and creates a `"relock"` alarm.
  - "Continue" navigates the tab directly to the original target URL (`https://www.instagram.com/explore/`).
  - Navigating back to Instagram within the 10-minute window loads normally without redirection.

---

### Test Case TC-06: Lesson Page Quiz - Failing Scenario
* **Objective:** Verify scoring less than 2 out of 3 keeps the site locked.
* **Steps:**
  1. Open a new lesson page.
  2. Intentionally select incorrect answers so score is 0 or 1 out of 3.
  3. Submit answers.
* **Expected Result:**
  - Lesson page displays failure message ("Passed 1/3. You need 2/3 to unlock.").
  - No `LESSON_PASSED` message is sent.
  - Site remains locked (`unlockUntil` remains 0 or unchanged).
  - Retry button allows re-attempting questions.

---

### Test Case TC-07: Emergency Pass (P1)
* **Objective:** Verify 5-minute emergency unlock functions only once per calendar day.
* **Steps:**
  1. While locked, click "Emergency Unlock (5 min)" on the lesson page.
  2. Observe unlock state and timer.
  3. Refresh or attempt to use Emergency Unlock a second time on the same calendar day.
* **Expected Result:**
  - First use: Background replies `{ ok: true, unlockUntil: <now + 5 min> }` and increments `stats_emergencyUses`.
  - Second use on same day: Background replies `{ ok: false, reason: "already used today" }`. Clear warning message displayed in UI.

---

### Test Case TC-08: Automatic Relock Alarm Expiry
* **Objective:** Verify that after 10 minutes (or test alarm interval), the site is automatically locked again.
* **Steps:**
  1. Unlock a site via successful quiz pass.
  2. In DevTools console, verify alarm exists:
     `chrome.alarms.get("relock", console.log)`
  3. Wait 10 minutes (or simulate alarm trigger: `chrome.alarms.clear("relock"); chrome.runtime.sendMessage({type:"RELOCK_NOW"})` if testing hook present, or inspect when time expires).
  4. Navigate to `https://www.instagram.com/`.
* **Expected Result:**
  - `unlockUntil` is reset or checked against current timestamp.
  - Blocking rules are reactivated.
  - Browser is redirected to `lesson.html`.

---

### Test Case TC-09: Ollama Failure & Offline Behavior
* **Objective:** Verify graceful degradation when Ollama is stopped.
* **Steps:**
  1. Stop the Ollama service or terminate the background Ollama process.
  2. Open the LearnGate popup and click "Check Ollama" or attempt to generate questions.
* **Expected Result:**
  - Clear, user-friendly error message: "Cannot connect to Ollama at http://localhost:11434. Please ensure Ollama is running."
  - The extension never silently switches to cloud models or unverified APIs.
  - Blocked sites remain strictly locked.
