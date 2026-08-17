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
    canGoForward: boolean
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

    return `<!DOCTYPE html>
<html lang="en" data-color-mode="${colorMode}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${n}'; img-src ${cspSource} https: data:;">
  <style>${githubMarkdownCss}</style>
  <style>${hljsCss}</style>
  <style>
    html { background-color: var(--color-canvas-default, #ffffff); }
    body {
      box-sizing: border-box;
      min-width: 200px;
      max-width: 980px;
      margin: 0 auto;
      background-color: var(--color-canvas-default, #ffffff);
    }
    #nav-bar {
      position: fixed;
      top: 10px;
      left: 10px;
      z-index: 100;
      padding: 4px;
      background-color: color-mix(in srgb, var(--color-canvas-default, #ffffff) 88%, transparent);
      border: 1px solid var(--color-border-muted, #e1e4e8);
      border-radius: 8px;
      display: flex;
      gap: 2px;
      backdrop-filter: blur(4px);
    }
    #nav-bar button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      border: none;
      border-radius: 4px;
      background: transparent;
      color: var(--color-fg-default, #24292f);
      cursor: pointer;
      font-size: 14px;
      line-height: 1;
      padding: 0;
    }
    #nav-bar button:hover:not(:disabled) {
      background-color: var(--color-neutral-muted, rgba(175,184,193,0.2));
    }
    #nav-bar button:disabled {
      opacity: 0.4;
      cursor: default;
    }
    #content { padding: 45px; }
    @media (max-width: 767px) {
      #content { padding: 15px; }
      #nav-bar { top: 8px; left: 8px; }
    }
    pre code.hljs { border-radius: 6px; }
  </style>
</head>
<body>
<div id="nav-bar">
  <button id="btn-back"${backDisabled} title="Go back" aria-label="Go back">&#8592;</button>
  <button id="btn-forward"${forwardDisabled} title="Go forward" aria-label="Go forward">&#8594;</button>
</div>
<div id="content" class="markdown-body">
${body}
</div>
<script nonce="${n}">(function () {
  const vscode = acquireVsCodeApi();

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
