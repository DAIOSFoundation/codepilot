import * as vscode from 'vscode';
import { StorageService } from '../services/storage';
import { CodebaseContextService } from './codebaseContextService';
import { LlmResponseProcessor } from './llmResponseProcessor';
import { NotificationService } from '../services/notificationService';
import { ConfigurationService } from '../services/configurationService';
import { ExternalApiService } from './externalApiService';
import { safePostMessage } from '../webview/panelUtils';
import { GeminiApi } from './gemini';
import { OllamaApi } from './ollamaService';
import { checkTokenLimit, logTokenUsage } from '../utils/tokenUtils';
import { AiModelType, PromptType } from './types';

export class LlmService {
    private storageService: StorageService;
    private geminiApi: GeminiApi;
    private ollamaApi: OllamaApi;
    private codebaseContextService: CodebaseContextService;
    private llmResponseProcessor: LlmResponseProcessor;
    private notificationService: NotificationService;
    private configurationService: ConfigurationService;
    private externalApiService: ExternalApiService;
    private currentCallController: AbortController | null = null;
    private currentModelType: AiModelType = AiModelType.GEMINI; // 기본값

    constructor(
        storageService: StorageService,
        geminiApi: GeminiApi,
        ollamaApi: OllamaApi,
        codebaseContextService: CodebaseContextService,
        llmResponseProcessor: LlmResponseProcessor,
        notificationService: NotificationService,
        configurationService: ConfigurationService,
        private readonly extensionContext?: vscode.ExtensionContext
    ) {
        this.storageService = storageService;
        this.geminiApi = geminiApi;
        this.ollamaApi = ollamaApi;
        this.codebaseContextService = codebaseContextService;
        this.llmResponseProcessor = llmResponseProcessor;
        this.notificationService = notificationService;
        this.configurationService = configurationService;
        this.externalApiService = new ExternalApiService(configurationService);
    }

    public setCurrentModel(modelType: AiModelType): void {
        this.currentModelType = modelType;
        console.log(`[LlmService] Current model set to: ${modelType}`);
    }

    public getCurrentModel(): AiModelType {
        return this.currentModelType;
    }

    public cancelCurrentCall(): void {
        console.log(`[ CodePilot ] Attempting to cancel current ${this.currentModelType} call.`);
        if (this.currentCallController) {
            this.currentCallController.abort();
            this.currentCallController = null;
        }
    }

