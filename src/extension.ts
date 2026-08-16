import * as vscode from 'vscode';
import { PanelManager } from './panelManager';

export function activate(context: vscode.ExtensionContext): void {
    const panelManager = new PanelManager(context);

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'md-browserview.openInBrowser',
            async (uri?: vscode.Uri) => {
                const target = uri ?? vscode.window.activeTextEditor?.document.uri;
                if (!target) {
                    vscode.window.showErrorMessage('MD BrowserView: No markdown file found.');
                    return;
                }
                if (!target.fsPath.toLowerCase().endsWith('.md')) {
                    vscode.window.showErrorMessage('MD BrowserView: Selected file is not a markdown file.');
                    return;
                }
                await panelManager.open(target);
            }
        )
    );
}

export function deactivate(): void {}
