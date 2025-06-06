import * as vscode from 'vscode';

// 사용자 정의 모듈 임포트
import { StorageService } from './services/storage';
import { GeminiApi } from './ai/gemini';
import { ConfigurationService } from './services/configurationService';
import { NotificationService } from './services/notificationService';
import { CodebaseContextService } from './ai/codebaseContextService';
import { LlmResponseProcessor } from './ai/llmResponseProcessor';
import { GeminiService } from './ai/geminiService';
import { ChatViewProvider } from './webview/chatViewProvider';
import { AskViewProvider } from './webview/askViewProvider'; // 새로 추가된 AskViewProvider 임포트
import { getCodePilotTerminal } from './terminal/terminalManager';
import { openSettingsPanel, openLicensePanel, openBlankPanel } from './webview/panelManager';

// 전역 변수
let storageService: StorageService;
let geminiApi: GeminiApi;
let configurationService: ConfigurationService;
let notificationService: NotificationService;
let codebaseContextService: CodebaseContextService;
let llmResponseProcessor: LlmResponseProcessor;
let geminiService: GeminiService;

export async function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, CodePilot is now active!');

    // 서비스 초기화 (순서 중요: 의존성 주입)
    storageService = new StorageService(context.secrets);
    notificationService = new NotificationService();
    configurationService = new ConfigurationService();

    const initialApiKey = await storageService.getApiKey();
    if (!initialApiKey) {
        notificationService.showWarningMessage('CodePilot: Gemini API Key is not set. Please set it in the License panel for AI features.');
    }
    geminiApi = new GeminiApi(initialApiKey || '');

    // AI 관련 서비스 초기화
    codebaseContextService = new CodebaseContextService(configurationService, notificationService);
    llmResponseProcessor = new LlmResponseProcessor(context, configurationService, notificationService);
    geminiService = new GeminiService(
        storageService,
        geminiApi,
        codebaseContextService,
        llmResponseProcessor,
        notificationService,
        configurationService
    );

    // ChatViewProvider 인스턴스 생성 및 등록 (CODE 탭)
    const chatViewProvider = new ChatViewProvider(
        context.extensionUri,
        context,
        geminiService,
        (viewColumn: vscode.ViewColumn) => openSettingsPanel(context.extensionUri, context, viewColumn, configurationService),
        (viewColumn: vscode.ViewColumn) => openLicensePanel(context.extensionUri, context, viewColumn, storageService, geminiApi, notificationService),
        (viewColumn: vscode.ViewColumn) => openBlankPanel(context.extensionUri, context, viewColumn)
    );

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(ChatViewProvider.viewType, chatViewProvider, {
            webviewOptions: { retainContextWhenHidden: true }
        })
    );

    // AskViewProvider 인스턴스 생성 및 등록 (ASK 탭)
    const askViewProvider = new AskViewProvider(
        context.extensionUri,
        context,
        geminiService,
        (viewColumn: vscode.ViewColumn) => openSettingsPanel(context.extensionUri, context, viewColumn, configurationService),
        (viewColumn: vscode.ViewColumn) => openLicensePanel(context.extensionUri, context, viewColumn, storageService, geminiApi, notificationService),
        (viewColumn: vscode.ViewColumn) => openBlankPanel(context.extensionUri, context, viewColumn)
    );

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(AskViewProvider.viewType, askViewProvider, {
            webviewOptions: { retainContextWhenHidden: true }
        })
    );

    // Command 등록
    context.subscriptions.push(vscode.commands.registerCommand('codepilot.openChatView', () => {
        vscode.commands.executeCommand('workbench.view.extension.codepilotViewContainer');
        vscode.commands.executeCommand(`${ChatViewProvider.viewType}.focus`); // CODE 탭으로 포커스
    }));
    context.subscriptions.push(vscode.commands.registerCommand('codepilot.openAskView', () => {
        vscode.commands.executeCommand('workbench.view.extension.codepilotViewContainer');
        vscode.commands.executeCommand(`${AskViewProvider.viewType}.focus`); // ASK 탭으로 포커스
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