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
     * Remote SSH 환경을 고려하여 경로 처리를 개선합니다.
     * @param fullPath 파일의 전체 경로
     * @returns 워크스페이스 기준 상대 경로 (슬래시 구분) 또는 null
     */
    private getPathRelativeToWorkspace(fullPath: string): string | null {
        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
            return null; // 워크스페이스가 열려있지 않음
        }

        try {
            const workspaceRootUri = vscode.workspace.workspaceFolders[0].uri;
            const fullUri = vscode.Uri.file(fullPath);

            // Remote SSH 환경에서 경로 정규화
            const normalizedWorkspacePath = path.resolve(workspaceRootUri.fsPath);
            const normalizedFullPath = path.resolve(fullUri.fsPath);

            // 파일이 워크스페이스 폴더 내에 있는지 확인
            if (normalizedFullPath.startsWith(normalizedWorkspacePath)) {
                // path.relative는 OS에 맞는 구분자를 반환하므로, 일관성을 위해 슬래시로 변환
                return path.relative(normalizedWorkspacePath, normalizedFullPath).replace(/\\/g, '/');
            }

            // Remote SSH 환경에서 상대 경로 처리
            if (!path.isAbsolute(fullPath)) {
                const relativePath = path.relative(normalizedWorkspacePath, path.join(normalizedWorkspacePath, fullPath));
                return relativePath.replace(/\\/g, '/');
            }

            return null;
        } catch (error) {
            console.error('경로 변환 중 오류 발생:', error);
            return null;
        }
    }

    /**
     * 사용자의 질의어를 기반으로 프로젝트 루트에서 관련 파일을 자동으로 찾아 컨텍스트를 구성합니다.
     * @param userQuery 사용자의 자연어 질의
     * @param abortSignal AbortController의 Signal (취소 요청 시 사용)
     */
    public async getRelevantCodebaseContextForQuery(userQuery: string, abortSignal: AbortSignal): Promise<{ fileContentsContext: string, includedFilesForContext: { name: string, fullPath: string }[] }> {
        let fileContentsContext = "";
        let currentTotalContentLength = 0;
        const includedFilesForContext: { name: string, fullPath: string }[] = [];

        // 프로젝트 루트 결정 (설정값 우선, 없으면 워크스페이스 루트)
        const configuredRoot = await this.configurationService.getProjectRoot();
        const workspaceRoot = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
            ? vscode.workspace.workspaceFolders[0].uri.fsPath
            : undefined;
        const baseRoot = configuredRoot || workspaceRoot;

        if (!baseRoot) {
            return {
                fileContentsContext: "[정보] 프로젝트가 열려있지 않거나 루트를 확인할 수 없습니다.",
                includedFilesForContext
            };
        }

        // 키워드 추출 (한/영/숫자, 2글자 이상)
        const rawWords = (userQuery || "").toLowerCase().match(/[a-zA-Z0-9가-힣_]{2,}/g) || [];
        const keywordSet = new Set<string>(rawWords.map(w => w.trim()).filter(Boolean));

        // 후보 파일 수집 (코드 파일만)
        const pattern = path.join(baseRoot, '**', '*');
        const files: string[] = glob.sync(pattern, {
            nodir: true,
            dot: false,
            ignore: [
                '**/node_modules/**',
                '**/.git/**',
                '**/dist/**',
                '**/out/**',
                '**/build/**',
                '**/.next/**',
                '**/coverage/**',
                '**/.turbo/**',
                '**/.cache/**'
            ].map(p => p.replace(/\\/g, '/'))
        }).filter((f: string) => {
            const ext = path.extname(f).toLowerCase();
            if (this.EXCLUDED_EXTENSIONS.includes(ext)) return false;
            return getFileType(f) !== '';
        });

        // 파일명/경로 기준 1차 점수 계산
        type Candidate = { fullPath: string; relative: string; nameScore: number };
        const candidates: Candidate[] = files.map((f: string) => {
            const relative = this.getPathRelativeToWorkspace(f) || path.relative(baseRoot, f).replace(/\\/g, '/');
            const hay = relative.toLowerCase();
            let nameScore = 0;
            if (keywordSet.size === 0) {
                nameScore = 1; // 쿼리 키워드가 없을 때 기본 가중치
            } else {
                keywordSet.forEach(k => {
                    if (!k) return;
                    if (hay.includes(k)) nameScore += 1;
                });
            }
            return { fullPath: f, relative, nameScore };
        }).filter(c => c.nameScore > 0);

        // 상위 후보 제한 (파일명 매칭 기준)
        candidates.sort((a, b) => b.nameScore - a.nameScore);
        const topByName = candidates.slice(0, 60);

        // 내용 매칭 점수 포함하여 최종 정렬 및 컨텍스트 구성
        const scored: { fullPath: string; relative: string; totalScore: number }[] = [];
        for (const c of topByName) {
            if (abortSignal.aborted) {
                this.notificationService.showWarningMessage('컨텍스트 수집이 취소되었습니다.');
                break;
            }

            try {
                const fileUri = vscode.Uri.file(c.fullPath);
                const contentBytes = await vscode.workspace.fs.readFile(fileUri);
                const content = Buffer.from(contentBytes).toString('utf8');

                // 내용 기반 점수 (간단한 키워드 등장 횟수, 상한 적용)
                let contentScore = 0;
                if (keywordSet.size > 0) {
                    const lower = content.toLowerCase();
                    keywordSet.forEach(k => {
                        if (!k) return;
                        const occurrences = lower.split(k).length - 1;
                        if (occurrences > 0) contentScore += Math.min(occurrences, 10);
                    });
                }

                const totalScore = c.nameScore * 3 + contentScore;
                scored.push({ fullPath: c.fullPath, relative: c.relative, totalScore });

            } catch (err) {
                console.warn(`[CodebaseContextService] 파일 점수 계산 중 오류: ${c.fullPath}`, err);
            }
        }

        scored.sort((a, b) => b.totalScore - a.totalScore);

        for (const s of scored) {
            if (abortSignal.aborted) {
                this.notificationService.showWarningMessage('컨텍스트 수집이 취소되었습니다.');
                break;
            }
            if (currentTotalContentLength >= this.MAX_TOTAL_CONTENT_LENGTH) {
                fileContentsContext += "\n[INFO] 컨텍스트 길이 제한으로 일부 파일 내용이 생략되었습니다.\n";
                break;
            }
            try {
                const fileUri = vscode.Uri.file(s.fullPath);
                const contentBytes = await vscode.workspace.fs.readFile(fileUri);
                const content = Buffer.from(contentBytes).toString('utf8');

                const lang = getFileType(s.fullPath);
                if (currentTotalContentLength + content.length <= this.MAX_TOTAL_CONTENT_LENGTH) {
                    fileContentsContext += `파일명: ${s.relative}\n코드:\n\`\`\`${lang}\n${content}\n\`\`\`\n\n`;
                    currentTotalContentLength += content.length;
                    includedFilesForContext.push({ name: s.relative, fullPath: s.fullPath });
                } else {
                    fileContentsContext += `파일명: ${s.relative}\n코드:\n[INFO] 파일 내용이 너무 길어 생략되었습니다.\n\n`;
                }
            } catch (err: any) {
                console.error(`Error reading file ${s.fullPath}:`, err);
                fileContentsContext += `[오류] 파일 '${s.relative}' 읽기 중 문제 발생: ${err.message}\n\n`;
            }
        }

        if (includedFilesForContext.length === 0) {
            fileContentsContext += "[정보] 질의어와 관련된 파일을 찾지 못했습니다. 보다 구체적인 파일명이나 기능명을 포함해 보세요.\n";
        }

        return { fileContentsContext, includedFilesForContext };
    }

    /**
     * (호환용) 이전 API를 호출하는 코드가 있을 수 있어, 자동 관련 파일 검색으로 위임합니다.
     */
    public async getProjectCodebaseContext(abortSignal: AbortSignal): Promise<{ fileContentsContext: string, includedFilesForContext: { name: string, fullPath: string }[] }> {
        return this.getRelevantCodebaseContextForQuery('', abortSignal);
    }
}