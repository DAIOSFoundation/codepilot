<p align="right">
  🇺🇸 <a href="README.md">View in English</a>
</p>

# codepilot README

VSCode 기반 코드 어시스턴트 플러그인 (LLM 및 LM 지원)

## 주요 기능

<img src="https://drive.google.com/uc?export=view&id=1Qnb_rdSzjfSR34o4lZB5nDCCTuwD7lLJ" width="700" height="500"/>
<img src="https://drive.google.com/uc?export=view&id=1BpN9SVQiEnxi0R67NFzQceRkhgQyogic" width="700" height="500"/><br>
<img src="https://drive.google.com/uc?export=view&id=1KYN5wO_lE8lBgyrldAtMpKReJYUYnwTO" width="700" height="500"/><br>
<img src="https://drive.google.com/uc?export=view&id=1sADJQZCmOatGiHyeop1pa0dipg_Zs5SP" width="700" height="500"/><br>

### 🤖 AI 기반 코드 어시스턴스
- **멀티모델 AI 지원**:
  - **Gemini 2.5 Pro Flash**: Google의 고급 LLM으로 지능형 코드 생성 및 분석
  - **Ollama 통합**: 오프라인 AI 처리를 위한 로컬 Ollama 서버 통합
    - **Gemma3:27b**: 128K 토큰 제한으로 코드 생성 및 분석
    - **DeepSeek R1:70B**: 200K 토큰 제한으로 한국어 최적화
    - **CodeLlama 7B**: 8K 토큰 제한으로 코드 생성에 최적화
  - **동적 모델 선택**: 설정에서 클라우드와 로컬 AI 모델 간 전환 가능
- **듀얼 모드 인터페이스**:
  - **CODE 탭**: 코드 생성, 수정, 프로젝트 작업에 특화
  - **ASK 탭**: 일반 Q&A 및 실시간 정보 질의
- **맥락 인식 응답**: 프로젝트 구조와 기존 코드를 분석하여 관련성 높은 제안 제공
- **자연어 처리**: 복잡한 요청도 자연어로 이해
- **로컬 AI 처리**: Ollama 통합으로 완전한 오프라인 기능 제공

### 📁 고급 파일 관리
- **스마트 파일 선택**: @ 버튼으로 특정 파일을 선택해 맥락에 포함
  - **CODE 탭**: 맥락 인식 코드 생성 및 수정을 위한 전체 파일 작업 기능
  - **ASK 탭**: 맥락 인식 질의를 위한 파일 선택 (읽기 전용, 파일 작업 없음)
- **지속적 파일 컨텍스트**: 선택한 파일이 여러 대화에서 유지됨
- **다중 파일 작업**: 여러 파일을 동시에 생성, 수정, 삭제 지원
- **프로젝트 루트 설정**: 정확한 파일 작업을 위한 루트 경로 설정 가능
- **자동 파일 업데이트**: AI 제안에 따라 파일 자동 생성/수정 옵션 제공
- **파일 태그 관리**: 개별 제거 및 전체 삭제 기능이 있는 시각적 파일 태그

### 🖼️ 시각적 코드 분석
- **이미지 지원**: 코드 분석 및 디버깅을 위한 이미지 업로드 가능
- **드래그&드롭 인터페이스**: 클립보드 붙여넣기로 이미지 첨부 가능
- **시각적 맥락**: AI가 스크린샷, 다이어그램, 코드 이미지를 분석

### 🌐 실시간 정보 서비스
- **날씨 정보**: 기상청 API 연동
  - 현재 날씨 및 예보
  - 7일 예측
  - 위치별 날씨 데이터
- **뉴스 업데이트**: NewsAPI 연동
  - 주제별 뉴스 검색
  - 실시간 뉴스 집계
  - 출처 및 타임스탬프 표시
- **주식 시장 데이터**: Alpha Vantage API 연동
  - 실시간 주가 및 변동
  - 주요 주식(AAPL, GOOGL, MSFT, TSLA, AMZN) 추적
  - 변동률 계산

