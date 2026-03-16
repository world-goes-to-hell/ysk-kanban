-- PostgreSQL Data Migration from H2
-- 실행 전: Hibernate가 테이블을 자동 생성한 후 실행할 것
-- 실행: docker exec -i kanban-postgres psql -U kanban -d kanban < data-insert.sql

BEGIN;

-- ============================================================
-- 0. 기존 데이터 삭제 (FK 역순)
-- ============================================================
TRUNCATE TABLE activity_logs, notifications, comment_reads, attachments,
  todo_assignees, project_favorites, project_members, api_keys,
  user_report_settings, webhooks, comments, todos, projects, users
  CASCADE;

-- ============================================================
-- 1. USERS (FK 없음)
-- ============================================================
INSERT INTO users (id, created_at, display_name, password, username) VALUES
(1, TIMESTAMP '2026-02-27 12:13:34.758135', U&'\ad00\b9ac\c790', '$2a$10$RxolhE5Qsfua.aVkCSs3zu6rkrwNEMkK9.1FRb81cIbfqpvfOuMXa', 'admin'),
(2, TIMESTAMP '2026-02-27 12:13:53.372788', U&'\c720\c131\ad00', '$2a$10$hpNIKBQIns1BqGyxNnMziuzTqixW5MQeZ1n0uNNknUsCuxE4Q.C8a', '5297'),
(3, TIMESTAMP '2026-02-27 13:24:42.902585', U&'\c774\b300\c6d0', '$2a$10$AXhsbctQPXDd.MJ4fFgi.ur53kxe2w.IZ3xRBnXmKSlgVFfRfkJrq', '9947'),
(4, TIMESTAMP '2026-03-10 13:34:01.898205', U&'\c774\d638\c131', '$2a$10$ePiQ78NzLXrW6115XSAVZObupxGMXT8Rca3uobIwaNPSbihHp0CBK', '2130'),
(35, TIMESTAMP '2026-03-03 13:17:45.074976', '2484', '$2a$10$Fj2kMpxIxOM/6zghEHgDPOoekhsCc1FvF90YT4kt51.CH2x7SPSwO', '2484'),
(36, TIMESTAMP '2026-03-03 13:27:04.049847', U&'\ac15\bcd1\d6c8', '$2a$10$i.n3tnLHB63Bq..ah2FLtuV.6Fl46LTyStOMO6cfMxzVoZ.612wZy', '7461');

-- ============================================================
-- 2. PROJECTS (FK: users, self-ref parent_id)
-- ============================================================
INSERT INTO projects (id, created_at, description, name, project_key, created_by, parent_id, include_in_report) VALUES
(1, TIMESTAMP '2026-02-27 12:13:34.781943', U&'\ae30\bcf8 \d504\b85c\c81d\d2b8\c785\b2c8\b2e4.', U&'\c18c\c0c1\acf5\c778 \bc14\c6b0\cc98', 'DEFAULT', 1, NULL, TRUE),
(2, TIMESTAMP '2026-03-09 14:24:01.678117', '', U&'\c0dd\bb3c\b2e4\c591\c131', 'NIBR', 2, NULL, TRUE),
(6, TIMESTAMP '2026-03-13 13:41:34.497784', '', U&'\c720\c131\ad00_\ac1c\c778\ad00\b9ac\c6a9', 'YKS_PERSONAL', 2, NULL, TRUE);
INSERT INTO projects (id, created_at, description, name, project_key, created_by, parent_id, include_in_report) VALUES
(3, TIMESTAMP '2026-03-09 14:25:04.590969', '', U&'\c0dd\b2e4 \c720\c131\ad00 \ac1c\c778', 'BRMG', 2, 2, TRUE),
(4, TIMESTAMP '2026-03-13 13:12:33.726668', U&'\c0dd\bb3c\b2e4\c591\c131 \c885\baa9\b85d', U&'\c0dd\bb3c\b2e4\c591\c131 \c885\baa9\b85d', 'KTSN', 35, 2, TRUE),
(7, TIMESTAMP '2026-03-13 13:42:03.737989', '', U&'\c77c\ac10\ad00\b9ac', 'JIRA', 2, 6, FALSE),
(8, TIMESTAMP '2026-03-13 17:00:34.590125', '', U&'\ae30\d0c0', 'YSK-ETC', 2, 6, TRUE);

