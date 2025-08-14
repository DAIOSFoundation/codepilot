import * as vscode from 'vscode';
import { getHtmlContentWithUris } from './panelUtils';
import { LlmService, PromptType } from '../ai/llmService'; // LlmService 및 PromptType 임포트
import { ConfigurationService } from '../services/configurationService';
import { NotificationService } from '../services/notificationService';

export class AskViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'codepilot.askView'; // 새로운 뷰 타입
    private _view?: vscode.WebviewView;

    constructor(
        private readonly extensionUri: vscode.Uri,
        private readonly context: vscode.ExtensionContext,
        private readonly llmService: LlmService, // LlmService 인스턴스 주입
        private readonly configurationService: ConfigurationService,
        private readonly notificationService: NotificationService
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
        // ASK 탭은 ask.html을 사용
        webviewView.webview.html = getHtmlContentWithUris(this.extensionUri, 'ask', webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (data: any) => {
            switch (data.command) {
                case 'sendMessage':
                    // ASK 탭에서는 GENERAL_ASK 프롬프트 타입을 사용
                    await this.llmService.handleUserMessageAndRespond(
                        data.text, 
                        webviewView.webview, 
                        PromptType.GENERAL_ASK, 
                        data.imageData, 
                        data.imageMimeType,
                        data.selectedFiles // 선택된 파일들 전달
                    );
                    break;
                case 'webviewLoaded':
                    console.log('[AskViewProvider] Ask webview loaded.');
                    break;
                case 'cancelGeminiCall':
                    console.log('[Extension Host] Received cancelGeminiCall command from Ask tab.');
                    this.llmService.cancelCurrentCall();
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