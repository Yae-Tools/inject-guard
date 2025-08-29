class InjectGuardPopup {
  constructor() {
    this.currentTabId = null;
    this.scanResults = null;
    this.settings = null;

    this.initializePopup();
  }

  async initializePopup() {
    // Get current tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    this.currentTabId = tabs[0]?.id;

    await this.loadSettings();
    this.setupEventListeners();
    await this.loadScanResults();
  }

  setupEventListeners() {
    // Navigation buttons
    document.getElementById("viewDetailsBtn")?.addEventListener("click", () => {
      this.showDetailsView();
    });

    document.getElementById("backBtn")?.addEventListener("click", () => {
      this.hideDetailsView();
    });

    // Action buttons
    document.getElementById("rescanBtn")?.addEventListener("click", () => {
      this.triggerRescan();
    });

    document.getElementById("retryBtn")?.addEventListener("click", () => {
      this.triggerRescan();
    });

    // Settings and about
    document.getElementById("settingsBtn")?.addEventListener("click", () => {
      this.showSettings();
    });

    document.getElementById("aboutBtn")?.addEventListener("click", () => {
      this.showAbout();
    });

    // Modal controls
    document
      .getElementById("closeSettingsBtn")
      ?.addEventListener("click", () => {
        this.hideModal("settingsModal");
      });

    document.getElementById("closeAboutBtn")?.addEventListener("click", () => {
      this.hideModal("aboutModal");
    });

    document
      .getElementById("saveSettingsBtn")
      ?.addEventListener("click", () => {
        this.saveSettings();
      });

    // Close modals when clicking outside
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("modal")) {
        this.hideModal(e.target.id);
      }
    });

    // Listen for scan result updates from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === "SCAN_RESULTS_UPDATE") {
        console.log(
          "[InjectGuard Popup] Received scan results update:",
          message.data
        );
        this.scanResults = message.data;

        if (this.scanResults.threatsFound > 0) {
          this.showThreatsState();
        } else {
          this.showSafeState();
        }
        sendResponse({ received: true });
      }
    });
  }

  async loadSettings() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "GET_SETTINGS",
      });
      this.settings = response.settings;
      this.updateSettingsUI();
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  }

  async loadScanResults() {
    try {
      this.showLoadingState();

      const response = await chrome.runtime.sendMessage({
        type: "GET_SCAN_RESULTS",
        tabId: this.currentTabId,
      });
      this.scanResults = response?.results;

      console.log(
        "[InjectGuard Popup] Received scan results:",
        this.scanResults
      );
      console.log(
        "[InjectGuard Popup] Scan complete flag:",
        this.scanResults?.scanComplete
      );
      console.log(
        "[InjectGuard Popup] Threats found:",
        this.scanResults?.threatsFound
      );

      if (this.scanResults) {
        // Check if we have scan results, regardless of scanComplete flag
        if (this.scanResults.threatsFound > 0) {
          console.log("[InjectGuard Popup] Showing threats state");
          this.showThreatsState();
        } else {
          console.log("[InjectGuard Popup] Showing safe state");
          this.showSafeState();
        }
      } else {
        // No results yet, wait a bit then check again or trigger scan
        console.log("[InjectGuard Popup] No scan results yet, waiting...");
        setTimeout(async () => {
          const retryResponse = await chrome.runtime.sendMessage({
            type: "GET_SCAN_RESULTS",
            tabId: this.currentTabId,
          });

          if (retryResponse?.results) {
            this.scanResults = retryResponse.results;
            console.log(
              "[InjectGuard Popup] Retry got results:",
              this.scanResults
            );
            if (this.scanResults.threatsFound > 0) {
              this.showThreatsState();
            } else {
              this.showSafeState();
            }
          } else {
            // Still no results, trigger a manual scan
            console.log(
              "[InjectGuard Popup] No results on retry, triggering manual scan"
            );
            await this.triggerRescan();
          }
        }, 1500);
      }
    } catch (error) {
      console.error("Failed to load scan results:", error);
      this.showErrorState();
    }
  }

  async triggerRescan() {
    try {
      this.showLoadingState();
      console.log("[InjectGuard Popup] Triggering manual scan...");

      await chrome.runtime.sendMessage({
        type: "MANUAL_SCAN",
        tabId: this.currentTabId,
      });

      // Wait for scan to complete, then check results multiple times
      let attempts = 0;
      const maxAttempts = 5;

      const checkResults = async () => {
        attempts++;
        console.log(
          `[InjectGuard Popup] Checking scan results (attempt ${attempts}/${maxAttempts})`
        );

        const response = await chrome.runtime.sendMessage({
          type: "GET_SCAN_RESULTS",
          tabId: this.currentTabId,
        });

        if (response?.results) {
          this.scanResults = response.results;
          console.log(
            "[InjectGuard Popup] Scan completed, updating UI:",
            this.scanResults
          );

          if (this.scanResults.threatsFound > 0) {
            this.showThreatsState();
          } else {
            this.showSafeState();
          }
        } else if (attempts < maxAttempts) {
          // Try again after a short delay
          setTimeout(checkResults, 1000);
        } else {
          console.warn(
            "[InjectGuard Popup] Max attempts reached, showing error"
          );
          this.showErrorState();
        }
      };

      // Start checking after initial delay
      setTimeout(checkResults, 1500);
    } catch (error) {
      console.error("Failed to trigger rescan:", error);
      this.showErrorState();
    }
  }

  showLoadingState() {
    this.hideAllStates();
    document.getElementById("loadingState").classList.remove("hidden");
    this.updateStatus("scanning", "Scanning...");
  }

  showSafeState() {
    console.log("[InjectGuard Popup] Showing safe state");
    this.hideAllStates();

    const safeStateEl = document.getElementById("safeState");
    if (safeStateEl) {
      safeStateEl.classList.remove("hidden");
    } else {
      console.error("[InjectGuard Popup] Safe state element not found!");
      return;
    }

    if (this.scanResults) {
      const scanTime = new Date(
        this.scanResults.timestamp
      ).toLocaleTimeString();
      const scanTimeEl = document.getElementById("scanTime");
      if (scanTimeEl) {
        scanTimeEl.textContent = `Scanned at ${scanTime}`;
      }
    }

    this.updateStatus("safe", "Safe");
  }

  showThreatsState() {
    console.log("[InjectGuard Popup] Showing threats state");
    this.hideAllStates();

    const threatsStateEl = document.getElementById("threatsState");
    if (threatsStateEl) {
      threatsStateEl.classList.remove("hidden");
    } else {
      console.error("[InjectGuard Popup] Threats state element not found!");
      return;
    }

    if (this.scanResults) {
      const threatCountEl = document.getElementById("threatCount");
      if (threatCountEl) {
        threatCountEl.textContent = this.scanResults.threatsFound;
      }
      this.populateThreatsPreview();
    }

    this.updateStatus(
      "danger",
      `${this.scanResults?.threatsFound || 0} threats`
    );
  }

  showErrorState() {
    console.log("[InjectGuard Popup] Showing error state");
    this.hideAllStates();

    const errorStateEl = document.getElementById("errorState");
    if (errorStateEl) {
      errorStateEl.classList.remove("hidden");
    } else {
      console.error("[InjectGuard Popup] Error state element not found!");
    }

    this.updateStatus("danger", "Error");
  }

  hideAllStates() {
    const states = ["loadingState", "safeState", "threatsState", "errorState"];
    states.forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        element.classList.add("hidden");
      } else {
        console.warn(
          `[InjectGuard Popup] Element ${id} not found when hiding states`
        );
      }
    });
  }

  updateStatus(type, text) {
    const statusDot = document.getElementById("statusDot");
    const statusText = document.getElementById("statusText");

    statusDot.className = `status-dot ${type}`;
    statusText.textContent = text;
  }

  populateThreatsPreview() {
    const threatsList = document.getElementById("threatsList");
    if (!threatsList || !this.scanResults?.threats) return;

    threatsList.innerHTML = "";

    // Show top 3 threats in preview
    const previewThreats = this.scanResults.threats.slice(0, 3);

    previewThreats.forEach((threat, index) => {
      const threatItem = document.createElement("div");
      threatItem.className = "threat-item";

      const severityClass = this.getSeverityClass(threat.severity);
      const hiddenMethods = threat.hiddenBy.join(", ");
      const suspiciousPatterns = threat.suspiciousPatterns
        .slice(0, 2)
        .join(", ");

      threatItem.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span class="threat-severity ${severityClass}">
            Severity ${threat.severity}/10
          </span>
          <small>${threat.element}</small>
        </div>
        <div class="threat-text"></div>
        <div class="threat-methods">
          <strong>Hidden by:</strong> ${hiddenMethods}<br>
          <strong>Suspicious patterns:</strong> ${suspiciousPatterns}
        </div>
      `;

      const textEl = threatItem.querySelector(".threat-text");
      if (textEl) {
        textEl.textContent = this.truncateText(threat.text, 80);
      }

      threatsList.appendChild(threatItem);
    });

    if (this.scanResults.threats.length > 3) {
      const moreItem = document.createElement("div");
      moreItem.style.textAlign = "center";
      moreItem.style.color = "var(--muted)";
      moreItem.style.fontSize = "12px";
      moreItem.style.marginTop = "8px";
      moreItem.textContent = `... and ${
        this.scanResults.threats.length - 3
      } more threats`;
      threatsList.appendChild(moreItem);
    }
  }

  showDetailsView() {
    document.getElementById("detailsView").classList.remove("hidden");
    this.populateDetailsView();
  }

  hideDetailsView() {
    document.getElementById("detailsView").classList.add("hidden");
  }

  populateDetailsView() {
    const detailsContent = document.getElementById("detailsContent");
    if (!detailsContent || !this.scanResults?.threats) return;

    detailsContent.innerHTML = "";

    this.scanResults.threats.forEach((threat, index) => {
      const detailItem = document.createElement("div");
      detailItem.className = "detail-item";

      const severityClass = this.getSeverityClass(threat.severity);

      detailItem.innerHTML = `
        <div class="detail-header">
          <div class="detail-title">Threat #${index + 1}</div>
          <span class="threat-severity ${severityClass}">
            Severity ${threat.severity}/10
          </span>
        </div>
        
        <div class="detail-section">
          <div class="detail-label">Element</div>
          <div class="detail-value element-value"></div>
        </div>
        
        <div class="detail-section">
          <div class="detail-label">Hidden Text</div>
          <div class="detail-value">
            <div class="threat-text"></div>
          </div>
        </div>
        
        <div class="detail-section">
          <div class="detail-label">Hidden By</div>
          <div class="detail-value hiddenby-value"></div>
        </div>
        
        <div class="detail-section">
          <div class="detail-label">Suspicious Patterns</div>
          <div class="detail-value patterns-value"></div>
        </div>
        
        <div class="detail-section">
          <div class="detail-label">Location</div>
          <div class="detail-value">
            x: ${threat.location.x}, y: ${threat.location.y} 
            (${threat.location.width}×${threat.location.height})
          </div>
        </div>
      `;

      const elementValueEl = detailItem.querySelector(".element-value");
      if (elementValueEl) elementValueEl.textContent = threat.element;

      const textEl = detailItem.querySelector(".threat-text");
      if (textEl) textEl.textContent = threat.text;

      const hiddenByEl = detailItem.querySelector(".hiddenby-value");
      if (hiddenByEl) hiddenByEl.textContent = threat.hiddenBy.join(", ");

      const patternsEl = detailItem.querySelector(".patterns-value");
      if (patternsEl)
        patternsEl.textContent = threat.suspiciousPatterns.join(", ");

      detailsContent.appendChild(detailItem);
    });
  }

  getSeverityClass(severity) {
    if (severity >= 7) return "severity-high";
    if (severity >= 4) return "severity-medium";
    return "severity-low";
  }

  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  }

  showSettings() {
    this.showModal("settingsModal");
  }

  showAbout() {
    this.showModal("aboutModal");
  }

  showModal(modalId) {
    document.getElementById(modalId).classList.remove("hidden");
  }

  hideModal(modalId) {
    document.getElementById(modalId).classList.add("hidden");
  }

  updateSettingsUI() {
    if (!this.settings) return;

    const autoScanToggle = document.getElementById("autoScanToggle");

    if (autoScanToggle) autoScanToggle.checked = this.settings.autoScan;
  }

  async saveSettings() {
    const newSettings = {
      autoScan: document.getElementById("autoScanToggle").checked,
      customPhrases: this.settings?.customPhrases || [],
    };

    try {
      await chrome.runtime.sendMessage({
        type: "UPDATE_SETTINGS",
        data: newSettings,
      });

      this.settings = newSettings;
      this.hideModal("settingsModal");

      // Show success feedback
      this.showTemporaryMessage("Settings saved successfully!");
    } catch (error) {
      console.error("Failed to save settings:", error);
      this.showTemporaryMessage("Failed to save settings", "error");
    }
  }

  showTemporaryMessage(message, type = "success") {
    // Create temporary message element
    const messageEl = document.createElement("div");
    messageEl.style.cssText = `
      position: fixed;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--surface);
      color: var(--text);
      padding: 8px 16px;
      border-radius: 0;
      border: 1px solid var(--border);
      border-left: 4px solid ${
        type === "error" ? "var(--danger)" : "var(--success)"
      };
      font-size: 12px;
      z-index: 10000;
    `;
    messageEl.textContent = message;

    document.body.appendChild(messageEl);

    setTimeout(() => {
      document.body.removeChild(messageEl);
    }, 3000);
  }
}

// Initialize popup when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new InjectGuardPopup();
});
