import * as vscode from 'vscode';

let _codePilotTerminal: vscode.Terminal | undefined;

/**
 * CodePilot 전용 터미널 인스턴스를 가져오거나 새로 생성합니다.
 */
export function getCodePilotTerminal(): vscode.Terminal {
    if (!_codePilotTerminal || _codePilotTerminal.exitStatus !== undefined) {
        _codePilotTerminal = vscode.window.createTerminal({ name: "CodePilot Terminal" });
        const disposable = vscode.window.onDidCloseTerminal(event => {
            if (event === _codePilotTerminal) {
                _codePilotTerminal = undefined;
                disposable.dispose();
            }
        });
    }
    return _codePilotTerminal;
}

/**
 * LLM 응답에서 bash 명령어를 추출하고 터미널에서 실행합니다.
 */
export function executeBashCommandsFromLlmResponse(llmResponse: string): string[] {
    const executedCommands: string[] = [];
    
    // bash로 시작하는 코드 블록을 찾는 정규식
    const bashBlockRegex = /```bash\s*\n([\s\S]*?)\n```/g;
    
    let match;
    while ((match = bashBlockRegex.exec(llmResponse)) !== null) {
        const bashCommands = match[1].trim();
        if (bashCommands) {
            // 여러 명령어를 개행으로 분리
            const commands = bashCommands.split('\n').filter(cmd => cmd.trim());
            
            for (const command of commands) {
                if (command.trim()) {
                    executeBashCommand(command.trim());
                    executedCommands.push(command.trim());
                }
            }
        }
    }
    
    return executedCommands;
}

/**
 * 단일 bash 명령어를 터미널에서 실행합니다.
 */
export function executeBashCommand(command: string): void {
    try {
        const terminal = getCodePilotTerminal();
        
        // 터미널이 활성화되어 있지 않으면 활성화
        if (!terminal.state.isInteractedWith) {
            terminal.show();
        }
        
        // 명령어 실행
        terminal.sendText(command);
        
        console.log(`[TerminalManager] Executed bash command: ${command}`);
        
        // 사용자에게 알림
        vscode.window.showInformationMessage(`CodePilot: Bash 명령어 실행됨 - ${command}`);
        
    } catch (error) {
        console.error(`[TerminalManager] Failed to execute bash command: ${command}`, error);
        vscode.window.showErrorMessage(`CodePilot: Bash 명령어 실행 실패 - ${command}`);
    }
}

/**
 * LLM 응답에서 bash 명령어가 포함되어 있는지 확인합니다.
 */
export function hasBashCommands(llmResponse: string): boolean {
    const bashBlockRegex = /```bash\s*\n([\s\S]*?)\n```/g;
    return bashBlockRegex.test(llmResponse);
}