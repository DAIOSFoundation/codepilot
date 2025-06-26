// settings.js
const vscode = acquireVsCodeApi();

// DOM 요소 참조
const sourcePathsList = document.getElementById('source-paths-list');
const addDirectoryButton = document.getElementById('add-directory-button');
const sourcePathStatus = document.getElementById('source-path-status');

const autoUpdateToggle = document.getElementById('auto-update-toggle');
const autoUpdateStatus = document.getElementById('auto-update-status');

const projectRootPathDisplay = document.getElementById('project-root-path-display');
const selectProjectRootButton = document.getElementById('select-project-root-button');
const clearProjectRootButton = document.getElementById('clear-project-root-button');
const projectRootStatus = document.getElementById('project-root-status');

// API 키 관련 요소들
const weatherApiKeyInput = document.getElementById('weather-api-key-input');
const saveWeatherApiKeyButton = document.getElementById('save-weather-api-key-button');
const weatherApiKeyStatus = document.getElementById('weather-api-key-status');

const newsApiKeyInput = document.getElementById('news-api-key-input');
const saveNewsApiKeyButton = document.getElementById('save-news-api-key-button');
const newsApiKeyStatus = document.getElementById('news-api-key-status');

const newsApiSecretInput = document.getElementById('news-api-secret-input');
const saveNewsApiSecretButton = document.getElementById('save-news-api-secret-button');
const newsApiSecretStatus = document.getElementById('news-api-secret-status');

const stockApiKeyInput = document.getElementById('stock-api-key-input');
const saveStockApiKeyButton = document.getElementById('save-stock-api-key-button');
const stockApiKeyStatus = document.getElementById('stock-api-key-status');

