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