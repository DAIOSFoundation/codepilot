# CodePilot 릴리즈 노트

이 문서는 CodePilot VSCode 확장의 완전한 릴리즈 히스토리를 포함합니다.

## Version 3.0.0 (2025/10/16) - 프로젝트 타입별 설정 파일 자동 포함 및 터미널 명령어 실행

<details>
<summary>프로젝트 타입별 핵심 설정 파일 자동 포함</summary>

- **3단계 우선순위 파일 수집 시스템**: 설정 파일(최고) → src 파일(높음) → 기타 파일(키워드 기반)
- **Node.js/React/Vue/Angular 프로젝트**: `package.json`, `tsconfig.json`, `webpack.config.js` 등 항상 포함
- **Spring 프로젝트**: `pom.xml`, `build.gradle`, `application.properties` 등 항상 포함
- **Python 프로젝트**: `requirements.txt`, `pyproject.toml`, `setup.py` 등 항상 포함
- **Java 프로젝트**: `pom.xml`, `build.gradle`, `gradle.properties` 등 항상 포함
- **Go 프로젝트**: `go.mod`, `go.sum`, `Gopkg.toml` 등 항상 포함
- **Rust 프로젝트**: `Cargo.toml`, `Cargo.lock` 등 항상 포함
- **C# 프로젝트**: `*.csproj`, `*.sln`, `packages.config` 등 항상 포함
- **포괄적 프레임워크 지원**: 7개 주요 프로그래밍 언어/프레임워크의 핵심 설정 파일 자동 감지

</details>

<details>
<summary>수동 터미널 명령어 실행</summary>

- **보안 강화**: AI 응답의 bash callout 자동 실행 제거
- **수동 실행 버튼**: AI 응답의 bash callout에 "Run" 버튼 제공
- **주석 필터링**: `#` 주석이 포함된 라인은 자동으로 제외
- **순차 실행**: 여러 명령어를 순차적으로 실행하여 안정성 확보
- **전용 터미널**: CodePilot 전용 터미널에서 명령어 실행
- **실행 피드백**: 명령어 실행 상태 및 결과를 사용자에게 알림

</details>

<details>
<summary>Ollama 로컬 모델 자동 감지</summary>

- **로컬 모델 자동 목록화**: `ollama list` 명령으로 설치된 모델 자동 감지
- **외부 서버 모델 지원**: itc-gpt-oss:120b 등 외부 서버 모델 지원
- **자동 API URL 설정**: 특정 모델 선택 시 API URL 자동 설정
- **동적 모델 선택**: 설정에서 로컬 설치된 모델들을 드롭다운으로 선택 가능

</details>

<details>
<summary>강화된 파일 경로 검증 시스템</summary>

