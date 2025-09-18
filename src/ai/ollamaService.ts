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
import { PromptType } from './types';

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

    public setModel(modelName: string): void {
        this.modelName = modelName;
    }

    public getModel(): string {
        return this.modelName;
    }

    private parseOllamaResponse(responseText: string): string {
        try {
            const data = JSON.parse(responseText);
            if (data && typeof data.response === 'string') {
                return data.response;
            } else {
                console.warn('Ollama response did not contain a valid \'response\' field:', data);
                return responseText; // 'response' 필드가 없으면 원본 텍스트 반환
            }
        } catch (error) {
            console.error('Failed to parse Ollama JSON response:', error);
            return responseText; // JSON 파싱 실패 시 원본 텍스트 반환
        }
    }

    /**
     * 모델에 따른 토큰 제한을 반환합니다.
     */
    private getTokenLimit(): number {
        if (this.modelName.includes('deepseek-r1:70b')) {
            return 200000; // DeepSeek R1:70B는 더 많은 토큰 지원
        } else if (this.modelName.includes('gemma3:27b')) {
            return 128000; // Gemma3:27b의 토큰 제한
        } else if (this.modelName.includes('codellama')) {
            return 8192; // CodeLlama 7B 보수적 기본값
        } else {
            return 128000; // 기본값
        }
    }

    public isInitialized(): boolean {
        return !!this.apiUrl;
    }

    private makeHttpRequest(url: URL, method: string, postData?: string, signal?: AbortSignal): Promise<string> {
        return new Promise((resolve, reject) => {
            const options = {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                signal: signal
            };

            const req = http.request(url.toString(), options, (res) => {
                let responseBody = '';
                res.on('data', (chunk) => {
                    responseBody += chunk;
                });
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(responseBody);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${responseBody || res.statusMessage}`));
                    }
                });
            });

            req.on('error', (e) => {
                reject(e);
            });

            if (postData && method === 'POST') {
                req.write(postData);
            }
            req.end();
        });
    }

    async sendMessage(message: string, options?: { signal?: AbortSignal }): Promise<string> {
        if (!this.apiUrl) {
            throw new Error("Ollama API URL is not set.");
        }

        const postData = JSON.stringify({
            model: this.modelName,
            prompt: message,
            stream: false,
            options: {
                temperature: 0.7
            }
        });

        const responseText = await this.makeHttpRequest(new URL(`${this.apiUrl}${this.endpoint}`), 'POST', postData, options?.signal);
        return this.parseOllamaResponse(responseText);
    }

    async sendMessageWithSystemPrompt(systemPrompt: string, userParts: any[], options?: { signal?: AbortSignal }): Promise<string> {
        if (!this.apiUrl) {
            throw new Error("Ollama API URL is not set.");
        }

        // 시스템 프롬프트와 사용자 파트를 결합하여 단일 프롬프트로 구성
        const fullPrompt = systemPrompt + '\n' + userParts.map((part: any) => part.text || '').join('\n');

        const postData = JSON.stringify({
            model: this.modelName,
            prompt: fullPrompt,
            stream: false,
            options: {
                temperature: 0.7
            }
        });

        const responseText = await this.makeHttpRequest(new URL(`${this.apiUrl}${this.endpoint}`), 'POST', postData, options?.signal);
        return this.parseOllamaResponse(responseText);
    }

    /**
     * 현재 Ollama 서버에 다운로드된 모델 목록을 가져옵니다.
     * @param signal AbortSignal
     * @returns 모델 이름 문자열 배열 (예: ['llama2:latest', 'codellama:7b'])
     */
    public async getAvailableModels(signal?: AbortSignal): Promise<string[]> {
        if (!this.apiUrl) {
            console.warn('Ollama API URL is not set. Cannot fetch available models.');
            return [];
        }

        try {
            const url = new URL(`${this.apiUrl}/api/tags`);
            console.log(`Fetching Ollama models from: ${url.toString()}`);

            const responseText = await this.makeHttpRequest(url, 'GET', undefined, signal);
            const data = JSON.parse(responseText);

            if (data && Array.isArray(data.models)) {
                // 'name' 또는 'model' 필드를 사용하여 모델 이름 추출 (Python 예제 참고)
                return data.models.map((model: any) => (model.name || model.model) as string);
            }
            return [];
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                console.warn('Fetching Ollama models aborted.');
                return [];
            }
            console.error('Error fetching Ollama models:', error);
            throw new Error(`Failed to fetch Ollama models: ${error instanceof Error ? error.message : String(error)}`);
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
            // 현재 저장된 Ollama 모델을 로드하여 설정
            const currentModel = await this.storageService.getOllamaModel();
            this.ollamaApi.setModel(currentModel);
            console.log(`[OllamaService] Using model: ${currentModel}`);

            webviewToRespond.postMessage({ command: 'showLoading' });

            // 실시간 정보 요청 처리
            const realTimeInfo = await this.processRealTimeInfoRequest(userQuery);

            // 코드베이스 컨텍스트 수집
            const { fileContentsContext, includedFilesForContext } = await this.codebaseContextService.getProjectCodebaseContext(
                abortSignal
            );

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

        // DeepSeek 모델에 대한 특별한 언어 지시사항 추가
        const isDeepSeek = this.ollamaApi.getModel().includes('deepseek-r1:70b');
        const languageInstruction = isDeepSeek ?
            '\n\n⚠️ 중요: 반드시 한국어로만 답변하세요. 중국어, 영어, 일본어 등 다른 언어는 사용하지 마세요. 모든 설명과 응답은 한국어로 작성해주세요.' : '';

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

사용자의 요청에 따라 적절한 코드를 생성하거나 수정해주세요.${languageInstruction}`;
        } else {
            systemPrompt = `당신은 전문적인 소프트웨어 개발자이자 기술 전문가입니다. 사용자의 질문에 대해 정확하고 유용한 답변을 제공합니다.

주요 지침:
1. 기술적 질문에 대해 명확하고 이해하기 쉬운 답변을 제공하세요.
2. 코드 예제가 필요한 경우 완전하고 실행 가능한 코드를 제공하세요.
3. 한글로 답변하되, 필요한 경우 영어 용어나 코드는 그대로 사용하세요.
4. 실시간 정보가 있는 경우 이를 활용하여 답변하세요.

실시간 정보:
${realTimeInfo}

사용자의 질문에 대해 전문적이고 유용한 답변을 제공해주세요.${languageInstruction}`;
        }

        return systemPrompt;
    }
}
