import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

// 새로 생성한 모듈 임포트
import { StorageService } from './storage/storage';
import { GeminiApi } from './api/gemini';

// 터미널 인스턴스를 저장하기 위한 변수
let codePilotTerminal: vscode.Terminal | undefined;

// API 및 스토리지 서비스 인스턴스 (전역 또는 싱글톤으로 관리)
let storageService: StorageService;
let geminiApi: GeminiApi;

// 터미널을 가져오거나 생성하는 헬퍼 함수
function getCodePilotTerminal(): vscode.Terminal {
    if (!codePilotTerminal || codePilotTerminal.exitStatus !== undefined) {
        codePilotTerminal = vscode.window.createTerminal({ name: "CodePilot Terminal" });
        vscode.window.onDidCloseTerminal(event => {
            if (event === codePilotTerminal) {
                codePilotTerminal = undefined;
            }
        });
    }
    return codePilotTerminal;
}


// 채팅 뷰를 제공하는 WebviewViewProvider 구현 클래스 (Activity Bar View 용)
class ChatViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewId = 'codepilot.chatView';
    private _view?: vscode.WebviewView;
    constructor(private readonly _extensionUri: vscode.Uri) {}

    public resolveWebviewView( webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext, _token: vscode.CancellationToken, ) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
             // localResourceRoots에 dist/webview도 추가 (chat.js 및 codeCopy.js 로드용)
            localResourceRoots: [ this._extensionUri, vscode.Uri.joinPath(this._extensionUri, 'webview'), vscode.Uri.joinPath(this._extensionUri, 'media'), vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview') ]
        };

        // ChatViewProvider에서는 직접 HTML을 읽고 URI를 치환하여 로드
        webviewView.webview.html = getHtmlContentWithUris(this._extensionUri, 'chat', webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async data => { // <-- async 유지 -->
            switch (data.command) {
                case 'sendMessage':
                    console.log('Received message from chat view:', data.text);
                    const userText = data.text.trim();

                    // 사용자 메시지는 웹뷰 자체에서 처리하도록 변경됨

                    const apiKey = await storageService.getApiKey();
                    if (!apiKey) {
                        this._view?.webview.postMessage({ command: 'receiveMessage', text: "Error: Gemini API Key is not set. Please go to the License panel to set it.", sender: 'CodePilot' });
                        return;
                    }

                    // 터미널 명령 우선 처리
                    if (userText === '앱 실행') {
                         const terminal = getCodePilotTerminal();
                         terminal.show();
                         terminal.sendText('npm start', true);
                         this._view?.webview.postMessage({ command: 'receiveMessage', text: "Running `npm start` in terminal...", sender: 'CodePilot' });

                    } else if (userText === '깃 푸쉬') {
                         const terminal = getCodePilotTerminal();
                         terminal.show();
                         terminal.sendText('git add -A', true);
                         terminal.sendText('git commit -m "n/a"', true);
                         terminal.sendText('git push', true);
                         this._view?.webview.postMessage({ command: 'receiveMessage', text: "Executing Git commands in terminal...", sender: 'CodePilot' });

                    } else {
                         // <-- 추가: Gemini API 호출 전에 로딩 표시 메시지 전송 -->
                         this._view?.webview.postMessage({ command: 'showLoading' });
                         // <-- 추가 끝 -->

                         // Gemini API 호출
                         console.log('Sending message to Gemini...');
                         let geminiResponse = "Error sending message to CodePilot AI.";
                         try { geminiResponse = await geminiApi.sendMessage(userText); }
                         catch (error: any) { console.error("Gemini API Call Failed:", error); geminiResponse = `Error: Failed to get response from AI. ${error.message || ''}`; }
                         finally {
                             // <-- 추가: Gemini API 호출 완료 (성공/실패) 후에 로딩 표시 제거 메시지 전송 -->
                             // 응답과 함께 receiveMessage를 보내거나, 별도로 hideLoading을 보낼 수 있습니다.
                             // 여기서는 receiveMessage 처리 시 Webview에서 hideLoading을 호출하도록 구현했습니다.
                             // this._view?.webview.postMessage({ command: 'hideLoading' });
                             // <-- 추가 끝 -->
                         }

                         // CodePilot 응답을 UI에 표시 (Gemini 응답 사용)
                         this._view?.webview.postMessage({ command: 'receiveMessage', text: geminiResponse, sender: 'CodePilot' });
                    }
                    break;
                case 'openPanel':
                    console.log(`Received open panel command from chat view: ${data.panel}`);
                     // Activity Bar View의 메뉴에서 패널 열기 (ViewColumn.One에 고정)
                    if (data.panel === 'settings') { openSettingsPanel(this._extensionUri, 'Settings', 'CodePilot Settings', vscode.ViewColumn.One); }
                    else if (data.panel === 'license') {
                         openLicensePanel(this._extensionUri, 'License', 'CodePilot License Information', vscode.ViewColumn.One);
                    } else if (data.panel === 'customizing') { openBlankPanel(this._extensionUri, 'Customizing', 'CodePilot Customization Options'); }
                    break;
                 // TODO: License Panel에서 보낸 메시지 (예: checkApiKeyStatus) 처리는 ChatViewProvider에서도 필요하다면 여기에 추가
            }
        });

         webviewView.onDidDispose(() => { console.log('Chat view disposed'); this._view = undefined; });
        console.log('Chat View resolved (via sidebar)');
    }
}


