# 사이드바: 권한 없는 상위 프로젝트 비활성 표시

## 목표
하위 프로젝트 권한만 있을 때 상위 프로젝트를 트리에 표시하되 disabled 처리. 마우스 오버 시 "접근 권한 없음" 툴팁.

## 현재 동작
상위 프로젝트 권한 없으면 하위 프로젝트가 최상위(root)로 표시됨.

## 변경 동작
상위 프로젝트를 트리에 포함하되 `accessible: false`로 마킹 → 사이드바에서 클릭 불가, 회색 처리, 툴팁 표시.

## 변경 파일

### Backend (1파일)
| 파일 | 변경 |
|------|------|
| `service/ProjectService.java` | `getProjectTreeByUser`에서 권한 없는 부모 프로젝트도 포함, `accessible` 플래그 추가 |

### Frontend (2파일)
| 파일 | 변경 |
|------|------|
| `components/layout/SidebarProjectItem.jsx` | `accessible` 체크, disabled 스타일 + 툴팁 |
| `styles/layout.module.css` | `.sidebarItemDisabled` 스타일 추가 |

## 진행 상태
- [ ] Backend: ProjectService 트리 빌드 로직 수정
- [ ] Frontend: SidebarProjectItem disabled 처리
- [ ] Frontend: CSS 스타일 추가
- [ ] 빌드 검증
