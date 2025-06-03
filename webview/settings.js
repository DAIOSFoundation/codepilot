// settings.js
const vscode = acquireVsCodeApi();

// DOM 요소 참조
const sourcePathsList = document.getElementById('source-paths-list');
const addDirectoryButton = document.getElementById('add-directory-button');
const sourcePathStatus = document.getElementById('source-path-status'); // ID 수정

const autoUpdateToggle = document.getElementById('auto-update-toggle');
const autoUpdateStatus = document.getElementById('auto-update-status');

// UI 업데이트 함수 (소스 경로)
function updateSourcePathsList(paths) {
    sourcePathsList.innerHTML = '';
    if (!paths || paths.length === 0) {
        sourcePathsList.innerHTML = '<li class="path-item" style="justify-content: center; color: var(--vscode-descriptionForeground);">지정된 경로 없음</li>';
    } else {
        paths.forEach(path => {
            const listItem = document.createElement('li');
            listItem.classList.add('path-item');
            listItem.innerHTML = `
                <span class="path-text" title="${path}">${path}</span>
                <button class="delete-button" data-path="${path}" title="경로 삭제">×</button>
            `; // title 속성 추가, X 버튼 텍스트 명확화
            sourcePathsList.appendChild(listItem);
        });
    }
}

// 상태 메시지 표시
function showStatus(element, message, type = 'info', duration = 3000) {
    if (!element) return;
    element.textContent = message;
    element.className = `info-message ${type}-message`; // 기존 클래스 초기화 후 새 클래스 적용
    if (type === 'success' || type === 'error') {
        setTimeout(() => {
            element.textContent = '';
            element.className = 'info-message';
        }, duration);
    }
}

// 이벤트 리스너: 경로 추가 버튼
if (addDirectoryButton) {
    addDirectoryButton.addEventListener('click', () => {
        showStatus(sourcePathStatus, '경로 선택 창 열림...', 'info');
        vscode.postMessage({ command: 'addDirectory' });
    });
}

// 이벤트 리스너: 경로 삭제 버튼 (이벤트 위임)
if (sourcePathsList) {
    sourcePathsList.addEventListener('click', (event) => {
        const target = event.target;
        if (target && target.classList.contains('delete-button')) {
            const pathToRemove = target.dataset.path;
            if (pathToRemove) {
                showStatus(sourcePathStatus, `'${pathToRemove}' 삭제 요청 중...`, 'info');
                vscode.postMessage({ command: 'removeDirectory', path: pathToRemove });
            }
        }
    });
}

// 이벤트 리스너: 자동 업데이트 토글
if (autoUpdateToggle) {
    autoUpdateToggle.addEventListener('change', () => {
        const isChecked = autoUpdateToggle.checked;
        vscode.postMessage({ command: 'setAutoUpdate', enabled: isChecked });
        // UI 피드백은 extensionからの応答을 기다립니다.
        autoUpdateStatus.textContent = `설정 변경 중... (${isChecked ? '활성화' : '비활성화'})`;
    });
}

// 확장으로부터 메시지 수신
window.addEventListener('message', event => {
    const message = event.data;
    switch (message.command) {
        case 'currentSettings':
            console.log('Received currentSettings:', message);
            if (message.sourcePaths) {
                updateSourcePathsList(message.sourcePaths);
                showStatus(sourcePathStatus, '소스 경로 로드 완료.', 'success'); // 로드 완료 상태 표시
            }
            // autoUpdateEnabled 설정 반영은 그대로
            if (typeof message.autoUpdateEnabled === 'boolean' && autoUpdateToggle) {
                autoUpdateToggle.checked = message.autoUpdateEnabled;
                autoUpdateStatus.textContent = `현재: 자동 업데이트 ${message.autoUpdateEnabled ? '활성화됨' : '비활성화됨'}`;
            }
            break;
        case 'updatedSourcePaths': // <-- 수정: 확장으로부터 업데이트된 경로 목록을 받으면 UI 업데이트
            if (message.sourcePaths) {
                updateSourcePathsList(message.sourcePaths);
                showStatus(sourcePathStatus, '소스 경로 업데이트 완료.', 'success');
            }
            break;
        case 'autoUpdateStatusChanged': // 익스텐션에서 설정 변경 후 최종 상태 수신
            if (typeof message.enabled === 'boolean' && autoUpdateToggle) {
                autoUpdateToggle.checked = message.enabled;
                const statusText = `자동 업데이트 ${message.enabled ? '활성화됨' : '비활성화됨'}.`;
                showStatus(autoUpdateStatus, statusText, 'success');
                autoUpdateStatus.textContent = `현재: ${statusText}`; // showStatus 후에도 상태 유지
            }
            break;
        case 'pathAddError':
            showStatus(sourcePathStatus, `오류 (경로 추가): ${message.error}`, 'error');
            break;
        case 'pathRemoveError':
            showStatus(sourcePathStatus, `오류 (경로 삭제): ${message.error}`, 'error');
            break;
    }
});

// Webview 로드 시 초기 설정값 요청
document.addEventListener('DOMContentLoaded', () => {
    vscode.postMessage({ command: 'initSettings' });
    // 초기 로딩 상태 표시
    showStatus(sourcePathStatus, '설정 로드 중...', 'info');
    autoUpdateStatus.textContent = '자동 업데이트 설정 로드 중...'; // 초기 로딩 메시지
});