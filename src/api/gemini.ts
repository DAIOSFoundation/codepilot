// src/api/gemini.ts

// GenerateContentRequest 타입을 임포트합니다. (SDK 버전에 따라 정확한 이름 확인)
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerationConfig, Part, GenerateContentRequest, Content } from '@google/generative-ai';

export class GeminiApi {
    private genAI: GoogleGenerativeAI | undefined;
    private model: any; // SDK의 GenerativeModel 타입으로 지정 권장

    private readonly MODEL_NAME = "gemini-2.5-flash-latest";

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

            // 또는 단일 턴 generateContent를 사용하는 경우:
            // const request: GenerateContentRequest = {
            //    contents: [{ role: "user", parts: [{ text: message }] }],
            //    generationConfig: generationConfigParam || this.defaultGenerationConfig,
            // };
            // const result = await this.model.generateContent(request);

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
            // 방법 A: 시스템 지침과 함께 모델 인스턴스를 "동적으로" 가져오기
            // 이 방법은 해당 호출에만 시스템 지침을 적용합니다.
            // SDK의 systemInstruction 타입 정의를 정확히 따라야 합니다.
            // 가장 간단한 형태는 문자열입니다.
            const tempModel = this.genAI.getGenerativeModel({
                model: this.MODEL_NAME,
                // 오류 1 해결 시도: systemInstruction을 문자열 또는 SDK가 기대하는 정확한 Part/Content 형태로 전달
                systemInstruction: systemInstructionText, // 1. 문자열로 직접 전달
                // systemInstruction: { text: systemInstructionText } // 2. 단일 Part 객체 (role 없음)
                // systemInstruction: { role: "user", parts: [{text: systemInstructionText}] } // 3. Content 객체 (role 필요, 하지만 system role이 아닐 수 있음)
                // SDK d.ts 파일을 확인하여 systemInstruction이 정확히 어떤 타입(들)을 받는지 확인하세요.
                // 만약 { parts: [...] } 형태를 보내야 하고 Content 타입으로 인식된다면, role이 필요합니다.
                // 하지만 systemInstruction에는 보통 role: "system"을 쓰지 않습니다.
                // 그래서 문자열이나 { text: ... } 형태의 Part가 더 적합할 수 있습니다.
                safetySettings: this.defaultSafetySettings,
            });

            // 오류 2 해결: generateContent에 하나의 GenerateContentRequest 객체 전달
            const request: GenerateContentRequest = {
                // systemInstruction은 위에서 모델에 설정했으므로, 여기서는 사용자 입력만 전달
                contents: [{ role: "user", parts: [{ text: userPrompt }] }],
                generationConfig: generationConfigParam || this.defaultGenerationConfig,
            };
            const result = await tempModel.generateContent(request);


            // 방법 B (만약 방법 A가 잘 안되거나, 더 복잡한 상호작용 시): contents 배열 직접 구성
            /*
            if (!this.isInitialized()) { // 기본 모델이 초기화되었는지 확인
                throw new Error("Default Gemini model is not initialized.");
            }
            const contentsForRequest: Content[] = [
                // 시스템 메시지를 어떻게 구성할지는 API 스펙에 따름
                // 예시 1: 시스템 지침을 사용자 메시지 앞에 붙이기
                { role: "user", parts: [{ text: `${systemInstructionText}\n\nTASK:\n${userPrompt}` }] }

                // 예시 2: history를 이용한 것처럼 (첫 번째 턴을 시스템 지침으로)
                // { role: "user", parts: [{ text: systemInstructionText }] },
                // { role: "model", parts: [{ text: "Understood. I will follow these instructions." }] }, // 가상 응답
                // { role: "user", parts: [{ text: userPrompt }] }
            ];
            const requestAlternative: GenerateContentRequest = {
                contents: contentsForRequest,
                generationConfig: generationConfigParam || this.defaultGenerationConfig,
            };
            const result = await this.model.generateContent(requestAlternative);
            */

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
        // ... (이전과 동일한 오류 처리 로직) ...
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