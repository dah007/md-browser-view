/// <reference types="node" />

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Marked, type RendererObject } from 'marked';
import hljs from 'highlight.js';

const extRoot = path.join(__dirname, '..');

const githubMarkdownCss = fs.readFileSync(
    path.join(extRoot, 'node_modules', 'github-markdown-css', 'github-markdown.css'),
    'utf8'
);
const hljsLightCss = fs.readFileSync(
    path.join(extRoot, 'node_modules', 'highlight.js', 'styles', 'github.css'),
    'utf8'
);
const hljsDarkCss = fs.readFileSync(
    path.join(extRoot, 'node_modules', 'highlight.js', 'styles', 'github-dark.css'),
    'utf8'
);

function escapeAttr(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function isExternalUrl(href: string): boolean {
    return /^https?:\/\/|^\/\/|^mailto:|^data:/.test(href);
}

function nonce(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function buildRenderer(fileDir: string, webview: vscode.Webview): RendererObject {
    return {
        image(href: string | null, title: string | null, text: string): string {
            let src = href ?? '';
            if (src && !isExternalUrl(src)) {
                const imgPath = path.resolve(fileDir, src);
                if (fs.existsSync(imgPath)) {
                    src = webview.asWebviewUri(vscode.Uri.file(imgPath)).toString();
                }
            }
            const titleAttr = title ? ` title="${escapeAttr(title)}"` : '';
            return `<img src="${escapeAttr(src)}" alt="${escapeAttr(text ?? '')}"${titleAttr}>`;
        },

        code(code: string, infostring: string | undefined, _escaped: boolean): string {
            const lang = (infostring ?? '').trim();
            let highlighted: string;
            if (lang && hljs.getLanguage(lang)) {
                highlighted = hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
            } else {
                highlighted = hljs.highlightAuto(code).value;
            }
            const cls = lang ? `hljs language-${escapeAttr(lang)}` : 'hljs';
            return `<pre><code class="${cls}">${highlighted}</code></pre>\n`;
        },
    };
}

export function renderMarkdown(
    markdown: string,
    fileUri: vscode.Uri,
    webview: vscode.Webview,
    canGoBack: boolean,
    canGoForward: boolean,
    backShortcut: string,
    forwardShortcut: string
): string {
    const isDark =
        vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark ||
        vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.HighContrast;

    const fileDir = path.dirname(fileUri.fsPath);
    const renderer = buildRenderer(fileDir, webview);
    const md = new Marked({ renderer, gfm: true, breaks: false });
    const body = md.parse(markdown) as string;
    const n = nonce();
    const hljsCss = isDark ? hljsDarkCss : hljsLightCss;
    const colorMode = isDark ? 'dark' : 'light';
    const cspSource = webview.cspSource;
    const backDisabled = canGoBack ? '' : ' disabled';
    const forwardDisabled = canGoForward ? '' : ' disabled';
    const backShortcutJson = JSON.stringify(backShortcut);
    const forwardShortcutJson = JSON.stringify(forwardShortcut);
    const backTooltip = backShortcut ? `Back (${backShortcut})` : 'Back';
    const forwardTooltip = forwardShortcut ? `Forward (${forwardShortcut})` : 'Forward';

    return `<!DOCTYPE html>
<html lang="en" data-color-mode="${colorMode}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${n}'; img-src ${cspSource} https: data:;">
  <style>${githubMarkdownCss}</style>
  <style>${hljsCss}</style>
  <style>
    html[data-color-mode="light"] {
      --mdbv-bg: #ffffff;
      --mdbv-fg: #000000;
    }
    html[data-color-mode="dark"] {
      --mdbv-bg: rgb(21, 27, 35);
      --mdbv-fg: #ffffff;
    }
    html {
      background-color: var(--mdbv-bg);
      color: var(--mdbv-fg);
      height: 100%;
    }
    body {
      box-sizing: border-box;
      min-width: 0;
      max-width: none;
      margin: 0;
      padding: 0;
      min-height: 100%;
      background-color: var(--mdbv-bg);
      color: var(--mdbv-fg);
    }
    .markdown-body {
      color: var(--mdbv-fg);
    }
    #nav-bar {
      position: fixed;
      top: 10px;
      left: 10px;
      z-index: 9999;
      padding: 3px;
      background-color: color-mix(in srgb, var(--mdbv-bg) 76%, var(--mdbv-fg) 24%);
      border: 1px solid color-mix(in srgb, var(--mdbv-fg) 10%, var(--mdbv-bg));
      border-radius: 999px;
      display: flex;
      gap: 3px;
      backdrop-filter: blur(4px);
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
    }
    #nav-bar button {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 21px;
      height: 21px;
      border: 1px solid transparent;
      border-radius: 999px;
      background-color: color-mix(in srgb, var(--mdbv-fg) 9%, var(--mdbv-bg));
      color: var(--mdbv-fg);
      cursor: pointer;
      font-size: 11px;
      line-height: 1;
      padding: 0;
      opacity: 0.88;
      transition: opacity 120ms ease;
    }
    #nav-bar button[data-tip]::after {
      content: attr(data-tip);
      position: absolute;
      top: calc(100% + 6px);
      left: 50%;
      transform: translateX(-50%);
      pointer-events: none;
      opacity: 0;
      transition: opacity 120ms ease;
      font-size: 10px;
      line-height: 1.2;
      white-space: nowrap;
      color: var(--color-fg-on-emphasis, #ffffff);
      background-color: color-mix(in srgb, var(--color-canvas-inset, #24292f) 92%, transparent);
      border: 1px solid var(--color-border-default, rgba(240,246,252,0.12));
      border-radius: 4px;
      padding: 2px 5px;
      z-index: 10000;
    }
    #nav-bar button:hover[data-tip]::after,
    #nav-bar button:focus-visible[data-tip]::after {
      opacity: 1;
    }
    #nav-bar button:hover:not(:disabled) {
      opacity: 1;
      background-color: color-mix(in srgb, var(--mdbv-fg) 14%, var(--mdbv-bg));
    }
    #nav-bar button:focus-visible {
      opacity: 1;
    }
    #nav-bar button:disabled {
      opacity: 0.35;
      cursor: default;
    }
    #content.markdown-body {
      box-sizing: border-box;
      min-width: 0;
      max-width: none;
      width: 100%;
      margin: 0;
      padding: 8px 5px 5px;
      background-color: var(--mdbv-bg);
      color: var(--mdbv-fg);
    }
    #content.markdown-body pre,
    #content.markdown-body pre code.hljs {
      background-color: color-mix(in srgb, var(--mdbv-bg) 72%, var(--mdbv-fg) 28%);
      color: var(--mdbv-fg);
    }
    #content.markdown-body blockquote {
      background-color: color-mix(in srgb, var(--mdbv-bg) 80%, var(--mdbv-fg) 20%);
      color: var(--mdbv-fg);
      border-left-color: color-mix(in srgb, var(--mdbv-fg) 35%, var(--mdbv-bg));
      border-radius: 6px;
      padding: 10px 12px;
    }
    #content.markdown-body table {
      background-color: color-mix(in srgb, var(--mdbv-bg) 84%, var(--mdbv-fg) 16%);
    }
    #content.markdown-body th,
    #content.markdown-body td {
      background-color: transparent;
      color: var(--mdbv-fg);
      border-color: color-mix(in srgb, var(--mdbv-fg) 18%, var(--mdbv-bg));
    }
    #content.markdown-body pre {
      padding: 10px;
    }
    #content.markdown-body pre code.hljs {
      display: block;
      padding: 0;
    }
    @media (max-width: 767px) {
      #nav-bar { top: 8px; left: 8px; }
      #nav-bar button {
        width: 18px;
        height: 18px;
        font-size: 10px;
      }
    }
    pre code.hljs { border-radius: 6px; }
  </style>
</head>
<body>
<div id="nav-bar">
  <button id="btn-back"${backDisabled} title="${escapeAttr(backTooltip)}" data-tip="${escapeAttr(backTooltip)}" aria-label="Go back">&#8592;</button>
  <button id="btn-forward"${forwardDisabled} title="${escapeAttr(forwardTooltip)}" data-tip="${escapeAttr(forwardTooltip)}" aria-label="Go forward">&#8594;</button>
</div>
<div id="content" class="markdown-body">
${body}
</div>
<script nonce="${n}">(function () {
  const vscode = acquireVsCodeApi();
  const shortcutBack = ${backShortcutJson};
  const shortcutForward = ${forwardShortcutJson};

  function normalizeShortcut(s) {
    if (!s || typeof s !== 'string') { return ''; }
    return s
      .split('+')
      .map(function (part) { return part.trim().toLowerCase(); })
      .filter(Boolean)
      .join('+');
  }

  function matchShortcut(evt, shortcut) {
    const normalized = normalizeShortcut(shortcut);
    if (!normalized) { return false; }

    const pieces = normalized.split('+');
    const key = pieces[pieces.length - 1];
    const mods = new Set(pieces.slice(0, -1));

    if (evt.ctrlKey !== mods.has('ctrl')) { return false; }
    if (evt.metaKey !== mods.has('meta')) { return false; }
    if (evt.shiftKey !== mods.has('shift')) { return false; }
    if (evt.altKey !== mods.has('alt')) { return false; }

    return evt.key.toLowerCase() === key;
  }

  window.addEventListener('message', function (e) {
    var msg = e.data;
    if (msg.type === 'scrollTo') {
      var el = document.getElementById(msg.anchor);
      if (el) { el.scrollIntoView({ behavior: 'smooth' }); }
    }
  });

  document.getElementById('btn-back').addEventListener('click', function () {
    vscode.postMessage({ type: 'navigateBack' });
  });

  document.getElementById('btn-forward').addEventListener('click', function () {
    vscode.postMessage({ type: 'navigateForward' });
  });

  document.addEventListener('keydown', function (e) {
    if (matchShortcut(e, shortcutBack)) {
      e.preventDefault();
      vscode.postMessage({ type: 'navigateBack' });
      return;
    }
    if (matchShortcut(e, shortcutForward)) {
      e.preventDefault();
      vscode.postMessage({ type: 'navigateForward' });
    }
  });

  document.addEventListener('click', function (e) {
    var linkEl = e.target.closest('a');
    if (!linkEl) { return; }
    var href = linkEl.getAttribute('href');
    if (!href) { return; }
    e.preventDefault();

    if (href.startsWith('#')) {
      var el = document.getElementById(href.slice(1));
      if (el) { el.scrollIntoView({ behavior: 'smooth' }); }
      return;
    }

    if (/^https?:\\/\\/|^\\/\\/|^mailto:/.test(href)) {
      vscode.postMessage({ type: 'openExternal', href: href });
      return;
    }

    var hashIdx = href.indexOf('#');
    var filePart = hashIdx === -1 ? href : href.slice(0, hashIdx);
    var anchor = hashIdx === -1 ? undefined : href.slice(hashIdx + 1);

    if (filePart.toLowerCase().endsWith('.md')) {
      vscode.postMessage({ type: 'navigate', href: filePart, anchor: anchor });
    } else {
      vscode.postMessage({ type: 'openExternal', href: href });
    }
  });
}());</script>
</body>
</html>`;
}
