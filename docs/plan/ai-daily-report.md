# 일일 업무보고 자동 생성 기능

## 개요
대시보드에서 "금일 업무보고 출력" 버튼을 누르면, 오늘의 활동 데이터(작업 내역, 완료 건, 댓글 이력 등)를 수집하여 **템플릿 기반**으로 업무보고서를 자동 생성하는 기능

## 아키텍처 결정

### 템플릿 기반 (비용 0원)
- AI API 없이 DB 데이터를 구조화된 템플릿에 채워넣는 방식
- 즉시 응답 (DB 조회만), 외부 의존성 없음
- 나중에 AI를 붙이고 싶으면 서비스 레이어만 교체

### 데이터 수집 범위 (금일 기준)
1. **오늘 상태 변경된 일감** - updatedAt이 오늘인 건 (상태별 그룹핑)
2. **오늘 완료된 일감** - completedAt이 오늘인 건
3. **오늘 생성된 일감** - createdAt이 오늘인 건
4. **오늘 작성된 댓글** - 각 일감별 오늘 작성된 댓글 내용
5. **현재 진행중인 일감** - status = IN_PROGRESS

### 생성할 보고서 구조
```
[업무보고] 2026-03-13 (목)
━━━━━━━━━━━━━━━━━━━━━

■ 금일 완료
 - [프로젝트명] 일감 제목 (담당자)

■ 금일 진행
 - [프로젝트명] 일감 제목 - 진행 내용 요약 (댓글 기반)

■ 신규 등록
 - [프로젝트명] 일감 제목

■ 특이사항 / 이슈
 - (댓글 내용 기반으로 이슈 추출)

■ 익일 계획
 - 진행중 일감 기반 예측
```

## 구현 계획

### Phase 1: Backend (4개 파일)

#### 1-1. `application.yml` 수정
- `ai.anthropic.api-key: ${ANTHROPIC_API_KEY:}` 추가
- `ai.anthropic.model: claude-sonnet-4-20250514` 기본 모델 설정

#### 1-2. `AiReportService.java` (NEW)
- 금일 데이터 수집 로직 (TodoRepository, CommentRepository 활용)
- Claude API 호출 (RestTemplate)
- 프롬프트 구성: 수집된 데이터 → 구조화된 업무보고 요청
- 사용자별 보고서 생성 (본인 담당/생성 일감 중심)

#### 1-3. `AiReportController.java` (NEW)
- `POST /api/reports/daily` - 업무보고 생성 요청
  - Request: `{ date: "2026-03-13" }` (기본값: 오늘)
  - Response: `{ report: "생성된 보고서 텍스트", generatedAt: "..." }`

#### 1-4. `CommentRepository.java` 수정
- `findByCreatedAtBetween()` 쿼리 추가 (오늘 댓글 조회용)

### Phase 2: Frontend (4개 파일)

#### 2-1. `frontend/src/api/reports.js` (NEW)
- `generateDaily(date)` - POST /api/reports/daily 호출

#### 2-2. `frontend/src/components/report/DailyReportModal.jsx` (NEW)
- 모달 형태로 보고서 표시
- "생성 중..." 로딩 상태
- 생성된 보고서 텍스트 표시 (마크다운 or 포맷팅)
- 복사 버튼 (클립보드 복사)
- 닫기 버튼

#### 2-3. `frontend/src/components/dashboard/DashboardPage.jsx` 수정
- "금일 업무보고" 버튼 추가
- DailyReportModal 연동

#### 2-4. `frontend/src/styles/dailyReport.module.css` (NEW)
- 보고서 모달 스타일링

### Phase 3: 설정 & 보안
- API Key 환경변수 검증 (미설정 시 기능 비활성화)
- Rate limiting 고려 (1인 1일 N회 제한)

## 파일 변경 목록

| 파일 | 변경 | 설명 |
|------|------|------|
| `build.gradle` | 수정 | (필요시 JSON 라이브러리 추가) |
| `application.yml` | 수정 | AI API 설정 추가 |
| `AiReportService.java` | 신규 | AI 보고서 생성 서비스 |
| `AiReportController.java` | 신규 | API 엔드포인트 |
| `CommentRepository.java` | 수정 | 날짜 기반 댓글 조회 추가 |
| `frontend/src/api/reports.js` | 신규 | 프론트 API 클라이언트 |
| `DailyReportModal.jsx` | 신규 | 보고서 모달 컴포넌트 |
| `DashboardPage.jsx` | 수정 | 버튼 추가 |
| `dailyReport.module.css` | 신규 | 모달 스타일 |

## 의존성
- 외부: Anthropic Claude API (API Key 필요)
- 내부: 기존 TodoRepository, CommentRepository 재활용

## 리스크
- API Key 미설정 시 → 버튼 비활성화 + 안내 메시지
- API 응답 지연 (5~15초) → 로딩 UI 필수
- API 비용 → 모델 선택으로 조절 (sonnet 권장)
