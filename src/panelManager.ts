import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { renderMarkdown } from './renderer';

export class PanelManager {
    private panel: vscode.WebviewPanel | undefined;
    private currentUri: vscode.Uri | undefined;
    private history: vscode.Uri[] = [];
    private historyIndex: number = -1;

    constructor(private readonly context: vscode.ExtensionContext) {
        vscode.window.onDidChangeActiveColorTheme(() => {
            if (this.panel && this.currentUri) {
                this.panel.webview.html = this.buildHtml(this.currentUri);
            }
        }, undefined, context.subscriptions);
    }

    async open(fileUri: vscode.Uri): Promise<void> {
        if (!this.panel) {
            this.panel = vscode.window.createWebviewPanel(
                'mdBrowserView',
                path.basename(fileUri.fsPath),
                vscode.ViewColumn.Beside,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: this.buildResourceRoots(fileUri),
                }
            );

            this.panel.webview.onDidReceiveMessage(
                async (msg: { type: string; href: string; anchor?: string }) => {
                    switch (msg.type) {
                        case 'navigate':
                            if (this.currentUri) {
                                await this.navigateTo(msg.href, this.currentUri, msg.anchor);
                            }
                            break;
                        case 'openExternal':
                            await vscode.env.openExternal(vscode.Uri.parse(msg.href));
                            break;
                        case 'navigateBack':
                            if (this.historyIndex > 0) {
                                this.historyIndex--;
                                this.renderFile(this.history[this.historyIndex]);
                            }
                            break;
                        case 'navigateForward':
                            if (this.historyIndex < this.history.length - 1) {
                                this.historyIndex++;
                                this.renderFile(this.history[this.historyIndex]);
                            }
                            break;
                    }
                },
                undefined,
                this.context.subscriptions
            );

            this.panel.onDidDispose(() => {
                this.panel = undefined;
                this.currentUri = undefined;
                this.history = [];
                this.historyIndex = -1;
            });
        } else {
            this.panel.reveal(vscode.ViewColumn.Beside);
        }

        // Truncate any forward entries and push the new file
        this.historyIndex++;
        this.history = this.history.slice(0, this.historyIndex);
        this.history.push(fileUri);

        this.renderFile(fileUri);
    }

    private renderFile(fileUri: vscode.Uri): void {
        this.currentUri = fileUri;
        this.panel!.title = path.basename(fileUri.fsPath);
        this.panel!.webview.html = this.buildHtml(fileUri);
    }

    private async navigateTo(href: string, fromUri: vscode.Uri, anchor?: string): Promise<void> {
        const targetPath = path.resolve(path.dirname(fromUri.fsPath), href);

        if (!fs.existsSync(targetPath)) {
            vscode.window.showErrorMessage(`MD BrowserView: File not found — ${targetPath}`);
            return;
        }

        await this.open(vscode.Uri.file(targetPath));

        if (anchor && this.panel) {
            this.panel.webview.postMessage({ type: 'scrollTo', anchor });
        }
    }

    private buildHtml(fileUri: vscode.Uri): string {
        const markdown = fs.readFileSync(fileUri.fsPath, 'utf8');
        const canGoBack = this.historyIndex > 0;
        const canGoForward = this.historyIndex < this.history.length - 1;
        return renderMarkdown(markdown, fileUri, this.panel!.webview, canGoBack, canGoForward);
    }

    private buildResourceRoots(fileUri: vscode.Uri): vscode.Uri[] {
        const roots: vscode.Uri[] = [];
        const workspaces = vscode.workspace.workspaceFolders;
        if (workspaces?.length) {
            roots.push(...workspaces.map(f => f.uri));
        } else {
            roots.push(vscode.Uri.file(path.dirname(fileUri.fsPath)));
        }
        return roots;
    }
}
