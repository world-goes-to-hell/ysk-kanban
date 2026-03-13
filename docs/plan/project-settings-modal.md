# 프로젝트 설정 모달 (탭 기반)

## 목표
API Key 버튼 → 설정 버튼으로 변경. 탭 기반 모달로 프로젝트 설정과 API 설정을 통합 관리.

## 탭 구성

### 탭 1: 프로젝트 설정
- **참여자 관리**: 기존 ProjectMembersModal 내용 통합 (멤버 목록, 역할 변경, 추가/제거)
- **업무보고 포함/미포함**: 프로젝트별 토글 (`includeInReport` boolean, 기본 true)

### 탭 2: API 설정
- **API Key 관리**: 기존 ApiKeyModal 내용 통합 (발급, 목록, 폐기)

## 변경 파일

### Backend (3파일)
| 파일 | 변경 |
|------|------|
| `entity/Project.java` | `includeInReport` 필드 추가 (기본값 true) |
| `controller/ProjectController.java` | PUT에서 `includeInReport` 처리 |
| `service/ProjectService.java` | `updateProject`에 `includeInReport` 파라미터 추가 |
| `service/DailyReportService.java` | `includeInReport == false`인 프로젝트 일감 제외 |

### Frontend (4파일, 신규 2)
| 파일 | 변경 |
|------|------|
| `components/board/ProjectSettingsModal.jsx` | **신규** — 탭 모달 (프로젝트설정 + API설정) |
| `styles/projectSettings.module.css` | **신규** — 탭 UI 스타일 |
| `components/board/BoardPage.jsx` | API Key 버튼 → 설정 버튼, ApiKeyModal → ProjectSettingsModal |
| `api/projects.js` | `updateSettings(projectId, settings)` 추가 |

## 진행 상태
- [ ] Backend: Project 엔티티 + Controller + Service
- [ ] Backend: DailyReportService 필터링
- [ ] Frontend: ProjectSettingsModal 컴포넌트
- [ ] Frontend: BoardPage 연동
- [ ] 빌드 검증