    public async handleUserMessageAndRespond(
        userQuery: string,
        webviewToRespond: vscode.Webview,
        promptType: PromptType,
        imageData?: string,
        imageMimeType?: string,
        selectedFiles?: string[]
    ): Promise<void> {
        this.currentCallController = new AbortController();
        const abortSignal = this.currentCallController.signal;

        try {
            safePostMessage(webviewToRespond, { command: 'showLoading' });

            // 실시간 정보 요청 처리
            const realTimeInfo = await this.processRealTimeInfoRequest(userQuery);
            
            // 코드베이스 컨텍스트 수집 (GENERAL_ASK 타입일 때는 건너뜀)
            let fileContentsContext = '';
            let includedFilesForContext: { name: string, fullPath: string }[] = [];
            
            if (promptType === PromptType.CODE_GENERATION) {
                const contextResult = await this.codebaseContextService.getProjectCodebaseContext(abortSignal);
                fileContentsContext = contextResult.fileContentsContext;
                includedFilesForContext = contextResult.includedFilesForContext;
            }

            // 선택된 파일들의 내용을 읽어서 컨텍스트에 추가
            let selectedFilesContext = "";
            if (selectedFiles && selectedFiles.length > 0) {
                for (const filePath of selectedFiles) {
                    try {
                        const fileUri = vscode.Uri.file(filePath);
                        const contentBytes = await vscode.workspace.fs.readFile(fileUri);
                        const content = Buffer.from(contentBytes).toString('utf8');
                        const fileName = filePath.split(/[/\\]/).pop() || 'Unknown';
                        
                        // 선택된 파일을 includedFilesForContext 배열에 추가
                        includedFilesForContext.push({ 
                            name: fileName, 
                            fullPath: filePath 
                        });
                        
                        selectedFilesContext += `파일명: ${fileName}\n경로: ${filePath}\n코드:\n\`\`\`\n${content}\n\`\`\`\n\n`;
                    } catch (error) {
                        console.error(`Error reading selected file ${filePath}:`, error);
                        selectedFilesContext += `파일명: ${filePath.split(/[/\\]/).pop() || 'Unknown'}\n경로: ${filePath}\n오류: 파일을 읽을 수 없습니다.\n\n`;
                    }
                }
            }

            // 선택된 파일 컨텍스트를 기존 컨텍스트에 추가
            const fullFileContentsContext = selectedFilesContext 
                ? `${fileContentsContext}\n--- 사용자가 선택한 추가 파일들 ---\n${selectedFilesContext}`
                : fileContentsContext;



            // 시스템 프롬프트 생성
            const systemPrompt = this.generateSystemPrompt(promptType, fullFileContentsContext, realTimeInfo);

            // 사용자 메시지 파트 구성
            const userParts: any[] = [{ text: userQuery }];

            // 이미지가 있는 경우 추가
            if (imageData && imageMimeType) {
                if (this.currentModelType === AiModelType.GEMINI) {
                    // Gemini는 이미지 지원
                    userParts.push({ 
                        inlineData: { 
                            data: imageData, 
                            mimeType: imageMimeType 
                        } 
                    });
                } else {
                    // Ollama는 이미지 지원이 제한적이므로 텍스트로 처리
                    userParts.push({ text: `[이미지 첨부됨: ${imageMimeType}]` });
                }
            }



            // 토큰 제한 확인
            const tokenCheck = checkTokenLimit(systemPrompt, userParts, this.currentModelType);
            logTokenUsage(systemPrompt, userParts, this.currentModelType);
            
            if (tokenCheck.isExceeded) {
                const errorMessage = tokenCheck.message;
                console.error(`[LlmService] ${errorMessage}`);
                this.notificationService.showErrorMessage(`CodePilot: ${errorMessage}`);
                safePostMessage(webviewToRespond, { 
                    command: 'receiveMessage', 
                    sender: 'CodePilot', 
                    text: errorMessage 
                });
                return;
            }

            let llmResponse: string;

            if (this.currentModelType === AiModelType.GEMINI) {
                const requestOptions = { signal: abortSignal };
                llmResponse = await this.geminiApi.sendMessageWithSystemPrompt(
                    systemPrompt, 
                    userParts, 
                    requestOptions
                );
            } else {
                // Ollama API에 직접 호출 (selectedFiles는 이미 시스템 프롬프트에 포함됨)
                const requestOptions = { signal: abortSignal };
                llmResponse = await this.ollamaApi.sendMessageWithSystemPrompt(
                    systemPrompt, 
                    userParts, 
                    requestOptions
                );
            }

            // 컨텍스트 파일 목록에 선택된 파일들도 포함
            const allContextFiles = [...includedFilesForContext];
            if (selectedFiles && selectedFiles.length > 0) {
                for (const filePath of selectedFiles) {
                    const fileName = filePath.split(/[/\\]/).pop() || 'Unknown';
                    allContextFiles.push({ name: fileName, fullPath: filePath });
                }
            }

            // GENERAL_ASK 타입일 때는 파일 업데이트를 위한 컨텍스트 파일을 넘기지 않음
            await this.llmResponseProcessor.processLlmResponseAndApplyUpdates(
                llmResponse,
                promptType === PromptType.CODE_GENERATION ? allContextFiles : [],
                webviewToRespond,
                promptType
            );

        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.warn(`[CodePilot] ${this.currentModelType.toUpperCase()} API call was explicitly aborted.`);
                safePostMessage(webviewToRespond, { command: 'receiveMessage', sender: 'CodePilot', text: 'AI 호출이 취소되었습니다.' });
            } else {
                console.error(`Error in handleUserMessageAndRespond (${this.currentModelType}):`, error);
                this.notificationService.showErrorMessage(`Error: Failed to process request. ${error.message}`);
                safePostMessage(webviewToRespond, { command: 'receiveMessage', sender: 'CodePilot', text: `Failed to process request. ${error.message}` });
            }
        } finally {
            this.currentCallController = null;
            safePostMessage(webviewToRespond, { command: 'hideLoading' });
        }
    }

    /**
     * 실시간 정보 요청을 처리합니다
     */
    private async processRealTimeInfoRequest(userQuery: string): Promise<string> {
        try {
            // ExternalApiService를 통해 실시간 정보 요청 처리
            // 기본적으로 서울 날씨 정보만 포함
            return await this.externalApiService.getRealTimeSummary('서울');
        } catch (error) {
            console.warn('Failed to process real-time info request:', error);
            return '';
        }
    }

    /**
     * 시스템 프롬프트를 생성합니다
     */
    private generateSystemPrompt(promptType: PromptType, codebaseContext: string, realTimeInfo: string): string {
        let systemPrompt = '';

        if (promptType === PromptType.CODE_GENERATION) {
            systemPrompt = `당신은 전문적인 소프트웨어 개발자입니다. 사용자의 요청에 따라 코드를 생성하고 수정하는 작업을 수행합니다.

주요 지침:
1. 코드 생성 시 항상 완전하고 실행 가능한 코드를 제공하세요.
2. 코드 수정 시 기존 코드의 구조와 스타일을 유지하세요.
3. 파일 경로를 포함한 구체적인 수정 사항을 명시하세요.
4. 한글로 설명을 제공하세요.
5. 새 파일을 생성할 때는 반드시 "새 파일: [파일경로]" 형식으로 시작하고, 그 다음에 코드 블록을 포함하세요.
6. 기존 파일을 수정할 때는 반드시 "수정 파일: [파일경로]" 형식으로 시작하고, 그 다음에 수정된 코드 블록을 포함하세요.
7. 파일을 삭제할 때는 "삭제 파일: [파일경로]" 형식으로 명시하세요.
8. 마크다운 파일(.md)을 생성할 때는 코드 블록 없이 마크다운 내용을 직접 포함하세요.
9. 터미널 명령어가 필요한 경우 "bash" 코드 블록으로 제공하세요. 이 명령어들은 자동으로 실행됩니다.

파일 생성/수정 형식 예시:

코드 파일의 경우:
새 파일: src/components/Button.jsx
\`\`\`javascript
import React from 'react';

function Button({ children, onClick }) {
  return (
    <button onClick={onClick}>
      {children}
    </button>
  );
}

export default Button;
\`\`\`

마크다운 파일의 경우:
새 파일: docs/README.md

# 프로젝트 문서

이 프로젝트는 React 기반의 웹 애플리케이션입니다.

## 기능

- 사용자 인증
- 데이터 관리
- 실시간 업데이트

## 설치 방법

\`\`\`bash
npm install
npm start
\`\`\`

터미널 명령어의 경우:
\`\`\`bash
npm install
npm run build
npm start
\`\`\`

코드베이스 컨텍스트:
${codebaseContext}

실시간 정보:
${realTimeInfo}

사용자의 요청에 따라 적절한 코드를 생성하거나 수정해주세요.`;
        } else {
            systemPrompt = `당신은 전문적인 소프트웨어 개발자이자 기술 전문가입니다. 사용자의 질문에 대해 정확하고 유용한 답변을 제공합니다.

주요 지침:
1. 기술적 질문에 대해 명확하고 이해하기 쉬운 답변을 제공하세요.
2. 코드 예제가 필요한 경우 완전하고 실행 가능한 코드를 제공하세요.
3. 한글로 답변하되, 필요한 경우 영어 용어나 코드는 그대로 사용하세요.
4. 실시간 정보가 있는 경우 이를 활용하여 답변하세요.
5. 파일 생성, 수정, 삭제 또는 터미널 명령어 실행은 하지 마세요. 이는 단순 질의 응답 모드입니다.
6. 첨부된 파일이 있는 경우 해당 파일의 내용을 분석하여 답변하세요.

코드베이스 컨텍스트:
${codebaseContext}

실시간 정보:
${realTimeInfo}

사용자의 질문에 대해 전문적이고 유용한 답변을 제공해주세요.`;
        }

        return systemPrompt;
    }
}