export async function activate(context: vscode.ExtensionContext) { // <-- async 유지 -->
    console.log('Congratulations, your extension "codepilot" is now active!');

    // 스토리지 서비스 초기화
    storageService = new StorageService(context.secrets);

    // 저장된 API Key를 불러와 Gemini API 초기화
    const apiKey = await storageService.getApiKey();
    // GeminiApi 생성자에서 updateApiKey를 호출하여 초기화합니다.
    geminiApi = new GeminiApi(apiKey || undefined);

    // 1. Chat Webview View Provider 등록 (Activity Bar 아이콘 클릭 시 작동)
    const chatViewProvider = new ChatViewProvider(context.extensionUri);
    context.subscriptions.push( vscode.window.registerWebviewViewProvider(ChatViewProvider.viewId, chatViewProvider) );

    // 확장이 활성화될 때 터미널에 메시지 출력
    const terminal = getCodePilotTerminal();
    terminal.show();
    terminal.sendText("echo CodePilot activated!", true);


    // 2. Command 등록 (package.json의 contributes.commands[]에 정의된 명령어들)

    // <-- 수정: openSettingsPanel 명령어 핸들러 변경 -->
    const openSettingsPanelCommand = vscode.commands.registerCommand('codepilot.openSettingsPanel', () => {
        // settings.html 파일을 로드하는 새로운 헬퍼 함수 호출
        openSettingsPanel(context.extensionUri, 'Settings', 'CodePilot Settings', vscode.ViewColumn.One);
    });
    context.subscriptions.push(openSettingsPanelCommand);
    // <-- 수정 끝 -->

    const openLicensePanelCommand = vscode.commands.registerCommand('codepilot.openLicensePanel', () => {
        // License 패널 명령어 실행 시 ViewColumn.One에 열도록 고정
        openLicensePanel(context.extensionUri, 'License', 'CodePilot License Information', vscode.ViewColumn.One);
    });
    context.subscriptions.push(openLicensePanelCommand);

    const openCustomizingPanelCommand = vscode.commands.registerCommand('codepilot.openCustomizingPanel', () => {
        openBlankPanel(context.extensionUri, 'Customizing', 'CodePilot Customization Options');
    });
    context.subscriptions.push(openCustomizingPanelCommand);

    const helloWorldCommand = vscode.commands.registerCommand('codepilot.helloWorld', () => {
        terminal.sendText("echo Hello from CodePilot!", true);
        terminal.show();
    });
    context.subscriptions.push(helloWorldCommand);

    // 'Open Banya Chat' 명령어 핸들러 등록
    const openBanyaChatCommand = vscode.commands.registerCommand('codepilot.openChatView', () => {
        console.log('Executing command: Open Banya Chat (using createWebviewPanel in ViewColumn.Two)');
        // Chat 패널은 ViewColumn.Two에 열도록 기본값 설정
        openChatPanel(context.extensionUri, 'Chat', 'CodePilot Chat', vscode.ViewColumn.Two);
    });
    context.subscriptions.push(openBanyaChatCommand);


     // TODO: 필요한 다른 기능 구현
}

export function deactivate() {
     console.log('Your extension "codepilot" is now deactivated.');
     codePilotTerminal?.dispose();
}

