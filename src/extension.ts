// --- START OF FILE extension.ts (Modified) ---

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

// 터미널 인스턴스를 저장하기 위한 변수
let codePilotTerminal: vscode.Terminal | undefined;

// 터미널을 가져오거나 생성하는 헬퍼 함수
function getCodePilotTerminal(): vscode.Terminal {
    if (!codePilotTerminal || codePilotTerminal.exitStatus !== undefined) {
        // 터미널이 없거나 종료되었으면 새로 생성
        codePilotTerminal = vscode.window.createTerminal({ name: "CodePilot Terminal" });
        // 터미널이 닫힐 때 변수 초기화 (선택 사항이지만 권장)
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
            // webview, media 폴더에 접근 가능하도록 설정
            localResourceRoots: [
                this._extensionUri,
                vscode.Uri.joinPath(this._extensionUri, 'webview'),
                vscode.Uri.joinPath(this._extensionUri, 'media')
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.command) {
                case 'sendMessage':
                    console.log('Received message from chat view:', data.text);
                    const userText = data.text.trim(); // 사용자 입력 텍스트 트림

                    // <-- 삭제: 사용자가 보낸 메시지를 UI에 바로 표시하라고 웹뷰에 알리는 로직 제거 -->
                    // this._view?.webview.postMessage({
                    //     command: 'displayUserMessage',
                    //     text: data.text
                    // });
                    // <-- 삭제 끝 -->

                    // 터미널 실행 로직 및 Echo 응답
                    if (userText === '앱 실행') {
                        console.log('Executing npm start...');
                        const terminal = getCodePilotTerminal();
                        terminal.show(); // 터미널은 활성 열에 표시
                        terminal.sendText('npm start', true);

                    } else if (userText === '깃 푸쉬') {
                        console.log('Executing git push...');
                        const terminal = getCodePilotTerminal();
                        terminal.show(); // 터미널은 활성 열에 표시
                        terminal.sendText('git add -A', true);
                        terminal.sendText('git commit -m "n/a"', true);
                        terminal.sendText('git push', true);

                    } else {
                        console.log('Echoing message:', data.text);
                        const response = `Echo: "${data.text}"`;
                        this._view?.webview.postMessage({
                            command: 'receiveMessage',
                            text: response,
                            sender: 'CodePilot',
                        });
                    }
                    break;
                case 'openPanel':
                    console.log(`Received open panel command from chat view: ${data.panel}`);
                     // Activity Bar 뷰에서 열리는 Info 패널은 기본적으로 ViewColumn.One에 열도록 openBlankPanel이 고정되어 있음
                    if (data.panel === 'settings') {
                        openBlankPanel(this._extensionUri, 'Settings', 'CodePilot Settings');
                    } else if (data.panel === 'license') {
                        openBlankPanel(this._extensionUri, 'License', 'CodePilot License Information');
                    } else if (data.panel === 'customizing') {
                        openBlankPanel(this._extensionUri, 'Customizing', 'CodePilot Customization Options');
                    }
                    break;
            }
        });

         webviewView.onDidDispose(() => {
            console.log('Chat view disposed');
            this._view = undefined;
        });

        console.log('Chat View resolved (via sidebar)');
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
         const htmlFilePath = vscode.Uri.joinPath(this._extensionUri, 'webview', 'chat.html');
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
             console.error('Error reading chat.html:', error);
             const errorMessage = (typeof error === 'object' && error !== null && 'message' in error)
                                 ? (error as { message: string }).message
                                 : String(error);
             // 파일을 읽지 못했을 경우 오류 메시지를 포함한 HTML 반환
             return `<h1>Error loading chat view</h1><p>${errorMessage}</p>`;
         }
        return htmlContent;
    }
}


