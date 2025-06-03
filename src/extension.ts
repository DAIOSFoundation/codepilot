import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import * as os from 'os';

// 사용자 정의 모듈 임포트
import { StorageService } from './storage/storage';
import { GeminiApi } from './api/gemini';

let storageService: StorageService;
let geminiApi: GeminiApi;
let codePilotTerminal: vscode.Terminal | undefined;


function getCodePilotTerminal(): vscode.Terminal {
    if (!codePilotTerminal || codePilotTerminal.exitStatus !== undefined) {
        codePilotTerminal = vscode.window.createTerminal({ name: "CodePilot Terminal" });
        const disposable = vscode.window.onDidCloseTerminal(event => {
            if (event === codePilotTerminal) {
                codePilotTerminal = undefined;
                disposable.dispose();
            }
        });
    }
    return codePilotTerminal;
}

class ChatViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'codepilot.chatView';
    private _view?: vscode.WebviewView;

    constructor(private readonly extensionUri: vscode.Uri, private readonly context: vscode.ExtensionContext) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this.extensionUri,
                vscode.Uri.joinPath(this.extensionUri, 'webview'),
                vscode.Uri.joinPath(this.extensionUri, 'media'),
                vscode.Uri.joinPath(this.extensionUri, 'dist'),
                vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview')
            ]
        };
        webviewView.webview.html = getHtmlContentWithUris(this.extensionUri, 'chat', webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async data => {
            switch (data.command) {
                case 'sendMessage':
                    await handleUserMessageAndRespond(data.text, webviewView.webview, this.context);
                    break;
                case 'openPanel':
                    let targetViewColumn = vscode.ViewColumn.Beside;
                    if (vscode.window.activeTextEditor?.viewColumn) {
                        targetViewColumn = vscode.window.activeTextEditor.viewColumn;
                    }
                    if (data.panel === 'settings') openSettingsPanel(this.extensionUri, this.context, targetViewColumn);
                    else if (data.panel === 'license') openLicensePanel(this.extensionUri, this.context, targetViewColumn);
                    else if (data.panel === 'customizing') openBlankPanel(this.extensionUri, this.context, targetViewColumn);
                    break;
                case 'webviewLoaded':
                    console.log('[ChatViewProvider] Chat webview loaded.');
                    break;
            }
        });
        webviewView.onDidDispose(() => {
            console.log('[ChatViewProvider] Chat view disposed');
            this._view = undefined;
        }, null, this.context.subscriptions);
    }
}

