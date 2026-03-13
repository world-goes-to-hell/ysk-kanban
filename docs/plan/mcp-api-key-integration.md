# MCP 서버 + API Key 인증 통합 설계

## 개요

Claude Code에서 MCP(Model Context Protocol)를 통해 본 프로젝트의 일감 관리 API를 직접 호출할 수 있도록 하는 시스템.
- **인증**: 프로젝트 단위 API Key 기반 (세션 인증과 병행)
- **MCP 서버**: Node.js stdio 방식
- **비용**: 0원 (자체 서버, 외부 API 불필요)
- **범위**: API Key는 특정 프로젝트에 바인딩 → 해당 프로젝트 일감만 CRUD 가능

---

## Phase 1: API Key 인증 시스템 (Backend)

### 1-1. ApiKey Entity

```java
// entity/ApiKey.java
@Entity
@Table(name = "api_keys")
public class ApiKey {
    @Id @GeneratedValue
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;             // 프로젝트 단위 바인딩

    @Column(nullable = false, unique = true)
    private String keyHash;              // BCrypt 해시 저장

    @Column(nullable = false, length = 8)
    private String keyPrefix;            // "ak_xxxx" 식별용 앞 8자

    @Column(nullable = false)
    private String name;                 // "Claude Code용" 등

    private LocalDateTime lastUsedAt;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime expiresAt;     // null = 만료 없음

    @Column(nullable = false)
    private boolean revoked = false;
}
```

**설계 포인트**:
- `project` 필드로 키가 특정 프로젝트에만 유효
- 원본 키는 저장하지 않음 (BCrypt 해시만 저장)
- `keyPrefix`로 목록에서 어떤 키인지 식별 가능 ("ak_3f8a...")

### 1-2. ApiKeyRepository

```java
public interface ApiKeyRepository extends JpaRepository<ApiKey, Long> {
    List<ApiKey> findByProjectIdAndRevokedFalse(Long projectId);
    List<ApiKey> findByRevokedFalse();
    Optional<ApiKey> findByIdAndUserId(Long id, Long userId);
}
```

### 1-3. ApiKeyService

- 키 생성: `ak_` + 40자 랜덤 → BCrypt 해시 저장 → 원본 1회 반환
- 키 검증: 활성 키 순회 BCrypt match → User + projectId 반환
- 키 폐기: revoked = true
- 키 목록: prefix, name, lastUsed (해시 노출 없음)

### 1-4. ApiKeyAuthFilter

- `Authorization: Bearer ak_...` 헤더 감지
- 키 검증 → SecurityContext에 User 설정 + **projectId를 request attribute로 저장**
- 이후 Controller에서 projectId 범위 검증에 활용

### 1-5. SecurityConfig 변경

- `addFilterBefore(apiKeyAuthFilter, UsernamePasswordAuthenticationFilter.class)`
- 기존 세션 인증과 완전 병행

### 1-6. ApiKeyController

```
POST /api/projects/{projectId}/api-keys     // 키 생성 (name, expiresAt)
GET  /api/projects/{projectId}/api-keys     // 해당 프로젝트 키 목록
DELETE /api/projects/{projectId}/api-keys/{id}  // 키 폐기
```

---

## Phase 2: API Key 관리 UI (Frontend)

### 2-1. 위치

보드 페이지(프로젝트별) 상단 툴바에 "API Key 관리" 버튼 → 모달

### 2-2. UI 구성

```
┌─────────────────────────────────────────────┐
│ API Key 관리 - [프로젝트명]                    │
├─────────────────────────────────────────────┤
│ [키 이름 입력] [만료: 선택] [생성]             │
├─────────────────────────────────────────────┤
│ ⚠️ 생성된 키 (1회만 표시):                    │
│ ┌─────────────────────────────────────────┐ │
│ │ ak_3f8a2b...e9c1d7f4a8b2              │ │
│ │                          [📋 복사]     │ │
│ └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│ 이름          Prefix      마지막 사용   작업   │
│ Claude Code   ak_3f8a...  2분 전       [폐기] │
└─────────────────────────────────────────────┘
```

### 2-3. 파일 구조

