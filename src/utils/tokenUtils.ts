import { AiModelType } from '../ai/types';

// 모델별 토큰 제한
export const MODEL_TOKEN_LIMITS = {
    [AiModelType.GEMINI]: {
        maxInputTokens: 1000000, // Gemini 2.5 Flash의 입력 토큰 제한
        maxOutputTokens: 500000, // 현재 설정된 출력 토큰 제한
        maxTotalTokens: 1500000  // 총 토큰 제한
    },
    [AiModelType.OLLAMA_Gemma]: {
        maxInputTokens: 128000,  // Gemma3:27b의 입력 토큰 제한
        maxOutputTokens: 128000, // Gemma3:27b의 출력 토큰 제한
        maxTotalTokens: 128000   // Gemma3:27b의 총 토큰 제한
    },
    [AiModelType.OLLAMA_DeepSeek]: {
        maxInputTokens: 200000,  // DeepSeek R1:70B의 입력 토큰 제한
        maxOutputTokens: 200000, // DeepSeek R1:70B의 출력 토큰 제한
        maxTotalTokens: 200000   // DeepSeek R1:70B의 총 토큰 제한
    }
};

/**
 * 텍스트의 대략적인 토큰 수를 계산합니다.
 * 영어: 약 4자 = 1토큰
 * 한국어: 약 3자 = 1토큰
 * 코드: 약 4자 = 1토큰
 */
export function estimateTokenCount(text: string): number {
    if (!text) return 0;

    // 영어, 한국어, 코드 문자를 구분하여 계산
    const englishChars = (text.match(/[a-zA-Z0-9\s]/g) || []).length;
    const koreanChars = (text.match(/[가-힣]/g) || []).length;
    const codeChars = (text.match(/[{}()\[\]<>;:,./\\|`~!@#$%^&*+=?-]/g) || []).length;
    const otherChars = text.length - englishChars - koreanChars - codeChars;

    // 토큰 계산 (대략적인 추정)
    const englishTokens = Math.ceil(englishChars / 4);
    const koreanTokens = Math.ceil(koreanChars / 3);
    const codeTokens = Math.ceil(codeChars / 4);
    const otherTokens = Math.ceil(otherChars / 4);

    return englishTokens + koreanTokens + codeTokens + otherTokens;
}

/**
 * 시스템 프롬프트와 사용자 메시지의 총 토큰 수를 계산합니다.
 */
export function calculateTotalTokens(systemPrompt: string, userParts: any[]): number {
    let totalTokens = estimateTokenCount(systemPrompt);

    for (const part of userParts) {
        if (part.text) {
            totalTokens += estimateTokenCount(part.text);
        }
        // 이미지 데이터는 토큰으로 계산하지 않음 (별도 처리)
    }

    return totalTokens;
}

/**
 * 모델의 토큰 제한을 초과하는지 확인합니다.
 */
export function checkTokenLimit(
    systemPrompt: string,
    userParts: any[],
    modelType: AiModelType
): { isExceeded: boolean; currentTokens: number; maxTokens: number; message: string } {
    // 안전 가드: 알 수 없는 모델 타입 대비 (예: 과거 'ollama' 값 등)
    const limits = MODEL_TOKEN_LIMITS[modelType as AiModelType] || MODEL_TOKEN_LIMITS[AiModelType.OLLAMA_Gemma] || MODEL_TOKEN_LIMITS[AiModelType.GEMINI];
    const currentTokens = calculateTotalTokens(systemPrompt, userParts);

    const isExceeded = currentTokens > limits.maxInputTokens;

    let message = '';
    if (isExceeded) {
        let modelName = 'Unknown Model';
        switch (modelType) {
            case AiModelType.GEMINI:
                modelName = 'Gemini 2.5 Flash';
                break;
            case AiModelType.OLLAMA_Gemma:
                modelName = 'Gemma3:27b';
                break;
            case AiModelType.OLLAMA_DeepSeek:
                modelName = 'DeepSeek R1:70B';
                break;
        }
        message = `토큰 제한 초과: ${modelName}의 입력 토큰 제한(${limits.maxInputTokens.toLocaleString()}개)을 초과했습니다. 현재: ${currentTokens.toLocaleString()}개`;
    }

    return {
        isExceeded,
        currentTokens,
        maxTokens: limits.maxInputTokens,
        message
    };
}

/**
 * 토큰 사용량을 로그로 출력합니다.
 */
export function logTokenUsage(
    systemPrompt: string,
    userParts: any[],
    modelType: AiModelType
): void {
    // 안전 가드: 알 수 없는 모델 타입 대비 (예: 과거 'ollama' 값 등)
    const limits = MODEL_TOKEN_LIMITS[modelType as AiModelType] || MODEL_TOKEN_LIMITS[AiModelType.OLLAMA_Gemma] || MODEL_TOKEN_LIMITS[AiModelType.GEMINI];
    const currentTokens = calculateTotalTokens(systemPrompt, userParts);
    const usagePercentage = (currentTokens / limits.maxInputTokens) * 100;

    console.log(`[TokenUtils] ${modelType} 토큰 사용량:`);
    console.log(`  - 현재 토큰: ${currentTokens.toLocaleString()}개`);
    console.log(`  - 최대 토큰: ${limits.maxInputTokens.toLocaleString()}개`);
    console.log(`  - 사용률: ${usagePercentage.toFixed(1)}%`);

    if (usagePercentage > 80) {
        console.warn(`[TokenUtils] ⚠️ 토큰 사용률이 높습니다: ${usagePercentage.toFixed(1)}%`);
    }

    if (currentTokens > limits.maxInputTokens) {
        console.error(`[TokenUtils] ❌ 토큰 제한 초과: ${currentTokens.toLocaleString()} > ${limits.maxInputTokens.toLocaleString()}`);
    }
}
