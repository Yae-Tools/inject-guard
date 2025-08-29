# InjectGuard Browser Extension

InjectGuard is a browser extension that detects hidden prompt injection attacks in web pages to protect AI-assisted browsing.

## Overview

This extension helps protect non-tech-savvy users who rely on AI tools (like ChatGPT, Claude, or browser-based AI assistants) to process web content. Hidden prompt injections could manipulate these AI tools, leading to misinformation, biased decisions, or malicious actions.

## Features

- **Automatic Scanning**: Scans web pages on load for hidden text that could contain malicious prompts
- **Multiple Detection Methods**: Detects text hidden via various CSS and DOM techniques:
  - `display: none` and `visibility: hidden`
  - Zero opacity (`opacity: 0`)
  - Matching text and background colors
  - Tiny font sizes (`font-size: 0px` or `≤1px`)
  - Off-screen positioning
  - Zero-area elements
  - CSS clipping
  - Z-index hiding
- **Suspicious Phrase Detection**: Identifies common prompt injection patterns like:
  - "ignore all previous instructions"
  - "if you are an AI/LLM"
  - "give a positive review"
  - "override prior prompt"
  - And many more...
- **User-Friendly Alerts**: Simple, non-technical warnings in the popup with severity ratings
- **Dynamic Content Monitoring**: Detects threats in dynamically loaded content
- **Privacy-First**: All processing happens locally in the browser

## Installation

### Development Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `inject-guard` directory
5. The extension should now appear in your browser toolbar

### Testing

Open the test page at `test-pages/test-hidden-prompts.html` to verify the extension detects various hidden prompt injection techniques.

## How It Works

1. **Content Script Injection**: The extension injects a content script into every web page
2. **DOM Analysis**: Scans all elements for hidden text using computed styles and element properties
3. **Pattern Matching**: Checks hidden text against a database of suspicious phrases
4. **Threat Assessment**: Calculates severity based on hiding methods and phrase patterns
5. **User Alerts**: Displays warnings via browser badge and popup interface (system notifications removed)

## Architecture

- **`manifest.json`**: Extension configuration and permissions
- **`content.js`**: Injected script that scans pages for hidden threats
- **`background.js`**: Service worker handling persistent logic and communication
- **`popup.html/css/js`**: User interface for displaying scan results and settings
- **`test-pages/`**: Test pages for validating detection capabilities

## Threat Detection

The extension identifies text that is:
1. **Hidden from human view** using CSS/DOM techniques
2. **Contains suspicious phrases** that could manipulate AI tools

Common hiding techniques detected:
- CSS properties: `display: none`, `visibility: hidden`, `opacity: 0`
- Positioning: Off-screen coordinates, zero dimensions
- Color matching: Text color same as background
- Font manipulation: Zero or tiny font sizes
- Clipping and masking techniques

## Privacy

- **No Data Collection**: The extension does not collect or transmit any user data
- **Local Processing**: All analysis happens in your browser
- **No External Servers**: No communication with external services

## Contributing

This is an open-source project. Contributions are welcome!

## License

MIT License - see LICENSE file for details

## Version History

- **v1.0.0**: Initial release with core detection capabilities
  - Hidden text detection via multiple CSS/DOM methods
  - Suspicious phrase pattern matching
  - User-friendly popup interface
  - Privacy-first local processing
  - Dynamic content monitoring

## Support

For issues or questions, please create an issue in the project repository.