-- ============================================================
-- 3. TODOS (FK: users, projects)
-- ============================================================
INSERT INTO todos (id, created_at, description, due_date, priority, sort_order, status, summary, updated_at, created_by, project_id, completed_at) VALUES
(33, TIMESTAMP '2026-03-06 09:20:30.202064', U&'\c194\b9ac\b370\c624 IP \ad00\b9ac\c790 \d398\c774\c9c0 \c811\adfc\d5c8\c6a9', DATE '2026-03-06', 'HIGHEST', 4, 'DONE', U&'\c194\b9ac\b370\c624 IP \ad00\b9ac\c790 \d398\c774\c9c0 \c811\adfc\d5c8\c6a9', TIMESTAMP '2026-03-06 09:20:31.966277', 2, 1, TIMESTAMP '2026-03-06 09:20:31.966277'),
(34, TIMESTAMP '2026-03-06 09:35:28.968908', U&'\c758\acac\c81c\cd9c \c54c\b9bc\d1a1\c774 \bc1c\c1a1\b418\c5c8\c9c0\b9cc \c2e4\c81c \bc1c\c1a1\c77c\c2dc\ac00 \c870\d68c\b418\c9c0 \c54a\c740\ac74 \d655\c778\c694\ccad', DATE '2026-12-31', 'HIGH', 4, 'DONE', U&'\c758\acac\c81c\cd9c \c54c\b9bc\d1a1 \c2e4\c81c \bc1c\c1a1 \c77c\c2dc \bbf8\c0bd\c785 \ac74 \d655\c778 \c694\ccad', TIMESTAMP '2026-03-10 22:18:12.742149', 2, 1, TIMESTAMP '2026-03-10 22:18:12.742149'),
(35, TIMESTAMP '2026-03-06 10:39:38.654273', U&'\c54c\b9bc\d1a1 \b0b4\c6a9 \c218\c815 \ad00\b828 SYNC \cf54\b4dc \c791\c5c5 \bc0f \bc18\c601 \c791\c5c5', DATE '2026-03-06', 'HIGHEST', 4, 'DONE', U&'\c54c\b9bc\d1a1 \b0b4\c6a9 \c218\c815 \ad00\b828 SYNC \cf54\b4dc \c791\c5c5 \bc0f \bc18\c601', TIMESTAMP '2026-03-09 09:01:43.492057', 2, 1, TIMESTAMP '2026-03-09 09:01:43.492057'),
(37, TIMESTAMP '2026-03-03 12:52:32.563646', U&'WAS, WEB \c11c\bc84 \cd95\c18c\000aWAS 50\b300 > 40\b300\000aWEB 25\b300 > 20\b300 \c608\c815', DATE '2026-03-31', 'MEDIUM', 1, 'IN_PROGRESS', U&'WAS, WEB \c11c\bc84 \cd95\c18c', TIMESTAMP '2026-03-04 16:25:18.5815', 2, 1, NULL),
(38, TIMESTAMP '2026-03-03 13:24:01.184392', U&'\b370\c774\d130 \ac80\d1a0\d6c4 \c194\b9ac\b370\c624 \c2e0\bbfc\acbd \cc45\c784 \c804\b2ec\c644\b8cc', DATE '2026-03-03', 'HIGHEST', 0, 'DONE', U&'[PMS \bb38\c758\ac74] \ae30\c218\d61c\c790 \b370\c774\d130 \ac80\d1a0', TIMESTAMP '2026-03-03 13:28:45.58829', 2, 1, TIMESTAMP '2026-03-03 13:28:45.58829'),
(39, TIMESTAMP '2026-03-09 09:56:12.553012', U&'KT CLOUD CDN \ac8c\c815 \c815\bcf4 \bcc0\acbd\000a\c774\d638\c131 \c120\c784\b2d8 \ba54\c77c \c815\bcf4\b85c \bcc0\acbd', DATE '2026-03-09', 'MEDIUM', 3, 'DONE', U&'KT CLOUD CDN \ac8c\c815 \c815\bcf4 \bcc0\acbd', TIMESTAMP '2026-03-10 14:23:28.295429', 2, 1, TIMESTAMP '2026-03-10 14:23:28.295429'),
(42, TIMESTAMP '2026-03-09 14:25:42.60882', U&'\b300\c5ed \b4f1\b85d\c2dc \c774\ba54\c77c \bc0f \d578\b4dc\d3f0 \bc88\d638 \c554\d638\d654\000apublic url \c81c\ac70\c791\c5c5', DATE '2026-03-14', 'HIGH', 1, 'DONE', U&'\d45c\bcf8\c18c\c7ac / \c18c\c7ac\c740\d589 \c218\c815\c0ac\d56d', TIMESTAMP '2026-03-11 16:11:29.164685', 2, 3, TIMESTAMP '2026-03-11 16:11:29.162784'),
(43, TIMESTAMP '2026-03-10 15:15:39.707585', U&'\d45c\bcf8 \bc18\b0a9 \bbf8\c644\c131 \b85c\c9c1 \c218\c815', DATE '2026-03-14', 'MEDIUM', 1, 'DONE', U&'\d45c\bcf8 \bc18\b0a9 \b85c\c9c1 \c218\c815', TIMESTAMP '2026-03-11 16:11:36.844069', 2, 3, TIMESTAMP '2026-03-11 16:11:36.843669'),
(44, TIMESTAMP '2026-03-10 16:10:01.78063', U&'\c5ec\c2e0\ae08\c735 \b0b4\c6a9 \c218\c815', NULL, 'HIGH', 3, 'DONE', U&'\c774\c6a9\c57d\ad00 \b0b4\c6a9 \c218\c815', TIMESTAMP '2026-03-10 16:11:16.739185', 3, 1, TIMESTAMP '2026-03-10 16:11:16.739185'),
(45, TIMESTAMP '2026-03-10 16:41:25.513824', U&'\b300\c0c1\bbf8\c120\c815(MS08) + MS05 \c77c \acbd\c6b0 ''25\b144 \b9e4\cd9c\c561 \c5f0\d658\c0b0 0\c6d0 \b610\b294 1\c5b5 4\bc31\b9cc\c6d0 \c774\c0c1'' \bb38\ad6c\b9cc \b098\c624\b3c4\b85d \c218\c815 . \c2e0\ccad\acb0\acfc\d398\c774\c9c0, \c54c\b9bc\d1a1', DATE '2026-03-10', 'MEDIUM', 3, 'DONE', U&'\b300\c0c1\bbf8\c120\c815 \c54c\b9bc\d1a1 \ad00\b828', TIMESTAMP '2026-03-10 16:41:33.867168', 4, 1, TIMESTAMP '2026-03-10 16:41:33.867168'),
(46, TIMESTAMP '2026-03-10 17:32:42.262138', U&'\c2e0\ccad\bc88\d638 : 27648256\000a\c0ac\c5c5\c790\bc88\d638 : 20262656954\000a\b0b4\c6a9 : \c5ec\b7ec\bc88 \c2e0\ccad\c744 \d574\b3c4 \c8fc\b300\d45c\c790 \bbf8\c77c\ce58\b85c \b300\c0c1\bbf8\c120\c815\c774 \b418\ace0 \c788\c74c.\000a\c774 \c804\c5d0 \c8fc\bbfc\b4f1\b85d\bc88\d638\b97c \bcc0\acbd\d588\b2e4\ace0 \d558\b294\b370, \c8fc\bbfc\bc88\d638 \d655\c778 \acb0\acfc \c608\c804 \c8fc\bbfc\bc88\d638\ac00 \c800\c7a5\b418\c5b4\c788\c74c. \ad6d\c138\ccad, \b098\c774\c2a4 \baa8\b450 \d655\c778 \d588\b2e4\ace0 \d558\c9c0\b9cc \c774 \c804 \c8fc\bbfc\b4f1\b85d\bc88\d638\b85ckmc\c778\c99d\c774 \b418\b294 \ac83\c73c\b85c \bd10\c11c \d1b5\c2e0\c0ac\c5d0\b294 \c544\c9c1 \ac1c\d1b5\c815\bcf4\ac00 \bc14\b00c\c9c0 \c54a\c740 \ac83\c73c\b85c \c608\c0c1\b428.', DATE '2026-03-11', 'MEDIUM', 3, 'DONE', U&'\c8fc\b300\d45c\c790 \bbf8\c77c\ce58 \b300\c0c1\bbf8\c120\c815 \bb38\c758 \ac74', TIMESTAMP '2026-03-12 17:20:40.296393', 4, 1, TIMESTAMP '2026-03-12 17:20:40.29607'),
(47, TIMESTAMP '2026-03-11 16:12:27.648807', U&'\d45c\bcf8\c18c\c7ac \b300\b7c9\b4f1\b85d \ba54\b274 \b0b4 \c5d1\c140 \b9e4\d06c\b85c \b0b4 \c0ac\c6a9\b418\b294 API \b9c8\c774\adf8\b808\c774\c158', DATE '2026-03-18', 'MEDIUM', 1, 'IN_PROGRESS', U&'\d45c\bcf8\c18c\c7ac \b300\b7c9\b4f1\b85d \ba54\b274 \b0b4 \c5d1\c140 \c790\b8cc \ad00\b828 \c791\c5c5', TIMESTAMP '2026-03-13 16:12:49.278355', 2, 3, NULL),
(48, TIMESTAMP '2026-03-12 11:16:47.600694', U&'\b514\c9c0\d138 \c790\b8cc\ad00 \d30c\c77c \b9c8\c774\adf8\b808\c774\c158 \ba85\b839\c5b4 \c791\c131', DATE '2026-03-12', 'MEDIUM', 1, 'DONE', U&'\b514\c9c0\d138 \c790\b8cc\ad00 \d30c\c77c \b9c8\c774\adf8\b808\c774\c158 \ba85\b839\c5b4 \c791\c131', TIMESTAMP '2026-03-12 11:17:11.669679', 2, 3, TIMESTAMP '2026-03-12 11:17:11.667667'),
(49, TIMESTAMP '2026-03-12 17:47:08.158254', U&'ARS\c6a9 \c2e0\ccad\c11c\c0c1\d0dc \c870\d68c API \ac1c\bc1c', NULL, 'MEDIUM', 3, 'IN_PROGRESS', U&'ARS\c6a9 API \ac1c\bc1c', TIMESTAMP '2026-03-13 11:23:50.978337', 2, 1, NULL),
(50, TIMESTAMP '2026-03-12 17:47:33.259416', U&'\b514\c9c0\d138\c790\b8cc\ad00 RIS \ae30\b2a5 \ac80\c99d', DATE '2026-03-18', 'HIGH', 1, 'TODO', U&'\b514\c9c0\d138\c790\b8cc\ad00 RIS \ae30\b2a5 \ac80\c99d', TIMESTAMP '2026-03-12 17:47:33.259419', 2, 3, NULL),
(51, TIMESTAMP '2026-03-13 10:57:39.243757', U&'\ae30\c874 \d06c\b808\b527 \c2dc\c2a4\d15c\c5d0\c11c \c0ac\c6a9\b3c5\b824 \bc0f \c0ac\c6a9 \ae30\ac04\c548\b0b4 \c54c\b9bc\d1a1 \c0ac\c6a9 \c774\b825 \d655\c778', DATE '2026-03-13', 'MEDIUM', 4, 'DONE', U&'\c0ac\c6a9\b3c5\b824 \bc0f \c0ac\c6a9 \ae30\ac04\c548\b0b4 \c54c\b9bc\d1a1 \c0ac\c6a9 \c774\b825 \d655\c778', TIMESTAMP '2026-03-13 11:25:58.135948', 2, 1, TIMESTAMP '2026-03-13 10:57:41.230674'),
(52, TIMESTAMP '2026-03-13 14:07:18.14257', U&'\ac1c\bc1c\c11c\bc84 API Key\b85c MCP \c5f0\b3d9 \c815\c0c1 \b3d9\c791 \d655\c778', NULL, 'MEDIUM', 1, 'DONE', U&'\ac1c\bc1c\c11c\bc84 MCP \c5f0\b3d9 \d14c\c2a4\d2b8', TIMESTAMP '2026-03-13 14:07:28.5992', 2, 7, TIMESTAMP '2026-03-13 14:07:28.598748'),
(53, TIMESTAMP '2026-03-13 16:14:35.999942', U&'\d504\b85c\c81d\d2b8 \c870\d68c \c2dc \d558\c704 \d504\b85c\c81d\d2b8 \c77c\ac10 \d1b5\d569 \c870\d68c \bc0f \cd5c\c0c1\c704 \d504\b85c\c81d\d2b8\ba85 \d45c\c2dc\000a\000a---\000a[2026-03-13] \bcc0\acbd \b0b4\c5ed\000a- \c6d0\c778: \d504\b85c\c81d\d2b8 \c120\d0dd \c2dc \d574\b2f9 \d504\b85c\c81d\d2b8\c758 \c9c1\c811 \c77c\ac10\b9cc \c870\d68c\b418\c5b4 \d558\c704 \d504\b85c\c81d\d2b8 \c77c\ac10\c774 \b204\b77d\b428\000a- \c218\c815: \c7ac\adc0\c801\c73c\b85c \d558\c704 \d504\b85c\c81d\d2b8 ID\b97c \c218\c9d1\d558\c5ec IN \c870\ac74\c73c\b85c \d1b5\d569 \c870\d68c\000a- \d30c\c77c:\000a  - ProjectRepository.java: findChildProjectIds() \cffc\b9ac \cd94\ac00\000a  - TodoRepository.java: findByProjectIdInOrderBySortOrderAscCreatedAtDesc() \cffc\b9ac \cd94\ac00\000a  - TodoRepositoryImpl.java: projectId \d544\d130\b97c IN :projectIds\b85c \bcc0\acbd\000a  - TodoService.java: collectProjectIds(), getTodosByProjectWithPermission() \cd94\ac00\000a  - ReportPage.jsx: getRootProjectName() \d568\c218 \cd94\ac00\000a  - mcp-server/index.js: update_todo \bd80\bd84 \c5c5\b370\c774\d2b8 \c2dc \ae30\c874 \ac12 \bcd1\d569 \cc98\b9ac', NULL, 'HIGH', 1, 'DONE', U&'\d504\b85c\c81d\d2b8 \c870\d68c \ac1c\c120 - \cd5c\c0c1\c704 \d504\b85c\c81d\d2b8 \ae30\bc18 \d558\c704 \c77c\ac10 \d1b5\d569 \c870\d68c', TIMESTAMP '2026-03-13 16:38:22.058381', 2, 7, TIMESTAMP '2026-03-13 16:38:22.0579'),
(54, TIMESTAMP '2026-03-13 16:47:04.981357', U&'API Key \bc84\d2bc\c744 \c124\c815 \bc84\d2bc\c73c\b85c \bcc0\acbd, \d0ed \ae30\bc18 \d504\b85c\c81d\d2b8 \c124\c815 \baa8\b2ec \ad6c\d604\000a\000a---\000a[2026-03-13] \bcc0\acbd \b0b4\c5ed\000a- Backend:\000a  - Project \c5d4\d2f0\d2f0\c5d0 includeInReport \d544\b4dc \cd94\ac00 (\ae30\bcf8 true)\000a  - ProjectController PUT\c5d0\c11c includeInReport \cc98\b9ac\000a  - ProjectService.updateProject\c5d0 includeInReport \d30c\b77c\bbf8\d130 \cd94\ac00\000a  - DailyReportService: includeInReport==false \d504\b85c\c81d\d2b8 \c77c\ac10 \bcf4\ace0\c11c \c81c\c678\000a  - buildTreeNode\c5d0 includeInReport \ac12 \d3ec\d568\000a- Frontend:\000a  - ProjectSettingsModal \c2e0\addc \c0dd\c131 (\d0ed: \d504\b85c\c81d\d2b8\c124\c815 / API\c124\c815)\000a  - \d504\b85c\c81d\d2b8\c124\c815 \d0ed: \cc38\c5ec\c790 \ad00\b9ac + \c5c5\bb34\bcf4\ace0 \d3ec\d568/\bbf8\d3ec\d568 \d1a0\ae00\000a  - API\c124\c815 \d0ed: API Key \bc1c\ae09/\d3d0\ae30 (\ae30\c874 ApiKeyModal \d1b5\d569)\000a  - BoardPage: API Key \bc84\d2bc \2192 \c124\c815 \bc84\d2bc, ApiKeyModal \2192 ProjectSettingsModal\000a  - projectSettings.module.css \c2e0\addc (\d0ed \b124\be44\ac8c\c774\c158, \d1a0\ae00 \c2a4\c704\ce58)\000a- \d30c\c77c:\000a  - Project.java, ProjectController.java, ProjectService.java, DailyReportService.java\000a  - ProjectSettingsModal.jsx (\c2e0\addc), projectSettings.module.css (\c2e0\addc)\000a  - BoardPage.jsx', NULL, 'MEDIUM', 1, 'DONE', U&'\d504\b85c\c81d\d2b8 \c124\c815 \baa8\b2ec \ad6c\d604 (\d0ed \ae30\bc18: \d504\b85c\c81d\d2b8\c124\c815 + API\c124\c815)', TIMESTAMP '2026-03-13 16:47:41.023109', 2, 7, TIMESTAMP '2026-03-13 16:47:41.022639'),
(55, TIMESTAMP '2026-03-13 16:57:55.254088', U&'\ce78\bc18\bcf4\b4dc\c5d0\c11c \d558\c704 \d504\b85c\c81d\d2b8 \c77c\ac10\ae4c\c9c0 \d45c\c2dc\b418\b358 \bb38\c81c \c218\c815\000a\000a---\000a[2026-03-13] \bcc0\acbd \b0b4\c5ed\000a- \c6d0\c778: getTodosByProject()\c5d0 collectProjectIds() \c7ac\adc0 \b85c\c9c1\c774 \c801\c6a9\b418\c5b4 \ce78\bc18\bcf4\b4dc\c5d0\c11c\b3c4 \d558\c704 \d504\b85c\c81d\d2b8 \c77c\ac10\c774 \d45c\c2dc\b428\000a- \c218\c815: getTodosByProject()\b97c \b2e8\c77c projectId \c870\d68c\b85c \c6d0\bcf5. \d558\c704 \d504\b85c\c81d\d2b8 \d1b5\d569 \c870\d68c\b294 \c791\c5c5\b0b4\c5ed \c870\d68c(findByFilters)\c5d0\b9cc \c801\c6a9\000a- \d30c\c77c: TodoService.java', NULL, 'MEDIUM', 1, 'DONE', U&'\ce78\bc18\bcf4\b4dc \d558\c704 \d504\b85c\c81d\d2b8 \c77c\ac10 \d45c\c2dc \bc94\c704 \c218\c815', TIMESTAMP '2026-03-13 16:58:35.811629', 2, 7, TIMESTAMP '2026-03-13 16:58:35.811342'),
(56, TIMESTAMP '2026-03-13 17:01:45.31932', U&'Claude Code \c2a4\d0ac \bc84\c804\ad00\b9ac \bc29\bc95 \ac80\d1a0', DATE '2026-03-21', 'MEDIUM', 1, 'IN_PROGRESS', U&'Claude Code \c2a4\d0ac \bc84\c804\ad00\b9ac \bc29\bc95 \ac80\d1a0', TIMESTAMP '2026-03-13 17:01:46.529767', 2, 8, NULL),
(57, TIMESTAMP '2026-03-13 17:02:35.241622', U&'\c6a9\c5b4\c0ac\c804 MCP \ad6c\cd75 \bc0f MCP \c5f0\acb0\d6c4 \c2a4\d0ac\b85c \c124\acc4\d558\c5ec \c5f0\acc4 \d558\b294 \bc29\c548 \ac80\d1a0', DATE '2026-03-21', 'MEDIUM', 1, 'TODO', U&'\c6a9\c5b4\c0ac\c804 MCP \ad00\b828 \b0b4\c6a9 \ac80\d1a0', TIMESTAMP '2026-03-13 17:02:35.241628', 2, 8, NULL),
(58, TIMESTAMP '2026-03-13 17:06:15.906073', U&'\c0ac\c774\b4dc\bc14 \d504\b85c\c81d\d2b8 \d2b8\b9ac\c5d0\c11c \ad8c\d55c \c5c6\b294 \c0c1\c704 \d504\b85c\c81d\d2b8\b97c \be44\d65c\c131 \c0c1\d0dc\b85c \d45c\c2dc\000a\000a---\000a[2026-03-13] \bcc0\acbd \b0b4\c5ed\000a- \c6d0\c778: \d558\c704 \d504\b85c\c81d\d2b8 \ad8c\d55c\b9cc \c788\c744 \b54c \c0c1\c704 \d504\b85c\c81d\d2b8\ac00 \d2b8\b9ac\c5d0\c11c \b204\b77d\b418\c5b4 \acc4\ce35 \ad6c\c870\b97c \d30c\c545\d560 \c218 \c5c6\c5c8\c74c\000a- \c218\c815: \ad8c\d55c \c5c6\b294 \c870\c0c1 \d504\b85c\c81d\d2b8\b3c4 \d2b8\b9ac\c5d0 \d3ec\d568\d558\b418 accessible=false\b85c \b9c8\d0b9, \d504\b860\d2b8\c5d0\c11c disabled \cc98\b9ac\000a- \d30c\c77c:\000a  - ProjectService.java: collectAncestors() \cd94\ac00, buildTreeNode\c5d0 accessible \d50c\b798\adf8\000a  - SidebarProjectItem.jsx: accessible \ccb4\d06c, \d074\b9ad \cc28\b2e8, \c561\c158 \bc84\d2bc \c228\ae40, title \d234\d301\000a  - layout.module.css: .sidebarItemDisabled \c2a4\d0c0\c77c (opacity, cursor \bcc0\acbd)', NULL, 'MEDIUM', 1, 'DONE', U&'\c0ac\c774\b4dc\bc14 \d504\b85c\c81d\d2b8 \d2b8\b9ac\c5d0 \ad8c\d55c \c5c6\b294 \c0c1\c704 \d504\b85c\c81d\d2b8 \be44\d65c\c131 \d45c\c2dc', TIMESTAMP '2026-03-13 17:09:16.443379', 2, 7, TIMESTAMP '2026-03-13 17:09:16.443103'),
(59, TIMESTAMP '2026-03-13 17:56:10.932178', U&'\c124\ba85\b9cc \c218\c815 \d14c\c2a4\d2b8', NULL, 'HIGH', 1, 'DONE', U&'MCP \d14c\c2a4\d2b8 - \c81c\baa9 \c218\c815\b428', TIMESTAMP '2026-03-13 17:58:14.203549', 2, 7, TIMESTAMP '2026-03-13 17:58:14.203269'),
(60, TIMESTAMP '2026-03-13 18:01:13.168734', U&'API_LOG \d14c\c774\be14 \c624\b958 \ac74 \d655\c778', DATE '2026-03-13', 'MEDIUM', 3, 'DONE', U&'API_LOG \d14c\c774\be14 \c624\b958 \ac74 \d655\c778', TIMESTAMP '2026-03-13 18:01:13.194018', 2, 1, TIMESTAMP '2026-03-13 18:01:13.193501'),
(61, TIMESTAMP '2026-03-16 09:38:07.856085', U&'CSS Grid\c758 min-width: auto \ae30\bcf8\ac12\c73c\b85c \c778\d574 .todoItem\c758 text-overflow: ellipsis\ac00 \b3d9\c791\d558\c9c0 \c54a\b358 \bb38\c81c \c218\c815. .dayCell\acfc .dayTodos\c5d0 min-width: 0 + overflow: hidden \cd94\ac00\d558\c5ec \ae34 \d14d\c2a4\d2b8\ac00 \b9d0\c904\c784\d45c\b85c \cc98\b9ac\b418\b3c4\b85d \bcc0\acbd.', NULL, 'MEDIUM', 1, 'DONE', U&'fix: \ce98\b9b0\b354 \c77c\ac10 \d14d\c2a4\d2b8 \ae38\c774 \c81c\d55c \c5c6\c5b4 \b514\c790\c778 \ae68\c9d0 \c218\c815', TIMESTAMP '2026-03-16 09:38:15.742373', 2, 7, TIMESTAMP '2026-03-16 09:38:15.741882'),
(62, TIMESTAMP '2026-03-16 09:49:09.586747', U&'\c791\c5c5\b0b4\c5ed \c870\d68c \c2dc \baa9\b85d\c5d0 \d45c\cd9c\d560 \c77c\ac10 \ac2f\c218 \c124\c815 \ac00\b2a5\d558\ac8c \d558\ace0 \d398\c774\c9d5 \ae30\b2a5 \ad6c\d604. \bc31\c5d4\b4dc \c11c\bc84\c0ac\c774\b4dc \d398\c774\c9d5 + \d504\b860\d2b8\c5d4\b4dc \d398\c774\c9c0\b124\c774\c158 UI.', NULL, 'HIGH', 1, 'DONE', U&'feat: \c791\c5c5\b0b4\c5ed \c870\d68c \d398\c774\c9c0 \c0ac\c774\c988 \c124\c815 + \d398\c774\c9d5 \ae30\b2a5 \ad6c\d604', TIMESTAMP '2026-03-16 09:53:10.50711', 2, 7, TIMESTAMP '2026-03-16 09:53:10.506785'),
(63, TIMESTAMP '2026-03-16 09:57:01.524836', U&'\c77c\ac10 \c0c1\c138 \baa8\b2ec\c5d0\c11c description\c5d0 \b9c8\d06c\b2e4\c6b4 \b0b4\c6a9\c774 \c788\c744 \b54c \b80c\b354\b9c1\b41c \d615\d0dc\b85c \bcf4\ae30 \ae30\b2a5 \cd94\ac00. react-markdown + remark-gfm \c0ac\c6a9.', NULL, 'MEDIUM', 1, 'DONE', U&'feat: \c77c\ac10 \c0c1\c138 description Markdown \bdf0\c5b4 \ae30\b2a5 \cd94\ac00', TIMESTAMP '2026-03-16 09:59:28.231282', 2, 7, TIMESTAMP '2026-03-16 09:59:28.230864'),
(64, TIMESTAMP '2026-03-16 10:01:56.720831', U&'# Markdown \bdf0\c5b4 \d14c\c2a4\d2b8\000a\000a## \ae30\b2a5 \c694\c57d\000a\000a\c774 \c77c\ac10\c740 **Markdown \b80c\b354\b9c1**\c774 \c815\c0c1 \b3d9\c791\d558\b294\c9c0 \d655\c778\d558\ae30 \c704\d55c \d14c\c2a4\d2b8\c785\b2c8\b2e4.\000a\000a### \ccb4\d06c\b9ac\c2a4\d2b8\000a\000a- [x] react-markdown \c124\ce58\000a- [x] remark-gfm \d50c\b7ec\adf8\c778 \c801\c6a9\000a- [ ] \cf54\b4dc\be14\b85d \b80c\b354\b9c1 \d655\c778\000a- [ ] \d14c\c774\be14 \b80c\b354\b9c1 \d655\c778\000a\000a## \cf54\b4dc \c608\c2dc\000a\000a```java\000a@GetMapping("/api/todos/report")\000apublic ResponseEntity<?> getReport(\000a    @RequestParam(defaultValue = "0") int page,\000a    @RequestParam(defaultValue = "20") int size) {\000a    return ResponseEntity.ok(result);\000a}\000a```\000a\000a## \bcc0\acbd \c774\b825\000a\000a| \b0a0\c9dc | \c791\c5c5 | \b2f4\b2f9\c790 |\000a|------|------|--------|\000a| 2026-03-16 | Markdown \bdf0\c5b4 \ad6c\d604 | Claude |\000a| 2026-03-16 | \d398\c774\c9d5 \ae30\b2a5 \cd94\ac00 | Claude |\000a\000a## \cc38\ace0\c0ac\d56d\000a\000a> \b9c8\d06c\b2e4\c6b4\c740 \c77c\ac10 \c124\ba85\c5d0 `.md` \d30c\c77c \b0b4\c6a9\c744 \b4f1\b85d\d588\c744 \b54c\000a> **\bcf4\ae30 \c27d\ac8c \b80c\b354\b9c1**\d558\ae30 \c704\d574 \cd94\ac00\b41c \ae30\b2a5\c785\b2c8\b2e4.\000a\000a\b9c1\d06c \c608\c2dc: [GitHub](https://github.com)\000a\000a---\000a\000a~~\c0ad\c81c\b41c \b0b4\c6a9~~ \2192 *\c218\c815\b41c \b0b4\c6a9*', NULL, 'LOW', 1, 'TODO', U&'Markdown \bdf0\c5b4 \d14c\c2a4\d2b8 \c77c\ac10', TIMESTAMP '2026-03-16 10:01:56.720835', 2, 7, NULL),
(65, TIMESTAMP '2026-03-16 10:10:21.329571', U&'report API \c751\b2f5\c774 \bc30\c5f4\c5d0\c11c { content: [] } \d615\c2dd\c73c\b85c \bcc0\acbd\b418\c5b4 \ce98\b9b0\b354\c5d0\c11c data.filter is not a function \c5d0\b7ec \bc1c\c0dd. \ce98\b9b0\b354 API \d638\cd9c\c744 \d398\c774\c9d5 \c5c6\c774 \c804\ccb4 \b370\c774\d130 \c870\d68c\d558\b3c4\b85d \c218\c815.', NULL, 'HIGH', 2, 'DONE', U&'fix: \ce98\b9b0\b354 \b370\c774\d130 \b85c\b4dc \c2e4\d328 (report API \d398\c774\c9d5 \c751\b2f5 \d615\c2dd \bcc0\acbd \b300\c751)', TIMESTAMP '2026-03-16 10:11:26.628935', 2, 7, TIMESTAMP '2026-03-16 10:11:26.628548'),
(66, TIMESTAMP '2026-03-16 10:13:58.03951', U&'create_todo + change_status(IN_PROGRESS) \b97c \d558\b098\b85c \d569\ce5c quick_todo \b3c4\ad6c \cd94\ac00. \b2e8\c21c \c218\c815 \c2dc MCP \d638\cd9c \d69f\c218 3\21922\b85c \ac10\c18c.', NULL, 'MEDIUM', 2, 'DONE', U&'feat: MCP quick_todo \b3c4\ad6c \cd94\ac00 (\c0dd\c131+\c989\c2dc \c9c4\d589\c911 \c6d0\cf5c)', TIMESTAMP '2026-03-16 10:14:31.215395', 2, 7, TIMESTAMP '2026-03-16 10:14:31.215051'),
(67, TIMESTAMP '2026-03-16 10:38:39.629389', U&'H2 file DB\c5d0\c11c PostgreSQL\b85c \c804\d658. docker-compose\c5d0 PostgreSQL \cee8\d14c\c774\b108 \cd94\ac00, application.properties \c5f0\acb0 \c124\c815 \bcc0\acbd.', NULL, 'HIGH', 2, 'DONE', U&'feat: PostgreSQL \c804\d658 (docker-compose + application \c124\c815)', TIMESTAMP '2026-03-16 10:39:19.537558', 2, 7, TIMESTAMP '2026-03-16 10:39:19.537191'),
(69, TIMESTAMP '2026-03-03 13:48:25.937692', U&'\c0ac\c6a9\c790 \ac10\c18c\b85c \c778\d55c \b137\d37c\b12c \c81c\ac70', NULL, 'LOW', 2, 'TODO', U&'\b137\d37c\b12c \c81c\ac70', TIMESTAMP '2026-03-03 13:53:07.529713', 3, 1, NULL),
(70, TIMESTAMP '2026-03-03 13:52:50.753936', U&'\ae30 \c218\d61c\c790 \c5ec\bd80 \c624\b958 \b370\c774\d130 \c218\ae30 \c5c5\b370\c774\d2b8\000a\ae30 \c218\d61c\c790 \c778\b370 \ae30 \c218\d61c\c790 \c5ec\bd80 N\ac12\000a\ae30 \c218\d61c\c790 \c544\b2cc\b370 \ae30 \c218\d61c\c790 \c5ec\bd80 Y\ac12', DATE '2026-03-06', 'HIGH', 1, 'DONE', U&'\ae30\c218\d61c\c790 \c624\b958 \b370\c774\d130 \c218\ae30 \c5c5\b370\c774\d2b8', TIMESTAMP '2026-03-04 16:17:38.046772', 2, 1, TIMESTAMP '2026-03-04 16:17:38.046772'),
(71, TIMESTAMP '2026-03-03 13:56:12.910505', U&'\c0ac\c6a9\c790 \cde8\c18c \c0c1\d0dc\ac12\bcc4 \cde8\c18c \b85c\c9c1 \ad6c\bd84\bc29\bc95 \c124\ba85 >> \c774\d638\c131 \c120\c784\b2d8', DATE '2026-03-03', 'HIGH', 3, 'DONE', U&'\c0ac\c6a9\c790 \cde8\c18c\ac74\bcc4 \d655\c778 \bc29\bc95', TIMESTAMP '2026-03-03 15:01:38.983377', 2, 1, TIMESTAMP '2026-03-03 15:01:38.983377'),
(72, TIMESTAMP '2026-03-03 13:57:42.79883', U&'20260303 SYNC \b85c\adf8  \baa8\b2c8\d130\b9c1', DATE '2026-03-03', 'HIGHEST', 0, 'DONE', U&'20260303 SYNC \b85c\adf8 \baa8\b2c8\d130\b9c1', TIMESTAMP '2026-03-03 17:58:29.303274', 2, 1, TIMESTAMP '2026-03-03 17:58:29.303274'),
(73, TIMESTAMP '2026-03-03 14:16:24.558917', U&'\c0ac\c6a9\c790\cde8\c18c\d6c4 \c0c1\d0dc\ac12\c744 \b0b4\b824 \bc1b\c740 \b370\c774\d130 \d655\c778 \bc0f \cc98\b9ac \c9c4\d589', DATE '2026-03-03', 'HIGH', 3, 'DONE', U&'\c0ac\c6a9\c790\cde8\c18c\d6c4 \c0c1\d0dc\ac12\c744 \b0b4\b824 \bc1b\c740 \b370\c774\d130 \d655\c778', TIMESTAMP '2026-03-03 17:58:15.980365', 2, 1, TIMESTAMP '2026-03-03 17:58:15.980365'),
(74, TIMESTAMP '2026-03-03 14:56:57.325217', U&'SYNC \baa8\b2c8\d130\b9c1 \ad00\b828 \c778\c218\c778\acc4 >> \c774\d638\c131 \c120\c784\b2d8', DATE '2026-03-03', 'MEDIUM', 3, 'DONE', U&'SYNC \baa8\b2c8\d130\b9c1 \ad00\b828 \c778\c218\c778\acc4', TIMESTAMP '2026-03-03 14:57:00.46425', 2, 1, TIMESTAMP '2026-03-03 14:57:00.46425'),
(75, TIMESTAMP '2026-03-04 10:37:40.307873', U&'\bcf4\c644\c694\ccad \c2dc \ad6d\c138\ccad \b370\c774\d130 \c548\b4e4\c5b4\ac04 \ac74 \c218\ae30\c5c5\b370\c774\d2b8(\bb34\c911\b2e8)', DATE '2026-03-04', 'MEDIUM', 3, 'DONE', U&'\ad6d\c138\ccad \b370\c774\d130 \c218\ae30 \c5c5\b370\c774\d2b8', TIMESTAMP '2026-03-04 11:09:24.974791', 2, 1, TIMESTAMP '2026-03-04 11:09:24.974791'),
(76, TIMESTAMP '2026-03-04 13:19:51.937859', U&'\ce74\b4dc\c0ac \bcc0\acbd \c624\b958 \ac74 \d655\c778 (PMS \c0c1\d0dc\ac12 \c774\c0c1 \ac74)', DATE '2026-03-14', 'HIGH', 3, 'DONE', U&'\ce74\b4dc\c0ac \bcc0\acbd \c624\b958 \ac74 \d655\c778', TIMESTAMP '2026-03-05 00:58:20.692787', 2, 1, TIMESTAMP '2026-03-05 00:58:20.692787'),
(77, TIMESTAMP '2026-03-04 14:39:36.400363', U&'1. \ae30\c218\d61c\c790\000a2. \acf5\b3d9\c778\c99d\c11c\000a3. \d589\c815\c815\bcf4 \bbf8\b3d9\c758\c790\000a\ae30\c874 \ae30\c218\d61c\c790 \c815\bcf4 SET\000a\bcc0\acbd \d544\c694\d55c\c9c0 \d655\c778 \d544\c694', NULL, 'LOW', 3, 'DONE', U&'\ae30\c218\d61c\c790 \c5f0\b77d\cc98 \c815\bcf4 \b85c\c9c1 \c218\c815', TIMESTAMP '2026-03-05 00:39:11.699531', 3, 1, TIMESTAMP '2026-03-05 00:39:11.699531'),
(107, TIMESTAMP '2026-03-04 16:21:26.008826', U&'\ae30\c874 : response code \ac00 200\c774 \c544\b2cc\ac74\b9cc \c870\d68c\d558\b294 \cffc\b9ac\000a\bcc0\acbd : response code \ac00 200\c774 \b354\b77c\b3c4 response json \ceec\b7fc\c5d0 \c624\b958\ac00 \c788\c744 \c218 \c788\c5b4 \b85c\adf8 \c870\d68c \cffc\b9ac \bcc0\acbd \d6c4 \c804\b2ec >> \c774\d638\c131 \c120\c784\b2d8', DATE '2026-03-04', 'MEDIUM', 4, 'DONE', U&'SYNC \b85c\adf8 \d655\c778 \cffc\b9ac \c7ac \c791\c131 \bc0f \c7ac \c804\b2ec', TIMESTAMP '2026-03-04 16:33:52.736496', 2, 1, TIMESTAMP '2026-03-04 16:33:52.736496');

