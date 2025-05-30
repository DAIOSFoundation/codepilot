import DOMPurify from 'dompurify';
import { addCopyButtonsToCodeBlocks } from './codeCopy.js';


console.log("✅ chat.js loaded");

// acquireVsCodeApi는 웹뷰 환경에서 전역으로 사용 가능합니다.
const vscode = acquireVsCodeApi();


// DOM 요소 참조
const sendButton = document.getElementById('send-button');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');

// 로딩 버블 엘리먼트를 저장할 변수
let thinkingBubbleElement = null;


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
    chatMessages.scrollTop = chatMessages.scrollHeight;
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
    chatMessages.scrollTop = chatMessages.scrollHeight;
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
function displayCodePilotMessage(markdownText) {
    if (!chatMessages) return;

    const messageContainer = document.createElement('div');
    messageContainer.classList.add('codepilot-message-container');

    const bubbleElement = document.createElement('div');
    bubbleElement.classList.add('message-bubble');
    // chat.html에서 message-bubble에 display: flex; flex-direction: column; 이 추가되어 있어야 합니다.

    // --- Markdown 텍스트를 코드 블록 기준으로 분할 및 조합 ---
    // 코드 블록 정규식 (```언어명\n ... ```)
    const codeBlockRegex = /```(\S*?)\n([\s\S]*?)```/g;
    let lastIndex = 0;
    const tempHtmlElements = document.createElement('div'); // 임시 컨테이너에 HTML 요소들을 직접 추가

    let match;
    // 모든 코드 블록을 순회하며 일반 텍스트와 코드 블록을 분리 처리
    while ((match = codeBlockRegex.exec(markdownText)) !== null) {
        const precedingText = markdownText.substring(lastIndex, match.index);
        const codeBlockFullMatch = match[0]; // ```...``` 전체
        const lang = match[1]; // 언어명
        const codeContent = match[2]; // 코드 내용

        // 1. 코드 블록 이전 텍스트 처리 (Markdown 포맷 적용)
        // renderBasicMarkdown 함수를 사용하여 일반 텍스트 부분만 Markdown 렌더링
        // 이스케이프 처리된 HTML 문자열을 반환하므로 DOMPurify 필요 없음 (renderBasicMarkdown 내부에서 이미 sanitize)
        const processedPrecedingHtml = renderBasicMarkdown(precedingText);
        tempHtmlElements.innerHTML += processedPrecedingHtml; // innerHTML 사용 (DOMPurify는 renderBasicMarkdown 내부에서 수행)

        // 2. 코드 블록 처리 (Markdown 포맷 미적용, 원본 텍스트 그대로)
        // CodePilot 응답의 코드 블록 내 내용은 Markdown 포맷을 적용하지 않고 그대로 출력
        // <pre> 태그로 감싸되, 내용은 DOMPurify.sanitize의 RETURN_TYPE: 'text'로 순수 텍스트화
        const preElement = document.createElement('pre');
        const codeElement = document.createElement('code');
        codeElement.textContent = DOMPurify.sanitize(codeContent, { RETURN_TYPE: 'text' }); // 순수 텍스트만 삽입
        if (lang) { // 언어명 클래스 유지 (스타일링 위해)
            codeElement.classList.add(`language-${lang.trim()}`);
        }
        preElement.appendChild(codeElement);
        tempHtmlElements.appendChild(preElement); // DOM 요소로 직접 추가

        lastIndex = codeBlockRegex.lastIndex; // 다음 검색 시작 위치 업데이트
    }

    // 3. 마지막 코드 블록 이후의 텍스트 처리 (Markdown 포맷 적용)
    const remainingText = markdownText.substring(lastIndex);
    const processedRemainingHtml = renderBasicMarkdown(remainingText);
    tempHtmlElements.innerHTML += processedRemainingHtml; // innerHTML 사용 (DOMPurify는 renderBasicMarkdown 내부에서 수행)

    // tempHtmlElements의 모든 자식 노드를 bubbleElement로 옮깁니다.
    // 이렇게 하면 이벤트 리스너가 연결된 요소들을 실제 DOM에 추가하게 됩니다.
    while (tempHtmlElements.firstChild) {
        bubbleElement.appendChild(tempHtmlElements.firstChild);
    }
    // --- 조합 끝 ---

    // 메시지 컨테이너에 버블 추가
    messageContainer.appendChild(bubbleElement);

    // CodeCopy 기능 함수 호출
    // addCopyButtonsToCodeBlocks 함수는 <pre><code> 구조를 찾아 버튼을 추가하므로,
    // 위에서 <pre><code>를 생성했으면 이 함수가 작동하여 복사 버튼을 추가할 것입니다.
    addCopyButtonsToCodeBlocks(bubbleElement); // <-- codeCopy.js에서 임포트된 함수 호출

    // 완성된 messageContainer를 실제 메시지 목록에 추가
    chatMessages.appendChild(messageContainer);

    // 스크롤을 항상 맨 아래로 이동
    chatMessages.scrollTop = chatMessages.scrollHeight;
}
// <-- 수정 끝 -->


