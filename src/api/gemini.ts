import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

export class GeminiApi {
    private genAI: GoogleGenerativeAI | undefined;
    private model: any; // 모델 인스턴스 타입

    constructor(apiKey?: string) {
        if (apiKey) {
            try {
                this.genAI = new GoogleGenerativeAI(apiKey);
                this.model = this.genAI.getGenerativeModel({
                    model: "gemini-1.5-flash-latest",
                    // 안전 설정 (선택 사항, 필요에 따라 조정)
                    safetySettings: [
                         {
                             category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                             threshold: HarmBlockThreshold.BLOCK_NONE,
                         },
                         {
                             category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                             threshold: HarmBlockThreshold.BLOCK_NONE,
                         },
                         {
                             // <-- 수정: 오타 수정 (HARN -> HARM) (오류 2 해결) -->
                             category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                             // <-- 수정 끝 -->
                             threshold: HarmBlockThreshold.BLOCK_NONE,
                         },
                         {
                             category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                             threshold: HarmBlockThreshold.BLOCK_NONE,
                         },
                    ]
                 });
                console.log('Gemini API initialized.');
            } catch (error) {
                console.error('Error initializing Gemini API:', error);
                this.genAI = undefined;
            }
        } else {
            console.warn('Gemini API Key is not provided.');
            this.genAI = undefined;
        }
    }

    /**
     * 제공된 API Key로 Gemini API 인스턴스를 업데이트합니다.
     * @param apiKey 새로운 API Key
     */
    updateApiKey(apiKey: string): void {
         if (apiKey) {
            try {
                this.genAI = new GoogleGenerativeAI(apiKey);
                 this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
                console.log('Gemini API Key updated.');
            } catch (error) {
                 console.error('Error updating Gemini API Key:', error);
                 this.genAI = undefined;
            }
        } else {
             this.genAI = undefined;
             this.model = undefined;
             console.warn('Gemini API Key removed.');
        }
    }


    /**
     * Gemini 모델에게 메시지를 보내고 응답을 받습니다.
     * @param message 사용자 메시지
     * @returns CodePilot 응답 텍스트 또는 오류 메시지
     */
    async sendMessage(message: string): Promise<string> {
        if (!this.genAI || !this.model) {
            return "Error: Gemini API Key is not set or invalid. Please set it in the License panel.";
        }

        try {
            const result = await this.model.generateContent(message);
            const response = result.response;
            const text = response.text();
            console.log('Gemini Response:', text);
            return text;
        } catch (error: any) {
            console.error('Error calling Gemini API:', error);
            if (error.message && error.message.includes('API key not valid')) {
                 return "Error: Invalid Gemini API Key. Please check and update it in the License panel.";
            }
             // API 응답에 안전 설정 관련 오류 메시지가 포함될 수 있습니다.
             // 예를 들어, `response.promptFeedback.blockReason` 등을 확인하여 사용자에게 안전 설정 때문에 차단되었음을 알릴 수 있습니다.
             // 현재는 간단히 오류 메시지만 반환합니다.
            return `Error communicating with Gemini API: ${error.message}`;
        }
    }
}