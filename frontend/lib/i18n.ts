/**
 * Simple i18n system without external dependencies
 * Supports Korean (KO) and English (EN)
 */

export type Language = 'ko' | 'en';

const translations = {
  ko: {
    // Navigation
    nav: {
      home: '홈',
      pricing: '요금제',
      history: '히스토리',
      ocrService: 'IO-N;LINGO OCR',
    },
    // Landing Page
    landing: {
      title: '아이오엔;링고 오씨알',
      subtitle: '이미지와 PDF에서 특정 영역의 텍스트를 정확하게 추출하세요',
      dragDrop: '파일을 드래그하거나 클릭하여 업로드',
      uploadButton: '파일 선택',
      supportedFormats: '지원 형식: 이미지 (JPG, PNG), PDF',
      features: {
        multiRegion: {
          title: '다중 영역 선택',
          description: '하나의 파일에서 여러 영역을 선택하여 동시에 OCR 수행',
        },
        pdfSupport: {
          title: 'PDF, HWP, HWPX, PPT 지원',
          description: 'PDF, HWP, HWPX, PPT의 모든 페이지에서 동일한 영역 또는 페이지별 다른 영역 추출',
        },
        customPrompts: {
          title: '커스텀 프롬프트',
          description: 'OCR 정확도를 높이기 위한 사용자 정의 프롬프트 지원',
        },
      },
      roiCalculator: {
        title: '시간 절약 계산기',
        description: '추출된 항목 수 × 2분 / 60',
        itemsLabel: '추출된 항목 수',
        timeSaved: '절약된 시간',
        minutes: '분',
      },
      statistics: {
        title: '최근 절약 현황',
        records: '기록',
        saved: '절약',
        won: '원',
      },
      calculator: {
        title: '예상시간절약 계산기',
        pages: '예상 페이지 수',
        areas: '영역 개수',
        keyValuePairs: '대략적인 Key:Value 건수',
        timeSaved: '예상 절약 시간',
        moneySaved: '예상 절약 금액',
        minutes: '분',
        formula: '계산식: 페이지 수 × 영역 개수 × Key:Value 건수 × 1분 (시간당 급여 기준)',
      },
      caseStudies: {
        title: '사용자 이용 사례',
        subtitle: '실제 사용자들이 IO-VISION OCR로 달성한 성과',
        cases: {
          case1: {
            title: '법무 문서 처리 자동화',
            company: '법무법인 A',
            description: '계약서와 증빙서류에서 핵심 정보를 자동으로 추출하여 문서 검토 시간을 80% 단축했습니다.',
            metrics: '월 500건 처리, 시간 절약 40시간',
          },
          case2: {
            title: '회계 장부 데이터 입력',
            company: '중소기업 B',
            description: '세금계산서와 영수증의 금액, 날짜, 거래처 정보를 자동 추출하여 회계 업무 효율을 크게 향상시켰습니다.',
            metrics: '월 1,200건 처리, 인력 절감 2명',
          },
          case3: {
            title: '의료 기록 디지털화',
            company: '병원 C',
            description: '종이 차트를 스캔하여 환자 정보와 진단 내용을 자동으로 추출하여 전자의무기록 시스템 구축에 활용했습니다.',
            metrics: '월 3,000건 처리, 디지털화 완료',
          },
        },
      },
    },
    // Workspace
    workspace: {
      leftSidebar: {
        title: '페이지',
        thumbnail: '페이지',
      },
      centerCanvas: {
        selectArea: '드래그하여 크롭할 영역을 선택하세요',
        pdfNote: 'PDF: 모든 페이지에서 동일한 영역이 추출됩니다',
      },
      rightInspector: {
        prompt: {
          title: '커스텀 프롬프트',
          toggle: '프롬프트 표시/숨기기',
          placeholder: '프롬프트를 입력하세요...',
          save: '저장',
          cancel: '취소',
          savedPrompts: '저장된 프롬프트',
          load: '불러오기',
          delete: '삭제',
          saveDialog: '프롬프트를 저장하시겠습니까?',
          promptName: '프롬프트 이름 (선택사항)',
        },
        results: {
          title: 'OCR 결과',
          rawText: '원본 텍스트',
          structured: '구조화된 데이터',
          noResults: '아직 결과가 없습니다. OCR을 실행해주세요.',
          timeSaved: '절약된 시간',
          moneySaved: '절약된 금액',
          minutes: '분',
          won: '원',
          calculationNote: '계산: 영역 수 × 페이지 수 × 1분 × 시급 10,320원',
        },
        actions: {
          runOCR: 'OCR 실행',
          saveResult: '결과 저장',
          processing: '처리 중...',
          progress: '진행 상황',
        },
      },
      pageNavigation: {
        previous: '이전',
        next: '다음',
        current: '페이지',
        of: '/',
        ocrInProgress: '(OCR 진행 중...)',
      },
    },
    // Crop Area Management
    crop: {
      add: '영역 추가',
      update: '영역 업데이트',
      delete: '영역 삭제',
      cancel: '취소',
      cropComplete: '영역 크롭 완료',
      addQuestion: '추가하시겠습니까?',
      updateQuestion: '업데이트하시겠습니까?',
      areaSize: '크롭 영역',
      selectedAreas: '선택된 영역',
      currentPageAreas: '페이지 영역',
      totalAreas: '전체',
      areas: '개',
      noAreas: '추가된 영역이 없습니다. 드래그하여 영역을 선택하세요.',
      deleteAll: '전체 삭제',
      edit: '편집',
    },
    // File Upload
    upload: {
      title: '파일 업로드 (이미지 또는 PDF)',
      processing: '파일 처리 중...',
      progress: '진행률',
      error: '파일 읽기 중 오류가 발생했습니다.',
      unsupportedFormat: '지원하지 않는 파일 형식입니다. 이미지(jpg, png) 또는 PDF 파일을 업로드해주세요.',
      processingError: '파일 처리 중 오류가 발생했습니다.',
    },
    // OCR Results
    ocr: {
      extractedText: '추출된 텍스트',
      croppedPreview: '크롭된 영역 미리보기',
      noText: '(빈 텍스트)',
      region: '영역',
      page: '페이지',
    },
    // Common
    common: {
      reset: '초기화',
      save: '저장',
      cancel: '취소',
      delete: '삭제',
      edit: '수정',
      close: '닫기',
      loading: '로딩 중...',
      error: '오류',
      success: '성공',
    },
    // Auth
    auth: {
      login: {
        title: '로그인',
        noAccount: '계정이 없으신가요?',
        signUpLink: '계정 만들기',
        button: '로그인',
        forgotPassword: '비밀번호를 잊으셨나요?',
      },
      signUp: {
        title: '계정 만들기',
        haveAccount: '이미 계정이 있으신가요?',
        loginLink: '로그인',
        button: '회원가입',
      },
      social: {
        google: 'Google로 계속하기',
        facebook: 'Facebook으로 계속하기',
        microsoft: 'Microsoft로 계속하기',
      },
      separator: '또는',
      email: '이메일',
      password: '비밀번호',
      logout: '로그아웃',
    },
    // Errors
    errors: {
      noImage: '이미지를 선택해주세요.',
      noCropArea: '최소 하나의 크롭 영역을 추가해주세요.',
      ocrFailed: 'OCR 처리에 실패했습니다.',
      processingError: 'OCR 처리 중 오류가 발생했습니다.',
    },
    // Pricing
    pricing: {
      title: '요금제',
      subtitle: '당신의 필요에 맞는 플랜을 선택하세요',
      mostPopular: '인기',
      plans: {
        free: {
          name: 'Free',
          subtitle: '체험판',
          target: '직접 영역을 지정해서 추출하세요. (수동, 불편함, 하지만 정확함)',
          price: '₩0',
          period: '/ 월',
          button: '무료로 시작하기',
          features: {
            limit: '1일 1건 제한',
            pages: '문서당 3페이지',
            areas: '페이지당 1개',
            extraction: '기본 Key:Value',
            storage: '24시간 후 삭제',
            speed: 'Standard',
          },
        },
        payPerUse: {
          name: 'Pay-per-Use',
          subtitle: '1건당 결제',
          target: '직접 영역을 지정해서 추출하세요. (수동, 불편함, 하지만 정확함)',
          price: '₩500',
          period: '/ 건',
          button: '결제하기',
          features: {
            limit: '1건당 결제',
            pages: '문서당 10페이지',
            areas: '페이지당 5개',
            extraction: '기본 Key:Value',
            storage: '7일 보관',
            speed: 'Standard',
          },
        },
        pro: {
          name: 'Pro',
          subtitle: '구독형',
          target: '업로드만 하세요. AI가 알아서 영역을 찾고 값을 뽑아줍니다. (자동, 편리함, 고해상도 지원)',
          price: '₩29,000',
          period: '/ 월',
          button: '무료 체험 시작',
          features: {
            limit: '월 300건 (Credits)',
            pages: '문서당 50페이지',
            areas: '페이지당 무제한',
            extraction: '고급 프롬프트 지원',
            storage: '1년 보관',
            speed: 'Fast (GPU 우선 할당)',
          },
        },
        flex: {
          name: 'Flex',
          subtitle: '충전형/종량제',
          target: '간헐적 사용자',
          price: '₩50,000',
          period: '/ 500 Credits',
          validity: '유효기간 1년',
          button: '충전하기',
          features: {
            limit: '제한 없음',
            pages: '제한 없음',
            areas: '페이지당 무제한',
            extraction: '고급 프롬프트 지원',
            storage: '1년 보관',
            speed: 'Fast',
          },
        },
        enterprise: {
          name: 'Enterprise',
          subtitle: '솔루션',
          target: '기업, 관공서, 대량 처리',
          price: '별도 문의',
          button: '영업팀 문의',
          features: {
            limit: '무제한 / 설치형',
            pages: '제한 없음',
            areas: '무제한',
            extraction: 'Custom 모델 튜닝',
            storage: '영구 보관 (자사 서버)',
            speed: 'Dedicated (전용)',
          },
        },
      },
      features: {
        limit: '제공량',
        pages: '페이지 제한',
        areas: '영역(Crop)',
        extraction: '추출 항목',
        storage: '저장',
        speed: '속도',
      },
      usageGuide: {
        title: '무료/유료 플랜',
        freePlan: {
          title: '무료 플랜',
          description: '월 1회 무료 OCR 처리 1건이 제공됩니다.',
          note: '무료 플랜을 사용한 OCR은 기본 Key:Value 추출만 가능합니다.',
        },
        paidPlan: {
          title: '유료 플랜',
          description: 'Pay-per-Use: 1건당 ₩500, Pro: 월 ₩29,000, Flex: ₩50,000 / 500 Credits',
          note: '유료 플랜을 사용한 OCR은 고급 프롬프트 지원 및 상세한 추출 결과를 확인할 수 있습니다.',
        },
        deductionCriteria: {
          title: 'Credits 차감 기준',
          item1: 'OCR 처리 1건당 Credits 1개가 차감됩니다.',
          item2: '결제한 Credits는 결제 당일부터 1년 동안 사용할 수 있으며 사용 기간이 지나면 자동으로 소멸합니다.',
          item3: '처리 실패한 문서는 Credits에서 차감되지 않습니다.',
        },
        refundPolicy: {
          title: '환불규정',
          item1: 'Credits 미사용 시 결제일로부터 7일 이내에 청약을 철회할 수 있습니다.',
          item2: '이미 서비스를 사용한 경우, 선결제 금액 중 사용 횟수에 해당하는 이용금액을 차감하고 환불합니다.',
          item3: '결제 관련 문의 사항은 고객센터로 문의 바랍니다.',
        },
      },
    },
  },
  en: {
    // Navigation
    nav: {
      home: 'Home',
      pricing: 'Pricing',
      history: 'History',
      ocrService: 'IO-N;LINGO OCR',
    },
    // Landing Page
    landing: {
      title: 'IO-N;LINGO OCR',
      subtitle: 'Extract text from specific regions in images and PDFs with precision',
      dragDrop: 'Drag and drop files or click to upload',
      uploadButton: 'Select File',
      supportedFormats: 'Supported formats: Images (JPG, PNG), PDF',
      features: {
        multiRegion: {
          title: 'Multi-Region Selection',
          description: 'Select multiple regions from a single file and perform OCR simultaneously',
        },
        pdfSupport: {
          title: 'PDF, HWP, HWPX, PPT Support',
          description: 'Extract the same or different regions from all pages of PDF, HWP, HWPX, PPT',
        },
        customPrompts: {
          title: 'Custom Prompts',
          description: 'User-defined prompts to improve OCR accuracy',
        },
      },
      roiCalculator: {
        title: 'Time Savings Calculator',
        description: 'Extracted Items × 2 min / 60',
        itemsLabel: 'Number of Extracted Items',
        timeSaved: 'Time Saved',
        minutes: 'minutes',
      },
      statistics: {
        title: 'Recent Savings',
        records: 'Records',
        saved: 'Saved',
        won: 'KRW',
      },
      calculator: {
        title: 'Time Savings Calculator',
        pages: 'Expected Pages',
        areas: 'Number of Areas',
        keyValuePairs: 'Approximate Key:Value Pairs',
        timeSaved: 'Estimated Time Saved',
        moneySaved: 'Estimated Money Saved',
        minutes: 'minutes',
        formula: 'Formula: Pages × Areas × Key:Value Pairs × 1 min (Hourly Wage Basis)',
      },
      caseStudies: {
        title: 'User Case Studies',
        subtitle: 'Success stories from real users of IO-VISION OCR',
        cases: {
          case1: {
            title: 'Legal Document Processing Automation',
            company: 'Law Firm A',
            description: 'Automatically extracted key information from contracts and supporting documents, reducing document review time by 80%.',
            metrics: '500 documents/month, 40 hours saved',
          },
          case2: {
            title: 'Accounting Book Data Entry',
            company: 'SME B',
            description: 'Automatically extracted amounts, dates, and vendor information from invoices and receipts, significantly improving accounting efficiency.',
            metrics: '1,200 documents/month, 2 staff reduced',
          },
          case3: {
            title: 'Medical Records Digitization',
            company: 'Hospital C',
            description: 'Scanned paper charts and automatically extracted patient information and diagnosis details for EMR system construction.',
            metrics: '3,000 documents/month, digitization completed',
          },
        },
      },
    },
    // Workspace
    workspace: {
      leftSidebar: {
        title: 'Pages',
        thumbnail: 'Page',
      },
      centerCanvas: {
        selectArea: 'Drag to select the area to crop',
        pdfNote: 'PDF: The same area will be extracted from all pages',
      },
      rightInspector: {
        prompt: {
          title: 'Custom Prompt',
          toggle: 'Show/Hide Prompt',
          placeholder: 'Enter your prompt...',
          save: 'Save',
          cancel: 'Cancel',
          savedPrompts: 'Saved Prompts',
          load: 'Load',
          delete: 'Delete',
          saveDialog: 'Save this prompt?',
          promptName: 'Prompt Name (Optional)',
        },
        results: {
          title: 'OCR Results',
          rawText: 'Raw Text',
          structured: 'Structured Data',
          noResults: 'No results yet. Please run OCR.',
          timeSaved: 'Time Saved',
          moneySaved: 'Money Saved',
          minutes: 'minutes',
          won: 'KRW',
          calculationNote: 'Calculation: Areas × Pages × 1 min × Minimum Wage 10,320 KRW/hour',
        },
        actions: {
          runOCR: 'Run OCR',
          saveResult: 'Save Result',
          processing: 'Processing...',
          progress: 'Progress',
        },
      },
      pageNavigation: {
        previous: 'Previous',
        next: 'Next',
        current: 'Page',
        of: '/',
        ocrInProgress: '(OCR in progress...)',
      },
    },
    // Crop Area Management
    crop: {
      add: 'Add Area',
      update: 'Update Area',
      delete: 'Delete Area',
      cancel: 'Cancel',
      cropComplete: 'Crop Area Complete',
      addQuestion: 'Add this area?',
      updateQuestion: 'Update this area?',
      areaSize: 'Crop Area',
      selectedAreas: 'Selected Areas',
      currentPageAreas: 'Page Areas',
      totalAreas: 'Total',
      areas: 'areas',
      noAreas: 'No areas added. Drag to select an area.',
      deleteAll: 'Delete All',
      edit: 'Edit',
    },
    // File Upload
    upload: {
      title: 'File Upload (Image or PDF)',
      processing: 'Processing file...',
      progress: 'Progress',
      error: 'An error occurred while reading the file.',
      unsupportedFormat: 'Unsupported file format. Please upload an image (jpg, png) or PDF file.',
      processingError: 'An error occurred while processing the file.',
    },
    // OCR Results
    ocr: {
      extractedText: 'Extracted Text',
      croppedPreview: 'Cropped Area Preview',
      noText: '(empty text)',
      region: 'Region',
      page: 'Page',
    },
    // Common
    common: {
      reset: 'Reset',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      close: 'Close',
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
    },
    // Auth
    auth: {
      login: {
        title: 'Log in',
        noAccount: "Don't have an account?",
        signUpLink: 'Create account',
        button: 'Log in',
        forgotPassword: 'Forgot your password?',
      },
      signUp: {
        title: 'Create account',
        haveAccount: 'Already have an account?',
        loginLink: 'Log in',
        button: 'Sign up',
      },
      social: {
        google: 'Continue with Google',
        facebook: 'Continue with Facebook',
        microsoft: 'Continue with Microsoft',
      },
      separator: 'Or',
      email: 'Email',
      password: 'Password',
      logout: 'Log out',
    },
    // Errors
    errors: {
      noImage: 'Please select an image.',
      noCropArea: 'Please add at least one crop area.',
      ocrFailed: 'OCR processing failed.',
      processingError: 'An error occurred during OCR processing.',
    },
    // Pricing
    pricing: {
      title: 'Pricing',
      subtitle: 'Choose the plan that fits your needs',
      mostPopular: 'Most Popular',
      plans: {
        free: {
          name: 'Free',
          subtitle: 'Trial',
          target: 'Manually specify areas to extract. (Manual, Inconvenient, but Accurate)',
          price: '₩0',
          period: '/ month',
          button: 'Get Started',
          features: {
            limit: '1 per day limit',
            pages: '3 pages per document',
            areas: '1 per page',
            extraction: 'Basic Key:Value',
            storage: 'Deleted after 24 hours',
            speed: 'Standard',
          },
        },
        payPerUse: {
          name: 'Pay-per-Use',
          subtitle: 'Pay per use',
          target: 'Manually specify areas to extract. (Manual, Inconvenient, but Accurate)',
          price: '₩500',
          period: '/ use',
          button: 'Purchase',
          features: {
            limit: 'Pay per use',
            pages: '10 pages per document',
            areas: '5 per page',
            extraction: 'Basic Key:Value',
            storage: '7 days storage',
            speed: 'Standard',
          },
        },
        pro: {
          name: 'Pro',
          subtitle: 'Subscription',
          target: 'Just upload. AI automatically finds areas and extracts values. (Automatic, Convenient, High Resolution Support)',
          price: '₩29,000',
          period: '/ month',
          button: 'Start Free Trial',
          features: {
            limit: '300 per month (Credits)',
            pages: '50 pages per document',
            areas: 'Unlimited per page',
            extraction: 'Advanced prompt support',
            storage: '1 year storage',
            speed: 'Fast (GPU priority)',
          },
        },
        flex: {
          name: 'Flex',
          subtitle: 'Pay-as-you-go',
          target: 'Occasional Users',
          price: '₩50,000',
          period: '/ 500 Credits',
          validity: 'Valid for 1 year',
          button: 'Purchase Credits',
          features: {
            limit: 'No limit',
            pages: 'No limit',
            areas: 'Unlimited per page',
            extraction: 'Advanced prompt support',
            storage: '1 year storage',
            speed: 'Fast',
          },
        },
        enterprise: {
          name: 'Enterprise',
          subtitle: 'Solution',
          target: 'Enterprise, Government, Bulk Processing',
          price: 'Custom',
          button: 'Contact Sales',
          features: {
            limit: 'Unlimited / On-premise',
            pages: 'No limit',
            areas: 'Unlimited',
            extraction: 'Custom model tuning',
            storage: 'Permanent storage (own server)',
            speed: 'Dedicated',
          },
        },
      },
      features: {
        limit: 'Quota',
        pages: 'Page Limit',
        areas: 'Areas (Crop)',
        extraction: 'Extraction',
        storage: 'Storage',
        speed: 'Speed',
      },
      usageGuide: {
        title: 'Free/Paid Plans',
        freePlan: {
          title: 'Free Plan',
          description: '1 free OCR processing per month is provided.',
          note: 'OCR using the free plan only supports basic Key:Value extraction.',
        },
        paidPlan: {
          title: 'Paid Plans',
          description: 'Pay-per-Use: ₩500 per use, Pro: ₩29,000/month, Flex: ₩50,000 / 500 Credits',
          note: 'OCR using paid plans supports advanced prompts and detailed extraction results.',
        },
        deductionCriteria: {
          title: 'Credit Deduction Criteria',
          item1: '1 Credit is deducted per OCR processing.',
          item2: 'Purchased Credits can be used for 1 year from the payment date and will automatically expire after the usage period.',
          item3: 'Failed processing does not deduct Credits.',
        },
        refundPolicy: {
          title: 'Refund Policy',
          item1: 'Unused Credits can be refunded within 7 days from the payment date.',
          item2: 'If the service has already been used, the refund will be calculated by deducting the amount corresponding to the number of uses from the prepaid amount.',
          item3: 'For payment inquiries, please contact customer service.',
        },
      },
    },
  },
} as const;