-- ============================================================
-- 4. COMMENTS (FK: users, todos)
-- ============================================================
INSERT INTO comments (id, content, created_at, updated_at, author_id, todo_id) VALUES
(1, U&'\c704 \c0ac\d56d\c73c\b85c \c6b4\c601\c11c\bc84 \d655\c778 \acb0\acfc \d734\b300\d3f0\bc88\d638 \bd88\b7ec\c624\ae34 \d558\b098 \c218\c815\ac00\b2a5', TIMESTAMP '2026-03-05 00:39:48.44521', TIMESTAMP '2026-03-05 00:39:48.44522', 3, 77),
(2, U&'\b85c\c9c1 \c218\c815 \bc0f \bc18\c601 \c644\b8cc', TIMESTAMP '2026-03-05 00:58:12.981954', TIMESTAMP '2026-03-05 00:58:12.981963', 3, 76),
(35, U&'\bcf4\ace0\c11c \c791\c131\c644\b8cc', TIMESTAMP '2026-03-03 12:52:42.184489', TIMESTAMP '2026-03-03 12:52:42.184489', 2, 37),
(65, U&'\c624\d508 \cd08\ae30 \ba54\c138\c9c0 \c2a4\cf00\c974\b7ec \be44\d65c\c131\d654\b85c \c778\d55c \c774\c288\b85c \d655\c778', TIMESTAMP '2026-03-06 10:39:06.794471', TIMESTAMP '2026-03-09 09:54:48.417844', 2, 34),
(66, U&'\ac1c\bc1c\c11c\bc84 \d14c\c2a4\d2b8 \c9c4\d589 \c911', TIMESTAMP '2026-03-06 11:08:14.846369', TIMESTAMP '2026-03-06 11:08:14.846372', 2, 35),
(67, U&'API_LOG \d14c\c774\be14 \baa8\b2c8\d130\b9c1 \ad00\b828 \c124\ba85\b4dc\b838\c2b5\b2c8\b2e4', TIMESTAMP '2026-03-03 14:57:27.494902', TIMESTAMP '2026-03-03 14:57:27.494902', 2, 74),
(68, U&'PMS \d655\c778\d6c4 \000a\c2ec\c758\c911 > \c0ac\c6a9\c790\cde8\c18c\000a\c758\acac\c81c\cd9c\c694\ccad > \c0ac\c6a9\c790\cde8\c18c\000a\c758\acac\c81c\cd9c\c644\b8cc > \adf8\b300\b85c \c9c4\d589\000a\c73c\b85c \cc98\b9ac\d558\ae30\b85c \d611\c758\b418\c5c8\c2b5\b2c8\b2e4.\000a\c2e0\ccad\c11c\bc88\d638 27036988, 26946100, 24340126, 27142395', TIMESTAMP '2026-03-03 14:58:20.944701', TIMESTAMP '2026-03-03 14:58:20.944701', 2, 73),
(69, U&'\ac15\bcd1\d6c8 \cc45\c784\b2d8 \ba54\c77c \c804\b2ec\c644\b8cc', TIMESTAMP '2026-03-03 15:02:24.579762', TIMESTAMP '2026-03-03 15:02:24.579762', 2, 37),
(70, U&'\ad6d\c138\c815\bcf4 \b300\b7c9\b4f1\b85d \c5d1\c140\c790\b8cc\b85c \cd94\cd9c \d6c4 \c804\b2ec > \c1a1\c900\c6b0 \c120\c784\b2d8', TIMESTAMP '2026-03-04 10:37:57.400616', TIMESTAMP '2026-03-04 10:44:02.851747', 2, 75),
(71, U&'DB \c5c5\b370\c774\d2b8 \c644\b8cc', TIMESTAMP '2026-03-04 11:07:00.720125', TIMESTAMP '2026-03-04 11:07:00.720125', 2, 75),
(72, U&'API_LOG \c0c1 \c624\b958 \bc1c\c0dd\b41c \acbd\c6b0 \d655\c778\b418\c5b4 \cd94\ac00\c801\c73c\b85c \c791\c5c5\d6c4 PMS \c804\c1a1\c644\b8cc', TIMESTAMP '2026-03-04 11:07:36.02905', TIMESTAMP '2026-03-04 11:07:36.02905', 2, 75),
(73, U&'\c870\d68c \bc29\bc95 \bc0f PMS\c640 \c18c\d1b5\d558\c5ec \b0b4\c6a9 \d655\c778\c694\ccad \c804\b2ec >> \c774\d638\c131 \c120\c784\b2d8', TIMESTAMP '2026-03-04 13:20:24.617475', TIMESTAMP '2026-03-04 13:20:24.617475', 2, 76),
(77, U&'\c2e0\ccad\c644\b8cc \c54c\b9bc\d1a1 \ae4c\c9c0 \d14c\c2a4\d2b8 \c644\b8cc \c774\d6c4 \c774\d638\c131 \c120\c784\b2d8 \c9c4\d589 \c608\c815 (\c6b4\c601 \bc18\c601\ae4c\c9c0)\000a11:30 \c6b4\c601\c5d0 \c18c\c2a4 \bc18\c601\ae4c\c9c0 \c644\b8cc >> \c774\d6c4 \c218\c815\b41c \c0ac\d56d \c788\c744\c2dc \c7ac\be4c\b4dc\d6c4 \bc18\c601 \d544\c694', TIMESTAMP '2026-03-06 11:37:10.645536', TIMESTAMP '2026-03-06 12:39:21.119738', 2, 35),
(79, U&'14\c2dc 37\bd84 \c774\d638\c131 \c120\c784 \bc18\c601\c644\b8cc', TIMESTAMP '2026-03-09 09:54:24.295743', TIMESTAMP '2026-03-09 09:54:24.295746', 2, 35),
(80, U&'\d2f0\c820\c18c\d504\d2b8\ce21\c5d0 mSeq\ac12 \c804\b2ec \d558\c5ec \c2e4\c81c \bc1c\c1a1\c77c\c2dc \bc1b\c744 \c218 \c788\c73c\b2c8 \d544\c694\d560 \c2dc \d574\b2f9 \bc29\bc95\c73c\b85c \c9c4\d589', TIMESTAMP '2026-03-09 09:55:17.688259', TIMESTAMP '2026-03-09 09:55:17.688262', 2, 34),
(81, U&'KT \d074\b77c\c6b0\b4dc \ad00\b9ac\c790\c5d0 \bcc0\acbd \c694\ccad \ba54\c77c \bc1c\c1a1 \c644\b8cc', TIMESTAMP '2026-03-09 09:57:19.02308', TIMESTAMP '2026-03-09 09:57:19.023083', 2, 39),
(98, U&'\b300\c5ed \b4f1\b85d\c2dc \c774\ba54\c77c \bc0f \d578\b4dc\d3f0 \bc88\d638 \c554\d638\d654 \c644\b8cc', TIMESTAMP '2026-03-10 13:31:47.98649', TIMESTAMP '2026-03-10 13:31:47.986493', 2, 42),
(99, U&'public url \c81c\ac70\c791\c5c5\c911', TIMESTAMP '2026-03-10 13:31:52.174857', TIMESTAMP '2026-03-10 13:31:52.174859', 2, 42),
(100, U&'\bcc0\acbd\c644\b8cc', TIMESTAMP '2026-03-10 14:23:25.379056', TIMESTAMP '2026-03-10 14:23:25.379058', 3, 39),
(101, U&'\bbf8\c644\c131 \b85c\c9c1 \bc1c\acac\b418\c5b4 \c218\c815 \c9c4\d589 \c911', TIMESTAMP '2026-03-10 15:15:59.839327', TIMESTAMP '2026-03-10 15:15:59.83933', 2, 43),
(102, U&'N\ac12 18\ac74\000aY\ac12 1\ac74\000aDB \cc98\b9ac \c644\b8cc \bc0f \b370\c774\d130 PMS \acf5\c720 \c644\b8cc', TIMESTAMP '2026-03-04 16:17:32.96466', TIMESTAMP '2026-03-04 16:17:32.96466', 2, 70),
(103, U&'\ce74\b4dc\c0ac \bcc0\acbd \d6c4 \b2e4\c2dc \ce74\b4dc\c0ac \bcc0\acbd \c2e0\ccad\c744 \d55c \ac83\c73c\b85c \d655\c778\b428\000a\ce74\b4dc\c0ac \bcc0\acbd \d6c4 \d398\c774\c9c0 \c0c8\b85c\ace0\ce68 \b85c\c9c1 \cd94\ac00\d558\c5ec \c8fc\d6c4 \bc18\c601 \c608\c815', TIMESTAMP '2026-03-04 16:18:37.10785', TIMESTAMP '2026-03-04 16:18:49.676091', 2, 76),
(104, U&'3/9 \bc18\c601 \c644\b8cc', TIMESTAMP '2026-03-10 16:11:04.776123', TIMESTAMP '2026-03-10 16:11:12.299807', 3, 44),
(105, U&'\ae08\c77c 22:20~ \c791\c5c5 \c608\c815\c774\ba70 \c5f0\acc4\c11c\bc84 \c2a4\c6e8\ac70 API \d638\cd9c\b85c \c791\c5c5', TIMESTAMP '2026-03-10 17:16:57.602238', TIMESTAMP '2026-03-10 17:17:44.33427', 2, 34),
(106, U&'\c791\c5c5 \c644\b8cc', TIMESTAMP '2026-03-10 22:18:19.641824', TIMESTAMP '2026-03-10 22:18:19.641828', 2, 34),
(107, U&'\baa8\b4e0\c791\c5c5 \c644\b8cc', TIMESTAMP '2026-03-11 16:11:26.927035', TIMESTAMP '2026-03-11 16:11:26.927057', 2, 42),
(108, U&'\c791\c5c5 \c644\b8cc', TIMESTAMP '2026-03-11 16:11:34.604208', TIMESTAMP '2026-03-11 16:11:34.604213', 2, 43),
(109, U&'\c791\c131\d558\c5ec \ae40\c885\c9c4 \bd80\c7a5\b2d8 \c804\b2ec \c644\b8cc', TIMESTAMP '2026-03-12 11:16:55.95823', TIMESTAMP '2026-03-12 11:16:55.958233', 2, 48),
(110, U&'(\cca8\bd80\d30c\c77c)', TIMESTAMP '2026-03-12 11:17:08.031436', TIMESTAMP '2026-03-12 11:17:08.031438', 2, 48),
(111, U&'\d45c\bcf8\c815\bcf4 \b300\b7c9\b4f1\b85d \c5d1\c140 \d30c\c77c API \b9c8\c774\adf8\b808\c774\c158 \c644\b8cc', TIMESTAMP '2026-03-12 13:41:16.455171', TIMESTAMP '2026-03-12 14:10:15.829643', 2, 47),
(113, U&'\ac15\bcd1\d6c8 \cc45\c784\b2d8 \c804\b2ec \c644\b8cc', TIMESTAMP '2026-03-13 10:57:48.317541', TIMESTAMP '2026-03-13 10:57:48.317544', 2, 51),
(114, U&'ARS \c6a9 API \c11c\be44\c2a4 \ac1c\bc1c \d544\c694 \ad00\b828 \b0b4\c6a9 \c804\b2ec >> \ac15\bcd1\d6c8 \cc45\c784\b2d8', TIMESTAMP '2026-03-13 11:24:24.328141', TIMESTAMP '2026-03-13 13:08:16.811865', 2, 49),
(115, U&'WAS 10\b300 WEB 5\b300 \b85c \bcc0\acbd \c758\acac\c774 \c788\c5b4 \b300\ae30 \c911', TIMESTAMP '2026-03-13 11:25:29.564546', TIMESTAMP '2026-03-13 11:25:29.56455', 2, 37),
(116, U&'DNA\c815\bcf4 \b300\b7c9\b4f1\b85d \c5d1\c140 \d30c\c77c API \b9c8\c774\adf8\b808\c774\c158 \c644\b8cc', TIMESTAMP '2026-03-13 15:55:53.710147', TIMESTAMP '2026-03-13 15:55:53.710151', 2, 47),
(118, U&'\ac1c\bc1c\c11c\bc84\c6a9/\c6b4\c601\c11c\bc84\c6a9 \c5d1\c140\c790\b8cc \bd84\b9ac \c791\c5c5 \b0a8\c74c', TIMESTAMP '2026-03-13 16:12:51.614552', TIMESTAMP '2026-03-13 16:12:51.614556', 2, 47),
(120, U&'\d558\c704 \d504\b85c\c81d\d2b8 \c77c\ac10 \d1b5\d569 \c870\d68c \bc0f \cd5c\c0c1\c704 \d504\b85c\c81d\d2b8\ba85 \cd9c\b825 \ad6c\d604', TIMESTAMP '2026-03-13 16:26:48.819373', TIMESTAMP '2026-03-13 16:26:48.819376', 2, 53),
(121, U&'\d504\b85c\c81d\d2b8 \c124\c815 \baa8\b2ec \ad6c\d604 (\cc38\c5ec\c790 \ad00\b9ac, \c5c5\bb34\bcf4\ace0 \d3ec\d568 \c124\c815, API Key \ad00\b9ac \d0ed \d1b5\d569)', TIMESTAMP '2026-03-13 16:47:36.155703', TIMESTAMP '2026-03-13 16:47:36.155714', 2, 54),
(122, U&'\ce78\bc18\bcf4\b4dc \d558\c704 \d504\b85c\c81d\d2b8 \c77c\ac10 \d45c\c2dc \bc94\c704 \c218\c815 \c644\b8cc', TIMESTAMP '2026-03-13 16:58:30.66356', TIMESTAMP '2026-03-13 16:58:30.663563', 2, 55),
(123, U&'\ad8c\d55c \c5c6\b294 \c0c1\c704 \d504\b85c\c81d\d2b8 \be44\d65c\c131 \d45c\c2dc \bc0f \c811\adfc \cc28\b2e8 \ad6c\d604', TIMESTAMP '2026-03-13 17:09:10.773977', TIMESTAMP '2026-03-13 17:09:10.773982', 2, 58),
(124, U&'\ccab \bc88\c9f8 \d14c\c2a4\d2b8 \b313\ae00', TIMESTAMP '2026-03-13 17:57:13.909544', TIMESTAMP '2026-03-13 17:57:13.909546', 2, 59),
(125, U&'\b450 \bc88\c9f8 \d14c\c2a4\d2b8 \b313\ae00', TIMESTAMP '2026-03-13 17:57:19.279223', TIMESTAMP '2026-03-13 17:57:19.279233', 2, 59),
(126, U&'\c624\b958 \d655\c778\b418\c5b4 \c774\d638\c131 \c120\c784\b2d8\aed8 \c804\b2ec', TIMESTAMP '2026-03-13 18:01:26.408353', TIMESTAMP '2026-03-13 18:01:26.408356', 2, 60),
(127, U&'\c774\d638\c131 \c120\c784\b2d8 PMS\c640 \d655\c778\d6c4 \cc98\b9ac \c644\b8cc', TIMESTAMP '2026-03-13 18:01:39.975653', TIMESTAMP '2026-03-13 18:01:39.975657', 2, 60),
(128, U&'\ac1c\bc1c\c11c\bc84 \bc0f \c6b4\c601\c11c\bc84\c6a9 \c5d1\c140\c790\b8cc \bd84\b9ac \c644\b8cc', TIMESTAMP '2026-03-16 09:11:15.26834', TIMESTAMP '2026-03-16 09:11:15.268343', 2, 47);

