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
        <p className="text-sm text-gray-500 mb-8">최종 수정일: 2025년 12월 30일</p>

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
                2. 14일 취소 권리
              </a>
            </li>
            <li>
              <a href="#section3" className="hover:underline">
                3. 취소 권리 예외
              </a>
            </li>
            <li>
              <a href="#section4" className="hover:underline">
                4. 구독 환불
              </a>
            </li>
            <li>
              <a href="#section5" className="hover:underline">
                5. 환불 절차
              </a>
            </li>
            <li>
              <a href="#section6" className="hover:underline">
                6. 환불 처리 기간
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
          DayStep(이하 &quot;서비스&quot;)의 결제는 Paddle.com을 통해 처리됩니다.
          본 환불 정책은 Paddle의 소비자 약관(Consumer Terms)을 따르며, 고객님의 권리를 보장합니다.
        </p>

        {/* 제1조 */}
        <section id="section1" className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-2 mb-4">
            1. 환불 정책 개요
          </h2>
          <p className="text-gray-600 mb-4">
            DayStep의 유료 서비스(Pro 구독)에 대한 환불은 다음 원칙에 따라 처리됩니다.
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>
              모든 결제는 Paddle.com을 통해 처리되며, 환불 또한 Paddle을 통해 진행됩니다.
            </li>
            <li>
              Paddle은 공식 판매자(Merchant of Record)로서 결제 처리, 영수증 발행, 환불 처리를 담당합니다.
            </li>
            <li>
              환불 처리 시 원결제 수단으로 환불되며, 환불로 인한 추가 수수료는 발생하지 않습니다.
            </li>
          </ul>
        </section>

        {/* 제2조 */}
        <section id="section2" className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-2 mb-4">
            2. 14일 취소 권리
          </h2>

          <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">
              14일 전액 환불 보장
            </h3>
            <p className="text-gray-600">
              거래 완료 후 <strong>14일 이내</strong>에는 별도의 사유 없이 취소하고
              전액 환불을 받으실 수 있습니다.
            </p>
          </div>

          <p className="text-gray-600 mb-4">
            14일 취소 기간은 거래가 완료된 다음 날부터 시작되며,
            취소 기간 만료 전에 취소 의사를 전달해 주시면 됩니다.
          </p>

          <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">
            환불 효과
          </h3>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>결제하신 전액이 환불됩니다.</li>
            <li>환불은 지체 없이, 취소 의사를 전달받은 날로부터 14일 이내에 처리됩니다.</li>
            <li>원결제 수단과 동일한 방법으로 환불되며, 환불 수수료는 발생하지 않습니다.</li>
          </ul>
        </section>

        {/* 제3조 */}
        <section id="section3" className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-2 mb-4">
            3. 취소 권리 예외
          </h2>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <p className="text-gray-700">
              <strong>중요:</strong> 디지털 콘텐츠의 다운로드, 스트리밍 또는 기타 방식으로
              이용을 시작한 경우, 또는 제품의 혜택을 이미 받은 경우에는 취소 권리가 적용되지 않습니다.
            </p>
          </div>

          <p className="text-gray-600 mb-4">
            DayStep Pro 구독의 경우, 서비스에 접속하여 Pro 기능을 사용하기 시작하면
            디지털 콘텐츠 이용이 시작된 것으로 간주됩니다.
          </p>

          <p className="text-gray-600">
            단, 이는 제품이 설명과 다르거나, 결함이 있거나, 목적에 맞지 않는 경우에 대한
            소비자 권리에는 영향을 미치지 않습니다.
          </p>
        </section>

        {/* 제4조 */}
        <section id="section4" className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-2 mb-4">
            4. 구독 환불
          </h2>

          <p className="text-gray-600 mb-4">
            구독 서비스의 경우, 다음 정책이 적용됩니다.
          </p>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
            <h3 className="font-semibold text-gray-900 mb-2">구독 취소 권리</h3>
            <p className="text-gray-600">
              최초 구독 시 14일 취소 권리가 적용됩니다.
              단, 자동 갱신 시에는 14일 취소 권리가 적용되지 않습니다.
            </p>
          </div>

          <p className="text-gray-600 mb-4">
            미사용 구독 기간에 대한 환불은 제공되지 않습니다.
            구독을 취소하시면 현재 결제 기간이 종료될 때까지 서비스를 계속 이용하실 수 있으며,
            이후 자동 갱신이 중단됩니다.
          </p>

          <p className="text-gray-600">
            환불은 Paddle의 재량에 따라 케이스별로 처리되며,
            사기, 환불 남용 또는 기타 조작적 행위의 증거가 발견될 경우 환불이 거부될 수 있습니다.
          </p>
        </section>

        {/* 제5조 */}
        <section id="section5" className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-2 mb-4">
            5. 환불 절차
          </h2>
          <p className="text-gray-600 mb-4">
            결제 플랫폼에 따라 환불 절차가 다릅니다. 해당 플랫폼의 고객 지원을 통해 환불을 요청해 주세요.
          </p>

          <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">
            웹에서 결제한 경우 (Paddle)
          </h3>
          <p className="text-gray-600 mb-2">
            Paddle 고객 지원을 통해 환불을 요청하실 수 있습니다.
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>결제 시 수신한 영수증 이메일에서 &quot;Manage Subscription&quot; 또는 &quot;Contact Support&quot; 링크 클릭</li>
            <li>또는 Paddle 고객 포털에서 직접 환불 요청</li>
          </ul>

          <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">
            iOS 앱에서 결제한 경우 (App Store)
          </h3>
          <p className="text-gray-600 mb-2">
            Apple을 통해 환불을 요청하실 수 있습니다.
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>
              <a
                href="https://reportaproblem.apple.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                reportaproblem.apple.com
              </a>
              에서 환불 요청
            </li>
            <li>또는 Apple 지원팀에 직접 문의</li>
          </ul>

          <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">
            Android 앱에서 결제한 경우 (Google Play)
          </h3>
          <p className="text-gray-600 mb-2">
            Google을 통해 환불을 요청하실 수 있습니다.
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>
              <a
                href="https://play.google.com/store/account/subscriptions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Google Play 구독 관리
              </a>
              에서 환불 요청
            </li>
            <li>또는 Google Play 고객센터에 직접 문의</li>
          </ul>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-6">
            <p className="text-gray-700">
              <strong>참고:</strong> 각 플랫폼의 환불 정책이 적용되며,
              환불 승인 여부는 해당 플랫폼의 재량에 따라 결정됩니다.
            </p>
          </div>
        </section>

        {/* 제6조 */}
        <section id="section6" className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-2 mb-4">
            6. 환불 처리 기간
          </h2>
          <p className="text-gray-600 mb-4">
            환불은 취소 의사를 전달받은 날로부터 14일 이내에 처리됩니다.
            실제 환불 반영 시간은 결제 수단에 따라 다를 수 있습니다.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-200 p-3 text-left font-semibold">
                    결제 수단
                  </th>
                  <th className="border border-gray-200 p-3 text-left font-semibold">
                    예상 반영 기간
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

        {/* 제7조 */}
        <section id="section7" className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-2 mb-4">
            7. 구독 취소
          </h2>
          <p className="text-gray-600 mb-4">
            환불을 원하지 않고 다음 결제만 방지하고 싶으신 경우, 구독을 취소하실 수
            있습니다. 현재 결제 기간 종료 최소 48시간 전에 취소해 주세요.
          </p>

          <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">
            웹에서 결제한 경우 (Paddle)
          </h3>
          <ol className="list-decimal list-inside text-gray-600 space-y-2 mb-4">
            <li>결제 시 수신한 영수증 이메일 확인</li>
            <li>&quot;Manage Subscription&quot; 링크 클릭</li>
            <li>Paddle 고객 포털에서 구독 취소</li>
          </ol>

          <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">
            iOS 앱에서 결제한 경우
          </h3>
          <ol className="list-decimal list-inside text-gray-600 space-y-2 mb-4">
            <li>iPhone 설정 앱 열기</li>
            <li>상단의 Apple ID 탭</li>
            <li>구독 → DayStep 선택</li>
            <li>구독 취소</li>
          </ol>

          <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">
            Android 앱에서 결제한 경우
          </h3>
          <ol className="list-decimal list-inside text-gray-600 space-y-2 mb-4">
            <li>Google Play 스토어 앱 열기</li>
            <li>프로필 아이콘 → 결제 및 구독</li>
            <li>구독 → DayStep 선택</li>
            <li>구독 취소</li>
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
            DayStep의 결제는 <strong>Paddle.com Market Limited</strong>를 통해 처리됩니다.
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
                <strong>주소:</strong> Judd House, 18-29 Mora Street, London, EC1V 8BT, UK
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

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <p className="text-gray-700">
              <strong>환불 문의:</strong> 환불은 결제한 플랫폼(Paddle, App Store, Google Play)을 통해
              직접 처리됩니다. 위 &quot;5. 환불 절차&quot;를 참고해 주세요.
            </p>
          </div>

          <p className="text-gray-600 mb-4">
            앱 기능, 버그 신고, 또는 일반적인 문의사항이 있으시면 아래로 연락해 주세요.
          </p>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
            <h3 className="font-semibold text-gray-900 mb-2">앱 관련 문의</h3>
            <ul className="text-gray-600 space-y-1">
              <li>
                <strong>이메일:</strong> skwhdgks@gmail.com
              </li>
              <li>
                <strong>문의 범위:</strong> 앱 기능, 버그 신고, 계정 문제, 기타 문의
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
            본 환불 정책은 2025년 12월 30일부터 시행됩니다.
          </p>
          <p className="text-gray-600">
            환불 정책은 서비스 운영 상황에 따라 변경될 수 있으며, 변경 시
            서비스 내 공지사항 및 이메일을 통해 사전 안내드립니다.
          </p>
        </section>

        <p className="text-center text-gray-400 text-sm mt-10">
          본 환불 정책은 2025년 12월 30일부터 시행됩니다.
        </p>
      </div>
    </div>
  );
}
