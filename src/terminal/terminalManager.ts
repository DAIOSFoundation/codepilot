import * as vscode from 'vscode';

let _codePilotTerminal: vscode.Terminal | undefined;
let _isWaitingForInput = false;
let _pendingCommands: string[] = [];
let _currentCommandIndex = 0;

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
 * 대화형 명령어인지 확인합니다.
 */
function isInteractiveCommand(command: string): boolean {
    const interactiveCommands = [
        'npm create',
        'npx create',
        'yarn create',
        'create-react-app',
        'vue create',
        'ng new',
        'dotnet new',
        'cargo new',
        'flutter create',
        'rails new',
        'django-admin startproject',
        'composer create-project',
        'git clone',
        'ssh',
        'mysql',
        'psql',
        'mongo',
        'redis-cli',
        'docker run -it',
        'docker exec -it'
    ];
    
    return interactiveCommands.some(interactiveCmd => 
        command.toLowerCase().includes(interactiveCmd.toLowerCase())
    );
}

/**
 * 대화형 명령어에 대한 기본 응답을 제공합니다.
 */
function getDefaultResponseForCommand(command: string): string | null {
    const lowerCommand = command.toLowerCase();
    
    // npm create 명령어들
    if (lowerCommand.includes('npm create vite')) {
        return 'y'; // 기본값으로 yes
    }
    if (lowerCommand.includes('npm create react-app') || lowerCommand.includes('npx create-react-app')) {
        return 'y';
    }
    if (lowerCommand.includes('npm create vue')) {
        return 'y';
    }
    if (lowerCommand.includes('npm create next')) {
        return 'y';
    }
    
    // git clone
    if (lowerCommand.includes('git clone')) {
        return ''; // Enter 키만 누름
    }
    
    // SSH 연결
    if (lowerCommand.includes('ssh')) {
        return 'yes'; // 호스트 키 확인
    }
    
    // Docker 대화형 명령어
    if (lowerCommand.includes('docker run -it') || lowerCommand.includes('docker exec -it')) {
        return 'exit'; // 컨테이너에서 빠져나옴
    }
    
    return null;
}

/**
 * 대화형 명령어를 처리합니다.
 */
async function handleInteractiveCommand(command: string): Promise<void> {
    const terminal = getCodePilotTerminal();
    
    // 터미널이 활성화되어 있지 않으면 활성화
    if (!terminal.state.isInteractedWith) {
        terminal.show();
    }
    
    // 명령어 실행
    terminal.sendText(command);
    
    // 대화형 명령어인 경우 기본 응답 제공
    if (isInteractiveCommand(command)) {
        const defaultResponse = getDefaultResponseForCommand(command);
        
        if (defaultResponse !== null) {
            // 잠시 대기 후 응답 전송
            setTimeout(() => {
                terminal.sendText(defaultResponse);
                console.log(`[TerminalManager] Sent default response for interactive command: ${defaultResponse}`);
            }, 2000); // 2초 대기
        }
        
        // 사용자에게 대화형 명령어임을 알림
        vscode.window.showInformationMessage(
            `CodePilot: 대화형 명령어 실행됨 - ${command}\n기본 응답이 자동으로 제공됩니다.`,
            { modal: false }
        );
    } else {
        // 일반 명령어
        vscode.window.showInformationMessage(`CodePilot: Bash 명령어 실행됨 - ${command}`);
    }
    
    console.log(`[TerminalManager] Executed bash command: ${command}`);
}

/**
 * 명령어 시퀀스를 순차적으로 실행합니다.
 */
async function executeCommandSequence(commands: string[]): Promise<void> {
    _pendingCommands = [...commands];
    _currentCommandIndex = 0;
    
    while (_currentCommandIndex < _pendingCommands.length) {
        const command = _pendingCommands[_currentCommandIndex];
        await handleInteractiveCommand(command);
        
        // 대화형 명령어인 경우 더 긴 대기 시간
        if (isInteractiveCommand(command)) {
            await new Promise(resolve => setTimeout(resolve, 5000)); // 5초 대기
        } else {
            await new Promise(resolve => setTimeout(resolve, 2000)); // 2초 대기
        }
        
        _currentCommandIndex++;
    }
    
    // 시퀀스 완료 후 상태 초기화
    _pendingCommands = [];
    _currentCommandIndex = 0;
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
                    executedCommands.push(command.trim());
                }
            }
        }
    }
    
    // 명령어들을 순차적으로 실행
    if (executedCommands.length > 0) {
        executeCommandSequence(executedCommands);
    }
    
    return executedCommands;
}

/**
 * 단일 bash 명령어를 터미널에서 실행합니다.
 */
export function executeBashCommand(command: string): void {
    handleInteractiveCommand(command);
}

/**
 * LLM 응답에서 bash 명령어가 포함되어 있는지 확인합니다.
 */
export function hasBashCommands(llmResponse: string): boolean {
    const bashBlockRegex = /```bash\s*\n([\s\S]*?)\n```/g;
    return bashBlockRegex.test(llmResponse);
}

/**
 * 현재 실행 중인 명령어 시퀀스의 상태를 확인합니다.
 */
export function getCommandSequenceStatus(): { isRunning: boolean; currentIndex: number; totalCommands: number } {
    return {
        isRunning: _pendingCommands.length > 0,
        currentIndex: _currentCommandIndex,
        totalCommands: _pendingCommands.length
    };
}

/**
 * 실행 중인 명령어 시퀀스를 중단합니다.
 */
export function stopCommandSequence(): void {
    _pendingCommands = [];
    _currentCommandIndex = 0;
    _isWaitingForInput = false;
    
    vscode.window.showInformationMessage('CodePilot: 명령어 시퀀스가 중단되었습니다.');
}