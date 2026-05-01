# Uni-Mate 프론트-백엔드 데이터 저장/매핑/계산/화면 이동 레퍼런스

최종 갱신일: 2026-05-01

이 문서는 Uni-Mate의 온보딩, 대시보드, 설정 화면에서 사용하는 데이터 저장 규칙, 프론트-백엔드 매핑, 계산 로직, 화면 이동 시 동작을 레퍼런스 용도로 정리한 문서입니다.

## 1. 전체 저장 구조

Uni-Mate 데이터는 3개 층으로 관리됩니다.

| 계층 | 저장소 | 목적 |
| --- | --- | --- |
| 세션 초안 | `sessionStorage` | 로그인 후 로그오프 전까지 유지할 미저장 수정본 |
| 프론트 캐시 | `localStorage` | 화면 이동, 새로고침, 브라우저 재진입 시 빠른 복원 |
| 최종 저장소 | `backend/data/uni_mate.db` | 로그인 학생의 백엔드 기준 데이터 |

주요 프론트 훅은 다음입니다.

| 영역 | 파일 | 훅 |
| --- | --- | --- |
| 기본정보 | `frontend/lib/profile-storage.ts` | `useStudentProfile()` |
| 내신/모의고사/생기부 | `frontend/lib/score-storage.ts` | `useScoreRecords()` |
| 목표정보 | `frontend/lib/use-goals.ts` | `useGoals()` |

백엔드 최종 저장 로직은 `backend/app/services/onboarding_score_store.py`의 `OnboardingScoreStore`가 담당합니다.

## 2. 사용자 식별 규칙

프론트는 현재 로그인 사용자를 `getCurrentMember()?.userId`로 식별합니다.

- 로그인 사용자가 있으면 `userId`를 사용합니다.
- 로그인 사용자가 없으면 `"local-user"`를 사용합니다.
- 성적 저장소는 userId를 소문자로 정규화합니다.
- 백엔드 API는 `x-user-key` 헤더 또는 `userKey` 쿼리 파라미터로 사용자 키를 받습니다.
- 백엔드 `_resolve_user_id()`는 `TB_USER_AUTH.login_id`, `TB_USER.email`, 시드 학생명 매핑으로 `user_id`를 찾습니다.
- `kmj11`은 백엔드에서 `kmg11`로 통합 조회됩니다.

## 3. API와 Python 브릿지

프론트 API route는 `frontend/lib/python-bridge.ts`를 통해 `backend/app/cli/onboarding_scores_cli.py`를 실행합니다.

| API | 백엔드 entity | 기능 |
| --- | --- | --- |
| `/api/onboarding/profile` | `profile` | 기본정보 GET/POST |
| `/api/onboarding/profile-image` | `profile_image` | 프로필 이미지 저장 |
| `/api/onboarding/scores` | `scores` | 내신/모의고사/생기부 GET/POST |
| `/api/onboarding/goals` | `goals` | 목표정보 GET/POST |
| `/api/analysis/result` | `analysis` | 분석 결과 GET/POST |
| `/api/onboarding/guest-temp` | `guest_temp` | 비회원 임시저장 |

`/api/onboarding/scores`는 Python 브릿지 실패 시 `.data/onboarding-scores-{safeUser}.json`에 폴백 저장할 수 있습니다.

## 4. 세션 초안 및 미저장 변경 관리

`frontend/lib/draft-store.ts`가 sessionStorage 기반 초안을 관리합니다.

| 데이터 | 키 |
| --- | --- |
| 프로필 초안 | `uni-mate-draft-profile:{userId}` |
| 목표 초안 | `uni-mate-draft-goals:{userId}` |
| 성적 초안 | `uni-mate-draft-scores:{userId}` |
| 전체 dirty | `uni-mate-draft-dirty:{userId}` |
| 프로필 dirty | `uni-mate-draft-profile-dirty:{userId}` |
| 목표 dirty | `uni-mate-draft-goals-dirty:{userId}` |
| 성적 dirty | `uni-mate-draft-scores-dirty:{userId}` |

수정 시 동작은 다음입니다.

| 수정 영역 | 호출 | 결과 |
| --- | --- | --- |
| 기본정보 | `setDraftProfile()` | 프로필 초안 저장, 프로필 dirty true |
| 목표정보 | `setDraftGoals()` | 목표 초안 저장, 목표 dirty true |
| 성적/생기부 | `setDraftScores()` | 성적 초안 저장, 성적 dirty true |
| 성적 스냅샷 동기화 | `setDraftScoresSnapshot()` | 초안만 맞춤, dirty 설정 안 함 |