-- ============================================================
-- 5. ATTACHMENTS (FK: comments, todos, users)
-- ============================================================
INSERT INTO attachments (id, content_type, created_at, file_size, original_filename, stored_filename, comment_id, todo_id, uploaded_by) VALUES
(33, 'text/plain', TIMESTAMP '2026-03-12 11:17:08.074729', 9973, 'digital_dir_tree.txt', 'BRMG/c0940842-fee0-497f-a31a-c4c7eb158597.txt', 110, 48, 2);

-- ============================================================
-- 6. COMMENT_READS (FK: users, comments)
-- ============================================================
INSERT INTO comment_reads (id, read_at, comment_id, user_id) VALUES
(1, TIMESTAMP '2026-03-05 00:39:48.450349', 1, 3),
(2, TIMESTAMP '2026-03-09 13:36:23.310318', 35, 35),
(3, TIMESTAMP '2026-03-09 13:36:23.310318', 69, 35),
(4, TIMESTAMP '2026-03-05 00:42:40.113111', 73, 35),
(5, TIMESTAMP '2026-03-05 00:42:40.116262', 103, 35),
(6, TIMESTAMP '2026-03-11 09:32:47.350993', 1, 2),
(7, TIMESTAMP '2026-03-10 16:09:24.843187', 2, 3),
(8, TIMESTAMP '2026-03-11 09:32:46.201643', 2, 2),
(65, TIMESTAMP '2026-03-10 22:18:19.672791', 65, 2),
(66, TIMESTAMP '2026-03-11 09:32:58.918038', 66, 2),
(70, TIMESTAMP '2026-03-11 09:32:58.918038', 77, 2),
(72, TIMESTAMP '2026-03-11 09:32:58.918038', 79, 2),
(73, TIMESTAMP '2026-03-10 22:18:19.672791', 80, 2),
(74, TIMESTAMP '2026-03-11 09:32:42.232213', 81, 2),
(91, TIMESTAMP '2026-03-11 16:11:26.989007', 98, 2),
(92, TIMESTAMP '2026-03-11 16:11:26.989007', 99, 2),
(93, TIMESTAMP '2026-03-10 14:23:25.403411', 81, 3),
(94, TIMESTAMP '2026-03-10 14:23:25.403411', 100, 3),
(95, TIMESTAMP '2026-03-11 09:32:42.232213', 100, 2),
(96, TIMESTAMP '2026-03-11 16:11:34.628862', 101, 2),
(97, TIMESTAMP '2026-03-10 16:08:20.670612', 65, 3),
(98, TIMESTAMP '2026-03-10 16:08:20.670612', 80, 3),
(99, TIMESTAMP '2026-03-10 16:11:12.324738', 104, 3),
(100, TIMESTAMP '2026-03-13 17:11:01.846622', 104, 4),
(101, TIMESTAMP '2026-03-13 17:10:48.951303', 81, 4),
(102, TIMESTAMP '2026-03-13 17:10:48.951303', 100, 4),
(103, TIMESTAMP '2026-03-11 12:26:49.908003', 102, 4),
(104, TIMESTAMP '2026-03-11 12:28:28.969734', 1, 4),
(105, TIMESTAMP '2026-03-10 16:20:39.384074', 2, 4),
(106, TIMESTAMP '2026-03-10 16:20:39.384074', 73, 4),
(107, TIMESTAMP '2026-03-10 16:20:39.384074', 103, 4),
(108, TIMESTAMP '2026-03-10 16:20:52.954458', 70, 4),
(109, TIMESTAMP '2026-03-10 16:20:52.954458', 71, 4),
(110, TIMESTAMP '2026-03-10 16:20:52.954458', 72, 4),
(111, TIMESTAMP '2026-03-10 16:21:03.046892', 68, 4),
(112, TIMESTAMP '2026-03-13 17:10:52.961617', 66, 4),
(113, TIMESTAMP '2026-03-13 17:10:52.961617', 77, 4),
(114, TIMESTAMP '2026-03-13 17:10:52.961617', 79, 4),
(115, TIMESTAMP '2026-03-13 15:25:18.525666', 35, 4),
(116, TIMESTAMP '2026-03-13 15:25:18.525666', 69, 4),
(117, TIMESTAMP '2026-03-10 16:22:42.239462', 65, 4),
(118, TIMESTAMP '2026-03-10 16:22:42.239462', 80, 4),
(119, TIMESTAMP '2026-03-11 09:22:51.155471', 104, 2),
(120, TIMESTAMP '2026-03-10 22:18:19.672791', 105, 2),
(121, TIMESTAMP '2026-03-10 22:18:19.672791', 106, 2),
(122, TIMESTAMP '2026-03-11 16:11:26.989007', 107, 2),
(123, TIMESTAMP '2026-03-11 16:11:34.628862', 108, 2),
(124, TIMESTAMP '2026-03-12 14:09:12.0253', 109, 2),
(125, TIMESTAMP '2026-03-12 14:09:12.0253', 110, 2),
(126, TIMESTAMP '2026-03-16 09:11:15.289352', 111, 2),
(128, TIMESTAMP '2026-03-16 10:30:40.805469', 113, 2),
(129, TIMESTAMP '2026-03-13 16:59:33.759633', 114, 2),
(130, TIMESTAMP '2026-03-13 13:10:55.613135', 115, 2),
(131, TIMESTAMP '2026-03-13 13:09:55.934103', 113, 35),
(132, TIMESTAMP '2026-03-16 09:19:44.112958', 114, 4),
(133, TIMESTAMP '2026-03-13 16:28:32.60488', 113, 4),
(134, TIMESTAMP '2026-03-13 15:25:18.525666', 115, 4),
(135, TIMESTAMP '2026-03-16 09:11:15.289352', 116, 2),
(137, TIMESTAMP '2026-03-16 09:11:15.289352', 118, 2),
(139, TIMESTAMP '2026-03-13 16:38:45.201228', 120, 2),
(140, TIMESTAMP '2026-03-13 16:50:33.83714', 121, 2),
(141, TIMESTAMP '2026-03-13 17:47:11.50121', 122, 2),
(142, TIMESTAMP '2026-03-13 17:47:13.959501', 123, 2),
(143, TIMESTAMP '2026-03-13 17:57:20.30447', 124, 2),
(144, TIMESTAMP '2026-03-13 17:57:20.30447', 125, 2),
(145, TIMESTAMP '2026-03-13 18:01:39.997766', 126, 2),
(146, TIMESTAMP '2026-03-13 18:01:39.997766', 127, 2),
(147, TIMESTAMP '2026-03-16 09:11:15.289352', 128, 2),
(148, TIMESTAMP '2026-03-16 09:17:31.677034', 126, 4),
(149, TIMESTAMP '2026-03-16 09:17:31.677034', 127, 4),
(185, TIMESTAMP '2026-03-13 13:10:55.613135', 35, 2),
(187, TIMESTAMP '2026-03-03 13:24:07.250267', 35, 3),
(217, TIMESTAMP '2026-03-03 14:57:27.497133', 67, 2),
(218, TIMESTAMP '2026-03-03 14:58:20.94524', 68, 2),
(219, TIMESTAMP '2026-03-13 13:10:55.613135', 69, 2),
(220, TIMESTAMP '2026-03-11 09:32:44.636008', 70, 2),
(221, TIMESTAMP '2026-03-11 09:32:44.636008', 71, 2),
(222, TIMESTAMP '2026-03-11 09:32:44.636008', 72, 2),
(223, TIMESTAMP '2026-03-11 09:32:46.201643', 73, 2),
(225, TIMESTAMP '2026-03-04 16:00:06.882161', 69, 3),
(252, TIMESTAMP '2026-03-11 09:32:40.088859', 102, 2),
(253, TIMESTAMP '2026-03-11 09:32:46.201643', 103, 2),
(254, TIMESTAMP '2026-03-04 16:23:01.941429', 102, 3),
(255, TIMESTAMP '2026-03-10 16:09:24.843187', 73, 3),
(257, TIMESTAMP '2026-03-10 16:09:24.843187', 103, 3);

