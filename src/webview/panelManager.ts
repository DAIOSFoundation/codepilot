import * as vscode from 'vscode';
import { StorageService } from '../services/storage';
import { GeminiApi } from '../ai/gemini';
import { ConfigurationService } from '../services/configurationService'; // 새로 추가
import { NotificationService } from '../services/notificationService'; // 새로 추가
import { createAndSetupWebviewPanel } from './panelUtils';

// 전역 webview 배열 - 모든 활성 webview를 추적
const allWebviews: vscode.Webview[] = [];

/**
 * CodePilot 설정 패널을 엽니다.
 */
export function openSettingsPanel(
    extensionUri: vscode.Uri,
    context: vscode.ExtensionContext,
    viewColumn: vscode.ViewColumn,
    configurationService: ConfigurationService,
    notificationService: NotificationService,
    storageService: StorageService, // StorageService 추가
    geminiApi: GeminiApi // GeminiApi 추가
) {
    const panel = createAndSetupWebviewPanel(extensionUri, context, 'settings', 'CodePilot Settings', 'settings', viewColumn,
        async (data, panel) => {
            switch (data.command) {
                case 'initSettings':
                    panel.webview.postMessage({
                        command: 'currentSettings',
                        sourcePaths: await configurationService.getSourcePaths(),
                        autoUpdateEnabled: await configurationService.isAutoUpdateEnabled(),
                        projectRoot: await configurationService.getProjectRoot()
                    });
                    break;
                case 'addDirectory':
                    const uris = await vscode.window.showOpenDialog({ canSelectFiles: true, canSelectFolders: true, canSelectMany: true, openLabel: 'Select Sources' });
                    if (uris && uris.length > 0) {
                        const newPaths = uris.map(u => u.fsPath);
                        const current = await configurationService.getSourcePaths();
                        const updatedPaths = Array.from(new Set([...current, ...newPaths]));
                        await configurationService.updateSourcePaths(updatedPaths);
                        panel.webview.postMessage({ command: 'updatedSourcePaths', sourcePaths: updatedPaths });
                    }
                    break;
                case 'removeDirectory':
                    const pathToRemove = data.path;
                    if (pathToRemove) {
                        const current = await configurationService.getSourcePaths();
                        const updatedPaths = current.filter(p => p !== pathToRemove);
                        await configurationService.updateSourcePaths(updatedPaths);
                        panel.webview.postMessage({ command: 'updatedSourcePaths', sourcePaths: updatedPaths });
                    }
                    break;
                case 'setAutoUpdate':
                    if (typeof data.enabled === 'boolean') {
                        await configurationService.updateAutoUpdateEnabled(data.enabled);
                        panel.webview.postMessage({ command: 'autoUpdateStatusChanged', enabled: data.enabled });
                    }
                    break;
                case 'setProjectRoot':
                    const rootUris = await vscode.window.showOpenDialog({ canSelectFiles: false, canSelectFolders: true, canSelectMany: false, openLabel: 'Select Project Root' });
                    if (rootUris && rootUris.length > 0) {
                        const newRootPath = rootUris[0].fsPath;
                        await configurationService.updateProjectRoot(newRootPath);
                        panel.webview.postMessage({ command: 'updatedProjectRoot', projectRoot: newRootPath });
                    } else if (data.clear) {
                         await configurationService.updateProjectRoot(undefined);
                         panel.webview.postMessage({ command: 'updatedProjectRoot', projectRoot: '' });
                    }
                    break;
                case 'loadApiKeys':
                    // API 키 상태 로드
                    const weatherApiKey = await configurationService.getWeatherApiKey();
                    const newsApiKey = await configurationService.getNewsApiKey();
                    const newsApiSecret = await configurationService.getNewsApiSecret();
                    const stockApiKey = await configurationService.getStockApiKey();
                    const geminiApiKey = await storageService.getApiKey(); // Gemini API 키 추가
                    panel.webview.postMessage({ 
                        command: 'currentApiKeys', 
                        weatherApiKey: weatherApiKey || '', 
                        newsApiKey: newsApiKey || '', 
                        newsApiSecret: newsApiSecret || '',
                        stockApiKey: stockApiKey || '',
                        geminiApiKey: geminiApiKey || '' // Gemini API 키 추가
                    });
                    break;
                case 'saveApiKey': // Gemini API 키 저장 케이스 추가
                    const apiKeyToSave = data.apiKey;
                    if (apiKeyToSave && typeof apiKeyToSave === 'string') {
                        try {
                            await storageService.saveApiKey(apiKeyToSave);
                            geminiApi.updateApiKey(apiKeyToSave);
                            panel.webview.postMessage({ command: 'apiKeySaved' });
                            notificationService.showInfoMessage('CodePilot: Gemini API Key saved.');
                        } catch (error: any) {
                            panel.webview.postMessage({ command: 'apiKeySaveError', error: error.message });
                            notificationService.showErrorMessage(`Error saving Gemini API Key: ${error.message}`);
                        }
                    } else {
                        panel.webview.postMessage({ command: 'apiKeySaveError', error: 'API Key empty.' });
                        notificationService.showErrorMessage('Gemini API Key is empty.');
                    }
                    break;
                case 'saveWeatherApiKey':
                    try {
                        await configurationService.updateWeatherApiKey(data.apiKey);
                        panel.webview.postMessage({ command: 'weatherApiKeySaved' });
                        notificationService.showInfoMessage('CodePilot: Weather API key saved.');
                    } catch (error: any) {
                        panel.webview.postMessage({ command: 'weatherApiKeyError', error: error.message });
                        notificationService.showErrorMessage(`Error saving weather API key: ${error.message}`);
                    }
                    break;
                case 'saveNewsApiKey':
                    try {
                        await configurationService.updateNewsApiKey(data.apiKey);
                        panel.webview.postMessage({ command: 'newsApiKeySaved' });
                        notificationService.showInfoMessage('CodePilot: News API key saved.');
                    } catch (error: any) {
                        panel.webview.postMessage({ command: 'newsApiKeyError', error: error.message });
                        notificationService.showErrorMessage(`Error saving news API key: ${error.message}`);
                    }
                    break;
                case 'saveNewsApiSecret':
                    try {
                        await configurationService.updateNewsApiSecret(data.apiSecret);
                        panel.webview.postMessage({ command: 'newsApiSecretSaved' });
                        notificationService.showInfoMessage('CodePilot: News API secret saved.');
                    } catch (error: any) {
                        panel.webview.postMessage({ command: 'newsApiSecretError', error: error.message });
                        notificationService.showErrorMessage(`Error saving news API secret: ${error.message}`);
                    }
                    break;
                case 'saveStockApiKey':
                    try {
                        await configurationService.updateStockApiKey(data.apiKey);
                        panel.webview.postMessage({ command: 'stockApiKeySaved' });
                        notificationService.showInfoMessage('CodePilot: Stock API key saved.');
                    } catch (error: any) {
                        panel.webview.postMessage({ command: 'stockApiKeyError', error: error.message });
                        notificationService.showErrorMessage(`Error saving stock API key: ${error.message}`);
                    }
                    break;
                case 'saveLanguage':
                    try {
                        const language = data.language;
                        if (language && typeof language === 'string') {
                            // 언어 설정을 저장
                            await configurationService.updateLanguage(language);
                            panel.webview.postMessage({ command: 'languageSaved', language: language });
                            notificationService.showInfoMessage(`CodePilot: Language changed to ${language}.`);
                            
                            // 모든 활성 webview에 언어 변경 브로드캐스트
                            allWebviews.forEach(webview => {
                                webview.postMessage({ command: 'languageChanged', language });
                            });
                        }
                    } catch (error: any) {
                        panel.webview.postMessage({ command: 'languageSaveError', error: error.message });
                        notificationService.showErrorMessage(`Error saving language: ${error.message}`);
                    }
                    break;
                case 'getLanguage':
                    try {
                        const language = await configurationService.getLanguage();
                        panel.webview.postMessage({ command: 'currentLanguage', language: language });
                    } catch (error: any) {
                        // 오류 시 기본값 반환
                        panel.webview.postMessage({ command: 'currentLanguage', language: 'ko' });
                    }
                    break;
                case 'getLanguageData':
                    try {
                        const language = data.language;
                        if (language && typeof language === 'string') {
                            // 언어 파일 경로
                            const languageFilePath = vscode.Uri.joinPath(extensionUri, 'webview', 'locales', `lang_${language}.json`);
                            
                            // 파일 읽기
                            const fileContent = await vscode.workspace.fs.readFile(languageFilePath);
                            const languageData = JSON.parse(Buffer.from(fileContent).toString('utf8'));
                            
                            // 웹뷰에 언어 데이터 전송
                            panel.webview.postMessage({ 
                                command: 'languageDataReceived', 
                                language: language, 
                                data: languageData 
                            });
                        }
                    } catch (error: any) {
                        console.error('Error loading language data:', error);
                        // 오류 시 기본 한국어 데이터 반환
                        try {
                            const defaultLanguagePath = vscode.Uri.joinPath(extensionUri, 'webview', 'locales', 'lang_ko.json');
                            const defaultContent = await vscode.workspace.fs.readFile(defaultLanguagePath);
                            const defaultData = JSON.parse(Buffer.from(defaultContent).toString('utf8'));
                            panel.webview.postMessage({ 
                                command: 'languageDataReceived', 
                                language: 'ko', 
                                data: defaultData 
                            });
                        } catch (fallbackError) {
                            console.error('Error loading fallback language data:', fallbackError);
                        }
                    }
                    break;
            }
        }
    );
    
    // webview를 전역 배열에 등록
    allWebviews.push(panel.webview);
    
    // 패널이 dispose될 때 배열에서 제거
    panel.onDidDispose(() => {
        const idx = allWebviews.indexOf(panel.webview);
        if (idx !== -1) {
            allWebviews.splice(idx, 1);
        }
    }, undefined, context.subscriptions);
    
    return panel;
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
    const panel = createAndSetupWebviewPanel(extensionUri, context, 'license', 'CodePilot License', 'license', viewColumn,
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
    
    // webview를 전역 배열에 등록
    allWebviews.push(panel.webview);
    
    // 패널이 dispose될 때 배열에서 제거
    panel.onDidDispose(() => {
        const idx = allWebviews.indexOf(panel.webview);
        if (idx !== -1) {
            allWebviews.splice(idx, 1);
        }
    }, undefined, context.subscriptions);
    
    return panel;
}

/**
 * CodePilot 사용자 정의 (빈) 패널을 엽니다.
 */
export function openBlankPanel(
    extensionUri: vscode.Uri,
    context: vscode.ExtensionContext,
    viewColumn: vscode.ViewColumn
) {
    const panel = createAndSetupWebviewPanel(extensionUri, context, 'customizing', 'CodePilot Customizing', 'blank', viewColumn,
        (data, panel) => { console.log(`[BlankPanel] Message:`, data); }
    );
    
    // webview를 전역 배열에 등록
    allWebviews.push(panel.webview);
    
    // 패널이 dispose될 때 배열에서 제거
    panel.onDidDispose(() => {
        const idx = allWebviews.indexOf(panel.webview);
        if (idx !== -1) {
            allWebviews.splice(idx, 1);
        }
    }, undefined, context.subscriptions);
    
    return panel;
}
