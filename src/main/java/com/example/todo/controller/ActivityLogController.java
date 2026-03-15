package com.example.todo.controller;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.example.todo.entity.ActivityLog;
import com.example.todo.service.ActivityLogService;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/activity-logs")
@RequiredArgsConstructor
public class ActivityLogController {

    private final ActivityLogService activityLogService;

    @GetMapping
    public ResponseEntity<List<ActivityLog>> getActivityLogs(
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) Long todoId,
            @RequestParam(required = false) Long actorId,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(defaultValue = "50") int limit) {
        LocalDateTime start = startDate != null ? LocalDate.parse(startDate).atStartOfDay() : null;
        LocalDateTime end = endDate != null ? LocalDate.parse(endDate).atTime(23, 59, 59) : null;
        List<ActivityLog> logs = activityLogService.findByFilters(projectId, todoId, actorId, start, end, Math.min(limit, 200));
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/todo/{todoId}")
    public ResponseEntity<List<ActivityLog>> getByTodo(@PathVariable Long todoId) {
        return ResponseEntity.ok(activityLogService.getByTodoId(todoId));
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<ActivityLog>> getByProject(
            @PathVariable Long projectId,
            @RequestParam(defaultValue = "50") int limit) {
        return ResponseEntity.ok(activityLogService.getByProjectId(projectId, Math.min(limit, 200)));
    }
}
