// src/api/gemini.ts

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerationConfig, Part, GenerateContentRequest, Content, RequestOptions } from '@google/generative-ai';

declare module '@google/generative-ai' {
  interface RequestOptions {
    signal?: AbortSignal;
  }
}


export class GeminiApi {
    private genAI: GoogleGenerativeAI | undefined;
    private model: any; // SDK의 GenerativeModel 타입으로 지정 권장 (GenerativeModel)

    private readonly MODEL_NAME = "gemini-2.5-flash-preview-05-20";
    //private readonly MODEL_NAME = "gemini-2.5-pro-preview-05-06";

    private readonly defaultGenerationConfig: GenerationConfig = {
        temperature: 0.7,
        topK: 1,
        topP: 1,
        maxOutputTokens: 500000,
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
            console.warn('Banya API Key is not provided at construction.');
        }
    }

    private initializeApi(apiKey: string, systemInstructionText?: string): void {
        try {
            this.genAI = new GoogleGenerativeAI(apiKey);
            this.model = this.genAI.getGenerativeModel({
                model: this.MODEL_NAME,
                safetySettings: this.defaultSafetySettings,
            });
            console.log(`Banya API initialized with model: ${this.MODEL_NAME}${systemInstructionText ? " and system instruction." : "."}`);
        } catch (error) {
            console.error('Error initializing Banya API:', error);
            this.genAI = undefined;
            this.model = undefined;
        }
    }

    updateApiKey(apiKey: string | undefined): void {
        if (apiKey) {
            this.initializeApi(apiKey);
            console.log('Banya API Key updated.');
        } else {
            this.genAI = undefined;
            this.model = undefined;
            console.warn('Banya API Key removed. API is now uninitialized.');
        }
    }

    public isInitialized(): boolean {
        return !!this.model && !!this.genAI;
    }

    // <-- 수정: sendMessage 메서드에 RequestOptions를 두 번째 인자로 전달 -->
    async sendMessage(message: string, generationConfigParam?: GenerationConfig, options?: RequestOptions): Promise<string> {
        if (!this.isInitialized()) {
            throw new Error("Banya API is not initialized. Please set your API Key in the CodePilot settings (License section).");
        }

        try {
            const chat = this.model.startChat({
                generationConfig: generationConfigParam || this.defaultGenerationConfig,
            });
            const request: GenerateContentRequest = {
                contents: [{ role: "user", parts: [{ text: message }] }],
            };
            // <-- 수정: chat.sendMessage 호출 시 request와 options를 분리하여 두 번째 인자로 전달 -->
            const result = await chat.sendMessage(request, options); // RequestOptions를 두 번째 인자로 전달
            // <-- 수정 끝 -->

            const response = result.response;
            const text = response.text();
            console.log('Banya Response (sendMessage):', text);
            return text;
        } catch (error: any) {
            console.error('Error calling Banya API (sendMessage):', error);
            return this.handleApiError(error);
        }
    }
    // <-- 수정 끝 -->

    // <-- 수정: sendMessageWithSystemPrompt 메서드에서 webSearch 기능 제거 -->
    // userPrompt: string 대신 userParts: Part[]를 받도록 변경
    async sendMessageWithSystemPrompt(systemInstructionText: string, userParts: Part[], options?: RequestOptions): Promise<string> {
        if (!this.genAI) {
            throw new Error("Banya Gemma 27B Tunded is not initialized. Please set your API Key.");
        }

        try {
            const tempModel = this.genAI.getGenerativeModel({
                model: this.MODEL_NAME,
                systemInstruction: systemInstructionText,
                safetySettings: this.defaultSafetySettings,
            });

            const request: GenerateContentRequest = {
                contents: [{ role: "user", parts: userParts }], // userParts 배열 사용
                generationConfig: this.defaultGenerationConfig,
            };

            // <-- 수정: generateContent 호출 시 request와 options를 분리하여 두 번째 인자로 전달 -->
            const result = await tempModel.generateContent(request, options); // RequestOptions를 두 번째 인자로 전달
            // <-- 수정 끝 -->

            const response = result.response;
            if (response.promptFeedback && response.promptFeedback.blockReason) {
                console.warn(`Banya API response blocked. Reason: ${response.promptFeedback.blockReason}`, response.promptFeedback);
                throw new Error(`Response was blocked by safety settings. Reason: ${response.promptFeedback.blockReason}. Please adjust your prompt or safety settings.`);
            }
            const text = response.text();
            // console.log('Banya Response (sendMessageWithSystemPrompt):', text);
            return text;

        } catch (error: any) {
            console.error('Error calling Banya API (sendMessageWithSystemPrompt):', error);
            return this.handleApiError(error);
        }
    }
    // <-- 수정 끝 -->

    private handleApiError(error: any): string {
        if (error.name === 'AbortError') {
            return "Error: Banya API call was cancelled.";
        }
        if (error.message) {
            if (error.message.includes('API key not valid') || error.message.includes('invalid api key')) {
                return "Error: Invalid Banya API Key. Please check and update it in the CodePilot settings (License section).";
            }
            if (error.message.includes('quota') || error.message.includes('Quota')) {
                return "Error: Banya API quota exceeded. Please check your Banya Lincese detail.";
            }
            if (error.message.includes('Billing account not found')) {
                return "Error: Billing account not found or not associated with the project. Please check your Banya Codepilot payment account.";
            }
            if (error.message.includes('LOCATION_INVALID')) {
                return "Error: Invalid location or model not available in the region. Please check model availability.";
            }
            if (error.message.includes('Response was blocked')) {
                return error.message;
            }
            return `Error communicating with Banya API: Banya agent ochestration service aborted LLM calling`;
        }
        return "Error: An unknown error occurred while communicating with the Banya API.";
    }
}
