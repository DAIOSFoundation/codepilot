import * as vscode from 'vscode';
import * as path from 'path';
import * as glob from 'glob';
import { getFileType } from '../utils/fileUtils';
import { ConfigurationService } from '../services/configurationService';
import { NotificationService } from '../services/notificationService';

export class CodebaseContextService {
    private configurationService: ConfigurationService;
    private notificationService: NotificationService;
    private readonly MAX_TOTAL_CONTENT_LENGTH = 1000000; // LLM 컨텍스트 최대 길이 (약 250,000 토큰)
    private readonly EXCLUDED_EXTENSIONS = [
        '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp', '.ico', // Images
        '.pdf', '.zip', '.tar', '.gz', '.rar', '.7z',                     // Archives/Binary documents
        '.exe', '.dll', '.bin',                                           // Executables/Binaries
        '.sqlite', '.db',                                                 // Databases
        '.lock', '.log', '.tmp', '.temp'                                  // Lock/Log/Temp files
    ];

    constructor(configurationService: ConfigurationService, notificationService: NotificationService) {
        this.configurationService = configurationService;
        this.notificationService = notificationService;
    }

    /**
     * 사용자 질의에서 기술 키워드를 추출합니다.
     * @param userQuery 사용자의 질의어
     * @returns 기술 키워드 배열
     */
    private extractTechKeywords(userQuery: string): string[] {
        const keywords: string[] = [];
        const query = userQuery.toLowerCase();
        
        // 프레임워크/라이브러리 키워드
        const frameworks = [
            'react', 'vue', 'angular', 'svelte', 'nextjs', 'nuxt', 'gatsby',
            'express', 'koa', 'fastify', 'nestjs', 'django', 'flask', 'spring',
            'springboot', 'spring-boot', 'boot', 'maven', 'gradle',
            'typescript', 'javascript', 'python', 'java', 'csharp', 'go', 'rust',
            'nodejs', 'node', 'npm', 'yarn', 'webpack', 'vite', 'rollup',
            'tailwind', 'bootstrap', 'material', 'antd', 'chakra',
            'mongodb', 'mysql', 'postgresql', 'redis', 'elasticsearch',
            'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'firebase',
            'jest', 'mocha', 'cypress', 'playwright', 'storybook'
        ];
        
        // 한국어 기술 용어
        const koreanTechTerms = [
            '컴포넌트', '함수', '클래스', '인터페이스', '타입', '프롭스', '상태',
            '라우터', '미들웨어', '데이터베이스', 'api', '서버', '클라이언트',
            '인증', '권한', '보안', '테스트', '배포', '빌드', '환경설정',
            '컨트롤러', '서비스', '리포지토리', '엔티티', '설정', '빈', '어노테이션'
        ];
        
        // 프레임워크 키워드 매칭
        frameworks.forEach(framework => {
            if (query.includes(framework)) {
                keywords.push(framework);
            }
        });
        
        // 한국어 기술 용어 매칭
        koreanTechTerms.forEach(term => {
            if (query.includes(term)) {
                keywords.push(term);
            }
        });
        
        return keywords;
    }

    /**
     * 키워드가 관련성이 있는지 판단합니다.
     * @param keyword 검사할 키워드
     * @returns 관련성 여부
     */
    private isRelevantKeyword(keyword: string): boolean {
        // 너무 짧거나 일반적인 단어 제외
        if (keyword.length < 2) return false;
        
        const commonWords = [
            'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
            'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
            'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
            '그리고', '또는', '하지만', '그런데', '그래서', '그러나', '그리고', '그러면', '그래도',
            '이것', '저것', '그것', '여기', '저기', '거기', '언제', '어디', '왜', '어떻게'
        ];
        
        if (commonWords.includes(keyword.toLowerCase())) return false;
        
        // 기술 관련 키워드 우선
        const techIndicators = [
            'api', 'ui', 'ux', 'db', 'sql', 'html', 'css', 'js', 'ts', 'jsx', 'tsx',
            'http', 'https', 'json', 'xml', 'yaml', 'config', 'env', 'log', 'error',
            'test', 'spec', 'mock', 'util', 'helper', 'service', 'model', 'view', 'controller'
        ];
        
        return techIndicators.includes(keyword.toLowerCase()) || keyword.length >= 3;
    }

    /**
     * 프로젝트 타입을 자동으로 감지합니다.
     * @param baseRoot 프로젝트 루트 경로
     * @returns 감지된 프로젝트 타입
     */
    private detectProjectType(baseRoot: string): string {
        try {
            // package.json 확인
            const packageJsonPath = path.join(baseRoot, 'package.json');
            if (require('fs').existsSync(packageJsonPath)) {
                const packageJson = JSON.parse(require('fs').readFileSync(packageJsonPath, 'utf8'));
                const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
                
                // React 프로젝트 감지
                if (dependencies.react || dependencies['react-dom']) {
                    if (dependencies.next) return 'nextjs';
                    if (dependencies.gatsby) return 'gatsby';
                    return 'react';
                }
                
                // Vue 프로젝트 감지
                if (dependencies.vue) {
                    if (dependencies.nuxt) return 'nuxt';
                    return 'vue';
                }
                
                // Angular 프로젝트 감지
                if (dependencies['@angular/core']) return 'angular';
                
                // Svelte 프로젝트 감지
                if (dependencies.svelte) return 'svelte';
                
                // Node.js 백엔드 프로젝트 감지
                if (dependencies.express || dependencies.koa || dependencies.fastify || dependencies.nestjs) {
                    return 'nodejs-backend';
                }
                
                // Python 프로젝트 감지
                if (dependencies.django || dependencies.flask || dependencies.fastapi) {
                    return 'python-backend';
                }
                
                // Spring 프로젝트 감지 (Maven/Gradle)
                if (this.isSpringProject(packageJson, baseRoot)) {
                    return 'spring';
                }
                
                // 일반 Node.js 프로젝트
                if (dependencies.typescript || dependencies.javascript) {
                    return 'nodejs';
                }
            }
            
            // 파일 구조 기반 감지
            const files = require('fs').readdirSync(baseRoot);
            
            // Java 프로젝트
            if (files.includes('pom.xml') || files.includes('build.gradle')) return 'java';
            
            // Python 프로젝트
            if (files.includes('requirements.txt') || files.includes('setup.py') || files.includes('pyproject.toml')) {
                return 'python';
            }
            
            // Go 프로젝트
            if (files.includes('go.mod') || files.includes('go.sum')) return 'go';
            
            // Rust 프로젝트
            if (files.includes('Cargo.toml') || files.includes('Cargo.lock')) return 'rust';
            
            // C# 프로젝트
            if (files.some((f: string) => f.endsWith('.csproj') || f.endsWith('.sln'))) return 'csharp';
            
            return 'unknown';
        } catch (error) {
            console.warn('[CodebaseContextService] 프로젝트 타입 감지 중 오류:', error);
            return 'unknown';
        }
    }

