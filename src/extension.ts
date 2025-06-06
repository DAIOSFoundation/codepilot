import * as vscode from 'vscode';

// 사용자 정의 모듈 임포트
import { StorageService } from './services/storage';
import { GeminiApi } from './api/gemini';
import { GeminiService } from './ai/geminiService';
import { ChatViewProvider } from './webview/chatViewProvider';
import { getCodePilotTerminal } from './terminal/terminalManager';
import { openSettingsPanel, openLicensePanel, openBlankPanel } from './webview/panelManager';

// 전역 변수
let storageService: StorageService;
let geminiApi: GeminiApi;
let geminiService: GeminiService;

export async function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, CodePilot is now active!');

    // 서비스 초기화
    storageService = new StorageService(context.secrets);
    const initialApiKey = await storageService.getApiKey();
    if (!initialApiKey) {
        vscode.window.showWarningMessage('CodePilot: Gemini API Key is not set. Please set it in the License panel for AI features.');
    }
    geminiApi = new GeminiApi(initialApiKey || undefined);
    geminiService = new GeminiService(storageService, geminiApi, context); // GeminiService에 의존성 주입

    // ChatViewProvider 인스턴스 생성 및 등록
    const chatViewProvider = new ChatViewProvider(
        context.extensionUri,
        context,
        geminiService, // GeminiService 인스턴스 주입
        (viewColumn: vscode.ViewColumn) => openSettingsPanel(context.extensionUri, context, viewColumn, storageService), // PanelManager 함수 바인딩
        (viewColumn: vscode.ViewColumn) => openLicensePanel(context.extensionUri, context, viewColumn, storageService, geminiApi), // PanelManager 함수 바인딩
        (viewColumn: vscode.ViewColumn) => openBlankPanel(context.extensionUri, context, viewColumn) // PanelManager 함수 바인딩
    );

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(ChatViewProvider.viewType, chatViewProvider, {
            webviewOptions: { retainContextWhenHidden: true }
        })
    );

    // Command 등록
    context.subscriptions.push(vscode.commands.registerCommand('codepilot.openChatView', () => {
        vscode.commands.executeCommand('workbench.view.extension.codepilotViewContainer');
    }));
    context.subscriptions.push(vscode.commands.registerCommand('codepilot.openSettingsPanel', () => {
        openSettingsPanel(context.extensionUri, context, vscode.ViewColumn.One, storageService);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('codepilot.openLicensePanel', () => {
        openLicensePanel(context.extensionUri, context, vscode.ViewColumn.One, storageService, geminiApi);
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