// HTML 파일 내용을 읽고 URI를 치환하는 범용 함수
// ChatViewProvider와 createWebviewPanelWithHtml 모두에서 사용할 수 있습니다.
function getHtmlContentWithUris(extensionUri: vscode.Uri, htmlFileName: string, webview: vscode.Webview): string {
    const htmlFilePath = vscode.Uri.joinPath(extensionUri, 'webview', `${htmlFileName}.html`);
    let htmlContent = '';

    try {
        htmlContent = fs.readFileSync(htmlFilePath.fsPath, 'utf8');
        console.log(`Successfully read ${htmlFileName}.html. Content length: ${htmlContent.length}`);


        // 아이콘 경로 치환 (필요하다면)
        const settingsIconUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'settings-gear.svg'));
        const licenseIconUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'book.svg'));
        const customizingIconUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'paintbrush.svg'));

        htmlContent = htmlContent
            .replace('{{settingsIconUri}}', settingsIconUri.toString())
            .replace('{{licenseIconUri}}', licenseIconUri.toString())
            .replace('{{customizingIconUri}}', customizingIconUri.toString());

        // chat.js 및 codeCopy.js 파일의 Webview URI 생성 및 치환
        if (htmlFileName === 'chat') {
            const chatScriptPathInExtension = vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'chat.js');
            const codeCopyScriptPathInExtension = vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'codeCopy.js');

            const chatScriptUri = webview.asWebviewUri(chatScriptPathInExtension);
            const codeCopyScriptUri = webview.asWebviewUri(codeCopyScriptPathInExtension);

            console.log(`[URI Debug] Generated chat script URI: ${chatScriptUri.toString()}`);
            console.log(`[URI Debug] Generated codeCopy script URI: ${codeCopyScriptUri.toString()}`);


            const chatPlaceholder = '{{scriptUri}}';
            if (htmlContent.includes(chatPlaceholder)) {
                htmlContent = htmlContent.replace(chatPlaceholder, chatScriptUri.toString());
                console.log(`[URI Debug] Successfully replaced "${chatPlaceholder}".`);
            } else {
                console.warn(`[URI Debug] Placeholder "${chatPlaceholder}" not found in ${htmlFileName}.html content.`);
            }

            const codeCopyPlaceholder = '{{codeCopyScriptUri}}';
            if (htmlContent.includes(codeCopyPlaceholder)) {
               htmlContent = htmlContent.replace(codeCopyPlaceholder, codeCopyScriptUri.toString());
               console.log(`[URI Debug] Successfully replaced "${codeCopyPlaceholder}".`);
            } else {
               console.warn(`[URI Debug] Placeholder "${codeCopyPlaceholder}" not found in ${htmlFileName}.html content.`);
            }
        }
        // settings.html 스크립트 URI 치환 로직
        else if (htmlFileName === 'settings') { // settings.html 파일인 경우
            // settings.js 스크립트 URI 생성
            const settingsScriptPathInExtension = vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'settings.js');
            const settingsScriptUri = webview.asWebviewUri(settingsScriptPathInExtension);
            console.log(`[URI Debug] Generated settings script URI: ${settingsScriptUri.toString()}`);

            const settingsPlaceholder = '{{scriptUri}}'; // settings.html도 동일한 플레이스홀더 사용한다고 가정
            if (htmlContent.includes(settingsPlaceholder)) {
                htmlContent = htmlContent.replace(settingsPlaceholder, settingsScriptUri.toString());
                console.log(`[URI Debug] Successfully replaced "${settingsPlaceholder}" in settings.html.`);
            } else {
                console.warn(`[URI Debug] Placeholder "${settingsPlaceholder}" not found in ${htmlFileName}.html content.`);
            }
        }


        console.log('[URI Debug] Checking localResourceRoots set for this webview:');
        const roots = webview.options.localResourceRoots;
        if (roots && Array.isArray(roots)) {
            for (const root of roots) {
                 if (root instanceof vscode.Uri) {
                    console.log(`- Root: ${root.toString()} (fsPath: ${root.fsPath})`);
                 } else {
                    console.log(`- Root: Invalid URI type`);
                 }
            }
        } else {
            console.log('- No localResourceRoots set.');
        }

    } catch (error: unknown) {
        console.error(`[URI Debug] Error during getHtmlContentWithUris for ${htmlFileName}.html:`, error);
        const errorMessage = (typeof error === 'object' && error !== null && 'message' in error)
            ? (error as { message: string }).message
            : String(error);
        htmlContent = `<h1>Error loading ${htmlFileName} view</h1><p>${errorMessage}</p><p>Check console for details.</p>`;
    }
    return htmlContent;
}


