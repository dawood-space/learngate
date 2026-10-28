# LearnGate Technical Limitations & Constraints

To maintain academic and engineering honesty before judges, this document outlines the verified limitations, hardware boundaries, and architectural constraints of LearnGate.

---

## 1. Local AI & Hardware Requirements
1. **Model Execution Overhead:**
   - LearnGate relies on `qwen3:4b` running through Ollama at `http://localhost:11434`.
   - On modern laptops with dedicated GPUs (e.g. NVIDIA RTX), generating a batch of 9 questions takes approximately 4–8 seconds.
   - On CPU-only laptops, generation can take 20–35 seconds. LearnGate addresses this by generating a persistent `questionBank` ahead of time rather than generating questions on-the-fly when a site is intercepted.
2. **RAM & Disk Footprint:**
   - Running Ollama with a 4-billion parameter quantized model requires approximately 3.5GB to 5GB of free system RAM and ~2.5GB of disk space.
3. **Model Hallucinations & Imperfections:**
   - While `validateQuestion` strictly filters for verbatim source sentences and 4 unique choices, small LLMs may occasionally draft trivial distractors or slightly awkward question phrasing.
   - Users are explicitly alerted that questions are AI-generated and can contain minor imperfections.

---

## 2. Browser & Manifest V3 Constraints
1. **Service Worker Lifecycle:**
   - Manifest V3 extensions no longer have persistent background pages. Service workers shut down after 30 seconds of inactivity.
   - Standard JavaScript `setTimeout` and `setInterval` cannot be used for the 10-minute unlock timer. LearnGate uses `chrome.alarms` with persistent storage timestamps (`unlockUntil`) to survive worker termination and browser restarts.
2. **declarativeNetRequest Rules vs. Complex URL Filtering:**
   - Redirection of blocked sites uses Chrome's `declarativeNetRequest` API.
   - Intercepting root domains (`instagram.com`) is seamless. Sub-path interception (such as `youtube.com/shorts`) requires precise regex/urlFilter rules, which can occasionally clash with single-page application (SPA) client-side routing if the tab was already open before the lock.
3. **Cross-Origin Requests (CORS) on Windows:**
   - Chrome extension origins (`chrome-extension://<id>`) making HTTP requests to `http://localhost:11434` can be blocked by Ollama's default localhost CORS policy unless `OLLAMA_ORIGINS="*"` is configured in the environment.

---

## 3. Note Format & Educational Scope
1. **Note Quality Dependency:**
   - LearnGate performs best on factual, declarative study notes (e.g., biology, history, engineering, law, medicine).
   - If a user pastes sparse bullet points, single isolated words, or highly abstract poetry, the AI has insufficient context to extract both a verbatim source sentence and three sensible distractors.
2. **Desktop Only:**
   - LearnGate is built for Google Chrome on desktop laptops (Windows/macOS/Linux). Chrome on iOS and Android does not support Manifest V3 extensions.
3. **Strict Hackathon Scope Exclusion:**
   - No cloud syncing, accounts, or cross-device leaderboards. Notes never leave the user's local disk.
