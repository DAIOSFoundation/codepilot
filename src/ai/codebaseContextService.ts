import * as vscode from 'vscode';
import * as path from 'path';
import * as glob from 'glob';
import { getFileType } from '../utils/fileUtils';
import { ConfigurationService } from '../services/configurationService';
import { NotificationService } from '../services/notificationService';

export class CodebaseContextService {
    private configurationService: ConfigurationService;
    private notificationService: NotificationService;
    private readonly MAX_TOTAL_CONTENT_LENGTH = 1000000; // LLM 컨텍스트 최대 길이
    private readonly EXCLUDED_EXTENSIONS = [
        '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp', '.ico', // Images
        '.pdf', '.zip', '.tar', '.gz', '.rar', '.7z',                     // Archives/Binary documents
        '.exe', '.dll', '.bin',                                           // Executables/Binaries
        '.sqlite', '.db',                                                 // Databases
        '.lock', '.log', '.tmp', '.temp'                                  // Lock/Log/Temp files
    ];

    constructor(configurationService: ConfigurationService, notificationService: NotificationService) {
        this.configurationService = configurationService;
        this.notificationService = notificationService;
    }

    /**
     * 파일의 전체 경로를 VS Code 워크스페이스 루트를 기준으로 한 상대 경로로 변환합니다.
     * 워크스페이스가 열려있지 않거나 파일이 워크스페이스 외부에 있으면 null을 반환합니다.
     * @param fullPath 파일의 전체 경로
     * @returns 워크스페이스 기준 상대 경로 (슬래시 구분) 또는 null
     */
    private getPathRelativeToWorkspace(fullPath: string): string | null {
        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
            return null; // 워크스페이스가 열려있지 않음
        }
        const workspaceRootUri = vscode.workspace.workspaceFolders[0].uri;
        const fullUri = vscode.Uri.file(fullPath);

        // 파일이 워크스페이스 폴더 내에 있는지 확인
        if (fullUri.fsPath.startsWith(workspaceRootUri.fsPath)) {
            // path.relative는 OS에 맞는 구분자를 반환하므로, 일관성을 위해 슬래시로 변환
            return path.relative(workspaceRootUri.fsPath, fullUri.fsPath).replace(/\\/g, '/');
        }
        return null;
    }

    /**
     * 프로젝트 코드베이스에서 LLM에 전달할 컨텍스트를 수집합니다.
     * @param abortSignal AbortController의 Signal (취소 요청 시 사용)
     * @returns { fileContentsContext: string, includedFilesForContext: { name: string, fullPath: string }[] }
     */
    public async getProjectCodebaseContext(abortSignal: AbortSignal): Promise<{ fileContentsContext: string, includedFilesForContext: { name: string, fullPath: string }[] }> {
        const sourcePathsSetting = await this.configurationService.getSourcePaths();
        let fileContentsContext = "";
        let currentTotalContentLength = 0;
        const includedFilesForContext: { name: string, fullPath: string }[] = [];

        for (const sourcePath of sourcePathsSetting) {
            if (abortSignal.aborted) {
                this.notificationService.showWarningMessage('컨텍스트 수집이 취소되었습니다.');
                break;
            }
            if (currentTotalContentLength >= this.MAX_TOTAL_CONTENT_LENGTH) {
                fileContentsContext += "\n[INFO] 컨텍스트 길이 제한으로 일부 파일 내용이 생략되었습니다.\n";
                break;
            }
            try {
                const uri = vscode.Uri.file(sourcePath);
                const stats = await vscode.workspace.fs.stat(uri);

                if (stats.type === vscode.FileType.File) {
                    // Check if file is excluded
                    if (this.EXCLUDED_EXTENSIONS.includes(path.extname(sourcePath).toLowerCase())) {
                        console.log(`[CodebaseContextService] Skipping excluded file: ${sourcePath}`);
                        continue;
                    }

                    const contentBytes = await vscode.workspace.fs.readFile(uri);
                    const content = Buffer.from(contentBytes).toString('utf8');

                    // 워크스페이스 기준 상대 경로를 얻거나, 없으면 기본 파일명 사용
                    const nameForContext = this.getPathRelativeToWorkspace(sourcePath) || path.basename(sourcePath);

                    if (currentTotalContentLength + content.length <= this.MAX_TOTAL_CONTENT_LENGTH) {
                        fileContentsContext += `파일명: ${nameForContext}\n코드:\n\`\`\`${getFileType(sourcePath)}\n${content}\n\`\`\`\n\n`;
                        currentTotalContentLength += content.length;
                        includedFilesForContext.push({ name: nameForContext, fullPath: sourcePath });
                    } else {
                        fileContentsContext += `파일명: ${nameForContext}\n코드:\n[INFO] 파일 내용이 너무 길어 생략되었습니다.\n\n`;
                    }
                } else if (stats.type === vscode.FileType.Directory) {
                    const pattern = path.join(uri.fsPath, '**', '*');
                    const files = glob.sync(pattern, {
                        nodir: true,
                        dot: false,
                        ignore: [
                            path.join(uri.fsPath, '**/node_modules/**'),
                            path.join(uri.fsPath, '**/.git/**', '**/dist/**', '**/out/**')
                        ].map(p => p.replace(/\\/g, '/'))
                    });

                    for (const file of files) {
                        if (abortSignal.aborted) {
                            this.notificationService.showWarningMessage('컨텍스트 수집이 취소되었습니다.');
                            break;
                        }
                        // Check if file is excluded
                        if (this.EXCLUDED_EXTENSIONS.includes(path.extname(file).toLowerCase())) {
                            console.log(`[CodebaseContextService] Skipping excluded file: ${file}`);
                            continue;
                        }

                        if (currentTotalContentLength >= this.MAX_TOTAL_CONTENT_LENGTH) break;
                        const fileUri = vscode.Uri.file(file);
                        const contentBytes = await vscode.workspace.fs.readFile(fileUri);
                        const content = Buffer.from(contentBytes).toString('utf8');

                        // 워크스페이스 기준 상대 경로를 얻거나, 없으면 기본 파일명 사용
                        const nameForContext = this.getPathRelativeToWorkspace(file) || path.basename(file);

                        if (currentTotalContentLength + content.length <= this.MAX_TOTAL_CONTENT_LENGTH) {
                            fileContentsContext += `파일명: ${nameForContext}\n코드:\n\`\`\`${getFileType(file)}\n${content}\n\`\`\`\n\n`;
                            currentTotalContentLength += content.length;
                            includedFilesForContext.push({ name: nameForContext, fullPath: file });
                        } else {
                            fileContentsContext += `파일명: ${nameForContext}\n코드:\n[INFO] 파일 내용이 너무 길어 생략되었습니다.\n\n`;
                        }
                    }
                }
            } catch (err: any) {
                console.error(`Error processing source path ${sourcePath}:`, err);
                fileContentsContext += `[오류] 경로 '${sourcePath}' 처리 중 문제 발생: ${err.message}\n\n`;
            }
        }

        if (includedFilesForContext.length === 0 && sourcePathsSetting.length > 0) {
            fileContentsContext += "[정보] 설정된 경로에서 컨텍스트에 포함할 파일을 찾지 못했습니다. 파일 확장자나 경로 설정을 확인해주세요.\n";
        } else if (sourcePathsSetting.length === 0) {
            fileContentsContext += "[정보] 참조할 소스 경로가 설정되지 않았습니다. CodePilot 설정에서 경로를 추가해주세요.\n";
        }
        return { fileContentsContext, includedFilesForContext };
    }
}