import * as vscode from 'vscode';

// 사용자 정의 모듈 임포트
import { StorageService } from './services/storage';
import { GeminiApi } from './ai/gemini';
import { ConfigurationService } from './services/configurationService';
import { NotificationService } from './services/notificationService';
import { CodebaseContextService } from './ai/codebaseContextService';
import { LlmResponseProcessor } from './ai/llmResponseProcessor';
import { LlmService, AiModelType } from './ai/llmService';
import { OllamaApi } from './ai/ollamaService';
import { ChatViewProvider } from './webview/chatViewProvider';
import { AskViewProvider } from './webview/askViewProvider'; // 새로 추가된 AskViewProvider 임포트
import { getCodePilotTerminal } from './terminal/terminalManager';
import { openSettingsPanel, openLicensePanel } from './webview/panelManager';
import { LicenseService } from './services/licenseService';

// 전역 변수
let storageService: StorageService;
let geminiApi: GeminiApi;
let ollamaApi: OllamaApi;
let configurationService: ConfigurationService;
let notificationService: NotificationService;
let codebaseContextService: CodebaseContextService;
let llmResponseProcessor: LlmResponseProcessor;
let llmService: LlmService;
let licenseService: LicenseService;

export async function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, CodePilot is now active!');

    // 서비스 초기화 (순서 중요: 의존성 주입)
    storageService = new StorageService(context.secrets);
    notificationService = new NotificationService();
    configurationService = new ConfigurationService();
    licenseService = new LicenseService();

    const initialApiKey = await storageService.getApiKey();
    if (!initialApiKey) {
        notificationService.showWarningMessage('CodePilot: Gemini API Key is not set. Please set it in the License panel for AI features.');
    }
    geminiApi = new GeminiApi(initialApiKey || '');

    // Ollama API 초기화
    const initialOllamaUrl = await storageService.getOllamaApiUrl();
    const initialOllamaEndpoint = await storageService.getOllamaEndpoint();
    ollamaApi = new OllamaApi(initialOllamaUrl || 'http://localhost:11434', initialOllamaEndpoint);

    // AI 관련 서비스 초기화
    codebaseContextService = new CodebaseContextService(configurationService, notificationService);
    llmResponseProcessor = new LlmResponseProcessor(context, configurationService, notificationService);
    llmService = new LlmService(
        storageService,
        geminiApi,
        ollamaApi,
        codebaseContextService,
        llmResponseProcessor,
        notificationService,
        configurationService,
        context // extension context 전달
    );

    // 현재 AI 모델 설정 로드
    const currentAiModel = await storageService.getCurrentAiModel();
    if (currentAiModel) {
        llmService.setCurrentModel(currentAiModel as AiModelType);
    }

    // ChatViewProvider 인스턴스 생성 및 등록 (CODE 탭)
    const chatViewProvider = new ChatViewProvider(
        context.extensionUri,
        context,
        llmService,
        (viewColumn: vscode.ViewColumn) => openSettingsPanel(context.extensionUri, context, viewColumn, configurationService, notificationService, storageService, geminiApi, licenseService, ollamaApi),
        (viewColumn: vscode.ViewColumn) => openLicensePanel(context.extensionUri, context, viewColumn, storageService, geminiApi, notificationService, configurationService),
        configurationService,
        notificationService,
        storageService
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
        llmService,
        configurationService,
        notificationService,
        storageService
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
        openSettingsPanel(context.extensionUri, context, vscode.ViewColumn.One, configurationService, notificationService, storageService, geminiApi, licenseService, ollamaApi);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('codepilot.openLicensePanel', () => {
        openLicensePanel(context.extensionUri, context, vscode.ViewColumn.One, storageService, geminiApi, notificationService, configurationService);
    }));

    // 언어 변경 브로드캐스트 명령어 등록
    context.subscriptions.push(vscode.commands.registerCommand('codepilot.broadcastLanguageChange', (language: string) => {
        // 모든 활성 webview에 언어 변경 메시지 브로드캐스트
        vscode.window.terminals.forEach(terminal => {
            if (terminal.name.includes('CodePilot')) {
                terminal.sendText(`echo "Language changed to: ${language}"`);
            }
        });
        
        // 모든 활성 webview 패널에 언어 변경 메시지 전송
        vscode.window.terminals.forEach(terminal => {
            if (terminal.name.includes('CodePilot')) {
                terminal.sendText(`echo "Language changed to: ${language}"`);
            }
        });
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