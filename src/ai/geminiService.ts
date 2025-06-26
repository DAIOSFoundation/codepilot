import * as vscode from 'vscode';
import { StorageService } from '../services/storage';
import { GeminiApi } from './gemini';
import { CodebaseContextService } from './codebaseContextService';
import { LlmResponseProcessor } from './llmResponseProcessor';
import { NotificationService } from '../services/notificationService';
import { ConfigurationService } from '../services/configurationService';
import { RequestOptions, Part } from '@google/generative-ai'; // Part 임포트
import { ExternalApiService } from './externalApiService'; // 새로 추가

export enum PromptType {
    CODE_GENERATION = 'CODE_GENERATION',
    GENERAL_ASK = 'GENERAL_ASK'
}

export class GeminiService {
    private storageService: StorageService;
    private geminiApi: GeminiApi;
    private codebaseContextService: CodebaseContextService;
    private llmResponseProcessor: LlmResponseProcessor;
    private notificationService: NotificationService;
    private configurationService: ConfigurationService;
    private externalApiService: ExternalApiService; // 새로 추가
    private currentGeminiCallController: AbortController | null = null;

    constructor(
        storageService: StorageService,
        geminiApi: GeminiApi,
        codebaseContextService: CodebaseContextService,
        llmResponseProcessor: LlmResponseProcessor,
        notificationService: NotificationService,
        configurationService: ConfigurationService
    ) {
        this.storageService = storageService;
        this.geminiApi = geminiApi;
        this.codebaseContextService = codebaseContextService;
        this.llmResponseProcessor = llmResponseProcessor;
        this.notificationService = notificationService;
        this.configurationService = configurationService;
        this.externalApiService = new ExternalApiService(configurationService); // 수정: configurationService 전달
    }

    public cancelCurrentCall(): void {
        console.log('[ CodePilot ] Attempting to cancel current Banya call.');
        if (this.currentGeminiCallController) {
            this.currentGeminiCallController.abort();
            console.log('[CodePilot] Banya call aborted.');
        } else {
            console.log('[CodePilot] No active Banya call to abort.');
        }
    }

