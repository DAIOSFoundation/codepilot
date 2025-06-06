import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import { StorageService } from '../services/storage';
import { GeminiApi } from '../api/gemini';
import { getFileType } from '../utils/fileUtils';
import { RequestOptions } from '@google/generative-ai'; // <-- RequestOptions 타입을 다시 임포트

export class GeminiService {
    private storageService: StorageService;
    private geminiApi: GeminiApi;
    private context: vscode.ExtensionContext;
    // 현재 진행 중인 Gemini 호출을 취소하기 위한 AbortController
    private currentGeminiCallController: AbortController | null = null;

    constructor(storageService: StorageService, geminiApi: GeminiApi, context: vscode.ExtensionContext) {
        this.storageService = storageService;
        this.geminiApi = geminiApi;
        this.context = context;
    }

    /**
     * Gemini API 호출을 취소합니다.
     */
    public cancelCurrentCall(): void {
        console.log('[GeminiService] Attempting to cancel current Gemini call.');
        if (this.currentGeminiCallController) {
            this.currentGeminiCallController.abort();
            console.log('[GeminiService] Gemini call aborted.');
        } else {
            console.log('[GeminiService] No active Gemini call to abort.');
        }
    }

    /**
     * 사용자 메시지를 처리하고 Gemini API를 호출하여 응답을 받아 웹뷰에 표시하며, 필요한 경우 파일을 업데이트합니다.
     */
    public async handleUserMessageAndRespond(userQuery: string, webviewToRespond: vscode.Webview): Promise<void> {
        const apiKey = await this.storageService.getApiKey();
        if (!apiKey) {
            webviewToRespond.postMessage({ command: 'receiveMessage', sender: 'CodePilot', text: "Error: Gemini API Key is not set. Please set it via CodePilot settings." });
            return;
        }
        webviewToRespond.postMessage({ command: 'showLoading' });

        // AbortController 생성 (매 호출마다 새로 생성)
        this.currentGeminiCallController = new AbortController();
        const abortSignal = this.currentGeminiCallController.signal;

        // 취소 이벤트 리스너 추가 (옵션): 취소 시 메시지 출력
        abortSignal.onabort = () => {
            console.log('[GeminiService] Gemini API call was aborted by user.');
        };

        try {
            const sourcePathsSetting = vscode.workspace.getConfiguration('codepilot').get<string[]>('sourcePaths') || [];
            let fileContentsContext = "";
            const MAX_TOTAL_CONTENT_LENGTH = 100000;
            let currentTotalContentLength = 0;
            const includedFilesForContext: { name: string, fullPath: string }[] = [];


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
                        const pattern = path.join(uri.fsPath, '**', '*');
                        const files = glob.sync(pattern, {
                            nodir: true,
                            dot: false,
                            ignore: [
                                path.join(uri.fsPath, '**/node_modules/**'),
                                path.join(uri.fsPath, '**/.git/**', '**/dist/**', '**/out/**')
                            ].map(p => p.replace(/\\/g, '/'))
                        });

                        for (const file of files) {
                            const allowedExtensions = ['.ts', '.js', '.py', '.html', '.css', '.md', '.java', '.c', '.cpp', '.go', '.rs', '.json', '.xml', '.yaml', '.yml', '.sh', '.rb', '.php'];
                            if (!allowedExtensions.includes(path.extname(file).toLowerCase())) {
                                continue;
                            }

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
    여기서 [원본 파일명]은 컨텍스트로 제공된 '경로를 포함한 파일명' 과 정확히 일치해야 합니다. (예: '수정 파일: src/components/Button.tsx')
3.  수정할 파일이 여러 개일 경우, 각 파일에 대해 2번 규칙을 반복하여 명시하고 해당 파일의 전체 코드를 코드 블록으로 출력합니다.
4.  새로운 파일을 생성해야 하는 경우, '새 파일: [새 파일 경로/파일명]' 형식으로 명시하고 전체 코드를 출력합니다. (이 기능은 현재는 업데이트 대상이 아님)
5.  수정하지 않은 파일에 대해서는 언급하거나 코드를 출력할 필요가 없습니다.
6.  출력된 코드에 주석을 표시 하지 않습니다.
7.  수정된 내용을 요약해서 출력합니다.`;

            const fullPrompt = `사용자 요청: ${userQuery}\n\n--- 참조 코드 컨텍스트 ---\n${fileContentsContext.trim() === "" ? "참조 코드가 제공되지 않았습니다." : fileContentsContext}`;

            console.log("[To LLM] System Prompt:", systemPrompt);
            console.log("[To LLM] Full Prompt (first 300 chars):", fullPrompt.substring(0, 300));

            // RequestOptions를 구성 (signal 포함)
            const requestOptions: RequestOptions = {
                signal: abortSignal
            };
            let llmResponse = await this.geminiApi.sendMessageWithSystemPrompt(systemPrompt, fullPrompt, requestOptions);

            await this.processLlmResponseAndAutoUpdate(llmResponse, includedFilesForContext, webviewToRespond);

        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.warn("[GeminiService] Gemini API call was explicitly aborted.");
                webviewToRespond.postMessage({ command: 'receiveMessage', sender: 'CodePilot', text: 'AI 호출이 취소되었습니다.' });
            } else {
                console.error("Error in handleUserMessageAndRespond:", error);
                webviewToRespond.postMessage({ command: 'receiveMessage', sender: 'CodePilot', text: `Error: ${error.message || 'Failed to process request.'}` });
            }
        } finally {
            this.currentGeminiCallController = null;
            webviewToRespond.postMessage({ command: 'hideLoading' });
        }
    }

    /**
     * LLM 응답을 파싱하고, 자동 업데이트 설정을 기반으로 파일을 업데이트합니다.
     */
    private async processLlmResponseAndAutoUpdate(
        llmResponse: string,
        contextFiles: { name: string, fullPath: string }[],
        webview: vscode.Webview
    ): Promise<void> {
        const updatesToApply: { filePath: string; newContent: string; originalName: string }[] = [];
        const codeBlockRegex = /수정 파일:\s*(.+?)\s*```(?:\w*\s*)?\n([\s\S]*?)```/g; // 언어 지시자 (e.g., typescript)를 선택적으로 처리하도록 수정
        let match;

        console.log("[LLM Response Parsing] Starting. LLM Response (first 300 chars):", llmResponse.substring(0, 300));

        while ((match = codeBlockRegex.exec(llmResponse)) !== null) {
            const llmSpecifiedFileName = match[1].trim();
            const newCode = match[2]; // match[2]는 이제 코드 내용 (이전에는 match[3])
            console.log(`[LLM Response Parsing] Found directive. LLM file: "${llmSpecifiedFileName}"`);

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
                        const tempFileUri = vscode.Uri.joinPath(this.context.globalStorageUri, tempFileName);
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

        if (contextFiles.length > 0) {
            const fileList = contextFiles.map(f => f.name).join(', ');
            finalWebviewResponse += `\n\n--- 컨텍스트에 포함된 파일 ---\n${fileList}`;
        }

        webview.postMessage({ command: 'receiveMessage', sender: 'CodePilot', text: finalWebviewResponse });
    }
}