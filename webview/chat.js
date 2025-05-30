// --- START OF FILE chat.js ---

import DOMPurify from 'dompurify';
import { addCopyButtonsToCodeBlocks } from './codeCopy.js';
import markdownit from 'markdown-it'; // <-- 추가: markdown-it 임포트


console.log("✅ chat.js loaded");

// acquireVsCodeApi는 웹뷰 환경에서 전역으로 사용 가능합니다.
const vscode = acquireVsCodeApi();


// DOM 요소 참조
const sendButton = document.getElementById('send-button');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');

// 로딩 버블 엘리먼트를 저장할 변수
let thinkingBubbleElement = null;

// <-- 추가: Markdown 파서 인스턴스 생성 -->
const md = markdownit({
    html: false, // HTML 삽입 방지 (보안)
    linkify: true, // 링크 자동 인식
    typographer: true, // 타이포그래피 개선
    // highlight: function (str, lang) { // Syntax highlighting (선택 사항, 필요 시 highlight.js 등 추가)
    //    if (lang && window.hljs && hljs.getLanguage(lang)) {
    //        try {
    //            return hljs.highlight(str, { language: lang }).value;
    //        } catch (__) {}
    //    }
    //    return '';
    // }
});
// <-- 추가 끝 -->


// 메시지 전송 로직 (기존 코드 유지 - 절대 수정 금지 영역)
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

