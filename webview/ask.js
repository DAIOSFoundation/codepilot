import DOMPurify from 'dompurify';
import { addCopyButtonsToCodeBlocks } from './codeCopy.js';
import markdownit from 'markdown-it';

console.log("✅ ask.js loaded");

const vscode = acquireVsCodeApi();

const sendButton = document.getElementById('send-button');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');
const cleanHistoryButton = document.getElementById('clean-history-button');
const cancelButton = document.getElementById('cancel-call-button');
const imagePreviewContainer = document.getElementById('image-preview-container');
const imagePreview = document.getElementById('image-preview');
const removeImageButton = document.getElementById('remove-image-button');

let thinkingBubbleElement = null;
let selectedImageBase64 = null;
let selectedImageMimeType = null;

const md = markdownit({
    html: false,
    linkify: true,
    typographer: true,
});

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
    chatInput.addEventListener('paste', handlePaste);
}

// Clear History 버튼 클릭 이벤트 리스너
if (cleanHistoryButton) {
    cleanHistoryButton.addEventListener('click', handleCleanHistory);
}

// Cancel 버튼 클릭 이벤트 리스너
if (cancelButton) {
    cancelButton.addEventListener('click', () => {
        console.log('Cancel button clicked. Sending cancel command to extension.');
        vscode.postMessage({ command: 'cancelGeminiCall' });
        window.hideLoading();
    });
}

// 이미지 제거 버튼 클릭 이벤트 리스너
if (removeImageButton) {
    removeImageButton.addEventListener('click', removeAttachedImage);
}

function handlePaste(event) {
    const items = (event.clipboardData || event.originalEvent.clipboardData).items;
    let imageFound = false;

    for (const item of items) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    selectedImageBase64 = e.target.result.split(',')[1];
                    selectedImageMimeType = file.type;

                    imagePreview.src = e.target.result;
                    imagePreviewContainer.classList.remove('hidden');
                    autoResizeTextarea();
                    chatInput.focus();
                };
                reader.readAsDataURL(file);
                imageFound = true;
                break;
            }
        }
    }
    if (imageFound) {
        event.preventDefault();
    }
}

function removeAttachedImage() {
    selectedImageBase64 = null;
    selectedImageMimeType = null;
    imagePreview.src = '#';
    imagePreviewContainer.classList.add('hidden');
    autoResizeTextarea();
    chatInput.focus();
}

function handleSendMessage() {
    if (!chatInput) return;
    const text = chatInput.value.trimEnd();
    if (text || selectedImageBase64) {
        window.displayUserMessage(text, selectedImageBase64);
        window.showLoading();

        vscode.postMessage({
            command: 'sendMessage',
            text: text,
            imageData: selectedImageBase64,
            imageMimeType: selectedImageMimeType,
            selectedFiles: [] // ASK 탭에서는 파일 선택 없음
        });

        chatInput.value = '';
        chatInput.style.height = 'auto';
        removeAttachedImage();
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
    if (cancelButton) {
        cancelButton.disabled = true;
    }
    if (imagePreviewContainer) {
        imagePreviewContainer.classList.add('hidden');
    }
});

