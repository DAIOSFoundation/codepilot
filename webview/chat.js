import DOMPurify from 'dompurify';

// acquireVsCodeApi는 웹뷰 환경에서 전역으로 사용 가능합니다.
const vscode = acquireVsCodeApi();

// DOM 요소 참조
const sendButton = document.getElementById('send-button');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');

// 로딩 버블 엘리먼트를 저장할 변수
let thinkingBubbleElement = null;


// 메시지 전송 로직
if (sendButton && chatInput) {
    sendButton.addEventListener('click', handleSendMessage);

    chatInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            setTimeout(() => {
                handleSendMessage();
            }, 0);
        }
    });

    chatInput.addEventListener('input', autoResizeTextarea);
}

function handleSendMessage() {
    if (!chatInput) return;
    const text = chatInput.value.trim();
    if (text) {
        displayUserMessage(text);

        // <-- 추가: 메시지 전송 시 로딩 버블 표시 요청 -->
        // 확장 프로그램에서 로딩 상태를 관리하므로, 여기서는 확장으로 로딩 표시를 요청하는 메시지를 보낼 필요 없습니다.
        // 확장 프로그램이 Gemini 호출 전에 showLoading 메시지를 Webview로 보낼 것입니다.
        // showLoading(); // 이 함수는 확장으로부터 메시지를 받아 호출됩니다.


        vscode.postMessage({
            command: 'sendMessage',
            text: text
        });

        chatInput.value = '';
        chatInput.style.height = 'auto';
        autoResizeTextarea();
        chatInput.focus();
    }
}

// Textarea 높이 자동 조절 함수
function autoResizeTextarea() {
    if (!chatInput) return;
    chatInput.style.height = 'auto';
    chatInput.style.height = chatInput.scrollHeight + 'px';
}

// DOM 로드 후 초기 높이 설정
document.addEventListener('DOMContentLoaded', () => {
    if (chatInput) {
        autoResizeTextarea();
    }
});

// 확장 프로그램으로부터 메시지 받는 로직
window.addEventListener('message', event => {
    const message = event.data;

    switch (message.command) {
        case 'displayUserMessage':
            console.log('Received command to display user message:', message.text);
            displayUserMessage(message.text);
            break;

        // <-- 추가: 로딩 상태 메시지 처리 -->
        case 'showLoading':
             console.log('Received showLoading command.');
             showLoading(); // 로딩 버블 표시
             break;
        case 'hideLoading':
             console.log('Received hideLoading command.');
             hideLoading(); // 로딩 버블 제거
             break;
        // <-- 추가 끝 -->

        case 'receiveMessage':
            console.log('Received message from extension:', message.text);
            // <-- 추가: 응답 메시지 수신 시 로딩 버블 제거 (showLoading/hideLoading 메시지와 함께 사용) -->
             // hideLoading(); // 응답과 함께 로딩 버블 제거 메시지를 받거나, 응답 직전에 hideLoading을 받으면 여기서 호출
            // <-- 추가 끝 -->
            if (message.sender === 'CodePilot') {
                displayCodePilotMessage(message.text);
            }
            break;
    }
});

