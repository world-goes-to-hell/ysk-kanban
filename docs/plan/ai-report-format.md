# 업무보고 AI 양식 추출 기능

## 목표
대시보드 "업무보고 출력" 모달(`DailyReportModal`)에 **[AI로 양식 추출]** 버튼을 추가한다.
사내 AI(OpenWebUI, `https://why.coreit.co.kr`)를 백엔드 프록시로 호출하여, 사용자가 편집한 업무
내용을 회사 표준 평문 양식으로 변환해 받는다.

## 확정 설계
- **입력**: 기존 집계 보고서(`finalReport`)를 편집 가능한 textarea에 프리필 → 사용자가 가감/수정
- **출력**: AI 표준 양식 결과가 기존 뷰를 대체 (복사 버튼 재사용)
- **토큰 주입**: `application.yml` + 환경변수(`OPENWEBUI_*`). 하드코딩·프론트 노출 금지
- **작성자**: 로그인 사용자 `displayName`. 부서 필드 없음 → 프롬프트 규칙대로 placeholder 유지

## 작업 항목

### 백엔드 (Spring Boot)
1. `application.yml`에 `openwebui.base-url/api-key/model` 추가 (env 주입, 기본값 빈값)
2. `AiReportFormatService` 신규 — `RestClient`로 OpenWebUI `/api/chat/completions` 호출
   - system 프롬프트 = 회사 표준 양식 규칙 전문 (평문/4칸 들여쓰기/마크다운 금지 등)
   - user 메시지 = `날짜 + 작성자(displayName) + 편집된 업무 텍스트`
   - `temperature: 0`, 미설정 시 IllegalStateException → 503 매핑
3. `DailyReportController`에 `POST /api/reports/ai-format` 추가 — body `{ workText, date }` → `{ report }`

### 프론트엔드
4. `api/reports.js`에 `aiFormat(workText, date)` 추가
5. `DailyReportModal.jsx`
   - AI 모드 상태(`aiMode`, `aiInput`, `aiResult`, `aiLoading`) 추가
   - 푸터에 [AI로 양식 추출] 버튼, AI 모드 시 textarea(프리필)+생성/취소
   - 결과는 기존 `reportText` 뷰 대체, 복사는 AI 결과 대상
   - 로딩/에러 토스트 처리
6. `dailyReport.module.css`에 AI 입력 textarea/버튼 스타일 추가

### 검증
7. 백엔드 컴파일(`gradlew compileJava`), 프론트 lint/build

## 에러 처리
- 환경변수 미설정 / 네트워크 오류 / 빈 응답 → 토스트 안내, 기존 뷰 보존
- AI는 없는 정보(진척률·날짜) 지어내지 않음 → `(확인 필요)` / `[YYYY-MM-DD]` 유지

## 진행 상황
- [x] 1. application.yml openwebui 설정
- [x] 2. AiReportFormatService
- [x] 3. 컨트롤러 엔드포인트 (+ GlobalExceptionHandler 503 매핑)
- [x] 4. reports.js aiFormat
- [x] 5. DailyReportModal AI 모드 (off/input/result)
- [x] 6. CSS (aiTextarea, metaBadgeAi 등)
- [x] 7. 빌드 검증 — 백엔드 compileJava EXIT=0, 프론트 vite build EXIT=0
- [x] 8. docker-compose(dev/prod) OPENWEBUI_* 환경변수 주입 지점 추가

## 배포 시 필요 설정 (런타임 환경변수)
백엔드 컨테이너/프로세스에 아래 3개를 주입해야 기능이 활성화됨 (미설정 시 503 + 안내, 앱은 정상):
- `OPENWEBUI_BASE_URL=https://why.coreit.co.kr`
- `OPENWEBUI_API_KEY=<ai-brain .env 의 토큰 재사용>`
- `OPENWEBUI_MODEL=gpt-oss:120b` (기본값 존재, 생략 가능)
