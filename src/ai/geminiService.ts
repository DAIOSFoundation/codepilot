import * as vscode from 'vscode';
import { StorageService } from '../services/storage';
import { GeminiApi } from './gemini';
import { CodebaseContextService } from './codebaseContextService'; // 새로 추가
import { LlmResponseProcessor } from './llmResponseProcessor';     // 새로 추가
import { NotificationService } from '../services/notificationService'; // 새로 추가
import { RequestOptions } from '@google/generative-ai';

export class GeminiService {
    private storageService: StorageService;
    private geminiApi: GeminiApi;
    private codebaseContextService: CodebaseContextService; // 추가
    private llmResponseProcessor: LlmResponseProcessor;     // 추가
    private notificationService: NotificationService;       // 추가
    private currentGeminiCallController: AbortController | null = null;

    constructor(
        storageService: StorageService,
        geminiApi: GeminiApi,
        codebaseContextService: CodebaseContextService,
        llmResponseProcessor: LlmResponseProcessor,
        notificationService: NotificationService
    ) {
        this.storageService = storageService;
        this.geminiApi = geminiApi;
        this.codebaseContextService = codebaseContextService;
        this.llmResponseProcessor = llmResponseProcessor;
        this.notificationService = notificationService;
    }

    public cancelCurrentCall(): void {
        console.log('[GeminiService] Attempting to cancel current Gemini call.');
        if (this.currentGeminiCallController) {
            this.currentGeminiCallController.abort();
            console.log('[GeminiService] Gemini call aborted.');
        } else {
            console.log('[GeminiService] No active Gemini call to abort.');
        }
    }

    public async handleUserMessageAndRespond(userQuery: string, webviewToRespond: vscode.Webview): Promise<void> {
        const apiKey = await this.storageService.getApiKey();
        if (!apiKey) {
            webviewToRespond.postMessage({ command: 'receiveMessage', sender: 'CodePilot', text: "Error: Gemini API Key is not set. Please set it via CodePilot settings." });
            return;
        }
        webviewToRespond.postMessage({ command: 'showLoading' });

        this.currentGeminiCallController = new AbortController();
        const abortSignal = this.currentGeminiCallController.signal;
        abortSignal.onabort = () => {
            console.log('[GeminiService] Gemini API call was aborted by user.');
        };

        try {
            // 1. 코드 컨텍스트 수집 (CodebaseContextService에 위임)
            const { fileContentsContext, includedFilesForContext } =
                await this.codebaseContextService.getProjectCodebaseContext(abortSignal);

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
            console.log("[To LLM] Full Prompt:", fullPrompt);

            // 2. Gemini API 호출
            const requestOptions: RequestOptions = { signal: abortSignal };
            let llmResponse = await this.geminiApi.sendMessageWithSystemPrompt(systemPrompt, fullPrompt, requestOptions);

            // 3. LLM 응답 처리 및 파일 업데이트 (LlmResponseProcessor에 위임)
            await this.llmResponseProcessor.processLlmResponseAndApplyUpdates(
                llmResponse,
                includedFilesForContext,
                webviewToRespond
            );

        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.warn("[GeminiService] Gemini API call was explicitly aborted.");
                webviewToRespond.postMessage({ command: 'receiveMessage', sender: 'CodePilot', text: 'AI 호출이 취소되었습니다.' });
            } else {
                console.error("Error in handleUserMessageAndRespond:", error);
                this.notificationService.showErrorMessage(`Error: ${error.message || 'Failed to process request.'}`);
                webviewToRespond.postMessage({ command: 'receiveMessage', sender: 'CodePilot', text: `Error: ${error.message || 'Failed to process request.'}` });
            }
        } finally {
            this.currentGeminiCallController = null;
            webviewToRespond.postMessage({ command: 'hideLoading' });
        }
    }
}