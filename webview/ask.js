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

// 파일 선택 관련 요소들
const filePickerButton = document.getElementById('file-picker-button');
const fileSelectionArea = document.getElementById('file-selection-area');
const selectedFilesContainer = document.getElementById('selected-files-container');
const clearFilesButton = document.getElementById('clear-files-button');
const fileInputDivider = document.querySelector('.file-input-divider');

// 채팅 컨테이너 참조 추가
const chatContainer = document.getElementById('chat-container');

let thinkingBubbleElement = null;
let selectedImageBase64 = null;
let selectedImageMimeType = null;

// 파일 선택 관련 변수들
let selectedFiles = [];

const md = markdownit({
    html: false,
    linkify: true,
    typographer: true,
});

// 언어별 텍스트 로딩 및 적용 (ASK에서는 제거)
// const languageSelect = document.getElementById('language-select');
// let currentLanguage = 'ko'; // 기본값
// let languageData = {};

// async function loadLanguage(lang) {
//     try {
//         console.log('Requesting language data from extension:', lang);
//         // 확장 프로그램에 언어 데이터 요청
//         vscode.postMessage({ command: 'getLanguageData', language: lang });
//     } catch (e) {
//         console.error('Failed to load language:', lang, e);
//     }
// }

// function applyLanguage() {
//     console.log('=== applyLanguage called (ASK) ===');
//     console.log('Current language:', currentLanguage);
//     console.log('Language data keys:', Object.keys(languageData));
//     console.log('inputPlaceholder value:', languageData['inputPlaceholder']);
    
//     // 타이틀
//     const askTitle = document.getElementById('ask-title');
//     if (askTitle && languageData['askTitle']) askTitle.textContent = languageData['askTitle'];
//     // 언어 라벨
//     const languageLabel = document.getElementById('language-label');
//     if (languageLabel && languageData['languageLabel']) languageLabel.textContent = languageData['languageLabel'];
//     // Send 버튼
//     const sendButton = document.getElementById('send-button');
//     if (sendButton && languageData['sendButton']) sendButton.textContent = languageData['sendButton'];
//     // Clear 버튼
//     const clearButton = document.getElementById('clean-history-button');
//     if (clearButton && languageData['clearButton']) clearButton.textContent = languageData['clearButton'];
//     // Cancel 버튼
//     const cancelButton = document.getElementById('cancel-call-button');
//     if (cancelButton && languageData['cancelButton']) cancelButton.textContent = languageData['cancelButton'];
//     // 입력창 placeholder
//     const chatInput = document.getElementById('chat-input');
//     console.log('Chat input element found (ASK):', !!chatInput);
//     if (chatInput) {
//         console.log('Current placeholder (ASK):', chatInput.placeholder);
//         console.log('New placeholder value (ASK):', languageData['inputPlaceholder']);
//     }
//     if (chatInput && languageData['inputPlaceholder']) {
//         chatInput.placeholder = languageData['inputPlaceholder'];
//         console.log('Placeholder updated to (ASK):', chatInput.placeholder);
//     } else {
//         console.log('Failed to update placeholder (ASK) - chatInput:', !!chatInput, 'inputPlaceholder:', !!languageData['inputPlaceholder']);
//     }
    
//     console.log('=== applyLanguage completed (ASK) ===');
// }

// if (languageSelect) {
//     languageSelect.addEventListener('change', (e) => {
//         const lang = e.target.value;
//         console.log('Language changed to:', lang);
//         currentLanguage = lang;
//         loadLanguage(lang);
        
//         // 언어 변경 시 즉시 저장 요청
//         vscode.postMessage({ command: 'saveLanguage', language: lang });
//     });
// }

// 파일 선택 관련 함수들
function addSelectedFile(filePath, fileName) {
    if (selectedFiles.some(file => file.path === filePath)) {
        console.log('File already selected:', filePath);
        return;
    }

    selectedFiles.push({ path: filePath, name: fileName });
    updateFileSelectionDisplay();
}

