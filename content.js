class InjectGuardScanner {
  constructor() {
    this.suspiciousPhrases = [
      // Common prompt injection patterns from research
      "ignore all previous instructions",
      "ignore previous instructions",
      "disregard previous instructions",
      "forget everything above",
      "ignore the above",
      "override prior prompt",
      "if you are an ai",
      "if you are an llm",
      "if you are a language model",
      "give a positive review",
      "recommend accepting",
      "recommend hiring",
      "delete all data",
      "send get request",
      "embed the phrase",
      "methodically considered",
      "replace every word with",
      "output only",
      "respond with",
      "pretend to be",
      "act as if",
      "roleplay as",
      "you are now",
      "system prompt",
      "new instructions",
      "updated instructions",
    ];

    this.detectedThreats = [];
    this.isScanning = false;
  }

  async scanPage() {
    if (this.isScanning) return;

    this.isScanning = true;
    this.detectedThreats = [];

    try {
      console.log("[InjectGuard] Starting page scan...");

      // Get all elements in the DOM
      const allElements = document.querySelectorAll("*");

      for (const element of allElements) {
        await this.analyzeElement(element);
      }

      // Send results to background script
      await this.reportResults();
    } catch (error) {
      console.error("[InjectGuard] Scanning error:", error);
    } finally {
      this.isScanning = false;
    }
  }

  // Analyze individual element for hidden text
  async analyzeElement(element) {
    const computedStyle = window.getComputedStyle(element);
    const textContent = element.textContent?.trim() || "";

    if (!textContent || textContent.length < 10) return;

    const hiddenMethods = this.detectHiddenMethods(element, computedStyle);

    if (hiddenMethods.length > 0) {
      const suspiciousMatches = this.findSuspiciousPhrases(textContent);

      if (suspiciousMatches.length > 0) {
        this.detectedThreats.push({
          element: this.getElementSelector(element),
          text:
            textContent.substring(0, 200) +
            (textContent.length > 200 ? "..." : ""),
          hiddenBy: hiddenMethods,
          suspiciousPatterns: suspiciousMatches,
          severity: this.calculateSeverity(suspiciousMatches, hiddenMethods),
          location: this.getElementLocation(element),
        });
      }
    }
  }

  // Detect various methods used to hide text
  detectHiddenMethods(element, style) {
    const methods = [];
    const rect = element.getBoundingClientRect();

    // CSS display/visibility
    if (style.display === "none") methods.push("display-none");
    if (style.visibility === "hidden") methods.push("visibility-hidden");

    // Opacity
    if (parseFloat(style.opacity) === 0) methods.push("zero-opacity");

    // Color matching (text same as background)
    if (this.colorsMatch(style.color, style.backgroundColor)) {
      methods.push("color-matching");
    }

    // Tiny font size
    const fontSize = parseFloat(style.fontSize);
    if (fontSize <= 1) methods.push("tiny-font");

    // Off-screen positioning
    if (
      rect.left < -1000 ||
      rect.top < -1000 ||
      rect.left > window.innerWidth + 1000 ||
      rect.top > window.innerHeight + 1000
    ) {
      methods.push("off-screen");
    }

    // Zero area
    if (rect.width === 0 || rect.height === 0) {
      methods.push("zero-area");
    }

    // Clipping
    if (style.clip && style.clip.includes("rect(0")) {
      methods.push("clipped");
    }

    // Z-index hiding (element covered by others)
    if (this.isElementCovered(element)) {
      methods.push("z-index-hidden");
    }

    return methods;
  }

  // Check if text and background colors match
  colorsMatch(textColor, bgColor) {
    if (!textColor || !bgColor) return false;

    // Convert colors to RGB for comparison
    const textRGB = this.parseColor(textColor);
    const bgRGB = this.parseColor(bgColor);

    if (!textRGB || !bgRGB) return false;

    // Check if colors are very similar (allowing for small differences)
    const threshold = 20;
    return (
      Math.abs(textRGB.r - bgRGB.r) < threshold &&
      Math.abs(textRGB.g - bgRGB.g) < threshold &&
      Math.abs(textRGB.b - bgRGB.b) < threshold
    );
  }

  // Parse color string to RGB values
  parseColor(colorStr) {
    if (!colorStr) return null;

    // Handle rgb/rgba format
    const rgbMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
      return {
        r: parseInt(rgbMatch[1]),
        g: parseInt(rgbMatch[2]),
        b: parseInt(rgbMatch[3]),
      };
    }

    // Handle hex format
    const hexMatch = colorStr.match(/^#([a-f\d]{6})$/i);
    if (hexMatch) {
      const hex = hexMatch[1];
      return {
        r: parseInt(hex.substr(0, 2), 16),
        g: parseInt(hex.substr(2, 2), 16),
        b: parseInt(hex.substr(4, 2), 16),
      };
    }

    return null;
  }

  isElementCovered(element) {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const topElement = document.elementFromPoint(centerX, centerY);
    return (
      topElement && topElement !== element && !element.contains(topElement)
    );
  }

  findSuspiciousPhrases(text) {
    const matches = [];
    const lowerText = text.toLowerCase();

    for (const phrase of this.suspiciousPhrases) {
      if (lowerText.includes(phrase)) {
        matches.push(phrase);
      }
    }

    return matches;
  }

  calculateSeverity(suspiciousMatches, hiddenMethods) {
    let severity = 0;

    // Base severity for suspicious phrases
    severity += suspiciousMatches.length * 2;

    // Additional severity for hiding methods
    severity += hiddenMethods.length;

    // High-risk phrases get extra weight
    const highRiskPhrases = [
      "ignore all previous instructions",
      "delete all data",
      "send get request",
      "override prior prompt",
    ];

    for (const match of suspiciousMatches) {
      if (highRiskPhrases.includes(match)) {
        severity += 5;
      }
    }

    // Normalize to 1-10 scale
    return Math.min(Math.max(Math.ceil(severity / 2), 1), 10);
  }

  // Get CSS selector for element
  getElementSelector(element) {
    if (element.id) return `#${element.id}`;
    if (element.className)
      return `${element.tagName.toLowerCase()}.${
        element.className.split(" ")[0]
      }`;
    return element.tagName.toLowerCase();
  }

  getElementLocation(element) {
    const rect = element.getBoundingClientRect();
    return {
      x: Math.round(rect.left),
      y: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };
  }

  async reportResults() {
    const results = {
      url: window.location.href,
      timestamp: Date.now(),
      threatsFound: this.detectedThreats.length,
      threats: this.detectedThreats,
      scanComplete: true,
    };

    console.log("[InjectGuard] Scan complete:", results);

    // Send to background script
    chrome.runtime.sendMessage({
      type: "SCAN_RESULTS",
      data: results,
    });

    // Update badge
    if (this.detectedThreats.length > 0) {
      chrome.runtime.sendMessage({
        type: "UPDATE_BADGE",
        data: { count: this.detectedThreats.length, severity: "high" },
      });
    }
  }
}

// Initialize scanner
const scanner = new InjectGuardScanner();

// Auto-scan on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => scanner.scanPage(), 1000);
  });
} else {
  setTimeout(() => scanner.scanPage(), 1000);
}

// Listen for manual scan requests
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "MANUAL_SCAN") {
    scanner.scanPage().then(() => {
      sendResponse({ success: true });
    });
    return true; // Indicates async response
  }
});

// Monitor dynamic content changes
const observer = new MutationObserver((mutations) => {
  let shouldRescan = false;

  for (const mutation of mutations) {
    if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
      // Check if added nodes contain text
      for (const node of mutation.addedNodes) {
        if (
          node.nodeType === Node.ELEMENT_NODE &&
          node.textContent &&
          node.textContent.trim().length > 10
        ) {
          shouldRescan = true;
          break;
        }
      }
    }
  }

  if (shouldRescan && !scanner.isScanning) {
    // Debounce rescans
    clearTimeout(window.injectGuardRescanTimeout);
    window.injectGuardRescanTimeout = setTimeout(() => {
      scanner.scanPage();
    }, 2000);
  }
});

// Start observing
observer.observe(document.body, {
  childList: true,
  subtree: true,
});

console.log("[InjectGuard] Content script loaded and monitoring page...");
