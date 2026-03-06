import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '가격 안내 - DayStep',
  description: 'DayStep Pro 구독 플랜 및 가격 안내',
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            DayStep Pro
          </h1>
          <p className="text-lg text-gray-600">
            소중한 관계를 더 깊게 관리하세요
          </p>
        </div>

        {/* 기능 소개 */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Pro 기능
          </h2>

          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </span>
              <div>
                <h3 className="font-medium text-gray-900">무제한 소중한 사람 등록</h3>
                <p className="text-gray-600 text-sm">관계를 맺고 싶은 모든 사람을 제한 없이 등록하세요</p>
              </div>
            </li>

            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </span>
              <div>
                <h3 className="font-medium text-gray-900">무제한 관심 기록 저장</h3>
                <p className="text-gray-600 text-sm">대화, 약속, 기념일 등 모든 소중한 순간을 기록하세요</p>
              </div>
            </li>

            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </span>
              <div>
                <h3 className="font-medium text-gray-900">관계 인사이트 & 통계</h3>
                <p className="text-gray-600 text-sm">관계 패턴을 분석하고 더 나은 관계를 만들어가세요</p>
              </div>
            </li>
          </ul>
        </div>

        {/* 가격 카드 */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* 월간 구독 */}
          <div className="bg-white rounded-lg shadow-md p-6 border-2 border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">월간 구독</h3>
            <p className="text-gray-500 text-sm mb-4">매월 자동 갱신</p>

            <div className="mb-6">
              <span className="text-4xl font-bold text-gray-900">₩5,500</span>
              <span className="text-gray-500">/월</span>
            </div>

            <ul className="space-y-2 text-sm text-gray-600 mb-6">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                모든 Pro 기능 이용
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                언제든지 해지 가능
              </li>
            </ul>

            <Link
              href="/adhd/settings/subscription"
              className="block w-full text-center bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 px-4 rounded-lg transition-colors"
            >
              구독하기
            </Link>
          </div>

          {/* 연간 구독 */}
          <div className="bg-white rounded-lg shadow-md p-6 border-2 border-blue-500 relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-blue-500 text-white text-sm font-medium px-3 py-1 rounded-full">
                33% 할인
              </span>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">연간 구독</h3>
            <p className="text-gray-500 text-sm mb-4">1년 약정 (최대 할인)</p>

            <div className="mb-2">
              <span className="text-4xl font-bold text-gray-900">₩44,000</span>
              <span className="text-gray-500">/년</span>
            </div>
            <p className="text-sm text-blue-600 mb-4">월 ₩3,667 (₩1,833 절약)</p>

            <ul className="space-y-2 text-sm text-gray-600 mb-6">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                모든 Pro 기능 이용
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                연간 ₩22,000 절약
              </li>
            </ul>

            <Link
              href="/adhd/settings/subscription"
              className="block w-full text-center bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              구독하기
            </Link>
          </div>
        </div>

        {/* 추가 정보 */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            자주 묻는 질문
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">결제는 어떻게 처리되나요?</h3>
              <p className="text-gray-600 text-sm">
                모든 결제는 Paddle.com을 통해 안전하게 처리됩니다.
                신용카드, PayPal 등 다양한 결제 수단을 지원합니다.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">환불이 가능한가요?</h3>
              <p className="text-gray-600 text-sm">
                결제 후 14일 이내에는 전액 환불이 가능합니다.
                자세한 내용은 <Link href="/refund" className="text-blue-600 hover:underline">환불 정책</Link>을 확인해 주세요.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">구독을 취소하면 어떻게 되나요?</h3>
              <p className="text-gray-600 text-sm">
                구독을 취소하더라도 현재 결제 기간이 끝날 때까지 Pro 기능을 계속 이용하실 수 있습니다.
                이후 자동으로 무료 플랜으로 전환됩니다.
              </p>
            </div>
          </div>
        </div>

        {/* 푸터 링크 */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <Link href="/terms" className="hover:text-gray-700 hover:underline">이용약관</Link>
          <span className="mx-2">·</span>
          <Link href="/privacy" className="hover:text-gray-700 hover:underline">개인정보처리방침</Link>
          <span className="mx-2">·</span>
          <Link href="/refund" className="hover:text-gray-700 hover:underline">환불정책</Link>
        </div>
      </div>
    </div>
  );
}