// Extension Activate 함수: 확장이 활성화될 때 호출됨
export function activate(context: vscode.ExtensionContext) {

    console.log('Congratulations, your extension "codepilot" is now active!');

    // 1. Chat Webview View Provider 등록 (Activity Bar 아이콘 클릭 시 작동)
    // 이 부분은 Activity Bar의 CodePilot 뷰를 담당합니다.
    const chatViewProvider = new ChatViewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(ChatViewProvider.viewId, chatViewProvider)
    );

    // 확장이 활성화될 때 터미널에 메시지 출력
    const terminal = getCodePilotTerminal();
    terminal.show(); // 활성 열에 터미널 표시
    terminal.sendText("echo CodePilot activated!", true);


    // 2. Command 등록 (package.json의 contributes.commands[]에 정의된 명령어들)

    // Open Settings, License, Customizing 패널 명령어 등록
    const openSettingsPanelCommand = vscode.commands.registerCommand('codepilot.openSettingsPanel', () => {
        // 이 명령어는 Activity Bar 뷰의 메뉴에서도 사용되므로 ViewColumn.One에 열도록 openBlankPanel이 고정되어 있음
        openBlankPanel(context.extensionUri, 'Settings', 'CodePilot Settings');
    });
    context.subscriptions.push(openSettingsPanelCommand);

    const openLicensePanelCommand = vscode.commands.registerCommand('codepilot.openLicensePanel', () => {
        openBlankPanel(context.extensionUri, 'License', 'CodePilot License Information');
    });
    context.subscriptions.push(openLicensePanelCommand);

    const openCustomizingPanelCommand = vscode.commands.registerCommand('codepilot.openCustomizingPanel', () => {
        openBlankPanel(context.extensionUri, 'Customizing', 'CodePilot Customization Options');
    });
    context.subscriptions.push(openCustomizingPanelCommand);

    const helloWorldCommand = vscode.commands.registerCommand('codepilot.helloWorld', () => {
        // helloWorld 명령어 실행 시 터미널에 메시지 출력
        const terminal = getCodePilotTerminal();
        terminal.sendText("echo Hello from CodePilot!", true);
        terminal.show(); // 활성 열에 터미널 표시
    });
    context.subscriptions.push(helloWorldCommand);

    const openBanyaChatCommand = vscode.commands.registerCommand('codepilot.openChatView', () => {
        console.log('Executing command: Open Banya Chat (using createWebviewPanel in ViewColumn.Two)');
        // ViewColumn.Two를 사용하여 현재 활성 에디터 그룹의 우측에 패널을 엽니다.
        openChatPanel(context.extensionUri, 'Chat', 'CodePilot Chat', vscode.ViewColumn.Two);
    });
    context.subscriptions.push(openBanyaChatCommand);


     // TODO: 필요한 다른 기능 구현
}

// Extension Deactivate 함수: 확장이 비활성화될 때 호출됨
export function deactivate() {
     console.log('Your extension "codepilot" is now deactivated.');
     // 확장이 종료될 때 터미널도 정리 (선택 사항)
     codePilotTerminal?.dispose();
}


// 빈 Webview 패널을 생성하고 HTML 파일을 로드하는 헬퍼 함수
// Info 패널들은 기본 ViewColumn.One에 열도록 고정
function openBlankPanel(extensionUri: vscode.Uri, panelIdSuffix: string, panelTitle: string) {
     const panel = vscode.window.createWebviewPanel(
         `codepilot.${panelIdSuffix.toLowerCase()}`,
         panelTitle,
         vscode.ViewColumn.One, // ViewColumn.One 고정
         {
             enableScripts: true,
             localResourceRoots: [
                 extensionUri,
                 vscode.Uri.joinPath(extensionUri, 'webview'),
                 vscode.Uri.joinPath(extensionUri, 'media')
             ]
         }
     );

     const htmlFilePath = vscode.Uri.joinPath(extensionUri, 'webview', 'blank.html');
     let htmlContent = '';

      try {
         htmlContent = fs.readFileSync(htmlFilePath.fsPath, 'utf8');
      } catch (error: unknown) {
         console.error(`Error reading blank.html for ${panelTitle} panel:`, error);
         const errorMessage = (typeof error === 'object' && error !== null && 'message' in error)
                            ? (error as { message: string }).message
                            : String(error);
         htmlContent = `<h1>Error loading panel</h1><p>${errorMessage}</p>`;
      }

     panel.webview.html = htmlContent;

     panel.onDidDispose(() => {
         console.log(`${panelTitle} panel closed`);
     }, null, []);

      // TODO: 필요하다면 blank panel과 확장 간의 메시지 통신 로직 구현
}

