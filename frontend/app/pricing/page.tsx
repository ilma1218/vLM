'use client';

import { useLanguage } from '@/lib/i18n';
import { Check, Crown, Users, Building2, CreditCard, Info, FileText, AlertCircle } from 'lucide-react';

export default function PricingPage() {
  const { t } = useLanguage();

  const plans = [
    {
      key: 'free',
      icon: <Users className="w-6 h-6" />,
      popular: false,
    },
    {
      key: 'payPerUse',
      icon: <CreditCard className="w-6 h-6" />,
      popular: false,
    },
    {
      key: 'pro',
      icon: <Crown className="w-6 h-6" />,
      popular: true,
    },
    {
      key: 'flex',
      icon: <Users className="w-6 h-6" />,
      popular: false,
    },
    {
      key: 'enterprise',
      icon: <Building2 className="w-6 h-6" />,
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
            {t('pricing.title')}
          </h1>
          <p className="text-xl text-gray-600">
            {t('pricing.subtitle')}
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
          {plans.map((plan) => {
            return (
              <div
                key={plan.key}
                className={`relative bg-white rounded-2xl shadow-lg border-2 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${
                  plan.popular
                    ? 'border-blue-500 scale-105'
                    : 'border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold shadow-lg">
                      {t('pricing.mostPopular')}
                    </span>
                  </div>
                )}

                <div className="p-6">
                  {/* Plan Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-lg ${
                      plan.popular
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {plan.icon}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">
                        {t(`pricing.plans.${plan.key}.name`)}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {t(`pricing.plans.${plan.key}.subtitle`)}
                      </p>
                    </div>
                  </div>

                  {/* Target */}
                  <p className="text-sm text-gray-600 mb-4">
                    {t(`pricing.plans.${plan.key}.target`)}
                  </p>

                  {/* Price */}
                  <div className="mb-6">
                    <div className="flex items-baseline">
                      <span className="text-3xl font-extrabold text-gray-900">
                        {t(`pricing.plans.${plan.key}.price`)}
                      </span>
                      {t(`pricing.plans.${plan.key}.period`) !== `pricing.plans.${plan.key}.period` && (
                        <span className="text-gray-600 ml-1">
                          {t(`pricing.plans.${plan.key}.period`)}
                        </span>
                      )}
                    </div>
                    {t(`pricing.plans.${plan.key}.validity`) !== `pricing.plans.${plan.key}.validity` && (
                      <p className="text-sm text-gray-500 mt-1">
                        {t(`pricing.plans.${plan.key}.validity`)}
                      </p>
                    )}
                  </div>

                  {/* Button */}
                  <button
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors mb-6 ${
                      plan.popular
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    {t(`pricing.plans.${plan.key}.button`)}
                  </button>

                  {/* Features */}
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-xs font-semibold text-gray-500">
                          {t('pricing.features.limit')}:
                        </span>
                        <p className="text-sm text-gray-900">{t(`pricing.plans.${plan.key}.features.limit`)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-xs font-semibold text-gray-500">
                          {t('pricing.features.pages')}:
                        </span>
                        <p className="text-sm text-gray-900">{t(`pricing.plans.${plan.key}.features.pages`)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-xs font-semibold text-gray-500">
                          {t('pricing.features.areas')}:
                        </span>
                        <p className="text-sm text-gray-900">{t(`pricing.plans.${plan.key}.features.areas`)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-xs font-semibold text-gray-500">
                          {t('pricing.features.extraction')}:
                        </span>
                        <p className="text-sm text-gray-900">{t(`pricing.plans.${plan.key}.features.extraction`)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-xs font-semibold text-gray-500">
                          {t('pricing.features.storage')}:
                        </span>
                        <p className="text-sm text-gray-900">{t(`pricing.plans.${plan.key}.features.storage`)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-xs font-semibold text-gray-500">
                          {t('pricing.features.speed')}:
                        </span>
                        <p className="text-sm text-gray-900">{t(`pricing.plans.${plan.key}.features.speed`)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Comparison Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-b border-gray-200">
                    구분
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-b border-gray-200">
                    Free (체험판)
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-b border-gray-200">
                    Pay-per-Use (1건당)
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-b border-gray-200 bg-blue-50">
                    Pro (구독형)
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-b border-gray-200">
                    Flex (충전형/종량제)
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-b border-gray-200">
                    Enterprise (솔루션)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    타겟
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    개인, 테스트 유저
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    간헐적 사용자, 테스트
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600 bg-blue-50">
                    프리랜서, 실무자
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    간헐적 사용자
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    기업, 관공서, 대량 처리
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    가격
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    ₩0 / 월
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    ₩500 / 건
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600 bg-blue-50">
                    ₩29,000 / 월
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    ₩50,000 / 500 Credits
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    별도 문의
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    제공량
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    1일 1건 제한
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    1건당 결제
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600 bg-blue-50">
                    월 300건 (Credits)
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    제한 없음
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    무제한 / 설치형
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    페이지 제한
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    문서당 3페이지
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    문서당 10페이지
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600 bg-blue-50">
                    문서당 50페이지
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    제한 없음
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    제한 없음
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    영역(Crop)
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    페이지당 1개
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    페이지당 5개
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600 bg-blue-50">
                    페이지당 무제한
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    페이지당 무제한
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    무제한
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    추출 항목
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    기본 Key:Value
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    기본 Key:Value
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600 bg-blue-50">
                    고급 프롬프트 지원
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    고급 프롬프트 지원
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    Custom 모델 튜닝
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    저장
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    24시간 후 삭제
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    7일 보관
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600 bg-blue-50">
                    1년 보관
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    1년 보관
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    영구 보관 (자사 서버)
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    속도
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    Standard
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    Standard
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600 bg-blue-50">
                    Fast (GPU 우선 할당)
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    Fast
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    Dedicated (전용)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Usage Guide and Refund Policy */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Usage Guide */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-blue-100 rounded-lg p-2">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                {t('pricing.usageGuide.title')}
              </h2>
            </div>

            <div className="space-y-6">
              {/* Free Plan */}
              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t('pricing.usageGuide.freePlan.title')}
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  {t('pricing.usageGuide.freePlan.description')}
                </p>
                <p className="text-xs text-gray-500">
                  {t('pricing.usageGuide.freePlan.note')}
                </p>
              </div>

              {/* Paid Plan */}
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t('pricing.usageGuide.paidPlan.title')}
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  {t('pricing.usageGuide.paidPlan.description')}
                </p>
                <p className="text-xs text-gray-500">
                  {t('pricing.usageGuide.paidPlan.note')}
                </p>
              </div>

              {/* Deduction Criteria */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {t('pricing.usageGuide.deductionCriteria.title')}
                </h3>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{t('pricing.usageGuide.deductionCriteria.item1')}</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{t('pricing.usageGuide.deductionCriteria.item2')}</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{t('pricing.usageGuide.deductionCriteria.item3')}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Refund Policy */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-orange-100 rounded-lg p-2">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                {t('pricing.usageGuide.refundPolicy.title')}
              </h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700">
                  {t('pricing.usageGuide.refundPolicy.item1')}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700">
                  {t('pricing.usageGuide.refundPolicy.item2')}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700">
                  {t('pricing.usageGuide.refundPolicy.item3')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

