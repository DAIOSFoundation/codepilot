// --- START OF FILE src/storage/storage.ts ---

import * as vscode from 'vscode';

const API_KEY_SECRET_KEY = 'codepilot.geminiApiKey';

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
}

// --- END OF FILE src/storage/storage.ts ---