- **4단계 방어 시스템**: 정규식 → 강화된 정리 → LLM 검증+이중정리 → 강화된 유효성 검사
- **Callout 잔재 완전 제거**: `'`, `"`, `` ` ``, `*`, `**` 문자 완전 제거
- **설정된 LLM 사용**: 경로 검증에 설정된 LLM 사용 (Gemini 직접 호출 제거)
- **순환 의존성 해결**: `setLlmService()` 메서드로 안전한 의존성 주입
- **안전한 Fallback**: 모든 단계에서 실패해도 강화된 정리된 경로 반환

</details>

<details>
<summary>디버깅 시스템 강화</summary>

- **상세한 로깅**: 파일 처리 과정의 모든 단계에 대한 상세한 로그
- **정규식 매칭 추적**: 각 정규식 패턴의 매칭 결과 추적
- **파일 작업 실행 추적**: 파일 생성/수정/삭제 작업의 실행 과정 추적
- **오류 진단**: 파일 작업이 실패하는 원인을 쉽게 파악할 수 있는 로그 제공

</details>

## Version 2.7.0 (2025/10/15) - 자동 파일 컨텍스트 및 대화 히스토리 파일 추적

<details>
<summary>자동 파일 컨텍스트 시스템</summary>

- **소스 경로 수동 선택 제거**: 기존의 수동 소스 경로/파일 선택 UI를 완전히 제거
- **LLM 기반 자동 파일 발견**: 사용자 질의어를 기반으로 LLM이 자동으로 관련 파일들을 발견
- **package.json 기반 프로젝트 인식**: 프로젝트 루트의 package.json을 분석하여 프로젝트 타입 파악
- **관련 파일 자동 선정**: 프로젝트 타입에 따라 LLM이 관련 기본 파일들의 리스트를 자동 생성
- **두 단계 LLM 컨텍스트 계획**: 
  - 1단계: LLM에게 프로젝트 종류 및 관련 파일 목록 요청
  - 2단계: 받은 파일 목록을 루트에서 찾아 컨텍스트 구성
- **휴리스틱 폴백**: LLM 기반 접근이 실패할 경우 기존 휴리스틱 방식으로 자동 폴백

</details>

<details>
<summary>대화 히스토리 파일 추적</summary>

- **파일 작업 이력 저장**: LLM 응답에서 생성/수정/삭제된 파일 목록을 대화 히스토리에 저장
- **컨텍스트 자동 포함**: 이전 대화의 파일 변경 이력을 새 질문의 컨텍스트에 자동 포함
- **과거 작업 파일 목록**: 최근 5개 질문의 파일 작업 이력을 "과거 작업된 파일 목록"으로 표시
- **탭별 히스토리 관리**: CODE 탭과 ASK 탭 각각의 대화 히스토리를 독립적으로 관리
- **파일 작업 요약**: 생성/수정/삭제 파일을 구분하여 명확한 작업 이력 제공

</details>

<details>
<summary>사용자 경험 개선</summary>

- **설정 UI 간소화**: 소스 경로 수동 선택 관련 UI 요소 완전 제거
- **자동화된 워크플로우**: 사용자가 파일을 수동으로 선택할 필요 없이 자동으로 관련 파일 발견
- **지능적 컨텍스트**: 프로젝트 구조와 사용자 질의를 종합적으로 분석하여 최적의 컨텍스트 구성
- **일관된 파일 관리**: 모든 파일 작업이 대화 히스토리에 자동으로 기록되어 추적 가능

</details>

<details>
<summary>기술적 개선</summary>

- **LlmResponseProcessor 개선**: 파일 작업 결과를 반환하여 히스토리 저장 지원
- **LlmService 중앙화**: 모든 LLM 서비스에서 일관된 컨텍스트 계획 및 히스토리 관리
- **GeminiService/OllamaService 통합**: 파일 작업 결과 저장 및 히스토리 컨텍스트 포함
- **메모리 효율성**: 대화 히스토리를 최대 20개로 제한하여 메모리 사용량 최적화
- **타입 안전성**: 파일 작업 결과에 대한 TypeScript 타입 정의 추가

</details>

<details>
<summary>패키지 릴리즈</summary>

- **VSIX 패키지**: [codepilot-2.7.0.vsix](release/codepilot-2.7.0.vsix) (30.97 MB)
- **설치 방법**: `code --install-extension codepilot-2.7.0.vsix` 또는 VS Code에서 VSIX 설치
- **호환성**: VS Code 1.85.0 이상 지원

</details>

## Version 2.5.9 (2025/09/15) - CodeLlama 7B 지원 추가

<details>
<summary>새로운 Ollama 모델 지원</summary>

- **CodeLlama 7B 통합**: Ollama를 통한 CodeLlama 7B 모델 지원 추가
- **코드 생성 최적화**: CodeLlama 7B는 코드 생성 및 분석 작업에 특화 설계
- **토큰 관리**: 8,192 입력/출력 토큰 제한과 자동 토큰 카운팅 및 경고
- **모델 선택**: 설정의 Ollama 모델 드롭다운에 CodeLlama 7B 추가
- **통합 인터페이스**: CODE 탭과 ASK 탭 모두에서 CodeLlama 7B 사용 가능

</details>

<details>
<summary>향상된 모델 관리</summary>

- **개선된 UI 구조**: "Ollama"를 메인 옵션으로 하는 간소화된 AI 모델 선택
- **특정 모델 선택**: Gemma3:27b, DeepSeek R1:70B, CodeLlama 7B 중 선택
- **자동 모델 매핑**: 백엔드에서 모델 선택을 올바른 AI 모델 타입으로 자동 매핑
- **마이그레이션 지원**: 레거시 설정을 새로운 모델 구조로 자동 변환

</details>

<details>
<summary>다국어 지원 업데이트</summary>

- **현지화 업데이트**: 모든 언어 파일 업데이트 (한국어, 영어, 일본어, 중국어, 독일어, 스페인어, 프랑스어)
- **일관된 용어**: 모든 언어에서 "Ollama" 용어 표준화
- **UI 텍스트 개선**: 더 깔끔하고 직관적인 모델 선택 인터페이스

</details>

<details>
<summary>패키지 릴리즈</summary>

- **VSIX 패키지**: [codepilot-2.5.9.vsix](release/codepilot-2.5.9.vsix) (32.46 MB)
- **설치 방법**: `code --install-extension codepilot-2.5.9.vsix` 또는 VS Code에서 VSIX 설치
- **릴리즈 구성**: 더 나은 프로젝트 구조를 위해 `release/` 디렉토리에 패키지 파일 정리

</details>

## Version 2.5.7 - Remote SSH 환경 파일 수정 문제 해결

<details>
<summary>Remote SSH 환경 지원 강화</summary>

- **Remote SSH 환경 파일 수정 문제 해결**: VSCode Remote SSH 환경에서 LLM 응답 후 소스코드 수정이 안 되는 문제 완전 해결
- **향상된 경로 처리**: Remote SSH 환경에서 워크스페이스 경로와 파일 경로를 정확히 해석하는 로직 개선
- **URI 스키마 감지**: Remote 환경(`vscode-remote://`)과 로컬 환경(`file://`)을 자동으로 구분하여 처리
- **경로 정규화**: `path.resolve()`를 사용하여 상대 경로와 절대 경로를 정확히 처리
- **워크스페이스 경계 검증**: 파일이 워크스페이스 내부/외부에 있는지 정확히 판단하여 적절한 URI 생성