-- ============================================================
-- 7. PROJECT_MEMBERS (FK: projects, users)
-- ============================================================
INSERT INTO project_members (id, created_at, role, project_id, user_id) VALUES
(1, TIMESTAMP '2026-03-04 17:13:49.929124', 'MASTER', 1, 1),
(2, TIMESTAMP '2026-03-09 14:24:01.679323', 'MASTER', 2, 2),
(3, TIMESTAMP '2026-03-09 14:25:04.591762', 'MASTER', 3, 2),
(4, TIMESTAMP '2026-03-10 13:34:16.227424', 'MEMBER', 1, 4),
(5, TIMESTAMP '2026-03-13 13:11:13.21468', 'MEMBER', 2, 35),
(6, TIMESTAMP '2026-03-13 13:12:33.728155', 'MASTER', 4, 35),
(7, TIMESTAMP '2026-03-13 13:12:40.058949', 'MEMBER', 4, 2),
(10, TIMESTAMP '2026-03-13 13:41:34.498579', 'MASTER', 6, 2),
(11, TIMESTAMP '2026-03-13 13:42:03.738841', 'MASTER', 7, 2),
(12, TIMESTAMP '2026-03-13 17:00:34.596979', 'MASTER', 8, 2),
(65, TIMESTAMP '2026-03-04 17:23:26.736399', 'MASTER', 1, 2),
(66, TIMESTAMP '2026-03-04 17:23:29.102496', 'MEMBER', 1, 3),
(67, TIMESTAMP '2026-03-04 17:23:31.171011', 'MEMBER', 1, 35),
(68, TIMESTAMP '2026-03-04 17:23:33.572348', 'MEMBER', 1, 36);

