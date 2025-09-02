import * as crypto from 'crypto';

export class CryptoUtils {
    private static readonly ALGORITHM = 'aes-256-cbc';
    private static readonly ENCODING = 'hex';
    private static readonly SECRET_KEY = 'codepilot-banya-license-2025-secret-key-32bytes'; // 32바이트 키

    /**
     * 문자열을 암호화합니다.
     * @param text 암호화할 문자열
     * @returns 암호화된 문자열
     */
    public static encrypt(text: string): string {
        try {
            const iv = crypto.randomBytes(16);
            // 키를 SHA-256으로 해시하여 32바이트 키 생성
            const key = crypto.createHash('sha256').update(this.SECRET_KEY).digest();
            const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
            let encrypted = cipher.update(text, 'utf8', this.ENCODING);
            encrypted += cipher.final(this.ENCODING);
            return iv.toString(this.ENCODING) + ':' + encrypted;
        } catch (error) {
            console.error('암호화 중 오류 발생:', error);
            throw new Error('암호화에 실패했습니다.');
        }
    }

    /**
     * 암호화된 문자열을 복호화합니다.
     * @param encryptedText 복호화할 문자열
     * @returns 복호화된 문자열
     */
    public static decrypt(encryptedText: string): string {
        try {
            const textParts = encryptedText.split(':');
            if (textParts.length !== 2) {
                throw new Error('잘못된 암호화 형식입니다.');
            }
            const iv = Buffer.from(textParts[0], this.ENCODING);
            const encryptedData = textParts[1];
            // 키를 SHA-256으로 해시하여 32바이트 키 생성
            const key = crypto.createHash('sha256').update(this.SECRET_KEY).digest();
            const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
            let decrypted = decipher.update(encryptedData, this.ENCODING, 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch (error) {
            console.error('복호화 중 오류 발생:', error);
            throw new Error('복호화에 실패했습니다.');
        }
    }

    /**
     * 문자열이 암호화된 형식인지 확인합니다.
     * @param text 확인할 문자열
     * @returns 암호화된 형식이면 true
     */
    public static isEncrypted(text: string): boolean {
        try {
            if (!text || typeof text !== 'string') {
                return false;
            }
            const textParts = text.split(':');
            if (textParts.length !== 2) {
                return false;
            }
            // IV가 16바이트(32자 hex)인지 확인
            if (textParts[0].length !== 32) {
                return false;
            }
            // 전체 길이가 충분히 긴지 확인
            return text.length > 50;
        } catch (error) {
            return false;
        }
    }
}