</details>

<details>
<summary>상세한 디버그 로깅 시스템</summary>

- **경로 처리 과정 추적**: 워크스페이스 경로, 절대 경로, 정규화된 경로를 모두 로깅하여 문제 진단 가능
- **파일 작업 단계별 로깅**: 파일 생성/수정/삭제 과정의 각 단계를 상세히 기록
- **오류 상세 정보**: 오류 발생 시 name, message, code, stack 정보를 모두 로깅하여 문제 해결 지원
- **Remote SSH 디버그 태그**: `[Remote SSH Debug]` 태그로 Remote SSH 관련 로그를 쉽게 식별 가능

</details>

<details>
<summary>파일 시스템 접근성 검증</summary>

- **디렉토리 접근성 테스트**: 파일 작업 전 부모 디렉토리 접근 가능 여부를 미리 확인
- **Remote URI 처리**: Remote SSH 환경에서 올바른 URI 스키마를 유지하여 파일 시스템 접근 보장
- **권한 및 경로 오류 감지**: 다양한 파일 시스템 오류에 대한 구체적인 안내 메시지 제공
- **접근 불가능 경로 경고**: Remote 환경에서 접근할 수 없는 경로에 대한 사전 경고

</details>

<details>
<summary>향상된 오류 처리 및 사용자 안내</summary>

- **권한 오류**: `EACCES`, `EPERM` 등 권한 관련 오류에 대한 구체적 해결 방법 안내
- **파일 없음 오류**: `ENOENT` 오류에 대한 경로 확인 및 해결 방법 안내
- **디렉토리 오류**: `ENOTDIR` 오류에 대한 경로 구조 확인 안내
- **파일 존재 오류**: `EEXIST` 오류에 대한 파일 상태 확인 안내
- **Remote SSH 환경 특화 메시지**: Remote SSH 환경에서 발생할 수 있는 문제에 대한 맞춤형 해결 방법 제공

</details>

<details>
<summary>기술적 개선</summary>

- **경로 해석 로직 개선**: Remote SSH 환경에서 복잡한 경로 구조를 정확히 처리
- **파일 시스템 API 활용**: VSCode의 `vscode.workspace.fs` API를 최대한 활용하여 안정성 향상
- **오류 복구 메커니즘**: 파일 작업 실패 시 대안 경로로 자동 전환하는 폴백 시스템
- **성능 최적화**: 불필요한 파일 시스템 호출을 줄이고 효율적인 경로 처리

</details>

## Version 2.5.6 (2025/08/26) - 마크다운 파일 생성 수정

<details>
<summary>마크다운 파일 생성 수정</summary>

