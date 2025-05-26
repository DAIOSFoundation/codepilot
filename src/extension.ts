import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs'; // 파일 시스템 모듈 임포트

// 채팅 뷰를 제공하는 WebviewViewProvider 구현 클래스
// 이 클래스는 Activity Bar 아이콘 클릭 시 사용되지만,
// 'Open Banya Chat' 명령에서는 이제 사용하지 않습니다. (package.json의 contributes.views 설정은 그대로 유지)
class ChatViewProvider implements vscode.WebviewViewProvider {

    public static readonly viewId = 'codepilot.chatView'; // Chat 뷰의 고유 ID

    private _view?: vscode.WebviewView; // 현재 활성화된 WebviewView 인스턴스

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
                vscode.Uri.joinPath(this._extensionUri, 'webview')
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.command) {
                case 'sendMessage':
                    console.log('Received message from chat view:', data.text);
                    // TODO: 여기에 실제 LLM 호출 또는 채팅 로직 구현
                    const response = `Echo: "${data.text}"`;
                    this._view?.webview.postMessage({
                        command: 'receiveMessage',
                        text: response
                    });
                    break;
            }
        });

         webviewView.onDidDispose(() => {
            console.log('Chat view disposed');
            this._view = undefined;
        });

        console.log('Chat View resolved (via sidebar or openView command if it worked)');
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
         const htmlFilePath = vscode.Uri.joinPath(this._extensionUri, 'webview', 'chat.html');
         let htmlContent = '';
         try {
             htmlContent = fs.readFileSync(htmlFilePath.fsPath, 'utf8');
         } catch (error: unknown) {
             console.error('Error reading chat.html:', error);
             const errorMessage = (typeof error === 'object' && error !== null && 'message' in error)
                                 ? (error as { message: string }).message
                                 : String(error);
             return `<h1>Error loading chat view</h1><p>${errorMessage}</p>`;
         }
        return htmlContent;
    }
    // sendMessageToWebview 함수는 이제 'Open Banya Chat' 명령에서 직접 사용되지 않음
    // public sendMessageToWebview(command: string, text: string) { ... }
}


// Extension Activate 함수: 확장이 활성화될 때 호출됨
export function activate(context: vscode.ExtensionContext) {

    console.log('Congratulations, your extension "codepilot" is now active!');

    // 1. Chat Webview View Provider 등록 (Activity Bar 아이콘 클릭 시 작동)
    // 'vscode.openView'가 작동하지 않더라도 이 등록 자체는 유효하며,
    // Activity Bar 아이콘을 클릭하거나 탐색기에 뷰가 추가된 경우 이 프로바이더가 사용됩니다.
    const chatViewProvider = new ChatViewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(ChatViewProvider.viewId, chatViewProvider)
    );

    // 2. Command 등록 (package.json의 contributes.commands[]에 정의된 명령어들)

    const openSettingsPanelCommand = vscode.commands.registerCommand('codepilot.openSettingsPanel', () => {
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
        vscode.window.showInformationMessage('Hello World from CodePilot!');
    });
    context.subscriptions.push(helloWorldCommand);

    // <-- 수정: 'Open Banya Chat' 명령어 핸들러를 createWebviewPanel 사용으로 변경 -->
    const openBanyaChatCommand = vscode.commands.registerCommand('codepilot.openChatView', () => {
        console.log('Executing command: Open Banya Chat (using createWebviewPanel)');
        // 이제 vscode.openView 대신 새로운 패널 생성 함수 호출
        openChatPanel(context.extensionUri, 'Chat', 'CodePilot Chat');
    });
    context.subscriptions.push(openBanyaChatCommand);
    // <-- 수정 끝 -->


     // TODO: 필요한 다른 기능 구현
}

// Extension Deactivate 함수: 확장이 비활성화될 때 호출됨
export function deactivate() {
     console.log('Your extension "codepilot" is now deactivated.');
}


// 빈 Webview 패널을 생성하고 HTML 파일을 로드하는 헬퍼 함수 (기존과 동일)
function openBlankPanel(extensionUri: vscode.Uri, panelIdSuffix: string, panelTitle: string) {
     const panel = vscode.window.createWebviewPanel(
         `codepilot.${panelIdSuffix.toLowerCase()}`,
         panelTitle,
         vscode.ViewColumn.One,
         {
             enableScripts: true,
             localResourceRoots: [
                 extensionUri,
                 vscode.Uri.joinPath(extensionUri, 'webview')
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

// <-- 추가: Chat UI를 가진 새로운 Webview 패널을 생성하는 헬퍼 함수 -->
function openChatPanel(extensionUri: vscode.Uri, panelIdSuffix: string, panelTitle: string) {
    // 이미 열린 채팅 패널이 있는지 확인하고 재활용 (선택 사항)
    // 이 예시에서는 매번 새로운 패널을 엽니다.
    const panel = vscode.window.createWebviewPanel(
        `codepilot.${panelIdSuffix.toLowerCase()}`, // 고유 ID (예: codepilot.chat)
        panelTitle, // 패널 제목 (예: CodePilot Chat)
        vscode.ViewColumn.One, // 패널 열 위치 (예: 현재 에디터 그룹)
        {
            enableScripts: true, // 스크립트 허용
            localResourceRoots: [ // 리소스 접근 허용 범위
                extensionUri,
                vscode.Uri.joinPath(extensionUri, 'webview')
            ]
        }
    );

    // webview 폴더 내의 chat.html 파일 경로
    const htmlFilePath = vscode.Uri.joinPath(extensionUri, 'webview', 'chat.html');
    let htmlContent = '';

    try {
        htmlContent = fs.readFileSync(htmlFilePath.fsPath, 'utf8');
    } catch (error: unknown) {
        console.error(`Error reading chat.html for ${panelTitle} panel:`, error);
        const errorMessage = (typeof error === 'object' && error !== null && 'message' in error)
                           ? (error as { message: string }).message
                           : String(error);
        htmlContent = `<h1>Error loading panel</h1><p>${errorMessage}</p>`;
    }

    panel.webview.html = htmlContent;

    // 패널 닫힐 때 호출될 리스너 등록 (필요하다면 정리 작업 수행)
    panel.onDidDispose(() => {
        console.log(`${panelTitle} panel closed`);
    }, null, []);

    // TODO: 필요하다면 chat panel과 확장 간의 메시지 통신 로직 구현 (WebviewView 방식과 유사)
    panel.webview.onDidReceiveMessage(data => {
        switch (data.command) {
            case 'sendMessage':
                console.log('Received message from chat panel:', data.text);
                 // TODO: 여기에 실제 LLM 호출 또는 채팅 로직 구현 (WebviewView 방식과 동일)
                 const response = `Panel Echo: "${data.text}"`;
                 // 패널 Webview로 응답 전송
                 panel.webview.postMessage({
                     command: 'receiveMessage',
                     text: response
                 });
                break;
        }
    });
     console.log(`Chat panel '${panelTitle}' created.`);
}
// <-- 추가 끝 -->