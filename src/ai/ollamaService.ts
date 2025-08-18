import * as vscode from 'vscode';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import { StorageService } from '../services/storage';
import { CodebaseContextService } from './codebaseContextService';
import { LlmResponseProcessor } from './llmResponseProcessor';
import { NotificationService } from '../services/notificationService';
import { ConfigurationService } from '../services/configurationService';
import { ExternalApiService } from './externalApiService';

export enum PromptType {
    CODE_GENERATION = 'CODE_GENERATION',
    GENERAL_ASK = 'GENERAL_ASK'
}

export class OllamaApi {
    private apiUrl: string;
    private endpoint: string = '/api/generate';
    private modelName: string = 'gemma3:27b';

    constructor(apiUrl?: string, endpoint?: string) {
        this.apiUrl = apiUrl || 'http://localhost:11434';
        this.endpoint = endpoint || '/api/generate';
    }

    public setApiUrl(apiUrl: string): void {
        this.apiUrl = apiUrl;
    }

    public setEndpoint(endpoint: string): void {
        this.endpoint = endpoint;
    }

    public isInitialized(): boolean {
        return !!this.apiUrl;
    }

    private makeHttpRequest(url: URL, postData: string, signal?: AbortSignal): Promise<string> {
        return new Promise((resolve, reject) => {
            const isHttps = url.protocol === 'https:';
            const client = isHttps ? https : http;
            
            const options: any = {
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname + url.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            // HTTPS인 경우 SSL 인증서 검증을 건너뛰는 옵션 추가
            if (isHttps) {
                options.rejectUnauthorized = false;
            }

            const req = client.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(data);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            if (signal) {
                signal.addEventListener('abort', () => {
                    req.destroy();
                    reject(new Error('Request aborted'));
                });
            }

            req.write(postData);
            req.end();
        });
    }

    async sendMessage(message: string, options?: { signal?: AbortSignal }): Promise<string> {
        if (!this.isInitialized()) {
            throw new Error("Ollama API is not initialized. Please set your Ollama API URL in the CodePilot settings.");
        }

        try {
            const url = new URL(`${this.apiUrl}${this.endpoint}`);
            
            // 엔드포인트에 따라 다른 요청 형식 사용
            if (this.endpoint === '/api/chat') {
                const postData = JSON.stringify({
                    model: this.modelName,
                    messages: [
                        { role: 'user', content: message }
                    ],
                    stream: false,
                    options: {
                        temperature: 0.7,
                        top_k: 1,
                        top_p: 1,
                        num_predict: 500000,
                    }
                });

                const response = await this.makeHttpRequest(url, postData, options?.signal);
                const data = JSON.parse(response) as { message: { content: string } };
                console.log('Ollama Response (chat endpoint):', data.message.content);
                return data.message.content;
            } else {
                // /api/generate 엔드포인트 사용
                const postData = JSON.stringify({
                    model: this.modelName,
                    prompt: message,
                    stream: false,
                    options: {
                        temperature: 0.7,
                        top_k: 1,
                        top_p: 1,
                        num_predict: 500000,
                    }
                });

                const response = await this.makeHttpRequest(url, postData, options?.signal);
                const data = JSON.parse(response) as { response: string };
                console.log('Ollama Response (generate endpoint):', data.response);
                return data.response;
            }
        } catch (error: any) {
            console.error('Error calling Ollama API:', error);
            if (error.name === 'AbortError') {
                throw error;
            }
            throw new Error(`Ollama API call failed: ${error.message}`);
        }
    }

    async sendMessageWithSystemPrompt(systemPrompt: string, userParts: any[], options?: { signal?: AbortSignal }): Promise<string> {
        if (!this.isInitialized()) {
            throw new Error("Ollama API is not initialized. Please set your Ollama API URL in the CodePilot settings.");
        }

        try {
            const url = new URL(`${this.apiUrl}${this.endpoint}`);
            const fullPrompt = `${systemPrompt}\n\n${userParts.map(part => part.text).join('\n')}`;
            
            // 엔드포인트에 따라 다른 요청 형식 사용
            if (this.endpoint === '/api/chat') {
                const postData = JSON.stringify({
                    model: this.modelName,
                    messages: [
                        { role: 'user', content: fullPrompt }
                    ],
                    stream: false,
                    options: {
                        temperature: 0.7,
                        top_k: 1,
                        top_p: 1,
                        num_predict: 500000,
                    }
                });

                const response = await this.makeHttpRequest(url, postData, options?.signal);
                const data = JSON.parse(response) as { message: { content: string } };
                console.log('Ollama Response (chat endpoint, with system prompt):', data.message.content);
                return data.message.content;
            } else {
                // /api/generate 엔드포인트 사용
                const postData = JSON.stringify({
                    model: this.modelName,
                    prompt: fullPrompt,
                    stream: false,
                    options: {
                        temperature: 0.7,
                        top_k: 1,
                        top_p: 1,
                        num_predict: 500000,
                    }
                });

                const response = await this.makeHttpRequest(url, postData, options?.signal);
                const data = JSON.parse(response) as { response: string };
                console.log('Ollama Response (generate endpoint, with system prompt):', data.response);
                return data.response;
            }
        } catch (error: any) {
            console.error('Error calling Ollama API (with system prompt):', error);
            if (error.name === 'AbortError') {
                throw error;
            }
            throw new Error(`Ollama API call failed: ${error.message}`);
        }
    }
}

export class OllamaService {
    private storageService: StorageService;
    private ollamaApi: OllamaApi;
    private codebaseContextService: CodebaseContextService;
    private llmResponseProcessor: LlmResponseProcessor;
    private notificationService: NotificationService;
    private configurationService: ConfigurationService;
    private externalApiService: ExternalApiService;
    private currentOllamaCallController: AbortController | null = null;

