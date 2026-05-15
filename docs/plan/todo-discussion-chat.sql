-- ============================================================
-- 일감 토론(인앱 채팅 + Jitsi iframe 임베드) 기능 — 운영 PostgreSQL DDL
--
-- 적용 순서:
--   1) 본 스크립트 실행 (트랜잭션 단위)
--   2) 백엔드 배포 (Discussion 엔티티/Controller/Service 포함)
--   3) 검증: SELECT count(*) FROM discussions, SELECT type, count(*) FROM comments GROUP BY type
--
-- 멱등성: 모든 문이 IF NOT EXISTS 또는 조건부 → 재실행 안전
-- dev(H2 + ddl-auto:update)는 JPA가 자동 처리하지만,
--   columnDefinition으로 명시한 DEFAULT 'COMMENT'를 위해 운영도 동일하게 적용 권장
-- ============================================================

-- ------------------------------------------------------------
-- 1. comments 테이블 확장 (type + discussion_id)
-- ------------------------------------------------------------
-- type: 'COMMENT'(기본 댓글) / 'CHAT'(토론 채팅 메시지) / 'SYSTEM'(토론 시작·종료 자동 메시지)
-- 기존 행은 모두 'COMMENT'로 백필됨 (DEFAULT)
ALTER TABLE public.comments
    ADD COLUMN IF NOT EXISTS type varchar(20) NOT NULL DEFAULT 'COMMENT';

ALTER TABLE public.comments
    ADD COLUMN IF NOT EXISTS discussion_id bigint;

-- type CHECK 제약 (멱등 — 이미 있으면 건너뜀)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'comments_type_check' AND conrelid = 'public.comments'::regclass
    ) THEN
        ALTER TABLE public.comments
            ADD CONSTRAINT comments_type_check
            CHECK (type IN ('COMMENT','CHAT','SYSTEM'));
    END IF;
END$$;

-- discussion_id 인덱스 (NULL 다수라 partial index)
CREATE INDEX IF NOT EXISTS idx_comments_discussion
    ON public.comments (discussion_id)
    WHERE discussion_id IS NOT NULL;


-- ------------------------------------------------------------
-- 2. discussions 테이블 신규
-- ------------------------------------------------------------
-- 한 todo에 다수의 discussion 이력 가능 (시간순)
-- 진행 중(ended_at IS NULL)은 todo당 1개만 — partial unique index로 강제
CREATE TABLE IF NOT EXISTS public.discussions (
    id          bigserial PRIMARY KEY,
    todo_id     bigint        NOT NULL,
    started_by  bigint        NOT NULL,
    started_at  timestamp(6)  NOT NULL,
    ended_at    timestamp(6),
    room_url    varchar(500),
    CONSTRAINT fk_discussions_todo
        FOREIGN KEY (todo_id) REFERENCES public.todos(id),
    CONSTRAINT fk_discussions_started_by
        FOREIGN KEY (started_by) REFERENCES public.users(id)
);

ALTER TABLE public.discussions OWNER TO kanban;

-- 한 일감에 진행 중 토론은 1개만 허용 (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS uk_discussions_active_per_todo
    ON public.discussions (todo_id)
    WHERE ended_at IS NULL;

-- 토론 히스토리 조회 가속
CREATE INDEX IF NOT EXISTS idx_discussions_todo_started
    ON public.discussions (todo_id, started_at DESC);


-- ------------------------------------------------------------
-- 3. comments.discussion_id → discussions(id) 외래키
--    (discussions 테이블 생성 이후에 추가)
-- ------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_comments_discussion' AND conrelid = 'public.comments'::regclass
    ) THEN
        ALTER TABLE public.comments
            ADD CONSTRAINT fk_comments_discussion
            FOREIGN KEY (discussion_id) REFERENCES public.discussions(id);
    END IF;
END$$;


-- ------------------------------------------------------------
-- 4. notifications.type CHECK 제약 갱신
--    기존 4개 타입 + DISCUSSION_STARTED 추가
-- ------------------------------------------------------------
DO $$
DECLARE
    cname text;
BEGIN
    -- 기존 type CHECK 제약 동적 탐색 후 드롭
    SELECT conname INTO cname
    FROM pg_constraint
    WHERE conrelid = 'public.notifications'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%type%';
    IF cname IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.notifications DROP CONSTRAINT ' || cname;
    END IF;

    -- 새 type CHECK 제약 (DISCUSSION_STARTED 포함)
    ALTER TABLE public.notifications
        ADD CONSTRAINT notifications_type_check
        CHECK ((type)::text = ANY (
            (ARRAY [
                'ASSIGNED'::character varying,
                'COMMENT_ADDED'::character varying,
                'STATUS_CHANGED'::character varying,
                'MENTIONED'::character varying,
                'DISCUSSION_STARTED'::character varying
            ])::text[]
        ));
END$$;


-- ============================================================
-- 검증 쿼리 (적용 직후 실행해 확인)
-- ============================================================
-- 1) 테이블 존재 확인
--    SELECT count(*) FROM information_schema.tables
--    WHERE table_schema = 'public' AND table_name = 'discussions';
--
-- 2) 컬럼 추가 확인
--    SELECT column_name, data_type, is_nullable, column_default
--    FROM information_schema.columns
--    WHERE table_schema = 'public' AND table_name = 'comments'
--      AND column_name IN ('type','discussion_id');
--
-- 3) 기존 comments 백필 확인 (모두 'COMMENT'여야 함)
--    SELECT type, count(*) FROM public.comments GROUP BY type;
--
-- 4) 제약 확인
--    SELECT conname, pg_get_constraintdef(oid)
--    FROM pg_constraint
--    WHERE conrelid IN ('public.comments'::regclass, 'public.notifications'::regclass, 'public.discussions'::regclass)
--    ORDER BY conname;


-- ============================================================
-- 롤백 스크립트 (필요 시 역순 실행)
-- ============================================================
-- ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
-- ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
--   CHECK ((type)::text = ANY ((ARRAY ['ASSIGNED','COMMENT_ADDED','STATUS_CHANGED','MENTIONED'])::text[]));
-- ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS fk_comments_discussion;
-- DROP INDEX IF EXISTS public.uk_discussions_active_per_todo;
-- DROP INDEX IF EXISTS public.idx_discussions_todo_started;
-- DROP TABLE IF EXISTS public.discussions;
-- DROP INDEX IF EXISTS public.idx_comments_discussion;
-- ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_type_check;
-- ALTER TABLE public.comments DROP COLUMN IF EXISTS discussion_id;
-- ALTER TABLE public.comments DROP COLUMN IF EXISTS type;