    /**
     * Spring 프로젝트인지 감지합니다.
     * @param packageJson package.json 내용 (Node.js 프로젝트용)
     * @param baseRoot 프로젝트 루트 경로
     * @returns Spring 프로젝트 여부
     */
    private isSpringProject(packageJson: any, baseRoot: string): boolean {
        try {
            // 1. Maven 프로젝트 확인 (pom.xml)
            const pomPath = path.join(baseRoot, 'pom.xml');
            if (require('fs').existsSync(pomPath)) {
                const pomContent = require('fs').readFileSync(pomPath, 'utf8');
                if (pomContent.includes('spring-boot-starter') || 
                    pomContent.includes('spring-boot-parent') ||
                    pomContent.includes('org.springframework.boot')) {
                    return true;
                }
            }

            // 2. Gradle 프로젝트 확인 (build.gradle, build.gradle.kts)
            const gradlePaths = [
                path.join(baseRoot, 'build.gradle'),
                path.join(baseRoot, 'build.gradle.kts')
            ];
            
            for (const gradlePath of gradlePaths) {
                if (require('fs').existsSync(gradlePath)) {
                    const gradleContent = require('fs').readFileSync(gradlePath, 'utf8');
                    if (gradleContent.includes('spring-boot') || 
                        gradleContent.includes('org.springframework.boot') ||
                        gradleContent.includes('springframework')) {
                        return true;
                    }
                }
            }

            // 3. Spring 설정 파일 확인
            const configPaths = [
                path.join(baseRoot, 'application.properties'),
                path.join(baseRoot, 'application.yml'),
                path.join(baseRoot, 'application.yaml'),
                path.join(baseRoot, 'src/main/resources/application.properties'),
                path.join(baseRoot, 'src/main/resources/application.yml'),
                path.join(baseRoot, 'src/main/resources/application.yaml')
            ];
            
            for (const configPath of configPaths) {
                if (require('fs').existsSync(configPath)) {
                    return true;
                }
            }

            // 4. Java 어노테이션 검색 (@SpringBootApplication, @SpringBootTest)
            const javaFiles = glob.sync(path.join(baseRoot, 'src/**/*.java'), { nodir: true });
            for (const javaFile of javaFiles.slice(0, 10)) { // 최대 10개 파일만 검사
                try {
                    const content = require('fs').readFileSync(javaFile, 'utf8');
                    if (content.includes('@SpringBootApplication') || 
                        content.includes('@SpringBootTest') ||
                        content.includes('@SpringBootConfiguration')) {
                        return true;
                    }
                } catch (err) {
                    // 파일 읽기 실패 시 무시
                }
            }

            return false;
        } catch (error) {
            console.warn('[CodebaseContextService] Spring 프로젝트 감지 중 오류:', error);
            return false;
        }
    }