-- ============================================================
-- 8. PROJECT_FAVORITES (FK: projects, users)
-- ============================================================
INSERT INTO project_favorites (id, created_at, project_id, user_id) VALUES
(1, TIMESTAMP '2026-03-09 14:24:03.138974', 2, 2),
(3, TIMESTAMP '2026-02-27 12:21:23.283366', 1, 1),
(4, TIMESTAMP '2026-03-13 13:41:48.906533', 6, 2),
(5, TIMESTAMP '2026-02-27 12:40:47.686892', 1, 2);

-- ============================================================
-- 9. TODO_ASSIGNEES (FK: todos, users)
-- ============================================================
INSERT INTO todo_assignees (todo_id, user_id) VALUES
(45, 4),
(51, 2),
(51, 36),
(60, 2),
(60, 4);

-- ============================================================
-- 10. API_KEYS (FK: projects, users)
-- ============================================================
INSERT INTO api_keys (id, created_at, expires_at, key_hash, key_prefix, last_used_at, name, revoked, project_id, user_id) VALUES
(1, TIMESTAMP '2026-03-13 14:05:42.240154', TIMESTAMP '2027-03-13 14:05:42.185184', '$2a$10$dH99TFGIWD9QgI4acWvJ/emxe40FlFNaDFIn5P8Rum1AStFS1yFji', 'ak_M_vEn', TIMESTAMP '2026-03-16 10:39:19.532744', 'ysk-jira', FALSE, 7, 2),
(2, TIMESTAMP '2026-03-13 14:11:03.609995', TIMESTAMP '2027-03-13 14:11:03.558549', '$2a$10$232mPmXVhcd1nxBoWO/L7OQEjmhHmwhwTcevkSMLTTLrjfzDrYNTS', 'ak_hAYGj', NULL, 'ysk-nibr', TRUE, 3, 2),
(3, TIMESTAMP '2026-03-13 14:30:28.796464', NULL, '$2a$10$Gfa9F1adzcZocMDGZoFFl.XEwucXjnPFrARhj7KNIJnQkNNYxm1bq', 'ak_wXepl', TIMESTAMP '2026-03-13 16:12:51.610495', 'ysk-nibr', FALSE, 3, 2);

