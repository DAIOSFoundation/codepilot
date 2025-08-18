// settings.js
const vscode = acquireVsCodeApi();

// DOM 요소 참조
const sourcePathsList = document.getElementById('source-paths-list');
const addSourcePathButton = document.getElementById('add-source-path-button');
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

// Ollama API URL 관련 요소들
const ollamaApiUrlInput = document.getElementById('ollama-api-url-input');
const saveOllamaApiUrlButton = document.getElementById('save-ollama-api-url-button');
const ollamaApiUrlStatus = document.getElementById('ollama-api-url-status');

// Ollama 엔드포인트 관련 요소들
const ollamaEndpointSelect = document.getElementById('ollama-endpoint-select');
const saveOllamaEndpointButton = document.getElementById('save-ollama-endpoint-button');
const ollamaEndpointStatus = document.getElementById('ollama-endpoint-status');

// Banya 라이센스 관련 요소들
const banyaLicenseSerialInput = document.getElementById('banya-license-serial-input');
const saveBanyaLicenseButton = document.getElementById('save-banya-license-button');
const verifyBanyaLicenseButton = document.getElementById('verify-banya-license-button');
const deleteBanyaLicenseButton = document.getElementById('delete-banya-license-button');
const banyaLicenseStatus = document.getElementById('banya-license-status');

// AI 모델 선택 관련 요소들
const aiModelSelect = document.getElementById('ai-model-select');
const geminiSettingsSection = document.getElementById('gemini-settings-section');
const ollamaSettingsSection = document.getElementById('ollama-settings-section');

// 라이센스 검증 상태 추적
let isLicenseVerified = false;

// 저장 버튼들의 활성화/비활성화를 제어하는 함수
function updateSaveButtonsState() {
    const saveButtons = [
        saveGeminiApiKeyButton,
        saveOllamaApiUrlButton,
        saveOllamaEndpointButton,
        saveWeatherApiKeyButton,
        saveNewsApiKeyButton,
        saveNewsApiSecretButton,
        saveStockApiKeyButton
    ];
    
    console.log('Updating save buttons state. License verified:', isLicenseVerified);
    
    saveButtons.forEach(button => {
        if (button) {
            if (isLicenseVerified) {
                button.disabled = false;
                button.style.opacity = '1';
                button.style.cursor = 'pointer';
                console.log('Button enabled:', button.id);
            } else {
                button.disabled = true;
                button.style.opacity = '0.5';
                button.style.cursor = 'not-allowed';
                console.log('Button disabled:', button.id);
            }
        }
    });
}

// 라이센스 버튼들의 활성화/비활성화를 제어하는 함수
function updateLicenseButtonsState() {
    const hasStoredLicense = banyaLicenseSerialInput && banyaLicenseSerialInput.value.trim() !== '';
    
    // 라이센스 저장 버튼: 검증이 완료되어야 활성화
    if (saveBanyaLicenseButton) {
        if (isLicenseVerified) {
            saveBanyaLicenseButton.disabled = false;
            saveBanyaLicenseButton.style.opacity = '1';
            saveBanyaLicenseButton.style.cursor = 'pointer';
        } else {
            saveBanyaLicenseButton.disabled = true;
            saveBanyaLicenseButton.style.opacity = '0.5';
            saveBanyaLicenseButton.style.cursor = 'not-allowed';
        }
    }
    
    // 라이센스 삭제 버튼: 저장된 라이센스가 있어야 활성화
    if (deleteBanyaLicenseButton) {
        if (hasStoredLicense) {
            deleteBanyaLicenseButton.disabled = false;
            deleteBanyaLicenseButton.style.opacity = '1';
            deleteBanyaLicenseButton.style.cursor = 'pointer';
        } else {
            deleteBanyaLicenseButton.disabled = true;
            deleteBanyaLicenseButton.style.opacity = '0.5';
            deleteBanyaLicenseButton.style.cursor = 'not-allowed';
        }
    }
    
    // 라이센스 검증 버튼: 항상 활성화 (입력값이 있을 때만)
    if (verifyBanyaLicenseButton) {
        const hasInputValue = banyaLicenseSerialInput && banyaLicenseSerialInput.value.trim() !== '';
        verifyBanyaLicenseButton.disabled = !hasInputValue;
        verifyBanyaLicenseButton.style.opacity = hasInputValue ? '1' : '0.5';
        verifyBanyaLicenseButton.style.cursor = hasInputValue ? 'pointer' : 'not-allowed';
    }
}

// 언어별 텍스트 로딩 및 적용
const languageSelect = document.getElementById('language-select');
const saveLanguageButton = document.getElementById('save-language-button');
let currentLanguage = 'ko'; // 기본값
let languageData = {};

async function loadLanguage(lang) {
    try {
        console.log('Requesting language data from extension:', lang);
        // 확장 프로그램에 언어 데이터 요청
        vscode.postMessage({ command: 'getLanguageData', language: lang });
    } catch (e) {
        console.error('Failed to load language:', lang, e);
    }
}

