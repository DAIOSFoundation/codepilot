import * as vscode from 'vscode';
import { getHtmlContentWithUris } from './panelUtils';
import { LlmService, PromptType } from '../ai/llmService'; // LlmService 및 PromptType 임포트
import { ConfigurationService } from '../services/configurationService';
import { NotificationService } from '../services/notificationService';
import { StorageService } from '../services/storage';

export class AskViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'codepilot.askView'; // 새로운 뷰 타입
    private _view?: vscode.WebviewView;

    constructor(
        private readonly extensionUri: vscode.Uri,
        private readonly context: vscode.ExtensionContext,
        private readonly llmService: LlmService, // LlmService 인스턴스 주입
        private readonly configurationService: ConfigurationService,
        private readonly notificationService: NotificationService,
        private readonly storageService: StorageService
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
                    // 라이센스 확인
                    const licenseSerial = await this.storageService.getBanyaLicenseSerial();
                    if (!licenseSerial || licenseSerial.trim() === '') {
                        // 다국어 메시지 가져오기
                        const currentLanguage = await this.configurationService.getLanguage();
                        const languageFilePath = vscode.Uri.joinPath(this.extensionUri, 'webview', 'locales', `lang_${currentLanguage}.json`);
                        let licenseNotSetMessage = '라이센스가 설정되지 않았습니다. 설정에서 Banya 라이센스를 입력하고 검증해주세요.';
                        
                        try {
                            const fileContent = await vscode.workspace.fs.readFile(languageFilePath);
                            const languageData = JSON.parse(Buffer.from(fileContent).toString('utf8'));
                            licenseNotSetMessage = languageData.licenseNotSetMessage || licenseNotSetMessage;
                        } catch (error) {
                            console.error('Error loading language data for license message:', error);
                        }
                        
                        webviewView.webview.postMessage({ 
                            command: 'receiveMessage', 
                            sender: 'CodePilot', 
                            text: licenseNotSetMessage
                        });
                        return;
                    }
                    
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