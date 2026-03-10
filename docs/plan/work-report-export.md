# 작업내역 추출 기능

## 목표
- 일자별 작업내역 조회/추출
- 담당자별 작업내역 추출
- 작성자별 작업내역 추출

## 변경 파일

### Backend
| 파일 | 변경 내용 |
|------|----------|
| `TodoRepository.java` | 필터 조합 쿼리 추가 |
| `TodoController.java` | GET /api/todos/report 엔드포인트 추가 |

### Frontend
| 파일 | 변경 내용 |
|------|----------|
| `todos.js` (API) | report API 호출 함수 추가 |
| `ReportPage.jsx` (신규) | 리포트 페이지 컴포넌트 |
| `App.jsx` | /report 라우트 추가 |
| `Sidebar.jsx` | 리포트 메뉴 추가 |
| `report.module.css` (신규) | 리포트 페이지 스타일 |

## 구현 상세

### Backend - 필터 API
- `GET /api/todos/report?startDate=&endDate=&assigneeId=&createdById=&projectId=&status=`
- 모든 파라미터 optional, 조합 가능
- JPQL 동적 쿼리 또는 Specification 패턴

### Frontend - 리포트 페이지
- 필터 영역: 기간(시작~종료), 담당자, 작성자, 프로젝트, 상태
- 결과 테이블: 일감ID, 제목, 상태, 우선순위, 담당자, 작성자, 등록일, 완료일
- CSV 다운로드 버튼

## 상태
- [x] Backend 구현
- [x] Frontend 구현
- [ ] 테스트
