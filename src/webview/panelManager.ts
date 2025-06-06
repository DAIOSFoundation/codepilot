import * as vscode from 'vscode';
import { StorageService } from '../services/storage';
import { GeminiApi } from '../ai/gemini';
import { ConfigurationService } from '../services/configurationService'; // 새로 추가
import { NotificationService } from '../services/notificationService'; // 새로 추가
import { createAndSetupWebviewPanel } from './panelUtils';

/**
 * CodePilot 설정 패널을 엽니다.
 */
export function openSettingsPanel(
    extensionUri: vscode.Uri,
    context: vscode.ExtensionContext,
    viewColumn: vscode.ViewColumn,
    configurationService: ConfigurationService // configurationService 주입
) {
    createAndSetupWebviewPanel(extensionUri, context, 'settings', 'CodePilot Settings', 'settings', viewColumn,
        async (data, panel) => {
            switch (data.command) {
                case 'initSettings':
                    panel.webview.postMessage({
                        command: 'currentSettings',
                        sourcePaths: await configurationService.getSourcePaths(), // ConfigurationService 사용
                        autoUpdateEnabled: await configurationService.isAutoUpdateEnabled(), // ConfigurationService 사용
                        projectRoot: await configurationService.getProjectRoot() // 프로젝트 Root 추가
                    });
                    break;
                case 'addDirectory':
                    const uris = await vscode.window.showOpenDialog({ canSelectFiles: true, canSelectFolders: true, canSelectMany: true, openLabel: 'Select Sources' });
                    if (uris && uris.length > 0) {
                        const newPaths = uris.map(u => u.fsPath);
                        const current = await configurationService.getSourcePaths(); // Promise를 기다립니다.
                        const updatedPaths = Array.from(new Set([...current, ...newPaths]));
                        await configurationService.updateSourcePaths(updatedPaths); // ConfigurationService 사용
                        panel.webview.postMessage({ command: 'updatedSourcePaths', sourcePaths: updatedPaths });
                    }
                    break;
                case 'removeDirectory':
                    const pathToRemove = data.path;
                    if (pathToRemove) {
                        const current = await configurationService.getSourcePaths(); // Promise를 기다립니다.
                        const updatedPaths = current.filter(p => p !== pathToRemove);
                        await configurationService.updateSourcePaths(updatedPaths); // ConfigurationService 사용
                        panel.webview.postMessage({ command: 'updatedSourcePaths', sourcePaths: updatedPaths });
                    }
                    break;
                case 'setAutoUpdate':
                    if (typeof data.enabled === 'boolean') {
                        await configurationService.updateAutoUpdateEnabled(data.enabled); // ConfigurationService 사용
                        panel.webview.postMessage({ command: 'autoUpdateStatusChanged', enabled: data.enabled });
                    }
                    break;
                case 'setProjectRoot':
                    const rootUris = await vscode.window.showOpenDialog({ canSelectFiles: false, canSelectFolders: true, canSelectMany: false, openLabel: 'Select Project Root' });
                    if (rootUris && rootUris.length > 0) {
                        const newRootPath = rootUris[0].fsPath;
                        await configurationService.updateProjectRoot(newRootPath);
                        panel.webview.postMessage({ command: 'updatedProjectRoot', projectRoot: newRootPath });
                    } else if (data.clear) { // Root 경로를 비우는 옵션 추가 (선택하지 않고 닫았을 때)
                         await configurationService.updateProjectRoot(undefined); // undefined를 저장하여 설정에서 제거 또는 빈 문자열로 설정
                         panel.webview.postMessage({ command: 'updatedProjectRoot', projectRoot: '' });
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
    storageService: StorageService,
    geminiApi: GeminiApi,
    notificationService: NotificationService // NotificationService 주입
) {
    createAndSetupWebviewPanel(extensionUri, context, 'license', 'CodePilot License', 'license', viewColumn,
        async (data, panel) => {
            switch (data.command) {
                case 'saveApiKey':
                    const apiKeyToSave = data.apiKey;
                    if (apiKeyToSave && typeof apiKeyToSave === 'string') {
                        try {
                            await storageService.saveApiKey(apiKeyToSave);
                            geminiApi.updateApiKey(apiKeyToSave);
                            panel.webview.postMessage({ command: 'apiKeySaved', message: 'API Key saved!' });
                            notificationService.showInfoMessage('CodePilot: API Key saved.'); // NotificationService 사용
                        } catch (error: any) {
                            panel.webview.postMessage({ command: 'apiKeySaveError', error: error.message });
                            notificationService.showErrorMessage(`Error saving API Key: ${error.message}`); // NotificationService 사용
                        }
                    } else {
                        panel.webview.postMessage({ command: 'apiKeySaveError', error: 'API Key empty.' });
                        notificationService.showErrorMessage('API Key is empty.'); // NotificationService 사용
                    }
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