function applyLanguage() {
    console.log('Applying language:', currentLanguage, languageData);
    
    // 타이틀
    const settingsTitle = document.getElementById('settings-title');
    if (settingsTitle && languageData['settingsTitle']) {
        settingsTitle.textContent = languageData['settingsTitle'];
        console.log('Updated settings title:', languageData['settingsTitle']);
    }

    // 언어 라벨
    const languageLabel = document.getElementById('language-label');
    if (languageLabel && languageData['languageLabel']) {
        languageLabel.textContent = languageData['languageLabel'];
        console.log('Updated language label:', languageData['languageLabel']);
    }

    // 언어 저장 버튼
    const saveLanguageButton = document.getElementById('save-language-button');
    if (saveLanguageButton && languageData['saveButton']) {
        saveLanguageButton.textContent = languageData['saveButton'];
        console.log('Updated save language button:', languageData['saveButton']);
    }

    // API 키 섹션 타이틀
    const apiKeySectionTitle = document.getElementById('api-key-section-title');
    if (apiKeySectionTitle && languageData['apiKeySectionTitle']) {
        apiKeySectionTitle.textContent = languageData['apiKeySectionTitle'];
        console.log('Updated API key section title:', languageData['apiKeySectionTitle']);
    }

    // Gemini API 키 라벨
    const geminiApiKeyLabel = document.getElementById('gemini-api-key-label');
    if (geminiApiKeyLabel && languageData['geminiApiKeyLabel']) {
        geminiApiKeyLabel.textContent = languageData['geminiApiKeyLabel'];
        console.log('Updated Gemini API key label:', languageData['geminiApiKeyLabel']);
    }

    // Gemini API 설명 (기존 변수 사용)
    const geminiApiDescriptionForLabel = document.querySelector('#gemini-api-key-label + p');
    if (geminiApiDescriptionForLabel && languageData['geminiApiDescription']) {
        geminiApiDescriptionForLabel.textContent = languageData['geminiApiDescription'];
        console.log('Updated Gemini API description:', languageData['geminiApiDescription']);
    }

    // Gemini API 등록 방법 (기존 변수 사용)
    const geminiApiRegistrationMethodForLabel = document.querySelector('#gemini-api-key-label + p + p');
    if (geminiApiRegistrationMethodForLabel && languageData['geminiApiRegistrationMethod']) {
        // 링크는 유지하면서 텍스트만 업데이트
        const linkMatch = geminiApiRegistrationMethodForLabel.innerHTML.match(/<a[^>]*>([^<]*)<\/a>/);
        if (linkMatch) {
            const linkText = linkMatch[1];
            const newText = languageData['geminiApiRegistrationMethod'].replace('Google AI Studio API 키 페이지', `<a href="https://aistudio.google.com/app/apikey" target="_blank">${linkText}</a>`);
            geminiApiRegistrationMethodForLabel.innerHTML = newText;
        } else {
            geminiApiRegistrationMethodForLabel.textContent = languageData['geminiApiRegistrationMethod'];
        }
        console.log('Updated Gemini API registration method:', languageData['geminiApiRegistrationMethod']);
    }

    // Gemini 저장 버튼
    const saveGeminiApiKeyButton = document.getElementById('save-gemini-api-key-button');
    if (saveGeminiApiKeyButton && languageData['saveGeminiApiKeyButton']) {
        saveGeminiApiKeyButton.textContent = languageData['saveGeminiApiKeyButton'];
        console.log('Updated Gemini save button:', languageData['saveGeminiApiKeyButton']);
    }

    // Gemini 저장 상태 - 현재 상태에 따라 업데이트
    const geminiApiKeyStatus = document.getElementById('gemini-api-key-status');
    if (geminiApiKeyStatus) {
        const currentText = geminiApiKeyStatus.textContent;
        if (currentText.includes('저장됨') || currentText.includes('Saved') || currentText.includes('Gespeichert') || currentText.includes('Guardado') || currentText.includes('Enregistré') || currentText.includes('保存済み') || currentText.includes('已保存')) {
            geminiApiKeyStatus.textContent = languageData['geminiApiKeyStatusSaved'];
        } else if (currentText.includes('미저장') || currentText.includes('Not Saved') || currentText.includes('Nicht gespeichert') || currentText.includes('No guardado') || currentText.includes('Non enregistré') || currentText.includes('未保存') || currentText.includes('未保存')) {
            geminiApiKeyStatus.textContent = languageData['geminiApiKeyStatusNotSaved'];
        }
    }

    // Weather API 키 라벨
    const weatherApiKeyLabel = document.getElementById('weather-api-key-label');
    if (weatherApiKeyLabel && languageData['weatherApiKeyLabel']) {
        weatherApiKeyLabel.textContent = languageData['weatherApiKeyLabel'];
        console.log('Updated weather API key label:', languageData['weatherApiKeyLabel']);
    }

    // Weather API 설명
    const weatherApiDescription = document.querySelector('#weather-api-key-label + p');
    if (weatherApiDescription && languageData['weatherApiDescription']) {
        weatherApiDescription.textContent = languageData['weatherApiDescription'];
        console.log('Updated weather API description:', languageData['weatherApiDescription']);
    }

    // Weather API 등록 방법
    const weatherApiRegistrationMethod = document.querySelector('#weather-api-key-label + p + p');
    if (weatherApiRegistrationMethod && languageData['weatherApiRegistrationMethod']) {
        // 링크는 유지하면서 텍스트만 업데이트
        const linkMatch = weatherApiRegistrationMethod.innerHTML.match(/<a[^>]*>([^<]*)<\/a>/);
        if (linkMatch) {
            const linkText = linkMatch[1];
            const newText = languageData['weatherApiRegistrationMethod'].replace('기상청 API 허브', `<a href="https://apihub.kma.go.kr/" target="_blank">${linkText}</a>`);
            weatherApiRegistrationMethod.innerHTML = newText;
        } else {
            weatherApiRegistrationMethod.textContent = languageData['weatherApiRegistrationMethod'];
        }
        console.log('Updated weather API registration method:', languageData['weatherApiRegistrationMethod']);
    }

    // News API 키 라벨
    const newsApiKeyLabel = document.getElementById('news-api-key-label');
    if (newsApiKeyLabel && languageData['newsApiKeyLabel']) {
        newsApiKeyLabel.textContent = languageData['newsApiKeyLabel'];
        console.log('Updated news API key label:', languageData['newsApiKeyLabel']);
    }

    // News API 설명
    const newsApiDescription = document.querySelector('#news-api-key-label + p');
    if (newsApiDescription && languageData['newsApiDescription']) {
        newsApiDescription.textContent = languageData['newsApiDescription'];
        console.log('Updated news API description:', languageData['newsApiDescription']);
    }

    // News API 등록 방법
    const newsApiRegistrationMethod = document.querySelector('#news-api-key-label + p + p');
    if (newsApiRegistrationMethod && languageData['newsApiRegistrationMethod']) {
        // 링크는 유지하면서 텍스트만 업데이트
        const linkMatch = newsApiRegistrationMethod.innerHTML.match(/<a[^>]*>([^<]*)<\/a>/);
        if (linkMatch) {
            const linkText = linkMatch[1];
            const newText = languageData['newsApiRegistrationMethod'].replace('네이버 개발자 센터', `<a href="https://developers.naver.com/apps/#/list" target="_blank">${linkText}</a>`);
            newsApiRegistrationMethod.innerHTML = newText;
        } else {
            newsApiRegistrationMethod.textContent = languageData['newsApiRegistrationMethod'];
        }
        console.log('Updated news API registration method:', languageData['newsApiRegistrationMethod']);
    }

    // Stock API 키 라벨
    const stockApiKeyLabel = document.getElementById('stock-api-key-label');
    if (stockApiKeyLabel && languageData['stockApiKeyLabel']) {
        stockApiKeyLabel.textContent = languageData['stockApiKeyLabel'];
        console.log('Updated stock API key label:', languageData['stockApiKeyLabel']);
    }

    // Stock API 설명
    const stockApiDescription = document.querySelector('#stock-api-key-label + p');
    if (stockApiDescription && languageData['stockApiDescription']) {
        stockApiDescription.textContent = languageData['stockApiDescription'];
        console.log('Updated stock API description:', languageData['stockApiDescription']);
    }

    // Stock API 등록 방법
    const stockApiRegistrationMethod = document.querySelector('#stock-api-key-label + p + p');
    if (stockApiRegistrationMethod && languageData['stockApiRegistrationMethod']) {
        // 링크는 유지하면서 텍스트만 업데이트
        const linkMatch = stockApiRegistrationMethod.innerHTML.match(/<a[^>]*>([^<]*)<\/a>/);
        if (linkMatch) {
            const linkText = linkMatch[1];
            const newText = languageData['stockApiRegistrationMethod'].replace('Alpha Vantage', `<a href="https://www.alphavantage.co/support/#api-key" target="_blank">${linkText}</a>`);
            stockApiRegistrationMethod.innerHTML = newText;
        } else {
            stockApiRegistrationMethod.textContent = languageData['stockApiRegistrationMethod'];
        }
        console.log('Updated stock API registration method:', languageData['stockApiRegistrationMethod']);
    }

    // 공통 저장 버튼들
    document.querySelectorAll('.save-button').forEach(btn => {
        if (languageData['saveButton']) {
            btn.textContent = languageData['saveButton'];
            console.log('Updated save button:', languageData['saveButton']);
        }
    });

    // 프로젝트 루트 라벨
    const projectRootLabel = document.getElementById('project-root-label');
    if (projectRootLabel && languageData['projectRootLabel']) {
        projectRootLabel.textContent = languageData['projectRootLabel'];
        console.log('Updated project root label:', languageData['projectRootLabel']);
    }

    // 프로젝트 루트 설명
    const projectRootDescription = document.getElementById('project-root-description');
    if (projectRootDescription && languageData['projectRootDescription']) {
        projectRootDescription.textContent = languageData['projectRootDescription'];
        console.log('Updated project root description:', languageData['projectRootDescription']);
    }

    // 소스 경로 라벨
    const sourcePathLabel = document.getElementById('source-path-label');
    if (sourcePathLabel && languageData['sourcePathLabel']) {
        sourcePathLabel.textContent = languageData['sourcePathLabel'];
        console.log('Updated source path label:', languageData['sourcePathLabel']);
    }

    // 소스 경로 추가 버튼
    const addSourcePathButton = document.getElementById('add-source-path-button');
    if (addSourcePathButton && languageData['addSourcePathButton']) {
        addSourcePathButton.textContent = languageData['addSourcePathButton'];
        console.log('Updated add source path button:', languageData['addSourcePathButton']);
    }

    // 자동 파일 업데이트 라벨
    const autoUpdateLabel = document.getElementById('auto-update-label');
    if (autoUpdateLabel && languageData['autoUpdateLabel']) {
        autoUpdateLabel.textContent = languageData['autoUpdateLabel'];
        console.log('Updated auto update label:', languageData['autoUpdateLabel']);
    }

    // 자동 파일 업데이트 on/off
    const autoUpdateOn = document.getElementById('auto-update-on');
    if (autoUpdateOn && languageData['autoUpdateOn']) {
        autoUpdateOn.textContent = languageData['autoUpdateOn'];
        console.log('Updated auto update on:', languageData['autoUpdateOn']);
    }
    const autoUpdateOff = document.getElementById('auto-update-off');
    if (autoUpdateOff && languageData['autoUpdateOff']) {
        autoUpdateOff.textContent = languageData['autoUpdateOff'];
        console.log('Updated auto update off:', languageData['autoUpdateOff']);
    }

    // 자동 파일 업데이트 활성화 텍스트
    const autoUpdateEnabledText = document.getElementById('auto-update-enabled-text');
    if (autoUpdateEnabledText && languageData['autoUpdateEnabled']) {
        autoUpdateEnabledText.textContent = languageData['autoUpdateEnabled'];
        console.log('Updated auto update enabled text:', languageData['autoUpdateEnabled']);
    }

    // 외부 API 키 설정 제목
    const externalApiKeysTitle = document.getElementById('external-api-keys-title');
    if (externalApiKeysTitle && languageData['externalApiKeysTitle']) {
        externalApiKeysTitle.textContent = languageData['externalApiKeysTitle'];
        console.log('Updated external API keys title:', languageData['externalApiKeysTitle']);
    }

    // 프로젝트 Root 선택 버튼
    const selectProjectRootButton = document.getElementById('select-project-root-button');
    if (selectProjectRootButton && languageData['addSourcePathButton']) {
        selectProjectRootButton.textContent = languageData['addSourcePathButton'];
        console.log('Updated select project root button:', languageData['addSourcePathButton']);
    }

    // 기타 설명 텍스트들 (p 태그들) - 더 정확한 매칭으로 개선
    const infoMessages = document.querySelectorAll('.info-message');
    infoMessages.forEach(msg => {
        const text = msg.textContent;
        if (text && (text.includes('CodePilot이 프로젝트의 최상위 경로로 인식할 디렉토리를 설정합니다') || 
                     text.includes('Set the directory that CodePilot will recognize') ||
                     text.includes('Establece el directorio que CodePilot reconocerá') ||
                     text.includes('Définissez le répertoire que CodePilot reconnaîtra') ||
                     text.includes('設定 CodePilot 将识别为项目顶级路径的目录') ||
                     text.includes('CodePilotがプロジェクトの最上位パスとして認識するディレクトリを設定します'))) {
            // 프로젝트 Root 설명
            if (languageData['projectRootDescription']) {
                msg.textContent = languageData['projectRootDescription'];
            }
        } else if (text && (text.includes('CodePilot이 AI 응답을 생성할 때 참조할 소스 코드 경로 목록입니다') ||
                           text.includes('This is a list of source code paths that CodePilot will reference') ||
                           text.includes('Esta es una lista de rutas de código fuente que CodePilot referenciará') ||
                           text.includes('Ceci est une liste de chemins de code source que CodePilot référencera') ||
                           text.includes('这是 CodePilot 在生成 AI 响应时将引用的源代码路径列表') ||
                           text.includes('これは、CodePilotがAI応答を生成する際に参照するソースコードパスのリストです'))) {
            // 소스 경로 설명
            if (languageData['sourcePathDescription']) {
                msg.textContent = languageData['sourcePathDescription'];
            }
        } else if (text && (text.includes('LLM이 제안한 코드를 기반으로 파일을 자동으로 업데이트할지 여부를 설정합니다') ||
                           text.includes('Set whether to automatically update files based on code suggested by the LLM') ||
                           text.includes('Establece si actualizar automáticamente archivos basándose en código sugerido por el LLM') ||
                           text.includes('Définissez s\'il faut mettre à jour automatiquement les fichiers en fonction du code suggéré par le LLM') ||
                           text.includes('设置是否基于 LLM 建议的代码自动更新文件') ||
                           text.includes('LLMが提案したコードに基づいてファイルを自動更新するかどうかを設定します'))) {
            // 자동 업데이트 설명
            if (languageData['autoUpdateDescription']) {
                msg.textContent = languageData['autoUpdateDescription'];
            }
        } else if (text && (text.includes('설정 변경은 즉시 저장됩니다') ||
                           text.includes('Settings are saved immediately when changed') ||
                           text.includes('La configuración se guarda inmediatamente cuando se cambia') ||
                           text.includes('Les paramètres sont enregistrés immédiatement lors de la modification') ||
                           text.includes('设置更改时立即保存') ||
                           text.includes('設定は変更時に即座に保存されます') ||
                           text.includes('Einstellungen werden sofort gespeichert, wenn sie geändert werden'))) {
            // 설정 저장 설명
            if (languageData['settingsSavedImmediately']) {
                msg.textContent = languageData['settingsSavedImmediately'];
            }
        } else if (text && (text.includes('CodePilot의 AI 기능을 사용하기 위한 Gemini API 키를 설정합니다') ||
                           text.includes('Set the Gemini API key to use CodePilot\'s AI features') ||
                           text.includes('Establece la clave API de Gemini para usar las funciones de IA de CodePilot') ||
                           text.includes('Définissez la clé API Gemini pour utiliser les fonctionnalités IA de CodePilot') ||
                           text.includes('设置 Gemini API 密钥以使用 CodePilot 的 AI 功能') ||
                           text.includes('CodePilotのAI機能を使用するためのGemini APIキーを設定します'))) {
            // Gemini API 설명
            if (languageData['geminiApiDescription']) {
                msg.textContent = languageData['geminiApiDescription'];
            }
        } else if (text && (text.includes('AI 코드 생성 및 분석 기능을 활성화합니다') ||
                           text.includes('Enables AI code generation and analysis features') ||
                           text.includes('Habilita las funciones de generación y análisis de código de IA') ||
                           text.includes('Active les fonctionnalités de génération et d\'analyse de code IA') ||
                           text.includes('启用 AI 代码生成和分析功能') ||
                           text.includes('AIコード生成と分析機能を有効にします'))) {
            // Gemini API 기능 설명
            if (languageData['geminiApiFunctionDescription']) {
                msg.textContent = languageData['geminiApiFunctionDescription'];
            }
        } else if (text && (text.includes('실시간 정보 기능을 사용하기 위한 외부 API 키들을 설정합니다') ||
                           text.includes('Set external API keys to use real-time information features') ||
                           text.includes('Establece claves API externas para usar funciones de información en tiempo real') ||
                           text.includes('Définissez les clés API externes pour utiliser les fonctionnalités d\'information en temps réel') ||
                           text.includes('设置外部 API 密钥以使用实时信息功能') ||
                           text.includes('リアルタイム情報機能を使用するための外部APIキーを設定します'))) {
            // 외부 API 키 설명
            if (languageData['externalApiKeysDescription']) {
                msg.textContent = languageData['externalApiKeysDescription'];
            }
        } else if (text && (text.includes('한국의 정확한 날씨 정보를 제공합니다') ||
                           text.includes('Provides accurate weather information for Korea') ||
                           text.includes('Proporciona información meteorológica precisa para Corea') ||
                           text.includes('Fournit des informations météorologiques précises pour la Corée') ||
                           text.includes('提供韩国的准确天气信息') ||
                           text.includes('韓国の正確な天気情報を提供します'))) {
            // 날씨 API 설명
            if (languageData['weatherApiDescription']) {
                msg.textContent = languageData['weatherApiDescription'];
            }
        } else if (text && (text.includes('한국의 최신 뉴스 정보를 제공합니다') ||
                           text.includes('Provides the latest news information from Korea') ||
                           text.includes('Proporciona la información de noticias más reciente de Corea') ||
                           text.includes('Fournit les dernières informations d\'actualités de Corée') ||
                           text.includes('提供韩国的最新新闻信息') ||
                           text.includes('韓国の最新ニュース情報を提供します'))) {
            // 뉴스 API 설명
            if (languageData['newsApiDescription']) {
                msg.textContent = languageData['newsApiDescription'];
            }
        } else if (text && (text.includes('실시간 주식 정보를 제공합니다') ||
                           text.includes('Provides real-time stock information') ||
                           text.includes('Proporciona información de acciones en tiempo real') ||
                           text.includes('Fournit des informations boursières en temps réel') ||
                           text.includes('提供实时股票信息') ||
                           text.includes('リアルタイムの株式情報を提供します'))) {
            // 주식 API 설명
            if (languageData['stockApiDescription']) {
                msg.textContent = languageData['stockApiDescription'];
            }
        }
    });

    // 로딩 텍스트 업데이트 (언어 데이터가 로드된 후) - 더 포괄적인 매칭 추가
    if (languageData['settingsLoading'] && sourcePathStatus) {
        const currentText = sourcePathStatus.textContent;
        if (currentText === '설정 로드 중...' || currentText === 'Loading settings...' || 
            currentText === 'Cargando configuración...' || currentText === 'Chargement des paramètres...' ||
            currentText === '正在加载设置...' || currentText === '設定を読み込み中...' ||
            currentText === 'Lade Einstellungen...') {
            sourcePathStatus.textContent = languageData['settingsLoading'];
        }
    }
    
    if (languageData['autoUpdateLoading'] && autoUpdateStatus) {
        const currentText = autoUpdateStatus.textContent;
        if (currentText === '자동 업데이트 설정 로드 중...' || currentText === 'Loading auto update settings...' ||
            currentText === 'Cargando configuración de actualización automática...' || currentText === 'Chargement des paramètres de mise à jour automatique...' ||
            currentText === '正在加载自动更新设置...' || currentText === '自動更新設定を読み込み中...' ||
            currentText === 'Lade automatische Aktualisierungseinstellungen...') {
            autoUpdateStatus.textContent = languageData['autoUpdateLoading'];
        }
    }
    
    if (languageData['projectRootLoading'] && projectRootStatus) {
        const currentText = projectRootStatus.textContent;
        if (currentText === '프로젝트 Root 설정 로드 중...' || currentText === 'Loading project root settings...' ||
            currentText === 'Cargando configuración de raíz del proyecto...' || currentText === 'Chargement des paramètres de racine de projet...' ||
            currentText === '正在加载项目根目录设置...' || currentText === 'プロジェクトルート設定を読み込み中...' ||
            currentText === 'Lade Projekt-Stammverzeichnis-Einstellungen...') {
            projectRootStatus.textContent = languageData['projectRootLoading'];
        }
    }

    // 소스 경로 리스트 업데이트 (언어 데이터가 로드된 후)
    if (sourcePathsList) {
        const currentItems = sourcePathsList.querySelectorAll('.path-item');
        if (currentItems.length === 1) {
            const itemText = currentItems[0].textContent;
            if (itemText.includes('지정된 경로 없음') || itemText.includes('No paths specified') ||
                itemText.includes('No se especificaron rutas') || itemText.includes('Aucun chemin spécifié') ||
                itemText.includes('未指定路径') || itemText.includes('パスが指定されていません') ||
                itemText.includes('Keine Pfade angegeben')) {
                // 현재 "지정된 경로 없음" 상태라면 언어 변경 시 업데이트
                updateSourcePathsList([]);
            }
        }
    }

    // 언어 데이터가 로드된 후 즉시 프로젝트 Root 표시 업데이트
    if (projectRootPathDisplay) {
        const currentText = projectRootPathDisplay.textContent;
        // 프로젝트 Root가 설정되지 않은 상태라면 언어 변경 시 즉시 업데이트
        if (!currentText.includes('/') && !currentText.includes('\\')) {
            updateProjectRootDisplay(null);
        }
    }

    // Gemini API 설명
    const geminiApiDescription = document.querySelector('#api-key-section-title + p');
    if (geminiApiDescription && languageData['geminiApiDescription']) {
        geminiApiDescription.textContent = languageData['geminiApiDescription'];
        console.log('Updated Gemini API description:', languageData['geminiApiDescription']);
    }

    // Gemini API 등록 방법
    const geminiApiRegistrationMethod = document.querySelector('#api-key-section-title + p + p');
    if (geminiApiRegistrationMethod && languageData['geminiApiRegistrationMethod']) {
        // 링크는 유지하면서 텍스트만 업데이트
        const linkMatch = geminiApiRegistrationMethod.innerHTML.match(/<a[^>]*>([^<]*)<\/a>/);
        if (linkMatch) {
            const linkText = linkMatch[1];
            const newText = languageData['geminiApiRegistrationMethod'].replace('Google AI Studio API 키 페이지', `<a href="https://aistudio.google.com/app/apikey" target="_blank">${linkText}</a>`);
            geminiApiRegistrationMethod.innerHTML = newText;
        } else {
            geminiApiRegistrationMethod.textContent = languageData['geminiApiRegistrationMethod'];
        }
        console.log('Updated Gemini API registration method:', languageData['geminiApiRegistrationMethod']);
    }

    // AI 모델 설정 제목
    const aiModelSettingsTitle = document.getElementById('api-key-section-title');
    if (aiModelSettingsTitle && languageData['aiModelSettingsTitle']) {
        aiModelSettingsTitle.textContent = languageData['aiModelSettingsTitle'];
        console.log('Updated AI model settings title:', languageData['aiModelSettingsTitle']);
    }

    // Ollama API 라벨
    const ollamaApiLabel = document.getElementById('ollama-api-label');
    if (ollamaApiLabel && languageData['ollamaApiLabel']) {
        ollamaApiLabel.textContent = languageData['ollamaApiLabel'];
        console.log('Updated Ollama API label:', languageData['ollamaApiLabel']);
    }

    // Ollama API 설명
    const ollamaApiDescription = document.querySelector('#ollama-api-label + p');
    if (ollamaApiDescription && languageData['ollamaApiDescription']) {
        ollamaApiDescription.textContent = languageData['ollamaApiDescription'];
        console.log('Updated Ollama API description:', languageData['ollamaApiDescription']);
    }

    // Ollama API 설정 방법
    const ollamaApiSetupMethod = document.querySelector('#ollama-api-label + p + p');
    if (ollamaApiSetupMethod && languageData['ollamaApiSetupMethod']) {
        ollamaApiSetupMethod.textContent = languageData['ollamaApiSetupMethod'];
        console.log('Updated Ollama API setup method:', languageData['ollamaApiSetupMethod']);
    }

    // Ollama 저장 버튼
    const saveOllamaApiUrlButton = document.getElementById('save-ollama-api-url-button');
    if (saveOllamaApiUrlButton && languageData['saveOllamaApiUrlButton']) {
        saveOllamaApiUrlButton.textContent = languageData['saveOllamaApiUrlButton'];
        console.log('Updated Ollama save button:', languageData['saveOllamaApiUrlButton']);
    }

    // Banya 라이센스 제목
    const banyaLicenseTitle = document.getElementById('banya-license-title');
    if (banyaLicenseTitle && languageData['banyaLicenseTitle']) {
        banyaLicenseTitle.textContent = languageData['banyaLicenseTitle'];
        console.log('Updated Banya license title:', languageData['banyaLicenseTitle']);
    }

    // Banya 라이센스 설명
    const banyaLicenseDescription = document.querySelector('#banya-license-title + p');
    if (banyaLicenseDescription && languageData['banyaLicenseDescription']) {
        banyaLicenseDescription.textContent = languageData['banyaLicenseDescription'];
        console.log('Updated Banya license description:', languageData['banyaLicenseDescription']);
    }

    // Banya 라이센스 라벨
    const banyaLicenseLabel = document.getElementById('banya-license-label');
    if (banyaLicenseLabel && languageData['banyaLicenseLabel']) {
        banyaLicenseLabel.textContent = languageData['banyaLicenseLabel'];
        console.log('Updated Banya license label:', languageData['banyaLicenseLabel']);
    }

    // Banya 라이센스 설명 (섹션 내)
    const banyaLicenseSectionDescription = document.querySelector('#banya-license-label + p');
    if (banyaLicenseSectionDescription && languageData['banyaLicenseSectionDescription']) {
        banyaLicenseSectionDescription.textContent = languageData['banyaLicenseSectionDescription'];
        console.log('Updated Banya license section description:', languageData['banyaLicenseSectionDescription']);
    }

    // Banya 라이센스 저장 버튼
    const saveBanyaLicenseButton = document.getElementById('save-banya-license-button');
    if (saveBanyaLicenseButton && languageData['saveBanyaLicenseButton']) {
        saveBanyaLicenseButton.textContent = languageData['saveBanyaLicenseButton'];
        console.log('Updated Banya license save button:', languageData['saveBanyaLicenseButton']);
    }

    // Banya 라이센스 검증 버튼
    const verifyBanyaLicenseButton = document.getElementById('verify-banya-license-button');
    if (verifyBanyaLicenseButton && languageData['verifyButton']) {
        verifyBanyaLicenseButton.textContent = languageData['verifyButton'];
        console.log('Updated Banya license verify button:', languageData['verifyButton']);
    }

    // Banya 라이센스 삭제 버튼
    const deleteBanyaLicenseButton = document.getElementById('delete-banya-license-button');
    if (deleteBanyaLicenseButton && languageData['deleteBanyaLicenseButton']) {
        deleteBanyaLicenseButton.textContent = languageData['deleteBanyaLicenseButton'];
        console.log('Updated Banya license delete button:', languageData['deleteBanyaLicenseButton']);
    }

    // Banya 라이센스 입력 필드 placeholder
    const banyaLicenseSerialInput = document.getElementById('banya-license-serial-input');
    if (banyaLicenseSerialInput && languageData['pleaseEnterBanyaLicense']) {
        banyaLicenseSerialInput.placeholder = languageData['pleaseEnterBanyaLicense'];
        console.log('Updated Banya license input placeholder:', languageData['pleaseEnterBanyaLicense']);
    }

    // Banya 라이센스 상태 메시지 업데이트
    const banyaLicenseStatus = document.getElementById('banya-license-status');
    if (banyaLicenseStatus && banyaLicenseStatus.textContent) {
        const currentText = banyaLicenseStatus.textContent;
        if (currentText.includes('설정되지 않았습니다') || currentText.includes('not set') || 
            currentText.includes('nicht festgelegt') || currentText.includes('no está configurada') ||
            currentText.includes('n\'est pas définie') || currentText.includes('設定されていません') ||
            currentText.includes('未设置')) {
            banyaLicenseStatus.textContent = languageData['banyaLicenseNotSet'] || 'Banya 라이센스가 설정되지 않았습니다.';
        } else if (currentText.includes('설정되어 있습니다') || currentText.includes('is set') || 
                   currentText.includes('ist festgelegt') || currentText.includes('está configurada') ||
                   currentText.includes('est définie') || currentText.includes('設定されています') ||
                   currentText.includes('已设置')) {
            banyaLicenseStatus.textContent = languageData['banyaLicenseSet'] || 'Banya 라이센스가 설정되어 있습니다.';
        }
    }

    // AI 모델 선택 라벨
    const aiModelSelectLabel = document.getElementById('ai-model-select-label');
    if (aiModelSelectLabel && languageData['aiModelSelectLabel']) {
        aiModelSelectLabel.innerHTML = `<b>${languageData['aiModelSelectLabel']}</b>`;
        console.log('Updated AI model select label:', languageData['aiModelSelectLabel']);
    }

    // AI 모델 선택 옵션들
    const aiModelSelect = document.getElementById('ai-model-select');
    if (aiModelSelect && languageData['geminiOption']) {
        const geminiOption = aiModelSelect.querySelector('option[value="gemini"]');
        if (geminiOption) {
            geminiOption.textContent = languageData['geminiOption'];
        }
    }
    if (aiModelSelect && languageData['ollamaOption']) {
        const ollamaOption = aiModelSelect.querySelector('option[value="ollama"]');
        if (ollamaOption) {
            ollamaOption.textContent = languageData['ollamaOption'];
        }
    }

    // Ollama API URL 라벨 (기존 변수 사용)
    if (ollamaApiLabel && languageData['ollamaApiLabel']) {
        ollamaApiLabel.textContent = languageData['ollamaApiLabel'];
        console.log('Updated Ollama API label:', languageData['ollamaApiLabel']);
    }

    // Ollama API 설명 (기존 변수 사용)
    if (ollamaApiDescription && languageData['ollamaApiDescription']) {
        ollamaApiDescription.textContent = languageData['ollamaApiDescription'];
        console.log('Updated Ollama API description:', languageData['ollamaApiDescription']);
    }

    // Ollama API 설정 방법 (기존 변수 사용)
    if (ollamaApiSetupMethod && languageData['ollamaApiSetupMethod']) {
        ollamaApiSetupMethod.textContent = languageData['ollamaApiSetupMethod'];
        console.log('Updated Ollama API setup method:', languageData['ollamaApiSetupMethod']);
    }

    // Ollama API URL 저장 버튼 (기존 변수 사용)
    if (saveOllamaApiUrlButton && languageData['saveOllamaApiUrlButton']) {
        saveOllamaApiUrlButton.textContent = languageData['saveOllamaApiUrlButton'];
        console.log('Updated Ollama API URL save button:', languageData['saveOllamaApiUrlButton']);
    }

    // 모든 placeholder 업데이트
    // Gemini API 키 입력 필드
    if (geminiApiKeyInput && languageData['pleaseEnterApiKey']) {
        geminiApiKeyInput.placeholder = languageData['pleaseEnterApiKey'];
    }

    // Ollama API URL 입력 필드
    if (ollamaApiUrlInput && languageData['pleaseEnterOllamaApiUrl']) {
        ollamaApiUrlInput.placeholder = languageData['pleaseEnterOllamaApiUrl'];
    }

    // Weather API 키 입력 필드
    if (weatherApiKeyInput && languageData['pleaseEnterApiKey']) {
        weatherApiKeyInput.placeholder = languageData['pleaseEnterApiKey'];
    }

    // News API 키 입력 필드
    if (newsApiKeyInput && languageData['pleaseEnterApiKey']) {
        newsApiKeyInput.placeholder = languageData['pleaseEnterApiKey'];
    }

    // News API Secret 입력 필드
    if (newsApiSecretInput && languageData['pleaseEnterApiKey']) {
        newsApiSecretInput.placeholder = languageData['pleaseEnterApiKey'];
    }

    // Stock API 키 입력 필드
    if (stockApiKeyInput && languageData['pleaseEnterApiKey']) {
        stockApiKeyInput.placeholder = languageData['pleaseEnterApiKey'];
    }

    // 모든 상태 메시지 업데이트
    // Gemini API 키 상태
    if (geminiApiKeyStatus && geminiApiKeyStatus.textContent) {
        const currentText = geminiApiKeyStatus.textContent;
        if (currentText.includes('설정되어 있습니다') || currentText.includes('is set') || 
            currentText.includes('ist festgelegt') || currentText.includes('está configurada') ||
            currentText.includes('est définie') || currentText.includes('設定されています') ||
            currentText.includes('已设置')) {
            geminiApiKeyStatus.textContent = languageData['geminiApiKeySet'] || 'Gemini API 키가 설정되어 있습니다.';
        } else if (currentText.includes('설정되지 않았습니다') || currentText.includes('not set') || 
                   currentText.includes('nicht festgelegt') || currentText.includes('no está configurada') ||
                   currentText.includes('n\'est pas définie') || currentText.includes('設定されていません') ||
                   currentText.includes('未设置')) {
            geminiApiKeyStatus.textContent = languageData['geminiApiKeyNotSet'] || 'Gemini API 키가 설정되지 않았습니다.';
        }
    }

    // Ollama API URL 상태
    if (ollamaApiUrlStatus && ollamaApiUrlStatus.textContent) {
        const currentText = ollamaApiUrlStatus.textContent;
        if (currentText.includes('설정되어 있습니다') || currentText.includes('is set') || 
            currentText.includes('ist festgelegt') || currentText.includes('está configurada') ||
            currentText.includes('est définie') || currentText.includes('設定されています') ||
            currentText.includes('已设置')) {
            ollamaApiUrlStatus.textContent = languageData['ollamaApiUrlSet'] || 'Ollama API URL이 설정되어 있습니다.';
        } else if (currentText.includes('설정되지 않았습니다') || currentText.includes('not set') || 
                   currentText.includes('nicht festgelegt') || currentText.includes('no está configurada') ||
                   currentText.includes('n\'est pas définie') || currentText.includes('設定されていません') ||
                   currentText.includes('未设置')) {
            ollamaApiUrlStatus.textContent = languageData['ollamaApiUrlNotSet'] || 'Ollama API URL이 설정되지 않았습니다.';
        }
    }

    // Weather API 키 상태
    if (weatherApiKeyStatus && weatherApiKeyStatus.textContent) {
        const currentText = weatherApiKeyStatus.textContent;
        if (currentText.includes('설정되어 있습니다') || currentText.includes('is set') || 
            currentText.includes('ist festgelegt') || currentText.includes('está configurada') ||
            currentText.includes('est définie') || currentText.includes('設定されています') ||
            currentText.includes('已设置')) {
            weatherApiKeyStatus.textContent = languageData['weatherApiKeySet'] || '기상청 API 키가 설정되어 있습니다.';
        } else if (currentText.includes('설정되지 않았습니다') || currentText.includes('not set') || 
                   currentText.includes('nicht festgelegt') || currentText.includes('no está configurada') ||
                   currentText.includes('n\'est pas définie') || currentText.includes('設定されていません') ||
                   currentText.includes('未设置')) {
            weatherApiKeyStatus.textContent = languageData['weatherApiKeyNotSet'] || '기상청 API 키가 설정되지 않았습니다.';
        }
    }

    // News API 키 상태
    if (newsApiKeyStatus && newsApiKeyStatus.textContent) {
        const currentText = newsApiKeyStatus.textContent;
        if (currentText.includes('설정되어 있습니다') || currentText.includes('is set') || 
            currentText.includes('ist festgelegt') || currentText.includes('está configurada') ||
            currentText.includes('est définie') || currentText.includes('設定されています') ||
            currentText.includes('已设置')) {
            newsApiKeyStatus.textContent = languageData['newsApiKeySet'] || '네이버 API Client ID가 설정되어 있습니다.';
        } else if (currentText.includes('설정되지 않았습니다') || currentText.includes('not set') || 
                   currentText.includes('nicht festgelegt') || currentText.includes('no está configurada') ||
                   currentText.includes('n\'est pas définie') || currentText.includes('設定されていません') ||
                   currentText.includes('未设置')) {
            newsApiKeyStatus.textContent = languageData['newsApiKeyNotSet'] || '네이버 API Client ID가 설정되지 않았습니다.';
        }
    }

    // News API Secret 상태
    if (newsApiSecretStatus && newsApiSecretStatus.textContent) {
        const currentText = newsApiSecretStatus.textContent;
        if (currentText.includes('설정되어 있습니다') || currentText.includes('is set') || 
            currentText.includes('ist festgelegt') || currentText.includes('está configurada') ||
            currentText.includes('est définie') || currentText.includes('設定されています') ||
            currentText.includes('已设置')) {
            newsApiSecretStatus.textContent = languageData['newsApiSecretSet'] || '네이버 API Client Secret이 설정되어 있습니다.';
        } else if (currentText.includes('설정되지 않았습니다') || currentText.includes('not set') || 
                   currentText.includes('nicht festgelegt') || currentText.includes('no está configurada') ||
                   currentText.includes('n\'est pas définie') || currentText.includes('設定されていません') ||
                   currentText.includes('未设置')) {
            newsApiSecretStatus.textContent = languageData['newsApiSecretNotSet'] || '네이버 API Client Secret이 설정되지 않았습니다.';
        }
    }

    // Stock API 키 상태
    if (stockApiKeyStatus && stockApiKeyStatus.textContent) {
        const currentText = stockApiKeyStatus.textContent;
        if (currentText.includes('설정되어 있습니다') || currentText.includes('is set') || 
            currentText.includes('ist festgelegt') || currentText.includes('está configurada') ||
            currentText.includes('est définie') || currentText.includes('設定されています') ||
            currentText.includes('已设置')) {
            stockApiKeyStatus.textContent = languageData['stockApiKeySet'] || '주식 API 키가 설정되어 있습니다.';
        } else if (currentText.includes('설정되지 않았습니다') || currentText.includes('not set') || 
                   currentText.includes('nicht festgelegt') || currentText.includes('no está configurada') ||
                   currentText.includes('n\'est pas définie') || currentText.includes('設定されていません') ||
                   currentText.includes('未设置')) {
            stockApiKeyStatus.textContent = languageData['stockApiKeyNotSet'] || '주식 API 키가 설정되지 않았습니다.';
        }
    }
}

