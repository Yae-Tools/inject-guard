// InjectGuard Background Script - Service Worker

class InjectGuardBackground {
  constructor() {
    this.scanResults = new Map(); // Store scan results by tab ID
    this.settings = {
      autoScan: true,
      customPhrases: [],
    };

    this.initializeExtension();
  }

  async initializeExtension() {
    // Load saved settings
    await this.loadSettings();

    // Set up message listeners
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Indicates async response
    });

    // Handle tab updates (navigation)
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === "complete" && tab.url) {
        this.handleTabUpdate(tabId, tab);
      }
    });

    // Update badge when user switches active tabs
    chrome.tabs.onActivated.addListener((activeInfo) => {
      const { tabId } = activeInfo || {};
      if (tabId) {
        this.refreshTabBadge(tabId);
      }
    });

    // Update badge when window focus changes
    chrome.windows.onFocusChanged.addListener(async (windowId) => {
      if (windowId === chrome.windows.WINDOW_ID_NONE) return;
      const activeTabId = await this.getActiveTabId();
      if (activeTabId) this.refreshTabBadge(activeTabId);
    });

    // Clear data when tab is closed
    chrome.tabs.onRemoved.addListener((tabId) => {
      this.scanResults.delete(tabId);
    });

    console.log("[InjectGuard] Background script initialized");

    // Initialize badge for current active tab on startup
    try {
      const tabId = await this.getActiveTabId();
      if (tabId) this.refreshTabBadge(tabId);
    } catch (e) {
      console.warn(
        "[InjectGuard] Could not refresh active tab badge on init",
        e
      );
    }
  }

  async handleMessage(message, sender, sendResponse) {
    // Prefer explicit tabId from message, then sender.tab, then active tab
    let tabId = message.tabId ?? sender.tab?.id;
    if (!tabId) {
      try {
        tabId = await this.getActiveTabId();
      } catch (e) {
        console.warn("[InjectGuard] Failed to resolve active tab id", e);
      }
    }

    switch (message.type) {
      case "SCAN_RESULTS":
        await this.processScanResults(tabId, message.data);
        sendResponse({ success: true });
        break;

      case "UPDATE_BADGE":
        await this.updateBadge(tabId, message.data);
        sendResponse({ success: true });
        break;

      case "GET_SCAN_RESULTS":
        {
          const results = tabId ? this.scanResults.get(tabId) || null : null;
          sendResponse({ results });
        }
        break;

      case "MANUAL_SCAN":
        await this.triggerManualScan(tabId);
        sendResponse({ success: true });
        break;

      case "GET_SETTINGS":
        sendResponse({ settings: this.settings });
        break;

      case "UPDATE_SETTINGS":
        await this.updateSettings(message.data);
        sendResponse({ success: true });
        break;

      case "DISMISS_THREAT":
        await this.dismissThreat(tabId, message.data.threatId);
        sendResponse({ success: true });
        break;

      default:
        console.warn("[InjectGuard] Unknown message type:", message.type);
        sendResponse({ error: "Unknown message type" });
    }
  }

  async processScanResults(tabId, results) {
    // Store results
    this.scanResults.set(tabId, results);

    // Update badge
    await this.updateBadgeForResults(tabId, results);

    // Notifications removed

    // Notify popup if it's open (try to send, ignore if popup is closed)
    try {
      await chrome.runtime.sendMessage({
        type: "SCAN_RESULTS_UPDATE",
        data: results,
      });
    } catch (error) {
      // Popup is likely closed, which is fine
      console.log(
        "[InjectGuard] Popup not open, scan results stored for later"
      );
    }

    console.log(
      `[InjectGuard] Processed scan results for tab ${tabId}:`,
      results
    );
  }

  async updateBadge(tabId, data) {
    if (data.count > 0) {
      const color = data.severity === "high" ? "#ff4444" : "#ff8800";
      const text = data.count > 99 ? "99+" : data.count.toString();

      await chrome.action.setBadgeText({
        text: text,
        tabId: tabId,
      });

      await chrome.action.setBadgeBackgroundColor({
        color: color,
        tabId: tabId,
      });
    } else {
      await chrome.action.setBadgeText({
        text: "",
        tabId: tabId,
      });
    }
  }

  async updateBadgeForResults(tabId, results) {
    if (results.threatsFound > 0) {
      // Calculate overall severity
      const maxSeverity = Math.max(...results.threats.map((t) => t.severity));
      const severity = maxSeverity >= 7 ? "high" : "medium";

      await this.updateBadge(tabId, {
        count: results.threatsFound,
        severity: severity,
      });
    } else {
      // Safe page: show green OK indicator so users don't need to open popup
      try {
        await chrome.action.setBadgeText({ text: "OK", tabId });
        await chrome.action.setBadgeBackgroundColor({
          color: "#2e7d32",
          tabId,
        });
      } catch (e) {
        console.warn("[InjectGuard] Failed to set safe badge", e);
      }
    }
  }

  // Notification feature removed

  async triggerManualScan(tabId) {
    try {
      // Fallback to active tab if not provided
      if (!tabId) {
        tabId = await this.getActiveTabId();
      }
      if (!tabId) {
        console.warn("[InjectGuard] No active tab found for manual scan");
        return;
      }
      try {
        await chrome.tabs.sendMessage(tabId, { type: "MANUAL_SCAN" });
      } catch (err) {
        console.warn(
          "[InjectGuard] Content script not reachable, attempting injection...",
          err
        );
        try {
          await chrome.scripting.executeScript({
            target: { tabId },
            files: ["content.js"],
          });
          // Give the content script a brief moment to initialize
          await new Promise((r) => setTimeout(r, 200));
          await chrome.tabs.sendMessage(tabId, { type: "MANUAL_SCAN" });
        } catch (injectErr) {
          console.error(
            "[InjectGuard] Failed to inject content script for manual scan:",
            injectErr
          );
        }
      }
    } catch (error) {
      console.error("[InjectGuard] Failed to trigger manual scan:", error);
    }
  }

  // Resolve the currently active tab ID for the current window
  async getActiveTabId() {
    try {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      return tabs && tabs.length ? tabs[0].id : undefined;
    } catch (e) {
      console.error("[InjectGuard] Error while querying active tab:", e);
      return undefined;
    }
  }

  async handleTabUpdate(tabId, tab) {
    // Clear previous results
    this.scanResults.delete(tabId);

    // Reset badge
    await this.updateBadge(tabId, { count: 0 });

    // Auto-scan if enabled (content script will handle this)
    console.log(`[InjectGuard] Tab ${tabId} updated: ${tab.url}`);
  }

  async refreshTabBadge(tabId) {
    try {
      const results = this.scanResults.get(tabId);
      if (results) {
        await this.updateBadgeForResults(tabId, results);
      } else {
        await this.triggerManualScan(tabId);
      }
    } catch (e) {
      console.warn("[InjectGuard] Failed to refresh tab badge", e);
    }
  }

  async loadSettings() {
    try {
      const stored = await chrome.storage.sync.get(["injectGuardSettings"]);
      if (stored.injectGuardSettings) {
        this.settings = { ...this.settings, ...stored.injectGuardSettings };
      }
    } catch (error) {
      console.error("[InjectGuard] Failed to load settings:", error);
    }
  }

  async updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };

    try {
      await chrome.storage.sync.set({
        injectGuardSettings: this.settings,
      });
    } catch (error) {
      console.error("[InjectGuard] Failed to save settings:", error);
    }
  }

  async dismissThreat(tabId, threatId) {
    const results = this.scanResults.get(tabId);
    if (results && results.threats) {
      // Mark threat as dismissed (you could implement more sophisticated tracking)
      results.threats = results.threats.filter(
        (_, index) => index !== threatId
      );
      results.threatsFound = results.threats.length;

      // Update badge
      await this.updateBadgeForResults(tabId, results);
    }
  }
}

// Initialize the background script
new InjectGuardBackground();

// Handle notification clicks
// Notification click handler removed

console.log("[InjectGuard] Background script loaded");
