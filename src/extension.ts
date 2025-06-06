import * as vscode from 'vscode';

// 사용자 정의 모듈 임포트
import { StorageService } from './services/storage';
import { GeminiApi } from './ai/gemini';
import { ConfigurationService } from './services/configurationService'; // 새로 추가
import { NotificationService } from './services/notificationService';   // 새로 추가
import { CodebaseContextService } from './ai/codebaseContextService';   // 새로 추가
import { LlmResponseProcessor } from './ai/llmResponseProcessor';     // 새로 추가
import { GeminiService } from './ai/geminiService'; // 의존성 추가
import { ChatViewProvider } from './webview/chatViewProvider';
import { getCodePilotTerminal } from './terminal/terminalManager';
import { openSettingsPanel, openLicensePanel, openBlankPanel } from './webview/panelManager';

// 전역 변수
let storageService: StorageService;
let geminiApi: GeminiApi;
let configurationService: ConfigurationService; // 새로 추가
let notificationService: NotificationService;   // 새로 추가
let codebaseContextService: CodebaseContextService; // 새로 추가
let llmResponseProcessor: LlmResponseProcessor;     // 새로 추가
let geminiService: GeminiService; // 변경: 더 많은 의존성 주입

export async function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, CodePilot is now active!');

    // 서비스 초기화 (순서 중요: 의존성 주입)
    storageService = new StorageService(context.secrets);
    notificationService = new NotificationService(); // notificationService 초기화
    configurationService = new ConfigurationService(); // configurationService 초기화

    const initialApiKey = await storageService.getApiKey();
    if (!initialApiKey) {
        notificationService.showWarningMessage('CodePilot: Gemini API Key is not set. Please set it in the License panel for AI features.');
    }
    geminiApi = new GeminiApi(initialApiKey || undefined);

    // AI 관련 서비스 초기화
    codebaseContextService = new CodebaseContextService(configurationService, notificationService); // config, noti 서비스 주입
    llmResponseProcessor = new LlmResponseProcessor(context, configurationService, notificationService); // context, config, noti 서비스 주입
    geminiService = new GeminiService(
        storageService,
        geminiApi,
        codebaseContextService, // 새로 추가
        llmResponseProcessor,   // 새로 추가
        notificationService     // 새로 추가
    );

    // ChatViewProvider 인스턴스 생성 및 등록
    const chatViewProvider = new ChatViewProvider(
        context.extensionUri,
        context,
        geminiService,
        // 패널 열기 함수 바인딩 (이제 configurationService, storageService를 직접 전달)
        (viewColumn: vscode.ViewColumn) => openSettingsPanel(context.extensionUri, context, viewColumn, configurationService),
        (viewColumn: vscode.ViewColumn) => openLicensePanel(context.extensionUri, context, viewColumn, storageService, geminiApi, notificationService),
        (viewColumn: vscode.ViewColumn) => openBlankPanel(context.extensionUri, context, viewColumn)
    );

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(ChatViewProvider.viewType, chatViewProvider, {
            webviewOptions: { retainContextWhenHidden: true }
        })
    );

    // Command 등록 (기존과 동일, 필요한 경우 패널 열기 함수에 변경된 서비스 주입)
    context.subscriptions.push(vscode.commands.registerCommand('codepilot.openChatView', () => {
        vscode.commands.executeCommand('workbench.view.extension.codepilotViewContainer');
    }));
    context.subscriptions.push(vscode.commands.registerCommand('codepilot.openSettingsPanel', () => {
        openSettingsPanel(context.extensionUri, context, vscode.ViewColumn.One, configurationService);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('codepilot.openLicensePanel', () => {
        openLicensePanel(context.extensionUri, context, vscode.ViewColumn.One, storageService, geminiApi, notificationService);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('codepilot.openCustomizingPanel', () => {
        openBlankPanel(context.extensionUri, context, vscode.ViewColumn.One);
    }));

    console.log('CodePilot activated and commands registered.');
}

export function deactivate() {
    // 터미널 정리
    const terminal = getCodePilotTerminal();
    if (terminal) {
        terminal.dispose();
    }
}