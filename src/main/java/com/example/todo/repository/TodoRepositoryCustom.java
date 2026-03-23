package com.example.todo.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import com.example.todo.entity.Todo;

public interface TodoRepositoryCustom {

    List<Todo> findByFilters(
            LocalDateTime startDate,
            LocalDateTime endDate,
            Long assigneeId,
            Long createdById,
            Long projectId,
            Todo.Status status
    );

    Map<String, Object> findByFiltersWithPage(
            LocalDateTime startDate,
            LocalDateTime endDate,
            Long assigneeId,
            Long createdById,
            Long projectId,
            Todo.Status status,
            String dateField,
            int page,
            int size
    );
}
