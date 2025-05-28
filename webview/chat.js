import DOMPurify from 'dompurify';
// codeCopy.js에서 내보낸 함수를 가져옵니다.
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
        // 사용자 메시지 표시 (window에 할당된 함수 사용)
        window.displayUserMessage(text);

        // 로딩 버블 표시 (window에 할당된 함수 사용)
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
    // TODO: 초기 로딩 시 환영 메시지 등을 표시하려면 여기에 호출 추가
});

// 확장 프로그램으로부터 메시지 받는 리스너
window.addEventListener('message', event => {
    const message = event.data;

    switch (message.command) {
        case 'displayUserMessage':
            console.log('Received command to display user message:', message.text);
            if (message.text !== undefined) {
                // displayUserMessage 함수는 window에 할당되어야 합니다.
                window.displayUserMessage(message.text);
            }
            break;

        case 'showLoading':
             console.log('Received showLoading command.');
             // showLoading 함수는 window에 할당되어야 합니다.
             window.showLoading();
             break;
        case 'hideLoading':
             console.log('Received hideLoading command.');
             // hideLoading 함수는 window에 할당되어야 합니다.
             window.hideLoading();
             break;

        case 'receiveMessage':
            console.log('Received message from extension:', message.text);
            // hideLoading 함수는 window에 할당되어야 합니다.
            window.hideLoading(); // 응답을 받으면 로딩 버블 제거

            if (message.sender === 'CodePilot' && message.text !== undefined) {
                 // displayCodePilotMessage 함수는 window에 할당되어야 합니다.
                 window.displayCodePilotMessage(message.text); // CodePilot 메시지 표시
            }
            break;

        case 'openPanel':
            console.log(`Received open panel command from extension: ${message.panel}`);
            // TODO: chat.js에서 openPanel 메시지 처리 로직이 있다면 여기에 추가
            break;

        // TODO: 필요한 다른 메시지 타입 처리 추가
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
    // CSS 애니메이션을 사용하는 thinking dots 포함
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

// CodePilot 메시지를 자체 구현 렌더링 함수로 표시하고,
// 코드 블록에 버튼 추가하는 로직은 codeCopy.js 함수 호출로 분리
function displayCodePilotMessage(markdownText) {
    if (!chatMessages) return;

    const messageContainer = document.createElement('div');
    messageContainer.classList.add('codepilot-message-container');

    const bubbleElement = document.createElement('div');
    bubbleElement.classList.add('message-bubble');
    // chat.html에서 message-bubble에 display: flex; flex-direction: column; 이 추가되어 있어야 합니다.


    // renderBasicMarkdown 함수 사용 및 DOMPurify 정제
    const renderedHtml = renderBasicMarkdown(markdownText); // renderBasicMarkdown 함수는 이 파일 내에 정의되어 있습니다.
    bubbleElement.innerHTML = DOMPurify.sanitize(renderedHtml);

    // 메시지 컨테이너에 버블 추가
    messageContainer.appendChild(bubbleElement);

    // CodeCopy 기능 함수 호출
    // bubbleElement는 이제 Markdown이 HTML로 변환된 내용을 포함하고 있습니다.
    // 이 bubbleElement를 인자로 전달하여 codeCopy.js의 함수가 내부의 코드 블록을 찾고 버튼을 추가하게 합니다.
    // addCopyButtonsToCodeBlocks 함수는 codeCopy.js 파일에서 임포트되었습니다.
    // 이 함수는 임포트된 모듈의 스코프 내에서 사용 가능합니다.
    addCopyButtonsToCodeBlocks(bubbleElement); // <-- codeCopy.js에서 임포트된 함수 호출

    // 완성된 messageContainer (이제 bubbleElement와 그 안의 버튼들이 모두 포함)를 실제 메시지 목록에 추가
    chatMessages.appendChild(messageContainer);

    // 스크롤을 항상 맨 아래로 이동
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 마크다운 렌더링 함수 (자체 구현)
// 이 함수는 displayCodePilotMessage 함수 내부에서 사용됩니다.
// 이 함수는 이 파일 내에 정의되어 있으므로 전역 노출이 필수는 아닙니다.
function renderBasicMarkdown(markdownText) {
    let htmlText = markdownText;

    // 코드 블록 (```) 처리 - 가장 먼저 처리
    // 언어 지정을 위한 (\S*?)\n 캡처 그룹 추가
    const codeBlockRegex = /```(\S*?)\n([\s\S]*?)```/g;
    htmlText = htmlText.replace(codeBlockRegex, (match, lang, codeContent) => {
        // 코드 블록 내용을 안전하게 이스케이프
        const escapedCodeContent = codeContent
            .replace(/&/g, '&') // &를 먼저 이스케이프
            .replace(/</g, '<')  // <를 이스케이프
            .replace(/>/g, '>');  // >를 이스케이프
         // 언어 코드가 있다면 class="language-..." 형태로 추가 (하이라이팅 라이브러리 필요)
         // lang은 trim()하여 앞뒤 공백 제거
        const langClass = lang ? `language-${lang.trim()}` : '';
        return `<pre><code class="${langClass}">${escapedCodeContent}</code></pre>`;
    });

     // 인라인 코드 (`) 처리
    const inlineCodeRegex = /`([^`]+?)`/g;
    htmlText = htmlText.replace(inlineCodeRegex, '<code>$1</code>');


    // 헤더 (#, ## 등) 처리 (줄 시작에 # 이 오는 경우만)
    const headerRegex = /^(#+)\s*(.*)$/gm; // gm 플래그 중요 (멀티라인, 전역)
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
    // 이 부분은 복잡해지므로 Markdown-it 사용이 좋지만, 기존 코드 유지하며 조금 개선
    const listItemRegex = /^\s*([-*+])\s+(.*)$/gm; // -, *, + 기호 지원
    // 줄 시작에 목록 기호가 오는 줄들을 찾아서 <ul><li> 구조로 만듦
    // 이 로직은 줄 단위로 처리하므로 블록 요소 내부 목록 등 복잡한 경우는 완벽하지 않습니다.
    const lines = htmlText.split('\n');
    let processedLines = [];
    let inList = false;
    let listType = null; // 'ul' or 'ol' (자체 구현은 ol 지원 안 함)
    let currentListContent = [];

    for (const line of lines) {
        const listItemMatch = line.match(/^\s*([-*+])\s+(.*)$/); // -, *, + 탐지
        if (listItemMatch) {
             const marker = listItemMatch[1];
            const itemContent = listItemMatch[2].trim();

            if (!inList) {
                // 첫 목록 항목 시작
                // 이전에 처리된 목록이 있었다면 닫아줍니다. (새 목록이 시작될 때)
                 if (processedLines.length > 0 && processedLines[processedLines.length - 1].endsWith('</ul>')) {
                     // 이미 이전 목록이 닫혔으므로 새로운 목록 시작
                 } else if (currentListContent.length > 0) {
                      // 이전에 처리된 목록 항목들이 있었는데 닫히지 않았다면 닫아줍니다.
                      processedLines.push('<ul>' + currentListContent.join('') + '</ul>');
                      currentListContent = [];
                 }

                if (marker === '-') { listType = 'ul'; processedLines.push('<ul>'); }
                else if (marker === '*' && !line.match(/^\s*\d+\.\s/)) { listType = 'ul'; processedLines.push('<ul>'); } // Treat * as ul unless it looks like an ol item
                else if (marker === '+' && !line.match(/^\s*\d+\.\s/)) { listType = 'ul'; processedLines.push('<ul>'); } // Treat + as ul unless it looks like an ol item
                else if (line.match(/^\s*\d+\.\s/)) { listType = 'ol'; processedLines.push('<ol>'); } // Basic ordered list detection (preceding digit+dot)
                 else { listType = 'ul'; processedLines.push('<ul>'); } // Default to ul if unsure

                inList = true;
            } else if (
                 (listType === 'ul' && (marker === '-' || marker === '*' || marker === '+')) ||
                 (listType === 'ol' && line.match(/^\s*\d+\.\s/)) // Basic check for ol continuation
            ) {
                 // Continue existing list - check indentation if needed for nested lists (complex, omitted for simplicity)
                 // If switching list type mid-list, previous list needs to be closed.
                 // This simple parser doesn't handle switching types or complex nesting well.
                 console.warn("Nested list item detected or marker change mid-list. renderBasicMarkdown might not handle this correctly.");
            } else {
                 // End the current list if marker changes or line doesn't match expected list item format
                 if (inList) {
                     if (currentListContent.length > 0) {
                         processedLines.push(currentListContent.join('')); // Add accumulated list items
                         currentListContent = [];
                     }
                     if (listType === 'ul') processedLines.push('</ul>');
                     else if (listType === 'ol') processedLines.push('</ol>');
                     inList = false;
                     listType = null;
                 }
                 if (line.trim() !== '') {
                    processedLines.push(line); // Add current line as non-list content
                 }
                 continue; // Skip adding to list items
            }

            // Add the processed list item content
            // Recursive call can be complex for nested markdown within list items.
            // Simplest: just add the item content as raw text or basic html
            const renderedItemContent = itemContent; // 간단히 내용만 사용 (재귀 렌더링은 복잡)

            // 현재 목록 항목들을 임시 배열에 저장
            currentListContent.push(`<li>${renderedItemContent}</li>`);


        } else { // Not a list item line
            if (inList) {
                 // 현재 목록이 진행 중이었다면 닫아줍니다.
                 if (currentListContent.length > 0) {
                     processedLines.push(currentListContent.join('')); // Add accumulated list items
                     currentListContent = [];
                 }
                 if (listType === 'ul') processedLines.push('</ul>');
                 else if (listType === 'ol') processedLines.push('</ol>');
                 inList = false;
                 listType = null;
            }
             // 목록이 아닌 줄은 그대로 추가 (이미 헤더, 코드 블록 등은 위에서 처리됨)
             // 비어있지 않은 줄만 추가하여 불필요한 단락/줄바꿈 생성 방지
             if (line.trim() !== '') {
                processedLines.push(line);
             }
        }
    }
     // 마지막에 목록이 닫히지 않은 경우
     if (inList) {
         if (currentListContent.length > 0) {
             processedLines.push(currentListContent.join('')); // Add accumulated list items
             // currentListContent = []; // 초기화
         }
         if (listType === 'ul') processedLines.push('</ul>');
         else if (listType === 'ol') processedLines.push('</ol>');
     }

     // 처리된 줄들을 다시 합칩니다. (단락 및 줄바꿈 처리는 나중에)
     htmlText = processedLines.join('\n');


    // 링크 ([text](url)) 처리
    const linkRegex = /\[([^\]]+?)\]\(([^)]+?)\)/g;
     // URL과 텍스트에 대한 DOMPurify 정제는 최종 sanitize에서 수행
    htmlText = htmlText.replace(linkRegex, '<a href="$2" target="_blank">$1</a>'); // 새 탭에서 열리도록 target="_blank" 추가


    // 단락 및 줄바꿈 처리 (코드 블록, 목록, 헤더 등이 처리된 후)
    // Simple paragraph separation by double newline, and single newline to <br> within paragraphs
    // 블록 요소 (<pre>, <ul>, <ol>, <hN>, <table>) 앞뒤에 임시로 구분자를 넣어 단락 처리에 영향을 주지 않도록 합니다.
    const blockTags = ['pre', 'ul', 'ol', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table'];
    const blockTagRegex = new RegExp(`(<(?:${blockTags.join('|')})[^>]*>.*?</(?:${blockTags.join('|')})>)`, 'gs'); // g=global, s=dotall

    // 임시 구분자로 블록 태그 내용을 치환
    const blockPlaceholders = [];
    htmlText = htmlText.replace(blockTagRegex, (match) => {
        const placeholder = `@@BLOCK_PLACEHOLDER_${blockPlaceholders.length}@@`;
        blockPlaceholders.push(match);
        return placeholder;
    });


    // 이제 블록 태그가 제거된 텍스트에서 단락 및 줄바꿈 처리
    htmlText = htmlText.split(/\n{2,}/).map(paragraph => {
        if (paragraph.trim() === '') return ''; // 빈 단락 스킵

        // 단일 줄바꿈을 <br>로 변환
        paragraph = paragraph.replace(/\n/g, '<br>');

        return `<p>${paragraph}</p>`; // 단락 태그로 감싸기
    }).join('');

    // 임시 구분자를 원래 블록 태그 내용으로 다시 치환
    blockPlaceholders.forEach((blockHtml, index) => {
        const placeholder = `@@BLOCK_PLACEHOLDER_${index}@@`;
        htmlText = htmlText.replace(placeholder, blockHtml);
    });

    // 불필요한 <p> 태그 제거 (예: <p><pre>...</pre></p>) - DOM 조작 단계에서 처리하는 것이 일반적
    // renderBasicMarkdown에서는 순수 문자열 조작만 시도합니다.
    // 이 부분은 regex로 안전하게 처리하기 매우 복잡하므로, DOM 조작 단계 (displayCodePilotMessage) 또는 Markdown-it 사용을 권장합니다.
    // 여기서는 간단한 경우만 처리하는 regex 예시: <p><블록시작태그> 또는 </블록종료태그></p> 제거
    // htmlText = htmlText.replace(/<p>(<(pre|ul|ol|h\d|table)[^>]*>)/gi, '$1'); // <p><block> -> <block>
    // htmlText = htmlText.replace(/(<\/(pre|ul|ol|h\d|table)>)<\/p>/gi, '$1'); // </block></p> -> </block>
    // Note: This regex is not foolproof and can break valid HTML.

    // 최종 DOMPurify 정제는 displayCodePilotMessage에서 innerHTML 설정 전에 수행됩니다.
    // return htmlText;

    return htmlText; // 정제되지 않은 최종 HTML 문자열 반환
}


// TODO: 필요한 다른 Webview 로직 추가 (예: 입력 필드 초기 상태, 스피너 표시 등)


// --- 웹뷰 메시지 핸들러에서 호출되는 함수들을 전역 window 객체에 할당 ---
// Webpack UMD 번들에서 전역 접근을 가능하게 합니다.
window.displayUserMessage = displayUserMessage;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.displayCodePilotMessage = displayCodePilotMessage;
// renderBasicMarkdown은 displayCodePilotMessage 내부에서만 사용하므로 전역 노출 필요 없음.