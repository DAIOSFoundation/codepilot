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

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri,
                vscode.Uri.joinPath(this._extensionUri, 'webview'),
                vscode.Uri.joinPath(this._extensionUri, 'media')
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview('chat', webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async data => { // <-- async 키워드 유지 -->
            switch (data.command) {
                case 'sendMessage':
                    console.log('Received message from chat view:', data.text);
                    const userText = data.text.trim();

                    const apiKey = await storageService.getApiKey();

                    if (!apiKey) {
                        this._view?.webview.postMessage({
                            command: 'receiveMessage',
                            text: "Error: Gemini API Key is not set. Please go to the License panel to set it.",
                            sender: 'CodePilot',
                        });
                         return;
                    }

                    if (userText === '앱 실행') {
                        console.log('Executing npm start...');
                        const terminal = getCodePilotTerminal();
                        terminal.show();
                        terminal.sendText('npm start', true);
                    } else if (userText === '깃 푸쉬') {
                        console.log('Executing git push...');
                        const terminal = getCodePilotTerminal();
                        terminal.show();
                        terminal.sendText('git add -A', true);
                        terminal.sendText('git commit -m "n/a"', true);
                        terminal.sendText('git push', true);
                    } else {
                         console.log('Sending message to Gemini...');
                         let geminiResponse = "Error sending message to CodePilot AI.";
                         try {
                               geminiResponse = await geminiApi.sendMessage(userText);
                         } catch (error: any) {
                              console.error("Gemini API Call Failed:", error);
                              geminiResponse = `Error: Failed to get response from AI. ${error.message || ''}`;
                         }

                         this._view?.webview.postMessage({
                             command: 'receiveMessage',
                             text: geminiResponse,
                             sender: 'CodePilot',
                         });
                    }
                    break;
                case 'openPanel':
                    console.log(`Received open panel command from chat view: ${data.panel}`);
                     // Activity Bar View의 License 메뉴는 openBlankPanel 대신 License HTML 로드 함수 호출
                     // openLicensePanel은 ViewColumn.One에 기본으로 열립니다.
                    if (data.panel === 'settings') {
                        openBlankPanel(this._extensionUri, 'Settings', 'CodePilot Settings');
                    } else if (data.panel === 'license') {
                        // <-- 오류 1 수정: webviewView.viewColumn 인자 제거 -->
                        openLicensePanel(this._extensionUri, 'License', 'CodePilot License Information');
                        // <-- 오류 1 수정 끝 -->
                    } else if (data.panel === 'customizing') {
                        openBlankPanel(this._extensionUri, 'Customizing', 'CodePilot Customization Options');
                    }
                    break;
                 // TODO: 필요한 다른 메시지 타입 처리 추가
            }
        });

         webviewView.onDidDispose(() => {
            console.log('Chat view disposed');
            this._view = undefined;
        });

        console.log('Chat View resolved (via sidebar)');
    }

    private _getHtmlForWebview(fileName: string, webview: vscode.Webview): string {
        const htmlFilePath = vscode.Uri.joinPath(this._extensionUri, 'webview', `${fileName}.html`);
        let htmlContent = '';
        try {
            htmlContent = fs.readFileSync(htmlFilePath.fsPath, 'utf8');

            const settingsIconUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'settings-gear.svg')); // $(settings-gear)
            const licenseIconUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'book.svg')); // $(book)
            const customizingIconUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'paintbrush.svg')); // $(paintbrush)

            htmlContent = htmlContent
                .replace('{{settingsIconUri}}', settingsIconUri.toString())
                .replace('{{licenseIconUri}}', licenseIconUri.toString())
                .replace('{{customizingIconUri}}', customizingIconUri.toString());


        } catch (error: unknown) {
            console.error(`Error reading ${fileName}.html:`, error);
            const errorMessage = (typeof error === 'object' && error !== null && 'message' in error)
                ? (error as { message: string }).message
                : String(error);
            return `<h1>Error loading ${fileName} view</h1><p>${errorMessage}</p>`;
        }
        return htmlContent;
    }
}


