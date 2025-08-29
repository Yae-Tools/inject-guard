# InjectGuard Installation Guide

## Quick Installation (Chrome/Edge)

### Step 1: Download the Extension
1. Clone or download this repository to your computer
2. Extract the files to a folder (e.g., `inject-guard`)

### Step 2: Enable Developer Mode
1. Open Chrome or Edge browser
2. Navigate to the extensions page:
   - **Chrome**: Go to `chrome://extensions/`
   - **Edge**: Go to `edge://extensions/`
3. Toggle **"Developer mode"** ON (usually in the top-right corner)

### Step 3: Load the Extension
1. Click **"Load unpacked"** button
2. Select the `inject-guard` folder containing the extension files
3. The extension should now appear in your extensions list

### Step 4: Verify Installation
1. Look for the InjectGuard icon in your browser toolbar
2. Click the icon to open the popup interface
3. Visit the test page: `test-pages/test-hidden-prompts.html`
4. The extension should detect and alert about hidden prompts

## Testing the Extension

### Test with Malicious Content
Open `test-pages/test-hidden-prompts.html` in your browser. This page contains various hidden prompt injection attacks. InjectGuard should:
- Display a red warning badge on the extension icon
- Show threat count and details in the popup
- List detected hidden prompts with severity ratings

### Test with Safe Content
Open `test-pages/test-safe-page.html` in your browser. This page contains only safe content. InjectGuard should:
- Display a green checkmark in the popup
- Show "Page is Safe" message
- No warnings or alerts

## Extension Permissions

InjectGuard requires the following permissions:
- **activeTab**: To scan the current webpage for hidden content
- **storage**: To save user settings and preferences

## Browser Compatibility

- ✅ **Chrome** (Recommended)
- ✅ **Microsoft Edge**
- ⚠️ **Firefox**: Requires minor manifest modifications (v2 format)
- ❌ **Safari**: Not currently supported

## Troubleshooting

### Extension Not Loading
- Ensure all files are in the correct folder structure
- Check that `manifest.json` is in the root directory
- Verify Developer mode is enabled

### No Threats Detected on Test Page
- Refresh the page after installing the extension
- Check browser console for error messages
- Ensure the extension has permission to access the page

### Popup Not Opening
- Check if the extension icon is visible in the toolbar
- Right-click the icon and select "Options" or "Manage Extension"
- Verify the extension is enabled

### False Positives/Negatives
- Adjust settings in the extension popup
- Report issues with specific pages for improvement

## Manual Testing Steps

1. **Install Extension**: Follow installation steps above
2. **Test Detection**: Open `test-hidden-prompts.html`
3. **Verify Alerts**: Check that threats are detected and displayed
4. **Test Safe Content**: Open `test-safe-page.html`
5. **Verify No Alerts**: Confirm no false positives on safe content
6. **Test Settings**: Open popup settings and modify preferences
7. **Test Dynamic Content**: Verify detection of dynamically loaded threats

## Development Mode

For developers wanting to modify the extension:

1. Make changes to the source files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the InjectGuard extension
4. Test changes on the test pages

## Uninstalling

1. Go to `chrome://extensions/`
2. Find InjectGuard in the list
3. Click "Remove" button
4. Confirm removal

## Support

If you encounter issues:
1. Check this installation guide
2. Review the browser console for errors
3. Test with the provided test pages
4. Create an issue in the project repository

## Security Note

InjectGuard processes all data locally in your browser and does not send any information to external servers. Your privacy and security are protected.
