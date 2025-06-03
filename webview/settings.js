// acquireVsCodeApi는 웹뷰 환경에서 전역으로 사용 가능합니다.
const vscode = acquireVsCodeApi();

// DOM 요소 참조
const sourcePathsList = document.getElementById('source-paths-list');
const addDirectoryButton = document.getElementById('add-directory-button');
const statusMessage = document.getElementById('status-message');

// 상태 변수
let currentSourcePaths = [];

// UI 업데이트 함수
function updateSourcePathsList(paths) {
    currentSourcePaths = paths;
    sourcePathsList.innerHTML = ''; // 목록 비우기
    if (paths.length === 0) {
        sourcePathsList.innerHTML = '<li class="path-item" style="justify-content: center; color: var(--vscode-descriptionForeground);">지정된 디렉토리 없음</li>';
    } else {
        paths.forEach(path => {
            const listItem = document.createElement('li');
            listItem.classList.add('path-item');
            // data-path 속성에 경로를 저장하여 삭제 시 사용
            listItem.innerHTML = `
                <span class="path-text">${path}</span>
                <button class="delete-button" data-path="${path}" title="디렉토리 삭제">X</button>
            `;
            sourcePathsList.appendChild(listItem);
        });
    }
}

// 상태 메시지 표시
function showStatus(message, type = 'info') {
    statusMessage.textContent = message;
    statusMessage.className = `info-message ${type}-message`;
    if (type === 'success' || type === 'error') {
        setTimeout(() => {
            statusMessage.textContent = '';
            statusMessage.className = 'info-message';
        }, 3000);
    }
}


// 이벤트 리스너: 디렉토리 추가 버튼 클릭
addDirectoryButton.addEventListener('click', () => {
    showStatus('디렉토리 선택 창 열림...', 'info');
    vscode.postMessage({ command: 'addDirectory' });
});

// 이벤트 리스너: 디렉토리 삭제 버튼 클릭 (이벤트 위임 사용)
sourcePathsList.addEventListener('click', (event) => {
    const target = event.target;
    // 클릭된 요소가 delete-button 클래스를 가지고 있는지 확인
    if (target && target.classList.contains('delete-button')) {
        const pathToRemove = target.dataset.path; // data-path 속성 값 가져오기
        if (pathToRemove) {
            showStatus('디렉토리 삭제 요청 중...', 'info');
            vscode.postMessage({ command: 'removeDirectory', path: pathToRemove });
        }
    }
});

// 확장 프로그램으로부터 메시지 수신
window.addEventListener('message', event => {
    const message = event.data;
    switch (message.command) {
        case 'currentSettings': // 초기 설정값 수신
            console.log('Received currentSettings from extension:', message.sourcePaths);
            if (message.sourcePaths) {
                updateSourcePathsList(message.sourcePaths);
                showStatus('설정 로드 완료.', 'success');
            }
            break;
        case 'updatedSourcePaths': // 디렉토리 추가/삭제 후 업데이트된 경로 목록 수신
            console.log('Received updatedSourcePaths from extension:', message.sourcePaths);
            if (message.sourcePaths) {
                updateSourcePathsList(message.sourcePaths);
                showStatus('설정 업데이트 완료.', 'success');
            }
            break;
        case 'pathAddError': // 디렉토리 추가 중 오류 발생 시
            showStatus(`오류: ${message.error}`, 'error');
            break;
        case 'pathRemoveError': // 디렉토리 삭제 중 오류 발생 시
            showStatus(`오류: ${message.error}`, 'error');
            break;
        // 'selectedDirectory' 메시지는 extension.ts에서 처리되므로 여기서는 필요 없음
    }
});

// Webview 로드 시 초기 설정값 요청
// DOMContentLoaded 이벤트 후에 메시지를 보내도록 하여 안전성 확보
document.addEventListener('DOMContentLoaded', () => {
    vscode.postMessage({ command: 'initSettings' });
});