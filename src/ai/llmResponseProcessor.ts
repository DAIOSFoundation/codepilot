import * as vscode from 'vscode';
import * as path from 'path';
import { ConfigurationService } from '../services/configurationService';
import { NotificationService } from '../services/notificationService';
import { PromptType } from './types'; // Import PromptType
import { safePostMessage } from '../webview/panelUtils';
import { executeBashCommandsFromLlmResponse, hasBashCommands } from '../terminal/terminalManager';

// Define a type for file operations
interface FileOperation {
    type: 'modify' | 'create' | 'delete';
    originalDirective: string; // e.g., "수정 파일", "새 파일", "삭제 파일"
    llmSpecifiedPath: string;  // The path as specified by LLM (e.g., 'src/components/Button.tsx')
    absolutePath: string;      // The resolved absolute path on disk
    newContent?: string;       // Optional for delete operations
}

export class LlmResponseProcessor {
    private context: vscode.ExtensionContext;
    private configurationService: ConfigurationService;
    private notificationService: NotificationService;

    constructor(context: vscode.ExtensionContext, configurationService: ConfigurationService, notificationService: NotificationService) {
        this.context = context;
        this.configurationService = configurationService;
        this.notificationService = notificationService;
    }

    /**
     * Retrieves the project root path. It first checks the 'codepilot.projectRoot' setting.
     * If not set, it defaults to the first workspace folder's root.
     * @returns The absolute path of the project root, or undefined if no workspace is open and no setting is configured.
     */
    private async getProjectRootPath(): Promise<string | undefined> {
        const configuredRoot = await this.configurationService.getProjectRoot();
        if (configuredRoot) {
            // ConfigurationService's getProjectRoot should ideally return an absolute path
            // or handle resolution. Assuming it returns an absolute path or undefined.
            // console.log(`[LLM Response Processor] Configured project root: ${configuredRoot}`);
            return configuredRoot;
        }
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
            // console.log(`[LLM Response Processor] Workspace folder project root: ${workspaceRoot}`);
            return workspaceRoot;
        }
        // console.log(`[LLM Response Processor] No project root found.`);
        return undefined;
    }

    /**
     * LLM 응답을 파싱하고, 자동 업데이트 설정에 따라 파일을 업데이트하거나 사용자에게 제안합니다.
     * @param llmResponse LLM의 원본 응답 문자열
     * @param contextFiles 컨텍스트에 포함되었던 파일 목록 ({ name: string, fullPath: string }[])
     * @param webview 웹뷰에 메시지를 보낼 수 있는 Webview 객체
     * @param promptType 현재 프롬프트의 타입 (CODE_GENERATION 또는 GENERAL_ASK)
     */
    public async processLlmResponseAndApplyUpdates(
        llmResponse: string,
        contextFiles: { name: string, fullPath: string }[],
        webview: vscode.Webview,
        promptType: PromptType // Add this parameter
    ): Promise<void> 
    {
        // GENERAL_ASK 타입일 때는 파일 생성, 수정, 삭제 및 터미널 명령어 실행을 건너뜀
        if (promptType === PromptType.GENERAL_ASK) {
            
            let cleanedResponse = llmResponse;
            let hasWarnings = false;
            
            // 터미널 명령어가 포함되어 있으면 경고 메시지 표시하고 제거
            if (hasBashCommands(llmResponse)) {
                const warningMsg = "ASK 탭에서는 터미널 명령어를 실행할 수 없습니다. CODE 탭을 사용해주세요.";
                safePostMessage(webview, { command: 'receiveMessage', sender: 'CodePilot', text: warningMsg });
                this.notificationService.showWarningMessage(`CodePilot: ${warningMsg}`);
                hasWarnings = true;
                
                // 터미널 명령어 부분 제거
                cleanedResponse = this.removeBashCommands(cleanedResponse);
            }
            
            // 파일 생성/수정/삭제 지시어가 포함되어 있으면 경고 메시지 표시하고 제거
            if (llmResponse.includes("새 파일:") || llmResponse.includes("수정 파일:") || llmResponse.includes("삭제 파일:")) {
                const warningMsg = "ASK 탭에서는 파일 생성, 수정, 삭제를 할 수 없습니다. CODE 탭을 사용해주세요.";
                safePostMessage(webview, { command: 'receiveMessage', sender: 'CodePilot', text: warningMsg });
                this.notificationService.showWarningMessage(`CodePilot: ${warningMsg}`);
                hasWarnings = true;
                
                // 파일 작업 지시어 부분 제거
                cleanedResponse = this.removeFileDirectives(cleanedResponse);
            }
            
            // 정리된 응답을 웹뷰에 전달
            if (cleanedResponse.trim()) {
                safePostMessage(webview, { command: 'receiveMessage', sender: 'CodePilot', text: cleanedResponse });
            }
            
            return;
        }
        
        const fileOperations: FileOperation[] = [];
        
        // Updated regex to capture the directive (group 1), the path (group 2), and the content (group 3)
        // 수정: 파일 경로를 더 정확하게 파싱하도록 정규식 개선
        // 파일 경로는 directive 다음에 오는 텍스트에서 코드 블록 시작 전까지 추출
        const codeBlockRegex = /(?:##\s*)?(새 파일|수정 파일):\s*([^\r\n]+?)(?:\s*\r?\n\s*\r?\n|\s*\r?\n)\s*```[^\n]*\r?\n([\s\S]*?)\r?\n```/g;
        
        // 마크다운 파일을 위한 별도 정규식 (코드 블록 없이 마크다운 내용 직접 포함)
        const markdownFileRegex = /(새 파일|수정 파일):\s*([^\r\n]+\.md)\r?\n([\s\S]*?)(?=\r?\n\s*(?:새 파일|수정 파일|삭제 파일|--- 작업 요약|--- 작업 수행 설명|$))/gs;
        
        // 더 간단한 마크다운 파일 정규식 (대안)
        const simpleMarkdownRegex = /(새 파일|수정 파일):\s*([^\r\n]+\.md)\r?\n([\s\S]*?)(?=\r?\n\s*(?:새 파일|수정 파일|삭제 파일|$))/gs;
        
        // 가장 간단한 마크다운 파일 정규식 (최후의 수단)
        const fallbackMarkdownRegex = /(새 파일|수정 파일):\s*([^\r\n]+\.md)\r?\n([\s\S]*)/gs;
        
        // 삭제 파일을 위한 별도 정규식 (코드 블록이 없음)
        const deleteFileRegex = /삭제 파일:\s+(.+?)(?:\r?\n|$)/g;

        let match;
        let updateSummaryMessages: string[] = [];

        const projectRoot = await this.getProjectRootPath();
        
        // 디버깅을 위한 로그 추가
        console.log(`[LLM Response Processor] Response contains "새 파일:": ${llmResponse.includes("새 파일:")}`);
        console.log(`[LLM Response Processor] Response contains ".md": ${llmResponse.includes(".md")}`);
        
        // 새 파일 생성을 위한 프로젝트 루트가 없으면 경고
        if (!projectRoot && llmResponse.includes("새 파일:")) {
            this.notificationService.showErrorMessage("새 파일 생성을 위해 프로젝트 루트 경로를 찾을 수 없습니다. CodePilot 설정에서 'Project Root'를 설정하거나, 워크스페이스를 여십시오.");
            safePostMessage(webview, { command: 'receiveMessage', sender: 'CodePilot', text: "오류: 새 파일 생성을 위한 프로젝트 루트 경로를 찾을 수 없습니다." });
            // 여기서 return하지 않고, 아래 루프에서 새 파일 생성을 건너뛰도록 처리
        }


        // 코드 블록이 있는 파일 작업 처리 (생성, 수정)
        while ((match = codeBlockRegex.exec(llmResponse)) !== null) {
            // Updated to correctly access captured groups
            const originalDirective = match[1].trim(); // "수정 파일" or "새 파일"
            let llmSpecifiedPath = match[2].trim();  // e.g., 'src/components/Button.tsx'
            const newContent = match[3];
            
            console.log(`[LLM Response Processor] Found directive: "${originalDirective}", LLM path: "${llmSpecifiedPath}"`);
            console.log(`[LLM Response Processor] Raw match groups:`, match.map((group, index) => `Group ${index}: "${group}"`));
            
            // 파일명에서 ** 제거 (Ollama 응답에서 발생하는 문제 해결)
            llmSpecifiedPath = llmSpecifiedPath.replace(/\*\*$/, '');



            let absolutePath: string | undefined;
            let operationType: 'modify' | 'create' | 'delete';

            if (originalDirective === '수정 파일') {
                operationType = 'modify';
                // 컨텍스트 파일 목록에서 AI가 제안한 파일명과 일치하는지 찾기
                // 파일명만 비교하거나 전체 경로로 비교
                const matchedFile = contextFiles.find((f: { name: string, fullPath: string }) => {
                    const fileName = llmSpecifiedPath.split(/[/\\]/).pop() || llmSpecifiedPath;
                    return f.name === fileName || f.name === llmSpecifiedPath || f.fullPath.endsWith(llmSpecifiedPath);
                });
                
                if (matchedFile) {
                    absolutePath = matchedFile.fullPath;
                } else {
                    const warnMsg = `경고: AI가 수정을 제안한 파일 '${llmSpecifiedPath}'을(를) 컨텍스트 목록에서 찾을 수 없습니다. 해당 파일은 업데이트되지 않았습니다.`;
                    console.warn(`[LLM Response Processor] WARN: '수정 파일' specified as "${llmSpecifiedPath}" but not found in context. Context files:`, contextFiles.map((f: { name: string, fullPath: string }) => `${f.name} -> ${f.fullPath}`));
                    safePostMessage(webview, { command: 'receiveMessage', sender: 'CodePilot', text: warnMsg });
                    updateSummaryMessages.push(`⚠️ ${warnMsg}`);
                    continue; // Skip this operation
                }
            } else if (originalDirective === '새 파일') {
                operationType = 'create';
                if (projectRoot) {
                    absolutePath = path.join(projectRoot, llmSpecifiedPath);
                    // console.log(`[LLM Response Processor] Resolved 'create' absolute path: "${absolutePath}" from project root "${projectRoot}"`);
                } else {
                    const warnMsg = `경고: '새 파일' 지시어 '${llmSpecifiedPath}'가 감지되었으나, 프로젝트 루트 경로를 찾을 수 없어 파일 생성을 건너뜀.`;
                    // console.warn(`[LLM Response Processor] WARN: ${warnMsg}`);
                    this.notificationService.showWarningMessage(`CodePilot: ${warnMsg}`);
                    safePostMessage(webview, { command: 'receiveMessage', sender: 'CodePilot', text: warnMsg });
                    updateSummaryMessages.push(`⚠️ ${warnMsg}`);
                    continue; // Skip this operation
                }
            } else {
                // console.warn(`[LLM Response Processor] WARN: Unknown directive "${originalDirective}". Skipping.`);
                continue; // Skip unknown directives
            }

            if (absolutePath && newContent) {
                fileOperations.push({
                    type: operationType,
                    originalDirective,
                    llmSpecifiedPath,
                    absolutePath,
                    newContent
                });
            }
        }


        // 마크다운 파일 작업 처리 (코드 블록 없이 마크다운 내용 직접 포함)
        console.log(`[LLM Response Processor] Starting markdown file processing...`);
        
        let markdownMatchCount = 0;
        
        // 첫 번째 정규식 시도
        while ((match = markdownFileRegex.exec(llmResponse)) !== null) {
            markdownMatchCount++;
            console.log(`[LLM Response Processor] Found markdown directive (regex1): "${match[1]}", LLM path: "${match[2]}"`);
            console.log(`[LLM Response Processor] Markdown content length: ${match[3]?.length || 0}`);
            
            const originalDirective = match[1].trim(); // "수정 파일" or "새 파일"
            let llmSpecifiedPath = match[2].trim();  // e.g., 'docs/README.md'
            const newContent = match[3];
            
            // 파일명에서 ** 제거 (Ollama 응답에서 발생하는 문제 해결)
            llmSpecifiedPath = llmSpecifiedPath.replace(/\*\*$/, '');

            let absolutePath: string | undefined;
            let operationType: 'modify' | 'create' | 'delete';

            if (originalDirective === '수정 파일') {
                operationType = 'modify';
                // 컨텍스트 파일 목록에서 AI가 제안한 파일명과 일치하는지 찾기
                // 파일명만 비교하거나 전체 경로로 비교
                const matchedFile = contextFiles.find((f: { name: string, fullPath: string }) => {
                    const fileName = llmSpecifiedPath.split(/[/\\]/).pop() || llmSpecifiedPath;
                    return f.name === fileName || f.name === llmSpecifiedPath || f.fullPath.endsWith(llmSpecifiedPath);
                });
                
                if (matchedFile) {
                    absolutePath = matchedFile.fullPath;
                } else {
                    const warnMsg = `경고: AI가 수정을 제안한 마크다운 파일 '${llmSpecifiedPath}'을(를) 컨텍스트 목록에서 찾을 수 없습니다. 해당 파일은 업데이트되지 않았습니다.`;
                    console.warn(`[LLM Response Processor] WARN: '수정 파일' markdown specified as "${llmSpecifiedPath}" but not found in context. Context files:`, contextFiles.map((f: { name: string, fullPath: string }) => `${f.name} -> ${f.fullPath}`));
                    safePostMessage(webview, { command: 'receiveMessage', sender: 'CodePilot', text: warnMsg });
                    updateSummaryMessages.push(`⚠️ ${warnMsg}`);
                    continue; // Skip this operation
                }
            } else if (originalDirective === '새 파일') {
                operationType = 'create';
                if (projectRoot) {
                    absolutePath = path.join(projectRoot, llmSpecifiedPath);
                } else {
                    const warnMsg = `경고: '새 파일' 지시어 '${llmSpecifiedPath}'가 감지되었으나, 프로젝트 루트 경로를 찾을 수 없어 마크다운 파일 생성을 건너뜀.`;
                    this.notificationService.showWarningMessage(`CodePilot: ${warnMsg}`);
                    safePostMessage(webview, { command: 'receiveMessage', sender: 'CodePilot', text: warnMsg });
                    updateSummaryMessages.push(`⚠️ ${warnMsg}`);
                    continue; // Skip this operation
                }
            } else {
                continue; // Skip unknown directives
            }

            if (absolutePath && newContent) {
                fileOperations.push({
                    type: operationType,
                    originalDirective,
                    llmSpecifiedPath,
                    absolutePath,
                    newContent
                });
            }
        }
        
        // 첫 번째 정규식이 실패한 경우 두 번째 정규식 시도
        if (markdownMatchCount === 0) {
            console.log(`[LLM Response Processor] First regex failed, trying simple regex...`);
            while ((match = simpleMarkdownRegex.exec(llmResponse)) !== null) {
                markdownMatchCount++;
                console.log(`[LLM Response Processor] Found markdown directive (regex2): "${match[1]}", LLM path: "${match[2]}"`);
                console.log(`[LLM Response Processor] Markdown content length: ${match[3]?.length || 0}`);
                
                const originalDirective = match[1].trim(); // "수정 파일" or "새 파일"
                let llmSpecifiedPath = match[2].trim();  // e.g., 'docs/README.md'
                const newContent = match[3];
                
                // 파일명에서 ** 제거 (Ollama 응답에서 발생하는 문제 해결)
                llmSpecifiedPath = llmSpecifiedPath.replace(/\*\*$/, '');

                let absolutePath: string | undefined;
                let operationType: 'modify' | 'create' | 'delete';

                if (originalDirective === '수정 파일') {
                    operationType = 'modify';
                    // 컨텍스트 파일 목록에서 AI가 제안한 파일명과 일치하는지 찾기
                    // 파일명만 비교하거나 전체 경로로 비교
                    const matchedFile = contextFiles.find((f: { name: string, fullPath: string }) => {
                        const fileName = llmSpecifiedPath.split(/[/\\]/).pop() || llmSpecifiedPath;
                        return f.name === fileName || f.name === llmSpecifiedPath || f.fullPath.endsWith(llmSpecifiedPath);
                    });
                    
                    if (matchedFile) {
                        absolutePath = matchedFile.fullPath;
                    } else {
                        const warnMsg = `경고: AI가 수정을 제안한 마크다운 파일 '${llmSpecifiedPath}'을(를) 컨텍스트 목록에서 찾을 수 없습니다. 해당 파일은 업데이트되지 않았습니다.`;
                        console.warn(`[LLM Response Processor] WARN: '수정 파일' markdown specified as "${llmSpecifiedPath}" but not found in context. Context files:`, contextFiles.map((f: { name: string, fullPath: string }) => `${f.name} -> ${f.fullPath}`));
                        safePostMessage(webview, { command: 'receiveMessage', sender: 'CodePilot', text: warnMsg });
                        updateSummaryMessages.push(`⚠️ ${warnMsg}`);
                        continue; // Skip this operation
                    }
                } else if (originalDirective === '새 파일') {
                    operationType = 'create';
                    if (projectRoot) {
                        absolutePath = path.join(projectRoot, llmSpecifiedPath);
                    } else {
                        const warnMsg = `경고: '새 파일' 지시어 '${llmSpecifiedPath}'가 감지되었으나, 프로젝트 루트 경로를 찾을 수 없어 마크다운 파일 생성을 건너뜀.`;
                        this.notificationService.showWarningMessage(`CodePilot: ${warnMsg}`);
                        safePostMessage(webview, { command: 'receiveMessage', sender: 'CodePilot', text: warnMsg });
                        updateSummaryMessages.push(`⚠️ ${warnMsg}`);
                        continue; // Skip this operation
                    }
                } else {
                    continue; // Skip unknown directives
                }

                if (absolutePath && newContent) {
                    fileOperations.push({
                        type: operationType,
                        originalDirective,
                        llmSpecifiedPath,
                        absolutePath,
                        newContent
                    });
                }
            }
        }
        
        // 두 번째 정규식도 실패한 경우 세 번째 정규식 시도
        if (markdownMatchCount === 0) {
            console.log(`[LLM Response Processor] Second regex failed, trying fallback regex...`);
            while ((match = fallbackMarkdownRegex.exec(llmResponse)) !== null) {
                markdownMatchCount++;
                console.log(`[LLM Response Processor] Found markdown directive (regex3): "${match[1]}", LLM path: "${match[2]}"`);
                console.log(`[LLM Response Processor] Markdown content length: ${match[3]?.length || 0}`);
                
                const originalDirective = match[1].trim(); // "수정 파일" or "새 파일"
                let llmSpecifiedPath = match[2].trim();  // e.g., 'docs/README.md'
                const newContent = match[3];
                
                // 파일명에서 ** 제거 (Ollama 응답에서 발생하는 문제 해결)
                llmSpecifiedPath = llmSpecifiedPath.replace(/\*\*$/, '');

                let absolutePath: string | undefined;
                let operationType: 'modify' | 'create' | 'delete';

                if (originalDirective === '수정 파일') {
                    operationType = 'modify';
                    // 컨텍스트 파일 목록에서 AI가 제안한 파일명과 일치하는지 찾기
                    // 파일명만 비교하거나 전체 경로로 비교
                    const matchedFile = contextFiles.find((f: { name: string, fullPath: string }) => {
                        const fileName = llmSpecifiedPath.split(/[/\\]/).pop() || llmSpecifiedPath;
                        return f.name === fileName || f.name === llmSpecifiedPath || f.fullPath.endsWith(llmSpecifiedPath);
                    });
                    
                    if (matchedFile) {
                        absolutePath = matchedFile.fullPath;
                    } else {
                        const warnMsg = `경고: AI가 수정을 제안한 마크다운 파일 '${llmSpecifiedPath}'을(를) 컨텍스트 목록에서 찾을 수 없습니다. 해당 파일은 업데이트되지 않았습니다.`;
                        console.warn(`[LLM Response Processor] WARN: '수정 파일' markdown specified as "${llmSpecifiedPath}" but not found in context. Context files:`, contextFiles.map((f: { name: string, fullPath: string }) => `${f.name} -> ${f.fullPath}`));
                        safePostMessage(webview, { command: 'receiveMessage', sender: 'CodePilot', text: warnMsg });
                        updateSummaryMessages.push(`⚠️ ${warnMsg}`);
                        continue; // Skip this operation
                    }
                } else if (originalDirective === '새 파일') {
                    operationType = 'create';
                    if (projectRoot) {
                        absolutePath = path.join(projectRoot, llmSpecifiedPath);
                    } else {
                        const warnMsg = `경고: '새 파일' 지시어 '${llmSpecifiedPath}'가 감지되었으나, 프로젝트 루트 경로를 찾을 수 없어 마크다운 파일 생성을 건너뜀.`;
                        this.notificationService.showWarningMessage(`CodePilot: ${warnMsg}`);
                        safePostMessage(webview, { command: 'receiveMessage', sender: 'CodePilot', text: warnMsg });
                        updateSummaryMessages.push(`⚠️ ${warnMsg}`);
                        continue; // Skip this operation
                    }
                } else {
                    continue; // Skip unknown directives
                }

                if (absolutePath && newContent) {
                    fileOperations.push({
                        type: operationType,
                        originalDirective,
                        llmSpecifiedPath,
                        absolutePath,
                        newContent
                    });
                }
            }
        }
        
        console.log(`[LLM Response Processor] Found ${markdownMatchCount} markdown file operations`);


        // 삭제 파일 작업 처리
        while ((match = deleteFileRegex.exec(llmResponse)) !== null) {
            const llmSpecifiedPath = match[1].trim();  // e.g., 'src/old/obsolete.ts'
            // console.log(`[LLM Response Processor] Found delete directive for: "${llmSpecifiedPath}"`);

            let absolutePath: string | undefined;
            
            if (projectRoot) {
                absolutePath = path.join(projectRoot, llmSpecifiedPath);
                // console.log(`[LLM Response Processor] Resolved 'delete' absolute path: "${absolutePath}" from project root "${projectRoot}"`);
            } else {
                const warnMsg = `경고: '삭제 파일' 지시어 '${llmSpecifiedPath}'가 감지되었으나, 프로젝트 루트 경로를 찾을 수 없어 파일 삭제를 건너뜀.`;
                // console.warn(`[LLM Response Processor] WARN: ${warnMsg}`);
                this.notificationService.showWarningMessage(`CodePilot: ${warnMsg}`);
                safePostMessage(webview, { command: 'receiveMessage', sender: 'CodePilot', text: warnMsg });
                updateSummaryMessages.push(`⚠️ ${warnMsg}`);
                continue; // Skip this operation
            }

            if (absolutePath) {
                fileOperations.push({
                    type: 'delete',
                    originalDirective: '삭제 파일',
                    llmSpecifiedPath,
                    absolutePath
                    // newContent는 삭제 작업에서는 필요 없음
                });
            }
        }

        // 작업 요약 추출 및 표시
        const workSummary = this.extractWorkSummary(llmResponse);
        const workDescription = this.extractWorkDescription(llmResponse);
        
        // 먼저 AI 응답을 채팅창에 출력 (작업 요약과 설명 제외)
        let initialWebviewResponse = this.removeWorkSummaryAndDescription(llmResponse);
        if (contextFiles.length > 0) {
            const fileList = contextFiles.map(f => f.name).join(', ');
            initialWebviewResponse += `\n\n--- 컨텍스트에 포함된 파일 ---\n${fileList}`;
        } else if (promptType === PromptType.CODE_GENERATION) {
            initialWebviewResponse += `\n\n--- 컨텍스트에 포함된 파일 ---\n(없음)`;
        }


        
        safePostMessage(webview, { command: 'receiveMessage', sender: 'CodePilot', text: initialWebviewResponse });


        
        // 파일 작업이 있는 경우에만 추가 처리
        console.log(`[LLM Response Processor] Found ${fileOperations.length} file operations:`, fileOperations.map(op => `${op.type}: ${op.llmSpecifiedPath}`));
        if (fileOperations.length > 0) {
            // thinking 애니메이션을 먼저 제거
            safePostMessage(webview, { command: 'hideLoading' });
            
            const autoUpdateEnabled = await this.configurationService.isAutoUpdateEnabled();

            for (const operation of fileOperations) {
                const fileUri = vscode.Uri.file(operation.absolutePath);
                const fileNameForDisplay = operation.llmSpecifiedPath;

                if (autoUpdateEnabled) {
                    try {
                        if (operation.type === 'create') {
                            const dirPath = path.dirname(operation.absolutePath);
                            await vscode.workspace.fs.createDirectory(vscode.Uri.file(dirPath));
                            await vscode.workspace.fs.writeFile(fileUri, Buffer.from(operation.newContent!, 'utf8'));
                            const successMsg = `✅ 파일이 자동으로 생성되었습니다: ${fileNameForDisplay}`;
                            this.notificationService.showInfoMessage(`CodePilot: ${successMsg}`);
                            updateSummaryMessages.push(successMsg);
                        } else if (operation.type === 'modify') {
                            await vscode.workspace.fs.writeFile(fileUri, Buffer.from(operation.newContent!, 'utf8'));
                            const successMsg = `✅ 파일이 자동으로 업데이트되었습니다: ${fileNameForDisplay}`;
                            this.notificationService.showInfoMessage(`CodePilot: ${successMsg}`);
                            updateSummaryMessages.push(successMsg);
                        } else if (operation.type === 'delete') {
                            await vscode.workspace.fs.delete(fileUri);
                            const successMsg = `✅ 파일이 자동으로 삭제되었습니다: ${fileNameForDisplay}`;
                            this.notificationService.showInfoMessage(`CodePilot: ${successMsg}`);
                            updateSummaryMessages.push(successMsg);
                        }
                    } catch (err: any) {
                        const operationTypeText = operation.type === 'create' ? '생성' : operation.type === 'modify' ? '업데이트' : '삭제';
                        const errorMsg = `❌ 파일 자동 ${operationTypeText} 실패 (${fileNameForDisplay}): ${err.message}`;
                        this.notificationService.showErrorMessage(`CodePilot: ${errorMsg}`);
                        updateSummaryMessages.push(errorMsg);
                    }
                } else {
                    let userChoice: string | undefined;
                    if (operation.type === 'create') {
                        userChoice = await vscode.window.showInformationMessage(
                            `CodePilot: AI가 '${fileNameForDisplay}' 새 파일 생성을 제안했습니다. 적용하시겠습니까?`,
                            { modal: true }, "생성", "취소"
                        );
                    } else if (operation.type === 'modify') {
                        userChoice = await vscode.window.showInformationMessage(
                            `CodePilot: AI가 '${fileNameForDisplay}' 파일 수정을 제안했습니다. 적용하시겠습니까? (전체 코드로 대체됩니다)`,
                            { modal: true }, "적용", "Diff 보기", "취소"
                        );
                    } else if (operation.type === 'delete') {
                        userChoice = await vscode.window.showInformationMessage(
                            `CodePilot: AI가 '${fileNameForDisplay}' 파일 삭제를 제안했습니다. 삭제하시겠습니까?`,
                            { modal: true }, "삭제", "취소"
                        );
                    }

                    if (userChoice === "적용" || userChoice === "생성" || userChoice === "삭제") {
                        try {
                            if (operation.type === 'create') {
                                const dirPath = path.dirname(operation.absolutePath);
                                await vscode.workspace.fs.createDirectory(vscode.Uri.file(dirPath));
                                await vscode.workspace.fs.writeFile(fileUri, Buffer.from(operation.newContent!, 'utf8'));
                                const successMsg = `✅ 파일이 생성되었습니다: ${fileNameForDisplay}`;
                                this.notificationService.showInfoMessage(`CodePilot: ${successMsg}`);
                                updateSummaryMessages.push(successMsg);
                            } else if (operation.type === 'modify') {
                                await vscode.workspace.fs.writeFile(fileUri, Buffer.from(operation.newContent!, 'utf8'));
                                const successMsg = `✅ 파일이 업데이트되었습니다: ${fileNameForDisplay}`;
                                this.notificationService.showInfoMessage(`CodePilot: ${successMsg}`);
                                updateSummaryMessages.push(successMsg);
                            } else if (operation.type === 'delete') {
                                await vscode.workspace.fs.delete(fileUri);
                                const successMsg = `✅ 파일이 삭제되었습니다: ${fileNameForDisplay}`;
                                this.notificationService.showInfoMessage(`CodePilot: ${successMsg}`);
                                updateSummaryMessages.push(successMsg);
                            }
                        } catch (err: any) {
                            const operationTypeText = operation.type === 'create' ? '생성' : operation.type === 'modify' ? '업데이트' : '삭제';
                            const errorMsg = `❌ 파일 ${operationTypeText} 실패 (${fileNameForDisplay}): ${err.message}`;
                            this.notificationService.showErrorMessage(`CodePilot: ${errorMsg}`);
                            updateSummaryMessages.push(errorMsg);
                        }
                    } else if (userChoice === "Diff 보기" && operation.type === 'modify') {
                        const tempFileName = `codepilot-suggested-${path.basename(operation.absolutePath)}-${Date.now()}${path.extname(operation.absolutePath)}`;
                        const tempFileUri = vscode.Uri.joinPath(this.context.globalStorageUri, tempFileName);
                        try {
                            await vscode.workspace.fs.writeFile(tempFileUri, Buffer.from(operation.newContent!, 'utf8'));
                            await vscode.commands.executeCommand('vscode.diff', fileUri, tempFileUri, `Original '${fileNameForDisplay}'  vs.  CodePilot Suggestion`);
                            updateSummaryMessages.push(`ℹ️ '${fileNameForDisplay}' 변경 제안 Diff를 표시했습니다.`);
                        } catch (diffError: any) {
                            this.notificationService.showErrorMessage(`Diff 표시 중 오류: ${diffError.message}`);
                            updateSummaryMessages.push(`❌ Diff 표시 실패 (${fileNameForDisplay}): ${diffError.message}`);
                        }
                    } else {
                        const operationTypeText = operation.type === 'create' ? '생성' : operation.type === 'modify' ? '업데이트' : '삭제';
                        updateSummaryMessages.push(`ℹ️ 파일 ${operationTypeText}이(가) 취소되었습니다: ${fileNameForDisplay}`);
                    }
                }
            }

            // 파일 작업 결과를 추가로 채팅창에 표시
            if (updateSummaryMessages.length > 0) {
                const updateResultMessage = "\n\n📁 파일 업데이트 결과\n" + updateSummaryMessages.join("\n");
                safePostMessage(webview, { command: 'receiveMessage', sender: 'CodePilot', text: updateResultMessage });
            }

            // Bash 명령어 실행 처리
            if (hasBashCommands(llmResponse)) {
                try {
                    const executedCommands = executeBashCommandsFromLlmResponse(llmResponse);
                    if (executedCommands.length > 0) {
                        const bashMessage = `\n\n🚀 Bash 명령어 실행됨:\n${executedCommands.map(cmd => `• ${cmd}`).join('\n')}`;
                        safePostMessage(webview, { command: 'receiveMessage', sender: 'CodePilot', text: bashMessage });
                    }
                } catch (error: any) {
                    console.error('[LLM Response Processor] Bash command execution error:', error);
                    const errorMessage = `\n\n❌ Bash 명령어 실행 중 오류 발생: ${error.message}`;
                    safePostMessage(webview, { command: 'receiveMessage', sender: 'CodePilot', text: errorMessage });
                }
            }

            // 작업 요약과 설명을 마지막에 출력
            if (workSummary) {
                const summaryMessage = "\n\n📋 AI 작업 요약\n" + workSummary;
                safePostMessage(webview, { command: 'receiveMessage', sender: 'CodePilot', text: summaryMessage });
            }

            if (workDescription) {
                const descriptionMessage = "\n\n💡 작업 수행 설명\n" + workDescription;
                safePostMessage(webview, { command: 'receiveMessage', sender: 'CodePilot', text: descriptionMessage });
            }

            // 파일 작업 완료 후 hideLoading 호출
            safePostMessage(webview, { command: 'hideLoading' });
        } else if (llmResponse.includes("Copy") && !llmResponse.includes("수정 파일:") && !llmResponse.includes("새 파일:") && !llmResponse.includes("삭제 파일:")) {
            const infoMessage = "\n\n[정보] 코드 블록이 응답에 포함되어 있으나, '수정 파일:', '새 파일:', 또는 '삭제 파일:' 지시어가 없어 자동 업데이트가 시도되지 않았습니다. 필요시 수동으로 복사하여 사용해주세요.";
            safePostMessage(webview, { command: 'receiveMessage', sender: 'CodePilot', text: infoMessage });
            
            // Bash 명령어 실행 처리
            if (hasBashCommands(llmResponse)) {
                try {
                    const executedCommands = executeBashCommandsFromLlmResponse(llmResponse);
                    if (executedCommands.length > 0) {
                        const bashMessage = `\n\n🚀 Bash 명령어 실행됨:\n${executedCommands.map(cmd => `• ${cmd}`).join('\n')}`;
                        safePostMessage(webview, { command: 'receiveMessage', sender: 'CodePilot', text: bashMessage });
                    }
                } catch (error: any) {
                    console.error('[LLM Response Processor] Bash command execution error:', error);
                    const errorMessage = `\n\n❌ Bash 명령어 실행 중 오류 발생: ${error.message}`;
                    safePostMessage(webview, { command: 'receiveMessage', sender: 'CodePilot', text: errorMessage });
                }
            }
            
            // 파일 작업이 없어도 작업 요약과 설명이 있으면 출력
            if (workSummary) {
                const summaryMessage = "\n\n📋 AI 작업 요약\n" + workSummary;
                safePostMessage(webview, { command: 'receiveMessage', sender: 'CodePilot', text: summaryMessage });
            }

            if (workDescription) {
                const descriptionMessage = "\n\n💡 작업 수행 설명\n" + workDescription;
                safePostMessage(webview, { command: 'receiveMessage', sender: 'CodePilot', text: descriptionMessage });
            }
        } else {
            // 파일 작업이 없는 경우 thinking 애니메이션 제거
            safePostMessage(webview, { command: 'hideLoading' });
            
            // Bash 명령어 실행 처리
            if (hasBashCommands(llmResponse)) {
                try {
                    const executedCommands = executeBashCommandsFromLlmResponse(llmResponse);
                    if (executedCommands.length > 0) {
                        const bashMessage = `\n\n🚀 Bash 명령어 실행됨:\n${executedCommands.map(cmd => `• ${cmd}`).join('\n')}`;
                        safePostMessage(webview, { command: 'receiveMessage', sender: 'CodePilot', text: bashMessage });
                    }
                } catch (error: any) {
                    console.error('[LLM Response Processor] Bash command execution error:', error);
                    const errorMessage = `\n\n❌ Bash 명령어 실행 중 오류 발생: ${error.message}`;
                    safePostMessage(webview, { command: 'receiveMessage', sender: 'CodePilot', text: errorMessage });
                }
            }
            
            // 파일 작업이 없어도 작업 요약과 설명이 있으면 출력
            if (workSummary) {
                const summaryMessage = "\n\n📋 AI 작업 요약\n" + workSummary;
                safePostMessage(webview, { command: 'receiveMessage', sender: 'CodePilot', text: summaryMessage });
            }

            if (workDescription) {
                const descriptionMessage = "\n\n💡 작업 수행 설명\n" + workDescription;
                safePostMessage(webview, { command: 'receiveMessage', sender: 'CodePilot', text: descriptionMessage });
            }
        }
    }

    /**
     * LLM 응답에서 작업 요약을 추출합니다.
     * @param llmResponse LLM의 원본 응답 문자열
     * @returns 추출된 작업 요약 문자열 또는 null
     */
    private extractWorkSummary(llmResponse: string): string | null {
        const workSummaryRegex = /--- 작업 요약 ---\s*\n([\s\S]*?)(?=\n\n|$)/i;
        const match = llmResponse.match(workSummaryRegex);
        
        if (match && match[1]) {
            return match[1].trim();
        }
        
        return null;
    }

    private extractWorkDescription(llmResponse: string): string | null {
        const workDescriptionRegex = /--- 작업 수행 설명 ---\s*\n([\s\S]*?)(?=\n\n|$)/i;
        const match = llmResponse.match(workDescriptionRegex);
        
        if (match && match[1]) {
            return match[1].trim();
        }
        
        return null;
    }

    private removeWorkSummaryAndDescription(llmResponse: string): string {
        const summaryRegex = /--- 작업 요약 ---\s*\n([\s\S]*?)(?=\n\n|$)/i;
        const descriptionRegex = /--- 작업 수행 설명 ---\s*\n([\s\S]*?)(?=\n\n|$)/i;
        
        let result = llmResponse.replace(summaryRegex, '').replace(descriptionRegex, '');
        
        // Remove any remaining empty lines
        result = result.replace(/\n\n+/g, '\n\n');
        
        return result.trim();
    }

    /**
     * 터미널 명령어를 제거합니다.
     */
    private removeBashCommands(response: string): string {
        // ```bash로 시작하고 ```로 끝나는 코드 블록 제거
        return response.replace(/```bash[\s\S]*?```/g, '');
    }

    /**
     * 파일 작업 지시어를 제거합니다.
     */
    private removeFileDirectives(response: string): string {
        // 새 파일, 수정 파일, 삭제 파일 지시어와 관련 코드 블록 제거
        let cleaned = response;
        
        // 코드 블록이 있는 파일 작업 제거
        cleaned = cleaned.replace(/(?:##\s*)?(새 파일|수정 파일):\s+[^\r\n]+?(?:\r?\n\s*\r?\n```[^\n]*\r?\n[\s\S]*?\r?\n```)/g, '');
        
        // 마크다운 파일 작업 제거
        cleaned = cleaned.replace(/(?:##\s*)?(새 파일|수정 파일):\s+[^\r\n]+\.md\r?\n\s*\r?\n[\s\S]*?(?=\r?\n\s*(?:새 파일|수정 파일|삭제 파일|$))/gs, '');
        
        // 삭제 파일 지시어 제거
        cleaned = cleaned.replace(/삭제 파일:\s+[^\r\n]+(?:\r?\n|$)/g, '');
        
        // 빈 줄 정리
        cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');
        
        return cleaned.trim();
    }
}