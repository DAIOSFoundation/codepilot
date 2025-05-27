// --- START OF FILE extension.ts (Script Load Fix) ---

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import { StorageService } from './storage/storage';
import { GeminiApi } from './api/gemini';

let codePilotTerminal: vscode.Terminal | undefined;
let storageService: StorageService;
let geminiApi: GeminiApi;

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


class ChatViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewId = 'codepilot.chatView';
    private _view?: vscode.WebviewView;
    constructor(private readonly _extensionUri: vscode.Uri) {}

    public resolveWebviewView( webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext, _token: vscode.CancellationToken, ) {
        this._view = webviewView;
        webviewView.webview.options = { enableScripts: true, localResourceRoots: [ this._extensionUri, vscode.Uri.joinPath(this._extensionUri, 'webview'), vscode.Uri.joinPath(this._extensionUri, 'media') ] };

        // <-- 수정: getHtmlForWebview 호출 -->
        webviewView.webview.html = this._getHtmlForWebview('chat', webviewView.webview);
        // <-- 수정 끝 -->

        webviewView.webview.onDidReceiveMessage(async data => { // <-- async 유지 -->
            switch (data.command) {
                case 'sendMessage':
                    console.log('Received message from chat view:', data.text);
                    const userText = data.text.trim();

                    const apiKey = await storageService.getApiKey();
                    if (!apiKey) {
                        this._view?.webview.postMessage({ command: 'receiveMessage', text: "Error: Gemini API Key is not set. Please go to the License panel to set it.", sender: 'CodePilot' });
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
                         try { geminiResponse = await geminiApi.sendMessage(userText); }
                         catch (error: any) { console.error("Gemini API Call Failed:", error); geminiResponse = `Error: Failed to get response from AI. ${error.message || ''}`; }
                         this._view?.webview.postMessage({ command: 'receiveMessage', text: geminiResponse, sender: 'CodePilot' });
                    }
                    break;
                case 'openPanel':
                    console.log(`Received open panel command from chat view: ${data.panel}`);
                    if (data.panel === 'settings') { openBlankPanel(this._extensionUri, 'Settings', 'CodePilot Settings'); }
                    else if (data.panel === 'license') { openLicensePanel(this._extensionUri, 'License', 'CodePilot License Information'); }
                    else if (data.panel === 'customizing') { openBlankPanel(this._extensionUri, 'Customizing', 'CodePilot Customization Options'); }
                    break;
            }
        });

         webviewView.onDidDispose(() => { console.log('Chat view disposed'); this._view = undefined; });
        console.log('Chat View resolved (via sidebar)');
    }

    // <-- 수정: getHtmlForWebview 함수에 scriptUri 치환 로직 추가 -->
    private _getHtmlForWebview(fileName: string, webview: vscode.Webview): string {
         const htmlFilePath = vscode.Uri.joinPath(this._extensionUri, 'webview', `${fileName}.html`);
         let htmlContent = '';
         try {
             htmlContent = fs.readFileSync(htmlFilePath.fsPath, 'utf8');

             // 아이콘 경로 치환 (필요하다면)
             const settingsIconUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'settings-gear.svg'));
             const licenseIconUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'book.svg'));
             const customizingIconUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'paintbrush.svg'));

             htmlContent = htmlContent
                 .replace('{{settingsIconUri}}', settingsIconUri.toString())
                 .replace('{{licenseIconUri}}', licenseIconUri.toString())
                 .replace('{{customizingIconUri}}', customizingIconUri.toString());

             // <-- 추가: chat.js 파일의 Webview URI 생성 및 치환 -->
             if (fileName === 'chat') {
                // 웹팩 설정에 따라 dist/webview 폴더에 번들링된다고 가정
                const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'chat.js'));
                htmlContent = htmlContent.replace('{{scriptUri}}', scriptUri.toString());
             }
             // <-- 추가 끝 -->


         } catch (error: unknown) {
             console.error(`Error reading ${fileName}.html:`, error);
             const errorMessage = (typeof error === 'object' && error !== null && 'message' in error)
                                 ? (error as { message: string }).message
                                 : String(error);
             return `<h1>Error loading ${fileName} view</h1><p>${errorMessage}</p>`;
         }
        return htmlContent;
    }
    // <-- 수정 끝 -->
}