`isDraftDirty()`는 프로필/목표/성적/generic dirty 중 하나라도 있으면 `true`입니다.

`clearAllDrafts()`는 프로필, 목표, 성적 초안과 모든 dirty 플래그를 지웁니다.

## 5. 기본정보 저장 규칙

### 5.1 프론트 타입

기본정보는 `StudentProfile`로 관리됩니다.

- `name`
- `gradeLabel`
- `region`
- `district`
- `schoolName`
- `track`
- `targetYear`
- `profileImageUrl`
- `hasRequiredInfo`
- `hasScores`

### 5.2 로딩 우선순위

로그인 사용자:

1. `sessionStorage` draft
2. 백엔드 `/api/onboarding/profile`
3. `localStorage`
4. 빈 기본값

비로그인 `local-user`:

1. `sessionStorage` draft
2. `localStorage`
3. 빈 기본값

비로그인 사용자는 서버 프로필을 무시합니다.

### 5.3 수정 시 프론트 저장

기본정보 화면에서 입력값 변경 시 `updateField()`가 실행됩니다.

1. React 상태 갱신
2. `localStorage` 저장: `uni-mate-profile-memory:{userId}`
3. `sessionStorage` draft 저장
4. 프로필 dirty true
5. 백엔드 POST 없음

즉, 기본정보 화면에서 입력만 하면 프론트에는 유지되지만 DB에는 저장되지 않습니다.

### 5.4 백엔드 저장 시점

다음 시점에 `flushProfileToServer()`가 호출됩니다.

- 대시보드 `저장`
- 설정 로그아웃 모달의 `저장하고 나가기`
- 일부 동기 저장 함수 사용 시

프로필 이미지는 아바타 변경 시 `updateProfileImageAndSync()`로 즉시 `/api/onboarding/profile-image`에 저장됩니다.

### 5.5 DB 매핑

| 프론트 필드 | 백엔드 테이블/컬럼 |
| --- | --- |
| `name` | `TB_STUDENT_PROFILE.student_name` |
| `schoolName` | `TB_STUDENT_PROFILE.school_name` |
| `gradeLabel` | `student_grade`, `current_grade`, `grade_label` |
| `targetYear` | `TB_STUDENT_PROFILE.admission_year` |
| `region` | `region`, `residence_city_county` |
| `district` | `district`, `residence_town` |
| `track` | `TB_STUDENT_PROFILE.track` |
| `profileImageUrl` | `TB_USER.profile_image_url` |

### 5.6 기본정보 계산/자동화

`frontend/lib/admission-data.ts`:

- `examYears`: 2026~2036
- `suggestedTargetExamYear()`
  - `고3` -> 현재 연도
  - `고2` -> 현재 연도 + 1
  - `고1` -> 현재 연도 + 2
  - 그 외 -> `null`
- `clampExamYearToList()`는 목표연도를 `examYears` 범위 안으로 제한합니다.

기본정보 화면은 유형이 `고1/고2/고3`이면 수능 응시 년도를 자동 추천합니다. 이미 저장된 유효 연도는 최초 로딩 시 덮지 않고, 유형 변경 또는 초기 미설정 때만 갱신합니다.

## 6. 목표정보 저장 규칙

### 6.1 프론트 타입

목표정보는 `GoalChoice`로 관리됩니다.

- `university`
- `major`
- `priority`
- `strategyType`
- `status`
- `note`

현재 기본 목표:

1. `경희대학교 경영학과`
2. `서강대 경영학과`
3. `숭실대 경영학과`

### 6.2 대학명 정규화

`normalizeUniversityName()`:

| 입력 | 정규화 |
| --- | --- |
| `경희대` | `경희대학교` |
| `서강대학교` | `서강대` |
| `숭실대학교` | `숭실대` |
| `시립대` | `서울시립대` |
| `외대` | `한국외대` |
| `서울과기대학교` | `서울과기대` |

### 6.3 로딩 우선순위

로그인 사용자:

1. 목표 dirty가 true이고 draft가 있으면 draft
2. 백엔드 `/api/onboarding/goals`
3. 로컬 캐시
4. draft
5. 기본 목표

비로그인 사용자:

1. URL seed `g1/g2/g3`
2. draft
3. 서버 조회
4. 로컬 캐시
5. 기본 목표

