// --- START OF FILE extension.ts ---

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
             // localResourceRoots에 dist/webview도 추가 (chat.js 로드용)
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
                        console.log('Executing npm start...');
                        const terminal = getCodePilotTerminal();
                        terminal.show();
                        terminal.sendText('npm start', true);
                        this._view?.webview.postMessage({ command: 'receiveMessage', text: "Running `npm start` in terminal...", sender: 'CodePilot' });

                    } else if (userText === '깃 푸쉬') {
                        console.log('Executing git push...');
                        const terminal = getCodePilotTerminal();
                        terminal.show();
                        terminal.sendText('git add -A', true);
                        terminal.sendText('git commit -m "n/a"', true);
                        terminal.sendText('git push', true);
                         this._view?.webview.postMessage({ command: 'receiveMessage', text: "Executing Git commands in terminal...", sender: 'CodePilot' });

                    } else {
                         // Gemini API 호출
                         console.log('Sending message to Gemini...');
                         // TODO: 로딩 표시 시작 메시지 보내기
                         // this._view?.webview.postMessage({ command: 'showLoading' });

                         let geminiResponse = "Error sending message to CodePilot AI.";
                         try { geminiResponse = await geminiApi.sendMessage(userText); }
                         catch (error: any) { console.error("Gemini API Call Failed:", error); geminiResponse = `Error: Failed to get response from AI. ${error.message || ''}`; }
                         finally {
                             // TODO: 로딩 표시 종료 메시지 보내기
                             // this._view?.webview.postMessage({ command: 'hideLoading' });
                         }

                         // CodePilot 응답을 UI에 표시 (Gemini 응답 사용)
                         this._view?.webview.postMessage({ command: 'receiveMessage', text: geminiResponse, sender: 'CodePilot' });
                    }
                    break;
                case 'openPanel':
                    console.log(`Received open panel command from chat view: ${data.panel}`);
                     // Activity Bar View의 메뉴에서 패널 열기 (ViewColumn.One에 고정)
                    if (data.panel === 'settings') { openBlankPanel(this._extensionUri, 'Settings', 'CodePilot Settings'); }
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

    const openSettingsPanelCommand = vscode.commands.registerCommand('codepilot.openSettingsPanel', () => {
        openBlankPanel(context.extensionUri, 'Settings', 'CodePilot Settings'); // blank.html 로드
    });
    context.subscriptions.push(openSettingsPanelCommand);

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
        // 1. chat.html 파일을 제대로 읽어오는지 확인
        // fs.readFileSync는 동기 함수입니다. 오류가 발생하면 catch 블록으로 이동합니다.
        htmlContent = fs.readFileSync(htmlFilePath.fsPath, 'utf8');
        console.log(`Successfully read ${htmlFileName}.html. Content length: ${htmlContent.length}`);


        // 아이콘 경로 치환 (필요하다면)
        // 이 부분은 현재 디버깅의 주 대상이 아니므로 그대로 유지합니다.
        const settingsIconUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'settings-gear.svg'));
        const licenseIconUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'book.svg'));
        const customizingIconUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'paintbrush.svg'));

        htmlContent = htmlContent
            .replace('{{settingsIconUri}}', settingsIconUri.toString())
            .replace('{{licenseIconUri}}', licenseIconUri.toString())
            .replace('{{customizingIconUri}}', customizingIconUri.toString());


        // 2. chat.js 파일의 Webview URI 생성 및 치환 로직 확인 (chat.html에만 해당)
        if (htmlFileName === 'chat') {
            // 3. scriptPathInExtension 변수에 실제 번들 파일 경로가 올바르게 구성되는지 확인
            // webpack.config.js의 output 설정 (path, filename)과 일치해야 함
            const scriptPathInExtension = vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'chat.js');
             console.log(`[URI Debug] Script path in extension (vscode.Uri): ${scriptPathInExtension.toString()}`); // vscode.Uri 문자열 형태 로그
             console.log(`[URI Debug] Script path in extension (fsPath): ${scriptPathInExtension.fsPath}`); // 파일 시스템 경로 형태 로그


            // 4. asWebviewUri 함수가 유효한 URI를 생성하는지 확인
            const scriptUri = webview.asWebviewUri(scriptPathInExtension);
             console.log(`[URI Debug] Generated script URI (webview.asWebviewUri): ${scriptUri.toString()}`); // 최종 Webview URI 형태 로그


            // 5. replace 함수가 {{scriptUri}} 플레이스홀더를 제대로 치환하는지 확인
            const placeholder = '{{scriptUri}}';
             if (htmlContent.includes(placeholder)) {
                htmlContent = htmlContent.replace(placeholder, scriptUri.toString());
                 console.log(`[URI Debug] Successfully replaced "${placeholder}" with "${scriptUri.toString()}".`); // 치환 성공 로그
             } else {
                 // 만약 플레이스홀더가 없다면 경고를 출력
                 console.warn(`[URI Debug] Placeholder "${placeholder}" not found in ${htmlFileName}.html content.`);
             }
        }

        // <-- 추가: localResourceRoots 확인 로직 -->
        // WebviewViewOptions 또는 WebviewPanelOptions에 설정된 localResourceRoots를 가져와 로그 출력
        // 이 정보는 webviewView.webview.options 또는 panel.webview.options 에서 가져올 수 있습니다.
        // getHtmlContentWithUris 함수는 webview 인스턴스만 받으므로, webview.options를 통해 접근합니다.
        // localResourceRoots는 resolveWebviewView 또는 createWebviewPanelWithHtml에서 설정됩니다.
        // 따라서 이 로그는 해당 설정이 완료된 후에 출력될 때 가장 유용합니다.
        // 현재 이 함수는 HTML을 생성할 때 호출되므로, localResourceRoots 설정이 이미 완료되었다고 가정합니다.
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
        // <-- 추가 끝 -->


    } catch (error: unknown) {
        // 파일 읽기 오류 또는 URI 처리 오류 발생 시
        console.error(`[URI Debug] Error during getHtmlContentWithUris for ${htmlFileName}.html:`, error);
        const errorMessage = (typeof error === 'object' && error !== null && 'message' in error)
            ? (error as { message: string }).message
            : String(error);
        htmlContent = `<h1>Error loading ${htmlFileName} view</h1><p>${errorMessage}</p><p>Check console for details.</p>`; // 사용자에게 오류 메시지 표시
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
             // <-- 필수 확인: localResourceRoots에 dist/webview 포함 -->
             // localResourceRoots에 dist/webview도 추가 (chat.js 로드용)
             localResourceRoots: [ extensionUri, vscode.Uri.joinPath(extensionUri, 'webview'), vscode.Uri.joinPath(extensionUri, 'media'), vscode.Uri.joinPath(extensionUri, 'dist', 'webview') ]
             // <-- 필수 확인 끝 -->
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


// blank.html을 로드하는 헬퍼 함수
function openBlankPanel(extensionUri: vscode.Uri, panelIdSuffix: string, panelTitle: string) {
     createWebviewPanelWithHtml(extensionUri, panelIdSuffix, panelTitle, 'blank');
}

// license.html을 로드하고 메시지를 처리하는 헬퍼 함수
function openLicensePanel(extensionUri: vscode.Uri, panelIdSuffix: string, panelTitle: string, viewColumn: vscode.ViewColumn = vscode.ViewColumn.One) {
     createWebviewPanelWithHtml(extensionUri, panelIdSuffix, panelTitle, 'license', viewColumn,
         async (data, panel) => { // <-- async 유지 -->
             switch (data.command) {
                 case 'saveApiKey':
                     console.log('Received saveApiKey command from license panel.');
                     const apiKey = data.apiKey;
                     if (apiKey) {
                         try {
                             await storageService.saveApiKey(apiKey); // API Key 저장
                             // Gemini API 인스턴스 업데이트 (updateApiKey 함수 사용)
                             geminiApi.updateApiKey(apiKey);
                             panel.webview.postMessage({ command: 'apiKeySaved' });
                         } catch (error: any) { console.error('Error saving API Key:', error); panel.webview.postMessage({ command: 'apiKeySaveError', error: error.message || String(error) }); }
                     } else {
                          console.warn('Received saveApiKey command but API key was empty.');
                          panel.webview.postMessage({ command: 'apiKeySaveError', error: 'API Key cannot be empty.' });
                     }
                     break;
                 // License Panel에서 'checkApiKeyStatus' 메시지를 보내면 여기서 처리
                 case 'checkApiKeyStatus':
                    const currentKey = await storageService.getApiKey();
                    panel.webview.postMessage({ command: 'apiKeyStatus', hasKey: !!currentKey });
                    break;
             }
         }
     );
}

// chat.html을 로드하고 메시지를 처리하는 헬퍼 함수
function openChatPanel(extensionUri: vscode.Uri, panelIdSuffix: string, panelTitle: string, viewColumn: vscode.ViewColumn = vscode.ViewColumn.One) {
     createWebviewPanelWithHtml(extensionUri, panelIdSuffix, panelTitle, 'chat', viewColumn, // <-- viewColumn 인자 사용 -->
        async (data, panel) => { // <-- async 유지 -->
             switch (data.command) {
                 case 'sendMessage':
                     console.log('Received message from chat panel:', data.text);
                     const userText = data.text.trim();

                     // 사용자 메시지는 웹뷰 자체에서 처리하도록 변경됨

                     const apiKey = await storageService.getApiKey();
                     if (!apiKey) {
                         panel.webview.postMessage({ command: 'receiveMessage', text: "Error: Gemini API Key is not set. Please go to the License panel to set it.", sender: 'CodePilot' });
                         return;
                     }

                     // 터미널 명령 우선 처리
                     if (userText === '앱 실행') {
                         console.log('Executing npm start...');
                         const terminal = getCodePilotTerminal();
                         terminal.show();
                         terminal.sendText('npm start', true);
                          // 터미널 명령 실행 후 CodePilot 응답 메시지를 보낼 수도 있습니다.
                          panel.webview.postMessage({ command: 'receiveMessage', text: "Running `npm start` in terminal...", sender: 'CodePilot' });

                     } else if (userText === '깃 푸쉬') {
                         console.log('Executing git push...');
                         const terminal = getCodePilotTerminal();
                         terminal.show();
                         terminal.sendText('git add -A', true);
                         terminal.sendText('git commit -m "n/a"', true);
                         terminal.sendText('git push', true);
                         // 터미널 명령 실행 후 CodePilot 응답 메시지를 보낼 수도 있습니다.
                          panel.webview.postMessage({ command: 'receiveMessage', text: "Executing Git commands in terminal...", sender: 'CodePilot' });

                     } else {
                          // Gemini API 호출
                          console.log('Sending message to Gemini...');
                          // TODO: 로딩 표시 시작 메시지 보내기
                          // panel.webview.postMessage({ command: 'showLoading' });

                          let geminiResponse = "Error sending message to CodePilot AI.";
                          try {
                              geminiResponse = await geminiApi.sendMessage(userText);
                          } catch (error: any) {
                               console.error("Gemini API Call Failed:", error);
                               geminiResponse = `Error: Failed to get response from AI. ${error.message || ''}`;
                          } finally {
                              // TODO: 로딩 표시 종료 메시지 보내기
                              // panel.webview.postMessage({ command: 'hideLoading' });
                          }


                          // CodePilot 응답을 UI에 표시 (Gemini 응답 사용)
                          panel.webview.postMessage({ command: 'receiveMessage', text: geminiResponse, sender: 'CodePilot' });
                     }
                     break;
                  case 'openPanel':
                      console.log(`Received open panel command from chat panel: ${data.panel}`);
                       if (data.panel === 'settings') { openBlankPanel(extensionUri, 'Settings', 'CodePilot Settings'); }
                       else if (data.panel === 'license') {
                            // Chat Panel에서 License 패널을 열 때는 현재 패널과 같은 열에 열도록 viewColumn 전달
                           openLicensePanel(extensionUri, 'License', 'CodePilot License Information', panel.viewColumn);
                       } else if (data.panel === 'customizing') { openBlankPanel(extensionUri, 'Customizing', 'CodePilot Customization Options'); }
                       break;
                 // TODO: chat.js에서 보낼 수 있는 추가 메시지 타입 처리
             }
         }
     );
}