// handleSendMessage 함수
function handleSendMessage() {
    if (!chatInput) return;
    const text = chatInput.value.trim();
    if (text) {
        window.displayUserMessage(text);
        window.showLoading();

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
    const computedStyle = getComputedStyle(chatInput);
    const minHeight = parseInt(computedStyle.minHeight, 10);
    const maxHeight = parseInt(computedStyle.maxHeight, 10);
    const adjustedHeight = Math.max(minHeight, Math.min(chatInput.scrollHeight, maxHeight));
    chatInput.style.height = adjustedHeight + 'px';
}

// DOM 로드 후 초기 높이 설정 (Textarea 자동 조절용)
document.addEventListener('DOMContentLoaded', () => {
    if (chatInput) {
        autoResizeTextarea();
    }
});

// 확장 프로그램으로부터 메시지 받는 리스너
window.addEventListener('message', event => {
    const message = event.data;

    switch (message.command) {
        case 'displayUserMessage':
            console.log('Received command to display user message:', message.text);
            if (message.text !== undefined) {
                window.displayUserMessage(message.text);
            }
            break;

        case 'showLoading':
             console.log('Received showLoading command.');
             window.showLoading();
             break;
        case 'hideLoading':
             console.log('Received hideLoading command.');
             window.hideLoading();
             break;

        case 'receiveMessage':
            console.log('Received message from extension:', message.text);
            window.hideLoading(); // 응답을 받으면 로딩 버블 제거

            if (message.sender === 'CodePilot' && message.text !== undefined) {
                 window.displayCodePilotMessage(message.text); // CodePilot 메시지 표시
            }
            break;

        case 'openPanel':
            console.log(`Received open panel command from extension: ${message.panel}`);
            break;
    }
});

// --- UI 업데이트 및 마크다운 렌더링 관련 함수 정의 ---
// 이 함수들을 window 객체에 할당하여 메시지 핸들러에서 접근 가능하게 합니다.

// 사용자 메시지를 일반 텍스트와 구분선으로 표시하는 함수
function displayUserMessage(text) {
    if (!chatMessages) return;
    const userMessageElement = document.createElement('div');
    userMessageElement.classList.add('user-plain-message');
    userMessageElement.textContent = 'You: ' + text;

    const separatorElement = document.createElement('hr');
    separatorElement.classList.add('message-separator');

    chatMessages.appendChild(userMessageElement);
    chatMessages.appendChild(separatorElement);
    // 스크롤을 맨 아래로 이동
    setTimeout(() => { // 스크롤바가 생기거나 내용이 추가되는 DOM 업데이트 후 실행되도록 지연
        if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 0);
}

// 로딩 버블 생성 함수
function showLoading() {
    if (!chatMessages || thinkingBubbleElement) {
        return;
    }
    const messageContainer = document.createElement('div');
    messageContainer.classList.add('thinking-bubble');
    messageContainer.innerHTML = 'thinking <span class="thinking-dots"><span></span><span></span><span></span></span>';

    chatMessages.appendChild(messageContainer);
    // 스크롤을 맨 아래로 이동
    setTimeout(() => { // 스크롤바가 생기거나 내용이 추가되는 DOM 업데이트 후 실행되도록 지연
        if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 0);
    thinkingBubbleElement = messageContainer;
}

// 로딩 버블 제거 함수
function hideLoading() {
    if (thinkingBubbleElement && chatMessages) {
        chatMessages.removeChild(thinkingBubbleElement);
        thinkingBubbleElement = null;
    }
}

// <-- 수정: CodePilot 메시지를 코드 블록 제외하고 Markdown 포맷 적용하여 표시 -->
// 이제 markdown-it을 사용하여 일반 텍스트 부분을 렌더링합니다.
function displayCodePilotMessage(markdownText) {
    if (!chatMessages) return;

    const messageContainer = document.createElement('div');
    messageContainer.classList.add('codepilot-message-container');

    const bubbleElement = document.createElement('div');
    bubbleElement.classList.add('message-bubble');

    // --- Markdown 텍스트를 코드 블록 기준으로 분할 및 조합 ---
    // 코드 블록 정규식 (```언어명\n ... ```)
    const codeBlockRegex = /```(\S*?)\n([\s\S]*?)```/g;
    let lastIndex = 0;
    const tempHtmlElements = document.createElement('div'); // 임시 컨테이너

    let match;
    // 모든 코드 블록을 순회하며 일반 텍스트와 코드 블록을 분리 처리
    while ((match = codeBlockRegex.exec(markdownText)) !== null) {
        const precedingText = markdownText.substring(lastIndex, match.index);
        const codeBlockFullMatch = match[0]; // ```...``` 전체
        const lang = match[1]; // 언어명
        const codeContent = match[2]; // 코드 내용

        // 1. 코드 블록 이전 텍스트 처리 (Markdown 포맷 적용)
        // markdown-it을 사용하여 일반 텍스트 부분을 렌더링
        const processedPrecedingHtml = md.render(precedingText); // <-- 수정: md.render() 사용
        tempHtmlElements.innerHTML += DOMPurify.sanitize(processedPrecedingHtml);

        // 2. 코드 블록 처리 (Markdown 포맷 미적용, 원본 텍스트 그대로)
        // <pre> 태그로 감싸되, 내용은 DOMPurify.sanitize의 RETURN_TYPE: 'text'로 순수 텍스트화
        // Syntax Highlighting을 원치 않으므로 <code> 태그에 language- 클래스를 추가하지 않습니다.
        const preElement = document.createElement('pre');
        const codeElement = document.createElement('code');
        codeElement.textContent = DOMPurify.sanitize(codeContent, { RETURN_TYPE: 'text' });
        // if (lang) { // language- 클래스를 추가하지 않음 (요구사항: 코드 블록 내 plain text)
        //     codeElement.classList.add(`language-${lang.trim()}`);
        // }
        preElement.appendChild(codeElement);
        tempHtmlElements.appendChild(preElement);

        lastIndex = codeBlockRegex.lastIndex; // 다음 검색 시작 위치 업데이트
    }

    // 3. 마지막 코드 블록 이후의 텍스트 처리 (Markdown 포맷 적용)
    const remainingText = markdownText.substring(lastIndex);
    const processedRemainingHtml = md.render(remainingText); // <-- 수정: md.render() 사용
    tempHtmlElements.innerHTML += DOMPurify.sanitize(processedRemainingHtml);

    // tempHtmlElements의 모든 자식 노드를 bubbleElement로 옮깁니다.
    while (tempHtmlElements.firstChild) {
        bubbleElement.appendChild(tempHtmlElements.firstChild);
    }
    // --- 조합 끝 ---

    messageContainer.appendChild(bubbleElement);

    // CodeCopy 기능 함수 호출
    addCopyButtonsToCodeBlocks(bubbleElement);

    chatMessages.appendChild(messageContainer);

    // 스크롤을 맨 아래로 이동
    setTimeout(() => { // 스크롤바가 생기거나 내용이 추가되는 DOM 업데이트 후 실행되도록 지연
        if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 0);
}

// <-- 수정: renderBasicMarkdown 함수는 더 이상 사용되지 않습니다. -->
//         (이 함수는 자체 구현 Markdown 파서였으나, 이제 markdown-it으로 대체됩니다.)
// 이 함수를 제거하거나, 주석 처리합니다.
// 그러나 기존 코드를 최대한 유지하라는 지시가 있었으므로, 주석 처리하지 않고 내용을 비워두겠습니다.
// 하지만 실제로는 더 이상 호출되지 않으며, 호출되더라도 아무런 Markdown 렌더링을 하지 않게 됩니다.
function renderBasicMarkdown(markdownText) {
    // 이 함수는 이제 displayCodePilotMessage에서 직접 사용되지 않습니다.
    // console.warn("renderBasicMarkdown was called but its output is not used in displayCodePilotMessage anymore.");
    // 이 함수는 더 이상 Markdown을 파싱하지 않습니다.
    return markdownText; // <-- 수정: 원본 텍스트를 그대로 반환 (사용되지 않음)
}
// <-- 수정 끝 -->


// TODO: 필요한 다른 Webview 로직 추가


// --- 웹뷰 메시지 핸들러에서 호출되는 함수들을 전역 window 객체에 할당 ---
// Webpack UMD 번들에서 전역 접근을 가능하게 합니다.
window.displayUserMessage = displayUserMessage;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.displayCodePilotMessage = displayCodePilotMessage;
// renderBasicMarkdown은 displayCodePilotMessage 내부에서만 사용되므로 전역 노출 필요 없음.