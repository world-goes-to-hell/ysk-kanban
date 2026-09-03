# YSK Kanban - 일감 관리 보드

Spring Boot + React 기반의 칸반 보드 일감 관리 시스템입니다.

## 기술 스택

| 구분 | 기술 |
|------|------|
| Backend | Java 17, Spring Boot 3.2.3, Spring Security, Spring Data JPA |
| Frontend | React 18, Vite 5, React Router, @hello-pangea/dnd |
| Database | H2 (파일 모드) |
| 스타일 | CSS Modules, Noto Sans KR |

## 주요 기능

- 프로젝트 생성/관리, 즐겨찾기
- 칸반 보드 (할 일 / 진행 중 / 완료) 드래그 앤 드롭
- 일감 CRUD, 우선순위, 마감일 관리
- 축소 보기 모드 (호버 미리보기 포함)
- 댓글 (수정/삭제), 첨부파일 업로드
- 대시보드 (통계, 프로젝트별 필터)
- SSE 실시간 동기화
- 세션 인증 (1시간 타임아웃, 연장 기능)
- 외부 연동: MCP 서버(AI 에이전트용)와 Herdr 터미널 플러그인(사람용)

## 사전 요구사항

- **Java 17** 이상
- **Node.js 18** 이상 (프론트엔드 개발 시)

## 빠른 시작

### 1. 저장소 클론

```bash
git clone https://github.com/world-goes-to-hell/ysk-kanban.git
cd ysk-kanban
```

### 2. 백엔드 실행

```bash
# Windows
gradlew.bat bootRun

# macOS / Linux
./gradlew bootRun
```

서버가 `http://localhost:8080` 에서 시작됩니다.

> 최초 실행 시 기본 계정과 프로젝트가 자동 생성됩니다.
>
> | 항목 | 값 |
> |------|----|
> | 아이디 | `admin` |
> | 비밀번호 | `admin123` |

### 3. 프론트엔드 개발 서버 (선택)

프론트엔드를 수정하며 개발할 경우에만 필요합니다.

```bash
cd frontend
npm install
npm run dev
```

개발 서버가 `http://localhost:5173` 에서 시작되며, API 요청은 백엔드(8080)로 프록시됩니다.

### 4. 프론트엔드 빌드

프론트엔드 변경 후 백엔드에 포함시키려면 빌드합니다.

```bash
cd frontend
npm run build
```

빌드 결과가 `src/main/resources/static/` 에 생성되어, 백엔드 단독으로 서비스 가능합니다.

## 프로젝트 구조

```
ysk-kanban/
├── src/main/java/com/example/todo/
│   ├── config/          # Security, SPA, SSE, 초기 데이터
│   ├── controller/      # REST API 컨트롤러
│   ├── entity/          # JPA 엔티티
│   ├── repository/      # Spring Data JPA 리포지토리
│   └── service/         # 비즈니스 로직
├── src/main/resources/
│   ├── application.yml  # 서버 설정
│   └── static/          # 프론트엔드 빌드 결과 (git 제외)
├── frontend/
│   ├── src/
│   │   ├── api/         # API 클라이언트
│   │   ├── components/  # React 컴포넌트
│   │   ├── contexts/    # Auth, Project Context
│   │   ├── hooks/       # Custom Hooks
│   │   ├── styles/      # CSS Modules
│   │   └── utils/       # 포맷터, 상수
│   └── vite.config.js
├── mcp-server/          # MCP 서버 (AI 에이전트가 일감을 다루는 도구)
├── herdr-plugin/        # Herdr 터미널 플러그인 (사람이 보드를 보는 화면)
├── build.gradle
└── gradlew / gradlew.bat
```

## 외부 연동

같은 API 를 두 갈래로 씁니다. **MCP 서버는 AI 에이전트가 쓰고, Herdr 플러그인은 사람이 씁니다.**

| 구성 | 대상 | 할 수 있는 일 |
|------|------|----------------|
| [`mcp-server/`](mcp-server/) | AI 에이전트 | 일감 조회와 생성·수정·삭제 등 도구 호출 |
| [`herdr-plugin/`](herdr-plugin/) | 사람 | 터미널에서 보드를 보고 카드의 상태를 바꿈 |

### Herdr 터미널 플러그인

[Herdr](https://herdr.dev) 의 pane 안에 칸반 보드를 그립니다. 키보드와 마우스로 카드를 훑고,
드래그 앤 드롭이나 `Space` 로 다른 칸에 옮길 수 있습니다.
다른 창에서 일감이 바뀌면 화면이 따라 갱신됩니다.

```bash
herdr plugin install world-goes-to-hell/ysk-kanban/herdr-plugin
```

**현재 조회와 상태 변경만 지원합니다.** 일감 생성·수정·삭제, 하위 일감 생성, 댓글 작성은
웹 화면이나 MCP 서버에서 하십시오. 사용법과 키맵은 [herdr-plugin/README.md](herdr-plugin/README.md) 에 있습니다.

## 설정

### 데이터베이스

H2 파일 DB를 사용하며 별도 설치가 필요 없습니다. 데이터는 `./data/tododb` 에 저장됩니다.

H2 콘솔: `http://localhost:8080/h2-console`
- JDBC URL: `jdbc:h2:file:./data/tododb`
- Username: `sa`
- Password: (비어있음)

### 파일 업로드

첨부파일은 `./uploads/` 디렉토리에 저장됩니다. 최대 파일 크기는 10MB입니다.

### 세션

세션 타임아웃은 1시간이며, 만료 5분 전에 연장 여부를 묻는 알림이 표시됩니다.
