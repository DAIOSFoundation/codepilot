// @ 컨텍스트 파일 전달 디버깅 테스트
console.log('=== CodePilot Context Debug Test ===');

// 테스트 시나리오
const testScenarios = [
    {
        name: 'Test 1: @ 파일 선택 후 Ollama 사용',
        steps: [
            '1. CODE 탭에서 @ 버튼 클릭',
            '2. 테스트 파일 선택 (예: package.json)',
            '3. 선택된 파일이 태그로 표시되는지 확인',
            '4. Ollama 모델로 메시지 전송',
            '5. 개발자 도구 콘솔에서 로그 확인'
        ]
    },
    {
        name: 'Test 2: 로그 확인 포인트',
        steps: [
            '1. [LlmService] Selected files: 로그 확인',
            '2. [LlmService] Processing X selected files 로그 확인',
            '3. [LlmService] Reading file: 로그 확인',
            '4. [LlmService] File content length: 로그 확인',
            '5. [LlmService] Context includes selected files: YES 로그 확인'
        ]
    },
    {
        name: 'Test 3: 외부 Ollama 서버 설정',
        steps: [
            '1. 설정 패널 열기',
            '2. AI 모델을 Ollama로 선택',
            '3. 외부 Ollama 서버 URL 입력',
            '4. 엔드포인트를 /api/chat로 설정',
            '5. 설정 저장'
        ]
    }
];

console.log('테스트 시나리오:');
testScenarios.forEach((scenario, index) => {
    console.log(`\n${index + 1}. ${scenario.name}`);
    scenario.steps.forEach(step => console.log(`   ${step}`));
});

console.log('\n=== 디버깅 완료 후 ===');
console.log('1. VSCode 개발자 도구 콘솔에서 로그 확인');
console.log('2. 문제 발견 시 buglist.md에 추가');
console.log('3. 수정 후 재빌드 및 재설치');
