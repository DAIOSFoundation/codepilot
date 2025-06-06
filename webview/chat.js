import DOMPurify from 'dompurify';
import { addCopyButtonsToCodeBlocks } from './codeCopy.js';
import markdownit from 'markdown-it';


console.log("✅ chat.js loaded");

const vscode = acquireVsCodeApi();


const sendButton = document.getElementById('send-button');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages'); // 스크롤 컨테이너
const cleanHistoryButton = document.getElementById('clean-history-button'); // Clear History 버튼 참조
const cancelButton = document.getElementById('cancel-call-button'); // Cancel 버튼 참조


let thinkingBubbleElement = null;

const md = markdownit({
    html: false,
    linkify: true,
    typographer: true,
    // highlight: function (str, lang) { // Syntax highlighting (선택 사항, 필요 시 highlight.js 등 추가)
    //    if (lang && window.hljs && hljs.getLanguage(lang)) {
    //        try {
    //            return hljs.highlight(str, { language: lang }).value;
    //        } catch (__) {}
    //    }
    //    return '';
    // }
});


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

// Clean History 버튼 클릭 이벤트 리스너
if (cleanHistoryButton) {
    cleanHistoryButton.addEventListener('click', handleCleanHistory);
}

// Cancel 버튼 클릭 이벤트 리스너
if (cancelButton) {
    cancelButton.addEventListener('click', () => {
        console.log('Cancel button clicked. Sending cancel command to extension.');
        vscode.postMessage({ command: 'cancelGeminiCall' }); // 확장 프로그램으로 취소 명령 전송
        window.hideLoading(); // 로딩 애니메이션은 즉시 숨김
    });
}


