import * as vscode from 'vscode';
import { getHtmlContentWithUris } from './panelUtils';
import { GeminiService } from '../ai/geminiService'; // GeminiService 임포트

export class ChatViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'codepilot.chatView';
    private _view?: vscode.WebviewView;

    // GeminiService 및 패널 열기 함수를 의존성으로 주입받도록 생성자 변경
    constructor(
        private readonly extensionUri: vscode.Uri,
        private readonly context: vscode.ExtensionContext,
        private readonly geminiService: GeminiService,
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
                vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview') // 컴파일된 JS 파일 위치
            ]
        };
        webviewView.webview.html = getHtmlContentWithUris(this.extensionUri, 'chat', webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (data: any) => {
            switch (data.command) {
                case 'sendMessage':
                    // 메시지 처리를 GeminiService에 위임
                    await this.geminiService.handleUserMessageAndRespond(data.text, webviewView.webview);
                    break;
                case 'openPanel':
                    let panelViewColumn = vscode.ViewColumn.Beside;
                    if (vscode.window.activeTextEditor?.viewColumn) {
                        panelViewColumn = vscode.window.activeTextEditor.viewColumn;
                    }
                    // 패널 열기 함수 호출
                    if (data.panel === 'settings') this.openSettingsPanel(panelViewColumn);
                    else if (data.panel === 'license') this.openLicensePanel(panelViewColumn);
                    else if (data.panel === 'customizing') this.openBlankPanel(panelViewColumn);
                    break;
                case 'webviewLoaded':
                    console.log('[ChatViewProvider] Chat webview loaded.');
                    break;
                case 'cancelGeminiCall':
                    console.log('[Extension Host] Received cancelGeminiCall command.');
                    // 취소 요청을 GeminiService에 위임
                    this.geminiService.cancelCurrentCall();
                    webviewView.webview.postMessage({ command: 'receiveMessage', sender: 'CodePilot', text: 'AI 호출이 취소되었습니다.' });
                    break;
            }
        });
        webviewView.onDidDispose(() => {
            console.log('[ChatViewProvider] Chat view disposed');
            this._view = undefined;
        }, null, this.context.subscriptions);
    }
}