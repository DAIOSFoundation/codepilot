import * as vscode from 'vscode';

export class ConfigurationService {
    private readonly CONFIG_SECTION = 'codepilot';
    private readonly SOURCE_PATHS_KEY = 'sourcePaths';
    private readonly AUTO_UPDATE_KEY = 'autoUpdateFiles';
    private readonly PROJECT_ROOT_KEY = 'projectRoot';

    constructor() {}

    public async getSourcePaths(): Promise<string[]> {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        return config.get<string[]>(this.SOURCE_PATHS_KEY) || [];
    }

    public async updateSourcePaths(paths: string[]): Promise<void> {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        await config.update(this.SOURCE_PATHS_KEY, paths, vscode.ConfigurationTarget.Global);
    }

    public async isAutoUpdateEnabled(): Promise<boolean> {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        return config.get<boolean>(this.AUTO_UPDATE_KEY) || false;
    }

    public async updateAutoUpdateEnabled(enabled: boolean): Promise<void> {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        await config.update(this.AUTO_UPDATE_KEY, enabled, vscode.ConfigurationTarget.Global);
    }

    public async getProjectRoot(): Promise<string | undefined> {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        const root = config.get<string>(this.PROJECT_ROOT_KEY);
        // VS Code settings default to empty string if not set for string types,
        // but we treat empty string as "not set" for project root.
        return root === '' ? undefined : root;
    }

    public async updateProjectRoot(path: string | undefined): Promise<void> {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        // If path is undefined, save an empty string to clear the setting.
        // VS Code stores empty strings, not `undefined` for string settings.
        await config.update(this.PROJECT_ROOT_KEY, path || '', vscode.ConfigurationTarget.Global);
    }
}