    /**
     * 프로젝트 타입에 따른 검색 패턴을 반환합니다.
     * @param projectType 프로젝트 타입
     * @param baseRoot 프로젝트 루트 경로
     * @returns 검색 패턴 배열
     */
    private getSearchPatternsForProjectType(projectType: string, baseRoot: string): string[] {
        const patterns: string[] = [];
        
        switch (projectType) {
            case 'react':
            case 'nextjs':
            case 'gatsby':
                patterns.push(
                    path.join(baseRoot, 'src/**/*.{ts,tsx,js,jsx}'),
                    path.join(baseRoot, 'components/**/*.{ts,tsx,js,jsx}'),
                    path.join(baseRoot, 'pages/**/*.{ts,tsx,js,jsx}'),
                    path.join(baseRoot, 'app/**/*.{ts,tsx,js,jsx}'),
                    path.join(baseRoot, 'lib/**/*.{ts,tsx,js,jsx}'),
                    path.join(baseRoot, 'utils/**/*.{ts,tsx,js,jsx}'),
                    path.join(baseRoot, 'hooks/**/*.{ts,tsx,js,jsx}'),
                    path.join(baseRoot, 'styles/**/*.{css,scss,sass,less}'),
                    path.join(baseRoot, 'public/**/*.{json,html}')
                );
                break;
                
            case 'vue':
            case 'nuxt':
                patterns.push(
                    path.join(baseRoot, 'src/**/*.{vue,ts,js}'),
                    path.join(baseRoot, 'components/**/*.{vue,ts,js}'),
                    path.join(baseRoot, 'pages/**/*.{vue,ts,js}'),
                    path.join(baseRoot, 'layouts/**/*.{vue,ts,js}'),
                    path.join(baseRoot, 'plugins/**/*.{ts,js}'),
                    path.join(baseRoot, 'middleware/**/*.{ts,js}'),
                    path.join(baseRoot, 'assets/**/*.{css,scss,sass,less}')
                );
                break;
                
            case 'angular':
                patterns.push(
                    path.join(baseRoot, 'src/**/*.{ts,html,scss,css}'),
                    path.join(baseRoot, 'e2e/**/*.{ts,js}'),
                    path.join(baseRoot, 'projects/**/*.{ts,html,scss,css}')
                );
                break;
                
            case 'nodejs':
            case 'nodejs-backend':
                patterns.push(
                    path.join(baseRoot, 'src/**/*.{ts,js}'),
                    path.join(baseRoot, 'lib/**/*.{ts,js}'),
                    path.join(baseRoot, 'routes/**/*.{ts,js}'),
                    path.join(baseRoot, 'controllers/**/*.{ts,js}'),
                    path.join(baseRoot, 'models/**/*.{ts,js}'),
                    path.join(baseRoot, 'services/**/*.{ts,js}'),
                    path.join(baseRoot, 'middleware/**/*.{ts,js}'),
                    path.join(baseRoot, 'utils/**/*.{ts,js}'),
                    path.join(baseRoot, 'config/**/*.{ts,js,json}')
                );
                break;
                
            case 'python':
            case 'python-backend':
                patterns.push(
                    path.join(baseRoot, '**/*.py'),
                    path.join(baseRoot, 'requirements.txt'),
                    path.join(baseRoot, 'setup.py'),
                    path.join(baseRoot, 'pyproject.toml')
                );
                break;
                
            case 'java':
                patterns.push(
                    path.join(baseRoot, 'src/**/*.java'),
                    path.join(baseRoot, 'src/**/*.kt'),
                    path.join(baseRoot, 'pom.xml'),
                    path.join(baseRoot, 'build.gradle')
                );
                break;
                
            case 'spring':
                patterns.push(
                    // 빌드 파일 (최우선)
                    path.join(baseRoot, 'pom.xml'),
                    path.join(baseRoot, 'build.gradle'),
                    path.join(baseRoot, 'build.gradle.kts'),
                    // Spring 설정 파일
                    path.join(baseRoot, 'src/main/resources/application.properties'),
                    path.join(baseRoot, 'src/main/resources/application.yml'),
                    path.join(baseRoot, 'src/main/resources/application.yaml'),
                    // Java/Kotlin 소스 파일
                    path.join(baseRoot, 'src/main/java/**/*.java'),
                    path.join(baseRoot, 'src/test/java/**/*.java'),
                    path.join(baseRoot, 'src/main/kotlin/**/*.kt'),
                    path.join(baseRoot, 'src/test/kotlin/**/*.kt'),
                    // 리소스 파일
                    path.join(baseRoot, 'src/main/resources/**/*.xml'),
                    path.join(baseRoot, 'src/main/resources/**/*.yml'),
                    path.join(baseRoot, 'src/main/resources/**/*.yaml'),
                    path.join(baseRoot, 'src/main/resources/**/*.properties'),
                    path.join(baseRoot, 'src/main/resources/**/*.json'),
                    path.join(baseRoot, 'src/main/resources/**/*.sql'),
                    path.join(baseRoot, 'src/main/resources/**/*.md'),
                    path.join(baseRoot, 'src/main/resources/**/*.txt'),
                    // 루트 설정 파일
                    path.join(baseRoot, 'application.properties'),
                    path.join(baseRoot, 'application.yml'),
                    path.join(baseRoot, 'application.yaml'),
                    path.join(baseRoot, 'bootstrap.properties'),
                    path.join(baseRoot, 'bootstrap.yml'),
                    path.join(baseRoot, 'bootstrap.yaml'),
                    // Spring 키워드 패턴
                    path.join(baseRoot, '**/controller/**/*'),
                    path.join(baseRoot, '**/service/**/*'),
                    path.join(baseRoot, '**/repository/**/*'),
                    path.join(baseRoot, '**/entity/**/*'),
                    path.join(baseRoot, '**/application.*')
                );
                break;
                
            case 'go':
                patterns.push(
                    path.join(baseRoot, '**/*.go'),
                    path.join(baseRoot, 'go.mod'),
                    path.join(baseRoot, 'go.sum')
                );
                break;
                
            case 'rust':
                patterns.push(
                    path.join(baseRoot, 'src/**/*.rs'),
                    path.join(baseRoot, 'Cargo.toml'),
                    path.join(baseRoot, 'Cargo.lock')
                );
                break;
                
            case 'csharp':
                patterns.push(
                    path.join(baseRoot, '**/*.cs'),
                    path.join(baseRoot, '**/*.csproj'),
                    path.join(baseRoot, '**/*.sln')
                );
                break;
                
            default:
                // 일반적인 패턴
                patterns.push(
                    path.join(baseRoot, '**/*.{ts,tsx,js,jsx,py,java,go,rs,cs,php,rb,swift,kt}'),
                    path.join(baseRoot, '**/*.{json,yml,yaml,toml,xml,html,css,scss,sass,less}')
                );
        }
        
        return patterns;
    }

