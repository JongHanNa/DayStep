import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '이용약관 - DayStep',
  description: 'DayStep 서비스 이용약관',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8 sm:p-10">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          이용약관
        </h1>
        <p className="text-sm text-gray-500 mb-8">최종 수정일: 2025년 12월 3일</p>

        {/* 목차 */}
        <nav className="bg-gray-50 rounded-lg p-5 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">목차</h2>
          <ul className="space-y-2 text-blue-600">
            <li>
              <a href="#section1" className="hover:underline">
                제1조 (목적)
              </a>
            </li>
            <li>
              <a href="#section2" className="hover:underline">
                제2조 (정의)
              </a>
            </li>
            <li>
              <a href="#section3" className="hover:underline">
                제3조 (약관의 효력 및 변경)
              </a>
            </li>
            <li>
              <a href="#section4" className="hover:underline">
                제4조 (서비스의 제공)
              </a>
            </li>
            <li>
              <a href="#section5" className="hover:underline">
                제5조 (회원가입)
              </a>
            </li>
            <li>
              <a href="#section6" className="hover:underline">
                제6조 (회원정보의 변경)
              </a>
            </li>
            <li>
              <a href="#section7" className="hover:underline">
                제7조 (회원 탈퇴 및 자격 상실)
              </a>
            </li>
            <li>
              <a href="#section8" className="hover:underline">
                제8조 (이용자의 의무)
              </a>
            </li>
            <li>
              <a href="#section9" className="hover:underline">
                제9조 (유료 서비스)
              </a>
            </li>
            <li>
              <a href="#section10" className="hover:underline">
                제10조 (환불 정책)
              </a>
            </li>
            <li>
              <a href="#section11" className="hover:underline">
                제11조 (면책조항)
              </a>
            </li>
            <li>
              <a href="#section12" className="hover:underline">
                제12조 (분쟁 해결)
              </a>
            </li>
          </ul>
        </nav>

        <p className="text-gray-600 mb-8">
          본 약관은 DayStep(이하 &quot;서비스&quot;)의 이용조건 및 절차, 회사와
          회원 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
        </p>

        {/* 제1조 */}
        <section id="section1" className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-2 mb-4">
            제1조 (목적)
          </h2>
          <p className="text-gray-600 mb-4">
            본 약관은 DayStep(이하 &quot;회사&quot;)이 제공하는 할일 관리 및
            생산성 서비스(이하 &quot;서비스&quot;)의 이용과 관련하여 회사와 회원
            간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로
            합니다.
          </p>
        </section>

        {/* 제2조 */}
        <section id="section2" className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-2 mb-4">
            제2조 (정의)
          </h2>
          <ol className="list-decimal list-inside text-gray-600 space-y-3">
            <li>
              <strong>&quot;서비스&quot;</strong>란 회사가 제공하는 할일 관리,
              프로젝트 관리, 노트 작성 등의 생산성 관련 서비스를 의미합니다.
            </li>
            <li>
              <strong>&quot;회원&quot;</strong>이란 본 약관에 동의하고 회사와
              이용계약을 체결하여 서비스를 이용하는 자를 말합니다.
            </li>
            <li>
              <strong>&quot;계정&quot;</strong>이란 회원의 식별과 서비스 이용을
              위하여 회원이 설정하고 회사가 승인한 이메일 주소와 비밀번호의
              조합을 말합니다.
            </li>
            <li>
              <strong>&quot;유료 서비스&quot;</strong>란 회사가 유료로 제공하는
              프리미엄 기능 및 부가 서비스를 말합니다.
            </li>
          </ol>
        </section>

        {/* 제3조 */}
        <section id="section3" className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-2 mb-4">
            제3조 (약관의 효력 및 변경)
          </h2>
          <ol className="list-decimal list-inside text-gray-600 space-y-3">
            <li>
              본 약관은 서비스 화면에 게시하거나 기타의 방법으로 회원에게
              공지함으로써 효력이 발생합니다.
            </li>
            <li>
              회사는 필요한 경우 관련 법령을 위배하지 않는 범위에서 본 약관을
              변경할 수 있습니다.
            </li>
            <li>
              회사가 약관을 변경할 경우에는 적용일자 및 변경사유를 명시하여
              현행약관과 함께 서비스 초기화면에 그 적용일자 7일 이전부터
              공지합니다. 다만, 회원에게 불리한 약관 변경의 경우에는 30일
              이전부터 공지합니다.
            </li>
            <li>
              회원이 변경된 약관에 동의하지 않는 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다.
            </li>
          </ol>
        </section>

        {/* 제4조 */}
        <section id="section4" className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-2 mb-4">
            제4조 (서비스의 제공)
          </h2>
          <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">
            가. 서비스 내용
          </h3>
          <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4">
            <li>할일(Todo) 관리 및 일정 관리</li>
            <li>프로젝트 및 목표 관리</li>
            <li>노트 작성 및 관리</li>
            <li>Second Brain 시스템 (Areas, Resources, Goals, Projects, Inbox)</li>
            <li>데이터 동기화 (웹/모바일)</li>
            <li>기타 회사가 추가 개발하거나 제휴를 통해 제공하는 서비스</li>
          </ul>
          <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">
            나. 서비스 제공 시간
          </h3>
          <p className="text-gray-600 mb-4">
            서비스는 연중무휴, 1일 24시간 제공함을 원칙으로 합니다. 다만, 회사는
            시스템 점검, 증설 및 교체, 통신장애 등의 사유가 발생한 경우에는
            서비스의 전부 또는 일부를 일시적으로 중단할 수 있습니다.
          </p>
        </section>

        {/* 제5조 */}
        <section id="section5" className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-2 mb-4">
            제5조 (회원가입)
          </h2>
          <ol className="list-decimal list-inside text-gray-600 space-y-3">
            <li>
              이용자는 회사가 정한 가입 양식에 따라 회원정보를 기입한 후 본
              약관에 동의함으로써 회원가입을 신청합니다.
            </li>
            <li>
              회원가입은 이메일 주소를 통한 가입 또는 소셜 로그인(Google)을
              통해 할 수 있습니다.
            </li>
            <li>
              회사는 다음 각 호에 해당하는 신청에 대하여는 승낙을 하지 않거나
              사후에 이용계약을 해지할 수 있습니다.
              <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                <li>실명이 아니거나 타인의 명의를 이용한 경우</li>
                <li>허위의 정보를 기재하거나, 필수 정보를 기재하지 않은 경우</li>
                <li>
                  이전에 회원자격을 상실한 적이 있는 자로서 회사의 재가입 승낙을
                  얻지 못한 경우
                </li>
                <li>기타 회원으로 등록하는 것이 서비스 운영에 지장이 있는 경우</li>
              </ul>
            </li>
          </ol>
        </section>

        {/* 제6조 */}
        <section id="section6" className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-2 mb-4">
            제6조 (회원정보의 변경)
          </h2>
          <p className="text-gray-600 mb-4">
            회원은 개인정보관리화면을 통하여 언제든지 본인의 개인정보를 열람하고
            수정할 수 있습니다. 다만, 서비스 관리를 위해 필요한 이메일 주소
            등은 수정이 불가능합니다.
          </p>
        </section>

        {/* 제7조 */}
        <section id="section7" className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-2 mb-4">
            제7조 (회원 탈퇴 및 자격 상실)
          </h2>
          <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">
            가. 회원 탈퇴
          </h3>
          <p className="text-gray-600 mb-4">
            회원은 언제든지 서비스 내 설정 메뉴를 통해 탈퇴를 요청할 수 있으며,
            회사는 즉시 회원탈퇴를 처리합니다. 탈퇴 시 회원의 모든 데이터는
            영구적으로 삭제되며 복구가 불가능합니다.
          </p>
          <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">
            나. 자격 상실
          </h3>
          <p className="text-gray-600 mb-4">
            회사는 회원이 다음 각 호의 사유에 해당하는 경우 회원자격을 제한 및
            정지시킬 수 있습니다.
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>가입 신청 시에 허위 내용을 등록한 경우</li>
            <li>
              다른 사람의 서비스 이용을 방해하거나 그 정보를 도용하는 등
              전자상거래 질서를 위협하는 경우
            </li>
            <li>
              서비스를 이용하여 법령 또는 본 약관이 금지하거나 공서양속에
              반하는 행위를 하는 경우
            </li>
          </ul>
        </section>

        {/* 제8조 */}
        <section id="section8" className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-2 mb-4">
            제8조 (이용자의 의무)
          </h2>
          <p className="text-gray-600 mb-4">회원은 다음 행위를 하여서는 안됩니다.</p>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>신청 또는 변경 시 허위 내용의 등록</li>
            <li>타인의 정보 도용</li>
            <li>회사가 게시한 정보의 변경</li>
            <li>
              회사가 정한 정보 이외의 정보(컴퓨터 프로그램 등) 등의 송신 또는
              게시
            </li>
            <li>회사와 기타 제3자의 저작권 등 지적재산권에 대한 침해</li>
            <li>회사 및 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위</li>
            <li>
              외설 또는 폭력적인 메시지, 화상, 음성, 기타 공서양속에 반하는
              정보를 서비스에 공개 또는 게시하는 행위
            </li>
          </ul>
        </section>

        {/* 제9조 */}
        <section id="section9" className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-2 mb-4">
            제9조 (유료 서비스)
          </h2>
          <ol className="list-decimal list-inside text-gray-600 space-y-3">
            <li>
              회사는 프리미엄 기능을 포함한 유료 서비스를 제공할 수 있으며, 해당
              서비스의 요금 및 결제 방법은 서비스 내에 별도로 안내합니다.
            </li>
            <li>
              유료 서비스의 결제는 회사가 지정한 결제대행사(Paddle)를 통해
              처리됩니다.
            </li>
            <li>
              유료 서비스 이용 시 자동 결제를 선택한 경우, 회원이 해지하지 않는
              한 결제일에 자동으로 결제가 이루어집니다.
            </li>
            <li>
              회원은 서비스 내 설정에서 언제든지 자동 결제를 해지할 수 있습니다.
            </li>
          </ol>
        </section>

        {/* 제10조 */}
        <section id="section10" className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-2 mb-4">
            제10조 (환불 정책)
          </h2>
          <p className="text-gray-600 mb-4">
            유료 서비스의 환불에 대한 자세한 내용은{' '}
            <a href="/refund" className="text-blue-600 hover:underline">
              환불 정책
            </a>
            을 참조하시기 바랍니다.
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>
              구독 결제 후 14일 이내에는 사용량에 관계없이 전액 환불이
              가능합니다.
            </li>
            <li>
              14일 이후에는 남은 구독 기간에 대한 일할 계산 환불이 적용됩니다.
            </li>
            <li>
              환불 요청은 서비스 내 설정 또는 고객지원 이메일을 통해 가능합니다.
            </li>
          </ul>
        </section>

        {/* 제11조 */}
        <section id="section11" className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-2 mb-4">
            제11조 (면책조항)
          </h2>
          <ol className="list-decimal list-inside text-gray-600 space-y-3">
            <li>
              회사는 천재지변, 전쟁, 기타 불가항력적인 사유로 인하여 서비스를
              제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.
            </li>
            <li>
              회사는 회원의 귀책사유로 인한 서비스 이용의 장애에 대하여 책임을
              지지 않습니다.
            </li>
            <li>
              회사는 회원이 서비스를 이용하여 기대하는 수익을 상실한 것에 대하여
              책임을 지지 않으며, 그 밖의 서비스를 통하여 얻은 자료로 인한
              손해에 관하여 책임을 지지 않습니다.
            </li>
            <li>
              회사는 회원이 게재한 정보, 자료, 사실의 신뢰도, 정확성 등의
              내용에 관하여 책임을 지지 않습니다.
            </li>
          </ol>
        </section>

        {/* 제12조 */}
        <section id="section12" className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-2 mb-4">
            제12조 (분쟁 해결)
          </h2>
          <ol className="list-decimal list-inside text-gray-600 space-y-3">
            <li>
              회사와 회원 간에 발생한 전자상거래 분쟁에 관한 소송은 제소 당시의
              회원의 주소에 의하고, 주소가 없는 경우에는 거소를 관할하는
              지방법원의 전속관할로 합니다. 다만, 제소 당시 회원의 주소 또는
              거소가 분명하지 않거나 외국 거주자의 경우에는 민사소송법상의
              관할법원에 제기합니다.
            </li>
            <li>
              회사와 회원 간에 제기된 전자상거래 소송에는 대한민국 법을 적용합니다.
            </li>
          </ol>
        </section>

        {/* 부칙 */}
        <section className="mt-12 pt-8 border-t border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">부칙</h2>
          <p className="text-gray-600">
            본 약관은 2025년 12월 3일부터 시행됩니다.
          </p>
        </section>

        <p className="text-center text-gray-400 text-sm mt-10">
          본 이용약관은 2025년 12월 3일부터 시행됩니다.
        </p>
      </div>
    </div>
  );
}
