'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/i18n';
import LanguageToggle from './LanguageToggle';

export default function Navbar() {
  const { t } = useLanguage();
  
  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/" className="flex items-center px-2 py-2 text-xl font-semibold text-gray-900">
              {t('nav.ocrService')}
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors">
              {t('nav.home')}
            </Link>
            <Link href="/monitor" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors">
              {t('nav.history')}
            </Link>
            <LanguageToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}

