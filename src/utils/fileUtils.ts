import * as path from 'path';

/**
 * 파일 경로의 확장자에 따라 코드 언어 타입을 반환합니다.
 */
export function getFileType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case '.ts': case '.tsx': return 'typescript';
        case '.js': case '.jsx': return 'javascript';
        case '.py': return 'python';
        case '.html': return 'html';
        case '.css': return 'css';
        case '.java': return 'java';
        case '.c': return 'c';
        case '.cpp': return 'cpp';
        case '.go': return 'go';
        case '.rs': return 'rust';
        case '.md': return 'markdown';
        case '.json': return 'json';
        case '.xml': return 'xml';
        case '.yaml': case '.yml': return 'yaml';
        case '.sh': return 'shell';
        case '.rb': return 'ruby';
        case '.php': return 'php';
        default: return '';
    }
}