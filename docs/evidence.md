# LearnGate Evidence Base & Competitive Landscape

## 1. Problem Statement
Digital distractions like social media platforms and short-form video feeds are designed to capture user attention through rapid feedback loops. Traditional website and app blockers enforce hard cutoffs, but users often disable them or experience frustration. LearnGate introduces purposeful cognitive friction: requiring users to answer questions based on their own study notes before gaining temporary access to distracting websites.

---

## 2. Scientific Evidence on Digital Friction

### Study 1: Gradual Friction vs. Hard Lockouts (University of Michigan, CHI 2024)
* **Citation:** University of Michigan study presented at ACM CHI 2024, evaluating the "InteractOut" friction-based system on 42 Android users.
* **Source:** https://www.futurity.org/phones-cut-screen-time-interactout-app-3224202/
* **Key Finding:** Introducing gradual friction cut screen time by approximately 16% more than a strict hard lockout.
* **Why it matters for LearnGate:** Hard blockers trigger reactance—the psychological urge to remove or bypass the constraint. Micro-friction (such as answering quiz questions) interrupts habitual browsing loops and encourages conscious choice without inducing the resentment of an outright ban.

### Study 2: Friction and Screen Time Reduction (Randomized Field Experiment, N=112)
* **Citation:** Randomized field experiment evaluating friction interventions on smartphone usage.
* **Source:** https://repositorio.ie.edu/entities/publication/78b87732-5c0d-494a-9769-bdfd4a501297
* **Key Finding:** Friction interventions immediately reduced screen time upon implementation. However, the study found no immediate effect on subjective well-being or academic performance during the observed period.
* **Why it matters for LearnGate:** We remain completely honest about the evidence: friction helps users stop mindless app launches in the moment. We do not claim miracle grade improvements or instant life transformations, because research shows friction primarily acts as an immediate behavioral brake.

> **Team Evidence Standard:** No other external statistics, percentage claims, user numbers, or efficacy claims may be stated unless directly measured and recorded from our own verified team tests.

---

## 3. Competitive Comparison

| Application | Platform | Interactivity / Mechanism | Question Source | Cloud vs. Local Processing |
| :--- | :--- | :--- | :--- | :--- |
| **Quizwall** | iOS / Android | Quiz gate before opening apps | Generic flashcards / question decks | Cloud-based / preloaded decks |
| **CurioLock** | Mobile | Curiosity and knowledge prompts | Pre-curated educational database | Cloud server |
| **LockLeaf** | iOS | Gamified screen time lock & XP | Pre-made flashcards | Cloud / proprietary storage |
| **TakeTime** | Mobile / Web | Timed friction delay | Timer countdown (no quiz) | Local / Cloud timer |
| **Study Lock** | Mobile | Quiz to unlock phone | Pre-made questions or cloud AI | Cloud AI API backend |
| **LearnGate (Ours)** | Desktop (Chrome MV3) | 3-question lesson gate (pass 2 of 3) | **User's own study notes** | **100% Local (Ollama + qwen3:4b)** |

---

## 4. LearnGate's Core Differentiator: Privacy & Local Generation
1. **Zero Data Leaves the Laptop:** Traditional AI study tools send student notes, essays, or proprietary lecture slides to third-party cloud servers (such as OpenAI, Anthropic, or Supabase). LearnGate sends every prompt to `http://localhost:11434` (Ollama running `qwen3:4b`). No telemetry, no cloud logging, no data leakage.
2. **Context-Driven Learning:** Instead of answering generic trivia questions that provide no academic value, users are tested directly on the material they are currently studying for classes or exams.
3. **Transparent Quality Disclaimer:** AI models can make mistakes or misinterpret notes. LearnGate prominently informs the user that questions are synthesized locally by an open-source model and should be reviewed with critical awareness.
