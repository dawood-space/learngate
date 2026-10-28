# LearnGate 🛡️📚

> **Turn mindless digital scrolling into active study recall — 100% offline and private.**

---

## 1. What is LearnGate?
LearnGate is a Google Chrome (Manifest V3) extension designed to curb digital distractions through purposeful cognitive friction.

When you attempt to open a time-wasting website (by default, `instagram.com` or `youtube.com/shorts`), LearnGate intercepts your navigation and redirects you to a **Lesson Page**. To earn a **10-minute pass**, you must answer a quick 3-question multiple-choice quiz based on your **own pasted study notes**. 

If you answer at least 2 out of 3 questions correctly, the site unlocks for 10 minutes. When the time expires, LearnGate quietly re-arms itself, keeping you focused on your work.

---

## 2. Why LearnGate? (The Research)
Most website blockers rely on strict lockouts. Research shows that hard blocks often trigger resistance and prompt users to quickly disable the blocker:

1. **Gradual Friction Cuts Screen Time:** A University of Michigan study presented at ACM CHI 2024 (42 Android users) demonstrated that introducing gradual friction reduced screen time by **~16% more** than a hard lockout.
2. **Immediate Screen Time Reduction:** A randomized field experiment (N=112) proved that friction interventions immediately reduce screen time upon activation (though it found no immediate effect on subjective well-being or grades).
3. **No Unrealistic Claims:** We do not claim LearnGate will magically boost your GPA overnight. It is a practical, evidence-backed behavioral brake to stop auto-pilot scrolling.

---

## 3. How We Differ From Existing Apps
Apps like Quizwall, CurioLock, LockLeaf, TakeTime, and Study Lock offer quiz-based or timed locks. However, they rely on pre-made generic trivia decks or upload your private notes to third-party cloud AI servers.

**LearnGate's Difference:**
- **Zero Cloud Uploads:** All questions are generated locally on your laptop using an open-source model running in **Ollama (`qwen3:4b`)**.
- **100% Private:** Your lecture slides, personal summaries, and notes never touch external servers or API providers.
- **Relevant to Your Studies:** You are tested exclusively on what you are actually studying today.

---

## 4. System Architecture

```
+-----------------------------------------------------------+
|                      Google Chrome                        |
|                                                           |
|   [ Distracting Site ]  --(Blocked by declarativeNetRequest)
|            |                                              |
|            v                                              |
|   [ Lesson Gate (lesson.html) ] <--> [ background.js ]    |
|   - 3 Questions from Bank           - Manages unlockUntil |
|   - Verbatim Source Sentences       - Sets relock alarms  |
|   - 2/3 required to unlock                                |
|            ^                                              |
|            |                                              |
|   [ Extension Popup (popup.html) ]                        |
|   - Save Study Notes                                      |
|   - Trigger Local AI Generation                           |
+----------------------------+------------------------------+
                             | HTTP (localhost:11434)
                             v
+-----------------------------------------------------------+
|                   Local Windows Machine                   |
|                                                           |
|             Ollama Server (qwen3:4b Model)                |
|             - Fully offline inference                     |
|             - Generates structured JSON questions         |
|             - Validates verbatim source sentences         |
+-----------------------------------------------------------+
```

---

## 5. Quick Start & Setup Guide

### Prerequisites
1. **Windows 10/11 Laptop**
2. **Google Chrome Browser**
3. **Ollama** installed from [ollama.com](https://ollama.com/)

### Step 1: Start Ollama and Pull the Model
Open PowerShell and run:
```powershell
# Pull the required lightweight open-source model
ollama pull qwen3:4b

# If needed on Windows to allow Chrome extension access:
$env:OLLAMA_ORIGINS="*"
ollama serve
```

### Step 2: Install LearnGate in Chrome
1. Open Chrome and navigate to `chrome://extensions/`.
2. Toggle on **Developer mode** in the top-right corner.
3. Click **Load unpacked**.
4. Select the project folder containing `manifest.json`.

### Step 3: Add Your Notes and Generate Questions
1. Click the LearnGate puzzle icon in Chrome's toolbar.
2. Confirm Ollama status shows green ("Connected to qwen3:4b").
3. Paste any notes (or copy one of our pre-made files in `samples/`).
4. Click **Save Notes** and then **Generate Questions**.

### Step 4: Test the Block
1. Open a new tab and go to `https://www.instagram.com/`.
2. You will be redirected to the Lesson Page!
3. Answer at least 2 of 3 questions correctly to unlock Instagram for 10 minutes.

---

## 6. Emergency Pass
Need urgent access to a direct message or flight notification? LearnGate includes an **Emergency Unlock (5 min)** feature that unlocks access immediately without taking a quiz. To prevent abuse, it can only be used **once per calendar day**.

---

## 7. Honest Quality Disclaimer
All quiz questions and distractors are synthesized locally by an open-source AI model from your study notes. Small models can occasionally formulate awkward phrasing or minor mistakes. The exact verbatim sentence from your notes is always displayed after submission so you can verify each answer for yourself.