// 마크다운 렌더링 함수 (자체 구현)
// 이 함수는 displayCodePilotMessage 함수 내부에서 일반 텍스트 부분에 대한 Markdown 포맷팅에 사용됩니다.
// 코드 블록은 여기서 처리하지 않습니다.
function renderBasicMarkdown(markdownText) {
    let htmlText = markdownText;

    // --- 코드 블록 (```) 처리 ---
    // 이 함수는 '코드 블록이 아닌' 일반 텍스트에 대해서만 Markdown을 렌더링하도록 설계되었으므로,
    // 코드 블록 자체는 여기서 제거하여 다른 Markdown 파싱에 영향을 주지 않도록 합니다.
    const codeBlockRegex = /```[\s\S]*?```/g;
    htmlText = htmlText.replace(codeBlockRegex, ''); // 코드 블록을 제거

    // --- 인라인 코드 (`) 처리 ---
    const inlineCodeRegex = /`([^`]+?)`/g;
    htmlText = htmlText.replace(inlineCodeRegex, '<code>$1</code>');


    // --- 헤더 (#, ## 등) 처리 ---
    const headerRegex = /^(#+)\s*(.*)$/gm;
    htmlText = htmlText.replace(headerRegex, (match, hashes, content) => {
        const level = Math.min(hashes.length, 6);
        return `<h${level}>${content.trim()}</h${level}>`;
    });


    // --- 굵게 (**, __) 처리 ---
    const simpleBoldRegex = /(\*\*|__)(.+?)\1/g;
    htmlText = htmlText.replace(simpleBoldRegex, '<strong>$2</strong>');


    // --- 기울임꼴 (*, _) 처리 ---
    const simpleItalicRegex = /(\*|_)(.+?)\1/g;
    htmlText = htmlText.replace(simpleItalicRegex, '<em>$2</em>');


    // --- 목록 (- , *, +) 처리 (자체 구현) ---
    const listItemRegex = /^\s*([-*+])\s+(.*)$/gm;
    const lines = htmlText.split('\n');
    let processedLines = [];
    let inList = false;
    let listType = null;
    let currentListContent = [];

    for (const line of lines) {
        const listItemMatch = line.match(/^\s*([-*+])\s+(.*)$/);
        if (listItemMatch) {
             const marker = listItemMatch[1];
            const itemContent = listItemMatch[2].trim();

            if (!inList) {
                if (processedLines.length > 0 && processedLines[processedLines.length - 1].endsWith('</ul>')) {
                } else if (currentListContent.length > 0) {
                     processedLines.push('<ul>' + currentListContent.join('') + '</ul>');
                     currentListContent = [];
                }
                if (marker === '-') { listType = 'ul'; processedLines.push('<ul>'); }
                else if (marker === '*' && !line.match(/^\s*\d+\.\s/)) { listType = 'ul'; processedLines.push('<ul>'); }
                else if (marker === '+' && !line.match(/^\s*\d+\.\s/)) { listType = 'ul'; processedLines.push('<ul>'); }
                else if (line.match(/^\s*\d+\.\s/)) { listType = 'ol'; processedLines.push('<ol>'); }
                 else { listType = 'ul'; processedLines.push('<ul>'); }
                inList = true;
            } else if (
                 (listType === 'ul' && (marker === '-' || marker === '*' || marker === '+')) ||
                 (listType === 'ol' && line.match(/^\s*\d+\.\s/))
            ) {
                 console.warn("Detected potential list continuation or marker change mid-list. renderBasicMarkdown might not handle complex lists correctly.");
            } else {
                 if (inList) {
                     if (currentListContent.length > 0) { processedLines.push(currentListContent.join('')); currentListContent = []; }
                     if (listType === 'ul') processedLines.push('</ul>'); else if (listType === 'ol') processedLines.push('</ol>');
                     inList = false; listType = null;
                 }
                 if (line.trim() !== '') { processedLines.push(line); }
                 continue;
            }
            currentListContent.push(`<li>${itemContent}</li>`);
        } else {
            if (inList) {
                 if (currentListContent.length > 0) { processedLines.push(currentListContent.join('')); currentListContent = []; }
                 if (listType === 'ul') processedLines.push('</ul>'); else if (listType === 'ol') processedLines.push('</ol>');
                 inList = false; listType = null;
            }
            if (line.trim() !== '') { processedLines.push(line); }
        }
    }
    if (inList) {
        if (currentListContent.length > 0) { processedLines.push(currentListContent.join('')); }
        if (listType === 'ul') processedLines.push('</ul>'); else if (listType === 'ol') processedLines.push('</ol>');
    }
    htmlText = processedLines.join('\n');

    // --- 처리 링크 ([text](url)) ---
    const linkRegex = /\[([^\]]+?)\]\(([^)]+?)\)/g;
    htmlText = htmlText.replace(linkRegex, '<a href="$2" target="_blank">$1</a>');

    // --- 처리 단락 및 줄바꿈 ---
    // 이 함수는 '일반 텍스트' 부분의 Markdown을 처리합니다.
    // 코드 블록은 이미 displayCodePilotMessage에서 분리되었으므로 여기서는 신경 쓰지 않습니다.
    // 블록 요소들을 임시로 치환하는 로직을 제거했습니다.
    htmlText = htmlText.split(/\n{2,}/).map(paragraph => {
        if (paragraph.trim() === '') return ''; // 빈 단락 스킵

        // 단일 줄바꿈을 <br>로 변환
        paragraph = paragraph.replace(/\n/g, '<br>');

        return `<p>${paragraph}</p>`; // <p> 태그로 감싸기
    }).join('');

    // DOMPurify는 displayCodePilotMessage에서 최종 정제합니다.
    return htmlText;
}


// TODO: 필요한 다른 Webview 로직 추가


// --- 웹뷰 메시지 핸들러에서 호출되는 함수들을 전역 window 객체에 할당 ---
// Webpack UMD 번들에서 전역 접근을 가능하게 합니다.
window.displayUserMessage = displayUserMessage;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.displayCodePilotMessage = displayCodePilotMessage;
// renderBasicMarkdown은 displayCodePilotMessage 내부에서만 사용되므로 전역 노출 필요 없음.