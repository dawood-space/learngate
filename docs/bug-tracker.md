# LearnGate Bug Tracker

## Severity Legend
- **P0 (Critical / Blocker):** Feature completely broken, security issue, or crash preventing core flow.
- **P1 (Major):** Key function impaired with workaround, or intermittent failure in unlock/lock sequence.
- **P2 (Minor / Cosmetic):** Visual inconsistency, minor text alignment, or non-blocking edge case.

---

## Active & Resolved Defect Log

| ID | Title | Component | Severity | Description & Reproduction | Expected Behavior | Actual Behavior / Status | Resolution / Prevention |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **BUG-01** | URL query parameters lost when parsing target | Lesson Page (`lesson.js`) | **P0** | Navigating to `https://www.youtube.com/watch?v=abc&t=10s` gets redirected. Using `new URLSearchParams(window.location.search).get("target")` cuts off `&t=10s`. | Target URL should preserve the entire original string including all query params and anchors. | **Resolved** | Per CONTRACT: `lesson.js` reads `target` as substring after the first `"target="`, avoiding `URLSearchParams` loss. |
| **BUG-02** | Background timeout timer killed by Service Worker idle | Background (`background.js`) | **P0** | In Manifest V3, background service workers shut down after 30 seconds of inactivity. In-memory `setTimeout` fails to relock after 10 minutes. | Relock must occur reliably after 10 minutes even if the browser service worker sleeps. | **Resolved** | Per CONTRACT: Background registers a persistent `chrome.alarms` named `"relock"` and listens to `chrome.alarms.onAlarm`. |
| **BUG-03** | Ollama CORS block from extension origin | AI Module (`ollama.js`) | **P1** | Chrome extension origin `chrome-extension://<id>` rejected by Ollama on Windows default configuration (HTTP 403 Forbidden). | Request to `http://localhost:11434/api/generate` should succeed. | **Resolved** | Documented requirement to set environment variable `OLLAMA_ORIGINS="*"` on Windows, and ensure `manifest.json` specifies `"host_permissions": ["http://localhost:11434/*"]`. |
| **BUG-04** | LLM output wraps JSON in Markdown code fences | AI Module (`ollama.js`) | **P1** | Qwen models often format JSON responses with ````json ... ````, causing standard `JSON.parse()` to throw a SyntaxError. | Output must cleanly parse into the `Question[]` schema. | **Resolved** | Sanitization regex removes leading/trailing markdown blocks before calling `JSON.parse()`. |
| **BUG-05** | Question bank exhausted during repeated quizzes | Lesson Page (`lesson.js`) | **P2** | If the question bank contains fewer than 3 questions or if user repeats quizzes rapidly, questions could duplicate or crash UI. | Lesson should gracefully pick available questions or prompt user to add more notes in popup. | **Resolved** | Validate question count before starting quiz. If `questionBank.length < 3`, display friendly banner prompting note generation. |
| **BUG-06** | Model hallucinating source sentences | AI Module (`ollama.js`) | **P1** | Model paraphrases the source sentence instead of copying it verbatim from notes, breaking contract validation. | `sourceSentence` must be an exact substring of the original user notes. | **Resolved** | `validateQuestion(q, notes)` checks `notes.includes(q.sourceSentence.trim())`. Paraphrased questions are rejected and retried. |
| **BUG-07** | Target URL missing or invalid on direct navigation | Lesson Page (`lesson.js`) | **P2** | User opens `lesson.html` directly without a `?target=` parameter. | Page should not break with `undefined` redirect. | **Resolved** | Per CONTRACT: If target is missing, "Continue" redirects to `https://` + the first entry in `blockedSites` (e.g. `https://instagram.com`). |

---

## Bug Reporting Template for Team Members
When logging a new bug, copy and complete this block:
```markdown
### [BUG-XX] Short descriptive title
* **Component:** [Popup / Lesson / Background / Ollama]
* **Severity:** [P0 / P1 / P2]
* **Steps to Reproduce:**
  1. ...
  2. ...
* **Expected Result:** ...
* **Actual Result:** ...
* **Console Logs / Error Messages:** (paste exact output)
* **Proposed Fix:** ...
```
