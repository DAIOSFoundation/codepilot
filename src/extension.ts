// --- START OF FILE extension.ts (Modified) ---

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

// 채팅 뷰를 제공하는 WebviewViewProvider 구현 클래스
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

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.command) {
                case 'sendMessage':
                    console.log('Received message from chat view:', data.text);
                    // 사용자가 보낸 메시지를 UI에 바로 표시하도록 Webview에 알림
                    this._view?.webview.postMessage({
                        command: 'displayUserMessage', // 사용자 메시지 표시를 위한 새로운 커맨드
                        text: data.text
                    });

                    // TODO: 여기에 실제 LLM 호출 또는 채팅 로직 구현
                    const response = `Echo: "${data.text}"`;
                    // LLM 응답을 받으면 CodePilot 메시지로 UI에 표시하도록 메시지 전송
                    this._view?.webview.postMessage({
                        command: 'receiveMessage',
                        text: response,
                        sender: 'CodePilot', // 누가 보냈는지 명확히 전달 (여전히 유용할 수 있음)
                        // <-- 수정: title 제거 -->
                        // title: `Echo for "${data.text.substring(0, 50)}..."` // 타이틀로 사용할 내용
                        // <-- 수정 끝 -->
                    });
                    break;
                case 'openPanel':
                    console.log(`Received open panel command from chat view: ${data.panel}`);
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
             return `<h1>Error loading chat view</h1><p>${errorMessage}</p>`;
         }
        return htmlContent;
    }
}


// Extension Activate 함수: 확장이 활성화될 때 호출됨
export function activate(context: vscode.ExtensionContext) {

    console.log('Congratulations, your extension "codepilot" is now active!');

    const chatViewProvider = new ChatViewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(ChatViewProvider.viewId, chatViewProvider)
    );

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

    const openBanyaChatCommand = vscode.commands.registerCommand('codepilot.openChatView', () => {
        console.log('Executing command: Open Banya Chat (using createWebviewPanel)');
        openChatPanel(context.extensionUri, 'Chat', 'CodePilot Chat');
    });
    context.subscriptions.push(openBanyaChatCommand);

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

// <-- 수정: Chat UI를 가진 새로운 Webview 패널을 생성하는 헬퍼 함수 -->
function openChatPanel(extensionUri: vscode.Uri, panelIdSuffix: string, panelTitle: string) {
    const panel = vscode.window.createWebviewPanel(
        `codepilot.${panelIdSuffix.toLowerCase()}`,
        panelTitle,
        vscode.ViewColumn.One,
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

    // <-- 수정: chat panel과 확장 간의 메시지 통신 로직 구현 -->
    panel.webview.onDidReceiveMessage(data => {
        switch (data.command) {
            case 'sendMessage':
                console.log('Received message from chat panel:', data.text);
                 // 사용자가 보낸 메시지를 UI에 바로 표시하도록 Webview에 알림
                 panel.webview.postMessage({
                     command: 'displayUserMessage', // 사용자 메시지 표시를 위한 새로운 커맨드
                     text: data.text
                 });

                 // TODO: 여기에 실제 LLM 호출 또는 채팅 로직 구현
                 const response = `Panel Echo: "${data.text}"`;
                 // LLM 응답을 받으면 CodePilot 메시지로 UI에 표시하도록 메시지 전송
                 panel.webview.postMessage({
                     command: 'receiveMessage',
                     text: response,
                     sender: 'CodePilot', // 누가 보냈는지 명확히 전달
                     // <-- 수정: title 제거 -->
                     // title: `Echo for "${data.text.substring(0, 50)}..."` // 타이틀로 사용할 내용
                     // <-- 수정 끝 -->
                 });
                break;
             case 'openPanel':
                 console.log(`Received open panel command from chat panel: ${data.panel}`);
                 if (data.panel === 'settings') {
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
// <-- 수정 끝 -->

// --- END OF FILE extension.ts (Modified) ---