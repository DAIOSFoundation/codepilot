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
  - **Ollama Gemma3:27b**: 오프라인 AI 처리를 위한 로컬 Ollama 서버 통합
  - **동적 모델 선택**: 설정에서 클라우드와 로컬 AI 모델 간 전환 가능
- **듀얼 모드 인터페이스**:
  - **CODE 탭**: 코드 생성, 수정, 프로젝트 작업에 특화
  - **ASK 탭**: 일반 Q&A 및 실시간 정보 질의
- **맥락 인식 응답**: 프로젝트 구조와 기존 코드를 분석하여 관련성 높은 제안 제공
- **자연어 처리**: 복잡한 요청도 자연어로 이해
- **로컬 AI 처리**: Ollama 통합으로 완전한 오프라인 기능 제공

### 📁 고급 파일 관리
- **스마트 파일 선택**: @ 버튼으로 특정 파일을 선택해 맥락에 포함
- **지속적 파일 컨텍스트**: 선택한 파일이 여러 대화에서 유지됨
- **다중 파일 작업**: 여러 파일을 동시에 생성, 수정, 삭제 지원
- **프로젝트 루트 설정**: 정확한 파일 작업을 위한 루트 경로 설정 가능
- **자동 파일 업데이트**: AI 제안에 따라 파일 자동 생성/수정 옵션 제공

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

### ⚙️ 포괄적 설정
- **멀티모델 AI 설정**:
  - **AI 모델 선택**: Gemini 2.5 Pro Flash와 Ollama Gemma3:27b 중 선택
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
   
   # Gemma3:27b 모델 다운로드
   ollama pull gemma3:27b
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

### Version 2.5.0 (2025/08/19) - Ollama 파일 작업 수정 및 정규식 지원 강화

<details>
<summary>Ollama 파일 작업 수정</summary>

- **파일 경로 파싱 수정**: Ollama 응답에서 파일명에 `**` 접미사가 포함되는 문제 해결
- **정규식 패턴 강화**: Ollama 응답의 마크다운 헤더(`##`) 처리 기능 추가
- **파일명 정리**: 파일 경로에서 `**` 접미사 자동 제거로 정확한 매칭 보장
- **컨텍스트 파일 매칭**: 수정된 파일을 컨텍스트 파일 목록에서 찾지 못하는 문제 해결
- **디버깅 로그**: 정규식 매치 그룹에 대한 상세 로깅으로 문제 해결 개선

</details>

<details>
<summary>기술적 개선</summary>

- **정규식 패턴 강화**: `(?:##\s*)?(새 파일|수정 파일):\s+([^\r\n]+?)(?:\r?\n\s*\r?\n```[^\n]*\r?\n([\s\S]*?)\r?\n```)/g` 패턴으로 업데이트
- **파일 경로 처리**: `llmSpecifiedPath.replace(/\*\*$/, '')`로 파일명 정리 기능 추가
- **PromptType Import 수정**: `geminiService`에서 `llmService`로 import 경로 수정
- **중복 타입 정의 제거**: `ollamaService.ts`에서 중복된 `PromptType` 정의 제거
- **시스템 프롬프트 강화**: 파일 생성 지시사항이 포함된 Ollama 시스템 프롬프트 개선

</details>

<details>
<summary>Ollama 통합 개선</summary>

- **외부 서버 지원**: 외부 Ollama 서버(Vessl AI 등) 지원 강화
- **SSL 인증서 처리**: 외부 HTTPS 서버를 위한 SSL 인증서 우회 기능 추가
- **API 엔드포인트 유연성**: `/api/generate`(로컬) 및 `/api/chat`(외부) 엔드포인트 지원
- **사용자 설정 가능한 엔드포인트**: 설정에서 엔드포인트 선택을 위한 드롭다운 추가
- **응답 형식 처리**: 다양한 응답 형식의 자동 감지 및 처리

</details>

<details>
<summary>파일 작업 기능 강화</summary>

- **정확한 파일 매칭**: 파일 수정을 위한 컨텍스트 파일 목록 매칭 수정
- **다중 파일 지원**: 단일 응답에서 여러 파일 작업 처리 개선
- **에러 처리**: 파일 작업 실패에 대한 향상된 에러 메시지
- **성공 인디케이터**: 파일 생성, 수정, 삭제에 대한 명확한 성공/에러 인디케이터
- **디버그 정보**: 파일 작업 디버깅을 위한 포괄적인 로깅 추가

</details>

### Version 2.4.2 (2025/07/29) - 멀티모델 AI 지원 및 Ollama 통합

<details>
<summary>멀티모델 AI 지원</summary>

- **Ollama 통합**: 로컬 Ollama Gemma3:27b 모델 지원 추가
- **동적 모델 선택**: 설정에서 Gemini와 Ollama 중 선택 가능한 AI 모델 드롭다운
- **모델별 설정**: 선택된 모델에 따라 관련 설정 자동 활성화/비활성화
- **통합 LLM 서비스**: Gemini와 Ollama API 호출을 처리하는 중앙화된 서비스
- **오프라인 기능**: 로컬 Ollama 서버로 완전한 오프라인 AI 처리

