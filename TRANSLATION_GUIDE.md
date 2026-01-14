# 다국어 번역 추가 가이드

## 현재 상태
- 지원 언어: 한국어(ko), 영어(en)
- 번역 파일: `frontend/lib/i18n.ts`

## 새로운 언어 추가 방법

### 1. Language 타입 확장
`frontend/lib/i18n.ts` 파일에서:
```typescript
export type Language = 'ko' | 'en' | 'ja' | 'zh-CN' | 'zh-TW' | 'th' | 'vi' | 'ms' | 'id' | 'de' | 'fr' | 'es' | 'it' | 'ru';
```

### 2. translations 객체에 새 언어 추가
`translations` 객체에 새로운 언어 키를 추가하고, 모든 번역 키를 번역해야 합니다.

예시 (일본어 추가):
```typescript
const translations = {
  ko: { /* ... */ },
  en: { /* ... */ },
  ja: {
    nav: {
      home: 'ホーム',
      pricing: '料金プラン',
      history: '履歴',
      ocrService: 'IO-N;LINGO OCR',
    },
    // ... 모든 키를 번역
  },
  // ... 다른 언어들
}
```

### 3. LanguageToggle 컴포넌트 업데이트
`frontend/components/LanguageToggle.tsx`에서:
- `mapToSupportedLanguage` 함수에 새 언어 매핑 추가
- `supported: true`로 변경

### 4. useLanguage 훅 업데이트
`frontend/lib/i18n.ts`의 `useLanguage` 훅에서:
- localStorage 검증 로직에 새 언어 추가

## 번역 작업량
현재 번역 키는 약 200개 이상입니다. 각 언어마다 모든 키를 번역해야 합니다.

## 자동 번역 옵션
1. **Google Translate API** 사용 (유료)
2. **DeepL API** 사용 (유료)
3. **수동 번역** (정확하지만 시간 소요)

## 우선순위 언어 추천
1. 일본어 (ja) - 아시아 시장
2. 중국어 간체 (zh-CN) - 대규모 시장
3. 중국어 번체 (zh-TW) - 대만 시장
4. 태국어 (th) - 동남아시아 시장