// 선택된 파일 제거
function removeSelectedFile(filePath) {
    selectedFiles = selectedFiles.filter(file => file.path !== filePath);
    updateFileSelectionDisplay();
}

// 모든 선택된 파일 제거
function clearAllSelectedFiles() {
    selectedFiles = [];
    updateFileSelectionDisplay();
}

// 파일 선택 영역 UI 업데이트
function updateFileSelectionDisplay() {
    if (!selectedFilesContainer || !fileSelectionArea) return;

    selectedFilesContainer.innerHTML = '';

    if (selectedFiles.length === 0) {
        fileSelectionArea.classList.add('hidden');
        if (fileInputDivider) {
            fileInputDivider.classList.add('hidden');
        }
    } else {
        fileSelectionArea.classList.remove('hidden');
        if (fileInputDivider) {
            fileInputDivider.classList.remove('hidden');
        }

        selectedFiles.forEach(file => {
            const fileTag = document.createElement('div');
            fileTag.classList.add('selected-file-tag');
            fileTag.innerHTML = `
                <span class="file-name" title="${file.path}">${file.name}</span>
                <button class="remove-file" data-path="${file.path}" title="Remove file">×</button>
            `;

            // 개별 파일 제거 버튼 이벤트
            const removeButton = fileTag.querySelector('.remove-file');
            removeButton.addEventListener('click', () => {
                removeSelectedFile(file.path);
            });

            selectedFilesContainer.appendChild(fileTag);
        });
    }
}

// 페이지 로드 시 기본 언어 적용 (ASK에서는 제거)
// window.addEventListener('DOMContentLoaded', () => {
//     // VS Code 설정에서 언어를 가져오도록 요청
//     vscode.postMessage({ command: 'getLanguage' });
// });

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

// 파일 선택 버튼 클릭 이벤트 리스너
if (filePickerButton) {
    filePickerButton.addEventListener('click', () => {
        vscode.postMessage({ command: 'openFilePicker' });
    });
}

// 모든 파일 제거 버튼 클릭 이벤트 리스너
if (clearFilesButton) {
    clearFilesButton.addEventListener('click', clearAllSelectedFiles);
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
            selectedFiles: selectedFiles.map(file => file.path) // 선택된 파일 경로들 전달
        });

        chatInput.value = '';
        chatInput.style.height = 'auto';
        removeAttachedImage();
        clearAllSelectedFiles(); // 선택된 파일들도 초기화
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
    const languageSelectionArea = document.querySelector('.language-selection-area');
    
    if (!bottomFixedArea || !chatInputArea) return;
    
    // 입력 영역의 높이
    const chatInputHeight = chatInputArea.offsetHeight;
    
    // 언어 설정 영역의 높이 (있는 경우)
    const languageAreaHeight = languageSelectionArea ? languageSelectionArea.offsetHeight : 0;
    
    // 전체 하단 고정 영역 높이 계산 (언어 설정 영역 + 입력 영역 + 여유 공간)
    const totalBottomHeight = languageAreaHeight + chatInputHeight + 20; // 20px 여유 공간
    
    // 채팅 컨테이너의 하단 패딩을 동적으로 설정
    chatContainer.style.paddingBottom = `${totalBottomHeight}px`;
    
    console.log(`Bottom area height: ${totalBottomHeight}px (language: ${languageAreaHeight}px, input: ${chatInputHeight}px)`);
}

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
        // case 'languageChanged':
        //     console.log(`Language changed to: ${message.language}`);
        //     loadLanguage(message.language);
        //     break;
        // case 'currentLanguage':
        //     if (message.language) {
        //         currentLanguage = message.language;
        //         if (languageSelect) {
        //             languageSelect.value = currentLanguage;
        //         }
        //         loadLanguage(currentLanguage);
        //     }
        //     break;
        // case 'languageDataReceived':
        //     if (message.language && message.data) {
        //         console.log('=== languageDataReceived (ASK) ===');
        //         console.log('Language:', message.language);
        //         console.log('Data keys:', Object.keys(message.data));
        //         console.log('inputPlaceholder in received data:', message.data['inputPlaceholder']);
                
        //         languageData = message.data;
        //         currentLanguage = message.language;
        //         sessionStorage.setItem('codepilotLang', message.language);
                
        //         console.log('About to call applyLanguage (ASK)...');
        //         applyLanguage();
        //         console.log('applyLanguage called (ASK)');
        //     }
        //     break;
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
        
        // bash callout인 경우 run 버튼을 나중에 추가하기 위해 플래그 설정
        if (lang && lang.toLowerCase() === 'bash') {
            codeBlockContainer.setAttribute('data-bash-content', cleanCodeContent);
        }
        
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
    
    // bash callout에 run 버튼 추가 (Copy 버튼 좌측에)
    addBashRunButtons(bubbleElement);

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

