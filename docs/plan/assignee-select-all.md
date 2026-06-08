# 일감 생성 시 담당자 전체 선택 기능

## 목표
- 일감 생성/편집 모달의 담당자 선택 영역에 **전체 선택 / 전체 해제 토글** 추가
- 멤버가 많을 때 한 명씩 클릭하지 않고 한 번에 전원 지정 가능

## 동작 정의
- 검색어가 없으면: "전체 선택" → 프로젝트 전 멤버 선택
- 검색어가 있으면: "전체 선택" → **현재 보이는(필터된) 멤버**만 선택 (예측 가능한 WYSIWYG 동작)
- 보이는 멤버가 모두 선택된 상태면 버튼이 "전체 해제"로 바뀌어 해당 멤버 선택 해제
- 이미 선택된 다른(필터 밖) 멤버는 유지 (합집합/차집합 연산)
- 선택 인원 수 배지 표시 (`N명 선택`)

## 변경 파일

| 파일 | 변경 내용 |
|------|----------|
| `frontend/src/components/todo/AssigneeGrid.jsx` | 전체 선택/해제 컨트롤 바 + 선택 인원 배지 추가, `onToggleAll` prop 신설 |
| `frontend/src/components/todo/TodoForm.jsx` | `toggleAllAssignees(ids, selectAll)` 핸들러 추가 (불변 업데이트), `onToggleAll` 전달 |
| `frontend/src/styles/assigneeGrid.module.css` | 컨트롤 바/버튼/배지 스타일 추가 |

## 구현 상세

### 1. AssigneeGrid.jsx
- `filtered` 기준 `allFilteredSelected` 계산
- 컨트롤 바: 좌측 "전체 선택"/"전체 해제" 버튼, 우측 `N명 선택` 배지
- `onClick` → `onToggleAll(filtered.map(u => u.id), !allFilteredSelected)`
- `onToggleAll` 미제공 시 컨트롤 바 미렌더 (하위호환)

### 2. TodoForm.jsx
- `toggleAllAssignees(ids, selectAll)`:
  - selectAll=true → 기존 선택 ∪ ids (Set 사용, 새 배열 반환)
  - selectAll=false → 기존 선택 − ids
- `<AssigneeGrid onToggleAll={toggleAllAssignees} />`

### 3. assigneeGrid.module.css
- `.controlBar`, `.selectAllBtn`, `.countBadge` 추가 (기존 토큰 변수 재사용)

## 적대적 검증 반영 (3렌즈 워크플로우)
CRITICAL/HIGH 없음. MEDIUM 1 + LOW 2 반영:
- (MEDIUM) "전체 해제"가 목록 밖 잔여 담당자 id를 남겨 화면(0명)과 제출 데이터 불일치
  → 검색 중이 아닐 때 `selectedIds` 전체를 차집합 제거하여 실제로 전부 비움
- (LOW) 검색 중 배지(전체 기준) ↔ 버튼(필터 기준) 범위 불일치
  → 검색 중에는 `검색 결과 N/M 선택`으로 필터 기준 표시
- (LOW) 멤버 1명일 때 컨트롤 바 중복 노출
  → `members.length > 1`일 때만 컨트롤 바 렌더

## 검증
- [x] `vite build` 통과 (구문/임포트 오류 없음) — 2.68s, 467 모듈
- [x] 전체 선택 → 전원 선택 (union, 불변)
- [x] 검색 중 전체 선택 → 필터된 멤버만 선택, 필터 밖 선택 보존
- [x] 전체 해제 → 잔여 포함 전부 비움
- [ ] 실제 브라우저 수동 확인 (운영 배포 후)

## 상태
- [x] AssigneeGrid 구현
- [x] TodoForm 구현
- [x] CSS 구현
- [x] 빌드 검증
- [x] 적대적 리뷰 반영