</details>

<details>
<summary>향상된 설정 인터페이스</summary>

- **AI 모델 설정**: AI 모델 선택 드롭다운 (Gemini 2.5 Pro Flash / Gemma3:27b)
- **Ollama API URL 설정**: 로컬 Ollama 서버 주소 설정 입력 필드
- **Banya 라이센스 관리**: 라이센스 시리얼 입력 및 검증 시스템
- **동적 UI**: 모델 선택에 따라 설정 섹션 자동 활성화/비활성화
- **기본 설정**: Gemini 2.5 Pro Flash를 기본 모델로 설정

</details>

<details>
<summary>기술적 개선</summary>

- **네트워크 안정성**: 로컬 연결을 위해 fetch를 Node.js HTTP 모듈로 교체
- **웹뷰 안전성**: disposed 웹뷰 에러 방지를 위한 safePostMessage 함수 추가
- **에러 처리**: 네트워크 연결 문제에 대한 향상된 에러 처리
- **타입 안전성**: TypeScript 타입 정의 및 에러 검사 개선
- **성능**: 메시지 처리 및 웹뷰 통신 최적화

</details>

<details>
<summary>Ollama 설정 가이드</summary>

- **서버 설치**: curl -fsSL https://ollama.ai/install.sh | sh
- **모델 다운로드**: ollama pull gemma3:27b
- **서버 시작**: ollama serve
- **API URL**: 기본값 http://localhost:11434
- **네트워크 설정**: 로컬 네트워크 주소 지원

</details>

### Version 2.4.1 (2025/08/19) - LLM 프롬프트 구조 개선 및 코드 생성/수정 요청 방식 고도화

<details>
<summary>LLM 프롬프트 및 코드 생성/수정 요청 방식 개선</summary>

- LLM(대형 언어 모델)에게 코드 생성/수정/삭제 요청 시, 엄격한 출력 형식과 규칙을 시스템 프롬프트로 명시하도록 개선
- 전체 파일 코드, 파일별 지시어(수정 파일/새 파일/삭제 파일), 작업 요약, 상세 설명을 반드시 포함하도록 프롬프트 구조 강화
- 실제 코드 컨텍스트, 사용자 요청, 프로젝트 구조 정보가 함께 전달되어 AI의 작업 신뢰성 및 자동화 수준 향상
- 작업 요약(생성/수정/삭제 파일 목록)과 작업 수행 설명(동작 원리, 주요 함수/클래스, 개선점, 테스트 방법 등) 출력이 필수화됨
- 프롬프트 예시 및 규칙이 시스템 프롬프트에 명확히 포함되어, 일관된 응답 형식 보장
- geminiService.ts의 프롬프트 생성 로직을 직접 수정 및 고도화함(사용자 커스텀 반영)

</details>

### Version 2.4.0 (2025/06/26) - AI 응답 구조 및 UX 개선

<details>
<summary>AI 응답 구조 개선</summary>

- 코드 생성/수정/삭제 작업 시 명확한 파일 작업 지시어와 전체 코드 출력 필수화
- 작업 요약 및 상세 설명 출력 강화
- 에러 처리 및 사용자 피드백 개선

</details>

<details>
<summary>사용자 경험 개선</summary>

- 채팅 인터페이스 스크롤 문제 수정, 즉각적인 응답 가시성 확보
- 메시지 표시 순서 최적화: AI 응답 → 파일 작업 → 작업 요약 → 작업 설명
- 이모지 인디케이터 추가로 시각적 구분 강화:
  - 📁 파일 업데이트 결과
  - 📋 AI 작업 요약
  - 💡 작업 실행 설명
- 생각 중 애니메이션 타이밍 및 가시성 개선

</details>

<details>
<summary>코드 생성 기능 강화</summary>

- "수정 파일:", "새 파일:", "삭제 파일:" 등 파일 작업 지시어 필수화
- 부분 변경이 아닌 전체 파일 코드 출력
- 모든 작업에 대해 자동 작업 요약 생성
- 상세한 작업 설명 필수화

</details>

<details>
<summary>파일 작업 개선</summary>

- 순차 처리: 생각 중 애니메이션 제거 → 파일 작업 → 결과 표시
- 파일 작업 피드백 강화(성공/에러 인디케이터)
- 파일 생성, 수정, 삭제 시 에러 처리 개선
- 코드 수정 diff 보기 개선

</details>

<details>
<summary>API 키 관리</summary>

- Gemini API 키 설정을 라이선스에서 설정 메뉴로 이동
- 설정 패널에서 API 키 중앙 관리
- VS Code SecretStorage로 보안 강화
- API 키 유효성 검사 및 에러 처리 개선

</details>

<details>
<summary>실시간 정보 기능 강화</summary>

- 7일 예보 등 날씨 정보 강화
- 주제별 뉴스 검색 개선
- 주식 정보 표시 개선(변동률 등)
- 자연어 기반 정보 질의 강화

</details>

<details>
<summary>다국어 지원</summary>