    /**
     * 프로젝트 타입에 따른 무시 패턴을 반환합니다.
     * @param projectType 프로젝트 타입
     * @returns 무시 패턴 배열
     */
    private getIgnorePatternsForProjectType(projectType: string): string[] {
        const baseIgnore = [
            '**/node_modules/**',
            '**/.git/**',
            '**/dist/**',
            '**/out/**',
            '**/build/**',
            '**/coverage/**',
            '**/.cache/**',
            '**/.turbo/**'
        ];
        
        switch (projectType) {
            case 'react':
            case 'nextjs':
            case 'gatsby':
                baseIgnore.push(
                    '**/node_modules/**',
                    '**/.next/**',
                    '**/.nuxt/**',
                    '**/dist/**',
                    '**/build/**',
                    '**/out/**',
                    '**/.cache/**',
                    '**/.turbo/**',
                    '**/coverage/**',
                    '**/.nyc_output/**',
                    '**/lib-cov/**',
                    '**/bower_components/**',
                    '**/jspm_packages/**',
                    '**/web_modules/**',
                    '**/.svelte-kit/**'
                );
                break;
                
            case 'vue':
            case 'nuxt':
                baseIgnore.push(
                    '**/node_modules/**',
                    '**/.nuxt/**',
                    '**/dist/**',
                    '**/build/**',
                    '**/out/**',
                    '**/.cache/**',
                    '**/coverage/**',
                    '**/.nyc_output/**',
                    '**/lib-cov/**',
                    '**/bower_components/**',
                    '**/jspm_packages/**',
                    '**/web_modules/**'
                );
                break;
                
            case 'angular':
                baseIgnore.push(
                    '**/node_modules/**',
                    '**/dist/**',
                    '**/build/**',
                    '**/out/**',
                    '**/.angular/**',
                    '**/coverage/**',
                    '**/.nyc_output/**',
                    '**/lib-cov/**',
                    '**/bower_components/**',
                    '**/jspm_packages/**',
                    '**/web_modules/**'
                );
                break;
                
            case 'nodejs':
            case 'nodejs-backend':
                baseIgnore.push(
                    '**/node_modules/**',
                    '**/dist/**',
                    '**/build/**',
                    '**/out/**',
                    '**/coverage/**',
                    '**/.nyc_output/**',
                    '**/lib-cov/**',
                    '**/bower_components/**',
                    '**/jspm_packages/**',
                    '**/web_modules/**',
                    '**/logs/**',
                    '**/tmp/**',
                    '**/temp/**'
                );
                break;
                
            case 'python':
            case 'python-backend':
                baseIgnore.push(
                    '**/__pycache__/**',
                    '**/venv/**',
                    '**/env/**',
                    '**/.venv/**',
                    '**/env.bak/**',
                    '**/venv.bak/**',
                    '**/.pytest_cache/**',
                    '**/.coverage/**',
                    '**/htmlcov/**',
                    '**/.tox/**',
                    '**/.mypy_cache/**',
                    '**/.dmypy.json/**',
                    '**/dmypy.json/**',
                    '**/site-packages/**',
                    '**/lib64/**',
                    '**/parts/**',
                    '**/sdist/**',
                    '**/var/**',
                    '**/wheels/**',
                    '**/share/python-wheels/**',
                    '**/*.egg-info/**',
                    '**/.eggs/**',
                    '**/pip-wheel-metadata/**',
                    '**/pip-delete-this-directory.txt/**'
                );
                break;
                
            case 'java':
                baseIgnore.push(
                    '**/target/**',
                    '**/.gradle/**',
                    '**/.m2/**',
                    '**/build/**',
                    '**/out/**',
                    '**/lib/**',
                    '**/libs/**',
                    '**/external-libs/**',
                    '**/third-party/**',
                    '**/vendor/**',
                    '**/dependencies/**',
                    '**/.idea/**',
                    '**/.vscode/**',
                    '**/bin/**',
                    '**/classes/**',
                    '**/generated/**',
                    '**/generated-sources/**',
                    '**/generated-test-sources/**'
                );
                break;
                
            case 'spring':
                baseIgnore.push(
                    '**/target/**',
                    '**/.gradle/**',
                    '**/.m2/**',
                    '**/build/**',
                    '**/out/**',
                    '**/lib/**',
                    '**/libs/**',
                    '**/external-libs/**',
                    '**/third-party/**',
                    '**/vendor/**',
                    '**/dependencies/**',
                    '**/.idea/**',
                    '**/.vscode/**',
                    '**/bin/**',
                    '**/classes/**',
                    '**/generated/**',
                    '**/generated-sources/**',
                    '**/generated-test-sources/**',
                    '**/spring-boot-starter-*/**',
                    '**/spring-*/**'
                );
                break;
                
            case 'go':
                baseIgnore.push(
                    '**/vendor/**',
                    '**/Godeps/**',
                    '**/glide-cache/**',
                    '**/vendor.bak/**',
                    '**/vendor.bakup/**',
                    '**/vendor.backup/**',
                    '**/vendor.old/**',
                    '**/vendor.orig/**',
                    '**/vendor.save/**',
                    '**/vendor.tmp/**',
                    '**/vendor.temp/**',
                    '**/vendor.temporary/**',
                    '**/vendor.test/**',
                    '**/vendor.testing/**',
                    '**/vendor.tests/**',
                    '**/vendor.unit/**',
                    '**/vendor.integration/**',
                    '**/vendor.e2e/**',
                    '**/vendor.acceptance/**',
                    '**/vendor.performance/**',
                    '**/vendor.benchmark/**',
                    '**/vendor.benchmarks/**',
                    '**/vendor.profiling/**',
                    '**/vendor.profile/**',
                    '**/vendor.profiles/**',
                    '**/vendor.coverage/**',
                    '**/vendor.cover/**',
                    '**/vendor.coverprofile/**',
                    '**/vendor.coverprofiles/**',
                    '**/vendor.race/**',
                    '**/vendor.raceprofile/**',
                    '**/vendor.raceprofiles/**',
                    '**/vendor.memprofile/**',
                    '**/vendor.memprofiles/**',
                    '**/vendor.cpuprofile/**',
                    '**/vendor.cpuprofiles/**',
                    '**/vendor.blockprofile/**',
                    '**/vendor.blockprofiles/**',
                    '**/vendor.mutexprofile/**',
                    '**/vendor.mutexprofiles/**',
                    '**/vendor.trace/**',
                    '**/vendor.traces/**',
                    '**/vendor.pprof/**',
                    '**/vendor.pprofs/**',
                    '**/vendor.prof/**',
                    '**/vendor.profs/**',
                    '**/vendor.heap/**',
                    '**/vendor.heaps/**',
                    '**/vendor.goroutine/**',
                    '**/vendor.goroutines/**',
                    '**/vendor.allocs/**',
                    '**/vendor.block/**',
                    '**/vendor.blocks/**',
                    '**/vendor.cmdline/**',
                    '**/vendor.comment/**',
                    '**/vendor.comments/**',
                    '**/vendor.mutex/**',
                    '**/vendor.mutexes/**',
                    '**/vendor.threadcreate/**',
                    '**/vendor.threadcreates/**'
                );
                break;
                
            case 'rust':
                baseIgnore.push(
                    '**/target/**',
                    '**/Cargo.lock',
                    '**/vendor/**',
                    '**/vendor.bak/**',
                    '**/vendor.bakup/**',
                    '**/vendor.backup/**',
                    '**/vendor.old/**',
                    '**/vendor.orig/**',
                    '**/vendor.save/**',
                    '**/vendor.tmp/**',
                    '**/vendor.temp/**',
                    '**/vendor.temporary/**',
                    '**/vendor.test/**',
                    '**/vendor.testing/**',
                    '**/vendor.tests/**',
                    '**/vendor.unit/**',
                    '**/vendor.integration/**',
                    '**/vendor.e2e/**',
                    '**/vendor.acceptance/**',
                    '**/vendor.performance/**',
                    '**/vendor.benchmark/**',
                    '**/vendor.benchmarks/**',
                    '**/vendor.profiling/**',
                    '**/vendor.profile/**',
                    '**/vendor.profiles/**',
                    '**/vendor.coverage/**',
                    '**/vendor.cover/**',
                    '**/vendor.coverprofile/**',
                    '**/vendor.coverprofiles/**',
                    '**/vendor.race/**',
                    '**/vendor.raceprofile/**',
                    '**/vendor.raceprofiles/**',
                    '**/vendor.memprofile/**',
                    '**/vendor.memprofiles/**',
                    '**/vendor.cpuprofile/**',
                    '**/vendor.cpuprofiles/**',
                    '**/vendor.blockprofile/**',
                    '**/vendor.blockprofiles/**',
                    '**/vendor.mutexprofile/**',
                    '**/vendor.mutexprofiles/**',
                    '**/vendor.trace/**',
                    '**/vendor.traces/**',
                    '**/vendor.pprof/**',
                    '**/vendor.pprofs/**',
                    '**/vendor.prof/**',
                    '**/vendor.profs/**',
                    '**/vendor.heap/**',
                    '**/vendor.heaps/**',
                    '**/vendor.goroutine/**',
                    '**/vendor.goroutines/**',
                    '**/vendor.allocs/**',
                    '**/vendor.block/**',
                    '**/vendor.blocks/**',
                    '**/vendor.cmdline/**',
                    '**/vendor.comment/**',
                    '**/vendor.comments/**',
                    '**/vendor.mutex/**',
                    '**/vendor.mutexes/**',
                    '**/vendor.threadcreate/**',
                    '**/vendor.threadcreates/**'
                );
                break;
                
            case 'csharp':
                baseIgnore.push(
                    '**/bin/**',
                    '**/obj/**',
                    '**/packages/**',
                    '**/packages.bak/**',
                    '**/packages.bakup/**',
                    '**/packages.backup/**',
                    '**/packages.old/**',
                    '**/packages.orig/**',
                    '**/packages.save/**',
                    '**/packages.tmp/**',
                    '**/packages.temp/**',
                    '**/packages.temporary/**',
                    '**/packages.test/**',
                    '**/packages.testing/**',
                    '**/packages.tests/**',
                    '**/packages.unit/**',
                    '**/packages.integration/**',
                    '**/packages.e2e/**',
                    '**/packages.acceptance/**',
                    '**/packages.performance/**',
                    '**/packages.benchmark/**',
                    '**/packages.benchmarks/**',
                    '**/packages.profiling/**',
                    '**/packages.profile/**',
                    '**/packages.profiles/**',
                    '**/packages.coverage/**',
                    '**/packages.cover/**',
                    '**/packages.coverprofile/**',
                    '**/packages.coverprofiles/**',
                    '**/packages.race/**',
                    '**/packages.raceprofile/**',
                    '**/packages.raceprofiles/**',
                    '**/packages.memprofile/**',
                    '**/packages.memprofiles/**',
                    '**/packages.cpuprofile/**',
                    '**/packages.cpuprofiles/**',
                    '**/packages.blockprofile/**',
                    '**/packages.blockprofiles/**',
                    '**/packages.mutexprofile/**',
                    '**/packages.mutexprofiles/**',
                    '**/packages.trace/**',
                    '**/packages.traces/**',
                    '**/packages.pprof/**',
                    '**/packages.pprofs/**',
                    '**/packages.prof/**',
                    '**/packages.profs/**',
                    '**/packages.heap/**',
                    '**/packages.heaps/**',
                    '**/packages.goroutine/**',
                    '**/packages.goroutines/**',
                    '**/packages.allocs/**',
                    '**/packages.block/**',
                    '**/packages.blocks/**',
                    '**/packages.cmdline/**',
                    '**/packages.comment/**',
                    '**/packages.comments/**',
                    '**/packages.mutex/**',
                    '**/packages.mutexes/**',
                    '**/packages.threadcreate/**',
                    '**/packages.threadcreates/**'
                );
                break;
                
            default:
                // 일반적인 라이브러리 디렉토리
                baseIgnore.push(
                    '**/node_modules/**',
                    '**/bower_components/**',
                    '**/jspm_packages/**',
                    '**/web_modules/**',
                    '**/vendor/**',
                    '**/lib/**',
                    '**/libs/**',
                    '**/external-libs/**',
                    '**/third-party/**',
                    '**/dependencies/**',
                    '**/packages/**',
                    '**/site-packages/**',
                    '**/__pycache__/**',
                    '**/venv/**',
                    '**/env/**',
                    '**/.venv/**',
                    '**/target/**',
                    '**/.gradle/**',
                    '**/.m2/**',
                    '**/bin/**',
                    '**/obj/**',
                    '**/classes/**',
                    '**/generated/**',
                    '**/generated-sources/**',
                    '**/generated-test-sources/**'
                );
        }
        
        return baseIgnore.map(p => p.replace(/\\/g, '/'));
    }

