import * as vscode from 'vscode';

let _codePilotTerminal: vscode.Terminal | undefined;

/**
 * CodePilot 전용 터미널 인스턴스를 가져오거나 새로 생성합니다.
 */
export function getCodePilotTerminal(): vscode.Terminal {
    if (!_codePilotTerminal || _codePilotTerminal.exitStatus !== undefined) {
        _codePilotTerminal = vscode.window.createTerminal({ 
            name: "CodePilot Terminal",
            shellPath: process.platform === 'win32' ? 'cmd.exe' : '/bin/bash'
        });
        
        // 터미널이 닫힐 때 정리
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
 * bash 명령어들을 터미널에서 실행합니다.
 * @param commands 실행할 명령어 배열
 */
export function executeBashCommands(commands: string[]): void {
    if (!commands || commands.length === 0) {
        vscode.window.showWarningMessage('실행할 명령어가 없습니다.');
        return;
    }

    try {
        const terminal = getCodePilotTerminal();
        
        // 터미널 표시
        terminal.show();
        
        // 터미널이 준비될 때까지 잠시 대기
        setTimeout(() => {
            // 명령어들을 순차적으로 실행
            commands.forEach((command, index) => {
                if (command.trim()) {
                    // 각 명령어 사이에 약간의 지연을 두어 순차 실행
                    setTimeout(() => {
                        terminal.sendText(command.trim());
                        console.log(`[TerminalManager] Executed bash command: ${command.trim()}`);
                    }, index * 1500); // 1.5초 간격으로 실행
                }
            });
        }, 500); // 터미널 준비 대기

        // 사용자에게 실행 시작 알림
        vscode.window.showInformationMessage(`🚀 ${commands.length}개의 bash 명령어를 실행합니다...`);
        
    } catch (error) {
        console.error('[TerminalManager] Error executing bash commands:', error);
        vscode.window.showErrorMessage(`터미널 실행 중 오류가 발생했습니다: ${error}`);
    }
}

/**
 * 터미널을 정리합니다.
 */
export function disposeTerminal(): void {
    if (_codePilotTerminal) {
        _codePilotTerminal.dispose();
        _codePilotTerminal = undefined;
    }
}
