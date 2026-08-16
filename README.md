# MD BrowserView

A VS Code extension that renders Markdown files in an internal browser panel with GitHub-style formatting, syntax highlighting, and cross-document navigation.

## Usage

Right-click any `.md` file in the:
- **Explorer sidebar** → "View in Internal Browser"
- **Editor tab** (right-click the tab) → "View in Internal Browser"
- **Editor text area** (right-click in the editor) → "View in Internal Browser"

A single panel opens beside your editor. Clicking links to other `.md` files navigates within the same panel. External URLs open in the system browser.

## Installation (local)

```bash
npm install
npm run compile
```

Then either:
- Press `F5` in VS Code with this folder open to launch an Extension Development Host, or
- Package and install permanently:
  ```bash
  npx vsce package
  code --install-extension md-browserview-0.5.1.vsix
  ```

## Publishing

This repository is set up for Marketplace publishing with `vsce`.

1. Install the VSCE CLI if needed: `npm install`
2. Log in with your Marketplace publisher id: `npx vsce login dah007`
3. Create a package: `npx vsce package`
4. Publish: `npx vsce publish`

If you use a different Marketplace publisher id, update `publisher` in `package.json` before publishing.

## Open Source Dependencies

| Package | Version | License | Purpose |
|---|---|---|---|
| [marked](https://github.com/markedjs/marked) | ^4.3.0 | MIT | GitHub Flavored Markdown (GFM) parser — headings, tables, task lists, strikethrough, fenced code blocks, blockquotes, links, images, and more |
| [highlight.js](https://github.com/highlightjs/highlight.js) | ^11.10.0 | BSD-3-Clause | Syntax highlighting for fenced code blocks; auto-detects language when none is specified |
| [github-markdown-css](https://github.com/sindresorhus/github-markdown-css) | ^5.5.1 | MIT | GitHub's exact Markdown stylesheet, including light and dark theme variants |

## Known Limitations

- Images in files opened outside any VS Code workspace will only resolve from the file's immediate directory. Images in sibling directories may not load.
- The panel theme (light/dark) is set at render time. Switching the VS Code color theme while a panel is open requires reopening the panel to apply the new theme.
