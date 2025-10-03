# Todo Schema Migration Guide

이 가이드는 기존 `todos` 테이블의 스키마를 새로운 구조로 안전하게 마이그레이션하는 방법을 설명합니다.

## 마이그레이션 개요

### 변경 사항
- **이전**: `scheduled_time` (단일 타임스탬프)
- **이후**: `start_time`, `end_time`, `schedule_type`, `recurrence_*` (세분화된 스케줄링)

### 새로운 필드들
```sql
-- 스케줄 타입
schedule_type: 'anytime' | 'all_day' | 'timed'

-- 시간 정보
start_time: TIMESTAMPTZ (nullable)
end_time: TIMESTAMPTZ (nullable)

-- 반복 설정
recurrence_pattern: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom'
recurrence_interval: INTEGER (기본값: 1)
recurrence_end_date: DATE (nullable)
recurrence_count: INTEGER (nullable)
recurrence_days_of_week: INTEGER[] (nullable)
recurrence_day_of_month: INTEGER (nullable)
```

## 사전 준비

### 1. 환경 변수 설정
`.env.local` 파일에 다음 변수를 확인/추가:

```bash
# 필수 변수들
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# 마이그레이션을 위한 서비스 키 (권장)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**⚠️ 중요**: 서비스 롤 키가 없으면 익명 키를 사용하지만, RLS 정책 제한이 있을 수 있습니다.

### 2. 데이터베이스 백업
마이그레이션 전에 반드시 데이터베이스를 백업하세요:

1. **Supabase Dashboard 백업**:
   - Settings > Database > Backups에서 수동 백업 생성

2. **스크립트 자동 백업**:
   - 마이그레이션 스크립트가 자동으로 백업 테이블 생성
   - 추가로 JSON 파일로도 백업 저장

### 3. 사용자 공지
- 점검 시간 공지
- 잠시 서비스 중단 안내
- 예상 소요 시간: 10-30분 (데이터 양에 따라)

## 마이그레이션 단계

### 1단계: 드라이런 (Dry Run)
실제 변경 없이 마이그레이션을 시뮬레이션합니다.

```bash
npm run migrate:todos:dry-run
```

**확인사항**:
- ✅ 에러 없이 완료되는지
- ✅ 변환될 데이터 샘플 확인
- ✅ 예상 결과가 올바른지

**예시 출력**:
```
🚀 Starting Todo Schema Migration
📋 Mode: DRY RUN
⏰ Started at: 2025-01-26T10:30:00.000Z

🔍 Fetching existing todos...
📊 Found 150 todos to migrate

🔄 Simulating migration...
   Processing batch 1/3...
   Processing batch 2/3...
   Processing batch 3/3...

📊 Migration Results:
  ✅ Successful: 150
  ❌ Failed: 0
  📈 Total: 150

📋 Dry run completed. Changes that would be made:
  📝 todo-1:
     schedule_type: timed
     start_time: 2024-12-25T14:00:00.000Z
     end_time: 2024-12-25T15:00:00.000Z
     recurrence_pattern: none
     recurrence_interval: 1
     ... and 149 more todos

✅ Migration simulation completed successfully!
```

### 2단계: 실제 마이그레이션
```bash
npm run migrate:todos
```

**진행 과정**:
1. 📦 백업 테이블 생성
2. 🔍 기존 데이터 조회
3. 🔄 배치 단위로 데이터 변환
4. ✅ 마이그레이션 결과 검증
5. 📊 최종 보고서 출력

### 3단계: 애플리케이션 배포
마이그레이션 완료 후 새 코드를 배포합니다.

```bash
# 웹 배포
npm run build:web
npm run start

