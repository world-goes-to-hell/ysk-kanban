# 일감 등록일 ~ 완료일 표시 기능

## 목표
- 일감 상세에서 등록일 ~ 완료일 표시
- 축소보기 마우스오버 팝업에서도 동일 표시

## 변경 파일

| 파일 | 변경 내용 |
|------|----------|
| `Todo.java` | `completedAt` 필드 추가 |
| `TodoService.java` | DONE 전환 시 completedAt 설정, DONE→다른상태 시 null |
| `DetailInfo.jsx` | 메타 그리드에 등록일~완료일 표시 |
| `CardPreview.jsx` | 팝업에 완료일 추가 |

## 구현 상세

### 1. Backend - Todo 엔티티
- `private LocalDateTime completedAt;` 추가
- `@PrePersist`, `@PreUpdate`와 별도로 서비스에서 직접 관리

### 2. Backend - TodoService.changeStatus
- status == DONE → `todo.setCompletedAt(LocalDateTime.now())`
- status != DONE → `todo.setCompletedAt(null)` (되돌리기 지원)

### 3. Frontend - DetailInfo.jsx
- 기존 "등록일", "수정일" 카드 사이에 "기간" 카드 추가
- 형식: `2026.03.01 ~ 2026.03.10 (9일)`
- 미완료 시: `2026.03.01 ~ 진행중`

### 4. Frontend - CardPreview.jsx
- 기존 `등록:` 아래에 `완료:` 추가
- 미완료 시 표시 안 함

## 상태
- [x] Backend 구현
- [x] Frontend 구현
- [ ] 테스트
