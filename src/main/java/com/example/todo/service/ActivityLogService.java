package com.example.todo.service;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.example.todo.entity.ActivityLog;
import com.example.todo.entity.ActivityType;
import com.example.todo.entity.Todo;
import com.example.todo.entity.User;
import com.example.todo.repository.ActivityLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ActivityLogService {

    private final ActivityLogRepository activityLogRepository;

    public void log(Todo todo, User actor, ActivityType type, String detail, String oldValue, String newValue) {
        ActivityLog activityLog = ActivityLog.builder()
                .todoId(todo.getId())
                .todoSummary(todo.getSummary())
                .projectId(todo.getProject() != null ? todo.getProject().getId() : null)
                .projectName(todo.getProject() != null ? todo.getProject().getName() : null)
                .actorId(actor.getId())
                .actorName(actor.getDisplayName() != null ? actor.getDisplayName() : actor.getUsername())
                .activityType(type)
                .detail(detail)
                .oldValue(oldValue)
                .newValue(newValue)
                .build();
        activityLogRepository.save(activityLog);
        log.debug("Activity logged: {} on todo #{} by {}", type, todo.getId(), actor.getUsername());
    }

    @Transactional(readOnly = true)
    public List<ActivityLog> getByTodoId(Long todoId) {
        return activityLogRepository.findByTodoIdOrderByCreatedAtDesc(todoId);
    }

    @Transactional(readOnly = true)
    public List<ActivityLog> getByProjectId(Long projectId, int limit) {
        return activityLogRepository.findByProjectIdOrderByCreatedAtDesc(projectId, PageRequest.of(0, limit));
    }

    @Transactional(readOnly = true)
    public List<ActivityLog> findByFilters(Long projectId, Long todoId, Long actorId,
                                           LocalDateTime startDate, LocalDateTime endDate, int limit) {
        return activityLogRepository.findByFilters(projectId, todoId, actorId, startDate, endDate, PageRequest.of(0, limit));
    }
}