비로그인이고 서버 목표가 없으면 `LDY01` 목표를 fallback으로 한 번 조회합니다.

### 6.4 수정 시 프론트 저장

목표설정 화면에서 대학/학과를 바꾸면 `updateGoals()`가 실행됩니다.

1. 상태 갱신
2. `localStorage` 저장: `uni-mate-goals:{userId}`
3. `sessionStorage` draft 저장
4. 목표 dirty true
5. 백엔드 POST 없음

백엔드 저장은 `flushGoalsToServer()`에서만 수행됩니다.

### 6.5 백엔드 저장

`/api/onboarding/goals` POST -> `save_goals()`

저장 절차:

1. 사용자/학생 식별
2. 해당 학생의 `TB_APPLICATION_LIST` 삭제
3. 해당 학생의 `TB_RECOMMENDATION` 삭제
4. 최대 3개 목표 순회
5. 대학/학과/현재연도로 `admission_id` 해결
6. `TB_APPLICATION_LIST` 삽입
7. `TB_RECOMMENDATION` 삽입

전략 구분:

| 순위 | `strategy_type` | `rec_score` |
| --- | --- | --- |
| 1순위 | `도전` | 80 |
| 2순위 | `적정` | 73 |
| 3순위 | `안정` | 66 |

DB 매핑:

| 개념 | 테이블 |
| --- | --- |
| 대학 | `TB_UNIVERSITY` |
| 학과 | `TB_DEPARTMENT` |
| 전형 | `TB_ADMISSION_TYPE` |
| 지원 목록 | `TB_APPLICATION_LIST` |
| 추천 목록 | `TB_RECOMMENDATION` |

`_resolve_goal_admission()`은 해당 대학/학과/연도/수시 전형이 없으면 신규 전형을 생성할 수 있습니다.

### 6.6 목표설정 탭별 입력 규칙

`frontend/app/onboarding/goals/page.tsx`의 `syncGoalsForMode()`가 적용합니다.

`학교 중심`:

- 1순위 대학을 2순위, 3순위 대학에도 복사합니다.
- 2·3순위 대학 셀렉트는 비활성화됩니다.
- 학과는 각 순위에서 선택할 수 있습니다.
- 복사된 대학에 기존 학과가 없으면 학과는 빈 값이 됩니다.

`학과 중심`:

- 1순위 학과를 2순위, 3순위 학과에도 복사합니다.
- 2·3순위 학과 셀렉트는 비활성화됩니다.
- 대학은 각 순위에서 선택할 수 있습니다.

`둘 다`:

- 대학과 학과를 모든 순위에서 자유롭게 선택할 수 있습니다.

탭 변경으로 값 동기화가 발생하면 수정으로 간주되어 목표 draft가 저장됩니다.

## 7. 성적/생기부 저장 규칙

### 7.1 프론트 저장 구조

성적은 `ScoreMemoryStore` 하나로 관리됩니다.

- `schoolRecords`: 내신
- `mockExams`: 모의고사
- `studentRecords`: 생기부/특기
- `uploads`: 업로드 파일 메타
- `activeTab`
- `selectedYear`
- `selectedTerm`
- `selectedStudentSchoolYear`
- `selectedStudentSemester`
- `selectedStudentRecordType`
- `updatedAt`
- `scoreSchemaVersion`

### 7.2 탭 구분

| 탭 key | 화면 라벨 |
| --- | --- |
| `schoolRecord` | 내신 |
| `mockExam` | 모의고사 |
| `studentRecord` | 특기 / 생기부 |

### 7.3 기간 규칙

내신:

- `1-midterm`: 1학기 중간
- `1-final`: 1학기 기말
- `2-midterm`: 2학기 중간
- `2-final`: 2학기 기말

모의고사:

- 고1/고2: 3월, 6월, 9월, 11월 전국연합
- 고3: 3월, 4월, 7월, 10월, 11월 전국연합/수능, 6월·9월 대학수학능력시험

생기부:

- 학기 단위만 사용합니다.
- `1-midterm`, `1-final` -> `1-final`
- `2-midterm`, `2-final` -> `2-final`

### 7.4 로딩 우선순위

`useScoreRecords()`:

