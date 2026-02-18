# DayStep 앱 아이콘 제작 가이드

DayStep 앱 아이콘을 디자인하고 등록하는 두 가지 경로를 안내합니다.

---

## 경로 A: 영감 리서치 → 디자인

레퍼런스를 충분히 수집한 후, 직접 디자인하거나 AI에 구체적 방향을 제시하는 방법입니다.

### 1단계: 레퍼런스 수집

| 사이트 | 용도 | 검색어 |
|--------|------|--------|
| [Dribbble](https://dribbble.com) | 완성 아이콘 영감 | `ADHD app icon`, `mental health app icon`, `mindfulness app icon minimal` |
| [Behance](https://www.behance.net) | 완성 아이콘 영감 | `wellness app icon gradient`, `self care app icon` |
| [Mobbin](https://mobbin.com) | 앱스토어 레퍼런스 | Health & Fitness, Productivity 카테고리 |
| [Flaticon](https://www.flaticon.com) | 아이콘 요소 소스 | `calm mind`, `daily routine`, `gentle progress` |
| [Noun Project](https://thenounproject.com) | 심볼/픽토그램 소스 | `mindful step`, `daily balance` |

**참고 앱**: Headspace, Calm, Finch, Structured, Bearable

### 2단계: 컨셉 결정

수집한 레퍼런스를 바탕으로 색상, 스타일, 모티브를 결정합니다.

### 3단계: 디자인 작업

Figma/Canva에서 직접 디자인하거나, 레퍼런스와 프롬프트를 조합해 AI로 구체화합니다.

### 4단계: AI로 구체화

레퍼런스 이미지를 첨부하며 아래 프롬프트를 사용합니다:

> "DayStep"이라는 성인 ADHD 일상 관리 앱의 아이콘을 만들어줘.
> ADHD의 신경생물학적 어려움을 실질적으로 해결하여 일상을 더 잘 돌볼 수 있게 돕는 앱이야.
> 따뜻하고 격려적인 "비난 없는 동반자" 느낌.
> 색상은 인디고→보라 그라데이션.
> 1024x1024 iOS 앱 아이콘. 텍스트 없이.

### 5단계: Xcode에 등록

아래 [공통: Xcode 등록](#공통-xcode-등록) 섹션 참고.

### 6단계: 웹 파비콘 교체

아래 [공통: 웹 파비콘 교체](#공통-웹-파비콘-교체) 섹션 참고.

---

## 경로 B: 바로 AI 생성

레퍼런스 없이 AI에 직접 프롬프트를 주어 빠르게 생성하는 방법입니다.

### 1단계: AI 생성

아래 추천 도구 중 하나를 선택해 프롬프트를 입력합니다:

| 도구 | 특징 | 비고 |
|------|------|------|
| [ChatGPT](https://chat.openai.com) | 대화형 반복 수정 편리, 접근성 좋음 | 이미지 생성 내장 |
| [Gemini (나노 바나나 프로)](https://gemini.google.com) | 텍스트 렌더링 정확, 4K 고해상도, 캐릭터 일관성 | 제미나이 앱에서 바로 사용 |
| [Recraft.ai](https://www.recraft.ai) | 벡터/SVG 출력, 아이콘 전용 모드, 일관된 스타일 | 아이콘 특화 |
| [Midjourney](https://www.midjourney.com) | 예술적 퀄리티 최상 | 후보정 필요할 수 있음 |
| [IconMaker.studio](https://iconmaker.studio) | iOS/Android 사이즈 자동 생성 | 앱 아이콘 전용 |

프롬프트:

> "DayStep"이라는 성인 ADHD 일상 관리 앱의 아이콘을 만들어줘.
> 이 앱은 ADHD의 신경생물학적 어려움(과제 시작 어려움, 동기 유지 불가, 시간 감각 왜곡, 작업 기억 결함 등)을 실질적으로 해결하여 일상을 더 잘 돌보고 할일을 미루지 않게 돕는 앱이야.
> 자극적이지 않으면서 희망적이고, 부드러운 차분함이 느껴지는 디자인.
> 색상은 인디고(#4F46E5)에서 보라(#8B5CF6) 그라데이션 배경.
> 1024x1024 iOS 앱 아이콘. 텍스트 없이. 미니멀하고 현대적.

### 2단계: 반복 수정

3~5회 수정을 거쳐 만족스러운 결과를 얻습니다.

### 3단계: 다운로드

1024x1024px PNG로 다운로드합니다.

### 4단계: Xcode에 등록

아래 [공통: Xcode 등록](#공통-xcode-등록) 섹션 참고.

### 5단계: 웹 파비콘 교체

아래 [공통: 웹 파비콘 교체](#공통-웹-파비콘-교체) 섹션 참고.

---

## 공통: Xcode 등록

1024x1024px PNG 아이콘을 준비한 후:

1. Xcode에서 `Images.xcassets` → `AppIcon` 열기
2. 1024x1024 아이콘을 드래그 앤 드롭
3. Xcode가 자동으로 필요한 크기를 생성

**경로**: `apps/mobile-rn/ios/DayStepRN/Images.xcassets/AppIcon.appiconset/`

## 공통: 웹 파비콘 교체

1. [realfavicongenerator.net](https://realfavicongenerator.net)에 1024x1024 아이콘 업로드
2. 플랫폼별 설정 확인 후 파비콘 패키지 생성
3. 다운로드 받은 파일을 `apps/web/public/`에 교체
