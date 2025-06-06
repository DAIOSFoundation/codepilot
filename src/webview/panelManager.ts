import * as vscode from 'vscode';
import { StorageService } from '../services/storage';
import { GeminiApi } from '../api/gemini';
import { createAndSetupWebviewPanel } from '../webview/panelUtils';

/**
 * CodePilot 설정 패널을 엽니다.
 */
export function openSettingsPanel(
    extensionUri: vscode.Uri,
    context: vscode.ExtensionContext,
    viewColumn: vscode.ViewColumn,
    storageService: StorageService // storageService 의존성 주입
) {
    createAndSetupWebviewPanel(extensionUri, context, 'settings', 'CodePilot Settings', 'settings', viewColumn,
        async (data, panel) => {
            const config = vscode.workspace.getConfiguration('codepilot');
            switch (data.command) {
                case 'initSettings':
                    panel.webview.postMessage({
                        command: 'currentSettings',
                        sourcePaths: config.get<string[]>('sourcePaths') || [],
                        autoUpdateEnabled: config.get<boolean>('autoUpdateFiles') || false
                    });
                    break;
                case 'addDirectory':
                    const uris = await vscode.window.showOpenDialog({ canSelectFiles: false, canSelectFolders: true, canSelectMany: true, openLabel: 'Select Sources' }); // 파일 선택 불가로 변경
                    if (uris && uris.length > 0) {
                        const newPaths = uris.map(u => u.fsPath);
                        const current = config.get<string[]>('sourcePaths') || [];
                        const updatedPaths = Array.from(new Set([...current, ...newPaths]));
                        await config.update('sourcePaths', updatedPaths, vscode.ConfigurationTarget.Global);
                        panel.webview.postMessage({ command: 'updatedSourcePaths', sourcePaths: updatedPaths });
                    }
                    break;
                case 'removeDirectory':
                    const pathToRemove = data.path;
                    if (pathToRemove) {
                        const current = config.get<string[]>('sourcePaths') || [];
                        const updatedPaths = current.filter(p => p !== pathToRemove);
                        await config.update('sourcePaths', updatedPaths, vscode.ConfigurationTarget.Global);
                        panel.webview.postMessage({ command: 'updatedSourcePaths', sourcePaths: updatedPaths });
                    }
                    break;
                case 'setAutoUpdate':
                    if (typeof data.enabled === 'boolean') {
                        await config.update('autoUpdateFiles', data.enabled, vscode.ConfigurationTarget.Global);
                        panel.webview.postMessage({ command: 'autoUpdateStatusChanged', enabled: data.enabled });
                    }
                    break;
            }
        }
    );
}

/**
 * CodePilot 라이선스 패널을 엽니다.
 */
export function openLicensePanel(
    extensionUri: vscode.Uri,
    context: vscode.ExtensionContext,
    viewColumn: vscode.ViewColumn,
    storageService: StorageService, // storageService 의존성 주입
    geminiApi: GeminiApi // geminiApi 의존성 주입
) {
    createAndSetupWebviewPanel(extensionUri, context, 'license', 'CodePilot License', 'license', viewColumn,
        async (data, panel) => {
            switch (data.command) {
                case 'saveApiKey':
                    const apiKeyToSave = data.apiKey;
                    if (apiKeyToSave && typeof apiKeyToSave === 'string') {
                        try {
                            await storageService.saveApiKey(apiKeyToSave);
                            geminiApi.updateApiKey(apiKeyToSave); // API 키 업데이트
                            panel.webview.postMessage({ command: 'apiKeySaved', message: 'API Key saved!' });
                            vscode.window.showInformationMessage('CodePilot: API Key saved.');
                        } catch (error: any) {
                            panel.webview.postMessage({ command: 'apiKeySaveError', error: error.message });
                        }
                    } else { panel.webview.postMessage({ command: 'apiKeySaveError', error: 'API Key empty.' }); }
                    break;
                case 'checkApiKeyStatus':
                    const currentKey = await storageService.getApiKey();
                    panel.webview.postMessage({ command: 'apiKeyStatus', hasKey: !!currentKey, apiKeyPreview: currentKey ? `***${currentKey.slice(-4)}` : 'Not Set' });
                    break;
            }
        }
    );
}

/**
 * CodePilot 사용자 정의 (빈) 패널을 엽니다.
 */
export function openBlankPanel(
    extensionUri: vscode.Uri,
    context: vscode.ExtensionContext,
    viewColumn: vscode.ViewColumn
) {
    createAndSetupWebviewPanel(extensionUri, context, 'customizing', 'CodePilot Customizing', 'blank', viewColumn,
        (data, panel) => { console.log(`[BlankPanel] Message:`, data); }
    );
}