- **3단계 정규식 시스템**: 마크다운 파일 감지를 위한 강력한 3단계 정규식 시스템 구현
- **순차적 폴백 메커니즘**: 하나의 정규식 패턴이 실패하면 시스템이 자동으로 다음 패턴을 시도
- **향상된 패턴 매칭**: 
  - 1단계: 작업 요약 및 설명 섹션을 포함한 엄격한 패턴
  - 2단계: 기본 지시어만 고려하는 중간 패턴
  - 3단계: 모든 내용을 캡처하는 간단한 패턴
- **개선된 디버깅**: 정규식 매칭 과정을 추적하기 위한 포괄적인 로깅 추가
- **안정적인 파일 생성**: 요청 시 마크다운 파일이 일관되게 생성됨

</details>

<details>
<summary>기술적 개선</summary>

- **정규식 패턴 최적화**: 마크다운 파일 감지 패턴 단순화 및 개선
- **오류 처리**: 파일 생성 작업에 대한 더 나은 오류 처리
- **디버그 로깅**: 파일 생성 문제 해결을 위한 향상된 로깅 시스템
- **코드 안정성**: 파일 생성 시스템의 전반적인 안정성 개선

</details>

## Version 2.5.3 (2025/08/19) - 대화형 명령어 처리

<details>
<summary>대화형 명령어 처리</summary>

- **대화형 명령어 감지**: npm create, git clone, SSH, Docker 등 대화형 명령어 자동 감지
- **자동 응답 시스템**: 일반적인 대화형 시나리오에 대한 기본 응답 제공
- **명령어 시퀀스 실행**: 적절한 타이밍으로 여러 명령어를 순차적으로 처리
- **기본 응답 지원**: 
  - npm create 명령어: 기본 응답 'y' (yes)
  - git clone: Enter 키만 누름
  - SSH 연결: 호스트 키 확인을 위한 'yes'
  - Docker 대화형 명령어: 컨테이너에서 빠져나오기 위한 'exit'
- **명령어 시퀀스 관리**: 명령어 시퀀스의 상태 추적 및 중단 기능
- **향상된 사용자 경험**: 대화형 명령어 실행에 대한 실시간 알림

</details>

<details>
<summary>기술적 개선</summary>

- **새로 추가된 함수들**:
  - `isInteractiveCommand()`: 대화형 명령어 감지
  - `getDefaultResponseForCommand()`: 기본 응답 제공
  - `handleInteractiveCommand()`: 대화형 명령어 처리
  - `executeCommandSequence()`: 명령어 시퀀스 실행
  - `getCommandSequenceStatus()`: 실행 상태 추적
  - `stopCommandSequence()`: 명령어 시퀀스 중단
- **향상된 터미널 관리**: 타이밍과 응답 처리가 개선된 명령어 실행
- **더 나은 오류 처리**: 대화형 명령어에 대한 포괄적인 오류 보고

</details>

## Version 2.5.2 (2025/08/19) - 멀티모델 AI 지원 및 Ollama 통합

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
<summary>자동 Bash 명령어 실행</summary>

