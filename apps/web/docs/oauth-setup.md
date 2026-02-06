# OAuth 설정 가이드

이 문서는 Supabase 대시보드에서 Google과 Kakao OAuth 프로바이더를 설정하는 방법을 안내합니다.

## 1. Google OAuth 설정

### Google Cloud Console 설정

1. [Google Cloud Console](https://console.cloud.google.com/)에 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. "APIs & Services" > "Credentials"로 이동
4. "Create Credentials" > "OAuth 2.0 Client IDs" 선택
5. Application type: "Web application" 선택
6. Name: "DayStep App" 입력
7. Authorized redirect URIs 추가:
   - `https://simbmdvtiukdbjxeepic.supabase.co/auth/v1/callback`
8. "Create" 클릭하여 Client ID와 Client Secret 획득

### Supabase 대시보드 설정

1. [Supabase Dashboard](https://supabase.com/dashboard)에서 프로젝트 접속
2. Authentication > Providers로 이동
3. Google 프로바이더 활성화
4. Google Cloud Console에서 얻은 정보 입력:
   - Client ID: `[Google OAuth 2.0 Client ID]`
   - Client Secret: `[Google OAuth 2.0 Client Secret]`
5. "Save" 클릭

## 2. Kakao OAuth 설정

### Kakao Developers 설정

1. [Kakao Developers](https://developers.kakao.com/)에 접속
2. "내 애플리케이션" > "애플리케이션 추가하기"
3. 앱 이름: "DayStep" 입력
4. 회사명: 개인 또는 회사명 입력
5. 애플리케이션 생성 후, "제품 설정" > "카카오 로그인" 활성화
6. "Redirect URI" 설정:
   - `https://simbmdvtiukdbjxeepic.supabase.co/auth/v1/callback`
7. "보안" > "Client Secret" 활성화
8. REST API 키와 Client Secret 확인

### Supabase 대시보드 설정

1. Authentication > Providers로 이동
2. "Add a new provider" > "Kakao" 선택
3. Kakao Developers에서 얻은 정보 입력:
   - Client ID: `[REST API 키]`
   - Client Secret: `[Client Secret]`
4. "Save" 클릭

## 3. Site URL 및 Redirect URL 설정

### Supabase 대시보드에서

1. Authentication > URL Configuration으로 이동
2. Site URL: `http://localhost:3000` (개발용)
3. Redirect URLs 추가:
   - `http://localhost:3000`
   - `http://localhost:3000/auth/callback`

## 4. 개발 환경용 설정

개발 중에는 이메일 확인을 비활성화할 수 있습니다:

1. Authentication > Settings로 이동
2. "Enable email confirmations" 체크 해제 (개발용)

## 5. 테스트

설정 완료 후:

1. 로그인 페이지에서 Google/Kakao 버튼 클릭
2. OAuth 인증 플로우 진행
3. 성공 시 애플리케이션으로 리다이렉트 확인

## 주의사항

- 프로덕션 환경에서는 적절한 도메인으로 URL 변경 필요
- Client Secret은 절대 클라이언트 사이드 코드에 노출하지 않음
- 정기적으로 OAuth 앱의 보안 설정 검토
