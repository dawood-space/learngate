# LearnGate 2-Minute Judge Demo Script

## Timing Breakdown
- **0:00 - 0:25:** The Problem & Cognitive Friction Hook
- **0:25 - 0:50:** The Live Interception & Lesson Gate
- **0:50 - 1:20:** The Local Ollama Generation & Privacy Advantage
- **1:20 - 1:45:** The Unlock Mechanism, Timer, & Emergency Pass
- **1:45 - 2:00:** Summary, Research Alignment, & Q&A

---

## Word-for-Word Speaking Script

### 1. The Hook (0:00 - 0:25)
> *"Judges, raise your hand if you've ever opened your laptop to finish an assignment, only to unconsciously type 'instagram.com' or open YouTube Shorts ten seconds later. Traditional website blockers just shut you out, which makes most students frustrated enough to uninstall them. At CHI 2024, researchers from the University of Michigan found that gradual friction actually cuts screen time 16% more than hard lockouts. That is why we built LearnGate."*

### 2. The Interception (0:25 - 0:50)
> *(Demonstrator opens Chrome and types `instagram.com`)*  
> *"Watch what happens when I try to open Instagram. Instead of letting me doomscroll, LearnGate intercepts the tab and brings me straight to this Lesson Page. To earn a 10-minute pass, I have to pass a quick 3-question quiz generated from my own biology notes on cell division."*

### 3. The Local AI & Privacy Difference (0:50 - 1:20)
> *(Demonstrator answers 3 questions on screen)*  
> *"Existing quiz lockers like Quizwall or Study Lock use generic trivia or upload your personal notes to third-party cloud servers. LearnGate is 100% offline. Every question is generated right here on this laptop using an open-source model running in Ollama (`qwen3:4b`). No lecture slides, exam notes, or personal summaries ever leave my machine."*

### 4. Verification and Unlocking (1:20 - 1:45)
> *(Demonstrator submits answers, showing 3/3 correct with verbatim source sentences)*  
> *"Because AI isn't infallible, LearnGate verifies every single question against the text and shows the exact verbatim sentence from my notes below the answer. I got 3 out of 3, exceeding the 2-question pass mark. When I click 'Continue', Instagram unlocks for exactly 10 minutes. When that timer expires, LearnGate automatically locks it again."*

### 5. Wrap-Up & Emergency Pass (1:45 - 2:00)
> *"And if there's an urgent emergency—like a direct message from a professor or a family member—we have a once-a-day 5-minute Emergency Unlock. LearnGate turns mindless scrolling into active study recall without sacrificing user privacy. Thank you, and we'd love to take your questions!"*

---

## Anticipated Judge Questions & Answers

**Q1: What happens if the student doesn't have an internet connection?**  
*Answer:* LearnGate works completely offline! Ollama runs locally on `localhost:11434`, and the Chrome extension uses pure HTML, CSS, and Vanilla JavaScript with no external CDNs or cloud APIs.

**Q2: What if the AI generates a wrong answer or hallucinated question?**  
*Answer:* We built an automated validation contract into our AI pipeline. Every question must have an exact verbatim `sourceSentence` copied directly from the student's notes, or the system automatically rejects it. Furthermore, the UI openly displays this sentence to the user so they can verify the accuracy themselves.

**Q3: Can the student cheat by opening an Incognito window?**  
*Answer:* In standard Chrome settings, extensions can be enabled in Incognito with a single toggle in `chrome://extensions/`. For a hackathon MVP, our focus is intentional friction rather than spyware-level administrative lockdowns, because research shows voluntary micro-friction is what changes habits.