- 포괄적 국제화(i18n) 지원 추가
- 지원 언어: 한국어, 영어, 중국어, 스페인어, 독일어, 프랑스어, 일본어
- 실시간 언어 전환 및 UI 즉시 반영
- 설정 인터페이스 현지화
- 언어 선호도 영구 저장
- 페이지 새로고침 없이 실시간 언어 변경

</details>

<details>
<summary>기술적 개선</summary>

- 웹뷰 메시지 처리 및 표시 문제 수정
- 코드 블록 렌더링 및 하이라이트 개선
- 맥락 관리 개선으로 AI 응답 품질 향상
- 에러 복구 및 사용자 알림 시스템 개선
- 언어 데이터 로딩 및 캐싱 최적화
- 언어 변경 시 UI 반응성 향상

</details>

### Version 2.3b (2025/6/15) - 실시간 정보 기능 추가

<details>
<summary>ASK 탭 실시간 정보 기능 추가</summary>

- 날씨 정보 조회(기상청 API 연동)
- 뉴스 정보 조회(NewsAPI 연동)
- 주식 정보 조회(Alpha Vantage API 연동)
- 실시간 정보에 대한 자연어 질의 지원

</details>

<details>
<summary>설정</summary>

- 외부 API 키 설정 옵션 추가(날씨, 뉴스, 주식)
- API 키를 VS Code 설정에 안전하게 관리
- 설정 페이지에 새로운 API 키 관리 섹션 추가
- 각 API 키별 개별 저장 버튼
- API 키 설정 상태 실시간 표시

</details>

<details>
<summary>사용 예시</summary>

- "서울 날씨" → 서울의 현재 날씨 정보
- "뉴스" → 최신 뉴스 헤드라인
- "주식" → 주요 주식 정보(AAPL, GOOGL, MSFT, TSLA, AMZN)

</details>

### Version 2.2b (2025/06/10) - API 호환성 수정

<details>
<summary>AI</summary>

- Gemini API의 미지원 webSearch 도구 관련 오류 수정
- API 호환성 문제로 웹 검색 기능 임시 제거
- ASK 탭이 웹 검색 없이도 동작하도록 개선
- API 호출 에러 처리 개선

</details>

### Version 2.1b (2025/06/5) - 파일 선택 & 컨텍스트

<details>
<summary>CHAT 패널</summary>

- CODE 탭에서 @ 버튼으로 파일 선택 기능 추가
- 선택한 파일을 흰색 테두리의 태그로 표시
- 선택한 파일이 여러 메시지에서 지속적으로 유지
- 파일 선택 영역과 입력 영역 사이에 구분선 추가
- 선택 파일 태그의 수직 중앙 정렬
- 파일 선택기가 설정된 프로젝트 루트 경로에서 시작
- 다중 파일 선택 지원

</details>

<details>
<summary>AI</summary>

- @ 버튼으로 선택한 파일을 LLM에 추가 컨텍스트로 포함
- CODE/ASK 탭 모두에서 파일 컨텍스트 동작
- 파일 작업 추적을 위한 맥락 처리 강화

</details>

### Version 2.0.0 - UI 전면 개편

<details>
<summary>주요 변경점</summary>

- 현대적 UI로 전면 개편
- CODE/ASK 탭이 있는 전용 뷰 컨테이너 추가
- 지속적 파일 선택 기능 구현
- 복사 기능이 있는 코드 블록 표시 강화
- 실시간 정보 기능 추가

</details>

### Version 1.4.0 - 이미지 지원 & 파일 선택기

<details>
<summary>기능</summary>

- 코드 분석을 위한 이미지 지원 추가
- 파일 선택기 기능 구현
- 맥락 관리 강화

</details>

### Version 1.3.0 - 채팅 인터페이스 개선

<details>
<summary>개선 사항</summary>

- 코드 블록 표시 개선
- 파일 작업 추적 기능 추가
- 에러 처리 개선

</details>

### Version 1.2.0 - 프로젝트 범위 기능

<details>
<summary>기능</summary>

- 프로젝트 범위 코드 감시 추가
- 자동 디버그 기능 구현
- 다양한 UI 이슈 수정

</details>

### Version 1.1.0 - LLM 지원 강화

<details>
<summary>강화 사항</summary>

- 커스텀 LLM 모델 지원 추가
- 코드 생성 정확도 향상
- 자연어 처리 강화

</details>

### Version 1.0.0 - 최초 릴리즈

<details>
<summary>초기 기능</summary>

CodePilot의 최초 릴리즈

</details>


### 추가 정보
이 소스코드의 발전에 함께할 분을 찾고 있습니다. 문의: tony@banya.ai

[![GitHub Sponsors](https://img.shields.io/badge/GitHub%20Sponsors-%E2%9D%A4%EF%B8%8F-red?style=for-the-badge&logo=github)](https://github.com/sponsors/tonythefreedom)

[![Ko-fi](https://img.shields.io/badge/Ko--fi-%E2%98%95%EF%B8%8F-purple?style=for-the-badge&logo=ko-fi)](https://ko-fi.com/lizsong)

**즐겁게 사용하세요!** 