// bash 명령어 실행 함수
function executeBashCommands(bashContent) {
    // 주석이 아닌 명령어만 추출하고, 명령어 뒤의 주석도 제거
    const commands = bashContent
        .split('\n')
        .map(line => {
            // 줄 앞뒤 공백 제거
            const trimmedLine = line.trim();
            
            // 빈 줄이거나 #으로 시작하는 주석 줄은 제외
            if (!trimmedLine || trimmedLine.startsWith('#')) {
                return null;
            }
            
            // 명령어 뒤의 주석 제거 (# 앞의 내용만 추출)
            const commandPart = trimmedLine.split('#')[0].trim();
            
            return commandPart.length > 0 ? commandPart : null;
        })
        .filter(command => command !== null);
    
    if (commands.length === 0) {
        vscode.postMessage({ 
            command: 'showMessage', 
            type: 'warning', 
            text: '실행할 명령어가 없습니다.' 
        });
        return;
    }
    
    // VS Code 확장에 명령어 실행 요청
    vscode.postMessage({ 
        command: 'executeBashCommands', 
        commands: commands 
    });
    
    // 사용자에게 실행 중임을 알림
    vscode.postMessage({ 
        command: 'showMessage', 
        type: 'info', 
        text: `🚀 ${commands.length}개의 명령어를 실행합니다...` 
    });
}

// bash callout에 run 버튼 추가 함수
function addBashRunButtons(bubbleElement) {
    if (!bubbleElement) return;
    
    // bash 콘텐츠가 있는 코드 블록 컨테이너 찾기
    const bashContainers = bubbleElement.querySelectorAll('.code-block-container[data-bash-content]');
    
    bashContainers.forEach(container => {
        const bashContent = container.getAttribute('data-bash-content');
        if (!bashContent) return;
        
        // run 버튼 생성
        const runButton = document.createElement('button');
        runButton.textContent = '▶ Run';
        runButton.className = 'bash-run-button';
        runButton.style.cssText = `
            margin-top: 5px;
            margin-right: 8px;
            padding: 6px 12px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: 1px solid var(--vscode-button-border);
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
            font-family: var(--vscode-font-family);
            display: inline-flex;
            align-items: center;
            justify-content: center;
        `;
        
        runButton.addEventListener('click', () => {
            executeBashCommands(bashContent);
        });
        
        // Copy 버튼 찾기 (코드 블록 컨테이너 다음에 있는 버튼)
        const copyButton = container.nextElementSibling;
        if (copyButton && copyButton.classList.contains('copy-code-button')) {
            // Copy 버튼 앞에 run 버튼 삽입
            copyButton.parentNode.insertBefore(runButton, copyButton);
        } else {
            // Copy 버튼이 없으면 컨테이너 뒤에 삽입
            container.insertAdjacentElement('afterend', runButton);
        }
    });
}

// 메시지 수신 핸들러 (파일 선택 및 기타 명령)
window.addEventListener('message', event => {
    const message = event.data;
    switch (message.command) {
        case 'fileSelected':
            addSelectedFile(message.filePath, message.fileName);
            break;
        case 'hideLoading':
            hideLoading();
            break;
    }
}); 