// <-- 추가: Chat UI를 가진 새로운 Webview 패널을 생성하는 헬퍼 함수 (ViewColumn 인자 추가) -->
function openChatPanel(extensionUri: vscode.Uri, panelIdSuffix: string, panelTitle: string, viewColumn: vscode.ViewColumn = vscode.ViewColumn.One) {
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

    const htmlFilePath = vscode.Uri.joinPath(extensionUri, 'webview', 'chat.html');
    let htmlContent = '';

    try {
        htmlContent = fs.readFileSync(htmlFilePath.fsPath, 'utf8');

        // 아이콘 경로 치환 로직 (chat.html에서 사용하지 않더라도 남겨둠)
        const settingsIconUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'settings-gear.svg'));
        const licenseIconUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'book.svg'));
        const customizingIconUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'paintbrush.svg'));

        htmlContent = htmlContent
             .replace('{{settingsIconUri}}', settingsIconUri.toString())
             .replace('{{licenseIconUri}}', licenseIconUri.toString())
             .replace('{{customizingIconUri}}', customizingIconUri.toString());

    } catch (error: unknown) {
        console.error(`Error reading chat.html for ${panelTitle} panel:`, error);
        const errorMessage = (typeof error === 'object' && error !== null && 'message' in error)
                           ? (error as { message: string }).message
                           : String(error);
        htmlContent = `<h1>Error loading panel</h1><p>${errorMessage}</p>`;
    }

    panel.webview.html = htmlContent;

    panel.onDidDispose(() => {
        console.log(`${panelTitle} panel closed`);
    }, null, []);

    // <-- 추가: chat panel과 확장 간의 메시지 통신 로직 구현 -->
    panel.webview.onDidReceiveMessage(data => {
        switch (data.command) {
            case 'sendMessage':
                console.log('Received message from chat panel:', data.text);
                const userText = data.text.trim(); // 사용자 입력 텍스트 트림

                 // <-- 삭제: 사용자가 보낸 메시지를 UI에 바로 표시하라고 웹뷰에 알리는 로직 제거 -->
                 // panel.webview.postMessage({
                 //     command: 'displayUserMessage',
                 //     text: data.text
                 // });
                 // <-- 삭제 끝 -->


                 // 명령어 실행 로직
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
                     console.log('Echoing message:', data.text);
                     const response = `Panel Echo: "${data.text}"`;
                     panel.webview.postMessage({
                         command: 'receiveMessage',
                         text: response,
                         sender: 'CodePilot',
                     });
                 }

                break;
             case 'openPanel':
                 console.log(`Received open panel command from chat panel: ${data.panel}`);
                 if (data.panel === 'settings') {
                      // Chat Panel에서 열리는 Info 패널은 ViewColumn.One으로 고정되어 있습니다.
                     openBlankPanel(extensionUri, 'Settings', 'CodePilot Settings');
                 } else if (data.panel === 'license') {
                      openBlankPanel(extensionUri, 'License', 'CodePilot License Information');
                 } else if (data.panel === 'customizing') {
                      openBlankPanel(extensionUri, 'Customizing', 'CodePilot Customization Options');
                 } else {
                      console.warn('Unknown panel command received:', data.panel);
                 }
                 break;
            // TODO: 필요한 다른 메시지 타입 처리 추가
        }
    });
     console.log(`Chat panel '${panelTitle}' created.`);
}
// <-- 추가 끝 -->

// --- END OF FILE extension.ts (Modified) ---