// Extension Activate 함수: 확장이 활성화될 때 호출됨
export async function activate(context: vscode.ExtensionContext) { // <-- async 키워드 유지 -->

    console.log('Congratulations, your extension "codepilot" is now active!');

    // 스토리지 서비스 초기화
    storageService = new StorageService(context.secrets);

    // 저장된 API Key를 불러와 Gemini API 초기화
    const apiKey = await storageService.getApiKey();
    geminiApi = new GeminiApi(apiKey || undefined); // API Key가 없으면 undefined로 초기화

    // 1. Chat Webview View Provider 등록 (Activity Bar 아이콘 클릭 시 작동)
    const chatViewProvider = new ChatViewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(ChatViewProvider.viewId, chatViewProvider)
    );

    // 확장이 활성화될 때 터미널에 메시지 출력
    const terminal = getCodePilotTerminal();
    terminal.show();
    terminal.sendText("echo CodePilot activated!", true);


    // 2. Command 등록 (package.json의 contributes.commands[]에 정의된 명령어들)

    // Open Settings, License, Customizing 패널 명령어 등록
    const openSettingsPanelCommand = vscode.commands.registerCommand('codepilot.openSettingsPanel', () => {
        openBlankPanel(context.extensionUri, 'Settings', 'CodePilot Settings'); // blank.html 로드
    });
    context.subscriptions.push(openSettingsPanelCommand);

    const openLicensePanelCommand = vscode.commands.registerCommand('codepilot.openLicensePanel', () => {
        // License 패널 명령어는 license.html을 로드하고, SecretStorage를 사용해야 함
        // 기존 openBlankPanel 대신 License 전용 함수 호출
        openLicensePanel(context.extensionUri, 'License', 'CodePilot License Information', vscode.ViewColumn.One); // <-- ViewColumn.One 고정 -->
    });
    context.subscriptions.push(openLicensePanelCommand);

    const openCustomizingPanelCommand = vscode.commands.registerCommand('codepilot.openCustomizingPanel', () => {
        openBlankPanel(context.extensionUri, 'Customizing', 'CodePilot Customization Options'); // blank.html 로드
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

// Extension Deactivate 함수: 확장이 비활성화될 때 호출됨
export function deactivate() {
     console.log('Your extension "codepilot" is now deactivated.');
     codePilotTerminal?.dispose();
     // storageService와 geminiApi는 가비지 컬렉션에 의해 자동으로 정리될 가능성이 높지만
     // 명시적으로 정리할 것이 있다면 여기에 추가
}


// <-- 수정/추가: HTML 파일 이름 인자를 받는 범용 함수 -->
// blank.html이나 license.html 등 다양한 패널에 재사용
function createWebviewPanelWithHtml(
    extensionUri: vscode.Uri,
    panelIdSuffix: string,
    panelTitle: string,
    htmlFileName: string, // <-- 어떤 HTML 파일을 로드할지 지정
    viewColumn: vscode.ViewColumn = vscode.ViewColumn.One, // <-- 열 위치 지정
    onDidReceiveMessage?: (data: any, panel: vscode.WebviewPanel) => void // <-- 메시지 핸들러 추가
) {
     const panel = vscode.window.createWebviewPanel(
         `codepilot.${panelIdSuffix.toLowerCase()}`,
         panelTitle,
         viewColumn, // 인자로 받은 ViewColumn 사용
         {
             enableScripts: true,
             localResourceRoots: [
                 extensionUri,
                 vscode.Uri.joinPath(extensionUri, 'webview'),
                 vscode.Uri.joinPath(extensionUri, 'media')
             ]
         }
     );

     // <-- 수정: HTML 파일 경로를 동적으로 생성 -->
     const htmlFilePath = vscode.Uri.joinPath(extensionUri, 'webview', `${htmlFileName}.html`);
     // <-- 수정 끝 -->
     let htmlContent = '';

      try {
         htmlContent = fs.readFileSync(htmlFilePath.fsPath, 'utf8');

         // 아이콘 경로 치환 로직 (필요하다면 이곳에 추가)
         // 현재는 chat.html에만 적용되므로 getHtmlForWebview 함수로 분리하는 것이 더 나을 수 있습니다.
         // 또는 모든 HTML 파일에 동일한 플레이스홀더를 사용한다면 이곳에 통합 가능.

      } catch (error: unknown) {
         console.error(`Error reading ${htmlFileName}.html for ${panelTitle} panel:`, error);
         const errorMessage = (typeof error === 'object' && error !== null && 'message' in error)
                            ? (error as { message: string }).message
                            : String(error);
         htmlContent = `<h1>Error loading panel</h1><p>${errorMessage}</p>`;
      }

     panel.webview.html = htmlContent;

     panel.onDidDispose(() => {
         console.log(`${panelTitle} panel closed`);
     }, null, []);

     // <-- 추가: 메시지 핸들러 등록 -->
     if (onDidReceiveMessage) {
         panel.webview.onDidReceiveMessage(data => {
             onDidReceiveMessage(data, panel); // 콜백 함수에 데이터와 패널 인스턴스 전달
         });
     }
     // <-- 추가 끝 -->

     return panel; // 생성된 패널 인스턴스 반환 (필요하다면)
}
// <-- 수정/추가 끝 -->


// <-- 추가: blank.html을 로드하는 헬퍼 함수 (createWebviewPanelWithHtml 사용) -->
function openBlankPanel(extensionUri: vscode.Uri, panelIdSuffix: string, panelTitle: string) {
     // blank.html은 메시지 통신이 없으므로 onDidReceiveMessage는 undefined
     // ViewColumn.One 고정은 createWebviewPanelWithHtml의 기본값에 의해 처리됨.
     createWebviewPanelWithHtml(extensionUri, panelIdSuffix, panelTitle, 'blank');
}
// <-- 추가 끝 -->

// <-- 추가: license.html을 로드하고 메시지를 처리하는 헬퍼 함수 -->
function openLicensePanel(extensionUri: vscode.Uri, panelIdSuffix: string, panelTitle: string, viewColumn: vscode.ViewColumn = vscode.ViewColumn.One) {
     // license.html은 메시지 통신 (API Key 저장) 필요
     createWebviewPanelWithHtml(extensionUri, panelIdSuffix, panelTitle, 'license', viewColumn, // <-- viewColumn 인자 사용 -->
         async (data, panel) => { // <-- async 키워드 추가 -->
             switch (data.command) {
                 case 'saveApiKey':
                     console.log('Received saveApiKey command from license panel.');
                     const apiKey = data.apiKey;
                     if (apiKey) {
                         try {
                             await storageService.saveApiKey(apiKey); // API Key 저장
                             geminiApi.updateApiKey(apiKey); // Gemini API 인스턴스 업데이트
                             panel.webview.postMessage({ command: 'apiKeySaved' }); // 저장 성공 응답
                         } catch (error: any) {
                              console.error('Error saving API Key:', error);
                             panel.webview.postMessage({ command: 'apiKeySaveError', error: error.message || String(error) }); // 저장 실패 응답
                         }
                     } else {
                          console.warn('Received saveApiKey command but API key was empty.');
                          panel.webview.postMessage({ command: 'apiKeySaveError', error: 'API Key cannot be empty.' });
                     }
                     break;
                 // TODO: 필요하다면 'checkApiKeyStatus'와 같은 다른 명령 처리 추가
             }
         }
     );
}
// <-- 추가 끝 -->

// <-- 추가: chat.html을 로드하고 메시지를 처리하는 헬퍼 함수 -->
function openChatPanel(extensionUri: vscode.Uri, panelIdSuffix: string, panelTitle: string, viewColumn: vscode.ViewColumn = vscode.ViewColumn.One) { // <-- 기본값 유지 -->
     // chat.html은 메시지 통신 (sendMessage) 필요
     createWebviewPanelWithHtml(extensionUri, panelIdSuffix, panelTitle, 'chat', viewColumn, // <-- viewColumn 인자 사용 -->
        async (data, panel) => { // <-- async 키워드 유지 -->
             switch (data.command) {
                 case 'sendMessage':
                     console.log('Received message from chat panel:', data.text);
                     const userText = data.text.trim();

                     const apiKey = await storageService.getApiKey();

                     if (!apiKey) {
                         panel.webview.postMessage({
                             command: 'receiveMessage',
                             text: "Error: Gemini API Key is not set. Please go to the License panel to set it.",
                             sender: 'CodePilot',
                         });
                         return;
                     }

                     if (userText === '앱 실행') {
                         console.log('Executing npm start...');
                         const terminal = getCodePilotTerminal();
                         terminal.show();
                         terminal.sendText('npm start', true);
                     } else if (userText === '깃 푸쉬') {
                         console.log('Executing git push...');
                         const terminal = getCodePilotTerminal();
                         terminal.show();
                         terminal.sendText('git add -A', true);
                         terminal.sendText('git commit -m "n/a"', true);
                         terminal.sendText('git push', true);
                     } else {
                          console.log('Sending message to Gemini...');
                          let geminiResponse = "Error sending message to CodePilot AI.";
                          try {
                               geminiResponse = await geminiApi.sendMessage(userText);
                          } catch (error: any) {
                               console.error("Gemini API Call Failed:", error);
                               geminiResponse = `Error: Failed to get response from AI. ${error.message || ''}`;
                          }

                          panel.webview.postMessage({
                              command: 'receiveMessage',
                              text: geminiResponse,
                              sender: 'CodePilot',
                          });
                     }
                     break;
                  case 'openPanel':
                      console.log(`Received open panel command from chat panel: ${data.panel}`);
                       if (data.panel === 'settings') {
                           openBlankPanel(extensionUri, 'Settings', 'CodePilot Settings');
                       } else if (data.panel === 'license') {
                            // Chat Panel의 License 메뉴도 license.html 로드 함수 호출
                           openLicensePanel(extensionUri, 'License', 'CodePilot License Information', panel.viewColumn); // <-- 현재 ViewColumn 전달 -->
                       } else if (data.panel === 'customizing') {
                           openBlankPanel(extensionUri, 'Customizing', 'CodePilot Customization Options');
                       }
                       break;
                 // TODO: 필요한 다른 메시지 타입 처리 추가
             }
         }
     );
}
// <-- 추가 끝 -->

// --- END OF FILE extension.ts ---