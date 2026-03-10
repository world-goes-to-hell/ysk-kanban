package com.example.todo.controller;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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

import com.example.todo.config.SseEmitterRegistry;
import com.example.todo.entity.Priority;
import com.example.todo.entity.Todo;
import com.example.todo.entity.User;
import com.example.todo.service.NotificationService;
import com.example.todo.service.TodoService;
import com.example.todo.service.UserService;

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

    @GetMapping("/report")
    public ResponseEntity<List<Todo>> getReport(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(required = false) Long createdById,
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) String status) {
        java.time.LocalDateTime start = startDate != null ? LocalDate.parse(startDate).atStartOfDay() : null;
        java.time.LocalDateTime end = endDate != null ? LocalDate.parse(endDate).atTime(23, 59, 59) : null;
        Todo.Status st = status != null && !status.isEmpty() ? Todo.Status.valueOf(status) : null;
        List<Todo> todos = todoService.findByFilters(start, end, assigneeId, createdById, projectId, st);
        return ResponseEntity.ok(todos);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Todo> getTodo(@PathVariable Long id) {
        Todo todo = todoService.getTodo(id);
        return ResponseEntity.ok(todo);
    }

    @GetMapping
    public ResponseEntity<List<Todo>> getAllTodos(
            @RequestParam(required = false) Long projectId) {
        List<Todo> todos;
        if (projectId != null) {
            todos = todoService.getTodosByProject(projectId);
        } else {
            todos = todoService.getAllTodos();
        }
        return ResponseEntity.ok(todos);
    }

    @PostMapping
    public ResponseEntity<Todo> createTodo(@RequestBody Map<String, Object> body) {
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
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Todo> updateTodo(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
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

        LocalDate dueDate = null;
        if (body.containsKey("dueDate") && body.get("dueDate") != null) {
            dueDate = LocalDate.parse((String) body.get("dueDate"));
        }

        List<Long> assigneeIds = parseAssigneeIds(body);

        Todo before = todoService.getTodo(id);
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
        return ResponseEntity.ok(updated);
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
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTodo(@PathVariable Long id) {
        Todo todo = todoService.getTodo(id);
        Long deleteProjectId = todo.getProject() != null ? todo.getProject().getId() : null;
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
}
