import * as vscode from 'vscode';

export class NotificationService {
    /**
     * 정보 메시지를 사용자에게 표시합니다.
     */
    public showInfoMessage(message: string): void {
        vscode.window.showInformationMessage(message);
    }

    /**
     * 경고 메시지를 사용자에게 표시합니다.
     */
    public showWarningMessage(message: string): void {
        vscode.window.showWarningMessage(message);
    }

    /**
     * 에러 메시지를 사용자에게 표시합니다.
     */
    public showErrorMessage(message: string): void {
        vscode.window.showErrorMessage(message);
    }
}