export async function activate(context: vscode.ExtensionContext) { // <-- async 유지 -->
    console.log('Congratulations, your extension "codepilot" is now active!');
    storageService = new StorageService(context.secrets);
    const apiKey = await storageService.getApiKey();
    geminiApi = new GeminiApi(apiKey || undefined);

    const chatViewProvider = new ChatViewProvider(context.extensionUri);
    context.subscriptions.push( vscode.window.registerWebviewViewProvider(ChatViewProvider.viewId, chatViewProvider) );

    const terminal = getCodePilotTerminal();
    terminal.show();
    terminal.sendText("echo CodePilot activated!", true);

    const openSettingsPanelCommand = vscode.commands.registerCommand('codepilot.openSettingsPanel', () => {
        openBlankPanel(context.extensionUri, 'Settings', 'CodePilot Settings');
    });
    context.subscriptions.push(openSettingsPanelCommand);

    const openLicensePanelCommand = vscode.commands.registerCommand('codepilot.openLicensePanel', () => {
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

    const openBanyaChatCommand = vscode.commands.registerCommand('codepilot.openChatView', () => {
        console.log('Executing command: Open Banya Chat (using createWebviewPanel in ViewColumn.Two)');
        openChatPanel(context.extensionUri, 'Chat', 'CodePilot Chat', vscode.ViewColumn.Two);
    });
    context.subscriptions.push(openBanyaChatCommand);
}

export function deactivate() {
     console.log('Your extension "codepilot" is now deactivated.');
     codePilotTerminal?.dispose();
}


// <-- 수정/추가: createWebviewPanelWithHtml 함수 -->
function createWebviewPanelWithHtml(
    extensionUri: vscode.Uri, panelIdSuffix: string, panelTitle: string, htmlFileName: string,
    viewColumn: vscode.ViewColumn = vscode.ViewColumn.One,
    onDidReceiveMessage?: (data: any, panel: vscode.WebviewPanel) => void
) {
     const panel = vscode.window.createWebviewPanel(
         `codepilot.${panelIdSuffix.toLowerCase()}`, panelTitle, viewColumn,
         { enableScripts: true, localResourceRoots: [ extensionUri, vscode.Uri.joinPath(extensionUri, 'webview'), vscode.Uri.joinPath(extensionUri, 'media'), vscode.Uri.joinPath(extensionUri, 'dist', 'webview') ] } // <-- dist/webview도 추가 -->
     );

     const htmlFilePath = vscode.Uri.joinPath(extensionUri, 'webview', `${htmlFileName}.html`);
     let htmlContent = '';

      try {
         htmlContent = fs.readFileSync(htmlFilePath.fsPath, 'utf8');

         // 아이콘 경로 치환 (필요하다면)
         const settingsIconUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'settings-gear.svg'));
         const licenseIconUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'book.svg'));
         const customizingIconUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'paintbrush.svg'));

         htmlContent = htmlContent
             .replace('{{settingsIconUri}}', settingsIconUri.toString())
             .replace('{{licenseIconUri}}', licenseIconUri.toString())
             .replace('{{customizingIconUri}}', customizingIconUri.toString());

         // <-- 추가: chat.js 파일의 Webview URI 생성 및 치환 -->
         if (htmlFileName === 'chat') {
            const scriptUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'chat.js'));
            htmlContent = htmlContent.replace('{{scriptUri}}', scriptUri.toString());
         }
         // <-- 추가 끝 -->

      } catch (error: unknown) {
         console.error(`Error reading ${htmlFileName}.html for ${panelTitle} panel:`, error);
         const errorMessage = (typeof error === 'object' && error !== null && 'message' in error)
                            ? (error as { message: string }).message
                            : String(error);
         htmlContent = `<h1>Error loading panel</h1><p>${errorMessage}</p>`;
      }

     panel.webview.html = htmlContent;

     panel.onDidDispose(() => { console.log(`${panelTitle} panel closed`); }, null, []);

     if (onDidReceiveMessage) {
         panel.webview.onDidReceiveMessage(data => { onDidReceiveMessage(data, panel); });
     }

     return panel;
}
// <-- 수정/추가 끝 -->


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
                             await storageService.saveApiKey(apiKey);
                             geminiApi.updateApiKey(apiKey); // Gemini API 인스턴스 업데이트
                             panel.webview.postMessage({ command: 'apiKeySaved' });
                         } catch (error: any) { console.error('Error saving API Key:', error); panel.webview.postMessage({ command: 'apiKeySaveError', error: error.message || String(error) }); }
                     } else {
                          console.warn('Received saveApiKey command but API key was empty.');
                          panel.webview.postMessage({ command: 'apiKeySaveError', error: 'API Key cannot be empty.' });
                     }
                     break;
             }
         }
     );
}

// chat.html을 로드하고 메시지를 처리하는 헬퍼 함수
function openChatPanel(extensionUri: vscode.Uri, panelIdSuffix: string, panelTitle: string, viewColumn: vscode.ViewColumn = vscode.ViewColumn.One) { // <-- 기본값 유지 -->
     createWebviewPanelWithHtml(extensionUri, panelIdSuffix, panelTitle, 'chat', viewColumn, // <-- viewColumn 인자 사용 -->
        async (data, panel) => { // <-- async 유지 -->
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
                          try { geminiResponse = await geminiApi.sendMessage(userText); }
                          catch (error: any) { console.error("Gemini API Call Failed:", error); geminiResponse = `Error: Failed to get response from AI. ${error.message || ''}`; }

                          panel.webview.postMessage({ command: 'receiveMessage', text: geminiResponse, sender: 'CodePilot' });
                     }
                     break;
                  case 'openPanel':
                      console.log(`Received open panel command from chat panel: ${data.panel}`);
                       if (data.panel === 'settings') { openBlankPanel(extensionUri, 'Settings', 'CodePilot Settings'); }
                       else if (data.panel === 'license') { openLicensePanel(extensionUri, 'License', 'CodePilot License Information', panel.viewColumn); }
                       else if (data.panel === 'customizing') { openBlankPanel(extensionUri, 'Customizing', 'CodePilot Customization Options'); }
                       break;
             }
         }
     );
}
// <-- 추가 끝 -->

// --- END OF FILE extension.ts ---