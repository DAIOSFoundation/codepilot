import * as vscode from 'vscode';
import { getHtmlContentWithUris } from './panelUtils';
import { GeminiService, PromptType } from '../ai/geminiService'; // GeminiService 및 PromptType 임포트

export class AskViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'codepilot.askView'; // 새로운 뷰 타입
    private _view?: vscode.WebviewView;

    constructor(
        private readonly extensionUri: vscode.Uri,
        private readonly context: vscode.ExtensionContext,
        private readonly geminiService: GeminiService, // GeminiService 인스턴스 주입
        private readonly openSettingsPanel: (viewColumn: vscode.ViewColumn) => void,
        private readonly openLicensePanel: (viewColumn: vscode.ViewColumn) => void,
        private readonly openBlankPanel: (viewColumn: vscode.ViewColumn) => void
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this.extensionUri,
                vscode.Uri.joinPath(this.extensionUri, 'webview'),
                vscode.Uri.joinPath(this.extensionUri, 'media'),
                vscode.Uri.joinPath(this.extensionUri, 'dist'),
                vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview')
            ]
        };
        // ASK 탭도 기존 CHAT UI를 재사용
        webviewView.webview.html = getHtmlContentWithUris(this.extensionUri, 'chat', webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (data: any) => {
            switch (data.command) {
                case 'sendMessage':
                    // ASK 탭에서는 GENERAL_ASK 프롬프트 타입을 사용
                    await this.geminiService.handleUserMessageAndRespond(data.text, webviewView.webview, PromptType.GENERAL_ASK);
                    break;
                case 'openPanel':
                    let panelViewColumn = vscode.ViewColumn.Beside;
                    if (vscode.window.activeTextEditor?.viewColumn) {
                        panelViewColumn = vscode.window.activeTextEditor.viewColumn;
                    }
                    if (data.panel === 'settings') this.openSettingsPanel(panelViewColumn);
                    else if (data.panel === 'license') this.openLicensePanel(panelViewColumn);
                    else if (data.panel === 'customizing') this.openBlankPanel(panelViewColumn);
                    break;
                case 'webviewLoaded':
                    console.log('[AskViewProvider] Ask webview loaded.');
                    break;
                case 'cancelGeminiCall':
                    console.log('[Extension Host] Received cancelGeminiCall command from Ask tab.');
                    this.geminiService.cancelCurrentCall();
                    webviewView.webview.postMessage({ command: 'receiveMessage', sender: 'CodePilot', text: 'AI 호출이 취소되었습니다.' });
                    break;
            }
        });
        webviewView.onDidDispose(() => {
            console.log('[AskViewProvider] Ask view disposed');
            this._view = undefined;
        }, null, this.context.subscriptions);
    }
}