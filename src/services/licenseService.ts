import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyAP-mrOZzWwW9LYXoOsyoJH4i-yJtVZlA0",
  authDomain: "my-react-app-878e3.firebaseapp.com",
  projectId: "my-react-app-878e3",
  storageBucket: "my-react-app-878e3.firebasestorage.app",
  messagingSenderId: "102788218249",
  appId: "1:102788218249:web:c29c248cbcc8565bb4b558",
  measurementId: "G-NHJ8YXZ6W6"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export interface LicenseData {
  id: number;
  serialNumber: string;
  createdAt: Date;
  isActive: boolean;
}

export class LicenseService {
  /**
   * 입력된 시리얼 번호가 ID 0번의 라이센스와 일치하는지 검증
   * @param serialNumber 검증할 시리얼 번호
   * @returns 검증 결과 (성공/실패)
   */
  public async verifyLicense(serialNumber: string): Promise<{ success: boolean; message: string }> {
    try {
      // 입력된 시리얼 번호 정리 (공백 제거, 대문자 변환)
      const cleanedSerialNumber = serialNumber.trim().toUpperCase();
      
      if (!cleanedSerialNumber) {
        return {
          success: false,
          message: '시리얼 번호를 입력해주세요.'
        };
      }

      // Firestore에서 ID 0번 라이센스 데이터 조회
      const licenseDocRef = doc(db, 'licenses', '0');
      const licenseDoc = await getDoc(licenseDocRef);

      if (!licenseDoc.exists()) {
        return {
          success: false,
          message: '라이센스 데이터를 찾을 수 없습니다.'
        };
      }

      const licenseData = licenseDoc.data() as LicenseData;
      
      // 라이센스가 비활성화된 경우
      if (!licenseData.isActive) {
        return {
          success: false,
          message: '비활성화된 라이센스입니다.'
        };
      }

      // 시리얼 번호 비교
      if (licenseData.serialNumber === cleanedSerialNumber) {
        return {
          success: true,
          message: '라이센스 검증이 성공했습니다.'
        };
      } else {
        return {
          success: false,
          message: '잘못된 시리얼 번호입니다.'
        };
      }

    } catch (error) {
      console.error('라이센스 검증 중 오류 발생:', error);
      return {
        success: false,
        message: '라이센스 검증 중 오류가 발생했습니다. 네트워크 연결을 확인해주세요.'
      };
    }
  }

  /**
   * ID 0번 라이센스 정보 조회 (디버깅용)
   * @returns 라이센스 데이터
   */
  public async getLicenseInfo(): Promise<LicenseData | null> {
    try {
      const licenseDocRef = doc(db, 'licenses', '0');
      const licenseDoc = await getDoc(licenseDocRef);

      if (!licenseDoc.exists()) {
        return null;
      }

      return licenseDoc.data() as LicenseData;
    } catch (error) {
      console.error('라이센스 정보 조회 중 오류 발생:', error);
      return null;
    }
  }
}
