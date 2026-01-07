'use client';

import { Upload, FileText, Layers, Sparkles } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { useState } from 'react';

interface LandingStateProps {
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

export default function LandingState({ onFileSelect, fileInputRef }: LandingStateProps) {
  const { t } = useLanguage();
  const [extractedItems, setExtractedItems] = useState(10);
  const timeSaved = (extractedItems * 2) / 60;

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center py-12 px-4">
      {/* Hero Section */}
      <div className="text-center mb-12 max-w-3xl">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          {t('landing.title')}
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          {t('landing.subtitle')}
        </p>
        
        {/* Drag & Drop Zone */}
        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            onChange={onFileSelect}
            className="hidden"
            id="file-upload-landing"
          />
          <label
            htmlFor="file-upload-landing"
            className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
          >
            <Upload className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-700 mb-2">
              {t('landing.dragDrop')}
            </p>
            <p className="text-sm text-gray-500">
              {t('landing.supportedFormats')}
            </p>
          </label>
        </div>
      </div>

      {/* ROI Calculator Widget */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-12 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('landing.roiCalculator.title')}
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          {t('landing.roiCalculator.description')}
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('landing.roiCalculator.itemsLabel')}
            </label>
            <input
              type="number"
              min="1"
              value={extractedItems}
              onChange={(e) => setExtractedItems(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="text-sm text-gray-600 mb-1">
              {t('landing.roiCalculator.timeSaved')}
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {timeSaved.toFixed(1)} {t('landing.roiCalculator.minutes')}
            </div>
          </div>
        </div>
      </div>

      {/* Bento Grid - Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center mb-4">
            <Layers className="w-8 h-8 text-blue-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">
              {t('landing.features.multiRegion.title')}
            </h3>
          </div>
          <p className="text-sm text-gray-600">
            {t('landing.features.multiRegion.description')}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center mb-4">
            <FileText className="w-8 h-8 text-blue-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">
              {t('landing.features.pdfSupport.title')}
            </h3>
          </div>
          <p className="text-sm text-gray-600">
            {t('landing.features.pdfSupport.description')}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center mb-4">
            <Sparkles className="w-8 h-8 text-blue-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">
              {t('landing.features.customPrompts.title')}
            </h3>
          </div>
          <p className="text-sm text-gray-600">
            {t('landing.features.customPrompts.description')}
          </p>
        </div>
      </div>
    </div>
  );
}

