'use client';

import { Upload, FileText, Layers, Sparkles, TrendingUp, Calculator } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { useState, useEffect } from 'react';
import TimeSavingsCalculator from './TimeSavingsCalculator';
import { useAuth } from '@/hooks/useAuth';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

interface FileGroup {
  filename: string;
  records?: any[];  // 통계 화면에서는 사용하지 않으므로 optional
  total_records: number;
  pages_count?: number;
  areas_count?: number;
  money_saved?: number;
  time_saved_minutes?: number;
  time_basis?: 'standard' | 'advanced';
  latest_timestamp: string;
  first_timestamp?: string;
  date?: string;
  user_email_masked?: string;
}

interface LandingStateProps {
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  ocrMode?: 'standard' | 'advanced';
}

export default function LandingState({ onFileSelect, fileInputRef, ocrMode = 'standard' }: LandingStateProps) {
  const { t } = useLanguage();
  const { isAuthenticated, token, user } = useAuth();
  const [recentFiles, setRecentFiles] = useState<FileGroup[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [showCalculator, setShowCalculator] = useState(false);

  const userId = user?.email ? user.email : 'guest';

  // 최근 파일 통계 가져오기
  useEffect(() => {
    const fetchRecentStats = async () => {
      setIsLoadingStats(true);
      setStatsError(null);
      try {
        // 공개 통계: 전체 사용자 기준 최신순
        const response = await fetch(`${BACKEND_URL}/public/recent-savings?limit=6`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            setRecentFiles(data);
          }
        } else {
          setRecentFiles([]);
          setStatsError(t('landing.statistics.loadFailed'));
        }
      } catch (error) {
        console.error('Failed to fetch recent stats:', error);
        setRecentFiles([]);
        setStatsError(t('landing.statistics.loadFailed'));
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchRecentStats();
  }, [t]);


  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col py-12 px-4 bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section - Title */}
      <div className="text-center mb-12 max-w-7xl mx-auto w-full">
        <h1 className="text-6xl font-extrabold bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 bg-clip-text text-transparent mb-6">
          {t('landing.title')}
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
          {t('landing.subtitle')}
        </p>
      </div>

      {/* Main Content Area - Upload and Features Side by Side */}
      <div className="max-w-7xl mx-auto w-full mb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* Left: Drag & Drop Zone */}
          <div className="w-full flex">
            <div className="relative w-full">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.ppt,.pptx"
                onChange={onFileSelect}
                className="hidden"
                id="file-upload-landing"
                multiple={ocrMode === 'advanced'}
              />
              <label
                htmlFor="file-upload-landing"
                className="flex flex-col items-center justify-center w-full h-full border-2 border-dashed border-blue-300 rounded-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100/50 hover:border-blue-400 hover:from-blue-100 hover:via-indigo-100 hover:to-blue-200/60 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl group"
              >
                <div className="bg-white/80 rounded-full p-4 mb-6 group-hover:bg-white group-hover:scale-110 transition-transform duration-300 shadow-md">
                  <Upload className="w-10 h-10 text-blue-600" />
                </div>
                <p className="text-xl font-semibold text-gray-800 mb-3 group-hover:text-blue-700 transition-colors">
                  {t('landing.dragDrop')}
                </p>
                <p className="text-sm text-gray-600 font-medium">
                  {t('landing.supportedFormats')}
                </p>
              </label>
            </div>
          </div>

          {/* Right: Features Cards */}
          <div className="w-full flex">
            <div className="grid grid-cols-1 gap-5 w-full">
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group">
                <div className="flex items-center mb-4">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-3 mr-4 shadow-md group-hover:scale-110 transition-transform duration-300">
                    <Layers className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {t('landing.features.multiRegion.title')}
                  </h3>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed ml-[60px]">
                  {t('landing.features.multiRegion.description')}
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group">
                <div className="flex items-center mb-4">
                  <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-3 mr-4 shadow-md group-hover:scale-110 transition-transform duration-300">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                    {t('landing.features.pdfSupport.title')}
                  </h3>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed ml-[60px]">
                  {t('landing.features.pdfSupport.description')}
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group">
                <div className="flex items-center mb-4">
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-3 mr-4 shadow-md group-hover:scale-110 transition-transform duration-300">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
                    {t('landing.features.customPrompts.title')}
                  </h3>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed ml-[60px]">
                  {t('landing.features.customPrompts.description')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Section - Recent Savings */}
      <div className="w-full mb-12 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-2 mr-4 shadow-lg">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                {t('landing.statistics.title')}
              </h2>
            </div>
            <button
              onClick={() => setShowCalculator(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md"
            >
              <Calculator className="w-5 h-5" />
              {t('landing.calculator.title')}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoadingStats ? (
              <>
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-lg">
                  <div className="h-4 w-2/3 bg-gray-200 rounded mb-3" />
                  <div className="h-3 w-1/3 bg-gray-100 rounded mb-6" />
                  <div className="h-16 bg-gray-100 rounded" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-lg hidden md:block">
                  <div className="h-4 w-2/3 bg-gray-200 rounded mb-3" />
                  <div className="h-3 w-1/3 bg-gray-100 rounded mb-6" />
                  <div className="h-16 bg-gray-100 rounded" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-lg hidden lg:block">
                  <div className="h-4 w-2/3 bg-gray-200 rounded mb-3" />
                  <div className="h-3 w-1/3 bg-gray-100 rounded mb-6" />
                  <div className="h-16 bg-gray-100 rounded" />
                </div>
              </>
            ) : statsError ? (
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-lg">
                <div className="text-sm font-semibold text-red-700">{statsError}</div>
              </div>
            ) : recentFiles.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-lg">
                <div className="text-sm font-semibold text-gray-800">{t('landing.statistics.noRecords')}</div>
              </div>
            ) : (
              recentFiles.map((fileGroup, index) => {
                const moneySaved = fileGroup.money_saved || 0;
                const timeSavedMinutes =
                  typeof fileGroup.time_saved_minutes === 'number' ? fileGroup.time_saved_minutes : fileGroup.total_records;
                const displayUser =
                  fileGroup.user_email_masked ||
                  (isAuthenticated ? userId : 'unknown');
                return (
                  <div
                    key={index}
                    className="bg-white border border-gray-200 rounded-2xl p-5 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center mb-2">
                          <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg p-2 mr-3">
                            <FileText className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div
                              className="text-sm font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors"
                              title={fileGroup.filename}
                            >
                              {fileGroup.filename}
                            </div>
                            <div className="text-xs text-gray-500 font-medium mt-1">{displayUser}</div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 font-medium ml-[44px]">{formatDate(fileGroup.latest_timestamp)}</div>
                      </div>
                    </div>
                    <div className="space-y-3 pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full">
                          {t('landing.statistics.records')}: {fileGroup.total_records}개
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {/* 절약 시간 */}
                        <div>
                          <div className="text-xs text-gray-500 font-medium mb-1">{t('workspace.rightInspector.results.timeSaved')}</div>
                          <div className="text-lg font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            {Number.isInteger(timeSavedMinutes) ? timeSavedMinutes : timeSavedMinutes.toFixed(1)}{' '}
                            {t('workspace.rightInspector.results.minutes')}
                          </div>
                        </div>
                        {/* 절약 금액 */}
                        <div className="text-right">
                          <div className="text-xs text-gray-500 font-medium mb-1">{t('landing.statistics.saved')}</div>
                          <div className="text-lg font-extrabold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                            {Math.round(moneySaved).toLocaleString('ko-KR')} {t('landing.statistics.won')}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Time Savings Calculator Modal */}
      <TimeSavingsCalculator
        isOpen={showCalculator}
        onClose={() => setShowCalculator(false)}
      />
    </div>
  );
}


