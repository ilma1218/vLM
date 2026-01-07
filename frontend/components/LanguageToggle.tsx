'use client';

import { Globe } from 'lucide-react';
import { useLanguage, Language } from '@/lib/i18n';

export default function LanguageToggle() {
  const { language, changeLanguage } = useLanguage();

  const toggleLanguage = () => {
    const newLang: Language = language === 'ko' ? 'en' : 'ko';
    changeLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
      title={language === 'ko' ? 'Switch to English' : '한국어로 전환'}
    >
      <Globe className="w-4 h-4 mr-2" />
      {language === 'ko' ? '한국어' : 'English'}
    </button>
  );
}

