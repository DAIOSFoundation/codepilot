// src/api/gemini.ts

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerationConfig, Part, GenerateContentRequest, Content, RequestOptions } from '@google/generative-ai';
// RequestOptions는 이제 여기서 직접 사용되지 않지만, 다른 곳에서 타입 정의로 필요할 수 있으므로 임포트는 유지합니다.

export class GeminiApi {
    private genAI: GoogleGenerativeAI | undefined;
    private model: any; // SDK의 GenerativeModel 타입으로 지정 권장 (GenerativeModel)

    private readonly MODEL_NAME = "gemini-2.5-flash-preview-05-20";

    private readonly defaultGenerationConfig: GenerationConfig = {
        temperature: 0.7,
        topK: 1,
        topP: 1,
        maxOutputTokens: 100000,
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

    private initializeApi(apiKey: string, systemInstructionText?: string): void {
        try {
            this.genAI = new GoogleGenerativeAI(apiKey);
            this.model = this.genAI.getGenerativeModel({
                model: this.MODEL_NAME,
                safetySettings: this.defaultSafetySettings,
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
            this.initializeApi(apiKey);
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

    // <-- 수정: sendMessage 메서드에서 RequestOptions 인자 제거 -->
    async sendMessage(message: string, generationConfigParam?: GenerationConfig): Promise<string> {
        if (!this.isInitialized()) {
            throw new Error("Gemini API is not initialized. Please set your API Key in the CodePilot settings (License section).");
        }

        try {
            const chat = this.model.startChat({
                generationConfig: generationConfigParam || this.defaultGenerationConfig,
            });
            const request: GenerateContentRequest = {
                contents: [{ role: "user", parts: [{ text: message }] }],
            };
            // RequestOptions 인자를 전달하지 않음
            const result = await chat.sendMessage(request);

            const response = result.response;
            const text = response.text();
            console.log('Gemini Response (sendMessage):', text.substring(0, 100) + "...");
            return text;
        } catch (error: any) {
            console.error('Error calling Gemini API (sendMessage):', error);
            return this.handleApiError(error);
        }
    }
    // <-- 수정 끝 -->

    // <-- 수정: sendMessageWithSystemPrompt 메서드에서 RequestOptions 인자 제거 -->
    async sendMessageWithSystemPrompt(systemInstructionText: string, userPrompt: string): Promise<string> { // options 인자 제거
        if (!this.genAI) {
            throw new Error("Gemini API (GoogleGenerativeAI instance) is not initialized. Please set your API Key.");
        }

        try {
            const tempModel = this.genAI.getGenerativeModel({
                model: this.MODEL_NAME,
                systemInstruction: systemInstructionText,
                safetySettings: this.defaultSafetySettings,
            });

            const request: GenerateContentRequest = {
                contents: [{ role: "user", parts: [{ text: userPrompt }] }],
                generationConfig: this.defaultGenerationConfig,
            };

            // RequestOptions 인자를 전달하지 않음
            const result = await tempModel.generateContent(request); // options 인자 제거

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
    // <-- 수정 끝 -->

    private handleApiError(error: any): string {
        if (error.name === 'AbortError') {
            return "Error: Gemini API call was cancelled.";
        }
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