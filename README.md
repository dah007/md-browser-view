# MD BrowserView

MD BrowserView shows Markdown in a built-in browser panel instead of the usual editor preview. It’s meant to feel more like a clean reading view, with GitHub-style formatting, syntax highlighting, links between Markdown files, and external links that open in your normal browser.

The idea is to make it easy to read and navigate Markdown without leaving your editor. The panel keeps the document visible, lets you move around within the extension, and adjusts to light or dark VS Code themes so it stays easy to read.

## What It Does

- Renders Markdown in a dedicated browser-style panel beside your editor.
- Applies GitHub-style Markdown layout and syntax highlighting to fenced code blocks.
- Keeps `.md` link navigation inside the same panel when possible.
- Opens external URLs in your system browser.
- Uses the active VS Code color theme for the reading surface.
- Provides back and forward navigation for browsing through linked Markdown files.

## Usage

Right-click any `.md` file in the:
- **Explorer sidebar** → "View in Internal Browser"
- **Editor tab** (right-click the tab) → "View in Internal Browser"
- **Editor text area** (right-click in the editor) → "View in Internal Browser"

A single panel opens beside your editor. Clicking links to other `.md` files navigates within the same panel. External URLs open in the system browser.

## Known Limitations

- Images in files opened outside any VS Code workspace will only resolve from the file's immediate directory. Images in sibling directories may not load.
- The panel theme (light/dark) is set at render time. Switching the VS Code color theme while a panel is open requires reopening the panel to apply the new theme.

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

## Open Source Dependencies

| Package | Version | License | Purpose |
|---|---|---|---|
| [marked](https://github.com/markedjs/marked) | ^4.3.0 | MIT | GitHub Flavored Markdown (GFM) parser — headings, tables, task lists, strikethrough, fenced code blocks, blockquotes, links, images, and more |
| [highlight.js](https://github.com/highlightjs/highlight.js) | ^11.10.0 | BSD-3-Clause | Syntax highlighting for fenced code blocks; auto-detects language when none is specified |
| [github-markdown-css](https://github.com/sindresorhus/github-markdown-css) | ^5.5.1 | MIT | GitHub's exact Markdown stylesheet, including light and dark theme variants |

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for the full text.
