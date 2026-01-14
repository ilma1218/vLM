'use client';

import { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import { useLanguage, Language } from '@/lib/i18n';

// 지원되는 언어 목록
const LANGUAGES = [
  { code: 'en-US', name: 'English (US)', flag: '🇺🇸', supported: true },
  { code: 'en-GB', name: 'English (UK)', flag: '🇬🇧', supported: false },
  { code: 'en-AU', name: 'English (Australia)', flag: '🇦🇺', supported: false },
  { code: 'en-CA', name: 'English (Canada)', flag: '🇨🇦', supported: false },
  { code: 'en-NZ', name: 'English (New Zealand)', flag: '🇳🇿', supported: false },
  { code: 'en-IN', name: 'English (India)', flag: '🇮🇳', supported: false },
  { code: 'en-SG', name: 'English (Singapore)', flag: '🇸🇬', supported: false },
  { code: 'en-MY', name: 'English (Malaysia)', flag: '🇲🇾', supported: false },
  { code: 'en-PH', name: 'English (Philippines)', flag: '🇵🇭', supported: false },
  { code: 'en-HK', name: 'English (Hong Kong, SAR)', flag: '🇭🇰', supported: false },
  { code: 'en-INT', name: 'English (International)', flag: '🌐', supported: false },
  { code: 'ko', name: '한국어', flag: '🇰🇷', supported: true },
  { code: 'zh-CN', name: '简体中文', flag: '🇨🇳', supported: true },
  { code: 'zh-TW', name: '繁體中文', flag: '🇹🇼', supported: false },
  { code: 'ja', name: '日本語', flag: '🇯🇵', supported: true },
  { code: 'th', name: 'ไทย', flag: '🇹🇭', supported: false },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳', supported: false },
  { code: 'ms', name: 'Bahasa Malaysia', flag: '🇲🇾', supported: false },
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩', supported: false },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪', supported: false },
  { code: 'fr', name: 'Français', flag: '🇫🇷', supported: false },
  { code: 'es', name: 'Español (España)', flag: '🇪🇸', supported: true },
  { code: 'it', name: 'Italiano', flag: '🇮🇹', supported: false },
  { code: 'ru', name: 'Русский', flag: '🇷🇺', supported: false },
];

// 언어 코드를 실제 지원되는 언어로 매핑
const mapToSupportedLanguage = (code: string): Language => {
  if (code.startsWith('en') || code === 'en-INT') {
    return 'en';
  }
  if (code === 'ko') {
    return 'ko';
  }
  if (code === 'ja') {
    return 'ja';
  }
  if (code === 'zh-CN') {
    return 'zh-CN';
  }
  if (code === 'es') {
    return 'es';
  }
  // 지원되지 않는 언어는 기본값으로 영어 반환
  return 'en';
};

export default function LanguageToggle() {
  const { language, changeLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 현재 선택된 언어 찾기
  const currentLang = LANGUAGES.find(lang => {
    if (language === 'ko') return lang.code === 'ko';
    if (language === 'en') return lang.code === 'en-US';
    if (language === 'ja') return lang.code === 'ja';
    if (language === 'zh-CN') return lang.code === 'zh-CN';
    if (language === 'es') return lang.code === 'es';
    return false;
  }) || LANGUAGES[0];

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleLanguageSelect = (langCode: string) => {
    const supportedLang = mapToSupportedLanguage(langCode);
    changeLanguage(supportedLang);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
        title="언어 선택"
      >
        <Globe className="w-4 h-4 mr-2" />
        <span className="mr-1">{currentLang.flag}</span>
        <span className="hidden sm:inline">{currentLang.name}</span>
        <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
          <div className="p-2">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200 mb-1">
              언어 선택
            </div>
            <div className="grid grid-cols-1 gap-1">
              {LANGUAGES.map((lang) => {
                const isSupported = lang.supported;
                const isSelected = 
                  (language === 'ko' && lang.code === 'ko') ||
                  (language === 'en' && lang.code.startsWith('en') && lang.code === 'en-US') ||
                  (language === 'ja' && lang.code === 'ja') ||
                  (language === 'zh-CN' && lang.code === 'zh-CN') ||
                  (language === 'es' && lang.code === 'es');
                
                return (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageSelect(lang.code)}
                    disabled={!isSupported}
                    className={`
                      flex items-center px-3 py-2 text-sm rounded-md transition-colors text-left
                      ${isSelected 
                        ? 'bg-blue-50 text-blue-700 font-medium border border-blue-200' 
                        : 'text-gray-700 hover:bg-gray-50'
                      }
                      ${!isSupported ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    <span className="mr-3 text-lg">{lang.flag}</span>
                    <span className="flex-1">{lang.name}</span>
                    {isSelected && (
                      <span className="text-blue-600 font-bold">✓</span>
                    )}
                    {!isSupported && (
                      <span className="text-xs text-gray-400 ml-2">(준비중)</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