### 🔢 토큰 관리 시스템
- **입력 토큰 계산**: Gemini와 Ollama 모델 모두에 대한 자동 토큰 카운팅
- **모델별 제한**: 
  - Gemini 2.5 Flash: 1,000,000 입력 토큰, 500,000 출력 토큰
  - Gemma3:27b: 128,000 입력/출력 토큰
  - DeepSeek R1:70B: 200,000 입력/출력 토큰
  - CodeLlama 7B: 8,192 입력/출력 토큰
- **토큰 제한 경고**: 입력 토큰이 모델 제한을 초과할 때 자동 감지 및 사용자 경고
- **사용량 모니터링**: 실시간 토큰 사용량 로깅 및 백분율 추적

### ⚙️ 포괄적 설정
- **멀티모델 AI 설정**:
  - **AI 모델 선택**: Gemini 2.5 Pro Flash와 Ollama 중 선택
  - **Ollama 모델 선택**: 특정 Ollama 모델 선택 (Gemma3:27b, DeepSeek R1:70B, CodeLlama 7B)
  - **Ollama 서버 설정**: Ollama API URL 및 엔드포인트 선택 설정
    - 로컬 Ollama: `http://localhost:11434` + `/api/generate`
    - 외부 서버: `https://your-server.com` + `/api/chat`
    - Vessl AI 클러스터: `https://model-service-gateway-xxx.eu.h100-cluster.vessl.ai` + `/api/chat`
  - **동적 설정**: 선택된 모델에 따라 관련 설정 자동 활성화/비활성화
- **API 키 관리**: 여러 외부 API 키를 안전하게 저장
  - Gemini API 키 설정
  - 날씨 API 키 설정
  - 뉴스 API 자격증명(Client ID & Secret)
  - 주식 API 키 관리
  - **Banya 라이센스 관리**:
    - AES-256-CBC 암호화로 라이센스 시리얼 저장
    - Firebase Firestore 검증 시스템
    - 저장된 라이센스 읽기 전용 표시
    - 라이센스 삭제 및 재검증 기능
- **소스 경로 설정**: 코드 맥락 포함을 위한 경로 지정 가능
- **자동 업데이트 설정**: 자동 파일 작업 on/off 토글
- **프로젝트 루트 설정**: 유연한 프로젝트 디렉토리 지정

### 💻 개발 경험 향상
- **코드 블록 표시**: 언어 감지 및 하이라이트된 코드 블록
- **복사 버튼**: 원클릭 코드 복사 기능
- **파일 작업 추적**: 파일 생성, 수정, 삭제에 대한 실시간 피드백
- **Diff 보기**: 원본과 AI 제안 코드의 나란히 비교
- **에러 처리**: 포괄적 에러 리포팅 및 사용자 피드백

### 🔒 보안 & 개인정보
- **API 키 안전 저장**: 민감한 API 키를 VS Code SecretStorage에 저장
- **암호화된 라이센스 저장**: Banya 라이센스 시리얼을 AES-256-CBC로 암호화
- **라이센스 보호**: CODE 및 ASK 탭은 유효한 Banya 라이센스가 필요
- **로컬 처리**: 핵심 기능은 인터넷 없이도 동작
- **개인정보 우선**: 외부 전송 없이 로컬 코드 분석

### 🎨 현대적 UI
- **VS Code 통합**: 네이티브 테마 및 스타일 적용
- **반응형 디자인**: 다양한 화면 크기와 테마에 적응
- **직관적 네비게이션**: CODE/ASK 모드 간 손쉬운 전환
- **로딩 인디케이터**: AI 처리 중 시각적 피드백
- **메시지 히스토리**: 명확한 대화 흐름과 기록
- **다국어 지원**: 7개 언어 완전 지원 (한국어, 영어, 일본어, 독일어, 스페인어, 프랑스어, 중국어)
- **라이센스 상태 표시**: 라이센스 검증 상태 및 읽기 전용 라이센스 필드 시각적 표시

### 🚀 성능 기능
- **요청 중단**: AI 요청 취소 가능
- **맥락 최적화**: 최적의 성능을 위한 스마트 맥락 길이 관리
- **파일 타입 필터링**: 바이너리/비코드 파일 자동 제외
- **메모리 관리**: 대용량 코드베이스 효율적 처리
- **네트워크 안정성**: 로컬 네트워크 연결을 위한 Node.js HTTP 모듈 사용
- **웹뷰 안전성**: disposed 웹뷰 에러 방지를 위한 보호된 메시지 처리

