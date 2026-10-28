/**
 * LearnGate Background Service Worker (Manifest V3)
 * Manages site interception rules, unlock timers via chrome.alarms,
 * persistent statistics, and inter-component messaging.
 */

const DEFAULT_BLOCKED_SITES = [
  "instagram.com",
  "youtube.com/shorts"
];

const DEFAULT_SETTINGS = {
  unlockMinutes: 10,
  questionsPerLesson: 3,
  passMark: 2
};

const ALARM_NAME = "relock";

/**
 * 1. LIFECYCLE: INSTALLATION & STARTUP
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log("[LearnGate Background] Installed. Reason:", details.reason);
  
  const data = await chrome.storage.local.get([
    "blockedSites",
    "settings",
    "unlockUntil",
    "stats_blocks",
    "stats_emergencyUses",
    "stats_passes",
    "stats_failures"
  ]);

  const updates = {};
  if (!data.blockedSites) updates.blockedSites = DEFAULT_BLOCKED_SITES;
  if (!data.settings) updates.settings = DEFAULT_SETTINGS;
  if (data.unlockUntil === undefined) updates.unlockUntil = 0;
  if (data.stats_blocks === undefined) updates.stats_blocks = 0;
  if (data.stats_emergencyUses === undefined) updates.stats_emergencyUses = 0;
  if (data.stats_passes === undefined) updates.stats_passes = 0;
  if (data.stats_failures === undefined) updates.stats_failures = 0;

  if (Object.keys(updates).length > 0) {
    await chrome.storage.local.set(updates);
  }

  await syncBlockingRules();
});

chrome.runtime.onStartup.addListener(async () => {
  console.log("[LearnGate Background] Browser started. Verifying unlock state...");
  await syncBlockingRules();
});

/**
 * 2. RULE SYNCHRONIZATION (declarativeNetRequest)
 * Enforces redirection of blocked sites to the Lesson Gate while locked.
 * Dynamically disables rules while unlocked.
 */
async function syncBlockingRules() {
  const data = await chrome.storage.local.get(["blockedSites", "unlockUntil"]);
  const unlockUntil = data.unlockUntil || 0;
  const isUnlocked = unlockUntil > Date.now();
  const sites = data.blockedSites || DEFAULT_BLOCKED_SITES;

  // Retrieve all existing dynamic rule IDs to clear them
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existingRules.map(r => r.id);

  if (isUnlocked) {
    // Unlocked: remove all redirection rules so sites load freely
    if (removeRuleIds.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: removeRuleIds
      });
      console.log("[LearnGate Background] Sites currently unlocked. Dynamic rules removed.");
    }
    return;
  }

  // Locked: create dynamic redirect rules for each blocked site
  const addRules = sites.map((site, index) => {
    const ruleId = index + 1;
    const cleanSite = site.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");

    // Build regex to match domain or subpaths (e.g., instagram.com or youtube.com/shorts)
    // Escapes special regex characters except forward slashes
    const escapedSite = cleanSite.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regexFilter = `^https?://([^/]*\\.)?${escapedSite}(/.*)?$`;

    return {
      id: ruleId,
      priority: 1,
      action: {
        type: "redirect",
        redirect: {
          regexSubstitution: `chrome-extension://${chrome.runtime.id}/lesson/lesson.html?target=\\0`
        }
      },
      condition: {
        regexFilter: regexFilter,
        resourceTypes: ["main_frame"]
      }
    };
  });

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: removeRuleIds,
    addRules: addRules
  });

  console.log(`[LearnGate Background] Dynamic blocking rules active for ${addRules.length} sites.`);
}

/**
 * 3. RELOCK ALARM LISTENER (Survives Service Worker Shutdown)
 */
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) {
    console.log("[LearnGate Background] Relock alarm fired. Re-locking distracting sites.");
    await chrome.storage.local.set({ unlockUntil: 0 });
    await syncBlockingRules();
  }
});

/**
 * 4. STORAGE CHANGE LISTENER
 * Automatically reapplies rules when user adds/removes blocked sites in the popup.
 */
chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName === "local") {
    if (changes.blockedSites || changes.unlockUntil) {
      await syncBlockingRules();
    }
  }
});

