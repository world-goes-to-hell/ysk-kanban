package com.example.todo.controller;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.todo.config.ApiKeyAuthFilter;
import com.example.todo.config.SseEmitterRegistry;
import com.example.todo.entity.ActivityType;
import com.example.todo.entity.Priority;
import com.example.todo.entity.Todo;
import com.example.todo.entity.User;
import com.example.todo.entity.ProjectRole;
import com.example.todo.entity.WebhookEvent;
import com.example.todo.repository.ProjectMemberRepository;
import com.example.todo.service.ActivityLogService;
import com.example.todo.service.NotificationService;
import com.example.todo.service.TodoService;
import com.example.todo.service.UserService;
import com.example.todo.service.WebhookService;

import jakarta.servlet.http.HttpServletRequest;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/api/todos")
@RequiredArgsConstructor
public class TodoController {

    private final TodoService todoService;
    private final UserService userService;
    private final NotificationService notificationService;
    private final SseEmitterRegistry sseEmitterRegistry;
    private final ActivityLogService activityLogService;
    private final WebhookService webhookService;
    private final ProjectMemberRepository projectMemberRepository;

    @GetMapping("/stats/priority")
    public ResponseEntity<Map<Priority, Long>> getStatsByPriority() {
        List<Todo> todos = todoService.getAllTodos();
        Map<Priority, Long> counts = todos.stream()
                .filter(t -> t.getPriority() != null)
                .collect(Collectors.groupingBy(Todo::getPriority, Collectors.counting()));
        return ResponseEntity.ok(counts);
    }

    @GetMapping("/report")
    public ResponseEntity<?> getReport(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(required = false) Long createdById,
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "createdAt") String dateField,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        java.time.LocalDateTime start = startDate != null ? LocalDate.parse(startDate).atStartOfDay() : null;
        java.time.LocalDateTime end = endDate != null ? LocalDate.parse(endDate).atTime(23, 59, 59) : null;
        Todo.Status st = status != null && !status.isEmpty() ? Todo.Status.valueOf(status) : null;
        Map<String, Object> result = todoService.findByFiltersWithPage(start, end, assigneeId, createdById, projectId, st, dateField, page, size);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Todo> getTodo(@PathVariable Long id) {
        Todo todo = todoService.getTodo(id);
        User currentUser = getCurrentUser();
        if (todo.getProject() != null
                && !currentUser.getUsername().equals("admin")
                && !projectMemberRepository.existsByProjectIdAndUserId(todo.getProject().getId(), currentUser.getId())) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(todo);
    }