-- ============================================================
-- 11. ACTIVITY_LOGS
-- ============================================================
INSERT INTO activity_logs (id, activity_type, actor_id, actor_name, created_at, detail, new_value, old_value, project_id, project_name, todo_id, todo_summary) VALUES
(1, 'CREATED', 2, U&'\c720\c131\ad00', TIMESTAMP '2026-03-16 09:38:07.868944', U&'\c77c\ac10 \c0dd\c131: fix: \ce98\b9b0\b354 \c77c\ac10 \d14d\c2a4\d2b8 \ae38\c774 \c81c\d55c \c5c6\c5b4 \b514\c790\c778 \ae68\c9d0 \c218\c815', NULL, NULL, 7, 'JIRA-TEST', 61, U&'fix: \ce98\b9b0\b354 \c77c\ac10 \d14d\c2a4\d2b8 \ae38\c774 \c81c\d55c \c5c6\c5b4 \b514\c790\c778 \ae68\c9d0 \c218\c815'),
(2, 'STATUS_CHANGED', 2, U&'\c720\c131\ad00', TIMESTAMP '2026-03-16 09:38:15.746924', U&'\c0c1\d0dc \bcc0\acbd', 'DONE', 'TODO', 7, 'JIRA-TEST', 61, U&'fix: \ce98\b9b0\b354 \c77c\ac10 \d14d\c2a4\d2b8 \ae38\c774 \c81c\d55c \c5c6\c5b4 \b514\c790\c778 \ae68\c9d0 \c218\c815'),
(3, 'CREATED', 2, U&'\c720\c131\ad00', TIMESTAMP '2026-03-16 09:49:09.588386', U&'\c77c\ac10 \c0dd\c131: feat: \c791\c5c5\b0b4\c5ed \c870\d68c \d398\c774\c9c0 \c0ac\c774\c988 \c124\c815 + \d398\c774\c9d5 \ae30\b2a5 \ad6c\d604', NULL, NULL, 7, 'JIRA-TEST', 62, U&'feat: \c791\c5c5\b0b4\c5ed \c870\d68c \d398\c774\c9c0 \c0ac\c774\c988 \c124\c815 + \d398\c774\c9d5 \ae30\b2a5 \ad6c\d604'),
(4, 'STATUS_CHANGED', 2, U&'\c720\c131\ad00', TIMESTAMP '2026-03-16 09:49:13.836358', U&'\c0c1\d0dc \bcc0\acbd', 'IN_PROGRESS', 'TODO', 7, 'JIRA-TEST', 62, U&'feat: \c791\c5c5\b0b4\c5ed \c870\d68c \d398\c774\c9c0 \c0ac\c774\c988 \c124\c815 + \d398\c774\c9d5 \ae30\b2a5 \ad6c\d604'),
(5, 'STATUS_CHANGED', 2, U&'\c720\c131\ad00', TIMESTAMP '2026-03-16 09:53:10.510375', U&'\c0c1\d0dc \bcc0\acbd', 'DONE', 'IN_PROGRESS', 7, 'JIRA-TEST', 62, U&'feat: \c791\c5c5\b0b4\c5ed \c870\d68c \d398\c774\c9c0 \c0ac\c774\c988 \c124\c815 + \d398\c774\c9d5 \ae30\b2a5 \ad6c\d604'),
(6, 'CREATED', 2, U&'\c720\c131\ad00', TIMESTAMP '2026-03-16 09:57:01.526357', U&'\c77c\ac10 \c0dd\c131: feat: \c77c\ac10 \c0c1\c138 description Markdown \bdf0\c5b4 \ae30\b2a5 \cd94\ac00', NULL, NULL, 7, 'JIRA-TEST', 63, U&'feat: \c77c\ac10 \c0c1\c138 description Markdown \bdf0\c5b4 \ae30\b2a5 \cd94\ac00'),
(7, 'STATUS_CHANGED', 2, U&'\c720\c131\ad00', TIMESTAMP '2026-03-16 09:57:07.386398', U&'\c0c1\d0dc \bcc0\acbd', 'IN_PROGRESS', 'TODO', 7, 'JIRA-TEST', 63, U&'feat: \c77c\ac10 \c0c1\c138 description Markdown \bdf0\c5b4 \ae30\b2a5 \cd94\ac00'),
(8, 'STATUS_CHANGED', 2, U&'\c720\c131\ad00', TIMESTAMP '2026-03-16 09:59:28.234324', U&'\c0c1\d0dc \bcc0\acbd', 'DONE', 'IN_PROGRESS', 7, 'JIRA-TEST', 63, U&'feat: \c77c\ac10 \c0c1\c138 description Markdown \bdf0\c5b4 \ae30\b2a5 \cd94\ac00'),
(9, 'CREATED', 2, U&'\c720\c131\ad00', TIMESTAMP '2026-03-16 10:01:56.722378', U&'\c77c\ac10 \c0dd\c131: Markdown \bdf0\c5b4 \d14c\c2a4\d2b8 \c77c\ac10', NULL, NULL, 7, 'JIRA-TEST', 64, U&'Markdown \bdf0\c5b4 \d14c\c2a4\d2b8 \c77c\ac10'),
(10, 'CREATED', 2, U&'\c720\c131\ad00', TIMESTAMP '2026-03-16 10:10:21.341248', U&'\c77c\ac10 \c0dd\c131: fix: \ce98\b9b0\b354 \b370\c774\d130 \b85c\b4dc \c2e4\d328 (report API \d398\c774\c9d5 \c751\b2f5 \d615\c2dd \bcc0\acbd \b300\c751)', NULL, NULL, 7, 'JIRA-TEST', 65, U&'fix: \ce98\b9b0\b354 \b370\c774\d130 \b85c\b4dc \c2e4\d328 (report API \d398\c774\c9d5 \c751\b2f5 \d615\c2dd \bcc0\acbd \b300\c751)'),
(11, 'STATUS_CHANGED', 2, U&'\c720\c131\ad00', TIMESTAMP '2026-03-16 10:10:25.684041', U&'\c0c1\d0dc \bcc0\acbd', 'IN_PROGRESS', 'TODO', 7, 'JIRA-TEST', 65, U&'fix: \ce98\b9b0\b354 \b370\c774\d130 \b85c\b4dc \c2e4\d328 (report API \d398\c774\c9d5 \c751\b2f5 \d615\c2dd \bcc0\acbd \b300\c751)'),
(12, 'STATUS_CHANGED', 2, U&'\c720\c131\ad00', TIMESTAMP '2026-03-16 10:11:26.638937', U&'\c0c1\d0dc \bcc0\acbd', 'DONE', 'IN_PROGRESS', 7, 'JIRA-TEST', 65, U&'fix: \ce98\b9b0\b354 \b370\c774\d130 \b85c\b4dc \c2e4\d328 (report API \d398\c774\c9d5 \c751\b2f5 \d615\c2dd \bcc0\acbd \b300\c751)'),
(13, 'CREATED', 2, U&'\c720\c131\ad00', TIMESTAMP '2026-03-16 10:13:58.042407', U&'\c77c\ac10 \c0dd\c131: feat: MCP quick_todo \b3c4\ad6c \cd94\ac00 (\c0dd\c131+\c989\c2dc \c9c4\d589\c911 \c6d0\cf5c)', NULL, NULL, 7, 'JIRA-TEST', 66, U&'feat: MCP quick_todo \b3c4\ad6c \cd94\ac00 (\c0dd\c131+\c989\c2dc \c9c4\d589\c911 \c6d0\cf5c)'),
(14, 'STATUS_CHANGED', 2, U&'\c720\c131\ad00', TIMESTAMP '2026-03-16 10:14:02.008717', U&'\c0c1\d0dc \bcc0\acbd', 'IN_PROGRESS', 'TODO', 7, 'JIRA-TEST', 66, U&'feat: MCP quick_todo \b3c4\ad6c \cd94\ac00 (\c0dd\c131+\c989\c2dc \c9c4\d589\c911 \c6d0\cf5c)'),
(15, 'STATUS_CHANGED', 2, U&'\c720\c131\ad00', TIMESTAMP '2026-03-16 10:14:31.218957', U&'\c0c1\d0dc \bcc0\acbd', 'DONE', 'IN_PROGRESS', 7, 'JIRA-TEST', 66, U&'feat: MCP quick_todo \b3c4\ad6c \cd94\ac00 (\c0dd\c131+\c989\c2dc \c9c4\d589\c911 \c6d0\cf5c)'),
(16, 'CREATED', 2, U&'\c720\c131\ad00', TIMESTAMP '2026-03-16 10:38:39.646448', U&'\c77c\ac10 \c0dd\c131: feat: PostgreSQL \c804\d658 (docker-compose + application \c124\c815)', NULL, NULL, 7, U&'\c77c\ac10\ad00\b9ac', 67, U&'feat: PostgreSQL \c804\d658 (docker-compose + application \c124\c815)'),
(17, 'STATUS_CHANGED', 2, U&'\c720\c131\ad00', TIMESTAMP '2026-03-16 10:38:45.586308', U&'\c0c1\d0dc \bcc0\acbd', 'IN_PROGRESS', 'TODO', 7, U&'\c77c\ac10\ad00\b9ac', 67, U&'feat: PostgreSQL \c804\d658 (docker-compose + application \c124\c815)'),
(18, 'STATUS_CHANGED', 2, U&'\c720\c131\ad00', TIMESTAMP '2026-03-16 10:39:19.541487', U&'\c0c1\d0dc \bcc0\acbd', 'DONE', 'IN_PROGRESS', 7, U&'\c77c\ac10\ad00\b9ac', 67, U&'feat: PostgreSQL \c804\d658 (docker-compose + application \c124\c815)');