// createWebviewPanelWithHtml 함수 - HTML 로딩 부분을 getHtmlContentWithUris로 변경
function createWebviewPanelWithHtml(
    extensionUri: vscode.Uri,
    panelIdSuffix: string,
    panelTitle: string,
    htmlFileName: string,
    viewColumn: vscode.ViewColumn = vscode.ViewColumn.One,
    onDidReceiveMessage?: (data: any, panel: vscode.WebviewPanel) => void
) {
     const panel = vscode.window.createWebviewPanel(
         `codepilot.${panelIdSuffix.toLowerCase()}`, panelTitle, viewColumn,
         {
             enableScripts: true,
             // localResourceRoots에 dist/webview도 추가 (스크립트 로드용)
             localResourceRoots: [ extensionUri, vscode.Uri.joinPath(extensionUri, 'webview'), vscode.Uri.joinPath(extensionUri, 'media'), vscode.Uri.joinPath(extensionUri, 'dist', 'webview') ]
         }
     );

    // HTML 콘텐츠를 getHtmlContentWithUris 함수로 가져옴
    panel.webview.html = getHtmlContentWithUris(extensionUri, htmlFileName, panel.webview);


    panel.onDidDispose(() => { console.log(`${panelTitle} panel closed`); }, null, []);

    if (onDidReceiveMessage) {
        panel.webview.onDidReceiveMessage(data => { onDidReceiveMessage(data, panel); });
    }

    return panel;
}


// blank.html을 로드하는 헬퍼 함수 (SettingsPanel에서 openBlankPanel은 다른 용도로 사용)
function openBlankPanel(extensionUri: vscode.Uri, panelIdSuffix: string, panelTitle: string) {
     createWebviewPanelWithHtml(extensionUri, panelIdSuffix, panelTitle, 'blank');
}

// License Panel을 여는 헬퍼 함수 (이전과 동일)
function openLicensePanel(extensionUri: vscode.Uri, panelIdSuffix: string, panelTitle: string, viewColumn: vscode.ViewColumn = vscode.ViewColumn.One) {
     createWebviewPanelWithHtml(extensionUri, panelIdSuffix, panelTitle, 'license', viewColumn,
         async (data, panel) => {
             switch (data.command) {
                 case 'saveApiKey':
                     console.log('Received saveApiKey command from license panel.');
                     const apiKey = data.apiKey;
                     if (apiKey) {
                         try {
                             await storageService.saveApiKey(apiKey);
                             geminiApi.updateApiKey(apiKey);
                             panel.webview.postMessage({ command: 'apiKeySaved' });
                         } catch (error: any) { console.error('Error saving API Key:', error); panel.webview.postMessage({ command: 'apiKeySaveError', error: error.message || String(error) }); }
                     } else {
                          console.warn('Received saveApiKey command but API key was empty.');
                          panel.webview.postMessage({ command: 'apiKeySaveError', error: 'API Key cannot be empty.' });
                     }
                     break;
                 case 'checkApiKeyStatus':
                    const currentKey = await storageService.getApiKey();
                    panel.webview.postMessage({ command: 'apiKeyStatus', hasKey: !!currentKey });
                    break;
             }
         }
     );
}

