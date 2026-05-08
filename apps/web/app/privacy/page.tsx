import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '개인정보 처리방침 - 일상투두',
  description: '일상투두 개인정보 처리방침',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8 sm:p-10">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          개인정보 처리방침
        </h1>
        <p className="text-sm text-gray-500 mb-8">최종 수정일: 2025년 1월 17일</p>

        {/* 목차 */}
        <nav className="bg-gray-50 rounded-lg p-5 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">목차</h2>
          <ul className="space-y-2 text-blue-600">
            <li>
              <a href="#section1" className="hover:underline">
                1. 개인정보의 수집 항목 및 방법
              </a>
            </li>
            <li>
              <a href="#section2" className="hover:underline">
                2. 개인정보의 수집 및 이용 목적
              </a>
            </li>
            <li>
              <a href="#section3" className="hover:underline">
                3. 개인정보의 보유 및 이용 기간
              </a>
            </li>
            <li>
              <a href="#section4" className="hover:underline">
                4. 개인정보의 제3자 제공
              </a>
            </li>
            <li>
              <a href="#section5" className="hover:underline">
                5. 개인정보 처리 위탁
              </a>
            </li>
            <li>
              <a href="#section6" className="hover:underline">
                6. 정보주체의 권리·의무 및 행사 방법
              </a>
            </li>
            <li>
              <a href="#section7" className="hover:underline">
                7. 개인정보의 파기 절차 및 방법
              </a>
            </li>
            <li>
              <a href="#section8" className="hover:underline">
                8. 개인정보 보호를 위한 기술적·관리적 조치
              </a>
            </li>
            <li>
              <a href="#section9" className="hover:underline">
                9. 쿠키 및 로컬 저장소 사용
              </a>
            </li>
            <li>
              <a href="#section10" className="hover:underline">
                10. 모바일 애플리케이션 권한
              </a>
            </li>
            <li>
              <a href="#section11" className="hover:underline">
                11. 개인정보 보호책임자
              </a>
            </li>
            <li>
              <a href="#section12" className="hover:underline">
                12. 개인정보 처리방침의 변경
              </a>
            </li>
          </ul>
        </nav>

        <p className="text-gray-600 mb-8">
          일상투두(이하 &quot;서비스&quot;)은 정보주체의 자유와 권리 보호를 위해
          「개인정보 보호법」 및 관계 법령이 정한 바를 준수하여, 적법하게
          개인정보를 처리하고 안전하게 관리하고 있습니다. 이에 「개인정보
          보호법」 제30조에 따라 정보주체에게 개인정보 처리에 관한 절차 및
          기준을 안내하고, 이와 관련한 고충을 신속하고 원활하게 처리할 수
          있도록 하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.
        </p>

        {/* 제1조 */}
        <section id="section1" className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-2 mb-4">
            1. 개인정보의 수집 항목 및 방법
          </h2>

          <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">
            가. 수집하는 개인정보 항목
          </h3>
          <p className="text-gray-600 mb-4">
            서비스는 회원가입, 상담, 서비스 제공 등을 위해 아래와 같은 개인정보를
            수집하고 있습니다.
          </p>

          <div className="overflow-x-auto mb-6">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-200 p-3 text-left font-semibold">
                    수집 항목
                  </th>
                  <th className="border border-gray-200 p-3 text-left font-semibold">
                    수집 방법
                  </th>
                  <th className="border border-gray-200 p-3 text-left font-semibold">
                    필수/선택
                  </th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr>
                  <td className="border border-gray-200 p-3">이메일 주소</td>
                  <td className="border border-gray-200 p-3">
                    회원가입 (이메일, Google OAuth)
                  </td>
                  <td className="border border-gray-200 p-3">필수</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 p-3">이름 (닉네임)</td>
                  <td className="border border-gray-200 p-3">
                    회원가입 (Google OAuth)
                  </td>
                  <td className="border border-gray-200 p-3">선택</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 p-3">
                    사용자 ID (자동 생성)
                  </td>
                  <td className="border border-gray-200 p-3">
                    회원가입 시 자동 생성
                  </td>
                  <td className="border border-gray-200 p-3">필수</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 p-3">연락처 정보</td>
                  <td className="border border-gray-200 p-3">
                    연락처 관리 기능 사용 시 (앱 내 저장)
                  </td>
                  <td className="border border-gray-200 p-3">선택</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">
            나. 서비스 이용 과정에서 자동으로 생성·수집되는 정보
          </h3>
          <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4">
            <li>접속 IP 주소</li>
            <li>쿠키 및 세션 정보</li>
            <li>서비스 이용 기록 (할일, 노트, 프로젝트 등)</li>
            <li>기기 정보 (운영체제, 앱 버전, 기기 모델명)</li>
            <li>접속 로그 (접속 시간, 오류 로그)</li>
          </ul>

          <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">
            다. 개인정보 수집 방법
          </h3>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>회원가입 및 서비스 이용 과정에서 정보주체가 직접 입력</li>
            <li>소셜 로그인 (Google OAuth) 연동</li>
            <li>서비스 이용 과정에서 자동 수집 (쿠키, 로그 분석 등)</li>
            <li>
              모바일 애플리케이션 권한 승인을 통한 수집 (연락처, 알림 등)
            </li>
          </ul>
        </section>

        {/* 제2조 */}
        <section id="section2" className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-2 mb-4">
            2. 개인정보의 수집 및 이용 목적
          </h2>
          <p className="text-gray-600 mb-4">
            서비스는 수집한 개인정보를 다음의 목적을 위해 활용합니다.
          </p>

          <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">
            가. 회원 가입 및 관리
          </h3>
          <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4">
            <li>
              회원 가입 의사 확인, 회원제 서비스 제공에 따른 본인 식별·인증
            </li>
            <li>회원자격 유지·관리, 서비스 부정이용 방지</li>
            <li>각종 고지·통지, 고충처리, 분쟁 조정을 위한 기록 보존</li>
          </ul>

          <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">
            나. 서비스 제공
          </h3>
          <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4">
            <li>할일 관리, 노트 작성, 프로젝트 관리 등 핵심 서비스 제공</li>
            <li>
              Second Brain 시스템 (Areas, Resources, Goals, Projects, Inbox)
              제공
            </li>
            <li>연락처 관리 기능 제공 (사용자 동의 시)</li>
            <li>데이터 백업 및 동기화 (웹/모바일)</li>
          </ul>

          <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">
            다. 서비스 개선 및 개발
          </h3>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>신규 서비스 개발 및 맞춤 서비스 제공</li>
            <li>통계학적 특성에 따른 서비스 제공 및 광고 게재</li>
            <li>
              서비스의 유효성 확인, 접속빈도 파악, 회원의 서비스 이용에 대한
              통계
            </li>
          </ul>
        </section>

        {/* 제3조 */}
        <section id="section3" className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-2 mb-4">
            3. 개인정보의 보유 및 이용 기간
          </h2>
          <p className="text-gray-600 mb-4">
            서비스는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터
            개인정보를 수집 시에 동의 받은 개인정보 보유·이용기간 내에서
            개인정보를 처리·보유합니다.
          </p>

          <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">
            가. 회원 정보
          </h3>
          <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4">
            <li>
              <strong>보유 기간:</strong> 회원 탈퇴 시까지
            </li>
            <li>
              <strong>보유 근거:</strong> 정보주체의 동의
            </li>
            <li>
              <strong>파기 시점:</strong> 회원 탈퇴 즉시 파기 (단, 법령에 따른
              보관 의무가 있는 경우 예외)
            </li>
          </ul>

          <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">
            나. 법령에 따른 보관 의무
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-200 p-3 text-left font-semibold">
                    보존 항목
                  </th>
                  <th className="border border-gray-200 p-3 text-left font-semibold">
                    보존 근거
                  </th>
                  <th className="border border-gray-200 p-3 text-left font-semibold">
                    보존 기간
                  </th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr>
                  <td className="border border-gray-200 p-3">
                    계약 또는 청약철회 등에 관한 기록
                  </td>
                  <td className="border border-gray-200 p-3">
                    전자상거래 등에서의 소비자보호에 관한 법률
                  </td>
                  <td className="border border-gray-200 p-3">5년</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 p-3">
                    대금결제 및 재화 등의 공급에 관한 기록
                  </td>
                  <td className="border border-gray-200 p-3">
                    전자상거래 등에서의 소비자보호에 관한 법률
                  </td>
                  <td className="border border-gray-200 p-3">5년</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 p-3">
                    소비자의 불만 또는 분쟁처리에 관한 기록
                  </td>
                  <td className="border border-gray-200 p-3">
                    전자상거래 등에서의 소비자보호에 관한 법률
                  </td>
                  <td className="border border-gray-200 p-3">3년</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 p-3">서비스 방문 기록</td>
                  <td className="border border-gray-200 p-3">통신비밀보호법</td>
                  <td className="border border-gray-200 p-3">3개월</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 제4조 */}
        <section id="section4" className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-2 mb-4">
            4. 개인정보의 제3자 제공
          </h2>
          <p className="text-gray-600 mb-4">
            서비스는 원칙적으로 정보주체의 개인정보를 수집·이용 목적으로 명시한
            범위 내에서 처리하며, 다음의 경우를 제외하고는 정보주체의 사전 동의
            없이는 본래의 목적 범위를 초과하여 처리하거나 제3자에게 제공하지
            않습니다.
          </p>

          <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">
            가. Supabase (Backend as a Service)
          </h3>
          <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4">
            <li>
              <strong>제공받는 자:</strong> Supabase Inc. (미국)
            </li>
            <li>
              <strong>제공 목적:</strong> 데이터베이스 호스팅, 사용자 인증, 파일
              스토리지 서비스 제공
            </li>
            <li>
              <strong>제공 항목:</strong> 이메일, 이름, 사용자 ID, 서비스 이용
              데이터
            </li>
            <li>
              <strong>보유 및 이용 기간:</strong> 회원 탈퇴 시 또는 제공 동의
              철회 시까지
            </li>
          </ul>

          <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">
            나. Paddle (결제 처리)
          </h3>
          <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4">
            <li>
              <strong>제공받는 자:</strong> Paddle.com Market Limited (영국)
            </li>
            <li>
              <strong>제공 목적:</strong> 유료 서비스 결제 처리
            </li>
            <li>
              <strong>제공 항목:</strong> 이메일, 결제 정보
            </li>
            <li>
              <strong>보유 및 이용 기간:</strong> 구독 해지 시 또는 결제 관련
              법적 보관 기간까지
            </li>
          </ul>

          <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">
            다. Google (OAuth 인증)
          </h3>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>
              <strong>제공받는 자:</strong> Google LLC (미국), 카카오 주식회사
              (대한민국)
            </li>
            <li>
              <strong>제공 목적:</strong> 소셜 로그인 인증 서비스 제공
            </li>
            <li>
              <strong>제공 항목:</strong> 이메일, 이름, 프로필 정보
            </li>
            <li>
              <strong>보유 및 이용 기간:</strong> 로그인 연동 해제 시까지
            </li>
          </ul>
        </section>

        {/* 제5조 */}
        <section id="section5" className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-2 mb-4">
            5. 개인정보 처리 위탁
          </h2>
          <p className="text-gray-600 mb-4">
            서비스는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리업무를
            위탁하고 있습니다.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-200 p-3 text-left font-semibold">
                    수탁업체
                  </th>
                  <th className="border border-gray-200 p-3 text-left font-semibold">
                    위탁 업무 내용
                  </th>
                  <th className="border border-gray-200 p-3 text-left font-semibold">
                    보유 및 이용 기간
                  </th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr>
                  <td className="border border-gray-200 p-3">Supabase Inc.</td>
                  <td className="border border-gray-200 p-3">
                    데이터베이스 호스팅, 사용자 인증, 파일 스토리지
                  </td>
                  <td className="border border-gray-200 p-3">
                    회원 탈퇴 시 또는 위탁 계약 종료 시까지
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-200 p-3">Vercel Inc.</td>
                  <td className="border border-gray-200 p-3">
                    웹 애플리케이션 호스팅
                  </td>
                  <td className="border border-gray-200 p-3">
                    서비스 종료 시까지
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-200 p-3">
                    Paddle.com Market Limited
                  </td>
                  <td className="border border-gray-200 p-3">결제 처리</td>
                  <td className="border border-gray-200 p-3">
                    구독 해지 시 또는 법적 보관 기간까지
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 제6조 */}
        <section id="section6" className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-2 mb-4">
            6. 정보주체의 권리·의무 및 행사 방법
          </h2>
          <p className="text-gray-600 mb-4">
            정보주체는 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수
            있습니다.
          </p>

          <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">
            가. 정보주체의 권리
          </h3>
          <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4">
            <li>개인정보 열람 요구</li>
            <li>개인정보 정정·삭제 요구</li>
            <li>개인정보 처리 정지 요구</li>
            <li>개인정보 제공 동의 철회 (회원 탈퇴)</li>
          </ul>

          <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">
            나. 권리 행사 방법
          </h3>
          <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4">
            <li>
              <strong>앱 내 설정:</strong> 모바일 앱 → 설정 → 계정 관리 → 회원
              탈퇴
            </li>
            <li>
              <strong>웹 설정:</strong> 웹사이트 → 설정 → 계정 관리 → 회원 탈퇴
            </li>
            <li>
              <strong>이메일 요청:</strong> skwhdgks@gmail.com 으로 요청
            </li>
          </ul>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-4">
            <p className="text-gray-700">
              <strong>주의사항:</strong> 회원 탈퇴 시 작성하신 모든 데이터 (할일,
              노트, 프로젝트 등)가 영구적으로 삭제되며 복구할 수 없습니다.
            </p>
          </div>
        </section>

        {/* 제7조 */}
        <section id="section7" className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-2 mb-4">
            7. 개인정보의 파기 절차 및 방법
          </h2>
          <p className="text-gray-600 mb-4">
            서비스는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가
            불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다.
          </p>

          <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">
            가. 파기 방법
          </h3>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>
              <strong>전자적 파일:</strong> 기록을 재생할 수 없는 기술적 방법을
              사용하여 삭제
            </li>
            <li>
              <strong>종이 문서:</strong> 분쇄기로 분쇄하거나 소각
            </li>
          </ul>
        </section>

        {/* 제8조 */}
        <section id="section8" className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-2 mb-4">
            8. 개인정보 보호를 위한 기술적·관리적 조치
          </h2>

          <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">
            가. 기술적 조치
          </h3>
          <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4">
            <li>
              <strong>암호화 통신:</strong> HTTPS 프로토콜을 통한 모든 데이터
              전송 암호화
            </li>
            <li>
              <strong>데이터베이스 보안:</strong> Supabase RLS (Row Level
              Security) 적용으로 사용자별 데이터 격리
            </li>
            <li>
              <strong>인증 토큰 관리:</strong> JWT 기반 인증, 자동 갱신
            </li>
            <li>
              <strong>비밀번호 암호화:</strong> bcrypt 해시 알고리즘 사용
            </li>
          </ul>

          <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">
            나. 관리적 조치
          </h3>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>개인정보 취급 최소화</li>
            <li>정기적 자체 감사 실시</li>
            <li>접근 권한 관리</li>
            <li>접속 기록 보관 및 위조·변조 방지</li>
          </ul>
        </section>

        {/* 제9조 */}
        <section id="section9" className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-2 mb-4">
            9. 쿠키 및 로컬 저장소 사용
          </h2>
          <p className="text-gray-600 mb-4">
            서비스는 이용자에게 맞춤형 서비스를 제공하기 위해 쿠키(Cookie) 및
            로컬 저장소를 사용합니다.
          </p>

          <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">
            서비스의 쿠키 사용 목적
          </h3>
          <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4">
            <li>로그인 세션 유지</li>
            <li>사용자 인증 상태 확인</li>
            <li>서비스 이용 통계 분석</li>
          </ul>

          <p className="text-gray-600">
            이용자는 브라우저 설정을 통해 쿠키 저장을 거부할 수 있습니다. 다만,
            쿠키 저장을 거부할 경우 로그인이 필요한 일부 서비스 이용에 어려움이
            있을 수 있습니다.
          </p>
        </section>

        {/* 제10조 */}
        <section id="section10" className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-2 mb-4">
            10. 모바일 애플리케이션 권한
          </h2>
          <p className="text-gray-600 mb-4">
            서비스의 모바일 애플리케이션은 다음과 같은 권한을 요청하며, 각 권한은
            해당 기능 사용 시에만 요청됩니다.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-200 p-3 text-left font-semibold">
                    권한
                  </th>
                  <th className="border border-gray-200 p-3 text-left font-semibold">
                    사용 목적
                  </th>
                  <th className="border border-gray-200 p-3 text-left font-semibold">
                    필수/선택
                  </th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr>
                  <td className="border border-gray-200 p-3">연락처</td>
                  <td className="border border-gray-200 p-3">
                    연락처 관리 기능 제공
                  </td>
                  <td className="border border-gray-200 p-3">선택</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 p-3">알림</td>
                  <td className="border border-gray-200 p-3">
                    할일 리마인더 및 푸시 알림 전송
                  </td>
                  <td className="border border-gray-200 p-3">선택</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 p-3">로컬 저장소</td>
                  <td className="border border-gray-200 p-3">
                    오프라인 데이터 저장 및 동기화
                  </td>
                  <td className="border border-gray-200 p-3">필수</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 제11조 */}
        <section id="section11" className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-2 mb-4">
            11. 개인정보 보호책임자
          </h2>
          <p className="text-gray-600 mb-4">
            서비스는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보
            처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와
            같이 개인정보 보호책임자를 지정하고 있습니다.
          </p>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">
              개인정보 보호책임자
            </h3>
            <ul className="text-gray-600 space-y-1">
              <li>
                <strong>성명:</strong> 나종한
              </li>
              <li>
                <strong>직책:</strong> 개발자
              </li>
              <li>
                <strong>이메일:</strong> skwhdgks@gmail.com
              </li>
            </ul>
          </div>

          <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">
            기타 개인정보 침해에 대한 신고나 상담이 필요하신 경우
          </h3>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>
              개인정보 침해신고센터 (한국인터넷진흥원 운영): (국번없이) 118 |
              privacy.kisa.or.kr
            </li>
            <li>
              개인정보 분쟁조정위원회: (국번없이) 1833-6972 | www.kopico.go.kr
            </li>
            <li>
              대검찰청 사이버범죄수사단: (국번없이) 1301 | www.spo.go.kr
            </li>
            <li>
              경찰청 사이버안전국: (국번없이) 182 | cyberbureau.police.go.kr
            </li>
          </ul>
        </section>

        {/* 제12조 */}
        <section id="section12" className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-2 mb-4">
            12. 개인정보 처리방침의 변경
          </h2>
          <p className="text-gray-600 mb-4">
            이 개인정보 처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른
            변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일
            전부터 공지사항을 통하여 고지할 것입니다.
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>
              <strong>공지 방법:</strong> 서비스 내 공지사항, 앱 푸시 알림,
              이메일
            </li>
            <li>
              <strong>사전 공지 기간:</strong> 변경 시행일 7일 전 (중요한
              변경사항의 경우 30일 전)
            </li>
            <li>
              <strong>시행일:</strong> 2025년 1월 17일
            </li>
          </ul>
        </section>

        <p className="text-center text-gray-400 text-sm mt-10">
          본 개인정보 처리방침은 2025년 1월 17일부터 시행됩니다.
        </p>
      </div>
    </div>
  );
}
