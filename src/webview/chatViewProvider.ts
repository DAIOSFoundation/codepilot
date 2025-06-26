import * as vscode from 'vscode';
import { getHtmlContentWithUris } from './panelUtils';
import { GeminiService, PromptType } from '../ai/geminiService'; // GeminiService 및 PromptType 임포트
import { ConfigurationService } from '../services/configurationService';
import { NotificationService } from '../services/notificationService';

export class ChatViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'codepilot.chatView';
    private _view?: vscode.WebviewView;

    constructor(
        private readonly extensionUri: vscode.Uri,
        private readonly context: vscode.ExtensionContext,
        private readonly geminiService: GeminiService,
        private readonly openSettingsPanel: (viewColumn: vscode.ViewColumn) => void,
        private readonly openLicensePanel: (viewColumn: vscode.ViewColumn) => void,
        private readonly openBlankPanel: (viewColumn: vscode.ViewColumn) => void,
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
        webviewView.webview.html = getHtmlContentWithUris(this.extensionUri, 'chat', webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (data: any) => {
            switch (data.command) {
                case 'sendMessage':
                    // 이미지 데이터와 MIME 타입도 함께 전달
                    await this.geminiService.handleUserMessageAndRespond(
                        data.text, 
                        webviewView.webview, 
                        PromptType.CODE_GENERATION, 
                        data.imageData, 
                        data.imageMimeType,
                        data.selectedFiles // 선택된 파일들 전달
                    );
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
                    console.log('[ChatViewProvider] Chat webview loaded.');
                    break;
                case 'cancelGeminiCall':
                    console.log('[Extension Host] Received cancelGeminiCall command.');
                    this.geminiService.cancelCurrentCall();
                    webviewView.webview.postMessage({ command: 'receiveMessage', sender: 'CodePilot', text: 'AI 호출이 취소되었습니다.' });
                    break;
                case 'openFilePicker':
                    console.log('[Extension Host] Opening file picker...');
                    this.openFilePicker(webviewView.webview);
                    break;
                case 'displayUserMessage': // 웹뷰 자체에서 사용자 메시지 표시를 요청할 때, 이미지도 포함
                    console.log('Received command to display user message from webview:', data.text, data.imageData);
                    if (data.text !== undefined || data.imageData !== undefined) {
                        webviewView.webview.postMessage({ command: 'displayUserMessage', text: data.text, imageData: data.imageData });
                    }
                    break;
                case 'getLanguage':
                    try {
                        const language = await this.configurationService.getLanguage();
                        webviewView.webview.postMessage({ command: 'currentLanguage', language: language });
                    } catch (error: any) {
                        // 오류 시 기본값 반환
                        webviewView.webview.postMessage({ command: 'currentLanguage', language: 'ko' });
                    }
                    break;
            }
        });
        webviewView.onDidDispose(() => {
            console.log('[ChatViewProvider] Chat view disposed');
            this._view = undefined;
        }, null, this.context.subscriptions);
    }

    private async openFilePicker(webview: vscode.Webview) {
        try {
            // 설정에서 프로젝트 루트 경로 가져오기
            const projectRoot = await this.configurationService.getProjectRoot();
            let defaultUri: vscode.Uri | undefined;
            
            if (projectRoot) {
                defaultUri = vscode.Uri.file(projectRoot);
            } else if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
                defaultUri = vscode.workspace.workspaceFolders[0].uri;
            }

            const uris = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: true,
                openLabel: 'Select Files for Context',
                defaultUri: defaultUri
            });

            if (uris && uris.length > 0) {
                for (const uri of uris) {
                    const fileName = uri.fsPath.split(/[/\\]/).pop() || 'Unknown';
                    webview.postMessage({
                        command: 'fileSelected',
                        filePath: uri.fsPath,
                        fileName: fileName
                    });
                }
            }
        } catch (error) {
            console.error('Error opening file picker:', error);
            this.notificationService.showErrorMessage('파일 선택 중 오류가 발생했습니다.');
        }
    }
}