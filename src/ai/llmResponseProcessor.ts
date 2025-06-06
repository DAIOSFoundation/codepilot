import * as vscode from 'vscode';
import * as path from 'path';
import { ConfigurationService } from '../services/configurationService';
import { NotificationService } from '../services/notificationService';

// Define a type for file operations
interface FileOperation {
    type: 'modify' | 'create';
    originalDirective: string; // e.g., "수정 파일", "새 파일"
    llmSpecifiedPath: string;  // The path as specified by LLM (e.g., 'src/components/Button.tsx')
    absolutePath: string;      // The resolved absolute path on disk
    newContent: string;
}

export class LlmResponseProcessor {
    private context: vscode.ExtensionContext;
    private configurationService: ConfigurationService;
    private notificationService: NotificationService;

    constructor(context: vscode.ExtensionContext, configurationService: ConfigurationService, notificationService: NotificationService) {
        this.context = context;
        this.configurationService = configurationService;
        this.notificationService = notificationService;
    }

    /**
     * Retrieves the project root path. It first checks the 'codepilot.projectRoot' setting.
     * If not set, it defaults to the first workspace folder's root.
     * @returns The absolute path of the project root, or undefined if no workspace is open and no setting is configured.
     */
    private async getProjectRootPath(): Promise<string | undefined> {
        const configuredRoot = await this.configurationService.getProjectRoot();
        if (configuredRoot) {
            // ConfigurationService's getProjectRoot should ideally return an absolute path
            // or handle resolution. Assuming it returns an absolute path or undefined.
            console.log(`[LLM Response Processor] Configured project root: ${configuredRoot}`);
            return configuredRoot;
        }
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
            console.log(`[LLM Response Processor] Workspace folder project root: ${workspaceRoot}`);
            return workspaceRoot;
        }
        console.log(`[LLM Response Processor] No project root found.`);
        return undefined;
    }

    /**
     * LLM 응답을 파싱하고, 자동 업데이트 설정에 따라 파일을 업데이트하거나 사용자에게 제안합니다.
     * @param llmResponse LLM의 원본 응답 문자열
     * @param contextFiles 컨텍스트에 포함되었던 파일 목록 ({ name: string, fullPath: string }[])
     * @param webview 웹뷰에 메시지를 보낼 수 있는 Webview 객체
     */
    public async processLlmResponseAndApplyUpdates(
        llmResponse: string,
        contextFiles: { name: string, fullPath: string }[],
        webview: vscode.Webview): Promise<void> 
        {
        const fileOperations: FileOperation[] = [];
        
        // Updated regex to capture the directive (group 1), the path (group 2), and the content (group 3)
        const codeBlockRegex = /(새 파일|수정 파일):\s+(.+?)\r?\n```[^\n]*\r?\n([\s\S]*?)\r?\n```/g;


        let match;
        let updateSummaryMessages: string[] = [];

        console.log("[LLM Response Processor] Starting. LLM Response:", llmResponse);

        const projectRoot = await this.getProjectRootPath();
        console.log(`[LLM Response Processor] Resolved project root for operations: ${projectRoot || 'Not found'}`);
        
        // 새 파일 생성을 위한 프로젝트 루트가 없으면 경고
        if (!projectRoot && llmResponse.includes("새 파일:")) {
            this.notificationService.showErrorMessage("새 파일 생성을 위해 프로젝트 루트 경로를 찾을 수 없습니다. CodePilot 설정에서 'Project Root'를 설정하거나, 워크스페이스를 여십시오.");
            webview.postMessage({ command: 'receiveMessage', sender: 'CodePilot', text: "오류: 새 파일 생성을 위한 프로젝트 루트 경로를 찾을 수 없습니다." });
            // 여기서 return하지 않고, 아래 루프에서 새 파일 생성을 건너뛰도록 처리
        }

        while ((match = codeBlockRegex.exec(llmResponse)) !== null) {
            // Updated to correctly access captured groups
            const originalDirective = match[1].trim(); // "수정 파일" or "새 파일"
            const llmSpecifiedPath = match[2].trim();  // e.g., 'src/components/Button.tsx'
            const newContent = match[3];

            console.log(`[LLM Response Processor] Found directive: "${originalDirective}", LLM path: "${llmSpecifiedPath}"`);

            let absolutePath: string | undefined;
            let operationType: 'modify' | 'create';

            if (originalDirective === '수정 파일') {
                operationType = 'modify';
                // 컨텍스트 파일 목록에서 AI가 제안한 파일명과 일치하는지 찾기
                const matchedFile = contextFiles.find((f: { name: string, fullPath: string }) => f.name === llmSpecifiedPath);
                
                if (matchedFile) {
                    absolutePath = matchedFile.fullPath;
                    console.log(`[LLM Response Processor] Matched 'modify' to existing file: "${absolutePath}"`);
                } else {
                    const warnMsg = `경고: AI가 수정을 제안한 파일 '${llmSpecifiedPath}'을(를) 컨텍스트 목록에서 찾을 수 없습니다. 해당 파일은 업데이트되지 않았습니다.`;
                    console.warn(`[LLM Response Processor] WARN: '수정 파일' specified as "${llmSpecifiedPath}" but not found in context. Context files:`, contextFiles.map((f: { name: string, fullPath: string }) => f.name));
                    webview.postMessage({ command: 'receiveMessage', sender: 'CodePilot', text: warnMsg });
                    updateSummaryMessages.push(`⚠️ ${warnMsg}`);
                    continue; // Skip this operation
                }
            } else if (originalDirective === '새 파일') {
                operationType = 'create';
                if (projectRoot) {
                    absolutePath = path.join(projectRoot, llmSpecifiedPath);
                    console.log(`[LLM Response Processor] Resolved 'create' absolute path: "${absolutePath}" from project root "${projectRoot}"`);
                } else {
                    const warnMsg = `경고: '새 파일' 지시어 '${llmSpecifiedPath}'가 감지되었으나, 프로젝트 루트 경로를 찾을 수 없어 파일 생성을 건너뜀.`;
                    console.warn(`[LLM Response Processor] WARN: ${warnMsg}`);
                    this.notificationService.showWarningMessage(`CodePilot: ${warnMsg}`);
                    webview.postMessage({ command: 'receiveMessage', sender: 'CodePilot', text: warnMsg });
                    updateSummaryMessages.push(`⚠️ ${warnMsg}`);
                    continue; // Skip this operation
                }
            } else {
                console.warn(`[LLM Response Processor] WARN: Unknown directive "${originalDirective}". Skipping.`);
                continue; // Skip unknown directives
            }

            if (absolutePath) {
                fileOperations.push({
                    type: operationType,
                    originalDirective,
                    llmSpecifiedPath,
                    absolutePath,
                    newContent
                });
            }
        }

        if (fileOperations.length > 0) {
            const autoUpdateEnabled = await this.configurationService.isAutoUpdateEnabled();

            for (const operation of fileOperations) {
                console.log(`[LLM Response Processor] Processing operation: Type=${operation.type}, Path=${operation.absolutePath}`);
                const fileUri = vscode.Uri.file(operation.absolutePath);
                const fileNameForDisplay = operation.llmSpecifiedPath; // Use LLM specified path for display

                if (autoUpdateEnabled) {
                    try {
                        // Ensure directory exists for new files
                        if (operation.type === 'create') {
                            const dirPath = path.dirname(operation.absolutePath);
                            console.log(`[LLM Response Processor] Attempting to create directory: ${dirPath}`);
                            await vscode.workspace.fs.createDirectory(vscode.Uri.file(dirPath));
                            console.log(`[LLM Response Processor] Directory created: ${dirPath}`);
                        }
                        console.log(`[LLM Response Processor] Attempting to write file: ${operation.absolutePath}`);
                        await vscode.workspace.fs.writeFile(fileUri, Buffer.from(operation.newContent, 'utf8'));
                        const successMsg = `✅ 파일이 자동으로 ${operation.type === 'create' ? '생성' : '업데이트'}되었습니다: ${fileNameForDisplay}`;
                        this.notificationService.showInfoMessage(`CodePilot: ${successMsg}`);
                        updateSummaryMessages.push(successMsg);
                        console.log(`[LLM Response Processor] Success: ${successMsg}`);
                    } catch (err: any) {
                        const errorMsg = `❌ 파일 자동 ${operation.type === 'create' ? '생성' : '업데이트'} 실패 (${fileNameForDisplay}): ${err.message}`;
                        this.notificationService.showErrorMessage(`CodePilot: ${errorMsg}`);
                        updateSummaryMessages.push(errorMsg);
                        console.error(`[LLM Response Processor] Error: ${errorMsg}`, err);
                    }
                } else {
                    let userChoice: string | undefined;
                    if (operation.type === 'create') {
                        userChoice = await vscode.window.showInformationMessage(
                            `CodePilot: AI가 '${fileNameForDisplay}' 새 파일 생성을 제안했습니다. 적용하시겠습니까?`,
                            { modal: true }, "생성", "취소"
                        );
                    } else { // modify
                        userChoice = await vscode.window.showInformationMessage(
                            `CodePilot: AI가 '${fileNameForDisplay}' 파일 수정을 제안했습니다. 적용하시겠습니까? (전체 코드로 대체됩니다)`,
                            { modal: true }, "적용", "Diff 보기", "취소"
                        );
                    }

                    if (userChoice === "적용" || userChoice === "생성") {
                        try {
                            if (operation.type === 'create') {
                                const dirPath = path.dirname(operation.absolutePath);
                                console.log(`[LLM Response Processor] Attempting to create directory (manual): ${dirPath}`);
                                await vscode.workspace.fs.createDirectory(vscode.Uri.file(dirPath));
                                console.log(`[LLM Response Processor] Directory created (manual): ${dirPath}`);
                            }
                            console.log(`[LLM Response Processor] Attempting to write file (manual): ${operation.absolutePath}`);
                            await vscode.workspace.fs.writeFile(fileUri, Buffer.from(operation.newContent, 'utf8'));
                            const successMsg = `✅ 파일이 ${operation.type === 'create' ? '생성' : '업데이트'}되었습니다: ${fileNameForDisplay}`;
                            this.notificationService.showInfoMessage(`CodePilot: ${successMsg}`);
                            updateSummaryMessages.push(successMsg);
                            console.log(`[LLM Response Processor] Success (manual): ${successMsg}`);
                        } catch (err: any) {
                            const errorMsg = `❌ 파일 ${operation.type === 'create' ? '생성' : '업데이트'} 실패 (${fileNameForDisplay}): ${err.message}`;
                            this.notificationService.showErrorMessage(`CodePilot: ${errorMsg}`);
                            updateSummaryMessages.push(errorMsg);
                            console.error(`[LLM Response Processor] Error (manual): ${errorMsg}`, err);
                        }
                    } else if (userChoice === "Diff 보기" && operation.type === 'modify') { // Only for modify
                        const tempFileName = `codepilot-suggested-${path.basename(operation.absolutePath)}-${Date.now()}${path.extname(operation.absolutePath)}`;
                        const tempFileUri = vscode.Uri.joinPath(this.context.globalStorageUri, tempFileName);
                        try {
                            console.log(`[LLM Response Processor] Attempting to write temp file for Diff: ${tempFileUri.fsPath}`);
                            await vscode.workspace.fs.writeFile(tempFileUri, Buffer.from(operation.newContent, 'utf8'));
                            console.log(`[LLM Response Processor] Showing Diff for: ${fileUri.fsPath} vs ${tempFileUri.fsPath}`);
                            await vscode.commands.executeCommand('vscode.diff', fileUri, tempFileUri, `Original '${fileNameForDisplay}'  vs.  CodePilot Suggestion`);
                            updateSummaryMessages.push(`ℹ️ '${fileNameForDisplay}' 변경 제안 Diff를 표시했습니다.`);
                            console.log(`[LLM Response Processor] Diff shown for: ${fileNameForDisplay}`);
                        } catch (diffError: any) {
                            this.notificationService.showErrorMessage(`Diff 표시 중 오류: ${diffError.message}`);
                            updateSummaryMessages.push(`❌ Diff 표시 실패 (${fileNameForDisplay}): ${diffError.message}`);
                            console.error(`[LLM Response Processor] Diff error: ${diffError.message}`, diffError);
                        }
                    } else {
                        updateSummaryMessages.push(`ℹ️ 파일 ${operation.type === 'create' ? '생성' : '업데이트'}이(가) 취소되었습니다: ${fileNameForDisplay}`);
                        console.log(`[LLM Response Processor] Operation cancelled for: ${fileNameForDisplay}`);
                    }
                }
            }
        }

        let finalWebviewResponse = llmResponse;
        if (updateSummaryMessages.length > 0) {
            finalWebviewResponse += "\n\n--- 파일 업데이트 결과 ---\n" + updateSummaryMessages.join("\n");
        } else if (fileOperations.length === 0 && llmResponse.includes("Copy") && !llmResponse.includes("수정 파일:") && !llmResponse.includes("새 파일:")) 
        { 
            finalWebviewResponse += "\n\n[정보] 코드 블록이 응답에 포함되어 있으나, ‘수정 파일:’ 또는 ‘새 파일:’ 지시어가 없어 자동 업데이트가 시도되지 않았습니다. 필요시 수동으로 복사하여 사용해주세요."; 
            console.log("[LLM Response Processor] No file operations parsed, but code blocks present without directives."); 
        } 
        else if (fileOperations.length === 0 && llmResponse.includes("수정 파일:") && !llmResponse.includes("새 파일:")) 
        { 
                // This case handles when “수정 파일:” was present but no matching context file was found 
                // The warning message is already added to updateSummaryMessages, so no extra info needed here. 
                console.log("[LLM Response Processor] No file operations parsed, possibly due to unmatched '수정 파일:' directives."); 
        } 
        else if (fileOperations.length === 0 && llmResponse.includes("새 파일:") && !llmResponse.includes("수정 파일:")) 
        {
            // This case handles when "새 파일:" was present but project root was not found
            // // The warning message is already added to updateSummaryMessages, so no extra info needed here. 
            console.log("[LLM Response Processor] No file operations parsed, possibly due to missing project root for '새 파일:' directives."); 
        }

        if (contextFiles.length > 0) {
            const fileList = contextFiles.map(f => f.name).join(', ');
            finalWebviewResponse += `\n\n--- 컨텍스트에 포함된 파일 ---\n${fileList}`;
            console.log(`[LLM Response Processor] Context files included: ${fileList}`);
        } else {
            finalWebviewResponse += `\n\n--- 컨텍스트에 포함된 파일 ---\n(없음)`;
            console.log(`[LLM Response Processor] No context files included.`);
        }
    
        webview.postMessage({ command: 'receiveMessage', sender: 'CodePilot', text: finalWebviewResponse });
        console.log("[LLM Response Processor] Finished processing LLM response.");
    }
}