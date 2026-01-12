'use client';

import { useState } from 'react';
import { X, Calculator } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

interface TimeSavingsCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TimeSavingsCalculator({ isOpen, onClose }: TimeSavingsCalculatorProps) {
  const { t } = useLanguage();
  const [pages, setPages] = useState<number>(1);
  const [areas, setAreas] = useState<number>(1);
  const [keyValuePairs, setKeyValuePairs] = useState<number>(1);

  // 비용 계산: 예상하는 페이지수 * 영역 개수 * 대략적인 key:value 건수
  const calculateTimeSaved = () => {
    // 각 영역당 평균 처리 시간 (분)
    const TIME_PER_AREA = 1;
    return pages * areas * keyValuePairs * TIME_PER_AREA;
  };

  const calculateMoneySaved = () => {
    const MINIMUM_WAGE_PER_HOUR = 10320;
    const timeSavedMinutes = calculateTimeSaved();
    return (timeSavedMinutes / 60) * MINIMUM_WAGE_PER_HOUR;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-2">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              {t('landing.calculator.title')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Input Fields */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t('landing.calculator.pages')}
            </label>
            <input
              type="number"
              min="1"
              value={pages}
              onChange={(e) => setPages(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t('landing.calculator.areas')}
            </label>
            <input
              type="number"
              min="1"
              value={areas}
              onChange={(e) => setAreas(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t('landing.calculator.keyValuePairs')}
            </label>
            <input
              type="number"
              min="1"
              value={keyValuePairs}
              onChange={(e) => setKeyValuePairs(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>
        </div>

        {/* Results */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 mb-6">
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-600 mb-1">
                {t('landing.calculator.timeSaved')}
              </div>
              <div className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {calculateTimeSaved().toLocaleString('ko-KR')} {t('landing.calculator.minutes')}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">
                {t('landing.calculator.moneySaved')}
              </div>
              <div className="text-2xl font-extrabold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                {calculateMoneySaved().toLocaleString('ko-KR')} {t('landing.statistics.won')}
              </div>
            </div>
          </div>
        </div>

        {/* Formula */}
        <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 mb-4">
          {t('landing.calculator.formula')}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          {t('common.close')}
        </button>
      </div>
    </div>
  );
}