window.addEventListener('message', event => {
    const message = event.data;

    switch (message.command) {
        case 'displayUserMessage':
            console.log('Received command to display user message:', message.text, message.imageData);
            if (message.text !== undefined || message.imageData !== undefined) {
                window.displayUserMessage(message.text, message.imageData);
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
            window.hideLoading();

            if (message.sender === 'CodePilot' && message.text !== undefined) {
                window.displayCodePilotMessage(message.text);
            }
            break;

        case 'openPanel':
            console.log(`Received open panel command from extension: ${message.panel}`);
            break;
    }
});

// 사용자 메시지를 일반 텍스트와 구분선으로 표시하는 함수
function displayUserMessage(text, imageData = null) {
    if (!chatMessages) return;
    const userMessageElement = document.createElement('div');
    userMessageElement.classList.add('user-plain-message');

    if (imageData) {
        const imgElement = document.createElement('img');
        imgElement.classList.add('user-message-image');
        imgElement.src = `data:image/png;base64,${imageData}`;
        userMessageElement.appendChild(imgElement);
    }

    if (text) {
        const textNode = document.createElement('span');
        textNode.innerHTML = '🧇 ' + DOMPurify.sanitize(text).replace(/\n/g, '<br>');
        userMessageElement.appendChild(textNode);
    }

    const separatorElement = document.createElement('hr');
    separatorElement.classList.add('message-separator');

    chatMessages.appendChild(userMessageElement);
    chatMessages.appendChild(separatorElement);
    
    requestAnimationFrame(() => {
        const lastChild = chatMessages.lastElementChild;
        if (lastChild) {
            lastChild.scrollIntoView({ behavior: 'smooth', block: 'end' });
        } else {
            chatMessages.scrollTop = chatMessages.scrollHeight;
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
    thinkingBubbleElement = messageContainer;

    if (cleanHistoryButton) {
        cleanHistoryButton.disabled = true;
    }
    if (cancelButton) {
        cancelButton.disabled = false;
    }

    requestAnimationFrame(() => {
        if (thinkingBubbleElement) {
            thinkingBubbleElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
        } else if (chatMessages) {
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
        thinkingBubbleElement = null;
        console.log('Chat history cleared.');
    }
    if (cleanHistoryButton) {
        cleanHistoryButton.disabled = false;
    }
    if (cancelButton) {
        cancelButton.disabled = true;
    }
}

// CodePilot 메시지를 코드 블록 제외하고 Markdown 포맷 적용하여 표시
function displayCodePilotMessage(markdownText) {
    if (!chatMessages) return;

    const messageContainer = document.createElement('div');
    messageContainer.classList.add('codepilot-message-container');

    const bubbleElement = document.createElement('div');
    bubbleElement.classList.add('message-bubble');

    const codeBlockRegex = /```(\S*?)\n([\s\S]*?)```/g;
    let lastIndex = 0;
    const tempHtmlElements = document.createElement('div');

    let match;
    while ((match = codeBlockRegex.exec(markdownText)) !== null) {
        const precedingText = markdownText.substring(lastIndex, match.index);
        const codeBlockFullMatch = match[0];
        const lang = match[1];
        const codeContent = match[2];

        const processedPrecedingHtml = md.render(precedingText);
        tempHtmlElements.innerHTML += DOMPurify.sanitize(processedPrecedingHtml);

        const preElement = document.createElement('pre');
        const codeElement = document.createElement('code');
        
        let cleanCodeContent = codeContent;
        
        const textarea = document.createElement('textarea');
        textarea.innerHTML = cleanCodeContent;
        cleanCodeContent = textarea.value;
        
        cleanCodeContent = cleanCodeContent
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, ' ');
        
        const codeLines = cleanCodeContent.split('\n');
        const totalLines = codeLines.length;
        
        const codeBlockContainer = document.createElement('div');
        codeBlockContainer.classList.add('code-block-container');
        
        const codeHeader = document.createElement('div');
        codeHeader.classList.add('code-block-header');
        
        const languageLabel = document.createElement('span');
        languageLabel.classList.add('code-language');
        languageLabel.textContent = lang || 'text';
        
        const lineCountLabel = document.createElement('span');
        lineCountLabel.classList.add('code-line-count');
        lineCountLabel.textContent = `${totalLines} lines`;
        
        codeHeader.appendChild(languageLabel);
        codeHeader.appendChild(lineCountLabel);
        
        const codeContainer = document.createElement('div');
        codeContainer.classList.add('code-container');
        
        codeElement.textContent = cleanCodeContent;
        preElement.appendChild(codeElement);
        codeContainer.appendChild(preElement);
        
        codeBlockContainer.appendChild(codeHeader);
        codeBlockContainer.appendChild(codeContainer);
        
        tempHtmlElements.appendChild(codeBlockContainer);

        lastIndex = codeBlockRegex.lastIndex;
    }

    const remainingText = markdownText.substring(lastIndex);
    const processedRemainingHtml = md.render(remainingText);
    tempHtmlElements.innerHTML += DOMPurify.sanitize(processedRemainingHtml);

    while (tempHtmlElements.firstChild) {
        bubbleElement.appendChild(tempHtmlElements.firstChild);
    }

    messageContainer.appendChild(bubbleElement);

    addCopyButtonsToCodeBlocks(bubbleElement);

    chatMessages.appendChild(messageContainer);

    requestAnimationFrame(() => {
        const lastChild = chatMessages.lastElementChild;
        if (lastChild) {
            lastChild.scrollIntoView({ behavior: 'smooth', block: 'end' });
        } else {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    });
}

// 웹뷰 메시지 핸들러에서 호출되는 함수들을 전역 window 객체에 할당
window.displayUserMessage = displayUserMessage;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.displayCodePilotMessage = displayCodePilotMessage; 