import * as vscode from 'vscode';
import * as path from 'path';
import { ConfigurationService } from '../services/configurationService';
import { NotificationService } from '../services/notificationService';

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
     * LLM 응답을 파싱하고, 자동 업데이트 설정에 따라 파일을 업데이트하거나 사용자에게 제안합니다.
     * @param llmResponse LLM의 원본 응답 문자열
     * @param contextFiles 컨텍스트에 포함되었던 파일 목록 ({ name: string, fullPath: string }[])
     * @param webview 웹뷰에 메시지를 보낼 수 있는 Webview 객체
     */
    public async processLlmResponseAndApplyUpdates(
        llmResponse: string,
        contextFiles: { name: string, fullPath: string }[],
        webview: vscode.Webview
    ): Promise<void> {
        const updatesToApply: { filePath: string; newContent: string; originalName: string }[] = [];
        const codeBlockRegex = /수정 파일:\s*(.+?)\s*```(?:\w*\s*)?\n([\s\S]*?)```/g;
        let match;

        console.log("[LLM Response Parsing] Starting. LLM Response (first 300 chars):", llmResponse.substring(0, 300));

        while ((match = codeBlockRegex.exec(llmResponse)) !== null) {
            const llmSpecifiedFileName = match[1].trim();
            const newCode = match[2];
            console.log(`[LLM Response Parsing] Found directive. LLM file: "${llmSpecifiedFileName}"`);

            // 컨텍스트 파일 목록에서 AI가 제안한 파일명과 일치하는지 찾기
            const matchedFile = contextFiles.find((f: { name: string, fullPath: string }) => f.name === llmSpecifiedFileName);

            if (matchedFile) {
                console.log(`[LLM Response Parsing] Matched to local file: "${matchedFile.fullPath}"`);
                updatesToApply.push({ filePath: matchedFile.fullPath, newContent: newCode, originalName: llmSpecifiedFileName });
            } else {
                const warnMsg = `경고: AI가 수정을 제안한 파일 '${llmSpecifiedFileName}'을(를) 컨텍스트 목록에서 찾을 수 없습니다. 해당 파일은 업데이트되지 않았습니다.`;
                console.warn(`[LLM Response Parsing] No match for: "${llmSpecifiedFileName}". Context:`, contextFiles.map((f: { name: string, fullPath: string }) => f.name));
                webview.postMessage({ command: 'receiveMessage', sender: 'CodePilot', text: warnMsg });
            }
        }

        let updateSummaryMessages: string[] = [];

        if (updatesToApply.length > 0) {
            const autoUpdateEnabled = this.configurationService.isAutoUpdateEnabled(); // ConfigurationService 사용

            for (const update of updatesToApply) {
                const fileNameForDisplay = update.originalName;
                const fileUri = vscode.Uri.file(update.filePath);

                if (autoUpdateEnabled) {
                    try {
                        await vscode.workspace.fs.writeFile(fileUri, Buffer.from(update.newContent, 'utf8'));
                        const successMsg = `✅ 파일이 자동으로 업데이트되었습니다: ${fileNameForDisplay}`;
                        this.notificationService.showInfoMessage(`CodePilot: ${successMsg}`); // NotificationService 사용
                        updateSummaryMessages.push(successMsg);
                    } catch (err: any) {
                        const errorMsg = `❌ 파일 자동 업데이트 실패 (${fileNameForDisplay}): ${err.message}`;
                        this.notificationService.showErrorMessage(`CodePilot: ${errorMsg}`); // NotificationService 사용
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
                            this.notificationService.showInfoMessage(`CodePilot: ${successMsg}`);
                            updateSummaryMessages.push(successMsg);
                        } catch (err: any) {
                            const errorMsg = `❌ 파일 업데이트 실패 (${fileNameForDisplay}): ${err.message}`;
                            this.notificationService.showErrorMessage(`CodePilot: ${errorMsg}`);
                            updateSummaryMessages.push(errorMsg);
                        }
                    } else if (userChoice === "Diff 보기") {
                        const tempFileName = `codepilot-suggested-${path.basename(update.filePath)}-${Date.now()}${path.extname(update.filePath)}`;
                        const tempFileUri = vscode.Uri.joinPath(this.context.globalStorageUri, tempFileName);
                        try {
                            await vscode.workspace.fs.writeFile(tempFileUri, Buffer.from(update.newContent, 'utf8'));
                            await vscode.commands.executeCommand('vscode.diff', fileUri, tempFileUri, `Original '${fileNameForDisplay}'  vs.  CodePilot Suggestion`);
                            updateSummaryMessages.push(`ℹ️ '${fileNameForDisplay}' 변경 제안 Diff를 표시했습니다.`);
                        } catch (diffError: any) {
                            this.notificationService.showErrorMessage(`Diff 표시 중 오류: ${diffError.message}`);
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

        if (contextFiles.length > 0) {
            const fileList = contextFiles.map(f => f.name).join(', ');
            finalWebviewResponse += `\n\n--- 컨텍스트에 포함된 파일 ---\n${fileList}`;
        }

        webview.postMessage({ command: 'receiveMessage', sender: 'CodePilot', text: finalWebviewResponse });
    }
}