# 모바일 빌드
npm run build:mobile:fast
```

### 4단계: 검증
배포 후 다음을 확인합니다:

1. **기능 테스트**:
   - ✅ 할일 목록 정상 표시
   - ✅ 새로운 할일 생성
   - ✅ 스케줄 타입별 동작 확인
   - ✅ 시간 표시 정확성

2. **데이터 무결성**:
   - ✅ 기존 할일 데이터 보존
   - ✅ 완료 상태 유지
   - ✅ 생성/수정 시간 정확성

3. **성능 확인**:
   - ✅ 로딩 속도
   - ✅ 응답 시간
   - ✅ 메모리 사용량

### 5단계: 정리 (선택적)
충분한 검증 후 (1-2주) 옛 컬럼을 제거할 수 있습니다.

```bash
npm run migrate:todos:drop-old
```

**⚠️ 주의**: 이 작업은 되돌릴 수 없으므로 신중하게 결정하세요.

## 데이터 변환 로직

### scheduled_time → 새 스키마 변환 규칙

```typescript
function determineScheduleType(todo) {
  if (!todo.scheduled_time) {
    // 스케줄 없음 → 언제든지
    return {
      schedule_type: 'anytime'
    };
  }

  const date = new Date(todo.scheduled_time);
  
  if (date.getHours() === 0 && date.getMinutes() === 0) {
    // 00:00:00 → 종일
    return {
      schedule_type: 'all_day',
      start_time: date.toISOString()
    };
  } else {
    // 특정 시간 → 시간 지정 (1시간 duration)
    const endTime = new Date(date);
    endTime.setHours(endTime.getHours() + 1);
    
    return {
      schedule_type: 'timed',
      start_time: date.toISOString(),
      end_time: endTime.toISOString()
    };
  }
}
```

### 변환 예시

| 기존 scheduled_time | 새 스키마 |
|---|---|
| `null` | `schedule_type: 'anytime'` |
| `2024-12-25T00:00:00Z` | `schedule_type: 'all_day', start_time: '2024-12-25T00:00:00Z'` |
| `2024-12-25T14:30:00Z` | `schedule_type: 'timed', start_time: '2024-12-25T14:30:00Z', end_time: '2024-12-25T15:30:00Z'` |

## 트러블슈팅

### 일반적인 오류

#### 1. 권한 오류
```
Error: Failed to fetch todos: permission denied for table todos
```

**해결 방법**:
- `.env.local`에 `SUPABASE_SERVICE_ROLE_KEY` 추가
- 또는 RLS 정책 일시적 비활성화

#### 2. 네트워크 타임아웃
```
Error: fetch failed - network timeout
```

**해결 방법**:
- 인터넷 연결 확인
- Supabase 프로젝트 상태 확인
- 배치 크기 줄이기 (스크립트 내 `batchSize` 변경)

#### 3. 타입 오류
```
Error: invalid input syntax for type timestamp
```

**해결 방법**:
- 데이터 검증 로직 추가
- 잘못된 날짜 형식 수정

### 롤백 계획

#### 즉시 롤백 (마이그레이션 실패 시)
1. **이전 코드로 롤백**:
   ```bash
   git checkout HEAD~1  # 이전 커밋으로
   npm run build
   npm run start
   ```

2. **백업에서 데이터 복구**:
   ```sql
   -- Supabase SQL Editor에서 실행
   DROP TABLE todos;
   ALTER TABLE todos_backup_[timestamp] RENAME TO todos;
   ```

#### 부분 롤백 (특정 필드만)
```sql
-- 새 필드들을 기본값으로 리셋
UPDATE todos SET 
  schedule_type = 'anytime',
  start_time = NULL,
  end_time = NULL,
  recurrence_pattern = 'none',
  recurrence_interval = 1;
```

## 체크리스트

### 마이그레이션 전
- [ ] 환경 변수 설정 완료
- [ ] 데이터베이스 백업 생성
- [ ] 드라이런 성공적으로 완료
- [ ] 사용자 점검 공지
- [ ] 팀원들에게 마이그레이션 일정 공유

### 마이그레이션 중
- [ ] 실제 마이그레이션 성공
- [ ] 에러 없이 모든 todos 변환
- [ ] 백업 테이블 생성 확인
- [ ] 새 애플리케이션 배포

### 마이그레이션 후
- [ ] 기능 테스트 통과
- [ ] 데이터 무결성 확인
- [ ] 성능 이슈 없음
- [ ] 사용자 피드백 수집
- [ ] 모니터링 시스템 정상 동작

## 연락처

마이그레이션 중 문제가 발생하면:
- 🚨 **즉시 중단**: `Ctrl+C`로 스크립트 중단
- 📞 **개발팀 연락**: 기술적 지원 요청
- 📋 **이슈 기록**: 오류 메시지와 상황 기록

---

**마지막 업데이트**: 2025-01-26
**버전**: 1.0.0
**담당자**: 개발팀