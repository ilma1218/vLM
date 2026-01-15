'use client';

import { useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { Check, Crown, Users, Building2, CreditCard, Info, FileText, AlertCircle, Briefcase, Sparkles } from 'lucide-react';
import LoginModal from '@/components/LoginModal';

export default function PricingPage() {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

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

        {/* Comparison Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-b border-gray-200">
                    {t('pricing.comparison.category')}
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-b border-gray-200">
                    {t('pricing.plans.free.name')} ({t('pricing.plans.free.subtitle')})
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-b border-gray-200">
                    {t('pricing.plans.pro.name')} ({t('pricing.plans.pro.subtitle')})
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-b border-gray-200 bg-blue-50">
                    {t('pricing.plans.expert.name')} ({t('pricing.plans.expert.subtitle')})
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-b border-gray-200">
                    {t('pricing.plans.businessFlex.name')} ({t('pricing.plans.businessFlex.subtitle')})
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-b border-gray-200">
                    {t('pricing.plans.enterprise.name')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {t('pricing.comparison.paymentMethod')}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    {t('pricing.plans.free.comparison.paymentMethod')}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    {t('pricing.plans.pro.comparison.paymentMethod')}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600 bg-blue-50">
                    {t('pricing.plans.expert.comparison.paymentMethod')}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    {t('pricing.plans.businessFlex.comparison.paymentMethod')}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    {t('pricing.plans.enterprise.comparison.paymentMethod')}
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {t('pricing.comparison.price')}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    {t('pricing.plans.free.comparison.price')}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    {t('pricing.plans.pro.comparison.price')}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600 bg-blue-50">
                    {t('pricing.plans.expert.comparison.price')}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    {t('pricing.plans.businessFlex.comparison.price')}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    {t('pricing.plans.enterprise.comparison.price')}
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {t('pricing.comparison.credits')}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    {t('pricing.plans.free.comparison.credits')}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    {t('pricing.plans.pro.comparison.credits')}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600 bg-blue-50">
                    {t('pricing.plans.expert.comparison.credits')}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    {t('pricing.plans.businessFlex.comparison.credits')}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    {t('pricing.plans.enterprise.comparison.credits')}
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {t('pricing.comparison.capacity')}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    {t('pricing.plans.free.comparison.capacity')}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    {t('pricing.plans.pro.comparison.capacity')}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600 bg-blue-50">
                    {t('pricing.plans.expert.comparison.capacity')}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    {t('pricing.plans.businessFlex.comparison.capacity')}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    {t('pricing.plans.enterprise.comparison.capacity')}
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {t('pricing.comparison.pageUnitPrice')}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    {t('pricing.plans.free.comparison.pageUnitPrice')}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    {t('pricing.plans.pro.comparison.pageUnitPrice')}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600 bg-blue-50">
                    {t('pricing.plans.expert.comparison.pageUnitPrice')}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    {t('pricing.plans.businessFlex.comparison.pageUnitPrice')}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    {t('pricing.plans.enterprise.comparison.pageUnitPrice')}
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {t('pricing.comparison.users')}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    {t('pricing.plans.free.comparison.users')}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    {t('pricing.plans.pro.comparison.users')}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600 bg-blue-50">
                    {t('pricing.plans.expert.comparison.users')}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    {t('pricing.plans.businessFlex.comparison.users')}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    {t('pricing.plans.enterprise.comparison.users')}
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {t('pricing.comparison.validity')}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    {t('pricing.plans.free.comparison.validity')}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    {t('pricing.plans.pro.comparison.validity')}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600 bg-blue-50">
                    {t('pricing.plans.expert.comparison.validity')}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    {t('pricing.plans.businessFlex.comparison.validity')}
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    {t('pricing.plans.enterprise.comparison.validity')}
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
    <LoginModal
      isOpen={showLoginModal}
      onClose={() => setShowLoginModal(false)}
      onSuccess={() => {
        setShowLoginModal(false);
        // 로그인 성공 후 다시 버튼 클릭하도록 (또는 자동으로 진행)
      }}
    />
    </>
  );
}