### 🔐 라이센스 보호 시스템
- **Banya 라이센스 검증**:
  - Firebase Firestore 기반 라이센스 검증 시스템
  - 하이픈 포함 16자리 시리얼 번호 형식
  - 클라우드 데이터베이스와의 실시간 라이센스 검증
- **암호화 저장**:
  - 라이센스 시리얼 번호를 AES-256-CBC로 암호화
  - VS Code SecretStorage에 안전하게 저장
  - SHA-256 키 해싱으로 자동 암호화/복호화
- **접근 제어**:
  - CODE 및 ASK 탭은 유효한 라이센스가 필요
  - 다국어 지원 오류 처리
  - 라이센스 상태 표시 및 읽기 전용 표시
- **라이센스 관리**:
  - 라이센스 시리얼 입력 및 검증
  - 라이센스 삭제 및 재검증
  - 라이센스 작업에 대한 시각적 피드백

### 📋 사용 예시
- **코드 생성**: "React 사용자 인증 컴포넌트 생성해줘"
- **코드 수정**: "이 함수에 에러 핸들링 추가해줘"
- **실시간 정보**: "서울 날씨 알려줘" 또는 "최신 IT 뉴스 보여줘"
- **주식 질의**: "현재 주요 주식 시세 알려줘"
- **파일 작업**: "날짜 포맷 유틸리티 파일 생성해줘"
- **파일 선택**: @ 버튼으로 특정 파일을 선택하여 맥락에 포함
- **CODE 탭 작업**: "이 코드를 분석하고 리팩토링해줘" (전체 파일 작업)
- **ASK 탭 질의**: "이 코드의 성능을 분석해줘" (읽기 전용 분석)
- **토큰 관리**: 자동 토큰 사용량 모니터링 및 제한 경고

## 요구사항

- nvm 0.39.1
- node v21.7.1
- npm install

## 설치 및 설정

### 사전 요구사항
1. **Node.js 환경 설정**
   ```bash
   # nvm (Node Version Manager) 설치
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
   
   # Node.js v21.7.1 설치
   nvm install 21.7.1
   nvm use 21.7.1
   ```

2. **VS Code 확장 개발 도구**
   ```bash
   # VS Code 확장 생성기 설치
   npm install -g yo generator-code
   ```

### 개발 환경 설정
1. **저장소 클론 및 의존성 설치**
   ```bash
   git clone https://github.com/DAIOSFoundation/codepilot.git
   cd codepilot
   npm install
   ```

2. **확장 빌드**
   ```bash
   # 개발 빌드 (감시 모드)
   npm run watch
   
   # 프로덕션 빌드
   npm run package
   ```

3. **개발 모드에서 실행**
   ```bash
   # VS Code에서 F5를 눌러 확장 호스트 실행
   # 또는 명령 팔레트: "Developer: Reload Window"
   ```

