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
const imagePreviewContainer = document.getElementById('image-preview-container');
const imagePreview = document.getElementById('image-preview');
const removeImageButton = document.getElementById('remove-image-button');

// 파일 선택 관련 요소들
const fileSelectionArea = document.getElementById('file-selection-area');
const selectedFilesContainer = document.getElementById('selected-files-container');
const clearFilesButton = document.getElementById('clear-files-button');
const filePickerButton = document.getElementById('file-picker-button');

// 채팅 컨테이너 참조 추가
const chatContainer = document.getElementById('chat-container');

let thinkingBubbleElement = null;
let selectedImageBase64 = null; // Base64 인코딩된 이미지 데이터를 저장할 변수
let selectedImageMimeType = null; // 이미지 MIME 타입 저장
let selectedFiles = []; // 선택된 파일 목록

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
    chatInput.addEventListener('paste', handlePaste); // 붙여넣기 이벤트 리스너 추가
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

// 이미지 제거 버튼 클릭 이벤트 리스너
if (removeImageButton) {
    removeImageButton.addEventListener('click', removeAttachedImage);
}

// 파일 선택 관련 이벤트 리스너들
if (filePickerButton) {
    filePickerButton.addEventListener('click', openFilePicker);
}

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
                    selectedImageBase64 = e.target.result.split(',')[1]; // Get base64 string without data:image/...
                    selectedImageMimeType = file.type;

                    imagePreview.src = e.target.result;
                    imagePreviewContainer.classList.remove('hidden');
                    autoResizeTextarea(); // 썸네일 추가 후 입력창 높이 재조정
                    chatInput.focus();
                    
                    // 이미지 추가 후 패딩 업데이트
                    setTimeout(() => {
                        updateChatContainerPadding();
                    }, 0);
                };
                reader.readAsDataURL(file);
                imageFound = true;
                break; // 한 개의 이미지만 처리
            }
        }
    }
    if (imageFound) {
        event.preventDefault(); // 이미지가 붙여넣어졌으면 기본 텍스트 붙여넣기 방지
    }
}

function removeAttachedImage() {
    selectedImageBase64 = null;
    selectedImageMimeType = null;
    imagePreview.src = '#';
    imagePreviewContainer.classList.add('hidden');
    autoResizeTextarea(); // 썸네일 제거 후 입력창 높이 재조정
    chatInput.focus();
    
    // 이미지 제거 후 패딩 업데이트
    setTimeout(() => {
        updateChatContainerPadding();
    }, 0);
}

