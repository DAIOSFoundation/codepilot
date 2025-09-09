// --- START OF FILE src/storage/storage.ts ---

import * as vscode from 'vscode';
import { CryptoUtils } from '../utils/cryptoUtils';

const API_KEY_SECRET_KEY = 'codepilot.geminiApiKey';
const OLLAMA_API_URL_SECRET_KEY = 'codepilot.ollamaApiUrl';
const OLLAMA_ENDPOINT_SECRET_KEY = 'codepilot.ollamaEndpoint';
const OLLAMA_MODEL_SECRET_KEY = 'codepilot.ollamaModel';
const CURRENT_AI_MODEL_SECRET_KEY = 'codepilot.currentAiModel';
const BANYA_LICENSE_SERIAL_SECRET_KEY = 'codepilot.banyaLicenseSerial';

export class StorageService {
    private secretStorage: vscode.SecretStorage;

    constructor(secretStorage: vscode.SecretStorage) {
        this.secretStorage = secretStorage;
    }

    /**
     * API Key를 VS Code SecretStorage에 안전하게 저장합니다.
     * @param apiKey 저장할 API Key
     */
    async saveApiKey(apiKey: string): Promise<void> {
        await this.secretStorage.store(API_KEY_SECRET_KEY, apiKey);
        console.log('API Key saved to SecretStorage.');
    }

    /**
     * SecretStorage에서 저장된 API Key를 불러옵니다.
     * @returns 저장된 API Key 또는 없을 경우 undefined
     */
    async getApiKey(): Promise<string | undefined> {
        const apiKey = await this.secretStorage.get(API_KEY_SECRET_KEY);
        if (apiKey) {
            console.log('API Key loaded from SecretStorage.');
        } else {
            console.log('No API Key found in SecretStorage.');
        }
        return apiKey;
    }

    /**
     * SecretStorage에서 API Key를 삭제합니다.
     */
    async deleteApiKey(): Promise<void> {
        await this.secretStorage.delete(API_KEY_SECRET_KEY);
        console.log('API Key deleted from SecretStorage.');
    }

    /**
     * Ollama API URL을 VS Code SecretStorage에 안전하게 저장합니다.
     * @param apiUrl 저장할 Ollama API URL
     */
    async saveOllamaApiUrl(apiUrl: string): Promise<void> {
        await this.secretStorage.store(OLLAMA_API_URL_SECRET_KEY, apiUrl);
        console.log('Ollama API URL saved to SecretStorage.');
    }

    /**
     * SecretStorage에서 저장된 Ollama API URL을 불러옵니다.
     * @returns 저장된 Ollama API URL 또는 없을 경우 undefined
     */
    async getOllamaApiUrl(): Promise<string | undefined> {
        const apiUrl = await this.secretStorage.get(OLLAMA_API_URL_SECRET_KEY);
        if (apiUrl) {
            console.log('Ollama API URL loaded from SecretStorage.');
        } else {
            console.log('No Ollama API URL found in SecretStorage.');
        }
        return apiUrl;
    }

    /**
     * SecretStorage에서 Ollama API URL을 삭제합니다.
     */
    async deleteOllamaApiUrl(): Promise<void> {
        await this.secretStorage.delete(OLLAMA_API_URL_SECRET_KEY);
        console.log('Ollama API URL deleted from SecretStorage.');
    }

    /**
     * Ollama API 엔드포인트를 VS Code SecretStorage에 안전하게 저장합니다.
     * @param endpoint 저장할 Ollama API 엔드포인트
     */
    async saveOllamaEndpoint(endpoint: string): Promise<void> {
        await this.secretStorage.store(OLLAMA_ENDPOINT_SECRET_KEY, endpoint);
        console.log('Ollama API endpoint saved to SecretStorage.');
    }

    /**
     * SecretStorage에서 저장된 Ollama API 엔드포인트를 불러옵니다.
     * @returns 저장된 Ollama API 엔드포인트 또는 없을 경우 기본값 '/api/generate'
     */
    async getOllamaEndpoint(): Promise<string> {
        const endpoint = await this.secretStorage.get(OLLAMA_ENDPOINT_SECRET_KEY);
        if (endpoint) {
            console.log('Ollama API endpoint loaded from SecretStorage.');
            return endpoint;
        } else {
            console.log('No Ollama API endpoint found in SecretStorage, using default.');
            return '/api/generate';
        }
    }

    /**
     * SecretStorage에서 Ollama API 엔드포인트를 삭제합니다.
     */
    async deleteOllamaEndpoint(): Promise<void> {
        await this.secretStorage.delete(OLLAMA_ENDPOINT_SECRET_KEY);
        console.log('Ollama API endpoint deleted from SecretStorage.');
    }

