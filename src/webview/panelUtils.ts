import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * webview가 유효한지 확인하고 안전하게 메시지를 보내는 함수
 */
export function safePostMessage(webview: vscode.Webview, message: any): boolean {
    try {
        if (webview) {
            webview.postMessage(message);
            return true;
        }
        return false;
    } catch (error) {
        console.warn('Failed to post message to webview:', error);
        return false;
    }
}

/**
 * 범용 논스(nonce) 값을 생성합니다.
 */
export function getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

/**
 * 웹뷰 HTML 콘텐츠를 로드하고, 필요한 URI들을 변환하여 반환합니다.
 */
export function getHtmlContentWithUris(extensionUri: vscode.Uri, htmlFileName: string, webview: vscode.Webview): string {
    const htmlFilePathOnDisk = vscode.Uri.joinPath(extensionUri, 'webview', `${htmlFileName}.html`);
    let htmlContent = '';
    const nonce = getNonce();

    try {
        htmlContent = fs.readFileSync(htmlFilePathOnDisk.fsPath, 'utf8');
        console.log(`[HTML Loader] Read ${htmlFileName}.html. Length: ${htmlContent.length}`);

        const commonStylesUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'styles.css'));
        const specificStylesUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', `${htmlFileName}.css`));

        htmlContent = htmlContent
            .replace(/\{\{nonce\}\}/g, nonce)
            .replace(/\{\{cspSource\}\}/g, webview.cspSource)
            .replace('{{commonStylesUri}}', commonStylesUri.toString())
            .replace(`{{${htmlFileName}StylesUri}}`, specificStylesUri.toString());

        // 스크립트 URI (파일별로 다를 수 있음)
        let mainScriptUri = '';
        let secondaryScriptUri = '';

        if (htmlFileName === 'chat') {
            mainScriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'chat.js')).toString();
            secondaryScriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'codeCopy.js')).toString();
            htmlContent = htmlContent.replace('{{codeCopyScriptUri}}', secondaryScriptUri);
        } else if (htmlFileName === 'ask') {
            mainScriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'ask.js')).toString();
            secondaryScriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'codeCopy.js')).toString();
            htmlContent = htmlContent.replace('{{codeCopyScriptUri}}', secondaryScriptUri);
        } else if (htmlFileName === 'settings') {
            mainScriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'settings.js')).toString();
        } else if (htmlFileName === 'license') {
            // license.html에 별도 JS 파일이 있다면 여기서 URI 생성
            mainScriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'license.js')).toString(); // license.js가 있다고 가정
        }
        htmlContent = htmlContent.replace('{{scriptUri}}', mainScriptUri);


    } catch (error: any) {
        console.error(`[HTML Loader] Error for ${htmlFileName}.html:`, error);
        return `<h1>Error loading ${htmlFileName} view</h1><p>${error.message || 'File not found.'}</p>`;
    }
    return htmlContent;
}

/**
 * 새 웹뷰 패널을 생성하고 설정합니다.
 */
export function createAndSetupWebviewPanel(
    extensionUri: vscode.Uri,
    contextForSubs: vscode.ExtensionContext,
    panelTypeSuffix: string,
    panelTitle: string,
    htmlFileName: string,
    viewColumn: vscode.ViewColumn = vscode.ViewColumn.One,
    onDidReceiveMessage?: (data: any, panel: vscode.WebviewPanel) => void | Promise<void>
): vscode.WebviewPanel {
    const panel = vscode.window.createWebviewPanel(
        `codepilot.${panelTypeSuffix.toLowerCase()}`, panelTitle, viewColumn,
        {
            enableScripts: true, retainContextWhenHidden: true,
            localResourceRoots: [
                extensionUri,
                vscode.Uri.joinPath(extensionUri, 'webview'),
                vscode.Uri.joinPath(extensionUri, 'media'),
                vscode.Uri.joinPath(extensionUri, 'dist'),
                vscode.Uri.joinPath(extensionUri, 'dist', 'webview') // 추가
            ]
        }
    );
    panel.webview.html = getHtmlContentWithUris(extensionUri, htmlFileName, panel.webview);
    panel.onDidDispose(() => { /* 정리 */ }, undefined, contextForSubs.subscriptions);
    if (onDidReceiveMessage) {
        panel.webview.onDidReceiveMessage(async (data) => { await onDidReceiveMessage(data, panel); }, undefined, contextForSubs.subscriptions);
    }
    panel.reveal(viewColumn);
    return panel;
}