// Gemini API 키 관련 요소들
const geminiApiKeyInput = document.getElementById('gemini-api-key-input');
const saveGeminiApiKeyButton = document.getElementById('save-gemini-api-key-button');
const geminiApiKeyStatus = document.getElementById('gemini-api-key-status');

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
            `;
            sourcePathsList.appendChild(listItem);
        });
    }
}

// UI 업데이트 함수 (프로젝트 Root)
function updateProjectRootDisplay(rootPath) {
    if (projectRootPathDisplay) {
        if (rootPath) {
            projectRootPathDisplay.textContent = rootPath;
            projectRootPathDisplay.title = rootPath;
        } else {
            projectRootPathDisplay.textContent = '설정된 프로젝트 Root 없음';
            projectRootPathDisplay.title = '설정된 프로젝트 Root 없음';
        }
    }
}

// 상태 메시지 표시
function showStatus(element, message, type = 'info', duration = 3000) {
    if (!element) return;
    element.textContent = message;
    element.className = `info-message ${type}-message`;
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

// 이벤트 리스너: 프로젝트 Root 선택 버튼
if (selectProjectRootButton) {
    selectProjectRootButton.addEventListener('click', () => {
        showStatus(projectRootStatus, '프로젝트 Root 선택 창 열림...', 'info');
        vscode.postMessage({ command: 'setProjectRoot' });
    });
}

// 이벤트 리스너: 프로젝트 Root 지우기 버튼
if (clearProjectRootButton) {
    clearProjectRootButton.addEventListener('click', () => {
        showStatus(projectRootStatus, '프로젝트 Root 지우는 중...', 'info');
        vscode.postMessage({ command: 'setProjectRoot', clear: true }); // clear 플래그 전송
    });
}

// 이벤트 리스너: 자동 업데이트 토글
if (autoUpdateToggle) {
    autoUpdateToggle.addEventListener('change', () => {
        const isChecked = autoUpdateToggle.checked;
        vscode.postMessage({ command: 'setAutoUpdate', enabled: isChecked });
        autoUpdateStatus.textContent = `설정 변경 중... (${isChecked ? '활성화' : '비활성화'})`;
    });
}

// API 키 저장 이벤트 리스너들
if (saveWeatherApiKeyButton) {
    saveWeatherApiKeyButton.addEventListener('click', () => {
        const apiKey = weatherApiKeyInput.value.trim();
        vscode.postMessage({ command: 'saveWeatherApiKey', apiKey: apiKey });
        showStatus(weatherApiKeyStatus, '기상청 API 키 저장 중...', 'info');
    });
}

if (saveNewsApiKeyButton) {
    saveNewsApiKeyButton.addEventListener('click', () => {
        const apiKey = newsApiKeyInput.value.trim();
        vscode.postMessage({ command: 'saveNewsApiKey', apiKey: apiKey });
        showStatus(newsApiKeyStatus, '네이버 API Client ID 저장 중...', 'info');
    });
}

if (saveNewsApiSecretButton) {
    saveNewsApiSecretButton.addEventListener('click', () => {
        const apiSecret = newsApiSecretInput.value.trim();
        vscode.postMessage({ command: 'saveNewsApiSecret', apiSecret: apiSecret });
        showStatus(newsApiSecretStatus, '네이버 API Client Secret 저장 중...', 'info');
    });
}

if (saveStockApiKeyButton) {
    saveStockApiKeyButton.addEventListener('click', () => {
        const apiKey = stockApiKeyInput.value.trim();
        vscode.postMessage({ command: 'saveStockApiKey', apiKey: apiKey });
        showStatus(stockApiKeyStatus, '주식 API 키 저장 중...', 'info');
    });
}

// Gemini API 키 저장 이벤트 리스너
if (saveGeminiApiKeyButton) {
    saveGeminiApiKeyButton.addEventListener('click', () => {
        const apiKey = geminiApiKeyInput.value.trim();
        if (apiKey) {
            vscode.postMessage({ command: 'saveApiKey', apiKey: apiKey });
            showStatus(geminiApiKeyStatus, 'Gemini API 키 저장 중...', 'info');
        } else {
            showStatus(geminiApiKeyStatus, 'API 키를 입력해주세요.', 'error');
        }
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
                showStatus(sourcePathStatus, '소스 경로 로드 완료.', 'success');
            }
            if (typeof message.autoUpdateEnabled === 'boolean' && autoUpdateToggle) {
                autoUpdateToggle.checked = message.autoUpdateEnabled;
                autoUpdateStatus.textContent = `현재: 자동 업데이트 ${message.autoUpdateEnabled ? '활성화됨' : '비활성화됨'}`;
            }
            if (typeof message.projectRoot === 'string') {
                updateProjectRootDisplay(message.projectRoot);
                showStatus(projectRootStatus, '프로젝트 Root 로드 완료.', 'success');
            }
            break;
        case 'updatedSourcePaths':
            if (message.sourcePaths) {
                updateSourcePathsList(message.sourcePaths);
                showStatus(sourcePathStatus, '소스 경로 업데이트 완료.', 'success');
            }
            break;
        case 'updatedProjectRoot':
            if (typeof message.projectRoot === 'string') {
                updateProjectRootDisplay(message.projectRoot);
                const statusText = message.projectRoot ? `프로젝트 Root 업데이트 완료: ${message.projectRoot}` : '프로젝트 Root가 지워졌습니다.';
                showStatus(projectRootStatus, statusText, 'success');
            }
            break;
        case 'autoUpdateStatusChanged':
            if (typeof message.enabled === 'boolean' && autoUpdateToggle) {
                autoUpdateToggle.checked = message.enabled;
                const statusText = `자동 업데이트 ${message.enabled ? '활성화됨' : '비활성화됨'}.`;
                showStatus(autoUpdateStatus, statusText, 'success');
                autoUpdateStatus.textContent = `현재: ${statusText}`;
            }
            break;
        case 'pathAddError':
            showStatus(sourcePathStatus, `오류 (경로 추가): ${message.error}`, 'error');
            break;
        case 'pathRemoveError':
            showStatus(sourcePathStatus, `오류 (경로 삭제): ${message.error}`, 'error');
            break;
        case 'projectRootError':
            showStatus(projectRootStatus, `오류 (프로젝트 Root 설정): ${message.error}`, 'error');
            break;
        case 'currentApiKeys':
            // API 키 상태 로드
            if (weatherApiKeyInput && typeof message.weatherApiKey === 'string') {
                weatherApiKeyInput.value = message.weatherApiKey;
                const status = message.weatherApiKey ? '기상청 API 키가 설정되어 있습니다.' : '기상청 API 키가 설정되지 않았습니다.';
                showStatus(weatherApiKeyStatus, status, message.weatherApiKey ? 'success' : 'info');
            }
            if (newsApiKeyInput && typeof message.newsApiKey === 'string') {
                newsApiKeyInput.value = message.newsApiKey;
                const status = message.newsApiKey ? '네이버 API Client ID가 설정되어 있습니다.' : '네이버 API Client ID가 설정되지 않았습니다.';
                showStatus(newsApiKeyStatus, status, message.newsApiKey ? 'success' : 'info');
            }
            if (newsApiSecretInput && typeof message.newsApiSecret === 'string') {
                newsApiSecretInput.value = message.newsApiSecret;
                const status = message.newsApiSecret ? '네이버 API Client Secret이 설정되어 있습니다.' : '네이버 API Client Secret이 설정되지 않았습니다.';
                showStatus(newsApiSecretStatus, status, message.newsApiSecret ? 'success' : 'info');
            }
            if (stockApiKeyInput && typeof message.stockApiKey === 'string') {
                stockApiKeyInput.value = message.stockApiKey;
                const status = message.stockApiKey ? '주식 API 키가 설정되어 있습니다.' : '주식 API 키가 설정되지 않았습니다.';
                showStatus(stockApiKeyStatus, status, message.stockApiKey ? 'success' : 'info');
            }
            // Gemini API 키 상태 로드
            if (geminiApiKeyInput && typeof message.geminiApiKey === 'string') {
                geminiApiKeyInput.value = message.geminiApiKey;
                const status = message.geminiApiKey ? 'Gemini API 키가 설정되어 있습니다.' : 'Gemini API 키가 설정되지 않았습니다.';
                showStatus(geminiApiKeyStatus, status, message.geminiApiKey ? 'success' : 'info');
            }
            break;
        case 'weatherApiKeySaved':
            showStatus(weatherApiKeyStatus, '기상청 API 키가 저장되었습니다.', 'success');
            weatherApiKeyInput.value = '';
            break;
        case 'weatherApiKeyError':
            showStatus(weatherApiKeyStatus, `기상청 API 키 저장 실패: ${message.error}`, 'error');
            break;
        case 'newsApiKeySaved':
            showStatus(newsApiKeyStatus, '네이버 API Client ID가 저장되었습니다.', 'success');
            newsApiKeyInput.value = '';
            break;
        case 'newsApiKeyError':
            showStatus(newsApiKeyStatus, `네이버 API Client ID 저장 실패: ${message.error}`, 'error');
            break;
        case 'newsApiSecretSaved':
            showStatus(newsApiSecretStatus, '네이버 API Client Secret이 저장되었습니다.', 'success');
            newsApiSecretInput.value = '';
            break;
        case 'newsApiSecretError':
            showStatus(newsApiSecretStatus, `네이버 API Client Secret 저장 실패: ${message.error}`, 'error');
            break;
        case 'stockApiKeySaved':
            showStatus(stockApiKeyStatus, '주식 API 키가 저장되었습니다.', 'success');
            stockApiKeyInput.value = '';
            break;
        case 'stockApiKeyError':
            showStatus(stockApiKeyStatus, `주식 API 키 저장 실패: ${message.error}`, 'error');
            break;
        case 'apiKeySaved':
            showStatus(geminiApiKeyStatus, 'Gemini API 키가 저장되었습니다.', 'success');
            geminiApiKeyInput.value = '';
            break;
        case 'apiKeySaveError':
            showStatus(geminiApiKeyStatus, `Gemini API 키 저장 실패: ${message.error}`, 'error');
            break;
    }
});

// Webview 로드 시 초기 설정값 요청
document.addEventListener('DOMContentLoaded', () => {
    vscode.postMessage({ command: 'initSettings' });
    showStatus(sourcePathStatus, '설정 로드 중...', 'info');
    autoUpdateStatus.textContent = '자동 업데이트 설정 로드 중...';
    projectRootStatus.textContent = '프로젝트 Root 설정 로드 중...';
    
    // API 키 상태 요청
    vscode.postMessage({ command: 'loadApiKeys' });
    showStatus(weatherApiKeyStatus, 'API 키 로드 중...', 'info');
    showStatus(newsApiKeyStatus, 'API 키 로드 중...', 'info');
    showStatus(stockApiKeyStatus, 'API 키 로드 중...', 'info');
    showStatus(geminiApiKeyStatus, 'API 키 로드 중...', 'info');
});