    /**
     * Ollama 모델을 VS Code SecretStorage에 안전하게 저장합니다.
     * @param model 저장할 Ollama 모델명
     */
    async saveOllamaModel(model: string): Promise<void> {
        await this.secretStorage.store(OLLAMA_MODEL_SECRET_KEY, model);
        console.log('Ollama model saved to SecretStorage.');
    }

    /**
     * SecretStorage에서 저장된 Ollama 모델을 불러옵니다.
     * @returns 저장된 Ollama 모델명 또는 없을 경우 기본값 'gemma3:27b'
     */
    async getOllamaModel(): Promise<string> {
        const model = await this.secretStorage.get(OLLAMA_MODEL_SECRET_KEY);
        if (model) {
            console.log('Ollama model loaded from SecretStorage.');
            return model;
        } else {
            console.log('No Ollama model found in SecretStorage, using default.');
            return 'gemma3:27b';
        }
    }

    /**
     * SecretStorage에서 Ollama 모델을 삭제합니다.
     */
    async deleteOllamaModel(): Promise<void> {
        await this.secretStorage.delete(OLLAMA_MODEL_SECRET_KEY);
        console.log('Ollama model deleted from SecretStorage.');
    }

    /**
     * 현재 AI 모델을 VS Code SecretStorage에 안전하게 저장합니다.
     * @param model 저장할 AI 모델 타입
     */
    async saveCurrentAiModel(model: string): Promise<void> {
        await this.secretStorage.store(CURRENT_AI_MODEL_SECRET_KEY, model);
        console.log('Current AI model saved to SecretStorage.');
    }

    /**
     * SecretStorage에서 저장된 현재 AI 모델을 불러옵니다.
     * @returns 저장된 AI 모델 타입 또는 없을 경우 undefined
     */
    async getCurrentAiModel(): Promise<string | undefined> {
        const model = await this.secretStorage.get(CURRENT_AI_MODEL_SECRET_KEY);
        if (model) {
            console.log('Current AI model loaded from SecretStorage.');
        } else {
            console.log('No current AI model found in SecretStorage.');
        }
        return model;
    }

    /**
     * SecretStorage에서 현재 AI 모델을 삭제합니다.
     */
    async deleteCurrentAiModel(): Promise<void> {
        await this.secretStorage.delete(CURRENT_AI_MODEL_SECRET_KEY);
        console.log('Current AI model deleted from SecretStorage.');
    }

    /**
     * Banya 라이센스 시리얼을 암호화하여 VS Code SecretStorage에 안전하게 저장합니다.
     * @param licenseSerial 저장할 라이센스 시리얼
     */
    async saveBanyaLicenseSerial(licenseSerial: string): Promise<void> {
        const encryptedSerial = CryptoUtils.encrypt(licenseSerial);
        await this.secretStorage.store(BANYA_LICENSE_SERIAL_SECRET_KEY, encryptedSerial);
        console.log('Banya license serial encrypted and saved to SecretStorage.');
    }

    /**
     * SecretStorage에서 저장된 Banya 라이센스 시리얼을 복호화하여 불러옵니다.
     * @returns 저장된 라이센스 시리얼 또는 없을 경우 undefined
     */
    async getBanyaLicenseSerial(): Promise<string | undefined> {
        const encryptedSerial = await this.secretStorage.get(BANYA_LICENSE_SERIAL_SECRET_KEY);
        if (encryptedSerial) {
            try {
                // 암호화된 형식인지 확인
                if (CryptoUtils.isEncrypted(encryptedSerial)) {
                    const decryptedSerial = CryptoUtils.decrypt(encryptedSerial);
                    console.log('Banya license serial decrypted and loaded from SecretStorage.');
                    return decryptedSerial;
                } else {
                    // 기존 암호화되지 않은 형식인 경우 그대로 반환 (하위 호환성)
                    console.log('Banya license serial loaded from SecretStorage (legacy format).');
                    return encryptedSerial;
                }
            } catch (error) {
                console.error('라이센스 시리얼 복호화 중 오류 발생:', error);
                return undefined;
            }
        } else {
            console.log('No Banya license serial found in SecretStorage.');
            return undefined;
        }
    }

    /**
     * SecretStorage에서 Banya 라이센스 시리얼을 삭제합니다.
     */
    async deleteBanyaLicenseSerial(): Promise<void> {
        await this.secretStorage.delete(BANYA_LICENSE_SERIAL_SECRET_KEY);
        console.log('Banya license serial deleted from SecretStorage.');
    }
}

// --- END OF FILE src/storage/storage.ts ---