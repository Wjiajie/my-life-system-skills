---
name: webapp-testing
description: Toolkit for interacting with and testing local web applications using Antigravity's built-in browser_subagent. Acts as the dynamic QA / Evaluator in a micro-agent full-stack workflow, running end-to-end tests to verify Spec Contracts. Supports verifying frontend functionality, debugging UI behavior, and capturing browser screenshots and DOM state.
license: Complete terms in LICENSE.txt
---

# Web Application Testing

To test local web applications, you should use Antigravity's built-in `browser_subagent` tool. **DO NOT use Playwright or Python automation scripts.**

## Using browser_subagent

The `browser_subagent` allows you to launch an autonomous browser session to test your web applications directly. 

### Prerequisites

Before calling `browser_subagent`:
1. Ensure the web application server is currently running. If not, start the development server (e.g., `npm run dev`) using the `run_command` tool and verify it is ready using `command_status`.
2. Know the URL to test (e.g., `http://localhost:3000`).

### Invoking browser_subagent

Call the `browser_subagent` tool with a highly detailed `Task` description. Include step-by-step instructions for what the subagent should do, for example:

```json
{
  "TaskName": "Test Product Shelf and MiaoWu3D UI",
  "TaskSummary": "Navigate to the shelf page to check GlassGaugeMini and the 3D placeholder cat.",
  "Task": "1. Navigate to http://localhost:3000/login and log in using standard test credentials if required.\n2. Navigate to http://localhost:3000/shelf.\n3. Verify that the 'cabinet-container' is rendered and products are displayed.\n4. Check if the 'glass-gauge-mini' component is visible on the product cards.\n5. Verify that a 3D canvas element (the MiaoWu placeholder) is rendered on the page.\n6. Return a summary of the UI state and any errors encountered.",
  "RecordingName": "shelf_ui_test"
}
```

### Best Practices

- **Explicit Instructions**: The subagent operates autonomously. Provide exact URLs, selectors to look for, and credentials if login is required.
- **Login State**: If the application requires authentication, instruct the subagent to log in first.
- **Verification**: Explicitly ask the subagent to verify specific UI elements (by checking classes, text, or DOM nodes) and report back.
- **Wait for Load**: The subagent naturally waits for page loads, but if you have complex dynamic elements, instruct it to wait for those elements to appear before interacting.