- **Bash 명령어 감지**: LLM 응답에서 ```bash 코드 블록을 자동으로 감지
- **터미널 통합**: 감지된 명령어를 VSCode 통합 터미널에서 실행
- **다중 명령어 지원**: 단일 응답에서 여러 명령어를 순차적으로 처리
- **대화형 명령어 처리**: npm create, git clone, SSH 연결 등 대화형 명령어 자동 응답
- **사용자 알림**: 실행된 명령어에 대한 실시간 피드백 (성공/오류 상태)
- **CodePilot 터미널**: CodePilot 명령어 실행을 위한 전용 터미널 인스턴스
- **자동 터미널 활성화**: 명령어 실행 시 터미널 자동 표시
- **오류 처리**: 명령어 실행 실패에 대한 포괄적인 오류 보고
- **시스템 프롬프트 개선**: bash 명령어 형식 예시를 포함한 AI 지시사항 업데이트

</details>

<details>
<summary>기술적 개선</summary>

- **네트워크 안정성**: 로컬 연결을 위해 fetch를 Node.js HTTP 모듈로 교체
- **웹뷰 안전성**: disposed 웹뷰 에러 방지를 위한 safePostMessage 함수 추가
- **에러 처리**: 네트워크 연결 문제에 대한 향상된 에러 처리
- **타입 안전성**: TypeScript 타입 정의 및 에러 검사 개선
- **성능**: 메시지 처리 및 웹뷰 통신 최적화
- **터미널 관리**: bash 명령어 추출 및 실행 기능을 갖춘 새로운 터미널 관리자

</details>

<details>
<summary>Ollama 설정 가이드</summary>

- **서버 설치**: curl -fsSL https://ollama.ai/install.sh | sh
- **모델 다운로드**: ollama pull gemma3:27b
- **서버 시작**: ollama serve
- **API URL**: 기본값 http://localhost:11434
- **네트워크 설정**: 로컬 네트워크 주소 지원

</details>

## Version 2.5.0 (2025/08/19) - Ollama 파일 작업 수정 및 정규식 지원 강화

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

## Version 2.4.1 (2025/08/18) - LLM 프롬프트 구조 개선 및 코드 생성/수정 요청 방식 고도화

<details>
<summary>LLM 프롬프트 및 코드 생성/수정 요청 방식 개선</summary>

- LLM(대형 언어 모델)에게 코드 생성/수정/삭제 요청 시, 엄격한 출력 형식과 규칙을 시스템 프롬프트로 명시하도록 개선
- 전체 파일 코드, 파일별 지시어(수정 파일/새 파일/삭제 파일), 작업 요약, 상세 설명을 반드시 포함하도록 프롬프트 구조 강화
- 실제 코드 컨텍스트, 사용자 요청, 프로젝트 구조 정보가 함께 전달되어 AI의 작업 신뢰성 및 자동화 수준 향상
- 작업 요약(생성/수정/삭제 파일 목록)과 작업 수행 설명(동작 원리, 주요 함수/클래스, 개선점, 테스트 방법 등) 출력이 필수화됨
- 프롬프트 예시 및 규칙이 시스템 프롬프트에 명확히 포함되어, 일관된 응답 형식 보장
- geminiService.ts의 프롬프트 생성 로직을 직접 수정 및 고도화함(사용자 커스텀 반영)

</details>

## Version 2.4.0 (2025/06/26) - AI 응답 구조 및 UX 개선

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

## Version 2.3b (2025/6/15) - 실시간 정보 기능 추가

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

## Version 2.2b (2025/06/10) - API 호환성 수정

<details>
<summary>AI</summary>

- Gemini API의 미지원 webSearch 도구 관련 오류 수정
- API 호환성 문제로 웹 검색 기능 임시 제거
- ASK 탭이 웹 검색 없이도 동작하도록 개선
- API 호출 에러 처리 개선

</details>

## Version 2.1b (2025/06/5) - 파일 선택 & 컨텍스트

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

## Version 2.0.0 - UI 전면 개편

<details>
<summary>주요 변경점</summary>

- 현대적 UI로 전면 개편
- CODE/ASK 탭이 있는 전용 뷰 컨테이너 추가
- 지속적 파일 선택 기능 구현
- 복사 기능이 있는 코드 블록 표시 강화
- 실시간 정보 기능 추가

</details>

## Version 1.4.0 - 이미지 지원 & 파일 선택기

<details>
<summary>기능</summary>

- 코드 분석을 위한 이미지 지원 추가
- 파일 선택기 기능 구현
- 맥락 관리 강화

</details>

## Version 1.3.0 - 채팅 인터페이스 개선

<details>
<summary>개선 사항</summary>

- 코드 블록 표시 개선
- 파일 작업 추적 기능 추가
- 에러 처리 개선

</details>

## Version 1.2.0 - 프로젝트 범위 기능

<details>
<summary>기능</summary>

- 프로젝트 범위 코드 감시 추가
- 자동 디버그 기능 구현
- 다양한 UI 이슈 수정

</details>

## Version 1.1.0 - LLM 지원 강화

<details>
<summary>강화 사항</summary>

- 커스텀 LLM 모델 지원 추가
- 코드 생성 정확도 향상
- 자연어 처리 강화

</details>

## Version 1.0.0 - 최초 릴리즈

<details>
<summary>초기 기능</summary>

CodePilot의 최초 릴리즈

</details>

---

## 지원

추가 정보나 지원이 필요하시면 문의해 주세요: tony@banya.ai

[![GitHub Sponsors](https://img.shields.io/badge/GitHub%20Sponsors-%E2%9D%A4%EF%B8%8F-red?style=for-the-badge&logo=github)](https://github.com/sponsors/tonythefreedom)

[![Ko-fi](https://img.shields.io/badge/Ko--fi-%E2%98%95%EF%B8%8F-purple?style=for-the-badge&logo=ko-fi)](https://ko-fi.com/lizsong)