    @GetMapping
    public ResponseEntity<List<Todo>> getAllTodos(
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) String status,
            HttpServletRequest request) {
        Long effectiveProjectId = resolveProjectId(projectId, request);
        List<Todo> todos;
        if (effectiveProjectId != null) {
            todos = todoService.getTodosByProject(effectiveProjectId);
        } else {
            todos = todoService.getAllTodos();
        }
        if (status != null && !status.isEmpty()) {
            Todo.Status filterStatus = Todo.Status.valueOf(status);
            todos = todos.stream()
                    .filter(t -> t.getStatus() == filterStatus)
                    .toList();
        }
        return ResponseEntity.ok(todos);
    }

    @PostMapping
    public ResponseEntity<Todo> createTodo(@RequestBody Map<String, Object> body,
                                           HttpServletRequest request) {
        String summary = (String) body.get("summary");
        String description = (String) body.getOrDefault("description", "");

        Priority priority = null;
        if (body.containsKey("priority")) {
            priority = Priority.valueOf((String) body.get("priority"));
        }

        Long projectId = null;
        if (body.containsKey("projectId") && body.get("projectId") != null) {
            Object raw = body.get("projectId");
            if (raw instanceof Number) {
                projectId = ((Number) raw).longValue();
            } else if (raw instanceof String && !((String) raw).isEmpty()) {
                projectId = Long.parseLong((String) raw);
            }
        }
        projectId = resolveProjectId(projectId, request);

        LocalDate dueDate = null;
        if (body.containsKey("dueDate") && body.get("dueDate") != null) {
            dueDate = LocalDate.parse((String) body.get("dueDate"));
        }

        List<Long> assigneeIds = parseAssigneeIds(body);

        User currentUser = getCurrentUser();
        Todo created = todoService.createTodo(summary, description, priority, projectId, currentUser, dueDate, assigneeIds);
        sseEmitterRegistry.broadcast("todo_changed", todoEvent("created", projectId));
        if (created.getAssignees() != null && !created.getAssignees().isEmpty()) {
            notificationService.notifyAssigned(created, created.getAssignees(), currentUser);
        }
        activityLogService.log(created, currentUser, ActivityType.CREATED, "일감 생성: " + summary, null, null);
        if (projectId != null) {
            webhookService.fireEvent(WebhookEvent.TODO_CREATED, projectId, Map.of("todoId", created.getId(), "summary", summary, "actor", currentUser.getUsername()));
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Todo> updateTodo(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        Todo before = todoService.getTodo(id);

        String summary = body.containsKey("summary") ? (String) body.get("summary") : before.getSummary();
        String description = body.containsKey("description") ? (String) body.get("description") : (before.getDescription() != null ? before.getDescription() : "");

        Priority priority = null;
        if (body.containsKey("priority") && body.get("priority") != null) {
            priority = Priority.valueOf((String) body.get("priority"));
        } else {
            priority = before.getPriority();
        }

        Long projectId = null;
        if (body.containsKey("projectId") && body.get("projectId") != null) {
            Object raw = body.get("projectId");
            if (raw instanceof Number) {
                projectId = ((Number) raw).longValue();
            } else if (raw instanceof String && !((String) raw).isEmpty()) {
                projectId = Long.parseLong((String) raw);
            }
        } else if (before.getProject() != null) {
            projectId = before.getProject().getId();
        }

        LocalDate dueDate = null;
        if (body.containsKey("dueDate") && body.get("dueDate") != null) {
            dueDate = LocalDate.parse((String) body.get("dueDate"));
        } else {
            dueDate = before.getDueDate();
        }

        List<Long> assigneeIds = parseAssigneeIds(body);

        java.util.Set<Long> oldAssigneeIds = before.getAssignees() != null
                ? before.getAssignees().stream().map(User::getId).collect(java.util.stream.Collectors.toSet())
                : java.util.Collections.emptySet();

        Todo updated = todoService.updateTodo(id, summary, description, priority, projectId, dueDate, assigneeIds);
        sseEmitterRegistry.broadcast("todo_changed", todoEvent("updated", projectId));

        if (updated.getAssignees() != null) {
            List<User> newlyAssigned = updated.getAssignees().stream()
                    .filter(a -> !oldAssigneeIds.contains(a.getId()))
                    .toList();
            if (!newlyAssigned.isEmpty()) {
                notificationService.notifyAssigned(updated, newlyAssigned, getCurrentUser());
            }
        }
        activityLogService.log(updated, getCurrentUser(), ActivityType.UPDATED, "일감 수정", null, null);
        if (projectId != null) {
            webhookService.fireEvent(WebhookEvent.TODO_UPDATED, projectId, Map.of("todoId", updated.getId(), "summary", summary, "actor", getCurrentUser().getUsername()));
        }
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/{parentId}/subtasks")
    public ResponseEntity<Todo> createSubtask(
            @PathVariable Long parentId,
            @RequestBody Map<String, Object> body) {
        String summary = (String) body.get("summary");
        String description = (String) body.getOrDefault("description", "");

        Priority priority = null;
        if (body.containsKey("priority") && body.get("priority") != null) {
            priority = Priority.valueOf((String) body.get("priority"));
        }

        LocalDate dueDate = null;
        if (body.containsKey("dueDate") && body.get("dueDate") != null) {
            dueDate = LocalDate.parse((String) body.get("dueDate"));
        }

        List<Long> assigneeIds = parseAssigneeIds(body);

        String assigneeName = (String) body.get("assigneeName");
        if (assigneeName != null && !assigneeName.isBlank()) {
            User botUser = userService.findOrCreateBot(assigneeName);
            assigneeIds = assigneeIds != null ? new ArrayList<>(assigneeIds) : new ArrayList<>();
            assigneeIds.add(botUser.getId());
        }

        User currentUser = getCurrentUser();
        Todo created = todoService.createSubtask(parentId, summary, description, priority, currentUser, dueDate, assigneeIds);

        Long projectId = created.getProject() != null ? created.getProject().getId() : null;
        sseEmitterRegistry.broadcast("todo_changed", todoEvent("created", projectId));
        activityLogService.log(created, currentUser, ActivityType.CREATED, "하위 일감 생성: " + summary, null, null);

        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/{parentId}/subtasks")
    public ResponseEntity<List<Todo>> getSubtasks(@PathVariable Long parentId) {
        List<Todo> subtasks = todoService.getSubtasks(parentId);
        return ResponseEntity.ok(subtasks);
    }

    @SuppressWarnings("unchecked")
    @PutMapping("/reorder")
    public ResponseEntity<Void> reorderTodos(@RequestBody Map<String, Object> body) {
        List<Number> rawIds = (List<Number>) body.get("orderedIds");
        List<Long> orderedIds = rawIds.stream().map(Number::longValue).toList();
        todoService.reorderTodos(orderedIds);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<Todo> changeStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        Todo.Status status = Todo.Status.valueOf(body.get("status"));
        Todo before = todoService.getTodo(id);
        String oldStatus = before.getStatus().name();
        Todo updated = todoService.changeStatus(id, status);
        Long statusProjectId = updated.getProject() != null ? updated.getProject().getId() : null;
        sseEmitterRegistry.broadcast("todo_changed", todoEvent("updated", statusProjectId));
        notificationService.notifyStatusChanged(updated, oldStatus, status.name(), getCurrentUser());
        activityLogService.log(updated, getCurrentUser(), ActivityType.STATUS_CHANGED, "상태 변경", oldStatus, status.name());
        if (statusProjectId != null) {
            webhookService.fireEvent(WebhookEvent.TODO_STATUS_CHANGED, statusProjectId, Map.of("todoId", updated.getId(), "summary", updated.getSummary(), "oldStatus", oldStatus, "newStatus", status.name(), "actor", getCurrentUser().getUsername()));
        }
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTodo(@PathVariable Long id) {
        Todo todo = todoService.getTodo(id);
        User currentUser = getCurrentUser();

        boolean isCreator = todo.getCreatedBy() != null && todo.getCreatedBy().getId().equals(currentUser.getId());
        boolean isMaster = currentUser.getUsername().equals("admin")
                || (todo.getProject() != null && projectMemberRepository.findByProjectIdAndUserId(todo.getProject().getId(), currentUser.getId())
                    .map(m -> m.getRole() == ProjectRole.MASTER).orElse(false));

        if (!isCreator && !isMaster) {
            return ResponseEntity.status(403).build();
        }

        Long deleteProjectId = todo.getProject() != null ? todo.getProject().getId() : null;
        activityLogService.log(todo, currentUser, ActivityType.DELETED, "일감 삭제: " + todo.getSummary(), null, null);
        if (deleteProjectId != null) {
            webhookService.fireEvent(WebhookEvent.TODO_DELETED, deleteProjectId, Map.of("todoId", todo.getId(), "summary", todo.getSummary(), "actor", getCurrentUser().getUsername()));
        }
        todoService.deleteTodo(id);
        sseEmitterRegistry.broadcast("todo_changed", todoEvent("deleted", deleteProjectId));
        return ResponseEntity.noContent().build();
    }

    @SuppressWarnings("unchecked")
    private List<Long> parseAssigneeIds(Map<String, Object> body) {
        if (!body.containsKey("assigneeIds") || body.get("assigneeIds") == null) {
            return null;
        }
        List<Number> raw = (List<Number>) body.get("assigneeIds");
        return raw.stream().map(Number::longValue).toList();
    }

    private Map<String, Object> todoEvent(String action, Long projectId) {
        Map<String, Object> event = new HashMap<>();
        event.put("action", action);
        event.put("projectId", projectId);
        return event;
    }

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return userService.findByUsername(authentication.getName());
    }

    private Long resolveProjectId(Long projectId, HttpServletRequest request) {
        if (projectId != null) return projectId;
        Object apiKeyProjectId = request.getAttribute(ApiKeyAuthFilter.PROJECT_ID_ATTR);
        if (apiKeyProjectId instanceof Long) return (Long) apiKeyProjectId;
        return null;
    }
}