    /**
     * 파일 우선순위 점수를 계산합니다.
     * @param nameScore 파일명/경로 매칭 점수
     * @param contentScore 내용 매칭 점수
     * @param relativePath 상대 경로
     * @param projectType 프로젝트 타입
     * @returns 총 우선순위 점수
     */
    private calculateFilePriorityScore(nameScore: number, contentScore: number, relativePath: string, projectType: string): number {
        let totalScore = nameScore * 3 + contentScore;
        
        // 프로젝트 타입별 파일 우선순위 가중치
        const path = relativePath.toLowerCase();
        
        switch (projectType) {
            case 'react':
            case 'nextjs':
            case 'gatsby':
                if (path.includes('component') || path.includes('components')) totalScore += 5;
                if (path.includes('page') || path.includes('pages')) totalScore += 4;
                if (path.includes('hook') || path.includes('hooks')) totalScore += 3;
                if (path.includes('util') || path.includes('utils')) totalScore += 2;
                if (path.includes('lib') || path.includes('library')) totalScore += 2;
                break;
                
            case 'vue':
            case 'nuxt':
                if (path.includes('component') || path.includes('components')) totalScore += 5;
                if (path.includes('page') || path.includes('pages')) totalScore += 4;
                if (path.includes('layout') || path.includes('layouts')) totalScore += 3;
                if (path.includes('plugin') || path.includes('plugins')) totalScore += 2;
                break;
                
            case 'nodejs':
            case 'nodejs-backend':
                if (path.includes('route') || path.includes('routes')) totalScore += 5;
                if (path.includes('controller') || path.includes('controllers')) totalScore += 4;
                if (path.includes('model') || path.includes('models')) totalScore += 4;
                if (path.includes('service') || path.includes('services')) totalScore += 3;
                if (path.includes('middleware')) totalScore += 3;
                if (path.includes('util') || path.includes('utils')) totalScore += 2;
                break;
                
            case 'python':
            case 'python-backend':
                if (path.includes('view') || path.includes('views')) totalScore += 5;
                if (path.includes('model') || path.includes('models')) totalScore += 4;
                if (path.includes('url') || path.includes('urls')) totalScore += 4;
                if (path.includes('form') || path.includes('forms')) totalScore += 3;
                if (path.includes('util') || path.includes('utils')) totalScore += 2;
                break;
                
            case 'spring':
                // 빌드 파일 최우선
                if (path.endsWith('pom.xml') || path.endsWith('build.gradle') || path.endsWith('build.gradle.kts')) {
                    totalScore += 15;
                }
                // Java 파일
                if (path.endsWith('.java')) totalScore += 10;
                // 설정 파일
                if (path.endsWith('.properties') || path.endsWith('.xml')) totalScore += 8;
                // Spring 경로
                if (path.includes('src/main/java') || path.includes('src/main/resources')) totalScore += 8;
                // 테스트 경로
                if (path.includes('src/test/java')) totalScore += 5;
                // 애플리케이션 설정
                if (path.includes('application.properties') || path.includes('application.yml') || path.includes('application.yaml')) {
                    totalScore += 12;
                }
                // Spring 아키텍처 계층
                if (path.includes('controller') || path.includes('controllers')) totalScore += 5;
                if (path.includes('service') || path.includes('services')) totalScore += 4;
                if (path.includes('repository') || path.includes('repositories')) totalScore += 4;
                if (path.includes('entity') || path.includes('entities')) totalScore += 4;
                if (path.includes('config') || path.includes('configuration')) totalScore += 3;
                if (path.includes('dto') || path.includes('model') || path.includes('models')) totalScore += 3;
                if (path.includes('util') || path.includes('utils')) totalScore += 2;
                if (path.includes('exception') || path.includes('exceptions')) totalScore += 2;
                break;
        }
        
        // 기술 키워드 점수
        const techKeywords = ['api', 'service', 'util', 'helper', 'config', 'constant', 'type', 'interface', 
                             'controller', 'repository', 'entity', 'dto', 'exception', 'component', 'bean',
                             'spring', 'boot', 'maven', 'gradle', 'application', 'resources'];
        techKeywords.forEach(keyword => {
            if (path.includes(keyword)) totalScore += 2;
        });
        
        // 테스트 파일 우선순위 낮춤
        if (path.includes('test') || path.includes('spec') || path.includes('mock')) {
            totalScore *= 0.7;
        }
        
        // 설정 파일 우선순위 조정
        if (path.includes('config') || path.includes('setting') || path.endsWith('.json') || path.endsWith('.yml') || path.endsWith('.yaml')) {
            totalScore *= 0.8;
        }
        
        return Math.round(totalScore);
    }

