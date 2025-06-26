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

// 채팅 컨테이너 참조 추가
const chatContainer = document.getElementById('chat-container');

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
                    
                    // 이미지 추가 후 패딩 업데이트
                    setTimeout(() => {
                        updateChatContainerPadding();
                    }, 0);
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
    
    // 이미지 제거 후 패딩 업데이트
    setTimeout(() => {
        updateChatContainerPadding();
    }, 0);
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
        
        // 메시지 전송 후 즉시 스크롤을 thinking 애니메이션으로 이동 (여러 번 시도)
        scrollToThinkingAnimation();
    }
}

// thinking 애니메이션으로 스크롤하는 함수 (여러 번 시도)
function scrollToThinkingAnimation() {
    let attempts = 0;
    const maxAttempts = 10;
    
    const attemptScroll = () => {
        attempts++;
        if (thinkingBubbleElement) {
            thinkingBubbleElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'end', // 애니메이션을 화면 하단에 위치시킴
                inline: 'nearest' 
            });
            return true; // 성공
        } else if (attempts < maxAttempts) {
            // 아직 thinkingBubbleElement가 생성되지 않았으면 다시 시도
            setTimeout(attemptScroll, 50);
            return false; // 아직 시도 중
        } else {
            // 최대 시도 횟수 초과 시 fallback
            if (chatMessages) {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
            return false; // 실패
        }
    };
    
    // 즉시 첫 번째 시도
    if (!attemptScroll()) {
        // 첫 번째 시도가 실패하면 50ms 후 다시 시도
        setTimeout(attemptScroll, 50);
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
    
    // 입력창 높이가 변경되면 하단 고정 영역 높이도 재계산
    updateChatContainerPadding();
}

// 하단 고정 영역의 높이를 계산하고 채팅 컨테이너의 패딩을 조정하는 함수
function updateChatContainerPadding() {
    if (!chatContainer) return;
    
    // 하단 고정 영역의 요소들
    const bottomFixedArea = document.querySelector('.bottom-fixed-area');
    const chatInputArea = document.getElementById('chat-input-area');
    
    if (!bottomFixedArea || !chatInputArea) return;
    
    // 입력 영역의 높이
    const chatInputHeight = chatInputArea.offsetHeight;
    
    // 전체 하단 고정 영역 높이 계산 (여유 공간 포함)
    const totalBottomHeight = chatInputHeight + 20; // 20px 여유 공간
    
    // 채팅 컨테이너의 하단 패딩을 동적으로 설정
    chatContainer.style.paddingBottom = `${totalBottomHeight}px`;
    
    console.log(`Bottom area height: ${totalBottomHeight}px (input: ${chatInputHeight}px)`);
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
    
    // 초기 채팅 컨테이너 패딩 설정
    setTimeout(() => {
        updateChatContainerPadding();
    }, 100); // DOM이 완전히 로드된 후 실행
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
            console.log('Received message from extension:', {
                sender: message.sender,
                textLength: message.text ? message.text.length : 0,
                textPreview: message.text ? message.text.substring(0, 200) + '...' : 'undefined'
            });
            window.hideLoading();

            if (message.sender === 'CodePilot' && message.text !== undefined) {
                console.log('Calling displayCodePilotMessage with text length:', message.text.length);
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
    
    // 사용자 메시지가 추가된 후 즉시 스크롤을 해당 메시지로 이동 (여러 번 시도)
    scrollToUserMessage(userMessageElement);
}

// 사용자 메시지로 스크롤하는 함수 (여러 번 시도)
function scrollToUserMessage(userMessageElement) {
    let attempts = 0;
    const maxAttempts = 5;
    
    const attemptScroll = () => {
        attempts++;
        if (userMessageElement && userMessageElement.offsetHeight > 0) {
            // 요소가 실제로 렌더링되었는지 확인
            userMessageElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center', // 메시지를 화면 중앙에 위치시킴
                inline: 'nearest' 
            });
            return true; // 성공
        } else if (attempts < maxAttempts) {
            // 아직 요소가 렌더링되지 않았으면 다시 시도
            setTimeout(attemptScroll, 20);
            return false; // 아직 시도 중
        } else {
            // 최대 시도 횟수 초과 시 fallback
            if (chatMessages) {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
            return false; // 실패
        }
    };
    
    // 즉시 첫 번째 시도
    if (!attemptScroll()) {
        // 첫 번째 시도가 실패하면 20ms 후 다시 시도
        setTimeout(attemptScroll, 20);
    }
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

    // thinking 애니메이션이 추가된 후 즉시 스크롤을 해당 애니메이션으로 이동 (여러 번 시도)
    scrollToThinkingBubble(messageContainer);
}

// thinking 버블로 스크롤하는 함수 (여러 번 시도)
function scrollToThinkingBubble(thinkingElement) {
    let attempts = 0;
    const maxAttempts = 5;
    
    const attemptScroll = () => {
        attempts++;
        if (thinkingElement && thinkingElement.offsetHeight > 0) {
            // 요소가 실제로 렌더링되었는지 확인
            thinkingElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'end', // 애니메이션을 화면 하단에 위치시킴
                inline: 'nearest' 
            });
            return true; // 성공
        } else if (attempts < maxAttempts) {
            // 아직 요소가 렌더링되지 않았으면 다시 시도
            setTimeout(attemptScroll, 20);
            return false; // 아직 시도 중
        } else {
            // 최대 시도 횟수 초과 시 fallback
            if (chatMessages) {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
            return false; // 실패
        }
    };
    
    // 즉시 첫 번째 시도
    if (!attemptScroll()) {
        // 첫 번째 시도가 실패하면 20ms 후 다시 시도
        setTimeout(attemptScroll, 20);
    }
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
    console.log('displayCodePilotMessage called with text length:', markdownText.length);
    if (!chatMessages) {
        console.error('chatMessages element not found!');
        return;
    }
    console.log('chatMessages element found, creating message container...');

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

    // AI 응답이 추가된 후 스크롤을 해당 응답으로 이동
    requestAnimationFrame(() => {
        if (messageContainer) {
            // AI 응답을 화면에 명확하게 보이도록 스크롤
            messageContainer.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start', // 응답의 시작 부분이 화면 상단에 보이도록
                inline: 'nearest' 
            });
        } else if (chatMessages) { // Fallback
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    });
}

// 웹뷰 메시지 핸들러에서 호출되는 함수들을 전역 window 객체에 할당
window.displayUserMessage = displayUserMessage;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.displayCodePilotMessage = displayCodePilotMessage; 