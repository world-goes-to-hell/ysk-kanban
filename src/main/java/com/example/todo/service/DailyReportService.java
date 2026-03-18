package com.example.todo.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.todo.entity.Comment;
import com.example.todo.entity.Project;
import com.example.todo.entity.Todo;
import com.example.todo.entity.User;
import com.example.todo.repository.CommentRepository;
import com.example.todo.repository.TodoRepository;
import com.example.todo.repository.UserReportSettingRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DailyReportService {

    private final TodoRepository todoRepository;
    private final CommentRepository commentRepository;
    private final UserReportSettingRepository userReportSettingRepository;

    private int[] getSubtaskProgress(Long parentId) {
        List<Todo> children = todoRepository.findByParent_IdOrderBySortOrderAscCreatedAtDesc(parentId);
        if (children.isEmpty()) return null;
        int total = children.size();
        int done = (int) children.stream().filter(c -> c.getStatus() == Todo.Status.DONE).count();
        return new int[]{total, done};
    }

    @Transactional(readOnly = true)
    public Map<String, Object> generateReport(LocalDate date, User currentUser) {
        LocalDateTime dayStart = date.atStartOfDay();
        LocalDateTime dayEnd = date.plusDays(1).atStartOfDay();

        Long userId = currentUser.getId();

        // 사용자별 제외 프로젝트 목록
        Set<Long> excludedProjectIds = userReportSettingRepository
                .findByUserIdAndExcludedTrue(userId)
                .stream()
                .map(s -> s.getProjectId())
                .collect(Collectors.toSet());

        // 1. 오늘 완료된 일감 (오늘 DONE으로 변경된 건, 내 일감만, 보고서 포함 프로젝트만)
        List<Todo> completed = filterMine(
                todoRepository.findByStatusAndUpdatedAtBetween(Todo.Status.DONE, dayStart, dayEnd), userId)
                .stream().filter(t -> isReportIncluded(t, excludedProjectIds)).collect(Collectors.toList());

        // 2. 오늘 활동이 있었던 일감 (updatedAt이 오늘이고 TODO가 아닌 건, 내 일감만)
        List<Todo> todayUpdated = todoRepository.findAll().stream()
                .filter(t -> isMine(t, userId))
                .filter(t -> isReportIncluded(t, excludedProjectIds))
                .filter(t -> t.getUpdatedAt() != null
                        && !t.getUpdatedAt().isBefore(dayStart)
                        && t.getUpdatedAt().isBefore(dayEnd)
                        && t.getStatus() != Todo.Status.TODO)
                .collect(Collectors.toList());

        // 3. 오늘 작성된 댓글 (내 일감에 달린 것만, 일감별 그룹핑)
        List<Comment> todayComments = commentRepository.findByCreatedAtBetweenWithTodo(dayStart, dayEnd)
                .stream()
                .filter(c -> isMine(c.getTodo(), userId))
                .filter(c -> isReportIncluded(c.getTodo(), excludedProjectIds))
                .collect(Collectors.toList());
        Map<Long, List<Comment>> commentsByTodo = todayComments.stream()
                .collect(Collectors.groupingBy(
                        c -> c.getTodo().getId(),
                        LinkedHashMap::new,
                        Collectors.toList()));

        // 4. 진행 예정 = 현재 TODO 또는 IN_PROGRESS 상태 (내 일감만, 보고서 포함 프로젝트만)
        List<Todo> upcoming = todoRepository.findAll().stream()
                .filter(t -> isMine(t, userId))
                .filter(t -> isReportIncluded(t, excludedProjectIds))
                .filter(t -> t.getStatus() == Todo.Status.TODO || t.getStatus() == Todo.Status.IN_PROGRESS)
                .collect(Collectors.toList());

        // 보고서 텍스트 생성
        String reportText = buildReportText(date, completed, todayUpdated, upcoming, commentsByTodo);

        // 구조화된 데이터도 함께 반환
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("date", date.toString());
        result.put("dayOfWeek", date.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.KOREAN));
        result.put("report", reportText);
        result.put("completedCount", completed.size());
        result.put("createdCount", (long) todayUpdated.size());
        result.put("inProgressCount", upcoming.size());
        result.put("commentCount", todayComments.size());

        return result;
    }

    private String buildReportText(LocalDate date, List<Todo> completed, List<Todo> todayUpdated,
                                    List<Todo> upcoming, Map<Long, List<Comment>> commentsByTodo) {
        // 금일 진행 사항 = 오늘 활동이 있었던 일감 + 오늘 댓글이 달린 일감 (중복 제거)
        List<Todo> allActive = new ArrayList<>(todayUpdated);
        // 댓글만 있는 일감도 추가
        for (Map.Entry<Long, List<Comment>> entry : commentsByTodo.entrySet()) {
            boolean alreadyListed = allActive.stream()
                    .anyMatch(t -> t.getId().equals(entry.getKey()));
            if (!alreadyListed && !entry.getValue().isEmpty()) {
                allActive.add(entry.getValue().get(0).getTodo());
            }
        }

        StringBuilder sb = new StringBuilder();

        // [금일 진행 사항]
        sb.append("[금일 진행 사항]\n");
        if (allActive.isEmpty()) {
            sb.append("- 없음\n");
        } else {
            appendTodoTreeSection(sb, allActive, commentsByTodo, true);
        }

        sb.append("\n");

        // [진행 예정 사항]
        sb.append("[진행 예정 사항]\n");
        if (upcoming.isEmpty()) {
            sb.append("- 없음\n");
        } else {
            appendTodoTreeSection(sb, upcoming, commentsByTodo, false);
        }

        return sb.toString();
    }

    private void appendTodoTreeSection(StringBuilder sb, List<Todo> todos,
                                        Map<Long, List<Comment>> commentsByTodo, boolean showStatus) {
        // 최상위 프로젝트명 기준 그룹핑 (null 프로젝트는 "기타"로)
        Map<String, List<Todo>> byProject = todos.stream()
                .collect(Collectors.groupingBy(
                        t -> getRootProjectName(t.getProject()),
                        LinkedHashMap::new,
                        Collectors.toList()));

        for (Map.Entry<String, List<Todo>> entry : byProject.entrySet()) {
            sb.append("# ").append(entry.getKey()).append("\n");
            for (Todo todo : entry.getValue()) {
                // 하위 일감이면 건너뜀 (상위 일감에서 표시)
                if (todo.getParent() != null) continue;

                int[] progress = getSubtaskProgress(todo.getId());
                sb.append("  - ").append(todo.getSummary());
                if (progress != null) {
                    sb.append(" (").append(progress[1]).append("/").append(progress[0]).append(" 하위일감 완료)");
                } else if (showStatus && todo.getStatus() == Todo.Status.DONE) {
                    sb.append(" (작업완료)");
                }
                sb.append("\n");
                if (showStatus) {
                    appendComments(sb, todo.getId(), commentsByTodo);
                }

                // 하위 일감 들여쓰기 표시
                if (progress != null) {
                    List<Todo> children = todoRepository.findByParent_IdOrderBySortOrderAscCreatedAtDesc(todo.getId());
                    for (int i = 0; i < children.size(); i++) {
                        Todo child = children.get(i);
                        String prefix = (i == children.size() - 1) ? "    └ " : "    ├ ";
                        sb.append(prefix).append(child.getSummary());
                        if (child.getStatus() == Todo.Status.DONE) {
                            sb.append(" ✓");
                        } else if (child.getStatus() == Todo.Status.IN_PROGRESS) {
                            sb.append(" (진행중)");
                        }
                        sb.append("\n");
                    }
                }
            }
        }
    }

    private void appendComments(StringBuilder sb, Long todoId, Map<Long, List<Comment>> commentsByTodo) {
        List<Comment> comments = commentsByTodo.get(todoId);
        if (comments != null && !comments.isEmpty()) {
            for (Comment c : comments) {
                String content = removeMentions(truncate(c.getContent(), 80));
                sb.append("      > ").append(content).append("\n");
            }
        }
    }

    private String getRootProjectName(Project project) {
        if (project == null) return "기타";
        Project current = project;
        while (current.getParent() != null) {
            current = current.getParent();
        }
        return current.getName();
    }

    private boolean isReportIncluded(Todo todo, Set<Long> excludedProjectIds) {
        if (todo.getProject() == null) return true;
        return !excludedProjectIds.contains(todo.getProject().getId());
    }

    private boolean isMine(Todo todo, Long userId) {
        boolean isCreator = todo.getCreatedBy() != null && userId.equals(todo.getCreatedBy().getId());
        boolean isAssignee = todo.getAssignees() != null
                && todo.getAssignees().stream().anyMatch(u -> userId.equals(u.getId()));
        return isCreator || isAssignee;
    }

    private List<Todo> filterMine(List<Todo> todos, Long userId) {
        return todos.stream().filter(t -> isMine(t, userId)).collect(Collectors.toList());
    }

    private String removeMentions(String text) {
        if (text == null) return "";
        return text.replaceAll("<<@\\w+>>", "").replaceAll("\\s+", " ").trim();
    }

    private String truncate(String text, int maxLen) {
        if (text == null) return "";
        String cleaned = text.replaceAll("<[^>]+>", "").replaceAll("\\s+", " ").trim();
        return cleaned.length() > maxLen ? cleaned.substring(0, maxLen) + "..." : cleaned;
    }
}