1. 현재 사용자 키를 읽습니다.
2. `localStorage`에서 `uni-mate-score-memory:{userId}`를 읽습니다.
3. `/api/onboarding/scores?userKey=...`로 백엔드 스냅샷을 읽습니다.
4. `sessionStorage` 성적 draft를 읽습니다.
5. `isDraftScoresDirty()`가 true이고 draft가 있으면 draft 우선
6. 로그인 사용자이고 dirty가 없으면 server 우선, 없으면 local
7. `local-user`는 server/local 중 더 좋은 스냅샷 선택

`pickBetterSnapshot()` 비교 순서:

1. 저장된 성적 내용이 있는 쪽
2. `scoreContentRichness()`가 높은 쪽
3. 최신 `updatedAt`이 큰 쪽

김민지 데모 계정은 서버/로컬 모두 비어 있으면 시드 성적을 생성합니다.

### 7.5 수정 시 프론트 저장

성적 화면에서 점수/과목/생기부/업로드가 바뀌면 `commit()`이 실행됩니다.

1. 상태 갱신
2. `localStorage` 저장
3. `sessionStorage` draft 저장
4. 성적 dirty true
5. 백엔드 POST 없음

탭 변경, 기간 선택, 생기부 선택 상태 변경은 `markDirty: false`로 처리되어 dirty가 켜지지 않습니다.

### 7.6 성적 저장 버튼

`성적 저장하기`는 `handleSaveGrades()`를 실행합니다.

1. `flushStoreToServer()` 호출
2. `/api/onboarding/scores` POST
3. 성적 dirty false
4. 현재 활성 성적 레코드를 `저장된 성적 보기` 목록에 반영
5. 필요 시 모달 닫기

중요 규칙:

- 내신/모의고사 점수를 수정해도 `저장된 성적 보기`는 즉시 바뀌지 않습니다.
- `성적 저장하기`를 눌러야 저장된 성적 보기와 백엔드가 함께 갱신됩니다.
- 백엔드에서 불러온 성적은 초기 로딩 시 저장된 성적 보기에 표시됩니다.

### 7.7 메뉴 이동 시 성적 유지

성적 화면에서 다음/뒤로 이동 시 `flushStore()`만 호출합니다.

- `flushStore()`는 localStorage 저장만 합니다.
- 백엔드 저장은 하지 않습니다.
- 따라서 화면 이동으로 프론트 상태는 유지되지만 DB는 변경되지 않습니다.

### 7.8 백엔드 성적 저장

`/api/onboarding/scores` POST -> `save_snapshot()` -> `_upsert_score_payload()`

내신 저장:

- 기존 `TB_ACADEMIC_SCORE` 해당 학생 행 삭제
- `schoolRecords` 순회
- 각 과목을 `TB_ACADEMIC_SCORE`에 INSERT

| 프론트 | DB |
| --- | --- |
| `record.year` | `school_year` |
| `record.term` | `semester`, `exam_period` |
| `subject.subject` | `subject_name` |
| `subject.score` | `grade` |
| `사탐`/`과탐` | `subject_cat = 탐구` |
| 그 외 | `subject_cat = 내신` |

모의고사 저장:

- 기존 `TB_CSAT_SCORE` 해당 학생 행 삭제
- `mockExams` 순회
- term으로 `exam_type`, `exam_month` 계산
- 과목명으로 컬럼 매핑

| 과목 | DB 컬럼 |
| --- | --- |
| 국어 | `korean_grade` |
| 수학 | `math_grade` |
| 영어 | `english_grade` |
| 한국사 | `korean_history` |
| 사회탐구/사탐 | `social_grade` |
| 과학탐구/과탐 | `science_grade` |
| 언어영역/제2외국어 | `language2_grade` |
| 전체평균 | `total_score` |

생기부 저장:

- `studentRecords` 순회
- `recordId`가 있으면 업데이트
- 없으면 같은 학생/기록유형/학년/학기 row를 찾아 업데이트
- 없고 내용이 있으면 신규 삽입
- 중복 row 삭제

| 프론트 | DB |
| --- | --- |
| `schoolYear` | `TB_STUDENT_RECORD.school_year` |
| `semester` | `semester` |
| `recordType` | `record_type` |
| `subjectName` | `subject_name` |
| `description` | `content_body` |

## 8. 계산 로직

### 8.1 프론트 내신 평균

성적 화면의 내신 평균은 `grades/page.tsx`에서 계산합니다.

사용 값:

- 국어
- 수학
- 영어
- 사회탐구 선택 과목 평균
- 과학탐구 선택 과목 평균

계산 절차:

1. 각 점수를 숫자로 변환
2. 빈 값 제외
3. 합계 / 개수
4. 소수 둘째 자리로 표시

사용자가 직접 `overallAverage`를 입력했고 자동 계산값과 다르면 자동으로 덮지 않습니다.

### 8.2 프론트 모의고사 평균

`buildScoreSummary()`:

- 백엔드 `settingsDisplay.latestMockFourGradeAverage`가 있으면 우선 사용
- 없으면 `computeAverage(store.mockExams, true)`
- `latestOnly = true`라서 최신 모의고사 기간 하나만 평균에 사용합니다.

### 8.3 설정 화면 평균

백엔드가 `settingsDisplay`를 내려줍니다.

- `schoolGradeAverage`
- `latestMockFourGradeAverage`

내신 평균은 `TB_ACADEMIC_SCORE.grade` 기반입니다.

- 과목별 이수단위 가중 평균 계산
- 1지망 전공 기준 주요 과목군 선택
- 선택 과목 평균을 소수 2자리로 반환

모의고사 평균은 `TB_CSAT_SCORE` 최신 시험 기간 기준입니다.

### 8.4 목표/전략 카드 계산

`buildGoalAnalyses(goals)`:

- 최대 3개 목표 사용
- 대학별 `universityBaseScore` 사용
- `fitScore = clamp(getBaseScore(university) - index * 2, 25, 88)`
- `fitScore >= 72` -> 안정
- `fitScore >= 55` -> 적정
- 그 외 -> 도전

`buildStrategyRecommendations(goals)`:

1. 목표 3개를 추천 카드로 변환
2. 1지망 학과 키워드로 보완 추천 풀 선택
3. 중복 대학/학과 제거
4. 총 6개가 되도록 보완
5. 안정/적정/도전 구간이 비지 않도록 보장
6. 최종 6개 반환

`estimateEnglishPaceDelta(university, currentGradePoint)`:

- 대학별 base score로 목표 영어 등급 추정
- 현재 영어 등급과 목표 등급 차이 계산
- 최소 0.1 이상
- 소수 첫째 자리로 반환

## 9. 화면 이동 및 저장 규칙

### 9.1 공통 이동

`safeNavigate()`:

- Next router 이동 시도
- 180ms 안에 경로가 바뀌지 않으면 `window.location.assign()`으로 fallback

`mergeHrefWithSearchParams()`:

- 현재 쿼리 파라미터를 다음 href에 병합
- 이미 다음 href에 있는 쿼리는 유지

`OnboardingStep`:

- `nextHref`: 다음 단계
- `prevHref`: 이전 단계
- `helperLink`: 보조 링크
- `postPrevLink`: 이전 버튼 아래 추가 이동
- `onNext`: 다음 이동 전 실행할 콜백
- `nextDisabled`: 로딩 중 이동 방지

### 9.2 기본정보 화면

경로: `/onboarding/basic`

- 로딩 전에는 입력 폼 대신 로딩 카드 표시
- 다음: `/onboarding/grades`
- 수정 시 profile draft 저장
- 다음 이동 시 백엔드 저장 없음
- `returnTo`가 있으면 뒤로가기 라벨은 `호출한 메뉴로 돌아가기`

### 9.3 성적 화면

경로: `/onboarding/grades`

- 백엔드 성적을 먼저 로딩
- `tab`, `year`, `term` 쿼리로 초기 탭/기간 선택 가능
- 탭/기간 변경은 dirty 아님
- 점수/과목/생기부/업로드 변경은 dirty
- 다음 이동: `flushStore()` 후 `/onboarding/goals`
- 뒤로 이동: `flushStore()` 후 `/onboarding/basic`
- `flushStore()`는 localStorage만 저장
- `성적 저장하기`는 백엔드 저장

### 9.4 목표설정 화면

경로: `/onboarding/goals`

- 로그인 시 백엔드 목표정보 우선 표시
- 수정 전까지 백엔드 목표 유지
- 수정 후에는 세션 draft 우선
- 다음: `/analysis/loading?source=goals`
- 다음 이동 자체는 백엔드 저장하지 않음
- 대시보드 저장 또는 설정 로그아웃 저장에서 백엔드 저장

### 9.5 분석 로딩 화면

경로: `/analysis/loading?source=...`

- 분석 진행
- `/api/analysis/result`로 분석 결과 저장
- 완료 후 대시보드/호출 흐름으로 이동