// Language context type
export type TranslationKey = keyof typeof translations.ko;

// Get translation function
export function t(key: string, lang: Language = 'ko'): string {
  const keys = key.split('.');
  let value: any = translations[lang];
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k as keyof typeof value];
    } else {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
  }
  
  return typeof value === 'string' ? value : key;
}

// Import useState and useEffect for the hook
import { useState, useEffect, useCallback } from 'react';

// 전역 언어 상태를 저장할 변수 (모듈 레벨)
let globalLanguage: Language = 'ko';
let languageListeners: Set<() => void> = new Set();

// 언어 변경 시 모든 리스너에 알림
function notifyLanguageChange(lang: Language) {
  globalLanguage = lang;
  languageListeners.forEach(listener => listener());
}

// Language context hook (for React components)
export function useLanguage() {
  const [language, setLanguage] = useState<Language>(globalLanguage);
  const [isInitialized, setIsInitialized] = useState(false);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('language') as Language;
      if (saved && (saved === 'ko' || saved === 'en')) {
        globalLanguage = saved;
        setLanguage(saved);
      }
      setIsInitialized(true);
    }
  }, []);
  
  // 언어 변경 리스너 등록
  useEffect(() => {
    if (!isInitialized) return;
    
    const updateLanguage = () => {
      setLanguage(globalLanguage);
    };
    
    languageListeners.add(updateLanguage);
    return () => {
      languageListeners.delete(updateLanguage);
    };
  }, [isInitialized]);
  
  // localStorage 변경 감지 (다른 탭에서 변경 시)
  useEffect(() => {
    if (typeof window !== 'undefined' && isInitialized) {
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'language' && e.newValue) {
          const newLang = e.newValue as Language;
          if (newLang === 'ko' || newLang === 'en') {
            globalLanguage = newLang;
            notifyLanguageChange(newLang);
          }
        }
      };
      
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    }
  }, [isInitialized]);
  
  const changeLanguage = useCallback((lang: Language) => {
    globalLanguage = lang;
    setLanguage(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', lang);
      notifyLanguageChange(lang);
    }
  }, []);
  
  return { language, changeLanguage, t: (key: string) => t(key, language) };
}