if (languageSelect) {
    languageSelect.addEventListener('change', (e) => {
        const lang = e.target.value;
        console.log('Language changed to:', lang);
        
        // 언어 변경 시 즉시 저장 요청
        vscode.postMessage({ command: 'saveLanguage', language: lang });
        
        // 언어 데이터 로드 요청
        loadLanguage(lang);
        
        // 임시로 현재 언어 업데이트 (UI 반응성 향상)
        currentLanguage = lang;
        
        // 즉시 UI 업데이트 시도 (기존 언어 데이터로)
        if (Object.keys(languageData).length > 0) {
            console.log('Immediate UI update with existing language data');
            applyLanguage();
        }
    });
}

// 언어 저장 버튼 이벤트 리스너
if (saveLanguageButton) {
    saveLanguageButton.addEventListener('click', () => {
        const selectedLang = languageSelect.value;
        console.log('Manual language save requested:', selectedLang);
        
        // 이미 현재 언어와 같으면 저장하지 않음
        if (selectedLang === currentLanguage) {
            console.log('Language already saved, skipping duplicate save');
            return;
        }
        
        // 확장에 언어 저장 요청
        vscode.postMessage({ command: 'saveLanguage', language: selectedLang });
        
        // 로컬에서도 즉시 적용
        currentLanguage = selectedLang;
        loadLanguage(selectedLang);
    });
}