### 9.6 대시보드

경로: `/dashboard`

읽는 훅:

- `useStudentProfile()`
- `useScoreRecords()`
- `useGoals()`

대시보드 저장:

로그인 사용자:

1. `flushProfileToServer()`
2. `flushStoreToServer()`
3. `flushGoalsToServer()`
4. `markDraftDirty(false)`
5. 저장 완료 안내 표시

비회원/게스트:

- 회원가입/임시저장 모달 표시
- 임시저장은 `/api/onboarding/guest-temp`에 profile/scores/goals snapshot 저장

목표 수정 버튼은 현재 목표를 `g1/g2/g3` 쿼리로 담아 `/onboarding/goals?returnTo=/dashboard...`로 이동합니다.

### 9.7 설정 화면

경로: `/settings`

수정 링크:

- 기본정보 수정 -> `/onboarding/basic?returnTo=/settings`
- 성적정보 수정 -> `/onboarding/grades?returnTo=/settings`
- 목표정보 수정 -> `/onboarding/goals?returnTo=/settings`
- 공개 정보 설정 -> `/settings/privacy`

로그아웃:

- `isDraftDirty() === false`: 일반 로그아웃 확인
- `isDraftDirty() === true`: 저장 여부 확인 모달 표시

저장하고 나가기:

1. 기본정보 저장
2. 성적 저장
3. 목표 저장
4. draft 삭제
5. 로그아웃

그냥 나가기:

1. 사용자별 localStorage profile/scores/goals 삭제
2. draft 삭제
3. 로그아웃

## 10. 백엔드 테이블 매핑 요약

| 테이블 | 용도 |
| --- | --- |
| `TB_USER` | 계정 기본 정보, 프로필 이미지, 마지막 활동 시각 |
| `TB_USER_AUTH` | 로그인 ID/권한 |
| `TB_STUDENT_PROFILE` | 학생 기본정보 |
| `TB_ACADEMIC_SCORE` | 내신 과목별 등급 |
| `TB_CSAT_SCORE` | 모의고사 과목군 등급 |
| `TB_STUDENT_RECORD` | 생기부/특기 기록 및 일부 snapshot |
| `TB_APPLICATION_LIST` | 목표 대학/학과 지원 목록 |
| `TB_RECOMMENDATION` | 목표 기반 추천 목록 |
| `TB_UNIVERSITY` | 대학 |
| `TB_DEPARTMENT` | 학과 |
| `TB_ADMISSION_TYPE` | 전형 |
| `TB_NOTIFICATION` | 저장/분석 알림 |
| `TB_AI_ANALYSIS` | 분석 결과 |
| `TB_GUEST_TEMP_SESSION` | 비회원 임시저장 |

## 11. 저장 버튼별 백엔드 반영 여부

| 동작 | 프론트 유지 | 백엔드 저장 |
| --- | --- | --- |
| 기본정보 입력 변경 | O | X |
| 기본정보 다음 이동 | O | X |
| 성적 입력 변경 | O | X |
| 성적 다음/뒤로 이동 | O | X |
| 성적 저장하기 | O | O |
| 목표 입력 변경 | O | X |
| 목표 다음 이동 | O | X |
| 대시보드 저장 | O | O |
| 설정 저장하고 로그아웃 | O | O |
| 설정 그냥 로그아웃 | 로컬/draft 삭제 | X |
| 프로필 이미지 변경 | O | O |
| 비회원 임시저장 | O | guest temp 저장 |

## 12. 운영 참고사항

- 화면 이동은 백엔드 저장이 아닙니다.
- 백엔드 최종 반영 기준은 `성적 저장하기`, `대시보드 저장`, `저장하고 로그아웃`입니다.
- 로그인 후 첫 로딩은 백엔드 우선입니다.
- 단, 세션 dirty draft가 있으면 draft가 우선합니다.
- 로그아웃 시 미저장 변경이 있으면 저장 여부 확인 모달이 떠야 합니다.
- `localStorage`는 캐시이고 최종 진실은 백엔드 DB입니다.
- `sessionStorage` draft는 로그오프 전까지 유지되는 수정본입니다.
- 성적 화면의 `저장된 성적 보기`는 백엔드 로딩 결과 또는 `성적 저장하기` 이후의 스냅샷입니다.
- 목표설정 탭 변경은 실제 목표값 동기화를 일으킬 수 있으므로 수정으로 간주됩니다.