// Settings Panel을 여는 헬퍼 함수
function openSettingsPanel(
    extensionUri: vscode.Uri,
    panelIdSuffix: string,
    panelTitle: string,
    viewColumn: vscode.ViewColumn = vscode.ViewColumn.One
) {
    createWebviewPanelWithHtml(extensionUri, panelIdSuffix, panelTitle, 'settings', viewColumn,
        async (data, panel) => {
            const config = vscode.workspace.getConfiguration('codepilot');

            switch (data.command) {
                case 'initSettings':
                    console.log('Received initSettings command from settings panel.');
                    const sourcePaths = config.get<string[]>('sourcePaths') || [];
                    panel.webview.postMessage({ command: 'currentSettings', sourcePaths: sourcePaths });
                    break;

                case 'addDirectory':
                    console.log('Received addDirectory command from settings panel.');
                    const options: vscode.OpenDialogOptions = {
                        canSelectFolders: true, // 폴더 선택 가능
                        canSelectFiles: true, // <-- 수정: 파일 선택 가능
                        canSelectMany: true, // <-- 수정: 여러 개 선택 가능
                        openLabel: 'Select Source File(s) or Directory(ies)' // <-- 수정: 버튼 텍스트
                    };
                    const selectedUris = await vscode.window.showOpenDialog(options); // <-- 수정: folderUris 대신 selectedUris
                    if (selectedUris && selectedUris.length > 0) {
                        const newPathsToAdd = selectedUris.map(uri => uri.fsPath); // <-- 수정: 여러 경로 매핑
                        const currentPaths = config.get<string[]>('sourcePaths') || [];
                        let updatedPaths = [...currentPaths]; // <-- 수정: 기존 경로 복사

                        newPathsToAdd.forEach(newPath => { // <-- 수정: 각 새 경로를 순회
                            if (!updatedPaths.includes(newPath)) { // 중복 방지
                                updatedPaths.push(newPath); // 경로 추가
                                vscode.window.showInformationMessage(`CodePilot: Added source path '${newPath}'`);
                            } else {
                                vscode.window.showInformationMessage(`CodePilot: Path '${newPath}' already exists.`);
                            }
                        });

                        // 최종 업데이트된 경로를 저장
                        await config.update('sourcePaths', updatedPaths, vscode.ConfigurationTarget.Global);
                        panel.webview.postMessage({ command: 'updatedSourcePaths', sourcePaths: updatedPaths });
                    }
                    break;

                case 'removeDirectory': // Webview에서 디렉토리/파일 삭제 요청 시 (명칭은 Directory로 유지)
                    console.log('Received removeDirectory command from settings panel:', data.path);
                    const pathToRemove = data.path;
                    const currentPaths = config.get<string[]>('sourcePaths') || [];
                    const updatedPaths = currentPaths.filter(p => p !== pathToRemove);
                    await config.update('sourcePaths', updatedPaths, vscode.ConfigurationTarget.Global);
                    panel.webview.postMessage({ command: 'updatedSourcePaths', sourcePaths: updatedPaths });
                    vscode.window.showInformationMessage(`CodePilot: Removed source path '${pathToRemove}'`);
                    break;

                // API Key 설정은 License Panel에서 처리하므로 여기서는 다루지 않음.
            }
        }
    );
}


// Chat Panel을 여는 헬퍼 함수 (이전과 동일)
function openChatPanel(extensionUri: vscode.Uri, panelIdSuffix: string, panelTitle: string, viewColumn: vscode.ViewColumn = vscode.ViewColumn.One) {
     createWebviewPanelWithHtml(extensionUri, panelIdSuffix, panelTitle, 'chat', viewColumn,
        async (data, panel) => {
             switch (data.command) {
                 case 'sendMessage':
                     console.log('Received message from chat panel:', data.text);
                     const userText = data.text.trim();

                     const apiKey = await storageService.getApiKey();
                     if (!apiKey) {
                         panel.webview.postMessage({ command: 'receiveMessage', text: "Error: Gemini API Key is not set. Please go to the License panel to set it.", sender: 'CodePilot' });
                         return;
                     }

                     if (userText === '앱 실행') {
                         const terminal = getCodePilotTerminal();
                         terminal.show();
                         terminal.sendText('npm start', true);
                          panel.webview.postMessage({ command: 'receiveMessage', text: "Running `npm start` in terminal...", sender: 'CodePilot' });

                     } else if (userText === '깃 푸쉬') {
                         const terminal = getCodePilotTerminal();
                         terminal.show();
                         terminal.sendText('git add -A', true);
                         terminal.sendText('git commit -m "n/a"', true);
                         terminal.sendText('git push', true);
                          panel.webview.postMessage({ command: 'receiveMessage', text: "Executing Git commands in terminal...", sender: 'CodePilot' });

                     } else {
                          panel.webview.postMessage({ command: 'showLoading' });

                          let geminiResponse = "Error sending message to CodePilot AI.";
                          try { geminiResponse = await geminiApi.sendMessage(userText); }
                          catch (error: any) { console.error("Gemini API Call Failed:", error); geminiResponse = `Error: Failed to get response from AI. ${error.message || ''}`; }
                          finally { panel.webview.postMessage({ command: 'hideLoading' }); }

                          panel.webview.postMessage({ command: 'receiveMessage', text: geminiResponse, sender: 'CodePilot' });
                     }
                     break;
                  case 'openPanel':
                      console.log(`Received open panel command from chat panel: ${data.panel}`);
                       if (data.panel === 'settings') { openSettingsPanel(extensionUri, 'Settings', 'CodePilot Settings', panel.viewColumn); }
                       else if (data.panel === 'license') { openLicensePanel(extensionUri, 'License', 'CodePilot License Information', panel.viewColumn); }
                       else if (data.panel === 'customizing') { openBlankPanel(extensionUri, 'Customizing', 'CodePilot Customization Options'); }
                       break;
             }
         }
     );
}