| 파일 | 역할 |
|------|------|
| `api/apiKeys.js` | API 클라이언트 (create, list, revoke) |
| `components/board/ApiKeyModal.jsx` | 키 관리 모달 (보드 페이지에서 열림) |
| `styles/apiKey.module.css` | 스타일 |

---

## Phase 3: MCP 서버 (Node.js)

### 3-1. 디렉토리 구조

```
mcp-server/
├── package.json
├── src/
│   └── index.js          # MCP 서버 메인
└── .env.example
```

### 3-2. MCP 서버 구현

- 환경변수: `JIRA_TEST_API_URL`, `JIRA_TEST_API_KEY`
- projectId는 키 검증 시 서버가 자동 결정 → MCP Tool에서 projectId 파라미터 불필요
- 모든 API 호출에 `Authorization: Bearer ak_...` 헤더 자동 포함

### 3-3. 제공 Tools

| Tool | 설명 | 활용 시나리오 |
|------|------|-------------|
| `list_todos` | 일감 목록 (상태 필터) | "진행 중인 일감 보여줘" |
| `get_todo` | 일감 상세 | "일감 #42 내용 확인" |
| `create_todo` | 일감 생성 (projectId 자동) | "이 버그 일감으로 등록해" |
| `update_todo` | 일감 수정 | "제목 변경해" |
| `change_todo_status` | 상태 변경 | "이거 완료 처리해" |
| `add_comment` | 댓글 추가 | "작업 내역 기록해" |
| `list_comments` | 댓글 목록 | "이 일감 작업 이력 조회" |
| `generate_daily_report` | 업무보고 | "오늘 업무보고 뽑아줘" |

---

## Phase 4: Claude Code 연동 설정

### `.mcp.json`

```json
{
  "mcpServers": {
    "jira-test": {
      "command": "node",
      "args": ["./mcp-server/src/index.js"],
      "env": {
        "JIRA_TEST_API_URL": "http://localhost:8080",
        "JIRA_TEST_API_KEY": "ak_여기에_발급받은_키_입력"
      }
    }
  }
}
```

### 사용 흐름

```
1. 보드 페이지에서 "API Key" 버튼 클릭
2. 키 이름 입력 → 생성
3. 표시된 키 복사 (1회만 표시)
4. .mcp.json에 붙여넣기
5. Claude Code 재시작 후 사용:
   - "진행 중인 일감 확인해"
   - "이 버그 수정 완료, 일감 #15 완료 처리하고 작업 내역 댓글 달아줘"
   - "오늘 업무보고 생성해줘"
```

---

## 구현 순서

| 순서 | 작업 | 파일 수 | 의존성 |
|------|------|--------|--------|
| 1 | ApiKey Entity + Repository | 2 | 없음 |
| 2 | ApiKeyService | 1 | 1에 의존 |
| 3 | ApiKeyAuthFilter + SecurityConfig 수정 | 2 | 2에 의존 |
| 4 | ApiKeyController | 1 | 2에 의존 |
| 5 | Frontend API Key 관리 UI | 3 | 4에 의존 |
| 6 | MCP 서버 구현 | 2 | 3에 의존 |
| 7 | `.mcp.json` + 통합 테스트 | 1 | 6에 의존 |

**총 변경**: 신규 10파일 + 기존 수정 2파일 (SecurityConfig, BoardPage)

---

## 보안 고려사항

| 항목 | 대책 |
|------|------|
| 키 범위 | 프로젝트 단위 바인딩 → 다른 프로젝트 접근 불가 |
| 키 유출 | BCrypt 해시만 저장, 원본은 생성 시 1회만 표시 |
| 키 도용 | `lastUsedAt` 추적, 폐기(revoke) 기능 |
| 만료 | `expiresAt` 선택 설정 (30일, 90일, 무제한) |
| 브루트포스 | prefix 기반 사전 필터링으로 BCrypt 비교 횟수 최소화 |
| 권한 | API Key = 발급한 User 권한 + projectId 범위 제한 |
| 전송 보안 | localhost 전용이므로 HTTPS 불필요 (외부 노출 시 HTTPS 필수) |

---

## 상태

- [ ] Phase 1: Backend API Key 인증
- [ ] Phase 2: Frontend API Key 관리 UI
- [ ] Phase 3: MCP 서버 구현
- [ ] Phase 4: Claude Code 연동 테스트