### 설정
1. **AI 모델 설정**
   - VS Code 명령 팔레트 열기 (`Ctrl+Shift+P` / `Cmd+Shift+P`)
   - "CodePilot: Open Settings Panel" 실행
   - **Gemini 사용 시**: Gemini API 키 입력 ([Google AI Studio](https://aistudio.google.com/app/apikey)에서 획득)
   - **Ollama 사용 시**: Ollama 설치 후 API URL 설정 (기본값: http://localhost:11434)

2. **Ollama 설정 (선택사항)**
   ```bash
   # Ollama 설치
   curl -fsSL https://ollama.ai/install.sh | sh
   
   # Ollama 서버 시작
   ollama serve
   
   # 모델 다운로드
   ollama pull gemma3:27b
   ollama pull deepseek-r1:70b
   ollama pull codellama:7b
   ```

3. **선택적 외부 API**
   - **날씨 API**: [기상청 API Hub](https://apihub.kma.go.kr/)에서 API 키 획득
   - **뉴스 API**: [네이버 개발자센터](https://developers.naver.com/)에서 Client ID & Secret 획득
   - **주식 API**: [Alpha Vantage](https://www.alphavantage.co/)에서 API 키 획득

## 테스트

### 단위 테스트
```bash
# 모든 테스트 실행
npm test

# 감시 모드에서 테스트 실행
npm run watch-tests

# 린팅 실행
npm run lint
```

### 수동 테스트
1. **확장 활성화**
   - VS Code 열기
   - 확장 뷰로 이동 (`Ctrl+Shift+X`)
   - 활동 표시줄에서 "CodePilot" 찾기
   - CODE와 ASK 탭이 모두 보이는지 확인

2. **CODE 탭 테스트**
   ```bash
   # 코드 생성 테스트
   - CODE 탭 열기
   - 입력: "간단한 React 컴포넌트 생성해줘"
   - 코드 블록이 포함된 AI 응답 확인
   
   # 파일 작업 테스트
   - @ 버튼으로 파일 선택
   - 파일 수정 요청
   - 파일 생성/수정 확인
   ```

3. **ASK 탭 테스트**
   ```bash
   # 일반 Q&A 테스트
   - ASK 탭 열기
   - 질문: "TypeScript란 무엇인가요?"
   - 유익한 응답 확인
   
   # 실시간 정보 테스트
   - 질문: "서울 날씨 알려줘"
   - 질문: "최신 IT 뉴스 보여줘"
   - 질문: "현재 주식 시세 알려줘"
   ```

4. **설정 테스트**
   ```bash
   # API 키 관리 테스트
   - 설정 패널 열기
   - API 키 추가/업데이트
   - 안전한 저장 확인
   
   # 언어 전환 테스트
   - 언어 설정 변경
   - UI 즉시 업데이트 확인
   ```

### 통합 테스트
1. **파일 컨텍스트 테스트**
   - 여러 파일이 있는 테스트 프로젝트 생성
   - @ 버튼으로 특정 파일 선택
   - AI 응답에 컨텍스트가 포함되는지 확인

2. **이미지 분석 테스트**
   - 코드 스크린샷이나 다이어그램 업로드
   - 코드 분석 요청
   - AI가 시각적 내용을 이해하는지 확인

3. **다국어 테스트**
   - 지원되는 모든 언어 테스트
   - 적절한 현지화 확인
   - 언어 설정 지속성 테스트

### 성능 테스트
1. **대용량 코드베이스 테스트**
   - 100개 이상 파일이 있는 프로젝트로 테스트
   - 메모리 사용량 모니터링
   - 응답 시간 확인

2. **API 속도 제한 테스트**
   - 여러 빠른 요청 테스트
   - 적절한 에러 처리 확인
   - 중단 기능 확인

### 디버깅
```bash
# 디버그 로깅 활성화
# VS Code settings.json에 추가:
{
  "codepilot.debug": true
}

# 확장 로그 보기
# VS Code: 도움말 > 개발자 도구 토글 > 콘솔
```

## 알려진 이슈

알려진 이슈를 명시하면 중복 이슈 등록을 줄일 수 있습니다.

## 릴리즈 노트
릴리즈 노트는 [RELEASE.ko.md](RELEASE.ko.md)를 참조하세요.

### 최신 릴리즈
- **Version 2.5.9** (2025/09/15): [다운로드](release/codepilot-2.5.9.vsix)
  - Ollama 통합을 통한 CodeLlama 7B 지원 추가
  - 통합 인터페이스로 개선된 Ollama 모델 관리
  - 향상된 다국어 지원 (7개 언어)
  - 코드 생성 작업을 위한 최적화된 토큰 관리

### 추가 정보
이 소스코드의 발전에 함께할 분을 찾고 있습니다. 문의: tony@banya.ai

[![GitHub Sponsors](https://img.shields.io/badge/GitHub%20Sponsors-%E2%9D%A4%EF%B8%8F-red?style=for-the-badge&logo=github)](https://github.com/sponsors/tonythefreedom)

[![Ko-fi](https://img.shields.io/badge/Ko--fi-%E2%98%95%EF%B8%8F-purple?style=for-the-badge&logo=ko-fi)](https://ko-fi.com/lizsong)

**즐겁게 사용하세요!** 