export async function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, CodePilot is now active!');
    storageService = new StorageService(context.secrets);
    const initialApiKey = await storageService.getApiKey();
    if (!initialApiKey) {
        vscode.window.showWarningMessage('CodePilot: Gemini API Key is not set. Please set it in the License panel for AI features.');
    }
    geminiApi = new GeminiApi(initialApiKey || undefined);

    const chatViewProvider = new ChatViewProvider(context.extensionUri, context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(ChatViewProvider.viewType, chatViewProvider, {
            webviewOptions: { retainContextWhenHidden: true }
        })
    );

    context.subscriptions.push(vscode.commands.registerCommand('codepilot.openChatView', () => {
        vscode.commands.executeCommand('workbench.view.extension.codepilotViewContainer');
    }));
    context.subscriptions.push(vscode.commands.registerCommand('codepilot.openSettingsPanel', () => {
        openSettingsPanel(context.extensionUri, context, vscode.ViewColumn.One);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('codepilot.openLicensePanel', () => {
        openLicensePanel(context.extensionUri, context, vscode.ViewColumn.One);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('codepilot.openCustomizingPanel', () => {
        openBlankPanel(context.extensionUri, context, vscode.ViewColumn.One);
    }));

    console.log('CodePilot activated and commands registered.');
}

export function deactivate() {
    if (codePilotTerminal) codePilotTerminal.dispose();
}

// --- 파일 읽기 및 프롬프트, 응답 처리 로직 ---
async function handleUserMessageAndRespond(userQuery: string, webviewToRespond: vscode.Webview, context: vscode.ExtensionContext) {
    const apiKey = await storageService.getApiKey();
    if (!apiKey) {
        webviewToRespond.postMessage({ command: 'receiveMessage', sender: 'CodePilot', text: "Error: Gemini API Key is not set. Please set it via CodePilot settings." });
        return;
    }
    webviewToRespond.postMessage({ command: 'showLoading' });

    try {
        const sourcePathsSetting = vscode.workspace.getConfiguration('codepilot').get<string[]>('sourcePaths') || [];
        let fileContentsContext = "";
        const MAX_TOTAL_CONTENT_LENGTH = 25000;
        let currentTotalContentLength = 0;
        // <-- 수정: includedFilesForContext를 handleUserMessageAndRespond의 로컬 변수로 유지 -->
        const includedFilesForContext: { name: string, fullPath: string }[] = [];
        // <-- 수정 끝 -->

        for (const sourcePath of sourcePathsSetting) {
            if (currentTotalContentLength >= MAX_TOTAL_CONTENT_LENGTH) {
                fileContentsContext += "\n[INFO] 컨텍스트 길이 제한으로 일부 파일 내용이 생략되었습니다.\n";
                break;
            }
            try {
                const uri = vscode.Uri.file(sourcePath);
                const stats = await vscode.workspace.fs.stat(uri);

                if (stats.type === vscode.FileType.File) {
                    const contentBytes = await vscode.workspace.fs.readFile(uri);
                    const content = Buffer.from(contentBytes).toString('utf8');
                    const fileName = path.basename(sourcePath);

                    if (currentTotalContentLength + content.length <= MAX_TOTAL_CONTENT_LENGTH) {
                        fileContentsContext += `파일명: ${fileName}\n코드:\n\`\`\`${getFileType(sourcePath)}\n${content}\n\`\`\`\n\n`;
                        currentTotalContentLength += content.length;
                        includedFilesForContext.push({ name: fileName, fullPath: sourcePath });
                    } else {
                        fileContentsContext += `파일명: ${fileName}\n코드:\n[INFO] 파일 내용이 너무 길어 생략되었습니다.\n\n`;
                    }
                } else if (stats.type === vscode.FileType.Directory) {
                    const pattern = vscode.Uri.joinPath(uri, '**/*.{ts,js,py,html,css,md,java,c,cpp,go,rs}').fsPath;
                    const files = glob.sync(pattern, { nodir: true, dot: false, ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/out/**'] });

                    for (const file of files) {
                        if (currentTotalContentLength >= MAX_TOTAL_CONTENT_LENGTH) break;
                        const fileUri = vscode.Uri.file(file);
                        const contentBytes = await vscode.workspace.fs.readFile(fileUri);
                        const content = Buffer.from(contentBytes).toString('utf8');
                        const relativeFileName = path.relative(sourcePath, file).replace(/\\/g, '/') || path.basename(file);

                        if (currentTotalContentLength + content.length <= MAX_TOTAL_CONTENT_LENGTH) {
                            fileContentsContext += `파일명: ${relativeFileName}\n코드:\n\`\`\`${getFileType(file)}\n${content}\n\`\`\`\n\n`;
                            currentTotalContentLength += content.length;
                            includedFilesForContext.push({ name: relativeFileName, fullPath: file });
                        } else {
                            fileContentsContext += `파일명: ${relativeFileName}\n코드:\n[INFO] 파일 내용이 너무 길어 생략되었습니다.\n\n`;
                            break;
                        }
                    }
                }
            } catch (err: any) {
                console.error(`Error processing source path ${sourcePath}:`, err);
                fileContentsContext += `[오류] 경로 '${sourcePath}' 처리 중 문제 발생: ${err.message}\n\n`;
            }
        }
        if (includedFilesForContext.length === 0 && sourcePathsSetting.length > 0) {
             fileContentsContext += "[정보] 설정된 경로에서 컨텍스트에 포함할 파일을 찾지 못했습니다. 파일 확장자나 경로 설정을 확인해주세요.\n";
        } else if (sourcePathsSetting.length === 0) {
             fileContentsContext += "[정보] 참조할 소스 경로가 설정되지 않았습니다. CodePilot 설정에서 경로를 추가해주세요.\n";
        }


        const systemPrompt = `당신은 코드 수정 전문가입니다. 제공된 코드 컨텍스트를 바탕으로 사용자의 요청을 수행하고, 수정된 코드를 제공합니다.
중요 규칙:
1.  항상 모든 파일의 전체 코드를 출력해야 합니다. 부분적인 코드 변경만 출력하지 마세요.
2.  수정된 코드를 출력할 때는, 코드 블록 바로 위에 다음 형식을 반드시 정확하게 지켜서 원래 파일명을 명시해야 합니다:
    수정 파일: [원본 파일명]
    여기서 [원본 파일명]은 컨텍스트로 제공된 '파일명: ' 뒤의 파일명(경로 포함 가능)과 정확히 일치해야 합니다. (예: '수정 파일: utils.js' 또는 '수정 파일: src/components/Button.tsx')
3.  수정할 파일이 여러 개일 경우, 각 파일에 대해 2번 규칙을 반복하여 명시하고 해당 파일의 전체 코드를 코드 블록으로 출력합니다.
4.  새로운 파일을 생성해야 하는 경우, '새 파일: [새 파일 경로/파일명]' 형식으로 명시하고 전체 코드를 출력합니다. (이 기능은 현재는 업데이트 대상이 아님)
5.  수정하지 않은 파일에 대해서는 언급하거나 코드를 출력할 필요가 없습니다.`;

        const fullPrompt = `사용자 요청: ${userQuery}\n\n--- 참조 코드 컨텍스트 ---\n${fileContentsContext.trim() === "" ? "참조 코드가 제공되지 않았습니다." : fileContentsContext}`;

        console.log("[To LLM] System Prompt:", systemPrompt);
        console.log("[To LLM] Full Prompt (first 300 chars):", fullPrompt.substring(0,300));

        let llmResponse = await geminiApi.sendMessageWithSystemPrompt(systemPrompt, fullPrompt);

        // <-- 수정: includedFilesForContext를 인자로 전달 -->
        await processLlmResponseAndAutoUpdate(llmResponse, includedFilesForContext, webviewToRespond, context);
        // <-- 수정 끝 -->

    } catch (error: any) {
        console.error("Error in handleUserMessageAndRespond:", error);
        webviewToRespond.postMessage({ command: 'receiveMessage', sender: 'CodePilot', text: `Error: ${error.message || 'Failed to process request.'}` });
        webviewToRespond.postMessage({ command: 'hideLoading' });
    }
}

async function processLlmResponseAndAutoUpdate(
    llmResponse: string,
    // <-- 수정: includedFilesForContext를 인자로 받도록 수정 -->
    contextFiles: { name: string, fullPath: string }[],
    // <-- 수정 끝 -->
    webview: vscode.Webview,
    context: vscode.ExtensionContext // Diff 및 임시 파일 정리용
) {
    const updatesToApply: { filePath: string; newContent: string; originalName: string }[] = [];
    const codeBlockRegex = /수정 파일:\s*(.+?)\s*```(\w*\s*)\n([\s\S]*?)```/g;
    let match;

    console.log("[LLM Response Parsing] Starting. LLM Response (first 300 chars):", llmResponse.substring(0,300));

    while ((match = codeBlockRegex.exec(llmResponse)) !== null) {
        const llmSpecifiedFileName = match[1].trim();
        const newCode = match[3];
        console.log(`[LLM Response Parsing] Found directive. LLM file: "${llmSpecifiedFileName}"`);

        // <-- 수정: contextFiles 배열의 타입을 명시적으로 지정 -->
        const matchedFile = contextFiles.find((f: {name: string, fullPath: string}) => f.name === llmSpecifiedFileName);
        // <-- 수정 끝 -->

        if (matchedFile) {
            console.log(`[LLM Response Parsing] Matched to local file: "${matchedFile.fullPath}"`);
            updatesToApply.push({ filePath: matchedFile.fullPath, newContent: newCode, originalName: llmSpecifiedFileName });
        } else {
            const warnMsg = `경고: AI가 수정을 제안한 파일 '${llmSpecifiedFileName}'을(를) 컨텍스트 목록에서 찾을 수 없습니다. 해당 파일은 업데이트되지 않았습니다.`;
            // <-- 수정: contextFiles.map의 'f' 매개변수 타입 명시 -->
            console.warn(`[LLM Response Parsing] No match for: "${llmSpecifiedFileName}". Context:`, contextFiles.map((f: {name: string, fullPath: string}) => f.name));
            // <-- 수정 끝 -->
            webview.postMessage({ command: 'receiveMessage', sender: 'CodePilot', text: warnMsg });
        }
    }

    let updateSummaryMessages: string[] = [];

    if (updatesToApply.length > 0) {
        const autoUpdateEnabled = vscode.workspace.getConfiguration('codepilot').get<boolean>('autoUpdateFiles');

        for (const update of updatesToApply) {
            const fileNameForDisplay = update.originalName;
            const fileUri = vscode.Uri.file(update.filePath);

            if (autoUpdateEnabled) {
                try {
                    await vscode.workspace.fs.writeFile(fileUri, Buffer.from(update.newContent, 'utf8'));
                    const successMsg = `✅ 파일이 자동으로 업데이트되었습니다: ${fileNameForDisplay}`;
                    vscode.window.showInformationMessage(`CodePilot: ${successMsg}`);
                    updateSummaryMessages.push(successMsg);
                } catch (err: any) {
                    const errorMsg = `❌ 파일 자동 업데이트 실패 (${fileNameForDisplay}): ${err.message}`;
                    vscode.window.showErrorMessage(`CodePilot: ${errorMsg}`);
                    updateSummaryMessages.push(errorMsg);
                }
            } else {
                const userChoice = await vscode.window.showInformationMessage(
                    `CodePilot: AI가 '${fileNameForDisplay}' 파일 수정을 제안했습니다. 적용하시겠습니까? (전체 코드로 대체됩니다)`,
                    { modal: true }, "적용", "Diff 보기", "취소"
                );

                if (userChoice === "적용") {
                    try {
                        await vscode.workspace.fs.writeFile(fileUri, Buffer.from(update.newContent, 'utf8'));
                        const successMsg = `✅ 파일이 업데이트되었습니다: ${fileNameForDisplay}`;
                        vscode.window.showInformationMessage(`CodePilot: ${successMsg}`);
                        updateSummaryMessages.push(successMsg);
                    } catch (err: any) {
                        const errorMsg = `❌ 파일 업데이트 실패 (${fileNameForDisplay}): ${err.message}`;
                        vscode.window.showErrorMessage(`CodePilot: ${errorMsg}`);
                        updateSummaryMessages.push(errorMsg);
                    }
                } else if (userChoice === "Diff 보기") {
                    const tempFileName = `codepilot-suggested-${path.basename(update.filePath)}-${Date.now()}${path.extname(update.filePath)}`;
                    const tempFileUri = vscode.Uri.joinPath(context.globalStorageUri, tempFileName);
                    try {
                        await vscode.workspace.fs.writeFile(tempFileUri, Buffer.from(update.newContent, 'utf8'));
                        await vscode.commands.executeCommand('vscode.diff', fileUri, tempFileUri, `Original '${fileNameForDisplay}'  vs.  CodePilot Suggestion`);
                        updateSummaryMessages.push(`ℹ️ '${fileNameForDisplay}' 변경 제안 Diff를 표시했습니다.`);
                    } catch (diffError: any) {
                        vscode.window.showErrorMessage(`Diff 표시 중 오류: ${diffError.message}`);
                        updateSummaryMessages.push(`❌ Diff 표시 실패 (${fileNameForDisplay}): ${diffError.message}`);
                    }
                } else {
                    updateSummaryMessages.push(`ℹ️ 파일 업데이트가 취소되었습니다: ${fileNameForDisplay}`);
                }
            }
        }
    }

    let finalWebviewResponse = llmResponse;
    if (updateSummaryMessages.length > 0) {
        finalWebviewResponse += "\n\n--- 파일 업데이트 결과 ---\n" + updateSummaryMessages.join("\n");
    } else if (updatesToApply.length === 0 && llmResponse.includes("```") && !llmResponse.includes("수정 파일:")) {
        finalWebviewResponse += "\n\n[정보] 코드 블록이 응답에 포함되어 있으나, '수정 파일:' 지시어가 없어 자동 업데이트가 시도되지 않았습니다. 필요시 수동으로 복사하여 사용해주세요.";
    }

    // <-- 수정: LLM 응답에 전송된 파일 목록 추가 (includedFilesForContext 대신 인자로 받은 contextFiles 사용) -->
    if (contextFiles.length > 0) {
        const fileList = contextFiles.map(f => f.name).join(', ');
        finalWebviewResponse += `\n\n--- 컨텍스트에 포함된 파일 ---\n${fileList}`;
    }
    // <-- 수정 끝 -->

    webview.postMessage({ command: 'receiveMessage', sender: 'CodePilot', text: finalWebviewResponse });
    webview.postMessage({ command: 'hideLoading' });
}


function getFileType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case '.ts': case '.tsx': return 'typescript';
        case '.js': case '.jsx': return 'javascript';
        case '.py': return 'python';
        case '.html': return 'html';
        case '.css': return 'css';
        case '.java': return 'java';
        case '.c': return 'c';
        case '.cpp': return 'cpp';
        case '.go': return 'go';
        case '.rs': return 'rust';
        case '.md': return 'markdown';
        case '.json': return 'json';
        case '.xml': return 'xml';
        case '.yaml': case '.yml': return 'yaml';
        case '.sh': return 'shell';
        case '.rb': return 'ruby';
        case '.php': return 'php';
        default: return '';
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

// --- HTML 콘텐츠 로더 및 패널 생성 함수들 ---
function getHtmlContentWithUris(extensionUri: vscode.Uri, htmlFileName: string, webview: vscode.Webview): string {
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

        let mainScriptUri = '';
        let secondaryScriptUri = '';

        if (htmlFileName === 'chat') {
            mainScriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'chat.js')).toString();
            secondaryScriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'codeCopy.js')).toString();
            htmlContent = htmlContent.replace('{{codeCopyScriptUri}}', secondaryScriptUri);
        } else if (htmlFileName === 'settings') {
            mainScriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'settings.js')).toString();
        } else if (htmlFileName === 'license') {
            // license.html에 별도 JS 파일이 있다면 여기서 URI 생성
            // mainScriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'license.js')).toString();
        }
        htmlContent = htmlContent.replace('{{scriptUri}}', mainScriptUri);


    } catch (error: any) {
        console.error(`[HTML Loader] Error for ${htmlFileName}.html:`, error);
        return `<h1>Error loading ${htmlFileName} view</h1><p>${error.message || 'File not found.'}</p>`;
    }
    return htmlContent;
}


function createAndSetupWebviewPanel(
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
                vscode.Uri.joinPath(extensionUri, 'dist')
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

// --- 패널 열기 헬퍼 함수들 (context 인자 추가) ---
function openSettingsPanel(extensionUri: vscode.Uri, context: vscode.ExtensionContext, viewColumn: vscode.ViewColumn) {
    createAndSetupWebviewPanel(extensionUri, context, 'settings', 'CodePilot Settings', 'settings', viewColumn,
        async (data, panel) => {
            const config = vscode.workspace.getConfiguration('codepilot');
            switch (data.command) {
                case 'initSettings':
                    panel.webview.postMessage({
                        command: 'currentSettings',
                        sourcePaths: config.get<string[]>('sourcePaths') || [],
                        autoUpdateEnabled: config.get<boolean>('autoUpdateFiles') || false
                    });
                    break;
                case 'addDirectory':
                    const uris = await vscode.window.showOpenDialog({ canSelectFiles: true, canSelectFolders: true, canSelectMany: true, openLabel: 'Select Sources' });
                    if (uris && uris.length > 0) {
                        const newPaths = uris.map(u => u.fsPath);
                        const current = config.get<string[]>('sourcePaths') || [];
                        await config.update('sourcePaths', Array.from(new Set([...current, ...newPaths])), vscode.ConfigurationTarget.Global);
                        panel.webview.postMessage({ command: 'updatedSourcePaths', sourcePaths: config.get<string[]>('sourcePaths') });
                    }
                    break;
                case 'removeDirectory':
                    const pathToRemove = data.path;
                    if (pathToRemove) {
                        const current = config.get<string[]>('sourcePaths') || [];
                        await config.update('sourcePaths', current.filter(p => p !== pathToRemove), vscode.ConfigurationTarget.Global);
                        panel.webview.postMessage({ command: 'updatedSourcePaths', sourcePaths: config.get<string[]>('sourcePaths') });
                    }
                    break;
                case 'setAutoUpdate':
                    if (typeof data.enabled === 'boolean') {
                        await config.update('autoUpdateFiles', data.enabled, vscode.ConfigurationTarget.Global);
                        panel.webview.postMessage({ command: 'autoUpdateStatusChanged', enabled: data.enabled });
                    }
                    break;
            }
        }
    );
}
function openLicensePanel(extensionUri: vscode.Uri, context: vscode.ExtensionContext, viewColumn: vscode.ViewColumn) {
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
                            vscode.window.showInformationMessage('CodePilot: API Key saved.');
                        } catch (error: any) {
                            panel.webview.postMessage({ command: 'apiKeySaveError', error: error.message });
                        }
                    } else { panel.webview.postMessage({ command: 'apiKeySaveError', error: 'API Key empty.' });}
                    break;
                case 'checkApiKeyStatus': // license.html에서 요청 시
                    const currentKey = await storageService.getApiKey();
                    panel.webview.postMessage({ command: 'apiKeyStatus', hasKey: !!currentKey, apiKeyPreview: currentKey ? `***${currentKey.slice(-4)}` : 'Not Set' });
                    break;
            }
        }
    );
}
function openBlankPanel(extensionUri: vscode.Uri, context: vscode.ExtensionContext, viewColumn: vscode.ViewColumn) {
    createAndSetupWebviewPanel(extensionUri, context, 'customizing', 'CodePilot Customizing', 'blank', viewColumn,
        (data, panel) => { console.log(`[BlankPanel] Message:`, data); }
    );
}