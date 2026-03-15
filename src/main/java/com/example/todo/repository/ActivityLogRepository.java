package com.example.todo.repository;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import com.example.todo.entity.ActivityLog;

public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {

    List<ActivityLog> findByTodoIdOrderByCreatedAtDesc(Long todoId);

    List<ActivityLog> findByProjectIdOrderByCreatedAtDesc(Long projectId, Pageable pageable);

    @Query("SELECT a FROM ActivityLog a WHERE " +
           "(:projectId IS NULL OR a.projectId = :projectId) AND " +
           "(:todoId IS NULL OR a.todoId = :todoId) AND " +
           "(:actorId IS NULL OR a.actorId = :actorId) AND " +
           "(:startDate IS NULL OR a.createdAt >= :startDate) AND " +
           "(:endDate IS NULL OR a.createdAt <= :endDate) " +
           "ORDER BY a.createdAt DESC")
    List<ActivityLog> findByFilters(
        @Param("projectId") Long projectId,
        @Param("todoId") Long todoId,
        @Param("actorId") Long actorId,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate,
        Pageable pageable
    );
}
