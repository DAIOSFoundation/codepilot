// 클립보드 복사 기능을 위한 헬퍼 함수
// Webview에서는 navigator.clipboard 사용 가능
async function copyToClipboard(text) {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            console.log('Code copied to clipboard!');
            return true; // 성공
        } else {
            console.warn('Clipboard API not available.');
            // Fallback 방법 (document.execCommand('copy'))은 보안상 권장되지 않아 생략
            return false; // 실패
        }
    } catch (err) {
        console.error('Failed to copy code:', err);
        return false; // 실패
    }
}

// 복사 버튼을 생성하는 헬퍼 함수
function createCopyButton() {
    const button = document.createElement('button');
    button.classList.add('copy-code-button');
    button.textContent = 'Copy'; // 버튼 텍스트
    button.title = 'Copy code to clipboard'; // 툴팁

    return button;
}

// 단일 복사 버튼에 이벤트 리스너를 등록하는 함수
// 클릭된 버튼과 해당 코드 엘리먼트를 연결합니다.
function attachCopyButtonListener(button, codeElement) {
    button.addEventListener('click', async () => {
        const codeText = codeElement.textContent || '';
        const success = await copyToClipboard(codeText);

        // 복사 성공/실패 시 버튼 텍스트 변경 피드백
        const originalText = button.textContent;
        if (success) {
            button.textContent = 'Copied!';
        } else {
            button.textContent = 'Failed!';
        }
        setTimeout(() => {
            button.textContent = originalText;
        }, 2000); // 2초 후 복원

        // TODO: VS Code API를 통해 사용자에게 알림 표시 고려 (선택 사항)
        // 웹뷰에서 확장으로 메시지를 보내 알림 표시를 요청하는 방식 사용
        // 예: vscode.postMessage({ command: 'showInfoNotification', message: 'Code copied!' });
    });
}

// CodePilot 메시지 버블 내부에서 코드 블록을 찾아 복사 버튼을 추가하는 메인 함수
// 이 함수는 chat.js의 displayCodePilotMessage 함수에서 호출됩니다.
// 인자로 CodePilot 메시지의 bubbleElement (DOM 요소)를 받습니다.
export function addCopyButtonsToCodeBlocks(bubbleElement) { // <-- export 키워드 유지
    if (!bubbleElement) return;

    // 버블 내부에서 모든 <pre> 태그 (코드 블록)를 찾습니다.
    // Markdown 파싱 결과 HTML 내에 <pre><code> 구조가 있다고 가정합니다.
    const preElements = bubbleElement.querySelectorAll('pre');

    preElements.forEach(preElement => {
        // <pre> 태그 안에 <code> 태그가 있는지 확인
        const codeElement = preElement.querySelector('code');
        if (codeElement) {
            // 복사 버튼 생성
            const copyButton = createCopyButton();

            // 버튼을 <pre> 요소 바로 뒤(형제)로 삽입합니다.
            // insertAdjacentElement는 DOM에 연결된 요소에 대해 사용 가능합니다.
            // displayCodePilotMessage에서 innerHTML 설정 후 이 함수가 호출되므로,
            // bubbleElement와 그 자식들 (<pre> 등)은 이미 DOM에 연결되어 있거나
            // 최소한 메모리상에서 부모-자식 관계가 형성된 상태입니다.
            preElement.insertAdjacentElement('afterend', copyButton);

            // 새로 생성된 버튼에 클릭 이벤트 리스너 등록
            attachCopyButtonListener(copyButton, codeElement);
        }
    });
    console.log(`[codeCopy.js] Added copy buttons to ${preElements.length} code blocks.`);
}


// TODO: 필요하다면 이 파일에서 VS Code API와 통신하는 함수 추가 (예: 알림 표시 요청)
// 현재는 attachCopyButtonListener 내부에서 직접 navigator.clipboard를 사용하므로 필요 없을 수 있습니다.