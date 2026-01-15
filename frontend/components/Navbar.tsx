'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import LanguageToggle from './LanguageToggle';
import LoginModal from './LoginModal';
import { Coins, X, RefreshCw } from 'lucide-react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

type BillingUser = {
  email: string;
  plan_key: string | null;
  credits_balance: number;
};

type BillingUsageRow = {
  id: number;
  email: string;
  delta: number;
  reason: string;
  filename?: string | null;
  page_key: number;
  save_session_id?: string | null;
  meta?: string | null;
  created_at?: string | null;
};

export default function Navbar() {
  const { t } = useLanguage();
  const { isAuthenticated, user, logout } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [billingUser, setBillingUser] = useState<BillingUser | null>(null);
  const [billingUsage, setBillingUsage] = useState<BillingUsageRow[]>([]);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);

  const userEmail = user?.email || 'user@example.com';

  const formatNumber = useCallback((n: number) => n.toLocaleString('ko-KR'), []);
  const formatTime = useCallback((iso?: string | null) => {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('ko-KR');
  }, []);

  const fetchBilling = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setBillingLoading(true);
      setBillingError(null);

      const userRes = await fetch(
        `${BACKEND_URL}/billing/user?email=${encodeURIComponent(userEmail)}`
      );
      if (!userRes.ok) throw new Error('크레딧 정보를 불러오지 못했습니다.');
      const userData = (await userRes.json()) as BillingUser;
      setBillingUser(userData);

      const usageRes = await fetch(
        `${BACKEND_URL}/billing/usage?email=${encodeURIComponent(userEmail)}&limit=50`
      );
      if (!usageRes.ok) throw new Error('이용내역을 불러오지 못했습니다.');
      const usageData = (await usageRes.json()) as BillingUsageRow[];
      setBillingUsage(Array.isArray(usageData) ? usageData : []);
    } catch (e) {
      setBillingError(e instanceof Error ? e.message : '불러오기 중 오류가 발생했습니다.');
    } finally {
      setBillingLoading(false);
    }
  }, [isAuthenticated, userEmail]);

  // OCR 저장 등으로 크레딧이 변했을 때 즉시 갱신하기 위한 커스텀 이벤트
  useEffect(() => {
    if (!isAuthenticated) return;
    const onRefresh = () => {
      fetchBilling();
    };
    window.addEventListener('billing:refresh', onRefresh);
    return () => window.removeEventListener('billing:refresh', onRefresh);
  }, [isAuthenticated, fetchBilling]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchBilling();
  }, [isAuthenticated, fetchBilling]);

  const creditsLabel = useMemo(() => {
    const balance = billingUser?.credits_balance;
    if (typeof balance !== 'number') return 'Credits: -';
    return `Credits: ${formatNumber(balance)}`;
  }, [billingUser?.credits_balance, formatNumber]);
  
  return (
    <>
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
              <Link href="/pricing" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                {t('nav.pricing')}
              </Link>
              <Link href="/monitor" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                {t('nav.history')}
              </Link>
              <LanguageToggle />
              {isAuthenticated ? (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowBillingModal(true);
                      fetchBilling();
                    }}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-200"
                    title="크레딧/이용내역"
                  >
                    <Coins className="w-4 h-4" />
                    {creditsLabel}
                  </button>
                  <span className="text-sm text-gray-700">{user?.email}</span>
                  <button
                    onClick={logout}
                    className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    {t('auth.logout')}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="text-blue-600 hover:text-blue-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  {t('auth.login.title')}
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />

      {/* Billing Modal */}
      {showBillingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">크레딧 / 이용내역</h2>
                <p className="text-sm text-gray-600">{userEmail}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchBilling}
                  disabled={billingLoading}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${billingLoading ? 'animate-spin' : ''}`} />
                  새로고침
                </button>
                <button
                  type="button"
                  onClick={() => setShowBillingModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="닫기"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {billingError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                {billingError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="text-sm text-gray-700 font-semibold mb-1">현재 크레딧</div>
                <div className="text-2xl font-extrabold text-blue-700">
                  {typeof billingUser?.credits_balance === 'number' ? formatNumber(billingUser.credits_balance) : '-'}
                </div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="text-sm text-gray-700 font-semibold mb-1">플랜</div>
                <div className="text-lg font-bold text-gray-900">
                  {billingUser?.plan_key || '-'}
                </div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="text-sm text-gray-700 font-semibold mb-1">차감 기준</div>
                <div className="text-sm text-gray-700">
                  저장 시 <span className="font-bold">페이지당 10 credits</span>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                <div className="text-sm font-bold text-gray-900">최근 이용내역 (최대 50건)</div>
                {billingLoading && <div className="text-sm text-gray-600">불러오는 중...</div>}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-white border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">시간</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">구분</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">증감</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">파일/페이지</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {billingUsage.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                          이용내역이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      billingUsage.map((row) => (
                        <tr key={row.id} className="bg-white">
                          <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatTime(row.created_at)}</td>
                          <td className="px-4 py-3 text-gray-700">{row.reason}</td>
                          <td className={`px-4 py-3 text-right font-bold ${row.delta < 0 ? 'text-red-700' : 'text-green-700'}`}>
                            {row.delta < 0 ? '-' : '+'}{formatNumber(Math.abs(row.delta))}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            <div className="truncate max-w-[360px]">
                              {row.filename || '-'}
                              {row.page_key !== -1 && <span className="text-gray-500"> · p{row.page_key}</span>}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

