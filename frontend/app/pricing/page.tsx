'use client';

import { useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { Check, Crown, Users, Building2, Info, FileText, AlertCircle, Briefcase, Sparkles, X } from 'lucide-react';
import LoginModal from '@/components/LoginModal';

export default function PricingPage() {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showExpertCaseModal, setShowExpertCaseModal] = useState(false);

  const plans = [
    {
      key: 'free',
      icon: <Users className="w-6 h-6" />,
      popular: false,
    },
    {
      key: 'pro',
      icon: <Crown className="w-6 h-6" />,
      popular: false,
    },
    {
      key: 'expert',
      icon: <Sparkles className="w-6 h-6" />,
      popular: false,
    },
    {
      key: 'businessFlex',
      icon: <Briefcase className="w-6 h-6" />,
      popular: true,
    },
    {
      key: 'enterprise',
      icon: <Building2 className="w-6 h-6" />,
      popular: false,
    },
  ];

  return (
    <>
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
                    onClick={() => {
                      // 자동 로그인으로 인증 체크 제거
                      // TODO: 실제 결제/가입 로직 구현
                      console.log(`Selected plan: ${plan.key}`);
                    }}
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors mb-6 ${
                      plan.popular
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    {t(`pricing.plans.${plan.key}.button`)}
                  </button>

                  {/* Expert Case Button */}
                  {plan.key === 'expert' && (
                    <button
                      type="button"
                      onClick={() => setShowExpertCaseModal(true)}
                      className="w-full mb-6 py-2.5 px-4 rounded-lg font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-200"
                    >
                      500페이지를 변환한다면?
                    </button>
                  )}

                  {/* Features */}
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-xs font-semibold text-gray-500">{t('pricing.comparison.paymentMethod')}:</span>
                        <p className="text-sm text-gray-900">{t(`pricing.plans.${plan.key}.comparison.paymentMethod`)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-xs font-semibold text-gray-500">{t('pricing.comparison.capacity')}:</span>
                        <p className="text-sm text-gray-900">{t(`pricing.plans.${plan.key}.comparison.capacity`)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-xs font-semibold text-gray-500">{t('pricing.comparison.credits')}:</span>
                        <p className="text-sm text-gray-900">{t(`pricing.plans.${plan.key}.comparison.credits`)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-xs font-semibold text-gray-500">{t('pricing.comparison.pageUnitPrice')}:</span>
                        <p className="text-sm text-gray-900">{t(`pricing.plans.${plan.key}.comparison.pageUnitPrice`)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-xs font-semibold text-gray-500">{t('pricing.comparison.users')}:</span>
                        <p className="text-sm text-gray-900">{t(`pricing.plans.${plan.key}.comparison.users`)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-xs font-semibold text-gray-500">{t('pricing.comparison.validity')}:</span>
                        <p className="text-sm text-gray-900">{t(`pricing.plans.${plan.key}.comparison.validity`)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
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
    <LoginModal
      isOpen={showLoginModal}
      onClose={() => setShowLoginModal(false)}
      onSuccess={() => {
        setShowLoginModal(false);
        // 로그인 성공 후 다시 버튼 클릭하도록 (또는 자동으로 진행)
      }}
    />

    {/* Expert 500-page case study modal */}
    {showExpertCaseModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-2">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                500페이지를 변환한다면?
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowExpertCaseModal(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="닫기"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
            {/* A */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <h3 className="text-base font-bold text-gray-900 mb-2">A. 작업 조건</h3>
              <ul className="space-y-1 text-sm text-gray-700">
                <li><span className="font-semibold">분량:</span> 500페이지 (Expert 팩 기준)</li>
                <li><span className="font-semibold">작업:</span> 페이지당 영역 2개 확인 + Key:Value 10개 추출 후 엑셀 입력</li>
                <li><span className="font-semibold">난이도:</span> 단순 타이핑이 아니라, 문맥을 읽고 판단해야 함 (Human Think Time 필수)</li>
              </ul>
            </div>

            {/* B */}
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <h3 className="text-base font-bold text-gray-900 mb-2">B. 사람(Human)이 할 경우</h3>
              <ul className="space-y-1 text-sm text-gray-700 mb-3">
                <li><span className="font-semibold">작업 속도:</span> 페이지당 평균 3분 소요 (현실적 기준)</li>
                <li className="text-gray-600">(내용 판독/Think 1분 + 타이핑 1분 + 검수 1분)</li>
                <li><span className="font-semibold">총 소요 시간:</span> 500장 × 3분 = 1,500분 = 25시간</li>
                <li className="text-gray-600">하루 8시간 근무 기준, 꼬박 3일 하고도 1시간이 더 걸립니다.</li>
              </ul>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="text-sm text-gray-800">
                  <span className="font-semibold">인건비 계산:</span> 시급 20,000원 기준 (기업 실질 인건비)
                </div>
                <div className="mt-1 text-lg font-extrabold text-red-700">
                  25시간 × 20,000원 = 500,000원
                </div>
              </div>
            </div>

            {/* C */}
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <h3 className="text-base font-bold text-gray-900 mb-2">C. IO-VISION(AI)이 할 경우</h3>
              <ul className="space-y-1 text-sm text-gray-700 mb-3">
                <li><span className="font-semibold">작업 속도:</span> 페이지당 약 3초</li>
                <li><span className="font-semibold">총 소요 시간:</span> 업로드/다운로드 포함 약 30분</li>
              </ul>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-sm text-gray-800">
                  <span className="font-semibold">비용:</span> Expert 팩 결제 금액
                </div>
                <div className="mt-1 text-lg font-extrabold text-blue-700">
                  300,000원
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={() => setShowExpertCaseModal(false)}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