    /**
     * 파일의 전체 경로를 VS Code 워크스페이스 루트를 기준으로 한 상대 경로로 변환합니다.
     * 워크스페이스가 열려있지 않거나 파일이 워크스페이스 외부에 있으면 null을 반환합니다.
     * Remote SSH 환경을 고려하여 경로 처리를 개선합니다.
     * @param fullPath 파일의 전체 경로
     * @returns 워크스페이스 기준 상대 경로 (슬래시 구분) 또는 null
     */
    private getPathRelativeToWorkspace(fullPath: string): string | null {
        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
            return null; // 워크스페이스가 열려있지 않음
        }

        try {
            const workspaceRootUri = vscode.workspace.workspaceFolders[0].uri;
            const fullUri = vscode.Uri.file(fullPath);

            // Remote SSH 환경에서 경로 정규화
            const normalizedWorkspacePath = path.resolve(workspaceRootUri.fsPath);
            const normalizedFullPath = path.resolve(fullUri.fsPath);

            // 파일이 워크스페이스 폴더 내에 있는지 확인
            if (normalizedFullPath.startsWith(normalizedWorkspacePath)) {
                // path.relative는 OS에 맞는 구분자를 반환하므로, 일관성을 위해 슬래시로 변환
                return path.relative(normalizedWorkspacePath, normalizedFullPath).replace(/\\/g, '/');
            }

            // Remote SSH 환경에서 상대 경로 처리
            if (!path.isAbsolute(fullPath)) {
                const relativePath = path.relative(normalizedWorkspacePath, path.join(normalizedWorkspacePath, fullPath));
                return relativePath.replace(/\\/g, '/');
            }

            return null;
        } catch (error) {
            console.error('경로 변환 중 오류 발생:', error);
            return null;
        }
    }

    /**
     * 사용자의 질의어를 기반으로 프로젝트 루트에서 관련 파일을 자동으로 찾아 컨텍스트를 구성합니다.
     * @param userQuery 사용자의 자연어 질의
     * @param abortSignal AbortController의 Signal (취소 요청 시 사용)
     * @param conversationHistory 최근 대화 기록 (선택사항)
     */
    public async getRelevantCodebaseContextForQuery(userQuery: string, abortSignal: AbortSignal, conversationHistory?: { text: string, timestamp: number }[]): Promise<{ fileContentsContext: string, includedFilesForContext: { name: string, fullPath: string }[] }> {
        let fileContentsContext = "";
        let currentTotalContentLength = 0;
        const includedFilesForContext: { name: string, fullPath: string }[] = [];

        // 프로젝트 루트 결정 (설정값 우선, 없으면 워크스페이스 루트)
        const configuredRoot = await this.configurationService.getProjectRoot();
        const workspaceRoot = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
            ? vscode.workspace.workspaceFolders[0].uri.fsPath
            : undefined;
        const baseRoot = configuredRoot || workspaceRoot;

        if (!baseRoot) {
            return {
                fileContentsContext: "[정보] 프로젝트가 열려있지 않거나 루트를 확인할 수 없습니다.",
                includedFilesForContext
            };
        }

        // 프로젝트 타입 감지
        const projectType = this.detectProjectType(baseRoot);
        console.log(`[CodebaseContextService] 감지된 프로젝트 타입: ${projectType}`);

        // 키워드 추출 (한국어/영어/숫자, 2글자 이상, 기술 키워드 포함)
        const rawWords = (userQuery || "").toLowerCase().match(/[a-zA-Z0-9가-힣_]{2,}/g) || [];
        const keywordSet = new Set<string>(rawWords.map(w => w.trim()).filter(Boolean));
        
        // 기술 키워드 확장 (프로그래밍 관련 용어)
        const techKeywords = this.extractTechKeywords(userQuery);
        techKeywords.forEach(keyword => keywordSet.add(keyword));
        
        // 대화 기록에서 키워드 확장 (최근 3개 대화)
        if (conversationHistory && conversationHistory.length > 0) {
            const recentHistory = conversationHistory.slice(-3); // 최근 3개 대화
            recentHistory.forEach(history => {
                const historyWords = history.text.toLowerCase().match(/[a-zA-Z0-9가-힣_]{2,}/g) || [];
                historyWords.forEach(word => {
                    const trimmed = word.trim();
                    if (trimmed && this.isRelevantKeyword(trimmed)) {
                        keywordSet.add(trimmed);
                    }
                });
                
                // 대화 기록에서도 기술 키워드 추출
                const historyTechKeywords = this.extractTechKeywords(history.text);
                historyTechKeywords.forEach(keyword => keywordSet.add(keyword));
            });
        }

        // 0단계: 프로젝트 타입별 핵심 설정 파일 수집 (항상 포함)
        const configFiles: string[] = [];
        const configPatterns = this.getConfigFilePatternsForProjectType(projectType);
        
        for (const pattern of configPatterns) {
            const patternFiles = glob.sync(pattern, {
                cwd: baseRoot,
                nodir: true,
                dot: false
            }).filter((f: string) => {
                const fullPath = path.join(baseRoot, f);
                const ext = path.extname(f).toLowerCase();
                if (this.EXCLUDED_EXTENSIONS.includes(ext)) return false;
                return getFileType(fullPath) !== '';
            });
            configFiles.push(...patternFiles.map(f => path.join(baseRoot, f)));
        }
        
        console.log(`[CodebaseContextService] 프로젝트 타입별 설정 파일: ${configFiles.length}개`);
        
        // 1단계: src 디렉토리의 모든 파일 수집 (키워드 무관하게 모두 포함)
        const srcFiles: string[] = [];
        const srcPatterns = [
            'src/**/*',
            'app/**/*',
            'lib/**/*',
            'components/**/*',
            'pages/**/*',
            'views/**/*',
            'controllers/**/*',
            'services/**/*',
            'models/**/*',
            'utils/**/*',
            'helpers/**/*'
        ];
        
        for (const pattern of srcPatterns) {
            const patternFiles = glob.sync(pattern, {
                cwd: baseRoot,
                nodir: true,
                dot: false,
                ignore: this.getIgnorePatternsForProjectType(projectType)
            }).filter((f: string) => {
                const fullPath = path.join(baseRoot, f);
                const ext = path.extname(f).toLowerCase();
                if (this.EXCLUDED_EXTENSIONS.includes(ext)) return false;
                return getFileType(fullPath) !== '';
            });
            srcFiles.push(...patternFiles.map(f => path.join(baseRoot, f)));
        }
        
        // 2단계: src 외부 파일들을 키워드 기반으로 검색
        const otherFiles: string[] = [];
        const otherPatterns = this.getSearchPatternsForProjectType(projectType, baseRoot);
        
        for (const pattern of otherPatterns) {
            const patternFiles = glob.sync(pattern, {
                cwd: baseRoot,
                nodir: true,
                dot: false,
                ignore: this.getIgnorePatternsForProjectType(projectType)
            }).filter((f: string) => {
                const fullPath = path.join(baseRoot, f);
                const ext = path.extname(f).toLowerCase();
                if (this.EXCLUDED_EXTENSIONS.includes(ext)) return false;
                if (getFileType(fullPath) === '') return false;
                
                // src 디렉토리 파일은 제외 (이미 위에서 처리됨)
                const relativePath = f.replace(/\\/g, '/');
                if (relativePath.startsWith('src/') || 
                    relativePath.startsWith('app/') || 
                    relativePath.startsWith('lib/') ||
                    relativePath.startsWith('components/') ||
                    relativePath.startsWith('pages/') ||
                    relativePath.startsWith('views/') ||
                    relativePath.startsWith('controllers/') ||
                    relativePath.startsWith('services/') ||
                    relativePath.startsWith('models/') ||
                    relativePath.startsWith('utils/') ||
                    relativePath.startsWith('helpers/')) {
                    return false;
                }
                
                return true;
            });
            otherFiles.push(...patternFiles.map(f => path.join(baseRoot, f)));
        }
        
        // 중복 제거
        const uniqueConfigFiles = [...new Set(configFiles)];
        const uniqueSrcFiles = [...new Set(srcFiles)];
        const uniqueOtherFiles = [...new Set(otherFiles)];
        
        console.log(`[CodebaseContextService] 설정 파일: ${uniqueConfigFiles.length}개, src 디렉토리 파일: ${uniqueSrcFiles.length}개, 기타 파일: ${uniqueOtherFiles.length}개`);

        // 설정 파일들: 항상 포함 (최고 우선순위)
        type Candidate = { fullPath: string; relative: string; nameScore: number; isSrcFile: boolean; isConfigFile: boolean };
        const configCandidates: Candidate[] = uniqueConfigFiles.map((f: string) => {
            const relative = this.getPathRelativeToWorkspace(f) || path.relative(baseRoot, f).replace(/\\/g, '/');
            return { fullPath: f, relative, nameScore: 200, isSrcFile: false, isConfigFile: true }; // 설정 파일은 최고 점수
        });

        // src 파일들: 키워드 무관하게 모두 포함 (높은 우선순위)
        const srcCandidates: Candidate[] = uniqueSrcFiles.map((f: string) => {
            const relative = this.getPathRelativeToWorkspace(f) || path.relative(baseRoot, f).replace(/\\/g, '/');
            return { fullPath: f, relative, nameScore: 100, isSrcFile: true, isConfigFile: false }; // src 파일은 항상 높은 점수
        });

        // 기타 파일들: 키워드 기반 점수 계산
        const otherCandidates: Candidate[] = uniqueOtherFiles.map((f: string) => {
            const relative = this.getPathRelativeToWorkspace(f) || path.relative(baseRoot, f).replace(/\\/g, '/');
            const hay = relative.toLowerCase();
            let nameScore = 0;
            if (keywordSet.size === 0) {
                nameScore = 1; // 쿼리 키워드가 없을 때 기본 가중치
            } else {
                keywordSet.forEach(k => {
                    if (!k) return;
                    if (hay.includes(k)) nameScore += 1;
                });
            }
            return { fullPath: f, relative, nameScore, isSrcFile: false, isConfigFile: false };
        }).filter(c => c.nameScore > 0);

        // 모든 후보 합치기 (설정 파일 > src 파일 > 기타 파일 순서)
        const allCandidates = [...configCandidates, ...srcCandidates, ...otherCandidates];
        
        // 상위 후보 제한 (설정 파일 > src 파일 > 키워드 매칭 파일 순서)
        allCandidates.sort((a, b) => {
            if (a.isConfigFile && !b.isConfigFile) return -1;
            if (!a.isConfigFile && b.isConfigFile) return 1;
            if (a.isSrcFile && !b.isSrcFile) return -1;
            if (!a.isSrcFile && b.isSrcFile) return 1;
            return b.nameScore - a.nameScore;
        });
        
        const topByName = allCandidates.slice(0, 100); // src 파일이 많을 수 있으므로 제한 증가

        // 내용 매칭 점수 포함하여 최종 정렬 및 컨텍스트 구성
        const scored: { fullPath: string; relative: string; totalScore: number }[] = [];
        for (const c of topByName) {
            if (abortSignal.aborted) {
                this.notificationService.showWarningMessage('컨텍스트 수집이 취소되었습니다.');
                break;
            }

            try {
                const fileUri = vscode.Uri.file(c.fullPath);
                const contentBytes = await vscode.workspace.fs.readFile(fileUri);
                const content = Buffer.from(contentBytes).toString('utf8');

                // 내용 기반 점수 (간단한 키워드 등장 횟수, 상한 적용)
                let contentScore = 0;
                if (keywordSet.size > 0) {
                    const lower = content.toLowerCase();
                    keywordSet.forEach(k => {
                        if (!k) return;
                        const occurrences = lower.split(k).length - 1;
                        if (occurrences > 0) contentScore += Math.min(occurrences, 10);
                    });
                }

                // 파일 우선순위 점수 계산 (질의 관련도, 파일명 매칭, 기술 키워드 점수)
                const totalScore = this.calculateFilePriorityScore(c.nameScore, contentScore, c.relative, projectType);
                scored.push({ fullPath: c.fullPath, relative: c.relative, totalScore });

            } catch (err) {
                console.warn(`[CodebaseContextService] 파일 점수 계산 중 오류: ${c.fullPath}`, err);
            }
        }

        scored.sort((a, b) => b.totalScore - a.totalScore);

        for (const s of scored) {
            if (abortSignal.aborted) {
                this.notificationService.showWarningMessage('컨텍스트 수집이 취소되었습니다.');
                break;
            }
            if (currentTotalContentLength >= this.MAX_TOTAL_CONTENT_LENGTH) {
                fileContentsContext += "\n[INFO] 컨텍스트 길이 제한으로 일부 파일 내용이 생략되었습니다.\n";
                break;
            }
            try {
                const fileUri = vscode.Uri.file(s.fullPath);
                        const contentBytes = await vscode.workspace.fs.readFile(fileUri);
                        const content = Buffer.from(contentBytes).toString('utf8');

                const lang = getFileType(s.fullPath);
                        if (currentTotalContentLength + content.length <= this.MAX_TOTAL_CONTENT_LENGTH) {
                    fileContentsContext += `파일명: ${s.relative}\n코드:\n\`\`\`${lang}\n${content}\n\`\`\`\n\n`;
                            currentTotalContentLength += content.length;
                    includedFilesForContext.push({ name: s.relative, fullPath: s.fullPath });
                        } else {
                    fileContentsContext += `파일명: ${s.relative}\n코드:\n[INFO] 파일 내용이 너무 길어 생략되었습니다.\n\n`;
                }
            } catch (err: any) {
                console.error(`Error reading file ${s.fullPath}:`, err);
                fileContentsContext += `[오류] 파일 '${s.relative}' 읽기 중 문제 발생: ${err.message}\n\n`;
            }
        }

        if (includedFilesForContext.length === 0) {
            fileContentsContext += "[정보] 질의어와 관련된 파일을 찾지 못했습니다. 보다 구체적인 파일명이나 기능명을 포함해 보세요.\n";
        }

        return { fileContentsContext, includedFilesForContext };
    }

    /**
     * (호환용) 이전 API를 호출하는 코드가 있을 수 있어, 자동 관련 파일 검색으로 위임합니다.
     */
    public async getProjectCodebaseContext(abortSignal: AbortSignal): Promise<{ fileContentsContext: string, includedFilesForContext: { name: string, fullPath: string }[] }> {
        return this.getRelevantCodebaseContextForQuery('', abortSignal);
    }

    /**
     * 프로젝트 타입별 핵심 설정 파일 패턴을 반환합니다.
     */
    private getConfigFilePatternsForProjectType(projectType: string): string[] {
        switch (projectType) {
            case 'nodejs':
            case 'react':
            case 'vue':
            case 'angular':
                return [
                    'package.json',
                    'package-lock.json',
                    'yarn.lock',
                    'pnpm-lock.yaml',
                    'tsconfig.json',
                    'webpack.config.js',
                    'webpack.config.ts',
                    'vite.config.js',
                    'vite.config.ts',
                    'next.config.js',
                    'next.config.ts',
                    'nuxt.config.js',
                    'nuxt.config.ts',
                    'angular.json',
                    'vue.config.js',
                    '.eslintrc.js',
                    '.eslintrc.json',
                    '.prettierrc',
                    '.prettierrc.js',
                    '.prettierrc.json',
                    'tailwind.config.js',
                    'tailwind.config.ts'
                ];
            
            case 'spring':
                return [
                    'pom.xml',
                    'build.gradle',
                    'build.gradle.kts',
                    'gradle.properties',
                    'gradle-wrapper.properties',
                    'application.properties',
                    'application.yml',
                    'application.yaml',
                    'bootstrap.properties',
                    'bootstrap.yml',
                    'bootstrap.yaml',
                    'logback.xml',
                    'logback-spring.xml'
                ];
            
            case 'python':
                return [
                    'requirements.txt',
                    'pyproject.toml',
                    'setup.py',
                    'setup.cfg',
                    'Pipfile',
                    'Pipfile.lock',
                    'poetry.lock',
                    'environment.yml',
                    'conda.yml',
                    'Dockerfile',
                    'docker-compose.yml',
                    'docker-compose.yaml',
                    '.python-version',
                    'pyrightconfig.json',
                    'pytest.ini',
                    'tox.ini'
                ];
            
            case 'java':
                return [
                    'pom.xml',
                    'build.gradle',
                    'build.gradle.kts',
                    'gradle.properties',
                    'gradle-wrapper.properties',
                    'build.xml',
                    'ivy.xml',
                    'MANIFEST.MF'
                ];
            
            case 'go':
                return [
                    'go.mod',
                    'go.sum',
                    'Gopkg.toml',
                    'Gopkg.lock',
                    'glide.yaml',
                    'glide.lock',
                    'vendor.json',
                    'Dockerfile',
                    'docker-compose.yml',
                    'docker-compose.yaml'
                ];
            
            case 'rust':
                return [
                    'Cargo.toml',
                    'Cargo.lock',
                    'rust-toolchain',
                    'rust-toolchain.toml',
                    'Dockerfile',
                    'docker-compose.yml',
                    'docker-compose.yaml'
                ];
            
            case 'csharp':
                return [
                    '*.csproj',
                    '*.sln',
                    '*.slnf',
                    'packages.config',
                    'project.json',
                    'global.json',
                    'nuget.config',
                    'Directory.Build.props',
                    'Directory.Build.targets'
                ];
            
            default:
                // 일반적인 설정 파일들
                return [
                    'package.json',
                    'pom.xml',
                    'build.gradle',
                    'build.gradle.kts',
                    'requirements.txt',
                    'pyproject.toml',
                    'go.mod',
                    'Cargo.toml',
                    '*.csproj',
                    '*.sln',
                    'Dockerfile',
                    'docker-compose.yml',
                    'docker-compose.yaml',
                    'tsconfig.json',
                    'webpack.config.js',
                    'vite.config.js',
                    'next.config.js',
                    'nuxt.config.js',
                    'angular.json',
                    'vue.config.js'
                ];
        }
    }
}