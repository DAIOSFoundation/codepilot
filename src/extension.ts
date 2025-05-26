import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs'; // 파일 시스템 모듈 임포트

// 채팅 뷰를 제공하는 WebviewViewProvider 구현 클래스
class ChatViewProvider implements vscode.WebviewViewProvider {

    // package.json의 views[].id와 일치하는 고유 ID
    public static readonly viewId = 'codepilot.chatView';

    private _view?: vscode.WebviewView; // 현재 활성화된 WebviewView 인스턴스

    // 생성자에서 확장 프로그램의 URI를 받음 (리소스 로딩에 필요)
    constructor(private readonly _extensionUri: vscode.Uri) {}

    // Webview가 처음 로드되거나 상태가 복원될 때 VS Code에 의해 호출됨
    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView; // 인스턴스 저장

        // Webview 설정
        webviewView.webview.options = {
            // 스크립트 실행 활성화
            enableScripts: true,
            // 로컬 리소스 접근 허용 범위 설정
            localResourceRoots: [
                this._extensionUri, // 확장 프로그램 루트 폴더
                vscode.Uri.joinPath(this._extensionUri, 'webview') // webview 폴더
            ]
        };

        // Webview에 표시될 HTML 콘텐츠 설정
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Webview로부터 메시지 수신 리스너 등록
        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.command) {
                case 'sendMessage':
                    console.log('Received message from chat view:', data.text);
                    // TODO: 여기에 실제 LLM 호출 또는 채팅 로직 구현
                    // 예시: 간단한 응답 메시지 전송
                    const response = `Echo: "${data.text}"`;
                    this._view?.webview.postMessage({
                        command: 'receiveMessage',
                        text: response
                    });
                    break;
                // Webview에서 보낸 다른 메시지 처리
            }
        });

        // WebviewView가 닫힐 때 (Dispose) 레퍼런스 해제
         webviewView.onDidDispose(() => {
            console.log('Chat view disposed');
            this._view = undefined;
        });

        console.log('Chat View resolved');
    }

    // Webview에 로드할 HTML 콘텐츠를 생성하는 헬퍼 함수
    private _getHtmlForWebview(webview: vscode.Webview): string {
         // webview 폴더 내의 chat.html 파일 경로
         const htmlFilePath = vscode.Uri.joinPath(this._extensionUri, 'webview', 'chat.html');

         let htmlContent = '';
         try {
             // 파일 시스템에서 HTML 파일 내용 읽기 (동기 방식 사용, 비동기 처리도 가능)
             htmlContent = fs.readFileSync(htmlFilePath.fsPath, 'utf8');
         } catch (error: unknown) { // 컴파일 에러 수정: unknown 타입 처리
             console.error('Error reading chat.html:', error);
             // 에러 객체에서 메시지를 안전하게 추출
             const errorMessage = (typeof error === 'object' && error !== null && 'message' in error)
                                 ? (error as { message: string }).message // 객체이고 message 속성이 있다면 사용
                                 : String(error); // 그 외의 경우 문자열로 변환

             return `<h1>Error loading chat view</h1><p>${errorMessage}</p>`;
         }

        // TODO: Webview 내에서 필요한 리소스(CSS, JS 등)가 있다면
        // webview.asWebviewUri()를 사용하여 URI를 변환하고 HTML에 삽입해야 합니다.
        // 현재 chat.html은 인라인 스타일과 스크립트를 사용하므로 이 단계는 생략합니다.
        // 예시: const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'webview', 'styles.css'));
        //       htmlContent = htmlContent.replace('</head>', `<link href="${styleUri}" rel="stylesheet"></head>`);

         // TODO: 필요한 경우 HTML 템플릿에 데이터를 동적으로 삽입
         // 예시: htmlContent = htmlContent.replace('{{initialData}}', JSON.stringify({ ... }));

         return htmlContent;
    }
}


