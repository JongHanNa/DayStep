import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '환불 정책 - DayStep',
  description: 'DayStep 서비스 환불 정책',
};

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8 sm:p-10">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          환불 정책
        </h1>
        <p className="text-sm text-gray-500 mb-8">최종 수정일: 2025년 12월 3일</p>

        {/* 목차 */}
        <nav className="bg-gray-50 rounded-lg p-5 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">목차</h2>
          <ul className="space-y-2 text-blue-600">
            <li>
              <a href="#section1" className="hover:underline">
                1. 환불 정책 개요
              </a>
            </li>
            <li>
              <a href="#section2" className="hover:underline">
                2. 환불 가능 기간
              </a>
            </li>
            <li>
              <a href="#section3" className="hover:underline">
                3. 환불 절차
              </a>
            </li>
            <li>
              <a href="#section4" className="hover:underline">
                4. 환불 금액 산정
              </a>
            </li>
            <li>
              <a href="#section5" className="hover:underline">
                5. 환불 처리 기간
              </a>
            </li>
            <li>
              <a href="#section6" className="hover:underline">
                6. 환불 불가 사유
              </a>
            </li>
            <li>
              <a href="#section7" className="hover:underline">
                7. 구독 취소
              </a>
            </li>
            <li>
              <a href="#section8" className="hover:underline">
                8. 결제 대행사 안내
              </a>
            </li>
            <li>
              <a href="#section9" className="hover:underline">
                9. 문의처
              </a>
            </li>
          </ul>
        </nav>

        <p className="text-gray-600 mb-8">
          DayStep(이하 &quot;서비스&quot;)은 고객 만족을 최우선으로 생각합니다.
          유료 서비스 이용 시 발생할 수 있는 환불에 대한 정책을 아래와 같이
          안내드립니다.
        </p>

        {/* 제1조 */}
        <section id="section1" className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-2 mb-4">
            1. 환불 정책 개요
          </h2>
          <p className="text-gray-600 mb-4">
            DayStep의 유료 서비스(Pro 구독)에 대한 환불은 다음 원칙에 따라
            처리됩니다.
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>
              모든 결제는 Paddle.com을 통해 처리되며, 환불 또한 Paddle을 통해
              진행됩니다.
            </li>
            <li>
              환불 요청은 구매일로부터 일정 기간 내에만 가능하며, 이후에는
              제한될 수 있습니다.
            </li>
            <li>
              환불 처리 시 원결제 수단으로 환불되며, 처리 기간은 결제 수단에
              따라 다를 수 있습니다.
            </li>
          </ul>
        </section>

        {/* 제2조 */}
        <section id="section2" className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-2 mb-4">
            2. 환불 가능 기간
          </h2>

          <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">
              14일 전액 환불 보장
            </h3>
            <p className="text-gray-600">
              구독 결제 후 <strong>14일 이내</strong>에는 사용량에 관계없이 전액
              환불이 가능합니다. 서비스에 만족하지 못하신 경우, 언제든지 환불을
              요청하실 수 있습니다.
            </p>
          </div>

          <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">
            기간별 환불 정책
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-200 p-3 text-left font-semibold">
                    구분
                  </th>
                  <th className="border border-gray-200 p-3 text-left font-semibold">
                    환불 가능 기간
                  </th>
                  <th className="border border-gray-200 p-3 text-left font-semibold">
                    환불 금액
                  </th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr>
                  <td className="border border-gray-200 p-3">월간 구독</td>
                  <td className="border border-gray-200 p-3">결제일로부터 14일</td>
                  <td className="border border-gray-200 p-3">전액 환불</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 p-3">연간 구독</td>
                  <td className="border border-gray-200 p-3">결제일로부터 14일</td>
                  <td className="border border-gray-200 p-3">전액 환불</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 p-3">14일 이후</td>
                  <td className="border border-gray-200 p-3">
                    구독 기간 종료 전
                  </td>
                  <td className="border border-gray-200 p-3">
                    일할 계산 환불 (아래 참조)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 제3조 */}
        <section id="section3" className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-2 mb-4">
            3. 환불 절차
          </h2>
          <p className="text-gray-600 mb-4">환불을 요청하시려면 다음 방법 중 하나를 이용해 주세요.</p>

          <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">
            방법 1: 서비스 내 환불 요청
          </h3>
          <ol className="list-decimal list-inside text-gray-600 space-y-2 mb-4">
            <li>DayStep 앱 또는 웹에서 로그인</li>
            <li>설정 → 구독 관리로 이동</li>
            <li>&quot;환불 요청&quot; 버튼 클릭</li>
            <li>환불 사유 선택 및 제출</li>
          </ol>

          <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">
            방법 2: 이메일 환불 요청
          </h3>
          <p className="text-gray-600 mb-2">
            아래 정보와 함께 <strong>skwhdgks@gmail.com</strong>으로 이메일을
            보내주세요.
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>등록된 이메일 주소</li>
            <li>결제일 (영수증에 표시된 날짜)</li>
            <li>환불 사유</li>
          </ul>

          <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">
            방법 3: Paddle 고객 지원
          </h3>
          <p className="text-gray-600">
            결제 관련 문의는 Paddle 고객 지원을 통해서도 가능합니다. 결제 시
            수신한 영수증 이메일에서 &quot;Manage Subscription&quot; 또는
            &quot;Contact Support&quot; 링크를 이용하실 수 있습니다.
          </p>
        </section>

        {/* 제4조 */}
        <section id="section4" className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-2 mb-4">
            4. 환불 금액 산정
          </h2>

          <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">
            14일 이내 환불
          </h3>
          <p className="text-gray-600 mb-4">
            결제일로부터 14일 이내에 환불 요청 시, 사용 여부와 관계없이{' '}
            <strong>결제 금액 전액</strong>이 환불됩니다.
          </p>

          <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">
            14일 이후 환불 (일할 계산)
          </h3>
          <p className="text-gray-600 mb-4">
            14일 이후 환불 요청 시, 남은 구독 기간에 대해 일할 계산하여 환불합니다.
          </p>

          <div className="bg-gray-100 rounded-lg p-4 mb-4">
            <p className="text-gray-700 font-mono">
              환불 금액 = 결제 금액 × (남은 일수 / 전체 구독 일수)
            </p>
          </div>

          <p className="text-gray-600">
            <strong>예시:</strong> 월간 구독(₩1,100)을 10일 사용 후 환불 요청 시
            <br />
            환불 금액 = ₩1,100 × (20일 / 30일) = 약 ₩733
          </p>
        </section>

        {/* 제5조 */}
        <section id="section5" className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-2 mb-4">
            5. 환불 처리 기간
          </h2>
          <p className="text-gray-600 mb-4">
            환불 처리 기간은 결제 수단에 따라 다릅니다.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-200 p-3 text-left font-semibold">
                    결제 수단
                  </th>
                  <th className="border border-gray-200 p-3 text-left font-semibold">
                    예상 처리 기간
                  </th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr>
                  <td className="border border-gray-200 p-3">신용카드</td>
                  <td className="border border-gray-200 p-3">5-10 영업일</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 p-3">PayPal</td>
                  <td className="border border-gray-200 p-3">3-5 영업일</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 p-3">계좌이체</td>
                  <td className="border border-gray-200 p-3">5-7 영업일</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-gray-500 text-sm mt-4">
            * 실제 환불 소요 시간은 금융기관 사정에 따라 달라질 수 있습니다.
          </p>
        </section>

        {/* 제6조 */}
        <section id="section6" className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-2 mb-4">
            6. 환불 불가 사유
          </h2>
          <p className="text-gray-600 mb-4">
            다음의 경우에는 환불이 제한될 수 있습니다.
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>
              구독 기간이 종료된 후 환불 요청하는 경우
            </li>
            <li>
              이미 환불 처리가 완료된 건에 대해 재요청하는 경우
            </li>
            <li>
              서비스 이용약관을 위반하여 계정이 정지 또는 해지된 경우
            </li>
            <li>
              프로모션, 이벤트 등으로 무료 제공된 서비스의 경우
            </li>
            <li>
              구독 기간의 80% 이상 경과 후 환불 요청하는 경우 (14일 이내 제외)
            </li>
          </ul>
        </section>

        {/* 제7조 */}
        <section id="section7" className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-2 mb-4">
            7. 구독 취소
          </h2>
          <p className="text-gray-600 mb-4">
            환불을 원하지 않고 다음 결제만 방지하고 싶으신 경우, 구독을 취소하실 수
            있습니다.
          </p>

          <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">
            구독 취소 방법
          </h3>
          <ol className="list-decimal list-inside text-gray-600 space-y-2 mb-4">
            <li>DayStep 앱 또는 웹에서 로그인</li>
            <li>설정 → 구독 관리로 이동</li>
            <li>&quot;구독 취소&quot; 버튼 클릭</li>
            <li>취소 확인</li>
          </ol>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <p className="text-gray-700">
              <strong>참고:</strong> 구독을 취소하더라도 현재 구독 기간이 끝날
              때까지는 Pro 기능을 계속 이용하실 수 있습니다. 구독 기간 종료 후
              자동으로 무료 플랜으로 전환됩니다.
            </p>
          </div>
        </section>

        {/* 제8조 */}
        <section id="section8" className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-2 mb-4">
            8. 결제 대행사 안내
          </h2>
          <p className="text-gray-600 mb-4">
            DayStep의 결제는 <strong>Paddle.com Market Limited</strong>를 통해
            처리됩니다.
          </p>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
            <h3 className="font-semibold text-gray-900 mb-2">
              Paddle.com 안내
            </h3>
            <ul className="text-gray-600 space-y-1">
              <li>
                <strong>회사:</strong> Paddle.com Market Limited
              </li>
              <li>
                <strong>역할:</strong> 공식 판매자 (Merchant of Record)
              </li>
              <li>
                <strong>위치:</strong> 영국
              </li>
            </ul>
          </div>

          <p className="text-gray-600">
            Paddle은 DayStep의 공식 결제 대행사로서, 결제 처리, 영수증 발행,
            환불 처리를 담당합니다. 결제 관련 문의는 영수증 이메일에 포함된
            지원 링크를 통해 Paddle에 직접 문의하실 수도 있습니다.
          </p>
        </section>

        {/* 제9조 */}
        <section id="section9" className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-2 mb-4">
            9. 문의처
          </h2>
          <p className="text-gray-600 mb-4">
            환불 관련 문의사항이 있으시면 아래로 연락해 주세요.
          </p>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
            <h3 className="font-semibold text-gray-900 mb-2">고객 지원</h3>
            <ul className="text-gray-600 space-y-1">
              <li>
                <strong>이메일:</strong> skwhdgks@gmail.com
              </li>
              <li>
                <strong>응답 시간:</strong> 영업일 기준 1-2일 이내
              </li>
            </ul>
          </div>

          <p className="text-gray-500 text-sm mt-4">
            * 주말 및 공휴일에는 응답이 지연될 수 있습니다.
          </p>
        </section>

        {/* 부칙 */}
        <section className="mt-12 pt-8 border-t border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">부칙</h2>
          <p className="text-gray-600 mb-4">
            본 환불 정책은 2025년 12월 3일부터 시행됩니다.
          </p>
          <p className="text-gray-600">
            환불 정책은 서비스 운영 상황에 따라 변경될 수 있으며, 변경 시
            서비스 내 공지사항 및 이메일을 통해 사전 안내드립니다.
          </p>
        </section>

        <p className="text-center text-gray-400 text-sm mt-10">
          본 환불 정책은 2025년 12월 3일부터 시행됩니다.
        </p>
      </div>
    </div>
  );
}
