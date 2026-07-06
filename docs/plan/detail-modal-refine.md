# 일감 상세 모달 디자인 개선 (방향 A: 현 구조 유지 + 정돈)

## 목표
단일 컬럼 구조는 유지하되 **위계·일관성·다크모드 토큰**을 정비해 스캔성을 높인다.

## ⚠️ 절대 제외 (사용자 명시 요청)
- `DiscussionPanel.jsx`, `discussionPanel.module.css` — **건드리지 않음**.
  토론은 localStorage 분할비율, 팝아웃, Jitsi 임베드, 리사이저 등 정교한 설정이 많음.
- `ActivityTimeline` (자체 헤더·카운트·접기 보유), `SubtaskBoard` 도 구조 변경 안 함.

## 진단 → 개선 매핑

| 문제 | 개선 |
|------|------|
| 제목 약함·ID 비부각 | 타이틀 히어로 블록: 상태색 액센트 레일 + 큰 제목 + 모노 ID·프로젝트 칩 |
| 메타 = auto-fill 카드 그리드(안티패턴) | 속성 리스트(라벨-값) 로 정돈 |
| 사람 표현 불일치(메타=텍스트칩 / 댓글=아바타) | 메타 담당자·작성자도 **아바타**로 통일 |
| 마감/기간 배지 하드코딩 hex → 다크모드 깨짐 | 시맨틱 토큰(`--danger/--todo/--wip/--done-*`)으로 교체 |
| 설명이 raw 기본, 마크다운이 토글 | **마크다운 기본 렌더**, 토글은 "원문" |
| 섹션 식별성 부족 | 첨부·댓글 헤더에 아이콘 + 카운트 |

## 변경 파일

| 파일 | 변경 |
|------|------|
| `detail/DetailInfo.jsx` | 타이틀 히어로 + 속성 리스트 + 아바타 + 토큰 배지 + 마크다운 기본 |
| `styles/detail.module.css` | 신규 클래스(titleBlock/accentRail/idChip/avatar/propList/sectionHead 등), 배지 토큰화 |
| `detail/AttachmentGrid.jsx` | 섹션 헤더 📎 + 카운트 |
| `detail/CommentSection.jsx` | 섹션 헤더 💬 + 카운트 |
| `detail/DetailModal.jsx` | 헤더 버튼 인라인 스타일 → 모듈 클래스(소폭 정리) |

## 적대적 검증 반영 (3렌즈 워크플로우)
CRITICAL 없음. 반드시 수정 3건 반영:
- (H1) `.durationEndProgress` 하드코딩 `#6b7280` → `var(--text-muted)` (다크모드 토큰 일관성)
- (M1) `Person` 컴포넌트 `if (!user) return null;` 가드 — assignees null 원소로 인한 모달 크래시 방어
- (M2) `remark-breaks` 추가 — 마크다운 기본 렌더 전환 시 평문 단일 개행이 뭉치는 회귀 해결(단일 개행→`<br>`)
- 의존성 추가: `remark-breaks` (frontend)

후속(선택, 회귀 위험 0):
- 미사용 메타 클래스(.metaGrid/.metaCard/.personNameChip 등) 및 .sectionTitle 데드코드 정리
- ActivityTimeline 헤더를 .sectionHead 골격으로 정렬

## 검증
- [x] `vite build` 통과 (2.27s)
- [x] 마감/기간 배지 토큰화로 다크모드 대비 확보
- [x] 토론 패널 무변경 회귀 확인 (git status로 DiscussionPanel/discussionPanel.module.css 미변경)

## 상태
- [x] DetailInfo 개편
- [x] CSS 추가/토큰화
- [x] 첨부/댓글 헤더
- [x] DetailModal 정리
- [x] 빌드 + 회귀 검증
- [x] 적대적 리뷰 반영