// Extension Activate 함수: 확장이 활성화될 때 호출됨
export function activate(context: vscode.ExtensionContext) {

    console.log('Congratulations, your extension "codepilot" is now active!');

    // 1. Chat Webview View Provider 등록
    // package.json의 contributes.views[].id ('codepilot.chatView')와 일치해야 함
    const chatViewProvider = new ChatViewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(ChatViewProvider.viewId, chatViewProvider)
    );

    // 2. Menu Command 등록
    // package.json의 contributes.commands[]에 정의된 명령어들
    const openSettingsPanelCommand = vscode.commands.registerCommand('codepilot.openSettingsPanel', () => {
        // 설정 패널을 여는 로직
        openBlankPanel(context.extensionUri, 'Settings', 'CodePilot Settings');
    });
    context.subscriptions.push(openSettingsPanelCommand);

    const openLicensePanelCommand = vscode.commands.registerCommand('codepilot.openLicensePanel', () => {
        // 라이선스 패널을 여는 로직
        openBlankPanel(context.extensionUri, 'License', 'CodePilot License Information');
    });
    context.subscriptions.push(openLicensePanelCommand);

    const openCustomizingPanelCommand = vscode.commands.registerCommand('codepilot.openCustomizingPanel', () => {
        // 커스터마이징 패널을 여는 로직
        openBlankPanel(context.extensionUri, 'Customizing', 'CodePilot Customization Options');
    });
    context.subscriptions.push(openCustomizingPanelCommand);

    // 기존 HelloWorld 명령어 (필요하다면 유지)
    const helloWorldCommand = vscode.commands.registerCommand('codepilot.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from CodePilot!');
    });
    context.subscriptions.push(helloWorldCommand);


     // TODO: 필요한 다른 기능 구현 (예: 에디터 내용 감지, 상태 바 항목 등)
     // context.subscriptions.push(...);
}

// Extension Deactivate 함수: 확장이 비활성화될 때 호출됨
export function deactivate() {
     console.log('Your extension "codepilot" is now deactivated.');
     // TODO: 필요한 정리 작업 수행 (예: 외부 리소스 해제)
}


// 빈 Webview 패널을 생성하고 HTML 파일을 로드하는 헬퍼 함수
function openBlankPanel(extensionUri: vscode.Uri, panelIdSuffix: string, panelTitle: string) {
     const panel = vscode.window.createWebviewPanel(
         `codepilot.${panelIdSuffix.toLowerCase()}`, // 패널의 내부 고유 ID
         panelTitle, // 사용자에게 표시될 패널 제목
         vscode.ViewColumn.One, // 패널을 열 위치 (예: 현재 활성 에디터 그룹)
         {
             enableScripts: true, // 스크립트 허용
             localResourceRoots: [ // 리소스 접근 허용 범위
                 extensionUri,
                 vscode.Uri.joinPath(extensionUri, 'webview')
             ]
         }
     );

     // webview 폴더 내의 blank.html 파일 경로
     const htmlFilePath = vscode.Uri.joinPath(extensionUri, 'webview', 'blank.html');
     let htmlContent = '';

      try {
         htmlContent = fs.readFileSync(htmlFilePath.fsPath, 'utf8');
      } catch (error: unknown) { // 컴파일 에러 수정: unknown 타입 처리
         console.error(`Error reading blank.html for ${panelTitle} panel:`, error);
          // 에러 객체에서 메시지를 안전하게 추출
         const errorMessage = (typeof error === 'object' && error !== null && 'message' in error)
                            ? (error as { message: string }).message // 객체이고 message 속성이 있다면 사용
                            : String(error); // 그 외의 경우 문자열로 변환

         htmlContent = `<h1>Error loading panel</h1><p>${errorMessage}</p>`;
      }

     // blank.html 내용 로드
     panel.webview.html = htmlContent;

     // 패널이 닫힐 때 호출될 리스너 등록 (필요하다면 정리 작업 수행)
     panel.onDidDispose(() => {
         console.log(`${panelTitle} panel closed`);
     }, null, []);

      // TODO: 필요하다면 blank panel과 확장 간의 메시지 통신 로직 구현
      // panel.webview.onDidReceiveMessage(data => { ... });
}