    public async handleUserMessageAndRespond(
        userQuery: string,
        webviewToRespond: vscode.Webview,
        promptType: PromptType,
        imageData?: string, // 이미지 데이터 추가
        imageMimeType?: string, // 이미지 MIME 타입 추가
        selectedFiles?: string[] // 선택된 파일 경로들 추가
    ): Promise<void> {
        const apiKey = await this.storageService.getApiKey();
        if (!apiKey) {
            webviewToRespond.postMessage({ command: 'receiveMessage', sender: 'CodePilot', text: "Error: Banya API Key is not set. Please set it via CodePilot settings." });
            return;
        }
        webviewToRespond.postMessage({ command: 'showLoading' });

        this.currentGeminiCallController = new AbortController();
        const abortSignal = this.currentGeminiCallController.signal;
        abortSignal.onabort = () => {
            console.log('[CodePilot] Banya API call was aborted by user.');
        };

        try {
            let fileContentsContext = "";
            let includedFilesForContext: { name: string, fullPath: string }[] = [];

            // GENERAL_ASK 타입일 때는 코드 컨텍스트를 포함하지 않음
            if (promptType === PromptType.CODE_GENERATION) {
                const contextResult = await this.codebaseContextService.getProjectCodebaseContext(abortSignal);
                fileContentsContext = contextResult.fileContentsContext;
                includedFilesForContext = contextResult.includedFilesForContext;
            }

            let projectRootInfo = '';
            const configuredProjectRoot = await this.configurationService.getProjectRoot();
            if (configuredProjectRoot) {
                projectRootInfo = `프로젝트의 최상위 경로(Project Root)는 '${configuredProjectRoot}'으로 설정되어 있습니다. 새로운 파일을 생성하거나 기존 파일을 수정할 때, 이 경로를 기준으로 상대 경로를 사용하고, 필요하다면 하위 디렉토리 생성도 고려하십시오.`;
            } else {
                projectRootInfo = `프로젝트의 최상위 경로가 설정되지 않았습니다. 새로운 파일을 생성할 경우, 현재 작업 중인 파일의 디렉토리를 기준으로 상대 경로를 사용하거나, 절대 경로를 지정해야 합니다.`;
            }

            let systemPrompt: string;
            if (promptType === PromptType.CODE_GENERATION) {
                systemPrompt = `당신은 코드 수정 및 생성 전문가입니다. 제공된 코드 컨텍스트와 프로젝트 구조 정보를 바탕으로 사용자의 요청을 수행하고, 수정되거나 새로 생성될 코드를 제공합니다.

**중요: 다음 규칙들을 반드시 지켜야 합니다. 이 규칙들을 위반하면 응답이 거부됩니다.**

**필수 규칙:**
1. **항상 모든 파일의 전체 코드를 출력해야 합니다.** 부분적인 코드 변경만 출력하지 마세요.

2. **기존 파일을 수정할 때는, 코드 블록 바로 위에 다음 형식을 정확하게 지켜서 원래 파일명을 명시해야 합니다:**
   수정 파일: [원본 파일명]
   여기서 [원본 파일명]은 컨텍스트로 제공된 '경로를 포함한 파일명'과 정확히 일치해야 합니다. (예: '수정 파일: src/components/Button.tsx')

3. **수정할 파일이 여러 개일 경우, 각 파일에 대해 2번 규칙을 반복하여 명시하고 해당 파일의 전체 코드를 코드 블록으로 출력합니다.**

4. **새로운 파일을 생성해야 하는 경우, '새 파일: [새 파일 경로/파일명]' 형식으로 명시하고 전체 코드를 출력합니다.**
   새로운 파일의 경로는 프로젝트의 최상위 경로를 기준으로 한 상대 경로여야 합니다. 필요한 경우, 하위 디렉토리를 포함한 전체 경로를 지정하십시오. (예: '새 파일: src/utils/newHelper.ts')

5. **파일을 삭제해야 하는 경우, '삭제 파일: [삭제할 파일 경로/파일명]' 형식으로 명시합니다.**
   삭제할 파일의 경로는 프로젝트의 최상위 경로를 기준으로 한 상대 경로여야 합니다. (예: '삭제 파일: src/old/obsolete.ts')

6. **수정하거나 생성하거나 삭제하지 않은 파일에 대해서는 언급하거나 코드를 출력할 필요가 없습니다.**

7. **출력된 코드에 주석을 표시하지 않습니다.**

8. **반드시 응답 마지막에 다음과 같은 형식으로 작업 요약을 출력해야 합니다:**
   --- 작업 요약 ---
   생성된 파일: [파일명1, 파일명2, ...] (없으면 "없음")
   수정된 파일: [파일명1, 파일명2, ...] (없으면 "없음")  
   삭제된 파일: [파일명1, 파일명2, ...] (없으면 "없음")

9. **파일 작업이 전혀 없는 경우에도 "없음"으로 표시하여 작업 요약을 반드시 포함해야 합니다.**

10. **사용자의 요청에 대한 설명이나 해석을 먼저 제공하지 마세요. 바로 파일 작업을 수행하세요.**

**응답 형식 예시:**
수정 파일: src/components/Button.tsx
\`\`\`typescript
// 전체 파일 코드
\`\`\`

새 파일: src/utils/helper.ts
\`\`\`typescript
// 전체 파일 코드
\`\`\`

--- 작업 요약 ---
생성된 파일: src/utils/helper.ts
수정된 파일: src/components/Button.tsx
삭제된 파일: 없음

--- 프로젝트 정보 ---
${projectRootInfo}
`;
            } else if (promptType === PromptType.GENERAL_ASK) {
                systemPrompt = `당신은 사용자의 질문에 답변하는 친절하고 유용한 AI 어시스턴트입니다. 코드 관련 질문, 일반적인 지식, 문제 해결 등 다양한 주제에 대해 명확하고 간결하게 답변해주세요.
중요 규칙:
1.  사용자의 질문에 직접적으로 답변해주세요.
2.  가능하다면 관련성 높은 정보와 예시를 포함하여 답변을 풍부하게 만드세요.
3.  코드 블록이 필요한 경우, 적절한 언어 지시어와 함께 마크다운 형식으로 제공하세요.
4.  불필요한 서론이나 결론 없이 핵심 내용을 전달하세요.
5.  주석을 사용하지 않고, 오직 필요한 정보만 포함하세요.
6.  파일 수정이나 생성 지시어(예: '수정 파일:', '새 파일:')는 사용하지 마세요. 이 탭은 일반적인 질문과 답변을 위한 것입니다.

--- 프로젝트 정보 ---
${projectRootInfo}
`;
            } else {
                systemPrompt = `당신은 유용한 AI 어시스턴트입니다. 사용자의 요청에 대해 답변해주세요.`;
            }

            // 선택된 파일들의 내용을 읽어서 컨텍스트에 추가
            if (selectedFiles && selectedFiles.length > 0) {
                let selectedFilesContext = "";
                for (const filePath of selectedFiles) {
                    try {
                        const fileUri = vscode.Uri.file(filePath);
                        const contentBytes = await vscode.workspace.fs.readFile(fileUri);
                        const content = Buffer.from(contentBytes).toString('utf8');
                        const fileName = filePath.split(/[/\\]/).pop() || 'Unknown';
                        
                        // 선택된 파일을 includedFilesForContext 배열에 추가
                        includedFilesForContext.push({ 
                            name: fileName, 
                            fullPath: filePath 
                        });
                        
                        selectedFilesContext += `파일명: ${fileName}\n경로: ${filePath}\n코드:\n\`\`\`\n${content}\n\`\`\`\n\n`;
                    } catch (error) {
                        console.error(`Error reading selected file ${filePath}:`, error);
                        selectedFilesContext += `파일명: ${filePath.split(/[/\\]/).pop() || 'Unknown'}\n경로: ${filePath}\n오류: 파일을 읽을 수 없습니다.\n\n`;
                    }
                }
                
                if (selectedFilesContext) {
                    fileContentsContext += `\n--- 사용자가 선택한 추가 파일들 ---\n${selectedFilesContext}`;
                }
            }

            // 사용자 쿼리와 이미지 데이터를 포함하는 Parts 배열 생성
            const userParts: Part[] = [];
            if (userQuery) {
                userParts.push({ text: `사용자 요청: ${userQuery}\n\n위의 시스템 지시사항을 반드시 따라주세요. 파일 작업이 필요한 경우 반드시 '수정 파일:', '새 파일:', '삭제 파일:' 형식을 사용하고, 응답 마지막에 작업 요약을 포함해야 합니다.` });
            }
            if (imageData && imageMimeType) {
                userParts.push({
                    inlineData: {
                        data: imageData,
                        mimeType: imageMimeType
                    }
                });
            }

            // 실시간 정보 요청인지 확인하고 처리
            let realTimeInfo = '';
            if (promptType === PromptType.GENERAL_ASK) {
                realTimeInfo = await this.processRealTimeInfoRequest(userQuery);
            }

            // 컨텍스트가 있는 경우에만 포함 (CODE_GENERATION 또는 선택된 파일이 있는 경우)
            const contextPart: Part = (fileContentsContext.trim() !== "")
                ? { text: `--- 참조 코드 컨텍스트 ---\n${fileContentsContext}` }
                : { text: "--- 참조 코드 컨텍스트 ---\n참조 코드가 제공되지 않았습니다." };

            // 실시간 정보가 있으면 추가
            const realTimePart: Part = realTimeInfo 
                ? { text: `--- 실시간 정보 ---\n${realTimeInfo}` }
                : { text: "" };

            const fullParts: Part[] = [...userParts, contextPart];
            if (realTimeInfo) {
                fullParts.push(realTimePart);
            }

            // console.log("[To Banya] System Prompt:", systemPrompt);
            console.log("[To Banya] System Prompt:", systemPrompt);
            console.log("[To Banya] Full Parts:", fullParts);

            const requestOptions: RequestOptions = { signal: abortSignal };
            let llmResponse = await this.geminiApi.sendMessageWithSystemPrompt(
                systemPrompt, 
                fullParts, 
                requestOptions
            ); // userParts 전달

            // GENERAL_ASK 타입일 때는 파일 업데이트를 위한 컨텍스트 파일을 넘기지 않음
            await this.llmResponseProcessor.processLlmResponseAndApplyUpdates(
                llmResponse,
                promptType === PromptType.CODE_GENERATION ? includedFilesForContext : [],
                webviewToRespond,
                promptType // promptType을 LlmResponseProcessor로 전달
            );

        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.warn("[CodePilot] Banya API call was explicitly aborted.");
                webviewToRespond.postMessage({ command: 'receiveMessage', sender: 'CodePilot', text: 'AI 호출이 취소되었습니다.' });
            } else {
                console.error("Error in handleUserMessageAndRespond:", error);
                this.notificationService.showErrorMessage(`Error: Failed to process request.'}`);
                webviewToRespond.postMessage({ command: 'receiveMessage', sender: 'CodePilot', text: `Failed to process request.'}` });
            }
        } finally {
            this.currentGeminiCallController = null;
            webviewToRespond.postMessage({ command: 'hideLoading' });
        }
    }

    /**
     * 실시간 정보 요청을 처리합니다
     */
    private async processRealTimeInfoRequest(userQuery: string): Promise<string> {
        const query = userQuery.toLowerCase();
        let realTimeInfo = '';

        try {
            // 날씨 정보 요청 확인
            if (query.includes('날씨') || query.includes('weather')) {
                const cityMatch = query.match(/(?:날씨|weather)\s*(?:는|이|가|의)?\s*([가-힣a-zA-Z\s]+)/);
                const city = cityMatch ? cityMatch[1].trim() : '서울';
                
                const weather = await this.externalApiService.getWeatherData(city);
                if (weather) {
                    realTimeInfo += `### 🌤️ ${weather.location} 날씨\n`;
                    realTimeInfo += `- 온도: ${weather.temperatureText}\n`;
                    realTimeInfo += `- 날씨: ${weather.forecast}\n`;
                    realTimeInfo += `- 하늘상태: ${weather.skyCondition}\n`;
                    realTimeInfo += `- 강수: ${weather.precipitation}`;
                    if (weather.precipitationProbability) {
                        realTimeInfo += ` (확률: ${weather.precipitationProbability})`;
                    }
                    realTimeInfo += `\n`;
                    realTimeInfo += `- 풍향: ${weather.windDirection}\n`;
                    if (weather.windSpeedText) {
                        realTimeInfo += `- 풍속: ${weather.windSpeedText}\n`;
                    }
                    realTimeInfo += `\n`;

                    // 중기 예보 정보 추가
                    if (weather.mediumTermForecast && weather.mediumTermForecast.length > 0) {
                        realTimeInfo += `### 📅 ${weather.location} 중기 예보 (내일~7일 후)\n\n`;
                        weather.mediumTermForecast.forEach((forecast, index) => {
                            const dateObj = new Date(forecast.date);
                            const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][dateObj.getDay()];
                            const formattedDate = `${dateObj.getMonth() + 1}/${dateObj.getDate()} (${dayOfWeek})`;
                            
                            realTimeInfo += `#### 📆 ${formattedDate}\n`;
                            if (forecast.minTemp !== 0 || forecast.maxTemp !== 0) {
                                realTimeInfo += `- 기온: ${forecast.minTemp}°C ~ ${forecast.maxTemp}°C\n`;
                            }
                            realTimeInfo += `- 하늘상태: ${forecast.skyCondition}\n`;
                            realTimeInfo += `- 강수: ${forecast.precipitation}`;
                            if (forecast.precipitationProbability) {
                                realTimeInfo += ` (확률: ${forecast.precipitationProbability})`;
                            }
                            realTimeInfo += `\n`;
                            realTimeInfo += `- 예보: ${forecast.forecast}\n`;
                            realTimeInfo += `---\n\n`;
                        });
                    }
                } else {
                    // API 키가 설정되지 않았거나 오류가 발생한 경우
                    const weatherApiKey = await this.configurationService.getWeatherApiKey();
                    if (!weatherApiKey) {
                        realTimeInfo += `### 🌤️ 날씨 정보\n`;
                        realTimeInfo += `날씨 정보를 가져오려면 기상청 API 키가 필요합니다.\n`;
                        realTimeInfo += `CodePilot 설정에서 기상청 API 키를 설정해주세요.\n`;
                        realTimeInfo += `[기상청 API 허브](https://apihub.kma.go.kr/)에서 API 키를 발급받을 수 있습니다.\n\n`;
                    } else {
                        realTimeInfo += `### 🌤️ 날씨 정보\n`;
                        realTimeInfo += `날씨 정보를 가져오는 중 오류가 발생했습니다.\n`;
                        realTimeInfo += `API 키를 확인하거나 잠시 후 다시 시도해주세요.\n\n`;
                    }
                }
            }

            // 뉴스 정보 요청 확인 (키워드 기반)
            const newsKeywords = ['뉴스', 'news', '최신', 'latest', '최근', 'recent', '정보', 'info', '소식', 'announcement', '발표', 'announce'];
            const hasNewsKeyword = newsKeywords.some(keyword => query.includes(keyword));
            
            if (hasNewsKeyword) {
                // 키워드에 따라 뉴스 개수 결정
                let newsCount = 3; // 기본값
                let newsQuery = 'general';
                
                // 특정 키워드가 있으면 더 많은 뉴스를 가져옴
                if (query.includes('최신') || query.includes('latest') || query.includes('최근') || query.includes('recent')) {
                    newsCount = 5;
                }
                if (query.includes('많이') || query.includes('more') || query.includes('전체') || query.includes('all')) {
                    newsCount = 10;
                }
                if (query.includes('모든') || query.includes('everything')) {
                    newsCount = 15;
                }
                
                // 특정 주제 키워드 추출
                const topicKeywords = ['IT', '기술', 'tech', '프로그래밍', 'programming', '개발', 'development', 
                                     'AI', '인공지능', 'artificial intelligence', '머신러닝', 'machine learning',
                                     '블록체인', 'blockchain', '클라우드', 'cloud', '보안', 'security',
                                     '모바일', 'mobile', '웹', 'web', '앱', 'app', '소프트웨어', 'software',
                                     '게임', 'game', '엔터테인먼트', 'entertainment', '영화', 'movie',
                                     '음악', 'music', '스포츠', 'sports', '경제', 'economy', '금융', 'finance',
                                     '정치', 'politics', '사회', 'society', '교육', 'education', '의료', 'medical',
                                     '건강', 'health', '환경', 'environment', '과학', 'science', '우주', 'space',
                                     '자동차', 'car', '자동차', 'automotive', '부동산', 'real estate', '여행', 'travel',
                                     '음식', 'food', '요리', 'cooking', '패션', 'fashion', '뷰티', 'beauty'];
                
                // 사용자 쿼리에서 주제 키워드 찾기
                let foundTopic = false;
                for (const keyword of topicKeywords) {
                    if (query.includes(keyword)) {
                        newsQuery = keyword;
                        newsCount = Math.max(newsCount, 8); // 주제별 뉴스는 최소 8개
                        foundTopic = true;
                        break;
                    }
                }
                
                // 주제 키워드가 없으면 사용자 쿼리에서 주요 단어 추출
                if (!foundTopic) {
                    // 한국어와 영어 단어 추출 (2글자 이상)
                    const words = query.match(/[가-힣a-zA-Z]{2,}/g) || [];
                    // 뉴스 관련 키워드 제외
                    const filteredWords = words.filter(word => 
                        !newsKeywords.some(newsKeyword => 
                            word.toLowerCase().includes(newsKeyword.toLowerCase())
                        )
                    );
                    
                    if (filteredWords.length > 0) {
                        // 가장 긴 단어를 우선 선택 (더 구체적인 키워드)
                        newsQuery = filteredWords.sort((a, b) => b.length - a.length)[0];
                        newsCount = Math.max(newsCount, 5); // 일반 키워드는 최소 5개
                    } else {
                        // 추출된 단어가 없으면 전체 쿼리를 사용 (뉴스 관련 키워드 제거)
                        newsQuery = query.replace(new RegExp(newsKeywords.join('|'), 'gi'), '').trim();
                        if (newsQuery.length > 0) {
                            newsCount = Math.max(newsCount, 5);
                        }
                    }
                }
                
                const news = await this.externalApiService.getNewsData(newsQuery, newsCount);
                if (news.length > 0) {
                    realTimeInfo += `### 📰 ${newsQuery} 관련 뉴스 (${news.length}건)\n\n`;
                    news.forEach((item, index) => {
                        realTimeInfo += `#### 📄 ${index + 1}. ${item.title}\n\n`;
                        realTimeInfo += `> ${item.description}\n\n`;
                        realTimeInfo += `**📰 출처:** ${item.source}  \n`;
                        realTimeInfo += `**🕒 발행:** ${item.publishedAt}  \n`;
                        realTimeInfo += `**🔗 [원문 보기](${item.url})**\n\n`;
                        realTimeInfo += `---\n\n`;
                    });
                } else {
                    // 뉴스 API 키가 설정되지 않았거나 오류가 발생한 경우
                    const newsApiKey = await this.configurationService.getNewsApiKey();
                    const newsApiSecret = await this.configurationService.getNewsApiSecret();
                    if (!newsApiKey || !newsApiSecret) {
                        realTimeInfo += `### 📰 뉴스 정보\n`;
                        realTimeInfo += `뉴스 정보를 가져오려면 네이버 API 인증 정보가 필요합니다.\n`;
                        realTimeInfo += `CodePilot 설정에서 네이버 API Client ID와 Client Secret을 설정해주세요.\n`;
                        realTimeInfo += `[네이버 개발자 센터](https://developers.naver.com/)에서 API 인증 정보를 발급받을 수 있습니다.\n\n`;
                    } else {
                        realTimeInfo += `### 📰 뉴스 정보\n`;
                        realTimeInfo += `뉴스 정보를 가져오는 중 오류가 발생했습니다.\n`;
                        realTimeInfo += `API 인증 정보를 확인하거나 잠시 후 다시 시도해주세요.\n\n`;
                    }
                }
            } else {
                // 뉴스 키워드가 없어도 사용자 쿼리가 충분히 구체적이면 뉴스 검색 시도
                // 뉴스 키워드 제거 후 남은 텍스트가 의미있는 길이인지 확인
                const queryWithoutNewsKeywords = query.replace(new RegExp(newsKeywords.join('|'), 'gi'), '').trim();
                
                // 3글자 이상의 의미있는 쿼리인 경우 뉴스 검색 시도
                if (queryWithoutNewsKeywords.length >= 3) {
                    let newsCount = 3; // 기본 뉴스 개수
                    let newsQuery = queryWithoutNewsKeywords;
                    
                    // 쿼리 길이에 따라 뉴스 개수 조정
                    if (queryWithoutNewsKeywords.length >= 10) {
                        newsCount = 5;
                    }
                    if (queryWithoutNewsKeywords.length >= 20) {
                        newsCount = 8;
                    }
                    
                    // 특정 주제 키워드가 있으면 더 많은 뉴스
                    const topicKeywords = ['IT', '기술', 'tech', '프로그래밍', 'programming', '개발', 'development', 
                                         'AI', '인공지능', 'artificial intelligence', '머신러닝', 'machine learning',
                                         '블록체인', 'blockchain', '클라우드', 'cloud', '보안', 'security',
                                         '모바일', 'mobile', '웹', 'web', '앱', 'app', '소프트웨어', 'software',
                                         '게임', 'game', '엔터테인먼트', 'entertainment', '영화', 'movie',
                                         '음악', 'music', '스포츠', 'sports', '경제', 'economy', '금융', 'finance',
                                         '정치', 'politics', '사회', 'society', '교육', 'education', '의료', 'medical',
                                         '건강', 'health', '환경', 'environment', '과학', 'science', '우주', 'space',
                                         '자동차', 'car', '자동차', 'automotive', '부동산', 'real estate', '여행', 'travel',
                                         '음식', 'food', '요리', 'cooking', '패션', 'fashion', '뷰티', 'beauty'];
                    
                    for (const keyword of topicKeywords) {
                        if (queryWithoutNewsKeywords.includes(keyword)) {
                            newsCount = Math.max(newsCount, 8);
                            break;
                        }
                    }
                    
                    const news = await this.externalApiService.getNewsData(newsQuery, newsCount);
                    if (news.length > 0) {
                        realTimeInfo += `### 📰 "${newsQuery}" 관련 뉴스 (${news.length}건)\n\n`;
                        realTimeInfo += `*사용자 질문과 관련된 최신 뉴스를 찾았습니다.*\n\n`;
                        news.forEach((item, index) => {
                            realTimeInfo += `#### 📄 ${index + 1}. ${item.title}\n\n`;
                            realTimeInfo += `> ${item.description}\n\n`;
                            realTimeInfo += `**📰 출처:** ${item.source}  \n`;
                            realTimeInfo += `**🕒 발행:** ${item.publishedAt}  \n`;
                            realTimeInfo += `**🔗 [원문 보기](${item.url})**\n\n`;
                            realTimeInfo += `---\n\n`;
                        });
                    } else {
                        // 뉴스 API 키가 설정되지 않았거나 오류가 발생한 경우
                        const newsApiKey = await this.configurationService.getNewsApiKey();
                        const newsApiSecret = await this.configurationService.getNewsApiSecret();
                        if (!newsApiKey || !newsApiSecret) {
                            realTimeInfo += `### 📰 뉴스 정보\n`;
                            realTimeInfo += `뉴스 정보를 가져오려면 네이버 API 인증 정보가 필요합니다.\n`;
                            realTimeInfo += `CodePilot 설정에서 네이버 API Client ID와 Client Secret을 설정해주세요.\n`;
                            realTimeInfo += `[네이버 개발자 센터](https://developers.naver.com/)에서 API 인증 정보를 발급받을 수 있습니다.\n\n`;
                        } else {
                            realTimeInfo += `### 📰 뉴스 정보\n`;
                            realTimeInfo += `"${newsQuery}" 관련 뉴스를 찾지 못했습니다.\n`;
                            realTimeInfo += `다른 키워드로 다시 시도해보세요.\n\n`;
                        }
                    }
                }
            }

            // 주식 정보 요청 확인
            if (query.includes('주식') || query.includes('stock') || query.includes('주가')) {
                // 일반적인 주식 심볼들
                const commonStocks = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN'];
                const stocks = await this.externalApiService.getMultipleStockData(commonStocks);
                if (stocks.length > 0) {
                    realTimeInfo += `### 📈 주요 주식 정보\n`;
                    stocks.forEach(stock => {
                        const changeIcon = stock.change >= 0 ? '📈' : '📉';
                        realTimeInfo += `- **${stock.symbol}**: $${stock.price.toFixed(2)} `;
                        realTimeInfo += `${changeIcon} ${stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)} `;
                        realTimeInfo += `(${stock.changePercent >= 0 ? '+' : ''}${stock.changePercent.toFixed(2)}%)\n`;
                    });
                    realTimeInfo += '\n';
                } else {
                    // 주식 API 키가 설정되지 않았거나 오류가 발생한 경우
                    const stockApiKey = await this.configurationService.getStockApiKey();
                    if (!stockApiKey) {
                        realTimeInfo += `### 📈 주식 정보\n`;
                        realTimeInfo += `주식 정보를 가져오려면 Alpha Vantage API 키가 필요합니다.\n`;
                        realTimeInfo += `CodePilot 설정에서 Alpha Vantage API 키를 설정해주세요.\n`;
                        realTimeInfo += `[Alpha Vantage](https://www.alphavantage.co/)에서 API 키를 발급받을 수 있습니다.\n\n`;
                    } else {
                        realTimeInfo += `### 📈 주식 정보\n`;
                        realTimeInfo += `주식 정보를 가져오는 중 오류가 발생했습니다.\n`;
                        realTimeInfo += `API 키를 확인하거나 잠시 후 다시 시도해주세요.\n\n`;
                    }
                }
            }

        } catch (error) {
            console.error('Error processing real-time info request:', error);
            realTimeInfo += '실시간 정보를 가져오는 중 오류가 발생했습니다.\n\n';
        }

        return realTimeInfo;
    }
}