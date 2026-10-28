/**
 * LearnGate Local AI Module (Ollama Integration)
 * Interfaces directly with http://localhost:11434 to check service status,
 * verify model availability, generate multiple-choice question batches,
 * and validate questions against strict contract specifications.
 */

export const MODEL = "qwen3:4b";
const OLLAMA_HOST = "http://localhost:11434";

/**
 * 1. CHECK OLLAMA SERVICE & MODEL STATUS
 * Verifies connectivity to localhost:11434 and checks if MODEL is installed.
 * @returns {Promise<{ok:boolean, modelInstalled:boolean, error?:string, hint?:string}>}
 */
export async function checkOllama() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(`${OLLAMA_HOST}/api/tags`, {
      method: "GET",
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.status === 403) {
      return {
        ok: false,
        modelInstalled: false,
        error: "HTTP 403 Forbidden",
        hint: "Ollama rejected extension origin. On Windows: set OLLAMA_ORIGINS=\"*\" in environment variables and restart Ollama."
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        modelInstalled: false,
        error: `Ollama returned HTTP ${response.status}`,
        hint: "Ollama server returned an unexpected error."
      };
    }

    const data = await response.json();
    const models = Array.isArray(data.models) ? data.models : [];

    // Check if qwen3:4b is present (e.g. "qwen3:4b" or "qwen3:4b:latest")
    const isInstalled = models.some(m => {
      const name = (m.name || "").toLowerCase();
      return name === MODEL.toLowerCase() || name.startsWith(`${MODEL.toLowerCase()}:`);
    });

    if (isInstalled) {
      return { ok: true, modelInstalled: true };
    } else {
      return {
        ok: true,
        modelInstalled: false,
        hint: `Ollama is running, but model "${MODEL}" is missing. In terminal: "ollama pull ${MODEL}"`
      };
    }
  } catch (err) {
    clearTimeout(timeoutId);
    const isTimeout = err.name === "AbortError";
    return {
      ok: false,
      modelInstalled: false,
      error: isTimeout ? "Connection timeout" : "Cannot connect to Ollama",
      hint: isTimeout
        ? "Connection to http://localhost:11434 timed out. Ensure Ollama is running."
        : "Ollama is not running. Start Ollama and verify it is accessible at http://localhost:11434."
    };
  }
}

/**
 * 2. VALIDATE QUESTION AGAINST CONTRACT
 * Criteria:
 * - Unique string ID
 * - Non-empty question stem
 * - Exactly 4 distinct options
 * - answerIndex in [0, 1, 2, 3]
 * - sourceSentence copied verbatim (word-for-word) from user notes
 * @param {object} q 
 * @param {string} notes 
 * @returns {boolean}
 */
export function validateQuestion(q, notes) {
  if (!q || typeof q !== "object") return false;
  if (!notes || typeof notes !== "string") return false;

  // 1. ID check
  if (typeof q.id !== "string" || !q.id.trim()) return false;

  // 2. Question check
  if (typeof q.question !== "string" || !q.question.trim()) return false;

  // 3. Exactly 4 distinct options
  if (!Array.isArray(q.options) || q.options.length !== 4) return false;
  const cleanedOpts = q.options.map(opt => typeof opt === "string" ? opt.trim() : "");
  if (cleanedOpts.some(opt => opt.length === 0)) return false;

  const uniqueOpts = new Set(cleanedOpts.map(o => o.toLowerCase()));
  if (uniqueOpts.size !== 4) return false;

  // 4. Answer Index strictly 0, 1, 2, or 3
  if (typeof q.answerIndex !== "number" || ![0, 1, 2, 3].includes(q.answerIndex)) {
    return false;
  }

  // 5. Source Sentence verbatim check
  if (typeof q.sourceSentence !== "string" || !q.sourceSentence.trim()) return false;
  const sentenceTrimmed = q.sourceSentence.trim();

  // Primary check: exact verbatim substring match
  if (notes.includes(sentenceTrimmed)) {
    return true;
  }

  // Normalized whitespace fallback (handles newlines / spacing differences from LLM output)
  const normalizedNotes = notes.replace(/\s+/g, " ").toLowerCase();
  const normalizedSentence = sentenceTrimmed.replace(/\s+/g, " ").toLowerCase();

  return normalizedNotes.includes(normalizedSentence);
}

/**
 * 3. GENERATE QUESTIONS PIPELINE
 * Generates questions in small batches (perCall=3) to prevent timeouts.
 * Enforces contract validation and updates onProgress.
 * @param {string} notes 
 * @param {object} options 
 * @returns {Promise<{questions: Array, seconds: number, requested: number, accepted: number, rejected: number}>}
 */
