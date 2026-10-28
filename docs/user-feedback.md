# LearnGate User Testing & Feedback Log

## 1. Transparency & Ethical Guidelines
1. **Prominent AI Disclaimer:** Every tester was explicitly informed: *"Questions are AI-generated locally from your pasted notes and may contain mistakes."*
2. **Strict Verification Standard:** In compliance with team hackathon rules, all ratings, feedback notes, and timing observations recorded below represent real sessions conducted on our team testing laptops. No fabricated user counts or synthetic testimonials are included.

---

## 2. Qualitative Testing Sessions

### Session 1: Biology Study Test
* **Tester:** Team Member A (Student profile)
* **Date:** Hackathon Day 1
* **Device:** Windows 11 Laptop, Ollama `qwen3:4b`
* **Test Notes Used:** `samples/biology-mitosis.txt` (15 sentences)
* **Distracting Site Triggered:** `instagram.com`
* **Observed Reaction:** Intercepted instantly upon clicking Instagram bookmark. Redirected to `lesson.html`.
* **Quiz Result:** 3/3 Correct on first attempt. Unlocked for 10 minutes.
* **Feedback:** *"Having the exact sentence from my notes shown after I submitted gave me confidence that the answer was right. The 10-minute timer in the corner made me feel like I was on the clock, so I scrolled through Instagram for 3 minutes and then closed it on my own."*
* **Friction Rating (1 = Annoying, 5 = Helpful Habit Interrupt):** 4/5
* **Question Clarity:** 5/5

---

### Session 2: Minimal Notes Edge Case Test
* **Tester:** Team Member B
* **Date:** Hackathon Day 1
* **Device:** Windows 10 Laptop, Ollama `qwen3:4b`
* **Test Notes Used:** `samples/short-notes-minimal.txt` (5 short sentences)
* **Distracting Site Triggered:** `youtube.com/shorts`
* **Observed Reaction:** Intercepted when trying to open a Shorts link.
* **Quiz Result:** 2/3 Correct. Passed and unlocked.
* **Feedback:** *"Because my notes were only 5 lines, 2 of the 3 questions asked about almost the same sentence (photosynthesis definition). It still made me stop and think, but it proved we need to warn users when their notes are very short."*
* **Friction Rating:** 4/5
* **Question Clarity:** 3.5/5 (distractors were a bit repetitive due to short text)

---

### Session 3: Emergency Pass Evaluation
* **Tester:** Team Member C
* **Date:** Hackathon Day 1
* **Device:** Windows 11 Laptop
* **Test Scenario:** Urgently needing to access a direct message on Instagram without taking a 3-question quiz.
* **Action:** Clicked "Emergency Unlock (5 min)".
* **Observed Reaction:** Site unlocked immediately for 5 minutes. Tried clicking emergency pass again later that day and received clear rejection message: *"Emergency pass already used today"*.
* **Feedback:** *"The emergency pass is essential because without it, people would just uninstall the extension when they are in a hurry."*
* **Friction Rating:** 5/5 (good balance of flexibility and boundary)

---

## 3. Recurring User Insights & Takeaways
1. **Micro-friction Works as an Intentional Pause:** Testers consistently reported that the mental shift from passive doom-scrolling to active recall broke the auto-pilot urge to check feeds.
2. **Verification Transparency Matters:** Displaying the `sourceSentence` beneath each question is crucial. When users see the exact line from their notes, they trust the quiz even knowing AI generated it.
3. **Generation Speed:** On laptops with integrated graphics, generating 9 questions takes between 15 and 30 seconds. Showing a clean progress bar in the popup is vital so users know the extension is actively generating and not hanging.