function displayUserMessage(text) {
    const userMessageElement = document.createElement('div');
    userMessageElement.classList.add('user-plain-message');
    userMessageElement.textContent = 'You: ' + text;

    const separatorElement = document.createElement('hr');
    separatorElement.classList.add('message-separator');

    chatMessages.appendChild(userMessageElement);
    chatMessages.appendChild(separatorElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// <-- 추가: 로딩 버블 생성 함수 -->
function showLoading() {
    if (thinkingBubbleElement) {
        // 이미 로딩 버블이 있다면 새로 만들지 않음
        return;
    }
    const messageContainer = document.createElement('div');
    // thinking-bubble 클래스만 사용하여 간결하게 표시
    messageContainer.classList.add('thinking-bubble');
    // 로딩 표시 텍스트 또는 애니메이션 추가
    messageContainer.innerHTML = 'thinking <span class="thinking-dots"><span></span><span></span><span></span></span>'; // CSS 애니메이션 사용

    chatMessages.appendChild(messageContainer);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    thinkingBubbleElement = messageContainer; // 엘리먼트 참조 저장
}
// <-- 로딩 버블 제거 함수 -->
function hideLoading() {
    if (thinkingBubbleElement && chatMessages) {
        chatMessages.removeChild(thinkingBubbleElement);
        thinkingBubbleElement = null; // 참조 초기화
    }
}

// 마크다운 렌더링 함수 (자체 구현)
function renderBasicMarkdown(markdownText) {
    let htmlText = markdownText;

    // 코드 블록 (```) 처리 - 가장 먼저 처리
    const codeBlockRegex = /```([\s\S]*?)```/g;
    htmlText = htmlText.replace(codeBlockRegex, (match, codeContent) => {
        // 코드 블록 내용을 안전하게 이스케이프
        const escapedCodeContent = codeContent
            .replace(/&/g, '&')
            .replace(/</g, '<')
            .replace(/>/g, '>');
        return `<pre><code>${escapedCodeContent}</code></pre>`;
    });

     // 인라인 코드 (`) 처리
    const inlineCodeRegex = /`([^`]+?)`/g;
    htmlText = htmlText.replace(inlineCodeRegex, '<code>$1</code>');


    // 헤더 (#, ## 등) 처리 (줄 시작에 # 이 오는 경우만)
    const headerRegex = /^(#+)\s*(.*)$/gm;
    htmlText = htmlText.replace(headerRegex, (match, hashes, content) => {
        const level = Math.min(hashes.length, 6);
        return `<h${level}>${content.trim()}</h${level}>`;
    });


    // 굵게 (**, __) 처리
    const simpleBoldRegex = /(\*\*|__)(.+?)\1/g;
    htmlText = htmlText.replace(simpleBoldRegex, '<strong>$2</strong>');


    // 기울임꼴 (*, _) 처리
    const simpleItalicRegex = /(\*|_)(.+?)\1/g;
    htmlText = htmlText.replace(simpleItalicRegex, '<em>$2</em>');


    // 목록 (- , *) 처리 (줄 시작에 - 또는 * 가 오는 경우만, 간단한 형태)
    const listItemRegex = /^\s*[-*]\s+(.*)$/gm;
    const listItems = [];
    let tempHtml = htmlText; // 원본을 변경하지 않고 임시 변수 사용
    let match;
    while ((match = listItemRegex.exec(tempHtml)) !== null) {
        listItems.push(`<li>${match[1].trim()}</li>`);
    }

    if (listItems.length > 0) {
        htmlText = htmlText.replace(listItemRegex, '');
        htmlText += `<ul>${listItems.join('')}</ul>`;
    }


    // 링크 ([text](url)) 처리
    const linkRegex = /\[([^\]]+?)\]\(([^)]+?)\)/g;
    htmlText = htmlText.replace(linkRegex, '<a href="$2">$1</a>');


    // 줄바꿈 처리 (연속된 줄바꿈은 단락으로, 단일 줄바꿈은 <br>)
    htmlText = '<p>' + htmlText.replace(/\n{2,}/g, '</p><p>') + '</p>';
    htmlText = htmlText.replace(/\n/g, '<br>');


    // DOMPurify로 HTML 정제 (보안 강화)
    const sanitizedHtml = DOMPurify.sanitize(htmlText);

    return sanitizedHtml;
}

// CodePilot 메시지를 자체 구현 렌더링 함수로 표시
function displayCodePilotMessage(markdownText) {
    const messageContainer = document.createElement('div');
    messageContainer.classList.add('codepilot-message-container');

    const bubbleElement = document.createElement('div');
    bubbleElement.classList.add('message-bubble');

    const renderedHtml = renderBasicMarkdown(markdownText);
    bubbleElement.innerHTML = renderedHtml;

    messageContainer.appendChild(bubbleElement);
    chatMessages.appendChild(messageContainer);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}