export async function generateQuestions(notes, {
  count = 9,
  perCall = 3,
  onProgress = () => {},
  signal
} = {}) {
  const startTime = Date.now();

  // Step 1: Pre-flight Ollama check
  const status = await checkOllama();
  if (!status.ok) {
    const err = new Error(status.error || "Ollama service unavailable");
    err.userMessage = status.hint || "Ollama is not running. Please start Ollama at http://localhost:11434.";
    throw err;
  }

  if (!status.modelInstalled) {
    const err = new Error(`Model ${MODEL} missing`);
    err.userMessage = `Model "${MODEL}" is not installed in Ollama. Run: "ollama pull ${MODEL}" in your terminal.`;
    throw err;
  }

  const accepted = [];
  let totalRequested = 0;
  let totalRejected = 0;
  let batchIndex = 0;
  const maxBatches = Math.ceil(count / perCall) + 3; // Allow up to 3 retry batches

  while (accepted.length < count && batchIndex < maxBatches) {
    batchIndex++;
    const needed = Math.min(perCall, count - accepted.length);
    totalRequested += needed;

    onProgress({
      requested: totalRequested,
      accepted: accepted.length,
      rejected: totalRejected,
      status: `Generating batch ${batchIndex}...`
    });

    const prompt = buildPrompt(notes, needed);

    try {
      const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          prompt: prompt,
          format: "json",
          stream: false,
          options: {
            temperature: 0.3
          }
        }),
        signal: signal
      });

      if (res.status === 403) {
        const err = new Error("403 Forbidden");
        err.userMessage = "Ollama rejected extension origin (403). Set OLLAMA_ORIGINS=\"*\" and restart Ollama.";
        throw err;
      }

      if (!res.ok) {
        const err = new Error(`Ollama HTTP ${res.status}`);
        err.userMessage = `Ollama generation error (HTTP ${res.status}).`;
        throw err;
      }

      const data = await res.json();
      const rawText = data.response || "";
      const parsedItems = parseQuestionsJSON(rawText);

      parsedItems.forEach(item => {
        if (accepted.length >= count) return;

        // Ensure ID is populated
        if (!item.id || typeof item.id !== "string") {
          item.id = `q-${Date.now()}-${accepted.length + 1}`;
        }

        // Validate strictly against contract and verbatim notes
        if (validateQuestion(item, notes)) {
          // Avoid duplicate question text
          const isDuplicate = accepted.some(existing => 
            existing.question.toLowerCase().trim() === item.question.toLowerCase().trim()
          );

          if (!isDuplicate) {
            accepted.push(item);
          } else {
            totalRejected++;
          }
        } else {
          totalRejected++;
        }
      });

    } catch (err) {
      if (err.userMessage) throw err; // Re-throw recognized errors
      if (err.name === "AbortError") {
        const abortErr = new Error("Generation cancelled by user");
        abortErr.userMessage = "Question generation was cancelled.";
        throw abortErr;
      }
      console.warn(`[LearnGate Ollama] Batch ${batchIndex} attempt failed:`, err);
      // If network completely failed, bubble error
      if (batchIndex === 1 && accepted.length === 0) {
        const netErr = new Error("Network error contacting Ollama");
        netErr.userMessage = "Could not contact Ollama. Verify Ollama is running and responsive.";
        throw netErr;
      }
    }
  }

  const durationSec = Math.max(1, Math.round((Date.now() - startTime) / 1000));

  if (accepted.length === 0) {
    const err = new Error("No valid questions generated");
    err.userMessage = "Could not generate valid questions from your notes. Please ensure your notes contain complete factual sentences and try again.";
    throw err;
  }

  return {
    questions: accepted,
    seconds: durationSec,
    requested: totalRequested,
    accepted: accepted.length,
    rejected: totalRejected
  };
}

/**
 * 4. PROMPT ENGINEERING
 */
function buildPrompt(notes, count) {
  return `You are a strict educational quiz generator. Read the study notes below and generate exactly ${count} multiple-choice questions.

CONTRACT REQUIREMENTS:
1. Every question must test a factual concept directly mentioned in the notes.
2. "sourceSentence": Copy the exact sentence WORD-FOR-WORD from the notes text where the answer is found. Do not paraphrase.
3. "options": Provide an array of exactly 4 different choices.
4. "answerIndex": The 0-based index (0, 1, 2, or 3) pointing to the correct option.
5. Return ONLY a JSON array matching this format:

[
  {
    "id": "q-${Date.now()}-1",
    "question": "What is the primary function of the hippocampus?",
    "options": ["Consolidating memories", "Producing insulin", "Filtering blood", "Pumping oxygen"],
    "answerIndex": 0,
    "sourceSentence": "The hippocampus is essential for consolidating new declarative memories from short-term into long-term storage."
  }
]

STUDY NOTES:
${notes}`;
}

/**
 * 5. SAFE JSON PARSING
 * Handles optional markdown wrappers or root object wrappers.
 */
function parseQuestionsJSON(text) {
  if (!text) return [];

  // Remove markdown code fences if model wrapped response in ```json ... ```
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-z]*\s*/i, "").replace(/```\s*$/i, "").trim();
  }

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.questions)) return parsed.questions;
    if (parsed && Array.isArray(parsed.items)) return parsed.items;
    return [];
  } catch (err) {
    // Fallback: try regex extraction of array if model added preface text
    const match = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (match) {
      try {
        const extracted = JSON.parse(match[0]);
        if (Array.isArray(extracted)) return extracted;
      } catch (e) {
        return [];
      }
    }
    return [];
  }
}