/**
 * 5. SINGLE-PAGE APPLICATION (SPA) / CLIENT ROUTING SAFETY NET
 * Catches internal navigation (e.g. clicking /shorts while on YouTube homepage).
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url && tab.url) {
    const data = await chrome.storage.local.get(["blockedSites", "unlockUntil"]);
    const isUnlocked = (data.unlockUntil || 0) > Date.now();
    if (isUnlocked) return;

    // Do not intercept extension pages
    if (tab.url.startsWith("chrome-extension://")) return;

    const sites = data.blockedSites || DEFAULT_BLOCKED_SITES;
    const isBlocked = sites.some(site => {
      const cleanSite = site.trim().replace(/^https?:\/\//, "").toLowerCase();
      const currentUrl = tab.url.toLowerCase();
      return currentUrl.includes(cleanSite);
    });

    if (isBlocked) {
      const lessonUrl = `chrome-extension://${chrome.runtime.id}/lesson/lesson.html?target=${tab.url}`;
      chrome.tabs.update(tabId, { url: lessonUrl });
    }
  }
});

/**
 * 6. MESSAGE HANDLERS PER CONTRACT
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return;

  switch (message.type) {
    // A) LESSON_OPENED: Lesson page opened; increment stats_blocks
    case "LESSON_OPENED": {
      handleLessonOpened().then(res => sendResponse(res));
      return true; // Keep message channel open for async response
    }

    // B) LESSON_PASSED: User scored >= 2/3; unlock for settings.unlockMinutes
    case "LESSON_PASSED": {
      handleLessonPassed().then(res => sendResponse(res));
      return true;
    }

    // C) EMERGENCY_PASS: 5-minute unlock, once per calendar day
    case "EMERGENCY_PASS": {
      handleEmergencyPass().then(res => sendResponse(res));
      return true;
    }

    // D) GET_STATUS: Reply current lock state, unlockUntil, and blockedSites
    case "GET_STATUS": {
      handleGetStatus().then(res => sendResponse(res));
      return true;
    }

    default:
      console.warn("[LearnGate Background] Unrecognized message type:", message.type);
      sendResponse({ ok: false, error: "Unrecognized message type" });
      return false;
  }
});

/**
 * Handler for LESSON_OPENED
 */
async function handleLessonOpened() {
  const data = await chrome.storage.local.get(["stats_blocks"]);
  const nextBlocks = (data.stats_blocks || 0) + 1;
  await chrome.storage.local.set({ stats_blocks: nextBlocks });
  console.log(`[LearnGate Background] LESSON_OPENED. Total blocks recorded: ${nextBlocks}`);
  return { ok: true };
}

/**
 * Handler for LESSON_PASSED
 */
async function handleLessonPassed() {
  const data = await chrome.storage.local.get(["settings"]);
  const settings = data.settings || DEFAULT_SETTINGS;
  const unlockMinutes = settings.unlockMinutes || 10;

  const now = Date.now();
  const unlockUntil = now + (unlockMinutes * 60 * 1000);

  // Background writes unlockUntil per contract
  await chrome.storage.local.set({ unlockUntil: unlockUntil });

  // Remove block rules
  await syncBlockingRules();

  // Create persistent alarm for relock
  await chrome.alarms.clear(ALARM_NAME);
  chrome.alarms.create(ALARM_NAME, { when: unlockUntil });

  console.log(`[LearnGate Background] LESSON_PASSED. Unlocked until ${new Date(unlockUntil).toLocaleTimeString()} (${unlockMinutes}m).`);
  return { ok: true, unlockUntil: unlockUntil };
}

/**
 * Handler for EMERGENCY_PASS (P1)
 * 5-minute unlock, max once per calendar day.
 */
async function handleEmergencyPass() {
  const data = await chrome.storage.local.get(["lastEmergencyDate", "stats_emergencyUses"]);
  const todayStr = new Date().toLocaleDateString("en-CA"); // Formats YYYY-MM-DD

  if (data.lastEmergencyDate === todayStr) {
    console.log("[LearnGate Background] Emergency pass rejected: already used today.");
    return { ok: false, reason: "already used today" };
  }

  const now = Date.now();
  const unlockUntil = now + (5 * 60 * 1000); // 5 minutes
  const nextUses = (data.stats_emergencyUses || 0) + 1;

  await chrome.storage.local.set({
    unlockUntil: unlockUntil,
    lastEmergencyDate: todayStr,
    stats_emergencyUses: nextUses
  });

  // Remove block rules
  await syncBlockingRules();

  // Create persistent alarm for relock after 5 minutes
  await chrome.alarms.clear(ALARM_NAME);
  chrome.alarms.create(ALARM_NAME, { when: unlockUntil });

  console.log(`[LearnGate Background] EMERGENCY_PASS activated. Unlocked for 5 min until ${new Date(unlockUntil).toLocaleTimeString()}.`);
  return { ok: true, unlockUntil: unlockUntil };
}

/**
 * Handler for GET_STATUS
 */
async function handleGetStatus() {
  const data = await chrome.storage.local.get(["unlockUntil", "blockedSites"]);
  const unlockUntil = data.unlockUntil || 0;
  const locked = !(unlockUntil > Date.now());
  const sites = data.blockedSites || DEFAULT_BLOCKED_SITES;

  return {
    locked: locked,
    unlockUntil: unlockUntil,
    blockedSites: sites
  };
}
