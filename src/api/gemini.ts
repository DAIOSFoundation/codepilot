// src/api/gemini.ts

// GenerateContentRequest 타입을 임포트합니다. (SDK 버전에 따라 정확한 이름 확인)
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerationConfig, Part, GenerateContentRequest, Content } from '@google/generative-ai';

export class GeminiApi {
    private genAI: GoogleGenerativeAI | undefined;
    private model: any; // SDK의 GenerativeModel 타입으로 지정 권장

    private readonly MODEL_NAME = "gemini-2.5-flash-preview-05-20";

    private readonly defaultGenerationConfig: GenerationConfig = {
        temperature: 0.7,
        topK: 1,
        topP: 1,
        maxOutputTokens: 10000,
    };

    private readonly defaultSafetySettings = [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ];

    constructor(apiKey?: string) {
        if (apiKey) {
            this.initializeApi(apiKey);
        } else {
            console.warn('Gemini API Key is not provided at construction.');
        }
    }

    private initializeApi(apiKey: string, systemInstructionText?: string): void { // systemInstructionText 추가 (선택적)
        try {
            this.genAI = new GoogleGenerativeAI(apiKey);
            this.model = this.genAI.getGenerativeModel({
                model: this.MODEL_NAME,
                safetySettings: this.defaultSafetySettings,
                // 모델 생성 시 시스템 지침을 설정하려면 여기에 추가
                // systemInstruction: systemInstructionText, // 문자열로 전달 시도
            });
            console.log(`Gemini API initialized with model: ${this.MODEL_NAME}${systemInstructionText ? " and system instruction." : "."}`);
        } catch (error) {
            console.error('Error initializing Gemini API:', error);
            this.genAI = undefined;
            this.model = undefined;
        }
    }

    updateApiKey(apiKey: string | undefined): void {
        if (apiKey) {
            this.initializeApi(apiKey); // 기본 시스템 지침 없이 초기화
            console.log('Gemini API Key updated.');
        } else {
            this.genAI = undefined;
            this.model = undefined;
            console.warn('Gemini API Key removed. API is now uninitialized.');
        }
    }

    public isInitialized(): boolean {
        return !!this.model && !!this.genAI;
    }

    async sendMessage(message: string, generationConfigParam?: GenerationConfig): Promise<string> {
        if (!this.isInitialized()) {
            throw new Error("Gemini API is not initialized. Please set your API Key in the CodePilot settings (License section).");
        }

        try {
            // startChat을 사용하는 경우:
            const chat = this.model.startChat({
                generationConfig: generationConfigParam || this.defaultGenerationConfig,
            });
            const result = await chat.sendMessage(message);

            const response = result.response;
            const text = response.text();
            console.log('Gemini Response (sendMessage):', text.substring(0, 100) + "...");
            return text;
        } catch (error: any) {
            console.error('Error calling Gemini API (sendMessage):', error);
            return this.handleApiError(error);
        }
    }

    async sendMessageWithSystemPrompt(systemInstructionText: string, userPrompt: string, generationConfigParam?: GenerationConfig): Promise<string> {
        if (!this.genAI) { // genAI 인스턴스가 있는지 먼저 확인
            throw new Error("Gemini API (GoogleGenerativeAI instance) is not initialized. Please set your API Key.");
        }

        try {
            const tempModel = this.genAI.getGenerativeModel({
                model: this.MODEL_NAME,
                systemInstruction: systemInstructionText,
                safetySettings: this.defaultSafetySettings,
            });

            const request: GenerateContentRequest = {
                // systemInstruction은 위에서 모델에 설정했으므로, 여기서는 사용자 입력만 전달
                contents: [{ role: "user", parts: [{ text: userPrompt }] }],
                generationConfig: generationConfigParam || this.defaultGenerationConfig,
            };
            const result = await tempModel.generateContent(request);

            const response = result.response;
            if (response.promptFeedback && response.promptFeedback.blockReason) {
                console.warn(`Gemini API response blocked. Reason: ${response.promptFeedback.blockReason}`, response.promptFeedback);
                throw new Error(`Response was blocked by safety settings. Reason: ${response.promptFeedback.blockReason}. Please adjust your prompt or safety settings.`);
            }
            const text = response.text();
            console.log('Gemini Response (sendMessageWithSystemPrompt):', text.substring(0, 100) + "...");
            return text;

        } catch (error: any) {
            console.error('Error calling Gemini API (sendMessageWithSystemPrompt):', error);
            return this.handleApiError(error);
        }
    }

    private handleApiError(error: any): string {
        if (error.message) {
            if (error.message.includes('API key not valid') || error.message.includes('invalid api key')) {
                return "Error: Invalid Gemini API Key. Please check and update it in the CodePilot settings (License section).";
            }
            if (error.message.includes('quota') || error.message.includes('Quota')) {
                return "Error: Gemini API quota exceeded. Please check your Google Cloud Project billing and quotas.";
            }
            if (error.message.includes('Billing account not found')) {
                return "Error: Billing account not found or not associated with the project. Please check your Google Cloud Project billing settings.";
            }
            if (error.message.includes('LOCATION_INVALID')) {
                return "Error: Invalid location or model not available in the region. Please check model availability for your project's region.";
            }
            if (error.message.includes('Response was blocked')) {
                return error.message;
            }
            return `Error communicating with Gemini API: ${error.message}`;
        }
        return "Error: An unknown error occurred while communicating with the Gemini API.";
    }
}