-- ============================================================
-- 12. NOTIFICATIONS
-- ============================================================
INSERT INTO notifications (id, created_at, is_read, message, todo_id, type, user_id) VALUES
(1, TIMESTAMP '2026-03-05 12:33:19.473307', TRUE, U&'[\c18c\c0c1\acf5\c778 \bc14\c6b0\cc98] 2484\b2d8\c774 [WAS, WEB \c11c\bc84 \cd95\c18c]\c5d0 \b313\ae00\c744 \b0a8\acbc\c2b5\b2c8\b2e4.', 37, 'COMMENT_ADDED', 2),
(2, TIMESTAMP '2026-03-05 12:33:32.462232', TRUE, U&'[\c18c\c0c1\acf5\c778 \bc14\c6b0\cc98] 2484\b2d8\c774 [WAS, WEB \c11c\bc84 \cd95\c18c]\c5d0 \b313\ae00\c744 \b0a8\acbc\c2b5\b2c8\b2e4.', 37, 'COMMENT_ADDED', 2),
(3, TIMESTAMP '2026-03-05 12:33:37.686725', TRUE, U&'[\c18c\c0c1\acf5\c778 \bc14\c6b0\cc98] 2484\b2d8\c774 [WAS, WEB \c11c\bc84 \cd95\c18c]\c5d0 \b313\ae00\c744 \b0a8\acbc\c2b5\b2c8\b2e4.', 37, 'COMMENT_ADDED', 2),
(33, TIMESTAMP '2026-03-10 14:23:25.38073', TRUE, U&'[\c18c\c0c1\acf5\c778 \bc14\c6b0\cc98] \c774\b300\c6d0\b2d8\c774 [KT CLOUD CDN \ac8c\c815 \c815\bcf4 \bcc0\acbd]\c5d0 \b313\ae00\c744 \b0a8\acbc\c2b5\b2c8\b2e4.', 39, 'COMMENT_ADDED', 2),
(34, TIMESTAMP '2026-03-10 14:23:28.300802', TRUE, U&'[\c18c\c0c1\acf5\c778 \bc14\c6b0\cc98] \c774\b300\c6d0\b2d8\c774 [KT CLOUD CDN \ac8c\c815 \c815\bcf4 \bcc0\acbd] \c0c1\d0dc\b97c IN_PROGRESS \2192 DONE\b85c \bcc0\acbd\d588\c2b5\b2c8\b2e4.', 39, 'STATUS_CHANGED', 2),
(35, TIMESTAMP '2026-03-10 16:08:01.533144', TRUE, U&'[\c18c\c0c1\acf5\c778 \bc14\c6b0\cc98] \c774\b300\c6d0\b2d8\c774 [\c758\acac\c81c\cd9c \c54c\b9bc\d1a1 \c2e4\c81c \bc1c\c1a1 \c77c\c2dc \bbf8\c0bd\c785 \ac74 \d655\c778 \c694\ccad] \c0c1\d0dc\b97c IN_PROGRESS \2192 DONE\b85c \bcc0\acbd\d588\c2b5\b2c8\b2e4.', 34, 'STATUS_CHANGED', 2),
(36, TIMESTAMP '2026-03-10 16:08:19.843347', TRUE, U&'[\c18c\c0c1\acf5\c778 \bc14\c6b0\cc98] \c774\b300\c6d0\b2d8\c774 [\c758\acac\c81c\cd9c \c54c\b9bc\d1a1 \c2e4\c81c \bc1c\c1a1 \c77c\c2dc \bbf8\c0bd\c785 \ac74 \d655\c778 \c694\ccad] \c0c1\d0dc\b97c DONE \2192 IN_PROGRESS\b85c \bcc0\acbd\d588\c2b5\b2c8\b2e4.', 34, 'STATUS_CHANGED', 2),
(37, TIMESTAMP '2026-03-10 16:08:41.827247', TRUE, U&'[\c18c\c0c1\acf5\c778 \bc14\c6b0\cc98] \c774\b300\c6d0\b2d8\c774 [\c758\acac\c81c\cd9c \c54c\b9bc\d1a1 \c2e4\c81c \bc1c\c1a1 \c77c\c2dc \bbf8\c0bd\c785 \ac74 \d655\c778 \c694\ccad] \c0c1\d0dc\b97c IN_PROGRESS \2192 DONE\b85c \bcc0\acbd\d588\c2b5\b2c8\b2e4.', 34, 'STATUS_CHANGED', 2),
(38, TIMESTAMP '2026-03-10 16:08:50.655834', TRUE, U&'[\c18c\c0c1\acf5\c778 \bc14\c6b0\cc98] \c774\b300\c6d0\b2d8\c774 [\c758\acac\c81c\cd9c \c54c\b9bc\d1a1 \c2e4\c81c \bc1c\c1a1 \c77c\c2dc \bbf8\c0bd\c785 \ac74 \d655\c778 \c694\ccad] \c0c1\d0dc\b97c DONE \2192 IN_PROGRESS\b85c \bcc0\acbd\d588\c2b5\b2c8\b2e4.', 34, 'STATUS_CHANGED', 2),
(39, TIMESTAMP '2026-03-13 10:57:39.2464', FALSE, U&'[\c18c\c0c1\acf5\c778 \bc14\c6b0\cc98] \c720\c131\ad00\b2d8\c774 [\c0ac\c6a9\b3c5\b824 \bc0f \c0ac\c6a9 \ae30\ac04\c548\b0b4 \c54c\b9bc\d1a1 \c0ac\c6a9 \c774\b825 \d655\c778]\c5d0 \b2f4\b2f9\c790\b85c \c9c0\c815\d588\c2b5\b2c8\b2e4.', 51, 'ASSIGNED', 36),
(40, TIMESTAMP '2026-03-13 10:57:41.233355', FALSE, U&'[\c18c\c0c1\acf5\c778 \bc14\c6b0\cc98] \c720\c131\ad00\b2d8\c774 [\c0ac\c6a9\b3c5\b824 \bc0f \c0ac\c6a9 \ae30\ac04\c548\b0b4 \c54c\b9bc\d1a1 \c0ac\c6a9 \c774\b825 \d655\c778] \c0c1\d0dc\b97c TODO \2192 DONE\b85c \bcc0\acbd\d588\c2b5\b2c8\b2e4.', 51, 'STATUS_CHANGED', 36),
(41, TIMESTAMP '2026-03-13 10:57:48.320305', FALSE, U&'[\c18c\c0c1\acf5\c778 \bc14\c6b0\cc98] \c720\c131\ad00\b2d8\c774 [\c0ac\c6a9\b3c5\b824 \bc0f \c0ac\c6a9 \ae30\ac04\c548\b0b4 \c54c\b9bc\d1a1 \c0ac\c6a9 \c774\b825 \d655\c778]\c5d0 \b313\ae00\c744 \b0a8\acbc\c2b5\b2c8\b2e4.', 51, 'COMMENT_ADDED', 36),
(42, TIMESTAMP '2026-03-13 18:01:13.171501', FALSE, U&'[\c18c\c0c1\acf5\c778 \bc14\c6b0\cc98] \c720\c131\ad00\b2d8\c774 [API_LOG \d14c\c774\be14 \c624\b958 \ac74 \d655\c778]\c5d0 \b2f4\b2f9\c790\b85c \c9c0\c815\d588\c2b5\b2c8\b2e4.', 60, 'ASSIGNED', 4),
(43, TIMESTAMP '2026-03-13 18:01:13.196009', FALSE, U&'[\c18c\c0c1\acf5\c778 \bc14\c6b0\cc98] \c720\c131\ad00\b2d8\c774 [API_LOG \d14c\c774\be14 \c624\b958 \ac74 \d655\c778] \c0c1\d0dc\b97c TODO \2192 DONE\b85c \bcc0\acbd\d588\c2b5\b2c8\b2e4.', 60, 'STATUS_CHANGED', 4),
(44, TIMESTAMP '2026-03-13 18:01:26.410363', FALSE, U&'[\c18c\c0c1\acf5\c778 \bc14\c6b0\cc98] \c720\c131\ad00\b2d8\c774 [API_LOG \d14c\c774\be14 \c624\b958 \ac74 \d655\c778]\c5d0 \b313\ae00\c744 \b0a8\acbc\c2b5\b2c8\b2e4.', 60, 'COMMENT_ADDED', 4),
(45, TIMESTAMP '2026-03-13 18:01:39.977503', FALSE, U&'[\c18c\c0c1\acf5\c778 \bc14\c6b0\cc98] \c720\c131\ad00\b2d8\c774 [API_LOG \d14c\c774\be14 \c624\b958 \ac74 \d655\c778]\c5d0 \b313\ae00\c744 \b0a8\acbc\c2b5\b2c8\b2e4.', 60, 'COMMENT_ADDED', 4);

-- ============================================================
-- 13. 시퀀스 리셋 (각 테이블의 max(id) + 1로 설정)
-- ============================================================
SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 0) FROM users) + 1, false);
SELECT setval('projects_id_seq', (SELECT COALESCE(MAX(id), 0) FROM projects) + 1, false);
SELECT setval('todos_id_seq', (SELECT COALESCE(MAX(id), 0) FROM todos) + 1, false);
SELECT setval('comments_id_seq', (SELECT COALESCE(MAX(id), 0) FROM comments) + 1, false);
SELECT setval('attachments_id_seq', (SELECT COALESCE(MAX(id), 0) FROM attachments) + 1, false);
SELECT setval('comment_reads_id_seq', (SELECT COALESCE(MAX(id), 0) FROM comment_reads) + 1, false);
SELECT setval('project_members_id_seq', (SELECT COALESCE(MAX(id), 0) FROM project_members) + 1, false);
SELECT setval('project_favorites_id_seq', (SELECT COALESCE(MAX(id), 0) FROM project_favorites) + 1, false);
SELECT setval('api_keys_id_seq', (SELECT COALESCE(MAX(id), 0) FROM api_keys) + 1, false);
SELECT setval('activity_logs_id_seq', (SELECT COALESCE(MAX(id), 0) FROM activity_logs) + 1, false);
SELECT setval('notifications_id_seq', (SELECT COALESCE(MAX(id), 0) FROM notifications) + 1, false);

COMMIT;
