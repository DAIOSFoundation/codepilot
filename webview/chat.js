// dompurify 임포트
import DOMPurify from 'dompurify';
console.log("✅ chat.js loaded");

// acquireVsCodeApi는 웹뷰 환경에서 전역으로 사용 가능합니다.
const vscode = acquireVsCodeApi();

// DOM 요소 참조
const sendButton = document.getElementById('send-button');
const chatInput = document.getElementById('chat-input'); // 이제 textarea 엘리먼트
const chatMessages = document.getElementById('chat-messages');

// 메시지 전송 로직
if (sendButton && chatInput) {
    sendButton.addEventListener('click', handleSendMessage);

    chatInput.addEventListener('keydown', function(e) {
        // Enter만 눌렀을 때 (Shift + Enter는 줄바꿈)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // 기본 동작 (줄바꿈) 방지

            // IME 입력 완료 및 이벤트 처리를 위한 미세한 지연 후 메시지 전송
            setTimeout(() => {
                handleSendMessage();
            }, 0);
        }
    });

    // Textarea 입력 시 높이 자동 조절
    chatInput.addEventListener('input', autoResizeTextarea);
}

function handleSendMessage() {
    if (!chatInput) return;
    const text = chatInput.value.trim();
    if (text) {
        displayUserMessage(text);

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
        case 'receiveMessage':
            console.log('Received message from extension:', message.text);
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

// 마크다운 렌더링 함수
function renderBasicMarkdown(markdownText) {
    let htmlText = markdownText;

    const codeBlockRegex = /```([\s\S]*?)```/g;
    htmlText = htmlText.replace(codeBlockRegex, (match, codeContent) => {
        const escapedCodeContent = codeContent
            .replace(/&/g, '&')
            .replace(/</g, '<')
            .replace(/>/g, '>');
        return `<pre><code>${escapedCodeContent}</code></pre>`;
    });

    const inlineCodeRegex = /`([^`]+?)`/g;
    htmlText = htmlText.replace(inlineCodeRegex, '<code>$1</code>');

    const headerRegex = /^(#+)\s*(.*)$/gm;
    htmlText = htmlText.replace(headerRegex, (match, hashes, content) => {
        const level = Math.min(hashes.length, 6);
        return `<h${level}>${content.trim()}</h${level}>`;
    });

    const boldRegex = /(\*\*_([^_]+?)_\*\*)|(__([^__]+?)__)|(\*\*([^\*]+?)\*\*)/g;
    htmlText = htmlText.replace(boldRegex, (match, g1, g2, g3, g4, g5, g6) => {
        const simpleBoldRegex = /(\*\*|__)(.+?)\1/g;
        return match.replace(simpleBoldRegex, '<strong>$2</strong>');
    });

    const italicRegex = /(\*|_)(.+?)\1/g;
    htmlText = htmlText.replace(italicRegex, '<em>$2</em>');

    const listItemRegex = /^\s*[-*]\s+(.*)$/gm;
    const listItems = [];
    let match;
    while ((match = listItemRegex.exec(htmlText)) !== null) {
        listItems.push(`<li>${match[1].trim()}</li>`);
    }
    if (listItems.length > 0) {
        htmlText = htmlText.replace(listItemRegex, '');
        htmlText += `<ul>${listItems.join('')}</ul>`;
    }

    const linkRegex = /\[([^\]]+?)\]\(([^)]+?)\)/g;
    htmlText = htmlText.replace(linkRegex, '<a href="$2">$1</a>');

    htmlText = '<p>' + htmlText.replace(/\n{2,}/g, '</p><p>') + '</p>';
    htmlText = htmlText.replace(/\n/g, '<br>');

    const sanitizedHtml = DOMPurify.sanitize(htmlText);
    return sanitizedHtml;
}

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
