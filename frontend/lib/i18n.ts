/**
 * Simple i18n system without external dependencies
 * Supports Korean (KO), English (EN), Japanese (JA), Chinese Simplified (ZH-CN), Spanish (ES)
 */

export type Language = 'ko' | 'en' | 'ja' | 'zh-CN' | 'es';

const translations = {
  ko: {
    // Navigation
    nav: {
      home: '홈',
      pricing: '요금제',
      history: '히스토리',
      ocrService: 'IO-N;LINGO OCR',
    },
    // Billing / Credits
    billing: {
      title: '크레딧 / 이용내역',
      tooltip: '크레딧/이용내역',
      refresh: '새로고침',
      currentCredits: '현재 크레딧',
      plan: '플랜',
      deductionCriteria: '차감 기준',
      deductionRule: '저장 시 페이지당 10 credits',
      recentUsage: '최근 이용내역 (최대 50건)',
      table: {
        time: '시간',
        file: '파일',
        pagesAreas: '페이지/영역',
        delta: '증감',
        empty: '이용내역이 없습니다.',
      },
      errors: {
        loadCreditsFailed: '크레딧 정보를 불러오지 못했습니다.',
        loadUsageFailed: '이용내역을 불러오지 못했습니다.',
        loadFailed: '불러오기 중 오류가 발생했습니다.',
      },
    },
    // History Page (Monitor)
    historyPage: {
      title: '히스토리',
      excelDownload: '엑셀 다운로드',
      allDownload: '전체 다운로드',
      allTextDownload: '전체 텍스트 다운로드',
      allKeyValueDownload: '전체 Key:Value 다운로드',
      selectedCount: '선택됨',
      deleteSelected: '선택 삭제',
      deleting: '삭제 중...',
      clearSelection: '선택 해제',
      multiSelect: '다중 선택',
      multiSelectOff: '다중 선택 해제',
      refresh: '새로고침',
      noRecords: '아직 OCR 기록이 없습니다.',
      backToList: '파일 목록으로 돌아가기',
      edit: '수정',
      prevRecord: '이전 레코드 (←)',
      nextRecord: '다음 레코드 (→)',
      alerts: {
        noDownloadData: '다운로드할 데이터가 없습니다.',
      },
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
        loginRequired: '최근 절약 현황을 보려면 로그인이 필요합니다.',
        noRecords: '아직 표시할 기록이 없습니다. OCR 실행 후 저장하면 여기에 표시됩니다.',
        loadFailed: '최근 절약 현황을 불러오지 못했습니다.',
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
        mode: {
          standard: '일반 (Text)',
          advanced: '고급 (Data)',
          language: '언어 선택',
          standardDescription: '기본 시스템 프롬프트가 자동으로 적용됩니다. 이미지의 모든 텍스트를 줄바꿈을 유지하여 추출합니다.',
          extractKeys: '추출할 항목 (Keys)',
          keyPlaceholder: '항목 입력 후 Enter',
          keyHint: '추출하고 싶은 항목을 입력하고 Enter를 누르세요. 예: 대표자명, 설립일, 매출액',
          presets: '자주 쓰는 양식',
          advancedDescription: '입력한 키워드들을 기반으로 JSON 포맷으로 추출됩니다.',
          saveKeys: '저장',
          savedKeys: '저장된 추출 항목',
          noSavedKeys: '저장된 추출 항목이 없습니다.',
          saveKeysDialog: '추출 항목을 저장하시겠습니까?',
          keysName: '이름 (선택사항)',
          autoCollectFullPage: '페이지 전체 자동수집',
          autoCollectFullPageDescription: '체크하면 영역 지정 없이 전체 페이지에서 key:value를 자동으로 추출합니다.',
        },
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
          advancedCustom: '고급: 커스텀 프롬프트 직접 입력',
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
          rerunOCR: 'OCR 재실행',
          saveResult: '저장',
          saveSuccess: '저장되었습니다. 히스토리에서 확인할 수 있습니다.',
          clearResult: '결과 초기화',
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
      comparison: {
        category: '구분',
        paymentMethod: '결제 방식',
        price: '가격',
        credits: '제공 크레딧',
        capacity: '처리 용량',
        pageUnitPrice: '페이지 단가',
        users: '사용자 수',
        validity: '유효 기간',
      },
      plans: {
        free: {
          name: 'Free',
          subtitle: '체험판',
          target: '맛보기로 간단히 테스트하고 싶은 개인 사용자',
          price: '₩0',
          period: '',
          button: '무료로 시작하기',
          comparison: {
            paymentMethod: '무료',
            price: '₩0',
            credits: '-',
            capacity: '3 페이지 (맛보기)',
            pageUnitPrice: '-',
            users: '1명',
            validity: '1일',
          },
        },
        pro: {
          name: 'Pro',
          subtitle: '표준 팩',
          target: '정기적으로 사용하는 개인/실무자 (충전형)',
          price: '₩100,000',
          period: '',
          button: '결제하기',
          comparison: {
            paymentMethod: '1회 결제 (충전)',
            price: '₩100,000',
            credits: '1,000 Credits',
            capacity: '100 페이지',
            pageUnitPrice: '1,000원',
            users: '1명',
            validity: '1년',
          },
        },
        expert: {
          name: 'Expert',
          subtitle: '대용량 팩',
          target: '대량 처리(충전형)로 단가를 낮추고 싶은 사용자',
          price: '₩300,000',
          period: '',
          button: '결제하기',
          comparison: {
            paymentMethod: '1회 결제 (충전)',
            price: '₩300,000',
            credits: '5,000 Credits',
            capacity: '500 페이지',
            pageUnitPrice: '600원',
            users: '1명',
            validity: '1년',
          },
        },
        businessFlex: {
          name: 'Business Flex',
          subtitle: '기업 멤버십',
          target: '팀/조직 단위로 매월 안정적으로 사용하는 기업',
          price: '₩300,000',
          period: '/ 월',
          button: '문의하기',
          comparison: {
            paymentMethod: '월 구독 (1년 약정)',
            price: '₩300,000 / 월',
            credits: '10,000 Credits (매월)',
            capacity: '매월 1,000 페이지',
            pageUnitPrice: '300원 (70% DC)',
            users: '무제한',
            validity: '매월 갱신',
          },
        },
        enterprise: {
          name: 'Enterprise',
          subtitle: '솔루션',
          target: '대규모/특수 요구사항(연동, 보안, 온프레미스 등)이 필요한 조직',
          price: '별도 문의',
          period: '',
          button: '영업팀 문의',
          comparison: {
            paymentMethod: '별도 계약',
            price: '별도 문의',
            credits: '무제한',
            capacity: '무제한',
            pageUnitPrice: '협의',
            users: '무제한',
            validity: '영구',
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
    // Billing / Credits
    billing: {
      title: 'Credits / Usage',
      tooltip: 'Credits/Usage',
      refresh: 'Refresh',
      currentCredits: 'Current Credits',
      plan: 'Plan',
      deductionCriteria: 'Deduction',
      deductionRule: '10 credits per page when saving',
      recentUsage: 'Recent Usage (up to 50)',
      table: {
        time: 'Time',
        file: 'File',
        pagesAreas: 'Pages/Areas',
        delta: 'Delta',
        empty: 'No usage yet.',
      },
      errors: {
        loadCreditsFailed: "Couldn't load credits.",
        loadUsageFailed: "Couldn't load usage history.",
        loadFailed: 'Failed while loading.',
      },
    },
    // History Page (Monitor)
    historyPage: {
      title: 'History',
      excelDownload: 'Download (Excel)',
      allDownload: 'Download All',
      allTextDownload: 'Download All Text',
      allKeyValueDownload: 'Download All Key:Value',
      selectedCount: 'selected',
      deleteSelected: 'Delete Selected',
      deleting: 'Deleting...',
      clearSelection: 'Clear Selection',
      multiSelect: 'Multi-select',
      multiSelectOff: 'Exit multi-select',
      refresh: 'Refresh',
      noRecords: 'No OCR records yet.',
      backToList: 'Back to file list',
      edit: 'Edit',
      prevRecord: 'Previous record (←)',
      nextRecord: 'Next record (→)',
      alerts: {
        noDownloadData: 'No data to download.',
      },
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
        loginRequired: 'Login is required to view recent savings.',
        noRecords: 'No records to show yet. After running OCR and saving, it will appear here.',
        loadFailed: 'Failed to load recent savings.',
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
        mode: {
          standard: 'Standard (Text)',
          advanced: 'Advanced (Data)',
          language: 'Language Selection',
          standardDescription: 'Default system prompt will be applied automatically. Extracts all text from the image while preserving line breaks.',
          extractKeys: 'Items to Extract (Keys)',
          keyPlaceholder: 'Enter item and press Enter',
          keyHint: 'Enter items you want to extract and press Enter. Example: CEO name, Establishment date, Revenue',
          presets: 'Common Templates',
          advancedDescription: 'Items will be extracted in JSON format based on the keywords you entered.',
          saveKeys: 'Save',
          savedKeys: 'Saved Extract Keys',
          noSavedKeys: 'No saved extract keys.',
          saveKeysDialog: 'Save extract keys?',
          keysName: 'Name (Optional)',
          autoCollectFullPage: 'Auto Collect Full Page',
          autoCollectFullPageDescription: 'When checked, automatically extracts key:value from the entire page without area selection.',
        },
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
          advancedCustom: 'Advanced: Enter Custom Prompt Directly',
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
          rerunOCR: 'Re-run OCR',
          saveResult: 'Save',
          saveSuccess: 'Saved. You can check it in history.',
          clearResult: 'Clear Result',
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
      comparison: {
        category: 'Category',
        paymentMethod: 'Payment Method',
        price: 'Price',
        credits: 'Included Credits',
        capacity: 'Processing Capacity',
        pageUnitPrice: 'Price per Page',
        users: 'Users',
        validity: 'Validity',
      },
      plans: {
        free: {
          name: 'Free',
          subtitle: 'Trial',
          price: '₩0',
          period: '',
          target: 'For individuals who want a quick preview',
          button: 'Get Started',
          comparison: {
            paymentMethod: 'Free',
            price: '₩0',
            credits: '-',
            capacity: '3 pages (preview)',
            pageUnitPrice: '-',
            users: '1',
            validity: '1 day',
          },
        },
        pro: {
          name: 'Pro',
          subtitle: 'Standard Pack',
          target: 'One-time top-up pack for regular individual users',
          price: '₩100,000',
          period: '',
          button: 'Purchase',
          comparison: {
            paymentMethod: 'One-time payment (Top-up)',
            price: '₩100,000',
            credits: '1,000 Credits',
            capacity: '100 pages',
            pageUnitPrice: '₩1,000',
            users: '1',
            validity: '1 year',
          },
        },
        expert: {
          name: 'Expert',
          subtitle: 'High-Volume Pack',
          target: 'High-volume top-up pack with discounted unit price',
          price: '₩300,000',
          period: '',
          button: 'Purchase',
          comparison: {
            paymentMethod: 'One-time payment (Top-up)',
            price: '₩300,000',
            credits: '5,000 Credits',
            capacity: '500 pages',
            pageUnitPrice: '₩600',
            users: '1',
            validity: '1 year',
          },
        },
        businessFlex: {
          name: 'Business Flex',
          subtitle: 'Business Membership',
          target: 'Annual subscription for teams and organizations',
          price: '₩300,000',
          period: '/ month',
          button: 'Contact Us',
          comparison: {
            paymentMethod: 'Monthly subscription (1-year commitment)',
            price: '₩300,000 / month',
            credits: '10,000 Credits (monthly)',
            capacity: '1,000 pages / month',
            pageUnitPrice: '₩300 (70% off)',
            users: 'Unlimited',
            validity: 'Renews monthly',
          },
        },
        enterprise: {
          name: 'Enterprise',
          subtitle: 'Solution',
          target: 'Custom contract for large-scale or specialized needs',
          price: 'Custom',
          period: '',
          button: 'Contact Sales',
          comparison: {
            paymentMethod: 'Custom contract',
            price: 'Custom',
            credits: 'Unlimited',
            capacity: 'Unlimited',
            pageUnitPrice: 'Negotiable',
            users: 'Unlimited',
            validity: 'Permanent',
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
  ja: {
    // Navigation
    nav: {
      home: 'ホーム',
      pricing: '料金プラン',
      history: '履歴',
      ocrService: 'IO-N;LINGO OCR',
    },
    // Billing / Credits
    billing: {
      title: 'クレジット / 利用履歴',
      tooltip: 'クレジット/利用履歴',
      refresh: '更新',
      currentCredits: '現在のクレジット',
      plan: 'プラン',
      deductionCriteria: '差し引き基準',
      deductionRule: '保存時にページあたり10 credits',
      recentUsage: '最近の利用履歴 (最大50件)',
      table: {
        time: '時間',
        file: 'ファイル',
        pagesAreas: 'ページ/領域',
        delta: '増減',
        empty: '利用履歴がありません。',
      },
      errors: {
        loadCreditsFailed: 'クレジット情報を取得できませんでした。',
        loadUsageFailed: '利用履歴を取得できませんでした。',
        loadFailed: '読み込み中にエラーが発生しました。',
      },
    },
    // History Page (Monitor)
    historyPage: {
      title: '履歴',
      excelDownload: 'Excelダウンロード',
      allDownload: '全体ダウンロード',
      allTextDownload: '全テキストダウンロード',
      allKeyValueDownload: '全 Key:Value ダウンロード',
      selectedCount: '件選択',
      deleteSelected: '選択削除',
      deleting: '削除中...',
      clearSelection: '選択解除',
      multiSelect: '複数選択',
      multiSelectOff: '複数選択解除',
      refresh: '更新',
      noRecords: 'OCR履歴がありません。',
      backToList: '一覧に戻る',
      edit: '編集',
      prevRecord: '前のレコード (←)',
      nextRecord: '次のレコード (→)',
      alerts: {
        noDownloadData: 'ダウンロードするデータがありません。',
      },
    },
    // Landing Page
    landing: {
      title: 'IO-N;LINGO OCR',
      subtitle: '画像とPDFから特定の領域のテキストを正確に抽出',
      dragDrop: 'ファイルをドラッグ＆ドロップまたはクリックしてアップロード',
      uploadButton: 'ファイルを選択',
      supportedFormats: '対応形式: 画像 (JPG, PNG), PDF',
      features: {
        multiRegion: {
          title: '複数領域選択',
          description: '1つのファイルから複数の領域を選択して同時にOCRを実行',
        },
        pdfSupport: {
          title: 'PDF, HWP, HWPX, PPT対応',
          description: 'PDF, HWP, HWPX, PPTの全ページから同じ領域またはページごとに異なる領域を抽出',
        },
        customPrompts: {
          title: 'カスタムプロンプト',
          description: 'OCR精度を向上させるためのユーザー定義プロンプト対応',
        },
      },
      roiCalculator: {
        title: '時間節約計算機',
        description: '抽出項目数 × 2分 / 60',
        itemsLabel: '抽出項目数',
        timeSaved: '節約時間',
        minutes: '分',
      },
      statistics: {
        title: '最近の節約状況',
        records: '記録',
        saved: '節約',
        won: '円',
        loginRequired: '最近の節約状況を表示するにはログインが必要です。',
        noRecords: '表示する記録がありません。OCRを実行して保存するとここに表示されます。',
        loadFailed: '最近の節約状況の読み込みに失敗しました。',
      },
      calculator: {
        title: '予想時間節約計算機',
        pages: '予想ページ数',
        areas: '領域数',
        keyValuePairs: 'おおよそのKey:Value件数',
        timeSaved: '予想節約時間',
        moneySaved: '予想節約金額',
        minutes: '分',
        formula: '計算式: ページ数 × 領域数 × Key:Value件数 × 1分 (時給基準)',
      },
      caseStudies: {
        title: 'ユーザー利用事例',
        subtitle: 'IO-VISION OCRを使用した実際のユーザーが達成した成果',
        cases: {
          case1: {
            title: '法務文書処理自動化',
            company: '法律事務所A',
            description: '契約書と証憑書類から重要情報を自動抽出し、文書レビュー時間を80%短縮しました。',
            metrics: '月500件処理、時間節約40時間',
          },
          case2: {
            title: '会計帳簿データ入力',
            company: '中小企業B',
            description: '税務計算書と領収書の金額、日付、取引先情報を自動抽出し、会計業務効率を大幅に向上させました。',
            metrics: '月1,200件処理、人員削減2名',
          },
          case3: {
            title: '医療記録デジタル化',
            company: '病院C',
            description: '紙のチャートをスキャンして患者情報と診断内容を自動抽出し、電子カルテシステム構築に活用しました。',
            metrics: '月3,000件処理、デジタル化完了',
          },
        },
      },
    },
    // Workspace
    workspace: {
      leftSidebar: {
        title: 'ページ',
        thumbnail: 'ページ',
      },
      centerCanvas: {
        selectArea: 'ドラッグしてクロップする領域を選択してください',
        pdfNote: 'PDF: すべてのページから同じ領域が抽出されます',
      },
      rightInspector: {
        mode: {
          standard: '標準 (Text)',
          advanced: '高度 (Data)',
          language: '言語選択',
          standardDescription: 'デフォルトシステムプロンプトが自動的に適用されます。改行を維持しながら画像からすべてのテキストを抽出します。',
          extractKeys: '抽出項目 (Keys)',
          keyPlaceholder: '項目を入力してEnter',
          keyHint: '抽出したい項目を入力してEnterを押してください。例: 代表者名、設立日、売上高',
          presets: 'よく使うフォーム',
          advancedDescription: '入力したキーワードに基づいてJSON形式で抽出されます。',
          saveKeys: '保存',
          savedKeys: '保存された抽出項目',
          noSavedKeys: '保存された抽出項目がありません。',
          saveKeysDialog: '抽出項目を保存しますか？',
          keysName: '名前 (オプション)',
          autoCollectFullPage: 'ページ全体自動収集',
          autoCollectFullPageDescription: 'チェックすると、領域指定なしでページ全体からkey:valueを自動抽出します。',
        },
        prompt: {
          title: 'カスタムプロンプト',
          toggle: 'プロンプト表示/非表示',
          placeholder: 'プロンプトを入力してください...',
          save: '保存',
          cancel: 'キャンセル',
          savedPrompts: '保存されたプロンプト',
          load: '読み込み',
          delete: '削除',
          saveDialog: 'このプロンプトを保存しますか？',
          promptName: 'プロンプト名 (オプション)',
          advancedCustom: '高度: カスタムプロンプトを直接入力',
        },
        results: {
          title: 'OCR結果',
          rawText: '元のテキスト',
          structured: '構造化データ',
          noResults: 'まだ結果がありません。OCRを実行してください。',
          timeSaved: '節約時間',
          moneySaved: '節約金額',
          minutes: '分',
          won: '円',
          calculationNote: '計算: 領域数 × ページ数 × 1分 × 時給10,320円',
        },
        actions: {
          runOCR: 'OCR実行',
          rerunOCR: 'OCR再実行',
          saveResult: '保存',
          saveSuccess: '保存されました。履歴で確認できます。',
          clearResult: '結果をクリア',
          processing: '処理中...',
          progress: '進行状況',
        },
      },
      pageNavigation: {
        previous: '前へ',
        next: '次へ',
        current: 'ページ',
        of: '/',
        ocrInProgress: '(OCR進行中...)',
      },
    },
    // Crop Area Management
    crop: {
      add: '領域を追加',
      update: '領域を更新',
      delete: '領域を削除',
      cancel: 'キャンセル',
      cropComplete: '領域クロップ完了',
      addQuestion: '追加しますか？',
      updateQuestion: '更新しますか？',
      areaSize: 'クロップ領域',
      selectedAreas: '選択された領域',
      currentPageAreas: 'ページ領域',
      totalAreas: '合計',
      areas: '個',
      noAreas: '追加された領域がありません。ドラッグして領域を選択してください。',
      deleteAll: 'すべて削除',
      edit: '編集',
    },
    // File Upload
    upload: {
      title: 'ファイルアップロード (画像またはPDF)',
      processing: 'ファイル処理中...',
      progress: '進行率',
      error: 'ファイル読み込み中にエラーが発生しました。',
      unsupportedFormat: 'サポートされていないファイル形式です。画像(jpg, png)またはPDFファイルをアップロードしてください。',
      processingError: 'ファイル処理中にエラーが発生しました。',
    },
    // OCR Results
    ocr: {
      extractedText: '抽出されたテキスト',
      croppedPreview: 'クロップ領域プレビュー',
      noText: '(空のテキスト)',
      region: '領域',
      page: 'ページ',
    },
    // Common
    common: {
      reset: 'リセット',
      save: '保存',
      cancel: 'キャンセル',
      delete: '削除',
      edit: '編集',
      close: '閉じる',
      loading: '読み込み中...',
      error: 'エラー',
      success: '成功',
    },
    // Auth
    auth: {
      login: {
        title: 'ログイン',
        noAccount: 'アカウントをお持ちでないですか？',
        signUpLink: 'アカウントを作成',
        button: 'ログイン',
        forgotPassword: 'パスワードをお忘れですか？',
      },
      signUp: {
        title: 'アカウントを作成',
        haveAccount: '既にアカウントをお持ちですか？',
        loginLink: 'ログイン',
        button: 'サインアップ',
      },
      social: {
        google: 'Googleで続行',
        facebook: 'Facebookで続行',
        microsoft: 'Microsoftで続行',
      },
      separator: 'または',
      email: 'メール',
      password: 'パスワード',
      logout: 'ログアウト',
    },
    // Errors
    errors: {
      noImage: '画像を選択してください。',
      noCropArea: '少なくとも1つのクロップ領域を追加してください。',
      ocrFailed: 'OCR処理に失敗しました。',
      processingError: 'OCR処理中にエラーが発生しました。',
    },
    // Pricing
    pricing: {
      title: '料金プラン',
      subtitle: 'あなたのニーズに合うプランを選択してください',
      mostPopular: '人気',
      plans: {
        free: {
          name: 'Free',
          subtitle: 'トライアル',
          target: '領域を手動で指定して抽出します。(手動、不便、しかし正確)',
          price: '₩0',
          period: '/ 月',
          button: '無料で始める',
          features: {
            limit: '1日1件制限',
            pages: '文書あたり3ページ',
            areas: 'ページあたり1個',
            extraction: '基本Key:Value',
            storage: '24時間後に削除',
            speed: 'Standard',
          },
        },
        payPerUse: {
          name: 'Pay-per-Use',
          subtitle: '1件あたり支払い',
          target: '領域を手動で指定して抽出します。(手動、不便、しかし正確)',
          price: '₩500',
          period: '/ 件',
          button: '購入',
          features: {
            limit: '1件あたり支払い',
            pages: '文書あたり10ページ',
            areas: 'ページあたり5個',
            extraction: '基本Key:Value',
            storage: '7日間保管',
            speed: 'Standard',
          },
        },
        pro: {
          name: 'Pro',
          subtitle: 'サブスクリプション',
          target: 'アップロードするだけ。AIが自動的に領域を見つけて値を抽出します。(自動、便利、高解像度対応)',
          price: '₩29,000',
          period: '/ 月',
          button: '無料トライアル開始',
          features: {
            limit: '月300件 (Credits)',
            pages: '文書あたり50ページ',
            areas: 'ページあたり無制限',
            extraction: '高度なプロンプト対応',
            storage: '1年間保管',
            speed: 'Fast (GPU優先割り当て)',
          },
        },
        flex: {
          name: 'Flex',
          subtitle: '従量課金',
          target: '時々使用するユーザー',
          price: '₩50,000',
          period: '/ 500 Credits',
          validity: '有効期間1年',
          button: 'Creditsを購入',
          features: {
            limit: '制限なし',
            pages: '制限なし',
            areas: 'ページあたり無制限',
            extraction: '高度なプロンプト対応',
            storage: '1年間保管',
            speed: 'Fast',
          },
        },
        enterprise: {
          name: 'Enterprise',
          subtitle: 'ソリューション',
          target: '企業、官公庁、大量処理',
          price: '別途お問い合わせ',
          button: '営業チームにお問い合わせ',
          features: {
            limit: '無制限 / オンプレミス',
            pages: '制限なし',
            areas: '無制限',
            extraction: 'カスタムモデルチューニング',
            storage: '永続保管 (自社サーバー)',
            speed: 'Dedicated (専用)',
          },
        },
      },
      features: {
        limit: '提供量',
        pages: 'ページ制限',
        areas: '領域(Crop)',
        extraction: '抽出項目',
        storage: '保管',
        speed: '速度',
      },
      usageGuide: {
        title: '無料/有料プラン',
        freePlan: {
          title: '無料プラン',
          description: '月1回の無料OCR処理1件が提供されます。',
          note: '無料プランを使用したOCRは基本Key:Value抽出のみ可能です。',
        },
        paidPlan: {
          title: '有料プラン',
          description: 'Pay-per-Use: 1件あたり₩500、Pro: 月₩29,000、Flex: ₩50,000 / 500 Credits',
          note: '有料プランを使用したOCRは高度なプロンプト対応および詳細な抽出結果を確認できます。',
        },
        deductionCriteria: {
          title: 'Credits差し引き基準',
          item1: 'OCR処理1件あたりCredits 1個が差し引かれます。',
          item2: '購入したCreditsは購入当日から1年間使用でき、使用期間が過ぎると自動的に失効します。',
          item3: '処理失敗した文書はCreditsから差し引かれません。',
        },
        refundPolicy: {
          title: '返金規約',
          item1: 'Credits未使用時は購入日から7日以内に契約を撤回できます。',
          item2: '既にサービスを使用した場合、前払い金額から使用回数に該当する利用金額を差し引いて返金します。',
          item3: '支払いに関するお問い合わせはカスタマーサービスにお問い合わせください。',
        },
      },
    },
  },
  'zh-CN': {
    // Navigation
    nav: {
      home: '首页',
      pricing: '价格',
      history: '历史',
      ocrService: 'IO-N;LINGO OCR',
    },
    // Billing / Credits
    billing: {
      title: '积分 / 使用记录',
      tooltip: '积分/使用记录',
      refresh: '刷新',
      currentCredits: '当前积分',
      plan: '套餐',
      deductionCriteria: '扣费规则',
      deductionRule: '保存时每页扣 10 credits',
      recentUsage: '最近使用记录（最多50条）',
      table: {
        time: '时间',
        file: '文件',
        pagesAreas: '页/区域',
        delta: '增减',
        empty: '暂无使用记录。',
      },
      errors: {
        loadCreditsFailed: '无法获取积分信息。',
        loadUsageFailed: '无法获取使用记录。',
        loadFailed: '加载时发生错误。',
      },
    },
    // History Page (Monitor)
    historyPage: {
      title: '历史',
      excelDownload: 'Excel 下载',
      allDownload: '全部下载',
      allTextDownload: '下载全部文本',
      allKeyValueDownload: '下载全部 Key:Value',
      selectedCount: '已选择',
      deleteSelected: '删除所选',
      deleting: '删除中...',
      clearSelection: '取消选择',
      multiSelect: '多选',
      multiSelectOff: '退出多选',
      refresh: '刷新',
      noRecords: '暂无 OCR 记录。',
      backToList: '返回文件列表',
      edit: '编辑',
      prevRecord: '上一条 (←)',
      nextRecord: '下一条 (→)',
      alerts: {
        noDownloadData: '没有可下载的数据。',
      },
    },
    // Landing Page
    landing: {
      title: 'IO-N;LINGO OCR',
      subtitle: '从图像和PDF中精确提取特定区域的文本',
      dragDrop: '拖放文件或点击上传',
      uploadButton: '选择文件',
      supportedFormats: '支持格式: 图像 (JPG, PNG), PDF',
      features: {
        multiRegion: {
          title: '多区域选择',
          description: '从单个文件中选择多个区域并同时执行OCR',
        },
        pdfSupport: {
          title: 'PDF, HWP, HWPX, PPT支持',
          description: '从PDF, HWP, HWPX, PPT的所有页面提取相同或不同的区域',
        },
        customPrompts: {
          title: '自定义提示',
          description: '支持用户定义的提示以提高OCR准确性',
        },
      },
      roiCalculator: {
        title: '时间节省计算器',
        description: '提取项目数 × 2分钟 / 60',
        itemsLabel: '提取项目数',
        timeSaved: '节省时间',
        minutes: '分钟',
      },
      statistics: {
        title: '最近节省情况',
        records: '记录',
        saved: '节省',
        won: '元',
        loginRequired: '查看最近节省情况需要登录。',
        noRecords: '暂无可显示记录。执行OCR并保存后会显示在这里。',
        loadFailed: '无法加载最近节省情况。',
      },
      calculator: {
        title: '预计时间节省计算器',
        pages: '预计页数',
        areas: '区域数',
        keyValuePairs: '大约Key:Value对数',
        timeSaved: '预计节省时间',
        moneySaved: '预计节省金额',
        minutes: '分钟',
        formula: '计算公式: 页数 × 区域数 × Key:Value对数 × 1分钟 (时薪基准)',
      },
      caseStudies: {
        title: '用户使用案例',
        subtitle: 'IO-VISION OCR真实用户取得的成果',
        cases: {
          case1: {
            title: '法律文件处理自动化',
            company: '律师事务所A',
            description: '自动从合同和证明文件中提取关键信息，将文件审查时间缩短80%。',
            metrics: '每月处理500件，节省时间40小时',
          },
          case2: {
            title: '会计账簿数据录入',
            company: '中小企业B',
            description: '自动提取发票和收据的金额、日期、交易方信息，大幅提高会计工作效率。',
            metrics: '每月处理1,200件，减少人员2名',
          },
          case3: {
            title: '医疗记录数字化',
            company: '医院C',
            description: '扫描纸质图表，自动提取患者信息和诊断内容，用于电子病历系统建设。',
            metrics: '每月处理3,000件，数字化完成',
          },
        },
      },
    },
    // Workspace
    workspace: {
      leftSidebar: {
        title: '页面',
        thumbnail: '页面',
      },
      centerCanvas: {
        selectArea: '拖动选择要裁剪的区域',
        pdfNote: 'PDF: 将从所有页面提取相同的区域',
      },
      rightInspector: {
        mode: {
          standard: '标准 (Text)',
          advanced: '高级 (Data)',
          language: '语言选择',
          standardDescription: '将自动应用默认系统提示。在保持换行的同时从图像中提取所有文本。',
          extractKeys: '提取项目 (Keys)',
          keyPlaceholder: '输入项目后按Enter',
          keyHint: '输入要提取的项目并按Enter。例如: 代表姓名、成立日期、销售额',
          presets: '常用表单',
          advancedDescription: '将根据输入的关键字以JSON格式提取。',
          saveKeys: '保存',
          savedKeys: '已保存的提取项目',
          noSavedKeys: '没有已保存的提取项目。',
          saveKeysDialog: '是否保存提取项目？',
          keysName: '名称 (可选)',
          autoCollectFullPage: '页面全自动收集',
          autoCollectFullPageDescription: '勾选后，无需指定区域即可从整个页面自动提取key:value。',
        },
        prompt: {
          title: '自定义提示',
          toggle: '显示/隐藏提示',
          placeholder: '请输入提示...',
          save: '保存',
          cancel: '取消',
          savedPrompts: '已保存的提示',
          load: '加载',
          delete: '删除',
          saveDialog: '是否保存此提示？',
          promptName: '提示名称 (可选)',
          advancedCustom: '高级: 直接输入自定义提示',
        },
        results: {
          title: 'OCR结果',
          rawText: '原始文本',
          structured: '结构化数据',
          noResults: '还没有结果。请运行OCR。',
          timeSaved: '节省时间',
          moneySaved: '节省金额',
          minutes: '分钟',
          won: '元',
          calculationNote: '计算: 区域数 × 页数 × 1分钟 × 时薪10,320元',
        },
        actions: {
          runOCR: '运行OCR',
          rerunOCR: '重新运行OCR',
          saveResult: '保存',
          saveSuccess: '已保存。可在历史记录中查看。',
          clearResult: '清除结果',
          processing: '处理中...',
          progress: '进度',
        },
      },
      pageNavigation: {
        previous: '上一页',
        next: '下一页',
        current: '页面',
        of: '/',
        ocrInProgress: '(OCR进行中...)',
      },
    },
    // Crop Area Management
    crop: {
      add: '添加区域',
      update: '更新区域',
      delete: '删除区域',
      cancel: '取消',
      cropComplete: '区域裁剪完成',
      addQuestion: '是否添加？',
      updateQuestion: '是否更新？',
      areaSize: '裁剪区域',
      selectedAreas: '已选区域',
      currentPageAreas: '页面区域',
      totalAreas: '总计',
      areas: '个',
      noAreas: '没有添加的区域。请拖动选择区域。',
      deleteAll: '全部删除',
      edit: '编辑',
    },
    // File Upload
    upload: {
      title: '文件上传 (图像或PDF)',
      processing: '正在处理文件...',
      progress: '进度',
      error: '读取文件时发生错误。',
      unsupportedFormat: '不支持的文件格式。请上传图像(jpg, png)或PDF文件。',
      processingError: '处理文件时发生错误。',
    },
    // OCR Results
    ocr: {
      extractedText: '提取的文本',
      croppedPreview: '裁剪区域预览',
      noText: '(空文本)',
      region: '区域',
      page: '页面',
    },
    // Common
    common: {
      reset: '重置',
      save: '保存',
      cancel: '取消',
      delete: '删除',
      edit: '编辑',
      close: '关闭',
      loading: '加载中...',
      error: '错误',
      success: '成功',
    },
    // Auth
    auth: {
      login: {
        title: '登录',
        noAccount: '没有账户？',
        signUpLink: '创建账户',
        button: '登录',
        forgotPassword: '忘记密码？',
      },
      signUp: {
        title: '创建账户',
        haveAccount: '已有账户？',
        loginLink: '登录',
        button: '注册',
      },
      social: {
        google: '使用Google继续',
        facebook: '使用Facebook继续',
        microsoft: '使用Microsoft继续',
      },
      separator: '或',
      email: '电子邮件',
      password: '密码',
      logout: '登出',
    },
    // Errors
    errors: {
      noImage: '请选择图像。',
      noCropArea: '请至少添加一个裁剪区域。',
      ocrFailed: 'OCR处理失败。',
      processingError: 'OCR处理过程中发生错误。',
    },
    // Pricing
    pricing: {
      title: '价格',
      subtitle: '选择适合您需求的计划',
      mostPopular: '最受欢迎',
      plans: {
        free: {
          name: 'Free',
          subtitle: '试用版',
          target: '手动指定区域进行提取。(手动、不便、但准确)',
          price: '₩0',
          period: '/ 月',
          button: '免费开始',
          features: {
            limit: '每天1次限制',
            pages: '每文档3页',
            areas: '每页1个',
            extraction: '基本Key:Value',
            storage: '24小时后删除',
            speed: 'Standard',
          },
        },
        payPerUse: {
          name: 'Pay-per-Use',
          subtitle: '按次付费',
          target: '手动指定区域进行提取。(手动、不便、但准确)',
          price: '₩500',
          period: '/ 次',
          button: '购买',
          features: {
            limit: '按次付费',
            pages: '每文档10页',
            areas: '每页5个',
            extraction: '基本Key:Value',
            storage: '保存7天',
            speed: 'Standard',
          },
        },
        pro: {
          name: 'Pro',
          subtitle: '订阅型',
          target: '只需上传。AI会自动查找区域并提取值。(自动、方便、支持高分辨率)',
          price: '₩29,000',
          period: '/ 月',
          button: '开始免费试用',
          features: {
            limit: '每月300次 (Credits)',
            pages: '每文档50页',
            areas: '每页无限制',
            extraction: '高级提示支持',
            storage: '保存1年',
            speed: 'Fast (GPU优先分配)',
          },
        },
        flex: {
          name: 'Flex',
          subtitle: '充值型/按量计费',
          target: '偶尔使用的用户',
          price: '₩50,000',
          period: '/ 500 Credits',
          validity: '有效期1年',
          button: '购买Credits',
          features: {
            limit: '无限制',
            pages: '无限制',
            areas: '每页无限制',
            extraction: '高级提示支持',
            storage: '保存1年',
            speed: 'Fast',
          },
        },
        enterprise: {
          name: 'Enterprise',
          subtitle: '解决方案',
          target: '企业、政府机关、批量处理',
          price: '单独咨询',
          button: '联系销售团队',
          features: {
            limit: '无限制 / 本地部署',
            pages: '无限制',
            areas: '无限制',
            extraction: '自定义模型调优',
            storage: '永久保存 (自有服务器)',
            speed: 'Dedicated (专用)',
          },
        },
      },
      features: {
        limit: '提供量',
        pages: '页面限制',
        areas: '区域(Crop)',
        extraction: '提取项目',
        storage: '保存',
        speed: '速度',
      },
      usageGuide: {
        title: '免费/付费计划',
        freePlan: {
          title: '免费计划',
          description: '每月提供1次免费OCR处理。',
          note: '使用免费计划的OCR仅支持基本Key:Value提取。',
        },
        paidPlan: {
          title: '付费计划',
          description: 'Pay-per-Use: 每次₩500，Pro: 每月₩29,000，Flex: ₩50,000 / 500 Credits',
          note: '使用付费计划的OCR支持高级提示和详细的提取结果。',
        },
        deductionCriteria: {
          title: 'Credits扣除标准',
          item1: '每次OCR处理扣除1个Credits。',
          item2: '购买的Credits自购买当日起1年内可使用，使用期限过后将自动失效。',
          item3: '处理失败的文档不会扣除Credits。',
        },
        refundPolicy: {
          title: '退款规定',
          item1: 'Credits未使用时，可在购买日起7天内撤回合同。',
          item2: '已使用服务时，将从预付款中扣除使用次数对应的使用金额后退款。',
          item3: '有关付款的咨询，请联系客服。',
        },
      },
    },
  },
  es: {
    // Navigation
    nav: {
      home: 'Inicio',
      pricing: 'Precios',
      history: 'Historial',
      ocrService: 'IO-N;LINGO OCR',
    },
    // Billing / Credits
    billing: {
      title: 'Créditos / Uso',
      tooltip: 'Créditos/Uso',
      refresh: 'Actualizar',
      currentCredits: 'Créditos actuales',
      plan: 'Plan',
      deductionCriteria: 'Criterio',
      deductionRule: '10 credits por página al guardar',
      recentUsage: 'Uso reciente (hasta 50)',
      table: {
        time: 'Hora',
        file: 'Archivo',
        pagesAreas: 'Páginas/Áreas',
        delta: 'Cambio',
        empty: 'No hay historial.',
      },
      errors: {
        loadCreditsFailed: 'No se pudieron cargar los créditos.',
        loadUsageFailed: 'No se pudo cargar el historial.',
        loadFailed: 'Error al cargar.',
      },
    },
    // History Page (Monitor)
    historyPage: {
      title: 'Historial',
      excelDownload: 'Descargar (Excel)',
      allDownload: 'Descargar todo',
      allTextDownload: 'Descargar todo el texto',
      allKeyValueDownload: 'Descargar todo Key:Value',
      selectedCount: 'seleccionados',
      deleteSelected: 'Eliminar seleccionados',
      deleting: 'Eliminando...',
      clearSelection: 'Limpiar selección',
      multiSelect: 'Selección múltiple',
      multiSelectOff: 'Salir de selección múltiple',
      refresh: 'Actualizar',
      noRecords: 'Aún no hay registros OCR.',
      backToList: 'Volver a la lista',
      edit: 'Editar',
      prevRecord: 'Registro anterior (←)',
      nextRecord: 'Registro siguiente (→)',
      alerts: {
        noDownloadData: 'No hay datos para descargar.',
      },
    },
    // Landing Page
    landing: {
      title: 'IO-N;LINGO OCR',
      subtitle: 'Extrae texto de regiones específicas en imágenes y PDFs con precisión',
      dragDrop: 'Arrastra y suelta archivos o haz clic para subir',
      uploadButton: 'Seleccionar archivo',
      supportedFormats: 'Formatos soportados: Imágenes (JPG, PNG), PDF',
      features: {
        multiRegion: {
          title: 'Selección Multi-Región',
          description: 'Selecciona múltiples regiones de un solo archivo y realiza OCR simultáneamente',
        },
        pdfSupport: {
          title: 'Soporte PDF, HWP, HWPX, PPT',
          description: 'Extrae la misma o diferentes regiones de todas las páginas de PDF, HWP, HWPX, PPT',
        },
        customPrompts: {
          title: 'Prompts Personalizados',
          description: 'Prompts definidos por el usuario para mejorar la precisión del OCR',
        },
      },
      roiCalculator: {
        title: 'Calculadora de Ahorro de Tiempo',
        description: 'Elementos Extraídos × 2 min / 60',
        itemsLabel: 'Número de Elementos Extraídos',
        timeSaved: 'Tiempo Ahorrado',
        minutes: 'minutos',
      },
      statistics: {
        title: 'Ahorros Recientes',
        records: 'Registros',
        saved: 'Ahorrado',
        won: 'EUR',
        loginRequired: 'Se requiere iniciar sesión para ver los ahorros recientes.',
        noRecords: 'Aún no hay registros para mostrar. Tras ejecutar OCR y guardar, aparecerán aquí.',
        loadFailed: 'No se pudieron cargar los ahorros recientes.',
      },
      calculator: {
        title: 'Calculadora de Ahorro de Tiempo',
        pages: 'Páginas Esperadas',
        areas: 'Número de Áreas',
        keyValuePairs: 'Pares Key:Value Aproximados',
        timeSaved: 'Tiempo Ahorrado Estimado',
        moneySaved: 'Dinero Ahorrado Estimado',
        minutes: 'minutos',
        formula: 'Fórmula: Páginas × Áreas × Pares Key:Value × 1 min (Basado en Salario por Hora)',
      },
      caseStudies: {
        title: 'Casos de Uso de Usuarios',
        subtitle: 'Historias de éxito de usuarios reales de IO-VISION OCR',
        cases: {
          case1: {
            title: 'Automatización de Procesamiento de Documentos Legales',
            company: 'Bufete de Abogados A',
            description: 'Extrajo automáticamente información clave de contratos y documentos de respaldo, reduciendo el tiempo de revisión de documentos en un 80%.',
            metrics: '500 documentos/mes, 40 horas ahorradas',
          },
          case2: {
            title: 'Entrada de Datos de Libros Contables',
            company: 'PYME B',
            description: 'Extrajo automáticamente montos, fechas e información de proveedores de facturas y recibos, mejorando significativamente la eficiencia contable.',
            metrics: '1,200 documentos/mes, 2 empleados reducidos',
          },
          case3: {
            title: 'Digitalización de Registros Médicos',
            company: 'Hospital C',
            description: 'Escaneó gráficos en papel y extrajo automáticamente información del paciente y detalles de diagnóstico para la construcción del sistema EMR.',
            metrics: '3,000 documentos/mes, digitalización completada',
          },
        },
      },
    },
    // Workspace
    workspace: {
      leftSidebar: {
        title: 'Páginas',
        thumbnail: 'Página',
      },
      centerCanvas: {
        selectArea: 'Arrastra para seleccionar el área a recortar',
        pdfNote: 'PDF: Se extraerá la misma área de todas las páginas',
      },
      rightInspector: {
        mode: {
          standard: 'Estándar (Text)',
          advanced: 'Avanzado (Data)',
          language: 'Selección de Idioma',
          standardDescription: 'Se aplicará automáticamente el prompt del sistema por defecto. Extrae todo el texto de la imagen manteniendo los saltos de línea.',
          extractKeys: 'Elementos a Extraer (Keys)',
          keyPlaceholder: 'Ingresa elemento y presiona Enter',
          keyHint: 'Ingresa los elementos que deseas extraer y presiona Enter. Ejemplo: Nombre del CEO, Fecha de establecimiento, Ingresos',
          presets: 'Plantillas Comunes',
          advancedDescription: 'Los elementos se extraerán en formato JSON basado en las palabras clave que ingresaste.',
          saveKeys: 'Guardar',
          savedKeys: 'Claves de Extracción Guardadas',
          noSavedKeys: 'No hay claves de extracción guardadas.',
          saveKeysDialog: '¿Guardar claves de extracción?',
          keysName: 'Nombre (Opcional)',
          autoCollectFullPage: 'Recolección Automática de Página Completa',
          autoCollectFullPageDescription: 'Cuando está marcado, extrae automáticamente key:value de toda la página sin selección de área.',
        },
        prompt: {
          title: 'Prompt Personalizado',
          toggle: 'Mostrar/Ocultar Prompt',
          placeholder: 'Ingresa tu prompt...',
          save: 'Guardar',
          cancel: 'Cancelar',
          savedPrompts: 'Prompts Guardados',
          load: 'Cargar',
          delete: 'Eliminar',
          saveDialog: '¿Guardar este prompt?',
          promptName: 'Nombre del Prompt (Opcional)',
          advancedCustom: 'Avanzado: Ingresar Prompt Personalizado Directamente',
        },
        results: {
          title: 'Resultados OCR',
          rawText: 'Texto Original',
          structured: 'Datos Estructurados',
          noResults: 'Aún no hay resultados. Por favor ejecuta OCR.',
          timeSaved: 'Tiempo Ahorrado',
          moneySaved: 'Dinero Ahorrado',
          minutes: 'minutos',
          won: 'EUR',
          calculationNote: 'Cálculo: Áreas × Páginas × 1 min × Salario Mínimo 10,320 EUR/hora',
        },
        actions: {
          runOCR: 'Ejecutar OCR',
          rerunOCR: 'Reejecutar OCR',
          saveResult: 'Guardar',
          saveSuccess: 'Guardado. Puedes verificarlo en el historial.',
          clearResult: 'Limpiar Resultado',
          processing: 'Procesando...',
          progress: 'Progreso',
        },
      },
      pageNavigation: {
        previous: 'Anterior',
        next: 'Siguiente',
        current: 'Página',
        of: '/',
        ocrInProgress: '(OCR en progreso...)',
      },
    },
    // Crop Area Management
    crop: {
      add: 'Agregar Área',
      update: 'Actualizar Área',
      delete: 'Eliminar Área',
      cancel: 'Cancelar',
      cropComplete: 'Área de Recorte Completa',
      addQuestion: '¿Agregar esta área?',
      updateQuestion: '¿Actualizar esta área?',
      areaSize: 'Área de Recorte',
      selectedAreas: 'Áreas Seleccionadas',
      currentPageAreas: 'Áreas de Página',
      totalAreas: 'Total',
      areas: 'áreas',
      noAreas: 'No se han agregado áreas. Arrastra para seleccionar un área.',
      deleteAll: 'Eliminar Todo',
      edit: 'Editar',
    },
    // File Upload
    upload: {
      title: 'Subida de Archivo (Imagen o PDF)',
      processing: 'Procesando archivo...',
      progress: 'Progreso',
      error: 'Ocurrió un error al leer el archivo.',
      unsupportedFormat: 'Formato de archivo no soportado. Por favor sube una imagen (jpg, png) o archivo PDF.',
      processingError: 'Ocurrió un error al procesar el archivo.',
    },
    // OCR Results
    ocr: {
      extractedText: 'Texto Extraído',
      croppedPreview: 'Vista Previa del Área Recortada',
      noText: '(texto vacío)',
      region: 'Región',
      page: 'Página',
    },
    // Common
    common: {
      reset: 'Restablecer',
      save: 'Guardar',
      cancel: 'Cancelar',
      delete: 'Eliminar',
      edit: 'Editar',
      close: 'Cerrar',
      loading: 'Cargando...',
      error: 'Error',
      success: 'Éxito',
    },
    // Auth
    auth: {
      login: {
        title: 'Iniciar sesión',
        noAccount: '¿No tienes una cuenta?',
        signUpLink: 'Crear cuenta',
        button: 'Iniciar sesión',
        forgotPassword: '¿Olvidaste tu contraseña?',
      },
      signUp: {
        title: 'Crear cuenta',
        haveAccount: '¿Ya tienes una cuenta?',
        loginLink: 'Iniciar sesión',
        button: 'Registrarse',
      },
      social: {
        google: 'Continuar con Google',
        facebook: 'Continuar con Facebook',
        microsoft: 'Continuar con Microsoft',
      },
      separator: 'O',
      email: 'Correo electrónico',
      password: 'Contraseña',
      logout: 'Cerrar sesión',
    },
    // Errors
    errors: {
      noImage: 'Por favor selecciona una imagen.',
      noCropArea: 'Por favor agrega al menos un área de recorte.',
      ocrFailed: 'El procesamiento OCR falló.',
      processingError: 'Ocurrió un error durante el procesamiento OCR.',
    },
    // Pricing
    pricing: {
      title: 'Precios',
      subtitle: 'Elige el plan que se adapte a tus necesidades',
      mostPopular: 'Más Popular',
      plans: {
        free: {
          name: 'Free',
          subtitle: 'Prueba',
          target: 'Especifica manualmente las áreas a extraer. (Manual, Inconveniente, pero Preciso)',
          price: '₩0',
          period: '/ mes',
          button: 'Comenzar',
          features: {
            limit: 'Límite de 1 por día',
            pages: '3 páginas por documento',
            areas: '1 por página',
            extraction: 'Key:Value Básico',
            storage: 'Eliminado después de 24 horas',
            speed: 'Estándar',
          },
        },
        payPerUse: {
          name: 'Pay-per-Use',
          subtitle: 'Pago por uso',
          target: 'Especifica manualmente las áreas a extraer. (Manual, Inconveniente, pero Preciso)',
          price: '₩500',
          period: '/ uso',
          button: 'Comprar',
          features: {
            limit: 'Pago por uso',
            pages: '10 páginas por documento',
            areas: '5 por página',
            extraction: 'Key:Value Básico',
            storage: 'Almacenamiento de 7 días',
            speed: 'Estándar',
          },
        },
        pro: {
          name: 'Pro',
          subtitle: 'Suscripción',
          target: 'Solo sube. La IA encuentra automáticamente las áreas y extrae los valores. (Automático, Conveniente, Soporte de Alta Resolución)',
          price: '₩29,000',
          period: '/ mes',
          button: 'Comenzar Prueba Gratuita',
          features: {
            limit: '300 por mes (Credits)',
            pages: '50 páginas por documento',
            areas: 'Ilimitado por página',
            extraction: 'Soporte de prompt avanzado',
            storage: 'Almacenamiento de 1 año',
            speed: 'Rápido (Prioridad GPU)',
          },
        },
        flex: {
          name: 'Flex',
          subtitle: 'Pago por uso',
          target: 'Usuarios Ocasionales',
          price: '₩50,000',
          period: '/ 500 Credits',
          validity: 'Válido por 1 año',
          button: 'Comprar Credits',
          features: {
            limit: 'Sin límite',
            pages: 'Sin límite',
            areas: 'Ilimitado por página',
            extraction: 'Soporte de prompt avanzado',
            storage: 'Almacenamiento de 1 año',
            speed: 'Rápido',
          },
        },
        enterprise: {
          name: 'Enterprise',
          subtitle: 'Solución',
          target: 'Empresa, Gobierno, Procesamiento Masivo',
          price: 'Personalizado',
          button: 'Contactar Ventas',
          features: {
            limit: 'Ilimitado / On-premise',
            pages: 'Sin límite',
            areas: 'Ilimitado',
            extraction: 'Ajuste de modelo personalizado',
            storage: 'Almacenamiento permanente (servidor propio)',
            speed: 'Dedicado',
          },
        },
      },
      features: {
        limit: 'Cuota',
        pages: 'Límite de Páginas',
        areas: 'Áreas (Crop)',
        extraction: 'Extracción',
        storage: 'Almacenamiento',
        speed: 'Velocidad',
      },
      usageGuide: {
        title: 'Planes Gratuitos/De Pago',
        freePlan: {
          title: 'Plan Gratuito',
          description: 'Se proporciona 1 procesamiento OCR gratuito por mes.',
          note: 'OCR usando el plan gratuito solo admite extracción básica de Key:Value.',
        },
        paidPlan: {
          title: 'Planes de Pago',
          description: 'Pay-per-Use: ₩500 por uso, Pro: ₩29,000/mes, Flex: ₩50,000 / 500 Credits',
          note: 'OCR usando planes de pago admite prompts avanzados y resultados de extracción detallados.',
        },
        deductionCriteria: {
          title: 'Criterios de Deducción de Credits',
          item1: 'Se deduce 1 Credit por procesamiento OCR.',
          item2: 'Los Credits comprados se pueden usar durante 1 año desde la fecha de pago y expirarán automáticamente después del período de uso.',
          item3: 'El procesamiento fallido no deduce Credits.',
        },
        refundPolicy: {
          title: 'Política de Reembolso',
          item1: 'Los Credits no utilizados se pueden reembolsar dentro de 7 días desde la fecha de pago.',
          item2: 'Si el servicio ya se ha utilizado, el reembolso se calculará deduciendo el monto correspondiente al número de usos del monto prepagado.',
          item3: 'Para consultas de pago, por favor contacta al servicio al cliente.',
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
      if (saved && (saved === 'ko' || saved === 'en' || saved === 'ja' || saved === 'zh-CN' || saved === 'es')) {
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
          if (newLang === 'ko' || newLang === 'en' || newLang === 'ja' || newLang === 'zh-CN' || newLang === 'es') {
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