function handleSendMessage() {
    if (!chatInput) return;
    const text = chatInput.value.trimEnd(); // trim() 대신 trimEnd() 사용 (기존 로직 유지)
    if (text || selectedImageBase64 || selectedFiles.length > 0) { // 텍스트, 이미지, 또는 선택된 파일이 있을 때만 전송
        window.displayUserMessage(text, selectedImageBase64); // 이미지 데이터도 함께 전달
        window.showLoading(); // 로딩 애니메이션 표시

        vscode.postMessage({
            command: 'sendMessage',
            text: text,
            imageData: selectedImageBase64, // 이미지 데이터 전송
            imageMimeType: selectedImageMimeType, // 이미지 MIME 타입 전송
            selectedFiles: selectedFiles.map(file => file.path) // 선택된 파일 경로들 전송
        });

        chatInput.value = '';
        chatInput.style.height = 'auto';
        removeAttachedImage(); // 이미지 전송 후 썸네일 제거
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
    const fileSelectionArea = document.getElementById('file-selection-area');
    const chatInputArea = document.getElementById('chat-input-area');
    
    if (!bottomFixedArea || !chatInputArea) return;
    
    // 파일 선택 영역의 높이 (숨겨져 있으면 0)
    const fileSelectionHeight = fileSelectionArea && !fileSelectionArea.classList.contains('hidden') 
        ? fileSelectionArea.offsetHeight 
        : 0;
    
    // 입력 영역의 높이
    const chatInputHeight = chatInputArea.offsetHeight;
    
    // 전체 하단 고정 영역 높이 계산 (여유 공간 포함)
    const totalBottomHeight = fileSelectionHeight + chatInputHeight + 20; // 20px 여유 공간
    
    // 채팅 컨테이너의 하단 패딩을 동적으로 설정
    chatContainer.style.paddingBottom = `${totalBottomHeight}px`;
    
    console.log(`Bottom area height: ${totalBottomHeight}px (file: ${fileSelectionHeight}px, input: ${chatInputHeight}px)`);
}

document.addEventListener('DOMContentLoaded', () => {
    if (chatInput) {
        autoResizeTextarea();
    }
    // 초기 로드 시 Cancel 버튼 비활성화
    if (cancelButton) {
        cancelButton.disabled = true;
    }
    // 이미지 프리뷰 초기 숨김
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
            // console.log('Received command to display user message:', message.text, message.imageData);
            if (message.text !== undefined || message.imageData !== undefined) { // 텍스트 또는 이미지가 있을 때
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
            // console.log('Received message from extension:', message.text);
            console.log('Received message from extension:', {
                sender: message.sender,
                textLength: message.text ? message.text.length : 0,
                textPreview: message.text ? message.text.substring(0, 200) + '...' : 'undefined'
            });
            window.hideLoading(); // 응답을 받으면 로딩 버블 제거

            if (message.sender === 'CodePilot' && message.text !== undefined) {
                 console.log('Calling displayCodePilotMessage with text length:', message.text.length);
                 window.displayCodePilotMessage(message.text); // CodePilot 메시지 표시
            }
            break;

        case 'fileSelected':
            console.log('File selected:', message.filePath, message.fileName);
            if (message.filePath && message.fileName) {
                addSelectedFile(message.filePath, message.fileName);
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
function displayUserMessage(text, imageData = null) { // imageData 파라미터 추가
    if (!chatMessages) return;
    const userMessageElement = document.createElement('div');
    userMessageElement.classList.add('user-plain-message');

    // 이미지 데이터가 있으면 이미지 표시
    if (imageData) {
        const imgElement = document.createElement('img');
        imgElement.classList.add('user-message-image');
        imgElement.src = `data:image/png;base64,${imageData}`; // MIME 타입은 PNG로 가정하거나, 전송된 MIME 타입 사용
        userMessageElement.appendChild(imgElement);
    }

    // 텍스트가 있으면 텍스트 표시
    if (text) {
        const textNode = document.createElement('span');
        // DOMPurify.sanitize(text)는 HTML 태그를 제거하고 안전한 텍스트를 반환합니다.
        // .replace(/\n/g, '<br>')를 사용하여 줄바꿈을 HTML <br> 태그로 변환합니다.
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
    thinkingBubbleElement = messageContainer; // 엘리먼트 참조 저장

    // 로딩 애니메이션이 보일 때 Clear 버튼 비활성화, Cancel 버튼 활성화
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

        // 2. 코드 블록 처리 (HTML 태그 완전 제거, 순수 텍스트만)
        const preElement = document.createElement('pre');
        const codeElement = document.createElement('code');
        
        // HTML 엔티티만 디코딩하고 HTML 태그는 보존
        let cleanCodeContent = codeContent;
        
        // HTML 엔티티 디코딩
        const textarea = document.createElement('textarea');
        textarea.innerHTML = cleanCodeContent;
        cleanCodeContent = textarea.value;
        
        // HTML 태그는 제거하지 않고 보존 (HTML 엔티티만 디코딩)
        // 추가적인 HTML 엔티티 정리 (이미 디코딩된 것들은 다시 인코딩)
        cleanCodeContent = cleanCodeContent
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, ' ');
        
        // 코드 라인 수 계산
        const codeLines = cleanCodeContent.split('\n');
        const totalLines = codeLines.length;
        
        // 코드 블록 컨테이너 생성
        const codeBlockContainer = document.createElement('div');
        codeBlockContainer.classList.add('code-block-container');
        
        // 코드 블록 헤더 생성 (언어 표시만)
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
        
        // 코드 컨테이너 생성
        const codeContainer = document.createElement('div');
        codeContainer.classList.add('code-container');
        
        // 전체 코드 요소 (항상 표시)
        codeElement.textContent = cleanCodeContent;
        preElement.appendChild(codeElement);
        codeContainer.appendChild(preElement);
        
        // 코드 블록 컨테이너에 헤더와 코드 추가
        codeBlockContainer.appendChild(codeHeader);
        codeBlockContainer.appendChild(codeContainer);
        
        tempHtmlElements.appendChild(codeBlockContainer);

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

// renderBasicMarkdown 함수는 현재 md.render()로 대체되었으므로, 더 이상 사용되지 않습니다.
function renderBasicMarkdown(markdownText) {
    return markdownText; // 원본 텍스트를 그대로 반환 (사용되지 않음)
}


// --- 웹뷰 메시지 핸들러에서 호출되는 함수들을 전역 window 객체에 할당 ---
window.displayUserMessage = displayUserMessage;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.displayCodePilotMessage = displayCodePilotMessage;

// 파일 선택기 열기
function openFilePicker() {
    console.log('Opening file picker...');
    vscode.postMessage({ command: 'openFilePicker' });
}

// 선택된 파일 추가
function addSelectedFile(filePath, fileName) {
    // 중복 파일 체크
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

    // 구분선 요소 찾기
    const divider = document.querySelector('.file-input-divider');

    if (selectedFiles.length === 0) {
        fileSelectionArea.classList.add('hidden');
        if (divider) {
            divider.classList.add('hidden');
        }
    } else {
        fileSelectionArea.classList.remove('hidden');
        if (divider) {
            divider.classList.remove('hidden');
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
    
    // 파일 선택 영역이 변경되면 채팅 컨테이너 패딩 업데이트
    setTimeout(() => {
        updateChatContainerPadding();
    }, 0); // DOM 업데이트 후 실행
}