function handleSendMessage() {
    if (!chatInput) return;
    const text = chatInput.value.trimEnd(); // trim() 대신 trimEnd() 사용 (기존 로직 유지)
    if (text) {
        window.displayUserMessage(text);
        window.showLoading(); // 로딩 애니메이션 표시

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

function autoResizeTextarea() {
    if (!chatInput) return;
    chatInput.style.height = 'auto';
    const computedStyle = getComputedStyle(chatInput);
    const minHeight = parseInt(computedStyle.minHeight, 10);
    const maxHeight = parseInt(computedStyle.maxHeight, 10);
    const adjustedHeight = Math.max(minHeight, Math.min(chatInput.scrollHeight, maxHeight));
    chatInput.style.height = adjustedHeight + 'px';
}

document.addEventListener('DOMContentLoaded', () => {
    if (chatInput) {
        autoResizeTextarea();
    }
    // 초기 로드 시 Cancel 버튼 비활성화
    if (cancelButton) {
        cancelButton.disabled = true;
    }
});

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
    // DOMPurify.sanitize(text)는 HTML 태그를 제거하고 안전한 텍스트를 반환합니다.
    // .replace(/\n/g, '<br>')를 사용하여 줄바꿈을 HTML <br> 태그로 변환합니다.
    userMessageElement.innerHTML = '🧇 ' + DOMPurify.sanitize(text).replace(/\n/g, '<br>');

    const separatorElement = document.createElement('hr');
    separatorElement.classList.add('message-separator');

    chatMessages.appendChild(userMessageElement);
    chatMessages.appendChild(separatorElement);
    // 스크롤을 맨 아래로 이동
    requestAnimationFrame(() => { // 브라우저 렌더링 직전에 스크롤 요청
        const lastChild = chatMessages.lastElementChild;
        if (lastChild) {
            lastChild.scrollIntoView({ behavior: 'smooth', block: 'end' }); // 부드럽게 맨 아래로 스크롤
        } else {
            chatMessages.scrollTop = chatMessages.scrollHeight; // Fallback
        }
    });
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
    thinkingBubbleElement = messageContainer; // 엘리먼트 참조 저장

    // 로딩 애니메이션이 보일 때 Clear 버튼 비활성화, Cancel 버튼 활성화
    if (cleanHistoryButton) {
        cleanHistoryButton.disabled = true;
    }
    if (cancelButton) {
        cancelButton.disabled = false;
    }

    // showLoading에서도 로딩 애니메이션이 보이도록 스크롤
    requestAnimationFrame(() => { // DOM 업데이트 후 스크롤 되도록 지연
        if (thinkingBubbleElement) {
            // thinkingBubbleElement의 하단이 뷰포트 하단에 맞춰지도록 스크롤
            thinkingBubbleElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
        } else if (chatMessages) { // Fallback
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    });
}

// 로딩 버블 제거 함수
function hideLoading() {
    if (thinkingBubbleElement && chatMessages) {
        chatMessages.removeChild(thinkingBubbleElement);
        thinkingBubbleElement = null;
    }
    // 로딩 애니메이션이 사라질 때 Clear 버튼 활성화, Cancel 버튼 비활성화
    if (cleanHistoryButton) {
        cleanHistoryButton.disabled = false;
    }
    if (cancelButton) {
        cancelButton.disabled = true;
    }
}

// 채팅 기록을 모두 삭제하는 함수
function handleCleanHistory() {
    if (chatMessages) {
        while (chatMessages.firstChild) {
            chatMessages.removeChild(chatMessages.firstChild);
        }
        thinkingBubbleElement = null; // 로딩 애니메이션 참조도 초기화
        console.log('Chat history cleared.');
    }
    // Clear 버튼 클릭 시 항상 초기 상태로 버튼들을 되돌립니다.
    if (cleanHistoryButton) {
        cleanHistoryButton.disabled = false;
    }
    if (cancelButton) {
        cancelButton.disabled = true;
    }
}

// <-- 수정: HTML 엔티티를 디코딩하는 헬퍼 함수 (재확인) -->
// 이 함수는 텍스트 내의 HTML 엔티티를 브라우저가 렌더링 가능한 문자로 디코딩합니다.
function decodeHtmlEntities(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.documentElement.textContent;
}

// CodePilot 메시지를 코드 블록 제외하고 Markdown 포맷 적용하여 표시
function displayCodePilotMessage(markdownText) {
    if (!chatMessages) return;

    const messageContainer = document.createElement('div');
    messageContainer.classList.add('codepilot-message-container');

    const bubbleElement = document.createElement('div');
    bubbleElement.classList.add('message-bubble');

// --- Markdown 텍스트를 코드 블록 기준으로 분할 및 조합 ---
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
        const processedPrecedingHtml = md.render(precedingText); // markdown-it 사용
        tempHtmlElements.innerHTML += DOMPurify.sanitize(processedPrecedingHtml);

        // 2. 코드 블록 처리 (Markdown 포맷 미적용, 원본 텍스트 그대로)
        const preElement = document.createElement('pre');
        const codeElement = document.createElement('code');
        // <-- 수정: decodeHtmlEntities를 사용하여 엔티티 디코딩 후 textContent 설정 -->
        codeElement.textContent = decodeHtmlEntities(DOMPurify.sanitize(codeContent, { RETURN_TYPE: 'text' }));
        // <-- 수정 끝 -->
        // if (lang) { // language- 클래스를 추가하지 않음 (요구사항: 코드 블록 내 plain text)
        //     codeElement.classList.add(`language-${lang.trim()}`);
        // }
        preElement.appendChild(codeElement);
        tempHtmlElements.appendChild(preElement);

        lastIndex = codeBlockRegex.lastIndex; // 다음 검색 시작 위치 업데이트
    }

    // 3. 마지막 코드 블록 이후의 텍스트 처리 (Markdown 포맷 적용)
    const remainingText = markdownText.substring(lastIndex);
    const processedRemainingHtml = md.render(remainingText); // markdown-it 사용
    tempHtmlElements.innerHTML += DOMPurify.sanitize(processedRemainingHtml);

    // tempHtmlElements의 모든 자식 노드를 bubbleElement로 옮깁니다.
    while (tempHtmlElements.firstChild) {
        bubbleElement.appendChild(tempHtmlElements.firstChild);
    }

    messageContainer.appendChild(bubbleElement);

    // CodeCopy 기능 함수 호출
    addCopyButtonsToCodeBlocks(bubbleElement);

    chatMessages.appendChild(messageContainer);

    // 스크롤을 맨 아래로 이동 (응답 메시지 추가 시)
    requestAnimationFrame(() => { // 브라우저 렌더링 직전에 스크롤 요청
        const lastChild = chatMessages.lastElementChild; // chatMessages의 마지막 자식 (즉, 방금 추가된 메시지 컨테이너)
        if (lastChild) {
            lastChild.scrollIntoView({ behavior: 'smooth', block: 'end' }); // 부드럽게 맨 아래로 스크롤
        } else { // Fallback: 마지막 자식이 없으면 (거의 없을 일) 그냥 컨테이너 맨 아래로
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    });
}

// renderBasicMarkdown 함수는 현재 md.render()로 대체되었으므로, 더 이상 사용되지 않습니다.
function renderBasicMarkdown(markdownText) {
    return markdownText; // 원본 텍스트를 그대로 반환 (사용되지 않음)
}


// --- 웹뷰 메시지 핸들러에서 호출되는 함수들을 전역 window 객체에 할당 ---
window.displayUserMessage = displayUserMessage;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.displayCodePilotMessage = displayCodePilotMessage;