// 페이지 로드 시 기본 언어 적용
window.addEventListener('DOMContentLoaded', () => {
    // VS Code 설정에서 언어를 가져오도록 요청
    vscode.postMessage({ command: 'getLanguage' });
    
    // 기본 언어 데이터 로드 (한국어)
    loadLanguage('ko');
    
    // 라이센스 입력 필드 초기 상태 설정
    if (banyaLicenseSerialInput) {
        banyaLicenseSerialInput.readOnly = false; // 초기에는 편집 가능
    }
});

// UI 업데이트 함수 (소스 경로)
function updateSourcePathsList(paths) {
    sourcePathsList.innerHTML = '';
    if (!paths || paths.length === 0) {
        const noPathsText = languageData['noPathsSpecified'] || '지정된 경로 없음';
        sourcePathsList.innerHTML = `<li class="path-item" style="justify-content: center; color: var(--vscode-descriptionForeground);">${noPathsText}</li>`;
    } else {
        paths.forEach(path => {
            const listItem = document.createElement('li');
            listItem.classList.add('path-item');
            const deleteButtonText = languageData['removeSourcePathButton'] || '경로 삭제';
            listItem.innerHTML = `
                <span class="path-text" title="${path}">${path}</span>
                <button class="delete-button" data-path="${path}" title="${deleteButtonText}">×</button>
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
            const noProjectRootText = languageData['noProjectRootSet'] || '설정된 프로젝트 Root 없음';
            console.log('Updating project root display - no root path');
            console.log('Language data available:', !!languageData);
            console.log('Translation key value:', languageData['noProjectRootSet']);
            console.log('Final text to display:', noProjectRootText);
            projectRootPathDisplay.textContent = noProjectRootText;
            projectRootPathDisplay.title = noProjectRootText;
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
if (addSourcePathButton) {
    addSourcePathButton.addEventListener('click', () => {
        const pathSelectionText = languageData['pathSelectionDialog'] || '경로 선택 창 열림...';
        showStatus(sourcePathStatus, pathSelectionText, 'info');
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
                const removalText = languageData['pathRemovalRequest'] || '삭제 요청 중...';
                showStatus(sourcePathStatus, `'${pathToRemove}' ${removalText}`, 'info');
                vscode.postMessage({ command: 'removeDirectory', path: pathToRemove });
            }
        }
    });
}

// 이벤트 리스너: 프로젝트 Root 선택 버튼
if (selectProjectRootButton) {
    selectProjectRootButton.addEventListener('click', () => {
        const projectRootSelectionText = languageData['projectRootSelectionDialog'] || '프로젝트 Root 선택 창 열림...';
        showStatus(projectRootStatus, projectRootSelectionText, 'info');
        vscode.postMessage({ command: 'setProjectRoot' });
    });
}

// 이벤트 리스너: 프로젝트 Root 지우기 버튼
if (clearProjectRootButton) {
    clearProjectRootButton.addEventListener('click', () => {
        const clearingProjectRootText = languageData['clearingProjectRoot'] || '프로젝트 Root 지우는 중...';
        showStatus(projectRootStatus, clearingProjectRootText, 'info');
        vscode.postMessage({ command: 'setProjectRoot', clear: true }); // clear 플래그 전송
    });
}

// 이벤트 리스너: 자동 업데이트 토글
if (autoUpdateToggle) {
    autoUpdateToggle.addEventListener('change', () => {
        const isChecked = autoUpdateToggle.checked;
        vscode.postMessage({ command: 'setAutoUpdate', enabled: isChecked });
        const settingChangeText = languageData['settingChangeInProgress'] || '설정 변경 중...';
        const enabledText = languageData['settingChangeEnabled'] || '(활성화)';
        const disabledText = languageData['settingChangeDisabled'] || '(비활성화)';
        autoUpdateStatus.textContent = `${settingChangeText} ${isChecked ? enabledText : disabledText}`;
    });
}

// API 키 저장 이벤트 리스너들
if (saveWeatherApiKeyButton) {
    saveWeatherApiKeyButton.addEventListener('click', () => {
        const apiKey = weatherApiKeyInput.value.trim();
        vscode.postMessage({ command: 'saveWeatherApiKey', apiKey: apiKey });
        const savingText = languageData['apiKeysLoading'] || '기상청 API 키 저장 중...';
        showStatus(weatherApiKeyStatus, savingText, 'info');
    });
}

if (saveNewsApiKeyButton) {
    saveNewsApiKeyButton.addEventListener('click', () => {
        const apiKey = newsApiKeyInput.value.trim();
        vscode.postMessage({ command: 'saveNewsApiKey', apiKey: apiKey });
        const savingText = languageData['apiKeysLoading'] || '네이버 API Client ID 저장 중...';
        showStatus(newsApiKeyStatus, savingText, 'info');
    });
}

if (saveNewsApiSecretButton) {
    saveNewsApiSecretButton.addEventListener('click', () => {
        const apiSecret = newsApiSecretInput.value.trim();
        vscode.postMessage({ command: 'saveNewsApiSecret', apiSecret: apiSecret });
        const savingText = languageData['apiKeysLoading'] || '네이버 API Client Secret 저장 중...';
        showStatus(newsApiSecretStatus, savingText, 'info');
    });
}

if (saveStockApiKeyButton) {
    saveStockApiKeyButton.addEventListener('click', () => {
        const apiKey = stockApiKeyInput.value.trim();
        vscode.postMessage({ command: 'saveStockApiKey', apiKey: apiKey });
        const savingText = languageData['apiKeysLoading'] || '주식 API 키 저장 중...';
        showStatus(stockApiKeyStatus, savingText, 'info');
    });
}

// Gemini API 키 저장 이벤트 리스너
if (saveGeminiApiKeyButton) {
    saveGeminiApiKeyButton.addEventListener('click', () => {
        const apiKey = geminiApiKeyInput.value.trim();
        if (apiKey) {
            vscode.postMessage({ command: 'saveApiKey', apiKey: apiKey });
            const savingText = languageData['apiKeysLoading'] || 'Gemini API 키 저장 중...';
            showStatus(geminiApiKeyStatus, savingText, 'info');
        } else {
            const pleaseEnterText = languageData['pleaseEnterApiKey'] || 'API 키를 입력해주세요.';
            showStatus(geminiApiKeyStatus, pleaseEnterText, 'error');
        }
    });
}

// Ollama API URL 저장 이벤트 리스너
if (saveOllamaApiUrlButton) {
    saveOllamaApiUrlButton.addEventListener('click', () => {
        const apiUrl = ollamaApiUrlInput.value.trim();
        if (apiUrl) {
            // URL 유효성 검사
            try {
                new URL(apiUrl);
                vscode.postMessage({ command: 'saveOllamaApiUrl', apiUrl: apiUrl });
                const savingText = languageData['ollamaApiUrlSaving'] || 'Ollama API URL 저장 중...';
                showStatus(ollamaApiUrlStatus, savingText, 'info');
            } catch (error) {
                const invalidUrlText = languageData['invalidUrlFormat'] || '올바른 URL 형식을 입력해주세요. (예: http://localhost:11434)';
                showStatus(ollamaApiUrlStatus, invalidUrlText, 'error');
            }
        } else {
            const pleaseEnterText = languageData['pleaseEnterOllamaApiUrl'] || 'Ollama API URL을 입력해주세요.';
            showStatus(ollamaApiUrlStatus, pleaseEnterText, 'error');
        }
    });
}

// Ollama 엔드포인트 저장 이벤트 리스너
if (saveOllamaEndpointButton) {
    saveOllamaEndpointButton.addEventListener('click', () => {
        const endpoint = ollamaEndpointSelect.value;
        console.log('Ollama endpoint save button clicked, selected endpoint:', endpoint);
        if (endpoint) {
            console.log('Sending saveOllamaEndpoint command to extension with endpoint:', endpoint);
            vscode.postMessage({ command: 'saveOllamaEndpoint', endpoint: endpoint });
            const savingText = 'Ollama 엔드포인트 저장 중...';
            showStatus(ollamaEndpointStatus, savingText, 'info');
        } else {
            console.log('No endpoint selected, showing error');
            showStatus(ollamaEndpointStatus, '엔드포인트를 선택해주세요.', 'error');
        }
    });
}

// Banya 라이센스 저장 이벤트 리스너
if (saveBanyaLicenseButton) {
    saveBanyaLicenseButton.addEventListener('click', () => {
        const licenseSerial = banyaLicenseSerialInput.value.trim();
        if (licenseSerial) {
            vscode.postMessage({ command: 'saveBanyaLicense', licenseSerial: licenseSerial });
            const savingText = languageData['banyaLicenseSaving'] || 'Banya 라이센스 저장 중...';
            showStatus(banyaLicenseStatus, savingText, 'info');
        } else {
            const pleaseEnterText = languageData['pleaseEnterBanyaLicense'] || '라이센스 시리얼을 입력해주세요.';
            showStatus(banyaLicenseStatus, pleaseEnterText, 'error');
        }
    });
}

// Banya 라이센스 검증 이벤트 리스너
if (verifyBanyaLicenseButton) {
    verifyBanyaLicenseButton.addEventListener('click', () => {
        const licenseSerial = banyaLicenseSerialInput.value.trim();
        if (licenseSerial) {
            vscode.postMessage({ command: 'verifyBanyaLicense', licenseSerial: licenseSerial });
            const verifyingText = languageData['banyaLicenseVerifying'] || 'Banya 라이센스 검증 중...';
            showStatus(banyaLicenseStatus, verifyingText, 'info');
        } else {
            const pleaseEnterText = languageData['pleaseEnterBanyaLicense'] || '라이센스 시리얼을 입력해주세요.';
            showStatus(banyaLicenseStatus, pleaseEnterText, 'error');
        }
    });
}

// Banya 라이센스 삭제 이벤트 리스너
if (deleteBanyaLicenseButton) {
    deleteBanyaLicenseButton.addEventListener('click', () => {
        vscode.postMessage({ command: 'deleteBanyaLicense' });
        const deletingText = languageData['banyaLicenseDeleting'] || 'Banya 라이센스 삭제 중...';
        showStatus(banyaLicenseStatus, deletingText, 'info');
    });
}

// 라이센스 입력 필드 변경 이벤트 리스너
if (banyaLicenseSerialInput) {
    banyaLicenseSerialInput.addEventListener('input', () => {
        updateLicenseButtonsState();
    });
}

// AI 모델 선택 이벤트 리스너
if (aiModelSelect) {
    aiModelSelect.addEventListener('change', () => {
        const selectedModel = aiModelSelect.value;
        console.log('AI model selected:', selectedModel);
        
        // 선택된 모델에 따라 설정 섹션 활성화/비활성화
        if (selectedModel === 'gemini') {
            geminiSettingsSection.classList.remove('disabled');
            ollamaSettingsSection.classList.add('disabled');
        } else if (selectedModel === 'ollama') {
            geminiSettingsSection.classList.add('disabled');
            ollamaSettingsSection.classList.remove('disabled');
        } else {
            // 모델이 선택되지 않은 경우 기본값(Gemini)으로 설정
            aiModelSelect.value = 'gemini';
            geminiSettingsSection.classList.remove('disabled');
            ollamaSettingsSection.classList.add('disabled');
        }
        
        // 확장 프로그램에 선택된 모델 저장 요청
        vscode.postMessage({ command: 'saveAiModel', model: selectedModel });
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
                const sourcePathsLoadedText = languageData['sourcePathsLoaded'] || '소스 경로 로드 완료.';
                showStatus(sourcePathStatus, sourcePathsLoadedText, 'success');
            }
            if (typeof message.autoUpdateEnabled === 'boolean' && autoUpdateToggle) {
                autoUpdateToggle.checked = message.autoUpdateEnabled;
                const autoUpdateChangedText = languageData['autoUpdateChanged'] || '자동 업데이트';
                const enabledText = languageData['autoUpdateEnabledStatus'] || '활성화됨';
                const disabledText = languageData['autoUpdateDisabledStatus'] || '비활성화됨';
                const currentText = languageData['current'] || '현재:';
                const statusText = `${autoUpdateChangedText} ${message.autoUpdateEnabled ? enabledText : disabledText}.`;
                showStatus(autoUpdateStatus, statusText, 'success');
                autoUpdateStatus.textContent = `${currentText} ${statusText}`;
            }
            if (typeof message.projectRoot === 'string') {
                updateProjectRootDisplay(message.projectRoot);
                const projectRootLoadedText = languageData['projectRootLoaded'] || '프로젝트 Root 로드 완료.';
                showStatus(projectRootStatus, projectRootLoadedText, 'success');
            } else {
                // 프로젝트 Root가 설정되지 않은 경우에도 업데이트
                updateProjectRootDisplay(null);
            }
            break;
        case 'updatedSourcePaths':
            if (message.sourcePaths) {
                updateSourcePathsList(message.sourcePaths);
                const sourcePathsUpdatedText = languageData['sourcePathsUpdated'] || '소스 경로 업데이트 완료.';
                showStatus(sourcePathStatus, sourcePathsUpdatedText, 'success');
            }
            break;
        case 'updatedProjectRoot':
            if (typeof message.projectRoot === 'string') {
                updateProjectRootDisplay(message.projectRoot);
                const projectRootUpdatedText = languageData['projectRootUpdated'] || '프로젝트 Root 업데이트 완료:';
                const projectRootClearedText = languageData['projectRootCleared'] || '프로젝트 Root가 지워졌습니다.';
                const statusText = message.projectRoot ? `${projectRootUpdatedText} ${message.projectRoot}` : projectRootClearedText;
                showStatus(projectRootStatus, statusText, 'success');
            }
            break;
        case 'autoUpdateStatusChanged':
            if (typeof message.enabled === 'boolean' && autoUpdateToggle) {
                autoUpdateToggle.checked = message.enabled;
                const autoUpdateChangedText = languageData['autoUpdateChanged'] || '자동 업데이트';
                const enabledText = languageData['autoUpdateEnabledStatus'] || '활성화됨';
                const disabledText = languageData['autoUpdateDisabledStatus'] || '비활성화됨';
                const currentText = languageData['current'] || '현재:';
                const statusText = `${autoUpdateChangedText} ${message.enabled ? enabledText : disabledText}.`;
                showStatus(autoUpdateStatus, statusText, 'success');
                autoUpdateStatus.textContent = `${currentText} ${statusText}`;
            }
            break;
        case 'pathAddError':
            const pathAddErrorText = languageData['pathAddError'] || '오류 (경로 추가):';
            showStatus(sourcePathStatus, `${pathAddErrorText} ${message.error}`, 'error');
            break;
        case 'pathRemoveError':
            const pathRemoveErrorText = languageData['pathRemoveError'] || '오류 (경로 삭제):';
            showStatus(sourcePathStatus, `${pathRemoveErrorText} ${message.error}`, 'error');
            break;
        case 'projectRootError':
            const projectRootErrorText = languageData['projectRootError'] || '오류 (프로젝트 Root 설정):';
            showStatus(projectRootStatus, `${projectRootErrorText} ${message.error}`, 'error');
            break;
        case 'currentApiKeys':
            // API 키 상태 로드
            if (weatherApiKeyInput && typeof message.weatherApiKey === 'string') {
                weatherApiKeyInput.value = message.weatherApiKey;
                const weatherApiKeySetText = message.weatherApiKey ? 
                    (languageData['weatherApiKeySet'] || '기상청 API 키가 설정되어 있습니다.') :
                    (languageData['weatherApiKeyNotSet'] || '기상청 API 키가 설정되지 않았습니다.');
                showStatus(weatherApiKeyStatus, weatherApiKeySetText, message.weatherApiKey ? 'success' : 'info');
            }
            if (newsApiKeyInput && typeof message.newsApiKey === 'string') {
                newsApiKeyInput.value = message.newsApiKey;
                const newsApiKeySetText = message.newsApiKey ? 
                    (languageData['newsApiKeySet'] || '네이버 API Client ID가 설정되어 있습니다.') :
                    (languageData['newsApiKeyNotSet'] || '네이버 API Client ID가 설정되지 않았습니다.');
                showStatus(newsApiKeyStatus, newsApiKeySetText, message.newsApiKey ? 'success' : 'info');
            }
            if (newsApiSecretInput && typeof message.newsApiSecret === 'string') {
                newsApiSecretInput.value = message.newsApiSecret;
                const newsApiSecretSetText = message.newsApiSecret ? 
                    (languageData['newsApiSecretSet'] || '네이버 API Client Secret이 설정되어 있습니다.') :
                    (languageData['newsApiSecretNotSet'] || '네이버 API Client Secret이 설정되지 않았습니다.');
                showStatus(newsApiSecretStatus, newsApiSecretSetText, message.newsApiSecret ? 'success' : 'info');
            }
            if (stockApiKeyInput && typeof message.stockApiKey === 'string') {
                stockApiKeyInput.value = message.stockApiKey;
                const stockApiKeySetText = message.stockApiKey ? 
                    (languageData['stockApiKeySet'] || '주식 API 키가 설정되어 있습니다.') :
                    (languageData['stockApiKeyNotSet'] || '주식 API 키가 설정되지 않았습니다.');
                showStatus(stockApiKeyStatus, stockApiKeySetText, message.stockApiKey ? 'success' : 'info');
            }
            // Gemini API 키 상태 로드
            if (geminiApiKeyInput && typeof message.geminiApiKey === 'string') {
                geminiApiKeyInput.value = message.geminiApiKey;
                const geminiApiKeySetText = message.geminiApiKey ? 
                    (languageData['geminiApiKeySet'] || 'Gemini API 키가 설정되어 있습니다.') :
                    (languageData['geminiApiKeyNotSet'] || 'Gemini API 키가 설정되지 않았습니다.');
                showStatus(geminiApiKeyStatus, geminiApiKeySetText, message.geminiApiKey ? 'success' : 'info');
            }
            // Ollama API URL 상태 로드
            if (ollamaApiUrlInput && typeof message.ollamaApiUrl === 'string') {
                ollamaApiUrlInput.value = message.ollamaApiUrl;
                const ollamaApiUrlSetText = message.ollamaApiUrl ? 
                    (languageData['ollamaApiUrlSet'] || 'Ollama API URL이 설정되어 있습니다.') :
                    (languageData['ollamaApiUrlNotSet'] || 'Ollama API URL이 설정되지 않았습니다.');
                showStatus(ollamaApiUrlStatus, ollamaApiUrlSetText, message.ollamaApiUrl ? 'success' : 'info');
            }
            // Ollama 엔드포인트 상태 로드
            if (ollamaEndpointSelect && typeof message.ollamaEndpoint === 'string') {
                ollamaEndpointSelect.value = message.ollamaEndpoint;
                const ollamaEndpointSetText = message.ollamaEndpoint ? 
                    `Ollama 엔드포인트가 설정되어 있습니다: ${message.ollamaEndpoint}` :
                    'Ollama 엔드포인트가 설정되지 않았습니다.';
                showStatus(ollamaEndpointStatus, ollamaEndpointSetText, message.ollamaEndpoint ? 'success' : 'info');
            }
            // Banya 라이센스 상태 로드
            if (banyaLicenseSerialInput && typeof message.banyaLicenseSerial === 'string') {
                // 추가 검증 - 잘못된 데이터 필터링
                const isValidLicense = message.banyaLicenseSerial && 
                    message.banyaLicenseSerial.trim() !== '' &&
                    !message.banyaLicenseSerial.includes('/') && 
                    !message.banyaLicenseSerial.includes('\\') &&
                    !message.banyaLicenseSerial.includes('프로젝트') &&
                    !message.banyaLicenseSerial.includes('Project') &&
                    !message.banyaLicenseSerial.includes('설정') &&
                    !message.banyaLicenseSerial.includes('Setting') &&
                    message.banyaLicenseSerial.length > 5;
                
                if (isValidLicense) {
                    banyaLicenseSerialInput.value = message.banyaLicenseSerial.trim();
                    banyaLicenseSerialInput.readOnly = true; // 저장된 라이센스는 읽기 전용으로 설정
                    const banyaLicenseSetText = languageData['banyaLicenseSet'] || 'Banya 라이센스가 설정되어 있습니다.';
                    showStatus(banyaLicenseStatus, banyaLicenseSetText, 'success');
                } else {
                    banyaLicenseSerialInput.value = '';
                    banyaLicenseSerialInput.readOnly = false; // 라이센스가 없으면 편집 가능
                    const banyaLicenseNotSetText = languageData['banyaLicenseNotSet'] || 'Banya 라이센스가 설정되지 않았습니다.';
                    showStatus(banyaLicenseStatus, banyaLicenseNotSetText, 'info');
                }
            }
            
            // API 키 로드 완료 후 저장 버튼 상태 재확인
            setTimeout(() => {
                if (!isLicenseVerified) {
                    updateSaveButtonsState();
                }
                updateLicenseButtonsState();
            }, 50);
            break;
        case 'weatherApiKeySaved':
            const weatherApiKeySavedText = languageData['weatherApiKeySaved'] || '기상청 API 키가 저장되었습니다.';
            showStatus(weatherApiKeyStatus, weatherApiKeySavedText, 'success');
            weatherApiKeyInput.value = '';
            break;
        case 'weatherApiKeyError':
            const weatherApiKeyErrorText = languageData['weatherApiKeyError'] || '기상청 API 키 저장 실패:';
            showStatus(weatherApiKeyStatus, `${weatherApiKeyErrorText} ${message.error}`, 'error');
            break;
        case 'newsApiKeySaved':
            const newsApiKeySavedText = languageData['newsApiKeySaved'] || '네이버 API Client ID가 저장되었습니다.';
            showStatus(newsApiKeyStatus, newsApiKeySavedText, 'success');
            newsApiKeyInput.value = '';
            break;
        case 'newsApiKeyError':
            const newsApiKeyErrorText = languageData['newsApiKeyError'] || '네이버 API Client ID 저장 실패:';
            showStatus(newsApiKeyStatus, `${newsApiKeyErrorText} ${message.error}`, 'error');
            break;
        case 'newsApiSecretSaved':
            const newsApiSecretSavedText = languageData['newsApiSecretSaved'] || '네이버 API Client Secret이 저장되었습니다.';
            showStatus(newsApiSecretStatus, newsApiSecretSavedText, 'success');
            newsApiSecretInput.value = '';
            break;
        case 'newsApiSecretError':
            const newsApiSecretErrorText = languageData['newsApiSecretError'] || '네이버 API Client Secret 저장 실패:';
            showStatus(newsApiSecretStatus, `${newsApiSecretErrorText} ${message.error}`, 'error');
            break;
        case 'stockApiKeySaved':
            const stockApiKeySavedText = languageData['stockApiKeySaved'] || '주식 API 키가 저장되었습니다.';
            showStatus(stockApiKeyStatus, stockApiKeySavedText, 'success');
            stockApiKeyInput.value = '';
            break;
        case 'stockApiKeyError':
            const stockApiKeyErrorText = languageData['stockApiKeyError'] || '주식 API 키 저장 실패:';
            showStatus(stockApiKeyStatus, `${stockApiKeyErrorText} ${message.error}`, 'error');
            break;
        case 'apiKeySaved':
            const geminiApiKeySavedText = languageData['geminiApiKeySaved'] || 'Gemini API 키가 저장되었습니다.';
            showStatus(geminiApiKeyStatus, geminiApiKeySavedText, 'success');
            geminiApiKeyInput.value = '';
            break;
        case 'apiKeySaveError':
            const geminiApiKeyErrorText = languageData['geminiApiKeyError'] || 'Gemini API 키 저장 실패:';
            showStatus(geminiApiKeyStatus, `${geminiApiKeyErrorText} ${message.error}`, 'error');
            break;
        case 'ollamaApiUrlSaved':
            const ollamaApiUrlSavedText = languageData['ollamaApiUrlSaved'] || 'Ollama API URL이 저장되었습니다.';
            showStatus(ollamaApiUrlStatus, ollamaApiUrlSavedText, 'success');
            ollamaApiUrlInput.value = '';
            break;
        case 'ollamaApiUrlError':
            const ollamaApiUrlErrorText = languageData['ollamaApiUrlError'] || 'Ollama API URL 저장 실패:';
            showStatus(ollamaApiUrlStatus, `${ollamaApiUrlErrorText} ${message.error}`, 'error');
            break;
        case 'ollamaEndpointSaved':
            showStatus(ollamaEndpointStatus, 'Ollama 엔드포인트가 저장되었습니다.', 'success');
            break;
        case 'ollamaEndpointError':
            showStatus(ollamaEndpointStatus, `Ollama 엔드포인트 저장 실패: ${message.error}`, 'error');
            break;
        case 'banyaLicenseSaved':
            const banyaLicenseSavedText = languageData['banyaLicenseSaved'] || 'Banya 라이센스가 저장되었습니다.';
            showStatus(banyaLicenseStatus, banyaLicenseSavedText, 'success');
            banyaLicenseSerialInput.value = '';
            break;
        case 'banyaLicenseError':
            const banyaLicenseErrorText = languageData['banyaLicenseError'] || 'Banya 라이센스 저장 실패:';
            showStatus(banyaLicenseStatus, `${banyaLicenseErrorText} ${message.error}`, 'error');
            break;
        case 'banyaLicenseVerified':
            const banyaLicenseVerifiedText = languageData['banyaLicenseVerified'] || 'Banya 라이센스가 유효합니다.';
            showStatus(banyaLicenseStatus, banyaLicenseVerifiedText, 'success');
            isLicenseVerified = true;
            console.log('License verification successful, enabling save buttons');
            updateSaveButtonsState();
            updateLicenseButtonsState();
            break;
        case 'banyaLicenseVerificationFailed':
            const banyaLicenseVerificationFailedText = languageData['banyaLicenseVerificationFailed'] || 'Banya 라이센스 검증 실패:';
            showStatus(banyaLicenseStatus, `${banyaLicenseVerificationFailedText} ${message.error}`, 'error');
            isLicenseVerified = false;
            console.log('License verification failed, disabling save buttons');
            updateSaveButtonsState();
            updateLicenseButtonsState();
            break;
        case 'banyaLicenseDeleted':
            const banyaLicenseDeletedText = languageData['banyaLicenseDeleted'] || 'Banya 라이센스가 삭제되었습니다.';
            showStatus(banyaLicenseStatus, banyaLicenseDeletedText, 'success');
            if (banyaLicenseSerialInput) {
                banyaLicenseSerialInput.value = '';
                banyaLicenseSerialInput.readOnly = false; // 라이센스 삭제 시 편집 가능하게 설정
            }
            isLicenseVerified = false;
            updateSaveButtonsState();
            updateLicenseButtonsState();
            break;
        case 'banyaLicenseDeleteError':
            const banyaLicenseDeleteErrorText = languageData['banyaLicenseDeleteError'] || 'Banya 라이센스 삭제 실패:';
            showStatus(banyaLicenseStatus, `${banyaLicenseDeleteErrorText} ${message.error}`, 'error');
            break;
        case 'aiModelSaved':
            const aiModelSavedText = languageData['aiModelSaved'] || 'AI 모델이 저장되었습니다.';
            showStatus(sourcePathStatus, aiModelSavedText, 'success');
            break;
        case 'aiModelSaveError':
            const aiModelSaveErrorText = languageData['aiModelSaveError'] || 'AI 모델 저장 실패:';
            showStatus(sourcePathStatus, `${aiModelSaveErrorText} ${message.error}`, 'error');
            break;
        case 'currentAiModel':
            if (message.model && aiModelSelect) {
                aiModelSelect.value = message.model;
                // 모델 선택에 따른 UI 업데이트
                if (message.model === 'gemini') {
                    geminiSettingsSection.classList.remove('disabled');
                    ollamaSettingsSection.classList.add('disabled');
                } else if (message.model === 'ollama') {
                    geminiSettingsSection.classList.add('disabled');
                    ollamaSettingsSection.classList.remove('disabled');
                } else {
                    geminiSettingsSection.classList.add('disabled');
                    ollamaSettingsSection.classList.add('disabled');
                }
            }
            break;
        case 'languageSaved':
            const languageChangedText = languageData['languageChanged'] || '언어가';
            const languageChangedToText = languageData['languageChangedTo'] || '로 변경되었습니다.';
            showStatus(sourcePathStatus, `${languageChangedText} ${message.language} ${languageChangedToText}`, 'success');
            break;
        case 'languageSaveError':
            const languageSaveErrorText = languageData['languageSaveError'] || '언어 저장 실패:';
            showStatus(sourcePathStatus, `${languageSaveErrorText} ${message.error}`, 'error');
            break;
        case 'currentLanguage':
            if (message.language) {
                currentLanguage = message.language;
                if (languageSelect) {
                    languageSelect.value = currentLanguage;
                    console.log('Set language select value to:', currentLanguage);
                }
                loadLanguage(currentLanguage);
            }
            break;
        case 'languageSaved':
            console.log('Language saved successfully:', message.language);
            currentLanguage = message.language;
            if (languageSelect) {
                languageSelect.value = currentLanguage;
            }
            break;
        case 'languageSaveError':
            console.error('Language save error:', message.error);
            // 오류 발생 시 이전 언어로 되돌리기
            if (languageSelect) {
                languageSelect.value = currentLanguage;
            }
            break;
        case 'languageDataReceived':
            if (message.language && message.data) {
                console.log('Received language data for:', message.language);
                console.log('Language data keys:', Object.keys(message.data));
                languageData = message.data;
                currentLanguage = message.language;
                sessionStorage.setItem('codepilotLang', message.language);
                
                // 언어 선택 드롭다운 값 업데이트
                if (languageSelect) {
                    languageSelect.value = currentLanguage;
                    console.log('Updated language select value to:', currentLanguage);
                }
                
                // 즉시 언어 적용
                console.log('Applying language immediately');
                applyLanguage();
                
                // 강제로 모든 UI 요소 업데이트 (여러 번 실행)
                setTimeout(() => {
                    console.log('Forcing UI refresh after language change (1st)');
                    applyLanguage();
                }, 50);
                
                setTimeout(() => {
                    console.log('Forcing UI refresh after language change (2nd)');
                    applyLanguage();
                }, 200);
                
                setTimeout(() => {
                    console.log('Forcing UI refresh after language change (3rd)');
                    applyLanguage();
                }, 500);
                
                // 추가 강제 업데이트
                setTimeout(() => {
                    console.log('Final UI refresh after language change');
                    applyLanguage();
                }, 1000);
                
                // 디버깅: 프로젝트 Root 표시 업데이트 확인
                if (projectRootPathDisplay) {
                    console.log('Project root display current text:', projectRootPathDisplay.textContent);
                    console.log('No project root set translation:', languageData['noProjectRootSet']);
                }
                
                // 언어 변경 후 즉시 모든 상태 메시지 업데이트
                if (sourcePathStatus && sourcePathStatus.textContent) {
                    const currentText = sourcePathStatus.textContent;
                    if (currentText.includes('로드 완료') || currentText.includes('loaded successfully') || 
                        currentText.includes('cargado correctamente') || currentText.includes('chargé avec succès') ||
                        currentText.includes('加载完成') || currentText.includes('正常に読み込まれました')) {
                        sourcePathStatus.textContent = languageData['sourcePathsLoaded'] || '소스 경로 로드 완료.';
                    }
                }
                
                if (projectRootStatus && projectRootStatus.textContent) {
                    const currentText = projectRootStatus.textContent;
                    if (currentText.includes('로드 완료') || currentText.includes('loaded successfully') || 
                        currentText.includes('cargado correctamente') || currentText.includes('chargé avec succès') ||
                        currentText.includes('加载完成') || currentText.includes('正常に読み込まれました')) {
                        projectRootStatus.textContent = languageData['projectRootLoaded'] || '프로젝트 Root 로드 완료.';
                    }
                }
                
                if (autoUpdateStatus && autoUpdateStatus.textContent) {
                    const currentText = autoUpdateStatus.textContent;
                    if (currentText.includes('활성화됨') || currentText.includes('enabled') || 
                        currentText.includes('habilitada') || currentText.includes('activée') ||
                        currentText.includes('已启用') || currentText.includes('有効') ||
                        currentText.includes('비활성화됨') || currentText.includes('disabled') || 
                        currentText.includes('deshabilitada') || currentText.includes('désactivée') ||
                        currentText.includes('已禁用') || currentText.includes('無効')) {
                        // 자동 업데이트 상태 텍스트 업데이트
                        const autoUpdateChangedText = languageData['autoUpdateChanged'] || '자동 업데이트';
                        const enabledText = languageData['autoUpdateEnabledStatus'] || '활성화됨';
                        const disabledText = languageData['autoUpdateDisabledStatus'] || '비활성화됨';
                        const currentText = languageData['current'] || '현재:';
                        const isEnabled = autoUpdateToggle ? autoUpdateToggle.checked : false;
                        const statusText = `${autoUpdateChangedText} ${isEnabled ? enabledText : disabledText}.`;
                        autoUpdateStatus.textContent = `${currentText} ${statusText}`;
                    }
                }
            }
            break;
    }
});

// Webview 로드 시 초기 설정값 요청
document.addEventListener('DOMContentLoaded', () => {
    vscode.postMessage({ command: 'initSettings' });
    const settingsLoadingText = languageData['settingsLoading'] || '설정 로드 중...';
    showStatus(sourcePathStatus, settingsLoadingText, 'info');
    const autoUpdateLoadingText = languageData['autoUpdateLoading'] || '자동 업데이트 설정 로드 중...';
    autoUpdateStatus.textContent = autoUpdateLoadingText;
    const projectRootLoadingText = languageData['projectRootLoading'] || '프로젝트 Root 설정 로드 중...';
    projectRootStatus.textContent = projectRootLoadingText;
    
    // API 키 상태 요청
    vscode.postMessage({ command: 'loadApiKeys' });
    const apiKeysLoadingText = languageData['apiKeysLoading'] || 'API 키 로드 중...';
    showStatus(weatherApiKeyStatus, apiKeysLoadingText, 'info');
    showStatus(newsApiKeyStatus, apiKeysLoadingText, 'info');
    showStatus(stockApiKeyStatus, apiKeysLoadingText, 'info');
    showStatus(geminiApiKeyStatus, apiKeysLoadingText, 'info');
    showStatus(ollamaApiUrlStatus, apiKeysLoadingText, 'info');
    showStatus(banyaLicenseStatus, apiKeysLoadingText, 'info');
    
    // API 키 로드 후에도 저장 버튼들 비활성화 상태 유지
    setTimeout(() => {
        isLicenseVerified = false;
        updateSaveButtonsState();
        updateLicenseButtonsState();
    }, 100);
    
    // AI 모델 설정 요청
    vscode.postMessage({ command: 'loadAiModel' });
    
    // 초기 상태: Gemini가 기본값이므로 Gemini 설정 섹션 활성화, Ollama 설정 섹션 비활성화
    if (geminiSettingsSection) geminiSettingsSection.classList.remove('disabled');
    if (ollamaSettingsSection) ollamaSettingsSection.classList.add('disabled');
    
    // 초기 상태: 라이센스가 검증되지 않았으므로 저장 버튼들 비활성화
    isLicenseVerified = false;
    updateSaveButtonsState();
    updateLicenseButtonsState();
});
