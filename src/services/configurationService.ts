import * as vscode from 'vscode';

export class ConfigurationService {
    private readonly CONFIG_SECTION = 'codepilot';

    /**
     * 'codepilot.sourcePaths' 설정을 가져옵니다.
     */
    public getSourcePaths(): string[] {
        return vscode.workspace.getConfiguration(this.CONFIG_SECTION).get<string[]>('sourcePaths') || [];
    }

    /**
     * 'codepilot.autoUpdateFiles' 설정을 가져옵니다.
     */
    public isAutoUpdateEnabled(): boolean {
        return vscode.workspace.getConfiguration(this.CONFIG_SECTION).get<boolean>('autoUpdateFiles') || false;
    }

    /**
     * 'codepilot.sourcePaths' 설정을 업데이트합니다.
     */
    public async updateSourcePaths(paths: string[]): Promise<void> {
        await vscode.workspace.getConfiguration(this.CONFIG_SECTION).update('sourcePaths', paths, vscode.ConfigurationTarget.Global);
    }

    /**
     * 'codepilot.autoUpdateFiles' 설정을 업데이트합니다.
     */
    public async updateAutoUpdateEnabled(enabled: boolean): Promise<void> {
        await vscode.workspace.getConfiguration(this.CONFIG_SECTION).update('autoUpdateFiles', enabled, vscode.ConfigurationTarget.Global);
    }
}