    constructor(
        storageService: StorageService,
        ollamaApi: OllamaApi,
        codebaseContextService: CodebaseContextService,
        llmResponseProcessor: LlmResponseProcessor,
        notificationService: NotificationService,
        configurationService: ConfigurationService,
        private readonly extensionContext?: vscode.ExtensionContext
    ) {
        this.storageService = storageService;
        this.ollamaApi = ollamaApi;
        this.codebaseContextService = codebaseContextService;
        this.llmResponseProcessor = llmResponseProcessor;
        this.notificationService = notificationService;
        this.configurationService = configurationService;
        this.externalApiService = new ExternalApiService(configurationService);
    }

    public cancelCurrentCall(): void {
        console.log('[ CodePilot ] Attempting to cancel current Ollama call.');
        if (this.currentOllamaCallController) {
            this.currentOllamaCallController.abort();
            this.currentOllamaCallController = null;
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
        this.currentOllamaCallController = new AbortController();
        const abortSignal = this.currentOllamaCallController.signal;

        try {
            webviewToRespond.postMessage({ command: 'showLoading' });

            // 실시간 정보 요청 처리
            const realTimeInfo = await this.processRealTimeInfoRequest(userQuery);
            
            // 코드베이스 컨텍스트 수집
            const { fileContentsContext, includedFilesForContext } = await this.codebaseContextService.getProjectCodebaseContext(
                abortSignal
            );

            // 시스템 프롬프트 생성
            const systemPrompt = this.generateSystemPrompt(promptType, fileContentsContext, realTimeInfo);

            // 사용자 메시지 파트 구성
            const userParts = [{ text: userQuery }];

            // 이미지가 있는 경우 추가
            if (imageData && imageMimeType) {
                // Ollama는 이미지 지원이 제한적이므로 텍스트로 처리
                userParts.push({ text: `[이미지 첨부됨: ${imageMimeType}]` });
            }

            console.log("[To Ollama] System Prompt:", systemPrompt);
            console.log("[To Ollama] Full Parts:", userParts);

            const requestOptions = { signal: abortSignal };
            let llmResponse = await this.ollamaApi.sendMessageWithSystemPrompt(
                systemPrompt, 
                userParts, 
                requestOptions
            );

            // GENERAL_ASK 타입일 때는 파일 업데이트를 위한 컨텍스트 파일을 넘기지 않음
            await this.llmResponseProcessor.processLlmResponseAndApplyUpdates(
                llmResponse,
                promptType === PromptType.CODE_GENERATION ? includedFilesForContext : [],
                webviewToRespond,
                promptType
            );

        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.warn("[CodePilot] Ollama API call was explicitly aborted.");
                webviewToRespond.postMessage({ command: 'receiveMessage', sender: 'CodePilot', text: 'AI 호출이 취소되었습니다.' });
            } else {
                console.error("Error in handleUserMessageAndRespond:", error);
                this.notificationService.showErrorMessage(`Error: Failed to process request. ${error.message}`);
                webviewToRespond.postMessage({ command: 'receiveMessage', sender: 'CodePilot', text: `Failed to process request. ${error.message}` });
            }
        } finally {
            this.currentOllamaCallController = null;
            webviewToRespond.postMessage({ command: 'hideLoading' });
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

실시간 정보:
${realTimeInfo}

사용자의 질문에 대해 전문적이고 유용한 답변을 제공해주세요.`;
        }

        return systemPrompt;
    }
}
